// Loads content and configuration once and exposes the helpers every page needs.

import { readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIMEZONE, SITE_LANGUAGES, FEED_LANGUAGES, normalizeSchedule, safeExternalURL } from '../../assets/js/domain.js';
import { localizeSchedule } from './liturgical.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DIST = resolve(ROOT, 'dist');
if (relative(ROOT, DIST) !== 'dist') throw new Error('Unsafe output path');

/** Sections that exist in every site language, in navigation order. */
export const CORE_PAGES = ['home', 'schedule', 'history', 'sacraments', 'gallery', 'news', 'contacts', 'library', 'notes', 'support', 'privacy'];

const DOCUMENT_DELIVERY = ['envelope', 'direct'];

const readJSON = async name => JSON.parse(await readFile(resolve(ROOT, 'content', name), 'utf8'));

function resolveOrigin(value) {
  if (!safeExternalURL(value) || new URL(value).pathname !== '/') throw new Error('SITE_ORIGIN must be an HTTPS origin');
  return new URL(value).origin;
}

function resolveBasePath(value) {
  const base = String(value ?? '').replace(/\/$/, '');
  if (base && !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(base)) throw new Error('Invalid BASE_PATH');
  return base;
}

export async function loadSite(env = process.env) {
  const [settings, locales, pages, assets, documents, sourceLinks, rawSchedule, imageManifest, photos, historyStory, liturgicalTerms, template] = await Promise.all([
    readJSON('settings.json'),
    readJSON('locales.json'),
    readJSON('source-pages.json'),
    readJSON('source-assets.json'),
    readJSON('source-documents.json'),
    readJSON('source-links.json'),
    readJSON('original-services.json'),
    readJSON('image-manifest.json'),
    readJSON('photos.json'),
    readJSON('stories/istoriya-o-hrame.json'),
    readJSON('liturgical-terms.json'),
    readFile(resolve(ROOT, 'index.html'), 'utf8')
  ]);

  if (settings.timezone !== TIMEZONE) throw new Error(`settings.timezone must be ${TIMEZONE}`);
  if (settings.locales.join() !== SITE_LANGUAGES.join()) throw new Error('settings.locales must match the supported site languages');

  const schedule = normalizeSchedule(rawSchedule);
  const untranslated = localizeSchedule(schedule, liturgicalTerms, SITE_LANGUAGES.filter(lang => !FEED_LANGUAGES.includes(lang)), rawSchedule.events);
  if (untranslated.length) console.warn(`Liturgical texts without a translation (English shown): ${untranslated.join('; ')}`);

  const origin = resolveOrigin(env.SITE_ORIGIN || settings.origin);
  const base = resolveBasePath(env.BASE_PATH ?? settings.basePath);
  const production = env.PRODUCTION === undefined ? settings.production === true : env.PRODUCTION === 'true';
  if (production) {
    const release = await readJSON('release.json');
    const approval = release.publication;
    if (approval?.approved !== true || approval.origin !== origin || base !== '') {
      throw new Error('Production publication requires explicit owner approval for this origin and an empty BASE_PATH');
    }
  }

  const documentDelivery = env.DOCUMENT_DELIVERY || settings.documentDelivery;
  if (!DOCUMENT_DELIVERY.includes(documentDelivery)) throw new Error(`DOCUMENT_DELIVERY must be one of: ${DOCUMENT_DELIVERY.join(', ')}`);

  const buildTime = env.BUILD_TIME ? Date.parse(env.BUILD_TIME) : Date.now();
  if (!Number.isFinite(buildTime)) throw new Error('Invalid BUILD_TIME');

  // The address the parish will publish at. Files installed on other hosts
  // (the old-domain redirects) must point here regardless of where a preview is built.
  const productionOrigin = resolveOrigin(settings.origin) + resolveBasePath(settings.basePath);

  return {
    settings,
    locales,
    pages,
    assets,
    documents,
    sourceLinks,
    rawSchedule,
    imageManifest,
    photos,
    /** Articles shown with a dedicated layout, by source URL. */
    stories: new Map([[historyStory.source, historyStory]]),
    template,
    schedule,
    origin,
    base,
    production,
    documentDelivery,
    buildTime,
    productionOrigin,
    languages: settings.locales,
    /** Site-relative path -> href usable from any page, including the GitHub project prefix. */
    url: path => base + path,
    /** Site-relative path -> absolute URL of this build. */
    canonical: path => origin + base + path,
    /** Path of a core section in a language. */
    route: (lang, page) => `/${lang}/${page === 'home' ? '' : `${page}.html`}`
  };
}

/** Formats an instant for readers in a site language, always on the Vilnius clock. */
export function formatDate(lang, value, options) {
  return new Intl.DateTimeFormat(lang, { timeZone: TIMEZONE, ...options }).format(new Date(value));
}

export const capitalize = text => text.charAt(0).toLocaleUpperCase() + text.slice(1);
