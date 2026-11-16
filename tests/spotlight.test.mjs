// The home spotlight of one publication (content/spotlight.json).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spotlightCard, spotlightPublication, validateSpotlight } from '../scripts/lib/spotlight.mjs';
import { publicationPath } from '../scripts/lib/publications.mjs';
import { loadSite } from '../scripts/lib/site.mjs';
import { escapeHTML } from '../assets/js/domain.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const spotlight = await readJSON('content/spotlight.json');
const publications = await readJSON('content/publications.json');
const settings = await readJSON('content/settings.json');
const info = await readJSON('dist/build-info.json');
const page = path => readFile(resolve(root, 'dist', `.${path}`), 'utf8');
const site = await loadSite();

test('The spotlight names an existing publication, a short delay and complete texts', () => {
  assert.doesNotThrow(() => validateSpotlight(spotlight, publications, settings.locales));
  assert.ok(spotlight.delayMilliseconds >= 1000 && spotlight.delayMilliseconds <= 1500, 'appears about a second after the page');
  const unknown = { ...spotlight, publication: 'no-such-article' };
  assert.throws(() => validateSpotlight(unknown, publications, settings.locales), /does not exist/);
  const untranslated = structuredClone(spotlight);
  delete untranslated.texts.ru.read;
  assert.throws(() => validateSpotlight(untranslated, publications, settings.locales), /ru\.read/);
  assert.doesNotThrow(() => validateSpotlight({ ...spotlight, enabled: false }, [], settings.locales));
  assert.equal(spotlightPublication({ ...site, spotlight: { ...spotlight, enabled: false } }), null);
});

test('The card is rendered hidden on the home page of its language only, outside <main>, and links to the article', async () => {
  const publication = spotlightPublication(site);
  assert.ok(publication);
  const target = `${info.basePath}${publicationPath(publication)}`;
  for (const lang of settings.locales) {
    const home = await page(`/${lang}/index.html`);
    const expected = Boolean(spotlight.texts[lang]);
    assert.equal(home.includes(`data-spotlight="${publication.slug}"`), expected, `${lang}: home card`);
    if (!expected) continue;
    const t = spotlight.texts[lang];
    const card = home.match(/<aside class="spotlight"[\s\S]*?<\/aside>/)[0];
    assert.match(card, /\bhidden>/, 'starts hidden until the browser shows it');
    assert.ok(card.includes(`aria-label="${escapeHTML(t.label)}"`));
    assert.ok(card.includes(`data-delay="${spotlight.delayMilliseconds}"`));
    assert.ok(card.includes(`>${escapeHTML(t.title)}</h2>`));
    assert.ok(card.includes(`href="${target}" data-spotlight-read>`));
    assert.ok(card.includes(`data-spotlight-close aria-label="${escapeHTML(t.close)}"`));
    assert.ok(home.indexOf('<aside class="spotlight"') > home.indexOf('</main>'), 'sits after the main content');
    for (const id of ['schedule', 'library', 'news']) assert.ok(!(await page(`/${lang}/${id}.html`)).includes('data-spotlight='), `${lang}/${id}: no card`);
  }
  const article = await page(publicationPath(publication));
  assert.ok(!article.includes('data-spotlight='), 'the article does not announce itself');
  assert.ok(article.includes(`<p class="eyebrow publication__rubric">${escapeHTML(publication.rubric)}</p>`), 'rubric above the title');
  assert.equal(String(spotlightCard(site, 'ru', 'library')), '', 'no card outside the home page');
});

test('The browser shows the card once per session, below dialogs, and leaves focus and scrolling alone', async () => {
  const js = await readFile(resolve(root, 'assets/js/ui/spotlight.js'), 'utf8');
  assert.match(js, /sessionStorage\.getItem/);
  assert.match(js, /seen === undefined \|\| seen\) return/);
  assert.match(js, /dialog\[open\]/);
  assert.doesNotMatch(js, /\.focus\(|scrollTo|showModal|preventDefault/);
  const css = await readFile(resolve(root, 'styles/32-spotlight.css'), 'utf8');
  assert.match(css, /\.spotlight\[hidden\]\s*\{\s*display:\s*none;/);
  assert.match(css, /@keyframes spotlight-rise/);
  assert.match(css, /translateY\(18px\)/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  const accessibility = await readFile(resolve(root, 'styles/80-accessibility.css'), 'utf8');
  assert.match(accessibility, /prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
});
