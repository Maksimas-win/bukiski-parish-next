// The parish's thank-you dialog (content/thanks.json): rendered on every page
// so the footer link can open it; shown by itself only on the home page, on
// the terms in `behaviour`, and never while the announcement strip is up when
// `pauseWhileAnnouncement` is set.

import { html, attrs } from './html.mjs';
import { icon } from './icons.mjs';
import { announcementActive } from './announcement.mjs';

export function validateThanks(thanks, languages) {
  const b = thanks.behaviour;
  for (const key of ['delaySeconds', 'minScrollPixels', 'repeatDays']) {
    if (!Number.isInteger(b[key]) || b[key] < 0) throw new Error(`thanks.json: behaviour.${key}`);
  }
  for (const lang of languages) {
    const t = thanks.texts[lang];
    if (!t) throw new Error(`thanks.json: missing texts for ${lang}`);
    for (const key of ['eyebrow', 'title', 'continue', 'close', 'footerLink']) if (!t[key]) throw new Error(`thanks.json: ${lang}.${key}`);
    if (!Array.isArray(t.paragraphs) || !t.paragraphs.length) throw new Error(`thanks.json: ${lang}.paragraphs`);
    if (!Array.isArray(t.signature) || t.signature.length !== 2) throw new Error(`thanks.json: ${lang}.signature`);
  }
}

/** Whether this build lets the dialog open by itself on the home page. */
export function thanksAutoShow(site) {
  const b = site.thanks.behaviour;
  if (!b.autoShowOnHome) return false;
  return !(b.pauseWhileAnnouncement && announcementActive(site.announcement, site.buildTime));
}

export function thanksDialog(site, uiLocale, pageId) {
  const t = site.thanks.texts[uiLocale] || site.thanks.texts.en;
  const b = site.thanks.behaviour;
  const auto = pageId === 'home' && thanksAutoShow(site);
  return html`<dialog${attrs({
    class: 'dialog thanks',
    id: 'thanks',
    lang: uiLocale,
    'aria-labelledby': 'thanks-title',
    'data-thanks': true,
    'data-auto': auto ? 'true' : 'false',
    'data-delay': b.delaySeconds,
    'data-min-scroll': b.minScrollPixels,
    'data-repeat-days': b.repeatDays
  })}>
    <div class="thanks__card">
      <button type="button" class="icon-button thanks__close" data-dialog-close aria-label="${t.close}">${icon('close')}</button>
      <span class="thanks__cross" aria-hidden="true"></span>
      <p class="eyebrow thanks__eyebrow">${t.eyebrow}</p>
      <h2 id="thanks-title" class="thanks__title">${t.title}</h2>
      <div class="thanks__body">
        ${t.paragraphs.map(text => html`<p>${text}</p>`)}
        <p class="thanks__signature">${t.signature[0]}<br>${t.signature[1]}</p>
      </div>
      <p class="thanks__actions"><button type="button" class="button" data-dialog-close>${t.continue}</button></p>
    </div>
  </dialog>`;
}

/** Footer link that opens the dialog; hidden until JavaScript can open it. */
export function thanksFooterLink(site, uiLocale) {
  const t = site.thanks.texts[uiLocale] || site.thanks.texts.en;
  return html`<button type="button" class="site-footer__thanks" data-thanks-open hidden aria-haspopup="dialog">${t.footerLink}</button>`;
}
