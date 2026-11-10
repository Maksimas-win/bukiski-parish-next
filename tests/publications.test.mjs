import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadSite } from '../scripts/lib/site.mjs';
import { createCatalog } from '../scripts/lib/catalog.mjs';
import { publicationPath, validatePublications } from '../scripts/lib/publications.mjs';
import { publicationPage } from '../scripts/lib/pages/publication.mjs';
import { announcementActive } from '../scripts/lib/announcement.mjs';
import { documentPath } from '../assets/js/document-data.js';
import { escapeHTML } from '../assets/js/domain.js';

const readJSON = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const readPage = path => readFile(new URL(`../dist${path}`, import.meta.url), 'utf8');
const site = await loadSite();
const info = await readJSON('dist/build-info.json');

test('Editorial publications retain their text, source links and verified document downloads', async () => {
  const search = await readJSON('dist/assets/data/search-index.json');
  const sitemap = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  assert.ok(site.publications.length > 0);
  for (const publication of site.publications) {
    const path = publicationPath(publication);
    const html = await readPage(path);
    assert.match(html, /class="article publication(?: [^"]+)?" data-article/);
    assert.doesNotMatch(html, /notice--archive|РЕДАКТОРУ|Редакторские замечания/);
    const headingText = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, '');
    assert.equal(headingText, escapeHTML(publication.title));
    const visibleText = html.replace(/<[^>]+>/g, '');
    assert.ok(visibleText.includes(escapeHTML(publication.lead)));
    for (const block of publication.blocks) assert.ok(visibleText.includes(escapeHTML(block.text.replace(/\*\*/g, ''))), block.text.slice(0, 80));
    for (const source of publication.sources) assert.ok(html.includes(`href="${escapeHTML(source.url)}"`));
    for (const item of publication.documents) {
      const document = site.documents.find(document => document.local === item.local);
      assert.ok(html.includes(`href="${info.basePath}${documentPath(document, publication.language)}"`));
    }
    if (info.documentDelivery === 'envelope') assert.match(html, /data-document-download rel="nofollow"/);
    assert.ok(sitemap.includes(path));
    assert.ok(search.some(entry => entry.u === path && entry.x.includes(publication.blocks[0].text.replace(/\*\*/g, ''))));
    for (const lang of site.languages.filter(lang => lang !== publication.language)) assert.ok(!html.includes(`/${lang}/library/${publication.slug}.html`), 'no invented translation URL');
    for (const lang of site.languages) {
      assert.ok((await readPage(`/${lang}/library.html`)).includes(`href="${info.basePath}${path}"`));
      assert.ok((await readPage(`/${lang}/news.html`)).includes(`href="${info.basePath}${path}"`));
      if (announcementActive(site.announcement, Date.parse(info.generatedAt))) {
        assert.ok((await readPage(`/${lang}/${site.announcement.slug}.html`)).includes(`href="${info.basePath}${path}"`));
      }
    }
  }
});

test('Temporary announcement expiry leaves publications in the catalog without adding archive redirects', async () => {
  const future = await loadSite({ BUILD_TIME: '2027-01-02T12:00:00Z' });
  assert.equal(announcementActive(future.announcement, future.buildTime), false);
  const catalog = createCatalog(future);
  assert.equal(catalog.entries.length, future.pages.length);
  assert.equal(catalog.inventory.length, future.pages.length);
  assert.equal(catalog.publications.length, future.publications.length);
  for (const entry of catalog.publications) {
    assert.ok(catalog.articlesFor(entry.language).includes(entry));
    assert.ok(catalog.news().includes(entry));
    assert.ok(!catalog.redirects.some(redirect => redirect.to === entry.target));
    assert.match(String(publicationPage(future, entry, future.locales[entry.language])), /class="article publication(?: [^"]+)?"/);
  }
});

test('Publication validation rejects unsafe destinations, invalid dates and broken citations', () => {
  const original = site.publications[0];
  for (const mutate of [
    publication => { publication.slug = '../escape'; },
    publication => { publication.publishedAt = '2026-02-30'; },
    publication => { publication.blocks[0].tag = 'script'; },
    publication => { publication.blocks[0].refs = ['missing-source']; },
    publication => { publication.sources[0].url = 'javascript:alert(1)'; },
    publication => { publication.documents[0].local = 'assets/documents/missing.pdf'; }
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.throws(() => validatePublications([changed], site.languages, site.documents));
  }
  assert.throws(() => validatePublications([original, original], site.languages, site.documents), /duplicate path/);
  const catalog = createCatalog(site);
  const entry = structuredClone(catalog.publications[0]);
  entry.publication.blocks[0].text = '<script>unsafe</script>';
  const html = String(publicationPage(site, entry, site.locales[entry.language]));
  assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
  assert.ok(!html.includes('<script>unsafe</script>'));
});
