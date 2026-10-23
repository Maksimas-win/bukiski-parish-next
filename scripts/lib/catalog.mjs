// Maps every page captured from the two old sites to its place on the new one.
//
// Each source page gets a `target` (where a visitor of the old URL should land)
// and an `archive` (where the preserved original text can be read). For library
// articles these are usually the same page; a separate /archive/ copy also
// preserves original wording when a study receives owner-approved editorial metadata.

import { createHash } from 'node:crypto';
import { CORE_PAGES } from './site.mjs';

// The two history articles of bukiski-hram.net stay full articles in the library;
// the history page links to them.
const OLD_MAIN_SECTIONS = {
  '/': 'home',
  '/raspisanie-bogosluzhenij': 'schedule',
  '/kontaktai-hram-rozhdestva-hristova': 'contacts',
  '/podat-zapisku': 'notes',
  '/poleznoe-chtenie': 'library',
  '/naudingas-skaitymas': 'library',
  '/useful-reading': 'library'
};

// Localised section pages of the old .org site in Polish: kept as archive, not listed as articles.
const POLISH_SECTION = /^\/pl\/(?:contacts|schedule|history|sacraments|news)/;

const WORDS_PER_MINUTE = 170;
const MAX_ARTICLE_IMAGES = 8;
const MIN_IMAGE_WIDTH = 120;
const MIN_COVER_WIDTH = 600;

export const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 16);

export function titleOf(page, overrides = {}) {
  if (overrides[page.url]) return overrides[page.url];
  if (page.url.endsWith('/dokumet-ob-uchastii-vernyh-v-evharistii')) return 'Об участии верных в Евхаристии';
  return page.title.split(' | ')[0].trim();
}

const MAX_DESCRIPTION = 180;
// Default text the old site builder left where no description was written.
const PLACEHOLDER_DESCRIPTION = /^(?:Straipsnio aprašymas|Article description|Описание статьи)\.?$/i;

/** Short summary for cards and metadata, cut at a word boundary. */
export function descriptionOf(page, overrides = {}) {
  const fallback = page.blocks.find(block => block.tag === 'p' && block.text.length > 100)?.text || '';
  const own = (overrides[page.url] || page.description || '').trim();
  const text = (PLACEHOLDER_DESCRIPTION.test(own) ? '' : own) || fallback.trim();
  if (text.length <= MAX_DESCRIPTION) return text;
  const cut = text.slice(0, MAX_DESCRIPTION);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:—–-]+$/, '')}…`;
}

function imagesOf(page, site) {
  const best = new Map();
  for (const asset of site.assets) {
    const info = asset.local && site.imageManifest[asset.local];
    // Images repeated across many pages are the old sites' logo and banners.
    if (!info || !page.images.includes(asset.source) || asset.pages.length >= 4 || info.originalWidth < MIN_IMAGE_WIDTH) continue;
    // The old builder published several crops of one photo; keep the largest.
    const key = asset.source.split('/').pop();
    const area = info.originalWidth * info.originalHeight;
    if (!best.has(key) || best.get(key).area < area) {
      const usableAlt = asset.alt && !/bed linen|Image/i.test(asset.alt) ? asset.alt : titleOf(page, site.titleOverrides);
      best.set(key, { ...info, area, alt: usableAlt });
    }
  }
  return [...best.values()].slice(0, MAX_ARTICLE_IMAGES);
}

export function createCatalog(site) {
  const corePaths = new Set(site.languages.flatMap(lang => CORE_PAGES.map(page => site.route(lang, page))));
  const languageOf = page => (site.languages.includes(page.language) ? page.language : 'ru');

  function targetOf(page) {
    const source = new URL(page.url);
    if (source.hostname === 'bukiski-hram.org') return source.pathname === '/' ? '/ru/' : source.pathname;
    if (OLD_MAIN_SECTIONS[source.pathname]) return site.route(languageOf(page), OLD_MAIN_SECTIONS[source.pathname]);
    return `/${languageOf(page)}/library${source.pathname}.html`;
  }

  const claimed = new Map();
  const entries = site.pages.map(page => {
    const source = new URL(page.url);
    const target = targetOf(page);
    const ownsTarget = !corePaths.has(target) && !claimed.has(target);
    if (ownsTarget) claimed.set(target, page.url);
    const images = imagesOf(page, site);
    const cover = images[0]?.originalWidth >= MIN_COVER_WIDTH ? images[0] : null;
    return {
      page,
      url: page.url,
      host: source.hostname,
      sourcePath: source.pathname,
      language: page.language || 'ru',
      title: titleOf(page, site.titleOverrides),
      description: descriptionOf(page, site.descriptionOverrides),
      publishedAt: page.publishedAt || null,
      target,
      /** True when the preserved text is published at `target` itself. */
      ownsTarget,
      archive: ownsTarget && !site.stories.get(page.url)?.preserveOriginal ? target : `/archive/${hash(page.url)}.html`,
      cover,
      gallery: cover ? images.slice(1) : images,
      minutes: Math.max(1, Math.round(page.text.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE))
    };
  });

  const byUrl = new Map(entries.map(entry => [entry.url, entry]));
  const articles = entries.filter(entry => entry.ownsTarget && !POLISH_SECTION.test(entry.sourcePath));

  return {
    entries,
    byUrl,
    corePaths,
    /** Articles for the library of one UI language: that language first, then newest first. */
    articlesFor(lang) {
      const time = entry => (entry.publishedAt ? Date.parse(entry.publishedAt) : 0);
      return [...articles].sort((a, b) => (
        (b.language === lang) - (a.language === lang) || time(b) - time(a) || a.title.localeCompare(b.title, lang)
      ));
    },
    /** Dated articles for the parish-life page, newest first. */
    news: () => articles.filter(entry => entry.publishedAt).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 12),
    /** Old .net paths and where they lead now. */
    redirects: entries.filter(entry => entry.host === 'bukiski-hram.net').map(entry => ({ from: entry.sourcePath, to: entry.target })),
    inventory: entries.map(entry => ({
      source: entry.url,
      status: entry.page.status,
      language: entry.language,
      title: entry.title,
      target: entry.target,
      archive: entry.archive,
      textCharacters: entry.page.text.length,
      contentHash: hash(entry.page.text),
      strategy: entry.host.endsWith('.net') ? '301-on-old-host' : 'preserve-path'
    }))
  };
}
