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
    for (const block of source.blocks) assert.ok(archive.includes(escapeHTML(block.text)), `Missing text in ${source.url}`);
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

test('Old-domain redirects always point at the production address, never at a preview', async () => {
  const target = settings.origin + settings.basePath;
  const rules = (await read('deploy/old-domain.htaccess')).split('\n').filter(line => line.startsWith('RewriteRule'));
  assert.ok(rules.length > 80);
  for (const rule of rules) assert.ok(rule.split(' ')[2].startsWith(`${target}/`), rule);
  assert.doesNotMatch(rules.join('\n'), /github\.io/);
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
