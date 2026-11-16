// Home spotlight (content/spotlight.json): a compact card at the bottom of the
// home page that invites the visitor to open one editorial publication. It is
// rendered hidden; the browser shows it once per session after a short delay
// (assets/js/ui/spotlight.js). Without JavaScript the page shows no card, and
// the publication stays reachable from the library and parish-life sections.

import { html, attrs } from './html.mjs';
import { icon } from './icons.mjs';
import { publicationPath } from './publications.mjs';

const TEXT_KEYS = ['label', 'rubric', 'title', 'text', 'read', 'close'];
const hasText = value => typeof value === 'string' && value.trim().length > 0;

/** Throws when the spotlight names an unknown publication or lacks its texts. */
export function validateSpotlight(spotlight, publications, languages) {
  if (!spotlight || spotlight.enabled === false) return;
  const publication = publications.find(candidate => candidate.slug === spotlight.publication);
  if (!publication) throw new Error(`spotlight.json: publication does not exist: ${spotlight.publication}`);
  const delay = spotlight.delayMilliseconds;
  if (!Number.isInteger(delay) || delay < 500 || delay > 5000) throw new Error('spotlight.json: delayMilliseconds must be 500–5000');
  const texts = spotlight.texts || {};
  if (!texts[publication.language]) throw new Error(`spotlight.json: missing texts for ${publication.language}`);
  for (const [lang, t] of Object.entries(texts)) {
    if (!languages.includes(lang)) throw new Error(`spotlight.json: unknown language ${lang}`);
    for (const key of TEXT_KEYS) if (!hasText(t[key])) throw new Error(`spotlight.json: ${lang}.${key}`);
  }
}

/** The publication a spotlight points to, or null when it is off. */
export function spotlightPublication(site) {
  const spotlight = site.spotlight;
  if (!spotlight || spotlight.enabled === false) return null;
  return site.publications.find(candidate => candidate.slug === spotlight.publication) || null;
}

/**
 * The card, only on the home page of a language with texts. It starts hidden
 * and sits outside <main>, so it never shifts the page or traps focus.
 */
export function spotlightCard(site, uiLocale, pageId) {
  const publication = spotlightPublication(site);
  const t = publication && site.spotlight.texts[uiLocale];
  if (pageId !== 'home' || !t) return '';
  return html`<aside${attrs({
    class: 'spotlight',
    lang: uiLocale,
    'aria-label': t.label,
    'data-spotlight': publication.slug,
    'data-delay': site.spotlight.delayMilliseconds,
    hidden: true
  })}>
    <div class="spotlight__card">
      <p class="eyebrow spotlight__rubric">${t.rubric}</p>
      <h2 class="spotlight__title" lang="${publication.language}">${t.title}</h2>
      <p class="spotlight__text" lang="${publication.language}">${t.text}</p>
      <a class="button spotlight__read" href="${site.url(publicationPath(publication))}" data-spotlight-read>${t.read}${icon('arrow-right')}</a>
      <button type="button" class="icon-button spotlight__close" data-spotlight-close aria-label="${t.close}">${icon('close')}</button>
    </div>
  </aside>`;
}
