// Dates in the sitemap follow real content changes, never guesses.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { contentFingerprint, lastmodOf, loadPageDates, pageDatesFile } from '../scripts/lib/page-dates.mjs';

const article = related => `<article><p>Text</p><img src="/a.webp?v=0123abcd"></article><footer class="shell article__more" lang="ru"><h2>Читайте также</h2><ul class="article-grid">${related}</ul></footer>`;

test('The fingerprint follows the content, not the release hash or the "read also" list', () => {
  const page = { title: 'T', description: 'D', body: article('<li>A</li>') };
  const same = contentFingerprint(page);
  assert.match(same, /^[0-9a-f]{20}$/);
  assert.equal(contentFingerprint({ ...page, body: article('<li>B</li><li>C</li>').replace('0123abcd', 'ffff0000') }), same);
  assert.notEqual(contentFingerprint({ ...page, body: page.body.replace('Text', 'Changed text') }), same);
  assert.notEqual(contentFingerprint({ ...page, title: 'Other' }), same);
  assert.notEqual(contentFingerprint({ ...page, description: 'Other' }), same);
});

test('An unchanged page keeps its date; a changed or new page gets the build day', () => {
  const history = new Map([['/a.html', { fingerprint: 'a'.repeat(20), lastmod: '2026-11-01' }]]);
  assert.equal(lastmodOf({ path: '/a.html', fingerprint: 'a'.repeat(20), publishedAt: '2025-01-01' }, history, '2026-11-26'), '2026-11-01');
  assert.equal(lastmodOf({ path: '/a.html', fingerprint: 'b'.repeat(20) }, history, '2026-11-26'), '2026-11-26');
  assert.equal(lastmodOf({ path: '/new.html', fingerprint: 'a'.repeat(20) }, history, '2026-11-26'), '2026-11-26');
  assert.equal(lastmodOf({ path: '/a.html', fingerprint: 'a'.repeat(20) }, new Map(), '2026-11-26'), '2026-11-26');
});

test('Without history only articles with a publication date are dated', () => {
  assert.equal(lastmodOf({ path: '/a.html', fingerprint: 'a'.repeat(20), publishedAt: '2025-03-04T10:00:00Z' }, null, '2026-11-26'), '2025-03-04');
  assert.equal(lastmodOf({ path: '/a.html', fingerprint: 'a'.repeat(20), publishedAt: null }, null, '2026-11-26'), null);
});

test('The previous publication is read back; a missing file starts an empty history and bad entries are skipped', async () => {
  assert.equal(await loadPageDates(null), null);
  const directory = await mkdtemp(join(tmpdir(), 'page-dates-'));
  assert.deepEqual(await loadPageDates(join(directory, 'missing.json')), new Map());
  const file = join(directory, 'page-dates.json');
  await writeFile(file, pageDatesFile([
    { path: '/a.html', fingerprint: 'a'.repeat(20), lastmod: '2026-11-01' },
    { path: '/undated.html', fingerprint: 'b'.repeat(20), lastmod: null }
  ]));
  const history = await loadPageDates(file);
  assert.deepEqual([...history.keys()], ['/a.html']);
  assert.equal(history.get('/a.html').lastmod, '2026-11-01');
  await writeFile(file, JSON.stringify({ version: 99, pages: {} }));
  assert.deepEqual(await loadPageDates(file), new Map());
});
