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
const days = JSON.parse(await read('assets/calendar-2027/days.json'));
const pad = n => String(n).padStart(book.files.pad, '0');

test('the book page is built in Russian, linked from every schedule page and listed in the sitemap', async () => {
  const html = await read(`dist${CALENDAR_BOOK_PATH}`);
  assert.match(html, /<html lang="ru"/);
  assert.ok(html.includes(`data-src="${base}/assets/calendar-2027/book.json"`));
  assert.ok(html.includes(`data-pdf="${CALENDAR_BOOK_PDF}"`));
  assert.ok(html.includes(`data-days="${base}/assets/calendar-2027/days.json"`));
  assert.match(html, /<h1 class="visually-hidden">/);
  // the book is the first thing on the page: nothing but the hidden heading comes before it
  const main = html.slice(html.indexOf('<main'), html.indexOf('data-flipbook'));
  assert.doesNotMatch(main, /<(?:p|h2|header|img)\b/);
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

test('every day has a readable card whose readings lead to the Bible on Azbyka', () => {
  assert.equal(Object.keys(days).length, 365);
  assert.deepEqual(Object.keys(days).sort(), Object.keys(book.days).sort());
  let readings = 0;
  for (const [key, day] of Object.entries(days)) {
    assert.ok(day.wd && day.old && Array.isArray(day.e) && day.e.some(entry => entry[0] === 'ttl'), key);
    assert.equal(day.url, `https://azbyka.ru/days/2027-${key.slice(0, 2)}-${key.slice(2)}`);
    for (const entry of day.e) {
      assert.ok(['sp', 'ttl', 'lit', 'svc', 'note', 'rd'].includes(entry[0]), `${key}: ${entry[0]}`);
      if (entry[0] !== 'rd') continue;
      for (const [part, href] of entry[3]) {
        assert.equal(typeof part, 'string');
        if (href) {
          assert.match(href, /^https:\/\/azbyka\.ru\/biblia\/\?[A-Za-z0-9]+\.\d+:[\d,.:;A-Za-z-]+$/, href);
          readings++;
        }
      }
    }
  }
  assert.ok(readings > 1400, `${readings} readings`);
  assert.equal(days['0427'].special && days['0726'].special, true, '27 April and 26 July are marked');
});

test('every home page opens a window onto the book between the services and the 1,2 % band', async () => {
  const locales = JSON.parse(await read('content/locales.json'));
  for (const name of ['home/cover.webp', 'home/inside.webp']) await access(resolve(root, 'assets/calendar-2027', name));
  for (const lang of settings.locales) {
    const home = await read(`dist/${lang}/index.html`);
    assert.equal((home.match(/class="shell calendar-window"/g) || []).length, 1, lang);
    const start = home.indexOf('class="shell calendar-window"');
    assert.ok(home.indexOf('class="services-band"') < start && start < home.indexOf('class="gpm-band"'), `${lang}: the window sits after the services`);
    const section = home.slice(start, home.indexOf('</section>', start));
    // one link, to the Russian book; the other languages say that it is in Russian
    const links = [...section.matchAll(/<a\b[^>]*>/g)].map(match => match[0]);
    assert.equal(links.length, 1, lang);
    assert.ok(links[0].includes(`href="${base}${CALENDAR_BOOK_PATH}"`), lang);
    assert.equal(links[0].includes('hreflang="ru"'), lang !== 'ru', lang);
    assert.equal(section.includes('class="calendar-window__language"'), lang !== 'ru', lang);
    assert.ok(section.includes(`>${locales[lang].calendarBook}</h2>`), lang);
    assert.equal((section.match(/<li>/g) || []).length, locales[lang].homeCalendarPoints.length, lang);
    assert.equal(locales[lang].homeCalendarPoints.length, 3, lang);
    // the book is decoration: hidden from screen readers, images lazy and without alt text
    assert.match(section, /class="calendar-window__stage" aria-hidden="true"/);
    for (const image of section.match(/<img\b[^>]*>/g)) {
      assert.match(image, /alt=""/);
      assert.match(image, /loading="lazy"/);
    }
    assert.doesNotMatch(section, /\sstyle="/);
  }
});
