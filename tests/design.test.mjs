// Guards for the stylesheet: contrast of the colour tokens, a floor for text
// size, and agreement between the two copies of the dark theme.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const directory = new URL('../styles/', import.meta.url);
const names = (await readdir(directory)).filter(name => name.endsWith('.css')).sort();
const css = (await Promise.all(names.map(name => readFile(new URL(name, directory), 'utf8')))).join('\n');
const tokens = await readFile(new URL('00-tokens.css', directory), 'utf8');

function declarations(block) {
  return Object.fromEntries([...block.matchAll(/(--[a-z-]+):\s*(#[0-9a-f]{6})\s*;/g)].map(match => [match[1], match[2]]));
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255).map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const light = declarations(tokens.slice(tokens.indexOf(':root {'), tokens.indexOf('@media (prefers-color-scheme: dark)')));
const darkBySystem = tokens.slice(tokens.indexOf(":root:not([data-theme='light']) {"), tokens.indexOf(":root[data-theme='dark'] {"));
const darkByChoice = tokens.slice(tokens.indexOf(":root[data-theme='dark'] {"));
const dark = { ...light, ...declarations(darkByChoice) };

// Foreground / background pairs used for normal-size text.
const TEXT_PAIRS = [
  ['--ink', '--bg'], ['--ink', '--surface'], ['--ink', '--surface-tint'],
  ['--ink-soft', '--bg'], ['--ink-soft', '--surface'], ['--ink-soft', '--surface-tint'],
  ['--accent', '--bg'], ['--accent', '--surface'], ['--accent', '--surface-tint'],
  ['--on-accent', '--accent'], ['--label', '--bg'], ['--label', '--surface-tint'],
  ['--band-ink', '--band-bg'], ['--band-soft', '--band-bg'], ['--band-accent', '--band-bg'],
  ['--feature-ink', '--feature-bg'], ['--feature-soft', '--feature-bg'], ['--feature-accent', '--feature-bg'],
  ['--feature-label', '--feature-bg'], ['--feature-on-accent', '--feature-accent'], ['--feature-ink', '--feature-tint']
];

test('Text colours meet WCAG AA (4.5:1) in the light and dark themes', () => {
  for (const [theme, values] of [['light', light], ['dark', dark]]) {
    for (const [foreground, background] of TEXT_PAIRS) {
      assert.ok(values[foreground] && values[background], `${theme}: ${foreground} / ${background} is not defined`);
      const ratio = contrast(values[foreground], values[background]);
      assert.ok(ratio >= 4.5, `${theme}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
    }
  }
});

test('Fixed colours on the coloured bands keep their contrast', () => {
  for (const [foreground, background] of [
    ['#fdfcfa', light['--wine']], ['#ead9d2', light['--wine']], ['#5b0f19', '#fdfcfa'],
    ['#f0eadc', light['--dome-deep']], ['#c9d6dc', light['--dome-deep']], ['#ecd29b', light['--dome-deep']],
    ['#1f262b', '#fbf1d6']
  ]) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background} is ${contrast(foreground, background).toFixed(2)}:1`);
  }
});

test('The dark theme is identical whether chosen by the system or by the visitor', () => {
  assert.deepEqual(declarations(darkBySystem), declarations(darkByChoice));
});

test('No text is set smaller than 13 px', () => {
  for (const match of css.matchAll(/font-size:\s*([^;]+);/g)) {
    const value = match[1].trim();
    const rem = value.match(/^([\d.]+)rem$/);
    if (rem) assert.ok(Number(rem[1]) >= 0.8125, `font-size ${value}`);
    const clamp = value.match(/^clamp\(([\d.]+)rem/);
    if (clamp) assert.ok(Number(clamp[1]) >= 0.8125, `font-size ${value}`);
    assert.doesNotMatch(value, /^\d+(?:\.\d+)?px$/, `font-size ${value} must use rem so that «Крупный текст» scales it`);
  }
});

test('Styles are flat: no cascade layers that could silently reorder rules', () => {
  assert.doesNotMatch(css, /@layer\b/);
});
