// The document shell: <head> metadata, header, footer and shared dialogs.

import { html, attrs, raw } from './html.mjs';
import { icon, socialIcon, svgDefs } from './icons.mjs';
import { LANGUAGE_NAMES } from './pages/library.mjs';
import { structuredData } from './structured-data.mjs';
import { externalLink, siteLink } from './components.mjs';
import { announcementStrip } from './announcement.mjs';

/**
 * Reviewed opt-in services: the parish assistant and the existing prayer form.
 */
export function contentSecurityPolicy(site) {
  const connect = ["'self'", 'https://bukiski-hram.org/integrations/telegram/website.php'];
  const endpoint = site.settings.notes?.endpoint;
  if (endpoint) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('settings.notes.endpoint must be an HTTPS URL without credentials');
    connect.push(url.origin);
  }
  return `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src ${connect.join(' ')}; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests`;
}

const NAVIGATION = ['schedule', 'history', 'sacraments', 'library', 'notes', 'contacts'];
const FOOTER_NAVIGATION = ['schedule', 'notes', 'sacraments', 'gallery', 'support', 'gpm', 'news', 'library', 'privacy'];
const OG_LOCALES = { ru: 'ru_RU', lt: 'lt_LT', en: 'en_GB', pl: 'pl_PL', de: 'de_DE', uk: 'uk_UA' };

/** Every site language, each in its own name, linking to this page in that language. */
function languageList(site, lang, targets, className) {
  return html`<ul class="${className}">
    ${targets.map(target => html`<li><a${attrs({ href: site.url(target.path), lang: target.lang, hreflang: target.lang, 'aria-current': target.lang === lang ? 'true' : null })}><span class="lang-code">${target.lang.toUpperCase()}</span><span class="lang-name">${LANGUAGE_NAMES[target.lang] || target.lang}</span></a></li>`)}
  </ul>`;
}

function header(site, t, lang, uiLocale, pageId, languageTargets) {
  return html`<header class="site-header" lang="${uiLocale}" data-header>
    <div class="shell site-header__bar">
      <a class="brand" href="${site.url(site.route(uiLocale, 'home'))}"${attrs({ 'aria-current': pageId === 'home' ? 'page' : null })}>
        <img class="brand__mark" src="${site.url('/assets/img/logo-128.webp')}" srcset="${site.url('/assets/img/logo-128.webp')} 1x, ${site.url('/assets/img/logo-256.webp')} 2x" width="52" height="52" alt="">
        <span class="brand__text"><span class="brand__name">${t.name}</span><span class="brand__place">${t.place}</span></span>
      </a>
      <a${attrs({ class: 'home-button', href: site.url(site.route(uiLocale, 'home')), 'aria-label': t.home, title: t.home, 'aria-current': pageId === 'home' ? 'page' : null })}>${icon('home')}</a>
      <details class="lang-menu" data-lang-menu>
        <summary aria-label="${t.languages}: ${LANGUAGE_NAMES[lang] || lang.toUpperCase()}" title="${t.languages}">${icon('globe')}<span>${lang.toUpperCase()}</span>${icon('chevron-down')}</summary>
        <div class="lang-menu__panel">
          <p class="lang-menu__title">${t.languages}</p>
          ${languageList(site, lang, languageTargets, 'lang-menu__list')}
        </div>
      </details>
      <button type="button" class="icon-button menu-toggle" data-menu-toggle hidden aria-expanded="false" aria-controls="site-menu" aria-label="${t.menu}">${icon('menu')}</button>
      <div class="site-menu" id="site-menu" data-menu>
        <nav class="site-nav" aria-label="${t.menu}">
          <a${attrs({ class: 'site-nav__home', href: site.url(site.route(uiLocale, 'home')), 'aria-current': pageId === 'home' ? 'page' : null })}>${icon('home')}<span>${t.home}</span></a>
          ${NAVIGATION.map(id => html`<a href="${site.url(site.route(uiLocale, id))}"${attrs({ 'aria-current': pageId === id ? 'page' : null })}>${t.nav[id]}</a>`)}
          <a class="site-nav__gpm" href="${site.url(site.route(uiLocale, 'gpm'))}"${attrs({ 'aria-current': pageId === 'gpm' ? 'page' : null })}>${t.nav.gpm}</a>
        </nav>
        <section class="menu-langs" aria-label="${t.languages}">
          <p class="menu-langs__title">${icon('globe')}${t.languages}</p>
          ${languageList(site, lang, languageTargets, 'menu-langs__list')}
        </section>
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
        <p class="site-footer__social" aria-label="${t.footerSocial}">${settings.social.map(item => externalLink(t, item.url, html`${socialIcon(item.id)}${item.label}`))}</p>
        <p>${externalLink(t, settings.links.church.url, settings.links.church.label[uiLocale])}</p>
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
  // The home photograph is the first thing seen: fetch it alongside the stylesheet.
  if (pageId === 'home') {
    const sizes = site.photos.hero;
    alternateLinks.push(html`<link rel="preload" as="image" type="image/webp" fetchpriority="high" imagesrcset="${sizes.map(size => `${site.url(`/${size.file}`)} ${size.width}w`).join(', ')}" imagesizes="100vw">`);
  }

  if (!noindex) {
    const jsonld = structuredData(site, t, uiLocale, { ...page, pageId, title, canonicalPath });
    if (jsonld) alternateLinks.push(raw(jsonld));
  }

  const values = {
    lang,
    uiLocale,
    page: pageId,
    title: fullTitle,
    siteName: t.name,
    description: description || title,
    csp: contentSecurityPolicy(site),
    robots,
    canonical: site.canonical(canonicalPath),
    base: site.base,
    assetVersion: site.assetVersion,
    ogType: article ? 'article' : 'website',
    ogLocale: OG_LOCALES[lang] || 'en_GB',
    ogImage: page.ogImage?.url || site.canonical('/assets/img/og-image.jpg'),
    ogImageWidth: page.ogImage?.width || 1200,
    ogImageHeight: page.ogImage?.height || 630,
    ogImageAlt: page.ogImage?.alt || t.photo,
    skip: t.skip,
    svgDefs: svgDefs(),
    alternates: raw(alternateLinks.join('\n  ')),
    bodyAttributes: attrs({ 'data-label-copied': t.copied, 'data-label-copy-failed': t.copyFailed }),
    header: html`${header(site, t, lang, uiLocale, pageId, languageTargets)}${announcementStrip(site, uiLocale, pageId)}`,
    footer: footer(site, t, uiLocale),
    dialogs: html`${dialogs(t, uiLocale)}${extraDialogs}`,
    body
  };
  const document = site.template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template placeholder: ${key}`);
    return html`${values[key]}`.value;
  });
  // Preserved articles have not changed since the source published them.
  return { html: document, noindex: noindex || noFollow, canonicalPath, lang, lastmod: page.publishedAt || null };
}

