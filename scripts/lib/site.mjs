// Loads content and configuration once and exposes the helpers every page needs.

import { readFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TIMEZONE, SITE_LANGUAGES, FEED_LANGUAGES, normalizeSchedule, safeExternalURL } from '../../assets/js/domain.js';
import { localizeSchedule } from './liturgical.mjs';
import { mergeAdditions } from './additions.mjs';
import { validateAnnouncement } from './announcement.mjs';
import { validateThanks } from './thanks.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DIST = resolve(ROOT, 'dist');
if (relative(ROOT, DIST) !== 'dist') throw new Error('Unsafe output path');

/** Sections that exist in every site language, in navigation order. */
export const CORE_PAGES = ['home', 'schedule', 'history', 'sacraments', 'gallery', 'news', 'contacts', 'library', 'notes', 'support', 'gpm', 'privacy'];

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
  const [settings, locales, pages, assets, documents, sourceLinks, rawSchedule, imageManifest, photos, historyStory, historyTexts, liturgicalTerms, scheduleAdditions, titleOverrides, descriptionOverrides, template] = await Promise.all([
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
    Promise.all(SITE_LANGUAGES.map(lang => readJSON(`history/${lang}.json`))),
    readJSON('liturgical-terms.json'),
    readJSON('schedule-additions.json'),
    readJSON('title-overrides.json'),
    readJSON('description-overrides.json'),
    readFile(resolve(ROOT, 'index.html'), 'utf8')
  ]);
  const gpm = await loadGpm();
  const announcement = await readJSON('announcement.json');
  validateAnnouncement(announcement, settings.locales);
  const thanks = await readJSON('thanks.json');
  validateThanks(thanks, settings.locales);

  if (settings.timezone !== TIMEZONE) throw new Error(`settings.timezone must be ${TIMEZONE}`);
  if (settings.locales.join() !== SITE_LANGUAGES.join()) throw new Error('settings.locales must match the supported site languages');

  const schedule = normalizeSchedule(rawSchedule);
  const untranslated = localizeSchedule(schedule, liturgicalTerms, SITE_LANGUAGES.filter(lang => !FEED_LANGUAGES.includes(lang)), rawSchedule.events);
  mergeAdditions(schedule, scheduleAdditions);
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
    /** Complete parish history, distinct from preserved original-language studies. */
    histories: Object.fromEntries(SITE_LANGUAGES.map((lang, index) => [lang, historyTexts[index]])),
    /** Readable titles for articles whose old <title> was in capitals; see content/title-overrides.json. */
    titleOverrides: titleOverrides.titles,
    /** Editorial descriptions without changing the preserved source records. */
    descriptionOverrides: descriptionOverrides.descriptions,
    /** The 1.2 % GPM section: one config for every figure, texts per language. */
    gpm,
    /** Parish announcement strip and its page; see content/announcement.json. */
    announcement,
    /** The thank-you dialog; see content/thanks.json. */
    thanks,
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Shape of a JSON value: keys sorted, array lengths kept, so six translations can be compared. */
function shapeOf(value) {
  if (Array.isArray(value)) return `[${value.length}:${value.length ? shapeOf(value[0]) : ''}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${key}:${shapeOf(value[key])}`).join(',')}}`;
  return typeof value;
}

/**
 * Loads content/gpm/config.json and the six text files, validating that every
 * figure the texts rely on is present and that the translations share one structure.
 */
export async function loadGpm() {
  const config = await readJSON('gpm/config.json');
  const { campaign, review } = config;
  for (const key of ['filingStart', 'filingDeadline', 'correctionDeadline', 'transferFrom', 'transferTo']) {
    if (!ISO_DATE.test(campaign[key] || '')) throw new Error(`gpm config: campaign.${key} must be an ISO date`);
  }
  if (!(campaign.filingStart < campaign.filingDeadline && campaign.filingDeadline < campaign.correctionDeadline)) throw new Error('gpm config: filing dates out of order');
  if (campaign.taxYear + 1 !== campaign.filingYear) throw new Error('gpm config: filingYear must follow taxYear');
  if (!Number.isInteger(campaign.lastTaxYear) || campaign.lastTaxYear < campaign.taxYear) throw new Error('gpm config: lastTaxYear');
  if (typeof campaign.recipientVerified !== 'boolean' || typeof campaign.gpmBankAccountVerified !== 'boolean') throw new Error('gpm config: verification flags must be booleans');
  for (const key of ['sourcesCheckedOn', 'editedOn']) if (!ISO_DATE.test(review[key] || '')) throw new Error(`gpm config: review.${key}`);
  for (const key of ['adopted', 'effective']) if (!ISO_DATE.test(review.law?.[key] || '')) throw new Error(`gpm config: review.law.${key}`);
  if (!ISO_DATE.test(config.budgetAsOf || '')) throw new Error('gpm config: budgetAsOf');
  for (const source of config.sources) if (!safeExternalURL(source.url)) throw new Error(`gpm config: source ${source.id}`);

  const texts = Object.fromEntries(await Promise.all(SITE_LANGUAGES.map(async lang => [lang, await readJSON(`gpm/${lang}.json`)])));
  const reference = shapeOf(texts.ru);
  for (const lang of SITE_LANGUAGES) {
    if (shapeOf(texts[lang]) !== reference) throw new Error(`content/gpm/${lang}.json differs in structure from ru.json`);
    for (const source of config.sources) if (!texts[lang].sources.items[source.id]) throw new Error(`content/gpm/${lang}.json: missing source title ${source.id}`);
    const ids = texts[lang].help.projects.map(project => project.id).join();
    if (ids !== config.projects.map(project => project.id).join()) throw new Error(`content/gpm/${lang}.json: project order must match config`);
  }
  return { config, texts };
}

/** Formats an instant for readers in a site language, always on the Vilnius clock. */
export function formatDate(lang, value, options) {
  return new Intl.DateTimeFormat(lang, { timeZone: TIMEZONE, ...options }).format(new Date(value));
}

export const capitalize = text => text.charAt(0).toLocaleUpperCase() + text.slice(1);
