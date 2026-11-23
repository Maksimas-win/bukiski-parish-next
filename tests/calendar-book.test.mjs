// The Orthodox calendar 2027 as a book. Checks the generated site in dist/
// (run `npm run build` first; `npm run check` does both) and the book data.

import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CALENDAR_BOOK_PATH, CALENDAR_BOOK_PDF } from '../scripts/lib/pages/calendar-book.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const info = JSON.parse(await read('dist/build-info.json'));
const settings = JSON.parse(await read('content/settings.json'));
const base = info.basePath;
const book = JSON.parse(await read('assets/calendar-2027/book.json'));
const text = JSON.parse(await read('assets/calendar-2027/text.json'));
const pad = n => String(n).padStart(book.files.pad, '0');

test('the book page is built in Russian, linked from every schedule page and listed in the sitemap', async () => {
  const html = await read(`dist${CALENDAR_BOOK_PATH}`);
  assert.match(html, /<html lang="ru"/);
  assert.ok(html.includes(`data-src="${base}/assets/calendar-2027/book.json"`));
  assert.ok(html.includes(`data-pdf="${CALENDAR_BOOK_PDF}"`));
  assert.match(html, /class="flipbook__fallback"/);
  assert.doesNotMatch(html, /\sstyle="/);
  for (const lang of settings.locales) {
    const schedule = await read(`dist/${lang}/schedule.html`);
    assert.ok(schedule.includes(`href="${base}${CALENDAR_BOOK_PATH}"`), lang);
  }
  assert.ok((await read('dist/sitemap.xml')).includes(CALENDAR_BOOK_PATH));
});

test('the viewer is a reviewed feature module that stores nothing and asks only for its own data', async () => {
  const app = await read('assets/js/app.js');
  assert.match(app, /\['\[data-flipbook\]', \(\) => import\('\.\/features\/calendar-book\.js'\)\]/);
  const script = await read('assets/js/features/calendar-book.js');
  assert.match(script, /export function init\(\)/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|XMLHttpRequest|WebSocket/);
  for (const call of script.match(/fetch\([^)]*\)/g)) assert.match(call, /credentials: 'omit'/);
});

test('every page of the book has its image, thumbnail, text, and links that stay inside the book or reach reviewed sites', async () => {
  assert.equal(book.pages.length, book.count);
  assert.equal(text.length, book.count);
  assert.equal(Object.keys(book.days).length, 365);
  const hosts = new Set(['azbyka.ru', 'pravoslavie.ru', 'www.patriarchia.ru', 'www.rop.ru', 'rop.ru', 'tulaeparhia.ru', 'www.orthodoxy.lt', 'bukiski-hram.org']);
  for (let n = 1; n <= book.count; n++) {
    await access(resolve(root, 'assets/calendar-2027', book.files.page.replace('{n}', pad(n))));
    await access(resolve(root, 'assets/calendar-2027', book.files.thumb.replace('{n}', pad(n))));
    for (const link of book.pages[n - 1].links) {
      if (!link.href) {
        assert.ok(link.page >= 1 && link.page <= book.count, `page ${n}`);
      } else if (!link.href.startsWith('tel:')) {
        const url = new URL(link.href);
        assert.equal(url.protocol, 'https:', link.href);
        assert.ok(hosts.has(url.hostname), link.href);
      }
    }
  }
});
