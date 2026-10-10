// Static rules for the browser code: what it may touch and what it must never do.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const directory = new URL('../assets/js/', import.meta.url);
const files = (await readdir(directory, { recursive: true })).filter(name => name.endsWith('.js'));
const sources = new Map(await Promise.all(files.map(async name => [name.replaceAll('\\', '/'), await readFile(new URL(name, directory), 'utf8')])));

test('No script builds markup from strings, evaluates code or contacts third parties', () => {
  assert.ok(sources.size >= 12);
  for (const [name, source] of sources) {
    assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|setAttribute\(\s*['"]style/, name);
    assert.doesNotMatch(source, /gtag\(|googletagmanager|google-analytics|facebook\.net|https?:\/\//, name);
  }
});

test('Only reading preferences are stored in the browser', () => {
  const writers = [...sources].filter(([, source]) => /localStorage\.setItem|sessionStorage|indexedDB|document\.cookie/.test(source)).map(([name]) => name);
  assert.deepEqual(writers, ['ui/preferences.js']);
  assert.equal((sources.get('ui/preferences.js').match(/localStorage\.setItem/g) || []).length, 1);
  const readers = [...sources].filter(([, source]) => source.includes('localStorage')).map(([name]) => name).sort();
  assert.deepEqual(readers, ['theme-init.js', 'ui/preferences.js']);
  // Both files must agree on the storage key.
  const key = sources.get('ui/preferences.js').match(/STORAGE_KEY = '([^']+)'/)[1];
  assert.ok(sources.get('theme-init.js').includes(`'${key}'`));
});

test('Prayer names never leave the tab and are erased when the page is left', () => {
  const notes = sources.get('features/notes.js');
  assert.match(notes, /form\.addEventListener\('submit', event => event\.preventDefault\(\)\)/);
  assert.match(notes, /window\.addEventListener\('pagehide', erase\)/);
  assert.match(notes, /if \(event\.persisted\) erase\(\)/);
  assert.doesNotMatch(notes, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|history\.|location\.|console\./);
});

test('Network requests stay on this origin and are limited to two known files', () => {
  const fetchers = [...sources].filter(([, source]) => /\bfetch\(/.test(source)).map(([name]) => name).sort();
  assert.deepEqual(fetchers, ['document-downloads.js', 'features/library.js']);
  for (const name of fetchers) assert.match(sources.get(name), /credentials: 'omit'/, name);
});

test('Every feature module that app.js loads exists and exports init()', () => {
  const app = sources.get('app.js');
  const features = [...app.matchAll(/import\('\.\/(features\/[a-z-]+\.js)'\)/g)].map(match => match[1]);
  assert.ok(features.length >= 5);
  for (const name of features) assert.match(sources.get(name), /export function init\(\)/, name);
});
