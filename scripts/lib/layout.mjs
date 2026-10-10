// The document shell: <head> metadata, header, footer and shared dialogs.

import { html, attrs, raw } from './html.mjs';
import { icon, crossMark } from './icons.mjs';
import { siteLink } from './components.mjs';

export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests";

const NAVIGATION = ['schedule', 'history', 'sacraments', 'library', 'notes', 'contacts'];
const FOOTER_NAVIGATION = ['schedule', 'notes', 'support', 'news', 'library', 'privacy'];
const OG_LOCALES = { ru: 'ru_RU', lt: 'lt_LT', en: 'en_GB', pl: 'pl_PL', de: 'de_DE', uk: 'uk_UA' };

function header(site, t, lang, uiLocale, pageId, languageTargets) {
  return html`<header class="site-header" lang="${uiLocale}" data-header>
    <div class="shell site-header__bar">
      <a class="brand" href="${site.url(site.route(uiLocale, 'home'))}"${attrs({ 'aria-current': pageId === 'home' ? 'page' : null })}>
        ${crossMark}
        <span class="brand__text"><span class="brand__name">${t.name}</span><span class="brand__place">${t.place}</span></span>
      </a>
      <nav class="lang-switch" aria-label="${t.languages}">
        ${languageTargets.map(target => html`<a${attrs({ href: site.url(target.path), lang: target.lang, hreflang: target.lang, 'aria-current': target.lang === lang ? 'true' : null })}>${target.lang.toUpperCase()}</a>`)}
      </nav>
      <button type="button" class="icon-button menu-toggle" data-menu-toggle hidden aria-expanded="false" aria-controls="site-menu" aria-label="${t.menu}">${icon('menu')}</button>
      <div class="site-menu" id="site-menu" data-menu>
        <nav class="site-nav" aria-label="${t.menu}">
          ${NAVIGATION.map(id => html`<a href="${site.url(site.route(uiLocale, id))}"${attrs({ 'aria-current': pageId === id ? 'page' : null })}>${t.nav[id]}</a>`)}
        </nav>
        <button type="button" class="preferences-button" data-preferences-open hidden aria-haspopup="dialog" title="${t.access}">${icon('sliders')}<span>${t.access}</span></button>
      </div>
    </div>
  </header>`;
}

function footer(site, t, uiLocale) {
  const { settings } = site;
  return html`<footer class="site-footer" lang="${uiLocale}">
    <div class="shell site-footer__grid">
      <div class="site-footer__about">
        <p class="site-footer__name">${t.name}</p>
        <p>${t.footerLine}</p>
      </div>
      <div>
        <h2>${t.contacts}</h2>
        <p><a class="site-footer__phone" href="tel:${settings.phone}">${settings.phoneDisplay}</a></p>
        <p>${settings.address}</p>
        <p>${siteLink(site, site.route(uiLocale, 'contacts'), t.directions)}</p>
      </div>
      <nav aria-label="${t.footerNavigation}">
        <ul class="site-footer__links">
          ${FOOTER_NAVIGATION.map(id => html`<li>${siteLink(site, site.route(uiLocale, id), t[id])}</li>`)}
        </ul>
      </nav>
    </div>
    <div class="shell site-footer__legal">
      <p>© ${new Date(site.buildTime).getUTCFullYear()} ${settings.legalName}. ${t.rights}</p>
    </div>
  </footer>`;
}

function dialogs(t, uiLocale) {
  const themes = [['auto', t.themeAuto], ['light', t.themeLight], ['dark', t.themeDark]];
  return html`<dialog class="dialog" id="preferences" lang="${uiLocale}" aria-labelledby="preferences-title">
    <div class="dialog__head">
      <h2 id="preferences-title">${t.access}</h2>
      <button type="button" class="icon-button" data-dialog-close aria-label="${t.close}">${icon('close')}</button>
    </div>
    <fieldset class="segmented">
      <legend>${t.theme}</legend>
      <div class="segmented__options">
        ${themes.map(([value, label]) => html`<label><input type="radio" name="theme" value="${value}"${attrs({ checked: value === 'auto' })}><span>${label}</span></label>`)}
      </div>
    </fieldset>
    <label class="toggle"><input type="checkbox" data-preference="large"><span>${t.large}</span></label>
    <label class="toggle"><input type="checkbox" data-preference="contrast"><span>${t.contrast}</span></label>
    <button type="button" class="button button--quiet" data-preferences-reset>${t.reset}</button>
  </dialog>
  <div class="toast-region" data-toasts role="status" aria-live="polite" lang="${uiLocale}"></div>`;
}

/**
 * Fills the document template.
 * @param {object} page
 * @param {string} page.lang       language of the main content
 * @param {string} [page.uiLocale] language of navigation and labels (defaults to `lang`)
 * @param {string} page.path       site-relative path the page is written to
 */
export function renderDocument(site, page) {
  const {
    lang = 'ru', pageId = 'article', title, description, body, path,
    canonicalPath = path, alternates = [], noindex = false, noFollow = false, article = false, extraDialogs = ''
  } = page;
  const uiLocale = site.locales[page.uiLocale ?? lang] ? (page.uiLocale ?? lang) : 'en';
  const t = site.locales[uiLocale];
  const languageTargets = alternates.length
    ? alternates
    : site.languages.map(code => ({ lang: code, path: site.route(code, 'library') }));
  const fullTitle = title === t.name ? `${t.name} · ${t.place}` : `${title} | ${t.name}`;
  const robots = noFollow ? 'noindex,nofollow' : site.production && !noindex ? 'index,follow' : 'noindex,follow';
  const alternateLinks = alternates.map(alternate => html`<link rel="alternate" hreflang="${alternate.lang}" href="${site.canonical(alternate.path)}">`);
  if (alternates.length) alternateLinks.push(html`<link rel="alternate" hreflang="x-default" href="${site.canonical(alternates[0].path)}">`);

  const values = {
    lang,
    uiLocale,
    page: pageId,
    title: fullTitle,
    siteName: t.name,
    description: description || title,
    csp: CSP,
    robots,
    canonical: site.canonical(canonicalPath),
    base: site.base,
    assetVersion: site.assetVersion,
    ogType: article ? 'article' : 'website',
    ogLocale: OG_LOCALES[lang] || 'en_GB',
    ogImage: site.canonical('/assets/img/og-image.jpg'),
    photoAlt: t.photo,
    skip: t.skip,
    alternates: raw(alternateLinks.join('\n  ')),
    bodyAttributes: attrs({ 'data-label-copied': t.copied, 'data-label-copy-failed': t.copyFailed }),
    header: header(site, t, lang, uiLocale, pageId, languageTargets),
    footer: footer(site, t, uiLocale),
    dialogs: html`${dialogs(t, uiLocale)}${extraDialogs}`,
    body
  };
  const document = site.template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template placeholder: ${key}`);
    return html`${values[key]}`.value;
  });
  return { html: document, noindex: noindex || noFollow, canonicalPath, lang };
}
