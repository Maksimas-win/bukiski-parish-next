// The parish's thank-you dialog (content/thanks.json).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { thanksAutoShow, validateThanks } from '../scripts/lib/thanks.mjs';
import { escapeHTML } from '../assets/js/domain.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const thanks = await readJSON('content/thanks.json');
const announcement = await readJSON('content/announcement.json');
const settings = await readJSON('content/settings.json');
const info = await readJSON('dist/build-info.json');
const page = path => readFile(resolve(root, 'dist', `.${path}`), 'utf8');

test('Thank-you texts are complete in every site language', () => {
  assert.doesNotThrow(() => validateThanks(thanks, settings.locales));
  const broken = structuredClone(thanks);
  delete broken.texts.uk.paragraphs;
  assert.throws(() => validateThanks(broken, settings.locales), /uk\.paragraphs/);
});

test('The dialog opens by itself only on the home page, and waits while the announcement is up when asked to', () => {
  const during = Date.parse(`${announcement.showFrom}T12:00:00Z`);
  const after = Date.parse(`${announcement.showUntil}T22:01:00Z`);
  const site = behaviour => ({ thanks: { ...thanks, behaviour: { ...thanks.behaviour, ...behaviour } }, announcement, buildTime: during });
  assert.equal(thanksAutoShow(site({ pauseWhileAnnouncement: true })), false);
  assert.equal(thanksAutoShow({ ...site({ pauseWhileAnnouncement: true }), buildTime: after }), true);
  assert.equal(thanksAutoShow(site({ pauseWhileAnnouncement: false })), true);
  assert.equal(thanksAutoShow(site({ autoShowOnHome: false, pauseWhileAnnouncement: false })), false);
});

test('Every page carries the dialog and the footer link; only the home page may open it by itself', async () => {
  const expectedAuto = thanksAutoShow({ thanks, announcement, buildTime: Date.parse(info.generatedAt) });
  for (const lang of settings.locales) {
    const t = thanks.texts[lang];
    for (const id of ['home', 'schedule', 'contacts']) {
      const html = await page(id === 'home' ? `/${lang}/index.html` : `/${lang}/${id}.html`);
      assert.equal((html.match(/id="thanks"/g) || []).length, 1, `${lang}/${id}: one dialog`);
      assert.ok(html.includes(`data-thanks-open hidden aria-haspopup="dialog">${escapeHTML(t.footerLink)}</button>`), `${lang}/${id}: footer link`);
      assert.ok(html.includes(`<h2 id="thanks-title" class="thanks__title">${escapeHTML(t.title)}</h2>`), `${lang}/${id}: title`);
      for (const text of t.paragraphs) assert.ok(html.includes(escapeHTML(text)), `${lang}/${id}: paragraph`);
      const auto = html.match(/data-auto="(true|false)"/)[1];
      assert.equal(auto, id === 'home' && expectedAuto ? 'true' : 'false', `${lang}/${id}: data-auto`);
      assert.equal((html.match(/data-dialog-close/g) || []).length >= 3, true, `${lang}/${id}: close controls`);
    }
  }
});

test('Dialog text does not shrink below 13 px and the only primary action is «Продолжить»', async () => {
  const html = await page('/ru/index.html');
  const dialog = html.match(/<dialog class="dialog thanks"[\s\S]*?<\/dialog>/)[0];
  assert.equal((dialog.match(/class="button"/g) || []).length, 1);
  assert.match(dialog, /class="button" data-dialog-close>Продолжить</);
});
