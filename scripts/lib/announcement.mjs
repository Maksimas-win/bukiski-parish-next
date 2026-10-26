// A parish announcement: a slim strip in the page flow under the header, and a
// page that gathers the official materials it points to. Configured in
// content/announcement.json; disappears by itself after `showUntil`.

import { safeExternalURL, TIMEZONE } from '../../assets/js/domain.js';
import { html, attrs } from './html.mjs';
import { icon } from './icons.mjs';
import { externalLink, pageHead, phoneLink } from './components.mjs';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9-]+$/;
const ID = /^[a-z0-9-]+$/;

/** Calendar day in Vilnius for an instant, as YYYY-MM-DD. */
export function vilniusDay(instant) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(instant));
}

/** Throws when the announcement file is incomplete, unsafe or untranslated. */
export function validateAnnouncement(announcement, languages) {
  if (!announcement || announcement.enabled === false) return;
  const { id, showFrom, showUntil, slug, sources, materials, videos, texts } = announcement;
  if (!ID.test(id || '')) throw new Error('announcement.json: id must be lower-case letters, digits and hyphens');
  if (!SLUG.test(slug || '')) throw new Error('announcement.json: slug');
  if (!ISO_DATE.test(showFrom || '') || !ISO_DATE.test(showUntil || '') || showFrom > showUntil) throw new Error('announcement.json: showFrom/showUntil');
  for (const source of sources) if (!safeExternalURL(source.url)) throw new Error(`announcement.json: unsafe source ${source.id}`);
  for (const material of materials) {
    if (!Object.keys(material.urls).length) throw new Error(`announcement.json: material ${material.id} has no link`);
    for (const url of Object.values(material.urls)) if (!safeExternalURL(url)) throw new Error(`announcement.json: unsafe link in ${material.id}`);
  }
  for (const video of videos) if (!safeExternalURL(video.url)) throw new Error(`announcement.json: unsafe video ${video.id}`);
  for (const lang of languages) {
    const t = texts[lang];
    if (!t) throw new Error(`announcement.json: missing texts for ${lang}`);
    for (const key of ['label', 'text', 'link']) if (!t.strip?.[key]) throw new Error(`announcement.json: ${lang}.strip.${key}`);
    for (const key of ['title', 'description', 'lead', 'greeting', 'materialsTitle', 'prayerTitle', 'prayer', 'sourcesTitle', 'signature']) {
      if (!t.page?.[key]) throw new Error(`announcement.json: ${lang}.page.${key}`);
    }
    for (const material of materials) {
      if (!t.materials[material.id]) throw new Error(`announcement.json: ${lang}.materials.${material.id}`);
      for (const linkLang of Object.keys(material.urls)) if (!t.readIn[linkLang]) throw new Error(`announcement.json: ${lang}.readIn.${linkLang}`);
    }
    for (const video of videos) if (!t.videos[video.id]) throw new Error(`announcement.json: ${lang}.videos.${video.id}`);
    for (const source of sources) if (!t.sources[source.id]) throw new Error(`announcement.json: ${lang}.sources.${source.id}`);
  }
}

/** Whether the announcement belongs in a build made at `buildTime`. */
export function announcementActive(announcement, buildTime) {
  if (!announcement || announcement.enabled === false) return false;
  return vilniusDay(buildTime) <= announcement.showUntil;
}

export const announcementPath = (announcement, lang) => `/${lang}/${announcement.slug}.html`;

/**
 * The strip. It sits in the normal page flow, so it moves content down rather
 * than covering it. Before `showFrom` and after `showUntil` the browser hides it,
 * so a page cached before the end date does not keep showing it.
 */
export function announcementStrip(site, uiLocale, pageId) {
  const announcement = site.announcement;
  if (!announcementActive(announcement, site.buildTime) || pageId === 'announcement') return '';
  const t = announcement.texts[uiLocale] || announcement.texts.en;
  const today = vilniusDay(site.buildTime);
  return html`<aside${attrs({
    class: 'announcement',
    lang: uiLocale,
    'aria-label': t.strip.label,
    'data-announcement': announcement.id,
    'data-show-from': announcement.showFrom,
    'data-show-until': announcement.showUntil,
    hidden: today < announcement.showFrom
  })}>
    <div class="shell announcement__inner">
      <p class="announcement__text"><span class="announcement__label">${icon('info')}${t.strip.label}</span> <span>${t.strip.text}</span> <a class="announcement__link" href="${site.url(announcementPath(announcement, uiLocale))}">${t.strip.link}${icon('arrow-right')}</a></p>
    </div>
  </aside>`;
}

/** The page with the parish's word and the official materials. */
export function announcementPage(site, lang, siteT) {
  const announcement = site.announcement;
  const t = announcement.texts[lang];
  const p = t.page;
  return html`${pageHead({ title: p.title, intro: p.lead, kicker: p.eyebrow })}
  <article class="shell prose prose--narrow announcement-page">
    <p class="announcement-page__greeting">${p.greeting}</p>
    ${p.paragraphs.map(text => html`<p>${text}</p>`)}

    <h2>${p.materialsTitle}</h2>
    <ol class="announcement-materials">
      ${announcement.materials.map(material => html`<li class="announcement-material">
        <p class="announcement-material__title">${t.materials[material.id]}</p>
        ${t.notes?.[material.id] && html`<p class="announcement-material__note">${t.notes[material.id]}</p>`}
        <p class="announcement-material__links">${orderedLinks(material.urls, lang).map(([linkLang, url]) => html`<span lang="${linkLang}">${externalLink(siteT, url, t.readIn[linkLang])}</span>`)}</p>
      </li>`)}
    </ol>

    ${announcement.videos.length > 0 && html`<h2>${p.videosTitle}</h2>
    <ul class="announcement-videos">
      ${announcement.videos.map(video => html`<li>${externalLink(siteT, video.url, t.videos[video.id])}</li>`)}
    </ul>
    ${p.videosMore && html`<p>${p.videosMore}</p>`}`}

    <h2>${p.prayerTitle}</h2>
    <p>${p.prayer}</p>
    <p>${phoneLink(site, siteT, 'button button--quiet')}</p>

    <h2>${p.sourcesTitle}</h2>
    <ul class="announcement-sources">
      ${announcement.sources.map(source => html`<li>${externalLink(siteT, source.url, t.sources[source.id])}</li>`)}
    </ul>

    <p class="announcement-page__signature">${p.signature}</p>
  </article>`;
}

/** Links in the reader's language first, when the material exists in it. */
function orderedLinks(urls, lang) {
  return Object.entries(urls).sort(([a], [b]) => (b === lang) - (a === lang));
}
