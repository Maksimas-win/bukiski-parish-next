import test from 'node:test';
import assert from 'node:assert/strict';
import { html, raw, attrs, lines } from '../scripts/lib/html.mjs';
import { renderBlocks } from '../scripts/lib/pages/article.mjs';
import { robots, oldDomainHtaccess, htaccess } from '../scripts/lib/outputs.mjs';

const text = fragment => html`${fragment}`.value;

test('Templates escape interpolated text unless it is marked as markup', () => {
  const hostile = '<script>alert("x")</script>';
  assert.equal(html`<p>${hostile}</p>`.value, '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>');
  assert.equal(html`<p>${raw('<br>')}</p>`.value, '<p><br></p>');
  assert.equal(html`<ul>${['a', 'b<'].map(item => html`<li>${item}</li>`)}</ul>`.value, '<ul><li>a</li><li>b&lt;</li></ul>');
  assert.equal(html`<p>${null}${undefined}${false}${0}</p>`.value, '<p>0</p>');
  assert.equal(html`<a${attrs({ href: '/x?a=1&b="2"', hidden: true, title: null, download: false })}>`.value, '<a href="/x?a=1&amp;b=&quot;2&quot;" hidden>');
  assert.equal(lines('A & B\nC').value, 'A &amp; B<br>C');
});

test('Article blocks are rebuilt as lists, definition lists and levelled headings', () => {
  const { body, headings } = renderBlocks([
    { tag: 'h1', text: 'Заголовок' },
    { tag: 'h2', text: 'Раздел' },
    { tag: 'h4', text: 'Подраздел' },
    { tag: 'li', text: 'первый' },
    { tag: 'li', text: 'второй <b>' },
    { tag: 'p', text: 'Абзац.' },
    { tag: 'dt', text: 'Термин' },
    { tag: 'dd', text: 'Определение' },
    { tag: 'blockquote', text: 'Цитата' }
  ], 'Заголовок');
  assert.equal(text(body), '<h2 id="s-1" tabindex="-1">Раздел</h2><h4>Подраздел</h4><ul><li>первый</li><li>второй &lt;b&gt;</li></ul><p>Абзац.</p><dl><dt>Термин</dt><dd>Определение</dd></dl><blockquote><p>Цитата</p></blockquote>');
  assert.deepEqual(headings, [{ id: 's-1', text: 'Раздел' }]);
});

test('Numbered section titles become headings only when they are clearly titles', () => {
  const titles = renderBlocks([
    { tag: 'p', text: '1. Евхаристия — встреча с Христом' },
    { tag: 'p', text: 'Текст раздела.' },
    { tag: 'p', text: '2. Церковь рождается из Евхаристии' },
    { tag: 'p', text: 'Ещё текст.' }
  ], 'x');
  assert.equal(titles.headings.length, 2);

  // A run of numbered lines is a list in prose form, and sentences are not titles.
  const list = renderBlocks([
    { tag: 'p', text: '1. Не вкушать пищу с полуночи' },
    { tag: 'p', text: '2. Прочитать молитвы' },
    { tag: 'p', text: '3. Прийти к началу службы.' }
  ], 'x');
  assert.equal(list.headings.length, 0);
  assert.equal(renderBlocks([{ tag: 'p', text: '1. Единственный пункт' }, { tag: 'p', text: 'Текст.' }], 'x').headings.length, 0);
});

test('Production robots.txt lets crawlers reach noindex pages; previews block everything', () => {
  const site = { production: true, canonical: path => `https://bukiski-hram.org${path}` };
  assert.equal(robots(site), 'User-agent: *\nAllow: /\nSitemap: https://bukiski-hram.org/sitemap.xml\n');
  assert.doesNotMatch(robots(site), /Disallow/);
  assert.equal(robots({ ...site, production: false }), 'User-agent: *\nDisallow: /\n');
});

test('Host configuration is derived from committed settings', () => {
  const redirects = [{ from: '/', to: '/ru/' }, { from: '/podat-zapisku', to: '/ru/notes.html' }];
  const preview = { base: '/bukiski-parish-next', productionOrigin: 'https://bukiski-hram.org', documentDelivery: 'direct' };
  const old = oldDomainHtaccess(preview, redirects);
  assert.match(old, /RewriteRule \^\/\?\$ https:\/\/bukiski-hram\.org\/ru\/ \[R=301,L,NE\]/);
  assert.match(old, /RewriteRule \^podat-zapisku\/\?\$ https:\/\/bukiski-hram\.org\/ru\/notes\.html \[R=301,L,NE\]/);
  assert.doesNotMatch(old, /bukiski-parish-next/);

  const current = htaccess(preview, redirects);
  assert.match(current, /RewriteRule \^podat-zapisku\/\?\$ \/bukiski-parish-next\/ru\/notes\.html \[R=301,L,NE\]/);
  assert.match(current, /<FilesMatch "\\\.\(pdf\|doc\)\$">\nHeader set X-Robots-Tag "noindex, nofollow"/);
  assert.match(current, /<FilesMatch "\\\.\(html\|json\|ics\|vcf\|xml\|txt\)\$">\nHeader set Cache-Control "no-cache"/);
  assert.doesNotMatch(htaccess({ ...preview, documentDelivery: 'envelope' }, redirects), /X-Robots-Tag/);
});
