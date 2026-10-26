// The parish announcement: a strip in the page flow and a page of official
// materials, both generated from content/announcement.json.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { announcementActive, announcementPath, validateAnnouncement, vilniusDay } from '../scripts/lib/announcement.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const announcement = await readJSON('content/announcement.json');
const settings = await readJSON('content/settings.json');
const info = await readJSON('dist/build-info.json');
const page = path => readFile(resolve(root, 'dist', `.${path}`), 'utf8');

test('The announcement is complete in every site language and links only to HTTPS addresses', () => {
  assert.doesNotThrow(() => validateAnnouncement(announcement, settings.locales));
  const broken = structuredClone(announcement);
  delete broken.texts.de.page.prayer;
  assert.throws(() => validateAnnouncement(broken, settings.locales), /de\.page\.prayer/);
  const unsafe = structuredClone(announcement);
  unsafe.materials[0].urls.ru = 'http://example.org/';
  assert.throws(() => validateAnnouncement(unsafe, settings.locales), /unsafe link/);
});

test('The announcement leaves the build after its last day, counted on the Vilnius clock', () => {
  const last = announcement.showUntil;
  assert.equal(announcementActive(announcement, Date.parse(`${last}T21:59:00Z`)), true);
  assert.equal(announcementActive(announcement, Date.parse(`${last}T22:01:00Z`)), false);
  assert.equal(announcementActive({ ...announcement, enabled: false }, Date.parse(`${last}T00:00:00Z`)), false);
  assert.equal(vilniusDay(Date.parse('2026-10-25T22:30:00Z')), '2026-10-26');
});

test('While active, every language has the page and every ordinary page carries the strip in the flow', async () => {
  if (!announcementActive(announcement, Date.parse(info.generatedAt))) return;
  for (const lang of settings.locales) {
    const own = await page(announcementPath(announcement, lang));
    assert.match(own, new RegExp(`<h1>${announcement.texts[lang].page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`));
    assert.doesNotMatch(own, /data-announcement=/, 'the page does not announce itself');
    for (const material of announcement.materials) {
      for (const url of Object.values(material.urls)) assert.ok(own.includes(`href="${url}"`), `${lang}: ${url}`);
    }
    const home = await page(`/${lang}/index.html`);
    const strip = home.indexOf('data-announcement=');
    assert.ok(strip > home.indexOf('</header>') && strip < home.indexOf('<main'), `${lang}: strip sits between header and main`);
    assert.ok(home.includes(`href="${info.basePath}${announcementPath(announcement, lang)}"`), `${lang}: strip links to its page`);
  }
});

test('The strip uses no fixed or sticky positioning, so it cannot cover the page', async () => {
  const css = await readFile(resolve(root, 'styles/22-announcement.css'), 'utf8');
  assert.doesNotMatch(css, /position:\s*(fixed|sticky|absolute)/);
});
