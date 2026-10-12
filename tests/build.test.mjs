// Checks the generated site in dist/. Run `npm run build` first (`npm run check` does both).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { escapeHTML } from '../assets/js/domain.js';
import { documentPath, decodeDocument } from '../assets/js/document-data.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const read = path => readFile(resolve(root, path), 'utf8');
const readJSON = async path => JSON.parse(await read(path));

const info = await readJSON('dist/build-info.json');
const settings = await readJSON('content/settings.json');
const base = info.basePath;
const historyStory = await readJSON('content/stories/istoriya-o-hrame.json');
const stories = new Map([[historyStory.source, historyStory]]);
const htmlFiles = (await readdir(dist, { recursive: true })).filter(path => path.endsWith('.html'));
const pages = await Promise.all(htmlFiles.map(async file => ({ file, html: await readFile(resolve(dist, file), 'utf8') })));

/** Site-relative route -> file in dist. */
function fileFor(path) {
  if (path.endsWith('/')) return resolve(dist, `.${path}index.html`);
  return resolve(dist, /\.\w+$/.test(path) ? `.${path}` : `.${path}/index.html`);
}
const exists = async path => (await stat(path)).isFile();
const page = async path => readFile(fileFor(path), 'utf8');

test('Every page has one H1, a language, metadata, a canonical URL and no inline code', () => {
  assert.ok(pages.length > 250, `only ${pages.length} pages were generated`);
  for (const { file, html } of pages) {
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, file);
    for (const pattern of [
      /<html lang="[a-z]{2}"/,
      /<title>[^<]+<\/title>/,
      /<meta name="description" content="[^"]+"/,
      /<link rel="canonical" href="https:\/\//,
      /<meta property="og:title"/,
      /<meta property="og:image" content="https:\/\/[^"]+\.jpg"/,
      /<main id="main"/
    ]) assert.match(html, pattern, file);
    assert.doesNotMatch(html, /<(?:iframe|style)(?:\s|>)|\s(?:style|on\w+)\s*=|javascript:|unsafe-inline/i, file);
    for (const script of html.matchAll(/<script\b([^>]*)>/g)) assert.match(script[1], /\bsrc="/, file);
    assert.doesNotMatch(html, /\{\{\w+\}\}|="undefined"|>undefined<|\[object Object\]/, file);
    if (!info.production) assert.match(html, /name="robots" content="noindex,(?:no)?follow"/, file);
  }
});

test('Internal links, images and scripts resolve, including the GitHub project prefix', async () => {
  const checked = new Set();
  for (const { file, html } of pages) {
    const references = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(match => match[1]);
    for (const srcset of html.matchAll(/\bsrcset="([^"]+)"/g)) references.push(...srcset[1].split(',').map(part => part.trim().split(' ')[0]));
    for (const link of references) {
      if (!link.startsWith('/')) continue;
      assert.ok(!base || link.startsWith(`${base}/`), `${file}: missing base prefix ${link}`);
      const path = link.slice(base.length).split('#')[0].split('?')[0];
      if (checked.has(path)) continue;
      checked.add(path);
      assert.ok(await exists(fileFor(path)), `${file}: broken ${link}`);
    }
  }
});

test('Stylesheet and scripts are requested with the release version', async () => {
  const home = await page('/ru/');
  for (const asset of ['assets/css/site.css', 'assets/js/theme-init.js', 'assets/js/app.js']) {
    assert.ok(home.includes(`${base}/${asset}?v=${info.assetVersion}"`), asset);
  }
  const scripts = (await readdir(resolve(dist, 'assets/js'), { recursive: true })).filter(name => name.endsWith('.js'));
  for (const name of scripts) {
    const source = await read(`dist/assets/js/${name}`);
    for (const specifier of source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g)) {
      assert.ok(specifier[1].endsWith(`?v=${info.assetVersion}`), `${name}: unversioned import ${specifier[1]}`);
    }
  }
});

test('Legacy aliases keep their canonical target and noindex in the emitted HTML', async () => {
  const aliases = [
    ['/podat-zapisku', '/ru/notes.html'],
    ['/raspisanie-bogosluzhenij', '/ru/schedule.html']
  ];
  for (const [alias, target] of aliases) {
    const output = await page(alias);
    assert.match(output, /name="robots" content="noindex,follow"/);
    assert.ok(output.includes(`${base}${target}"`));
  }
  assert.match(await page('/ru/'), info.production
    ? /name="robots" content="index,follow"/
    : /name="robots" content="noindex,follow"/);
});

test('Each source URL has a target, and every preserved text block survives escaping', async () => {
  const sources = await readJSON('content/source-pages.json');
  const migration = await readJSON('content/migration.json');
  assert.equal(migration.length, sources.length);
  assert.equal(new Set(migration.map(record => record.source)).size, sources.length);
  for (const source of sources) {
    const record = migration.find(candidate => candidate.source === source.url);
    assert.ok(record, source.url);
    assert.ok(await exists(fileFor(record.target)), record.target);
    const archive = await page(record.archive);
    // An illustrated story may leave out only the decorative glyphs it lists.
    const decorative = new Set(stories.get(source.url)?.decorative || []);
    for (const block of source.blocks) {
      if (decorative.has(block.text)) continue;
      assert.ok(archive.includes(escapeHTML(block.text)), `Missing text in ${source.url}: ${block.text.slice(0, 60)}`);
    }
  }
});

test('Articles keep their structure: lists, section headings and real image sizes', async () => {
  const sources = await readJSON('content/source-pages.json');
  const migration = await readJSON('content/migration.json');
  const manifest = await readJSON('content/image-manifest.json');
  const sizes = new Map(Object.values(manifest).flatMap(image => [
    [`/${image.web}`, [image.width, image.height]],
    [`/${image.thumb}`, [image.thumbWidth, image.thumbHeight]]
  ]));

  const withList = sources.find(source => source.url.includes('bukiski-hram.net') && source.blocks.filter(block => block.tag === 'li').length > 3);
  const listPage = await page(migration.find(record => record.source === withList.url).archive);
  assert.match(listPage, /<ul><li>/, 'list items must be rendered as a list');

  const numbered = await page('/ru/library/evharistiya-serdce-cerkvi.html');
  assert.match(numbered, /<h2 id="s-1" tabindex="-1">1\. Евхаристия — встреча с Христом<\/h2>/);
  assert.match(numbered, /data-contents/);

  for (const { file, html } of pages) {
    for (const image of html.matchAll(/<img\b([^>]*)>/g)) {
      const attributes = image[1];
      const src = attributes.match(/\bsrc="([^"]+)"/)?.[1];
      if (!src) continue; // the lightbox image receives its source at runtime
      const width = Number(attributes.match(/\bwidth="(\d+)"/)?.[1]);
      const height = Number(attributes.match(/\bheight="(\d+)"/)?.[1]);
      assert.ok(width > 0 && height > 0, `${file}: image without dimensions ${src}`);
      assert.match(attributes, /\balt="/, `${file}: image without alt ${src}`);
      const real = sizes.get(src.slice(base.length));
      if (real) assert.deepEqual([width, height], real, `${file}: wrong dimensions for ${src}`);
    }
  }
});

test('The schedule lists confirmed services under month headings with machine-readable starts', async () => {
  for (const lang of settings.locales) {
    const html = await page(`/${lang}/schedule.html`);
    const rows = [...html.matchAll(/<li class="service[^"]*" data-service[^>]*data-start="([^"]+)"/g)];
    assert.ok(rows.length > 0, lang);
    for (const row of rows) assert.ok(Number.isFinite(Date.parse(row[1])));
    const starts = rows.map(row => Date.parse(row[1]));
    assert.deepEqual(starts, [...starts].sort((a, b) => a - b), 'services are in chronological order');
    // Headings descend one level at a time: page title, month, service.
    const levels = [...html.matchAll(/<h([1-4])\b/g)].map(match => Number(match[1]));
    levels.reduce((previous, level) => {
      assert.ok(level <= previous + 1, `${lang}: heading level jumps from h${previous} to h${level}`);
      return level;
    }, 0);
    assert.match(html, new RegExp(`data-max-age-hours="${settings.scheduleMaxAgeHours}"`));
  }
});

test('Documents can be downloaded as original bytes and stay out of search', async () => {
  const documents = await readJSON('content/source-documents.json');
  const migration = await readJSON('content/migration.json');
  const sitemap = await read('dist/sitemap.xml');
  const deployed = await readdir(dist, { recursive: true });
  const envelope = info.documentDelivery === 'envelope';
  assert.equal(documents.length, 4);
  assert.equal(info.documents, 4);

  for (const document of documents) {
    assert.match(document.local, /^assets\/documents\/[a-z0-9-]+\.(pdf|doc)$/);
    const original = await readFile(resolve(root, document.local));
    assert.equal(original.length, document.bytes);
    assert.equal(createHash('sha256').update(original).digest('hex'), document.sha256);
    const signature = document.local.endsWith('.pdf') ? '255044462d' : 'd0cf11e0a1b11ae1';
    assert.equal(original.subarray(0, signature.length / 2).toString('hex'), signature);

    for (const lang of settings.locales) {
      const path = documentPath(document, lang);
      const html = await page(path);
      assert.match(html, /name="robots" content="noindex,nofollow"/);
      assert.ok(!sitemap.includes(path));
      if (envelope) {
        const payload = html.match(/<template data-document-payload([^>]*)>([A-Za-z0-9+/=]+)<\/template>/);
        assert.ok(payload, path);
        const attributes = Object.fromEntries([...payload[1].matchAll(/ data-([a-z0-9]+)="([^"]+)"/g)].map(match => [match[1], match[2]]));
        const decoded = await decodeDocument({ ...attributes, base64: payload[2] });
        assert.deepEqual(Buffer.from(decoded.content), original);
        assert.match(html, /<button[^>]*data-document-download hidden>/);
        assert.match(html, /<noscript><p class="notice">/);
      } else {
        assert.ok(html.includes(`href="${base}/${document.local}" download=`), path);
        assert.deepEqual(await readFile(resolve(dist, document.local)), original);
      }
    }

    // Every article that linked to the document on the old site still leads to it.
    const marker = envelope ? ' data-document-download rel="nofollow"' : ' rel="nofollow"';
    for (const reference of document.links) {
      const record = migration.find(candidate => candidate.source === reference.from);
      assert.ok(record, reference.from);
      for (const path of [record.target, record.archive, new URL(reference.from).pathname]) {
        const html = await page(path);
        assert.ok(html.includes(`href="${base}${documentPath(document, 'ru')}"${marker}`), path);
        assert.ok(!html.includes(`href="${escapeHTML(document.source)}"`), path);
      }
    }
  }

  const rawDocuments = deployed.filter(path => /\.(pdf|docx?)$/i.test(path));
  if (envelope) {
    assert.equal(rawDocuments.length, 0, 'Raw documents must not be published in envelope mode');
    for (const { file, html } of pages) assert.ok(!html.includes(`href="${base}/assets/documents/`), file);
  } else {
    assert.equal(rawDocuments.length, documents.length);
    assert.match(await read('dist/.htaccess'), /X-Robots-Tag "noindex, nofollow"/);
  }
});

test('RU/LT/EN dictionaries have the same keys and core pages link their translations', async () => {
  const locales = await readJSON('content/locales.json');
  const keys = Object.keys(locales.ru).sort();
  for (const lang of settings.locales) {
    assert.deepEqual(Object.keys(locales[lang]).sort(), keys);
    for (const [key, value] of Object.entries(locales[lang])) assert.ok(value && (!Array.isArray(value) || value.length), `${lang}.${key}`);
    assert.deepEqual(Object.keys(locales[lang].nav).sort(), Object.keys(locales.ru.nav).sort());
    const html = await page(`/${lang}/contacts.html`);
    for (const target of settings.locales) assert.match(html, new RegExp(`hreflang="${target}" href="https:[^"]+/${target}/contacts\\.html"`));
  }
});

test('Calendar files use UTC instants and lines folded to 75 octets', async () => {
  for (const lang of settings.locales) {
    const text = await read(`dist/assets/schedule-${lang}.ics`);
    assert.match(text, /BEGIN:VCALENDAR\r\nVERSION:2.0/);
    assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, info.confirmedServices);
    for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, 'ICS line exceeds 75 octets');
    for (const match of text.matchAll(/DTSTART:([^\r]+)/g)) assert.match(match[1], /^\d{8}T\d{6}Z$/);
    assert.doesNotMatch(text, /DTEND|DURATION/, 'the feed has no end times, so none may be invented');
  }
});

test('The downloaded contact opens this site including the project path', async () => {
  const card = await read('dist/assets/parish.vcf');
  const href = card.match(/^URL:(.+)$/m)[1].trim();
  const canonical = (await page('/ru/')).match(/rel="canonical" href="([^"]+)"/)[1];
  assert.equal(href, canonical.replace(/ru\/$/, ''));
});

test('Redirect targets are existing internal pages without chains', async () => {
  const rules = (await read('dist/_redirects')).trim().split('\n');
  for (const line of rules) {
    const [from, to, status] = line.split(' ');
    assert.notEqual(from, to);
    assert.equal(status, '301');
    assert.ok(await exists(fileFor(to.slice(base.length))));
    assert.ok(!rules.some(rule => rule.startsWith(`${to} `)), `Redirect chain for ${from}`);
  }
});

test('The .org redirect file points at the production address and keeps the schedule feed', async () => {
  const target = settings.origin + settings.basePath;
  const file = await read('deploy/bukiski-hram-org.htaccess');
  const rules = file.split('\n').filter(line => line.startsWith('RewriteRule'));
  assert.deepEqual(rules, [`RewriteRule ^(.*)$ ${target}/$1 [R=301,L,NE]`]);
  assert.match(file, /RewriteCond %\{REQUEST_URI\} !\^\/data\//);
  assert.doesNotMatch(file, /github\.io/);
});

test('Old .net addresses lead to their new pages on the same host', async () => {
  const rules = (await read('dist/.htaccess')).split('\n').filter(line => line.startsWith('RewriteRule'));
  assert.ok(rules.length > 80);
  assert.ok(rules.includes(`RewriteRule ^podat-zapisku/?$ ${base}/ru/notes.html [R=301,L,NE]`));
  assert.ok(rules.includes(`RewriteRule ^o-nashem-hrame/?$ ${base}/ru/library/o-nashem-hrame.html [R=301,L,NE]`));
});

test('Content from bukiski-hram.net is on the new site: rector, services, social links, transport, gallery', async () => {
  const contacts = await page('/ru/contacts.html');
  assert.ok(contacts.includes(settings.rector.name.ru));
  assert.ok(contacts.includes(`href="${settings.whatsapp}"`));
  for (const item of settings.social) assert.ok(contacts.includes(`href="${item.url}"`), item.url);
  for (const bus of settings.transport.buses) assert.ok(contacts.includes(`>${bus.number}<`), bus.number);
  assert.ok(contacts.includes(settings.openFrom));

  const sacraments = await page('/ru/sacraments.html');
  for (const term of ['Проскомидия', 'Сорокоуст', 'Заочное отпевание', 'Освящение могилы']) assert.ok(sacraments.includes(term), term);

  const schedule = await page('/ru/schedule.html');
  assert.ok(schedule.includes('href="webcal://calendar.google.com/calendar/ical/'));
  assert.ok(schedule.includes('https://calendar.google.com/calendar/r?cid='));

  const history = await page('/ru/history.html');
  assert.ok(history.includes(`href="${base}/ru/library/o-nashem-hrame.html"`));
  assert.ok(history.includes(`href="${base}/ru/library/istoriya-o-hrame.html"`));

  for (const lang of settings.locales) {
    const gallery = await page(`/${lang}/gallery.html`);
    assert.equal((gallery.match(/ data-lightbox /g) || []).length, 13, lang);
    assert.match(gallery, /<dialog class="lightbox"/);
  }
  const home = await page('/ru/');
  assert.ok(home.includes(settings.links.church.url));
});

test('The home page opens with the church photograph and its name, with no slogan', async () => {
  const locales = await readJSON('content/locales.json');
  const photos = await readJSON('content/photos.json');
  for (const lang of settings.locales) {
    const home = await page(`/${lang}/`);
    const hero = home.slice(home.indexOf('<section class="hero"'), home.indexOf('</section>', home.indexOf('<section class="hero"')));
    assert.match(hero, new RegExp(`<h1 id="hero-title" class="hero__title">${locales[lang].name}</h1>`), lang);
    assert.ok(photos.hero.every(size => hero.includes(`${size.file} ${size.width}w`)), lang);
    assert.match(hero, /fetchpriority="high"/);
    assert.doesNotMatch(hero, /class="button/, 'the hero has no call-to-action buttons');
    assert.equal((home.match(/class="mosaic__item"/g) || []).length, photos.homeMosaic.length, lang);
    assert.equal((home.match(/class="social-card social-card--/g) || []).length, settings.social.length, lang);
    for (const item of settings.social) assert.ok(home.includes(`href="${item.url}"`), item.url);
    assert.equal((home.match(/class="quick__tile"/g) || []).length, 4, lang);
  }
});

test('The prayer-request form posts only to the configured service, which is the only third party in the CSP', async () => {
  const notes = await page('/ru/notes.html');
  assert.ok(notes.includes(`data-notes-endpoint="${settings.notes.endpoint}"`));
  assert.match(notes, /<input type="checkbox" name="consent" data-note-consent>/);
  assert.match(notes, /<button type="submit"[^>]*data-note-send disabled>/);
  assert.doesNotMatch(notes, /<form[^>]*\saction=/, 'the form must never submit natively');
  const origin = new URL(settings.notes.endpoint).origin;
  for (const { file, html } of pages) {
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1].replaceAll('&#39;', "'");
    assert.match(csp, new RegExp(`connect-src 'self' ${origin.replace(/[.]/g, '\\.')};`), file);
    assert.match(csp, /form-action 'none'/, file);
    assert.doesNotMatch(csp.replace(origin, ''), /https?:/, file);
  }
});

test('The sitemap lists only canonical, indexable pages', async () => {
  const sitemap = await read('dist/sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(urls.length > 100);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    assert.doesNotMatch(url, /\/archive\/|\/documents\/|404/);
    const html = await page(new URL(url).pathname.slice(base.length));
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), url);
  }
});

test('The illustrated history keeps the source wording and shows the photographs before restoration', async () => {
  const sources = await readJSON('content/source-pages.json');
  const source = sources.find(candidate => candidate.url === historyStory.source);
  const texts = new Set(source.blocks.map(block => block.text));
  // Every sentence of the story comes verbatim from the source page.
  const strings = [];
  const walk = (value, key) => {
    if (typeof value === 'string') { if (!['source', 'heroPhoto', 'id', 'icon', 'before', 'web', 'thumb'].includes(key) && key !== 'caption') strings.push(value); }
    else if (Array.isArray(value)) value.forEach(item => walk(item, key));
    else if (value && typeof value === 'object') for (const [name, item] of Object.entries(value)) if (name !== 'restoration' && name !== 'caption') walk(item, name);
  };
  walk(historyStory);
  for (const text of strings) assert.ok(texts.has(text), `Not in the source: ${text.slice(0, 60)}`);
  for (const stat of historyStory.chapters.flatMap(chapter => chapter.stats || [])) assert.ok(texts.has(String(stat.value)));
  for (const text of historyStory.decorative) assert.ok(!/[\p{L}]{3,}/u.test(text), `Only glyphs may be left out: ${text}`);

  const story = await page('/ru/library/istoriya-o-hrame.html');
  assert.match(story, /data-story/);
  assert.equal((story.match(/data-story-chapter/g) || []).length, historyStory.chapters.length + 1);
  assert.match(story, /<input class="compare__range" type="range"/);
  for (const photo of historyStory.restoration.photos) {
    assert.ok(story.includes(`${photo.web}"`), photo.id);
    assert.ok(await exists(resolve(dist, photo.web)), photo.web);
  }
  assert.doesNotMatch(story, / style=/, 'no inline styles under the CSP');
});

test('Polish, German and Ukrainian pages exist and every service title is translated', async () => {
  const terms = await readJSON('content/liturgical-terms.json');
  const { createTranslator } = await import('../scripts/lib/liturgical.mjs');
  const raw = await readJSON('content/original-services.json');
  const { translate, missing } = createTranslator(terms);
  for (const event of raw.events.filter(item => item.source === 'parish-calendar')) {
    for (const lang of ['pl', 'de', 'uk']) {
      translate(event.title.en, lang);
      if (event.liturgical?.en) translate(event.liturgical.en, lang);
    }
  }
  assert.deepEqual([...missing], []);
  assert.equal(translate('Sunday 21 after Pentecost', 'uk'), 'Неділя 21-ша по П’ятидесятниці');
  assert.equal(translate('Sunday 13 after Pentecost', 'uk'), 'Неділя 13-та по П’ятидесятниці');

  for (const lang of ['pl', 'de', 'uk']) {
    const home = await page(`/${lang}/`);
    assert.match(home, new RegExp(`<html lang="${lang}"`));
    const schedule = await page(`/${lang}/schedule.html`);
    assert.ok(schedule.includes(terms.terms['Divine Liturgy'][lang]), lang);
  }
});

test('Every page header has a home button and lists all six languages', async () => {
  for (const path of ['/ru/schedule.html', '/de/contacts.html', '/uk/']) {
    const html = await page(path);
    const lang = path.split('/')[1];
    assert.match(html, new RegExp(`class="home-button" href="[^"]*/${lang}/"`), path);
    assert.match(html, /class="site-nav__home"/, path);
    for (const list of ['lang-menu__list', 'menu-langs__list']) {
      const block = html.slice(html.indexOf(`<ul class="${list}">`), html.indexOf('</ul>', html.indexOf(`<ul class="${list}">`)));
      assert.equal((block.match(/hreflang="/g) || []).length, settings.locales.length, `${path} ${list}`);
    }
  }
});

test('Services show the church-calendar day from the feed and the home page offers the services dialog', async () => {
  const home = await page('/ru/');
  assert.match(home, /<dialog class="services-dialog" id="services-dialog"/);
  assert.match(home, /data-schedule-open aria-haspopup="dialog" aria-controls="services-dialog"/);
  const schedule = await page('/ru/schedule.html');
  assert.match(schedule, /<details class="church-day">/);
  assert.ok(schedule.includes('Прп. Романа Сладкопевца (ок 556).'));
  const english = await page('/en/schedule.html');
  assert.match(english, /<ul class="church-day__list" lang="ru">/);
});
