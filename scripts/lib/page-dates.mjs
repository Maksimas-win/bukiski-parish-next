// The day each indexable page last changed, for <lastmod> in the sitemap.
//
// Every build publishes page-dates.json: a content fingerprint and a date per
// sitemap address. A production build is given the file of the previous
// publication (PREVIOUS_PAGE_DATES). A page whose fingerprint is unchanged
// keeps its date; a new or changed page gets the build day. Search engines use
// <lastmod> only while it stays accurate, so no date is ever guessed.
//
// Builds without that history (previews, local checks) date only articles
// with a known publication date and leave the other pages without <lastmod>.

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const PAGE_DATES_FILE = 'page-dates.json';
const VERSION = 1;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const FINGERPRINT = /^[0-9a-f]{20}$/;

/**
 * What a reader would call the page's content: its title, description and
 * main body. Shared header and footer, the release hash in asset addresses and
 * the "read also" list under an article are left out, so a new article
 * elsewhere does not change the date of every other one.
 */
export function contentFingerprint({ title, description, body }) {
  const main = String(body ?? '')
    .replace(/<footer class="shell article__more"[\s\S]*?<\/footer>/, '')
    .replace(/\?v=[0-9a-f]+/g, '');
  return createHash('sha256').update(JSON.stringify([title ?? '', description ?? '', main])).digest('hex').slice(0, 20);
}

/**
 * Reads the previous publication's dates. Returns null when no history was
 * configured, and an empty map when the file does not exist yet (the first
 * publication with dates). Malformed entries are ignored: such a page simply
 * gets the build day.
 */
export async function loadPageDates(path) {
  if (!path) return null;
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return new Map();
    throw error;
  }
  const data = JSON.parse(text);
  if (data?.version !== VERSION || !data.pages || typeof data.pages !== 'object') return new Map();
  return new Map(Object.entries(data.pages).filter(([path, record]) => (
    path.startsWith('/') && FINGERPRINT.test(record?.fingerprint || '') && DAY.test(record?.lastmod || '')
  )));
}

/**
 * Chooses the date of one page.
 * @param {Map|null} history previous publication, or null without history
 * @param {string} buildDay YYYY-MM-DD of this build
 * @param {string|null} publishedAt known publication date of an article
 */
export function lastmodOf({ path, fingerprint, publishedAt }, history, buildDay) {
  if (!history) return DAY.test(String(publishedAt || '').slice(0, 10)) ? publishedAt.slice(0, 10) : null;
  const previous = history.get(path);
  return previous?.fingerprint === fingerprint ? previous.lastmod : buildDay;
}

/** The file published next to the sitemap and read by the next production build. */
export function pageDatesFile(pages) {
  return `${JSON.stringify({ version: VERSION, pages: Object.fromEntries(pages.map(({ path, fingerprint, lastmod }) => [path, { fingerprint, lastmod }])) }, null, 1)}\n`;
}
