// Basic consent mode: no Google script, queue or requests before explicit consent.
// This module never reads forms, messages, prayer names or search phrases.
export const CONSENT_KEY = 'bukiski-analytics-consent-v1';
export const CONSENT_TTL = 180 * 86400000;
const ID = 'G-RK3WMMM3V2';
const CONTAINER_ID = 'GTM-KQFHK588';
const HOST = 'bukiski-hram.net';
const LANGUAGES = new Set(['ru', 'lt', 'en', 'pl', 'de', 'uk']);
const PAGES = new Set(['home', 'schedule', 'history', 'sacraments', 'gallery', 'news', 'contacts', 'library', 'support', 'gpm', 'privacy', 'article', 'announcement']);
const EVENTS = new Set(['page_view', 'schedule_view', 'contacts_view', 'library_view', 'support_view', 'schedule_modal_open', 'contact_click', 'directions_click', 'map_open', 'calendar_download', 'calendar_subscribe', 'file_download', 'language_change', 'library_search', 'article_read', 'scroll', 'support_details_copy']);
const PARAMETERS = {
  contact_method: new Set(['phone', 'email', 'whatsapp']),
  download_type: new Set(['single_service', 'all_services', 'contact_card']),
  file_extension: new Set(['pdf', 'doc', 'docx', 'ics', 'vcf']),
  target_language: LANGUAGES,
  percent_scrolled: new Set([90])
};

// Only parish campaign labels from this vocabulary may reach Google.
// Arbitrary query values, free text, identifiers and click IDs are discarded.
export function campaignParameters(search) {
  const query = new URLSearchParams(search);
  const values = {};
  const vocabulary = {
    source: new Set(['facebook', 'instagram', 'telegram', 'viber', 'newsletter', 'google', 'bing', 'chatgpt.com']),
    medium: new Set(['social', 'email', 'referral', 'organic', 'cpc', 'paid_social', 'ai-assistant']),
    name: new Set(['parish_news', 'schedule', 'library', 'nativity', 'easter', 'gpm', 'seimas', 'kain'])
  };
  for (const [key, allowed] of Object.entries(vocabulary)) {
    const value = query.get(key === 'name' ? 'utm_campaign' : 'utm_' + key);
    if (allowed.has(value)) values['campaign_' + key] = value;
  }
  return values;
}

export function readConsent(value, now = Date.now()) {
  try {
    const choice = JSON.parse(value);
    if (!['granted', 'denied'].includes(choice?.value) || !Number.isFinite(choice.at)) return null;
    return choice.at <= now && now - choice.at < CONSENT_TTL ? choice.value : null;
  } catch { return null; }
}

/** Injectable browser boundary so consent and payload restrictions can be tested. */
export function createAnalytics({ win, doc, now = () => Date.now() }) {
  const page = doc.body.dataset.page;
  if (doc.body.dataset.analyticsId !== ID || win.location.protocol !== 'https:' || win.location.hostname !== HOST || !PAGES.has(page)) return null;
  const canonicalLink = doc.querySelector('link[rel="canonical"]');
  if (!canonicalLink) return null;
  const canonical = new URL(canonicalLink.href);
  if (canonical.origin !== win.location.origin) return null;
  const pageLocation = canonical.origin + canonical.pathname;
  let referrer = '';
  try { referrer = new URL(doc.referrer).origin + '/'; } catch { /* no referrer */ }
  const language = LANGUAGES.has(doc.body.dataset.locale) ? doc.body.dataset.locale : 'en';
  const banner = doc.querySelector('[data-analytics-banner]');
  let active = false;
  let started = false;
  let script = null;
  let timer = null;
  let searchTimer = null;
  let searched = false;
  let readSeconds = 0;
  let articleScrolled = false;
  let articleRead = false;
  let scrolled = false;
  const blockedByBrowser = win.navigator.globalPrivacyControl === true;

  function stored() {
    try { return readConsent(win.localStorage.getItem(CONSENT_KEY), now()); } catch { return null; }
  }

  function track(name, params = {}) {
    if (!active || blockedByBrowser || win['ga-disable-' + ID] || !EVENTS.has(name)) return false;
    const allowed = {};
    for (const [key, value] of Object.entries(params)) if (PARAMETERS[key]?.has(value)) allowed[key] = value;
    win.gtag('event', name, { send_to: ID, page_location: pageLocation, page_referrer: referrer, site_language: language, content_group: page, ...allowed });
    return true;
  }

  function start() {
    if (active || blockedByBrowser) return;
    active = true;
    win['ga-disable-' + ID] = false;
    if (!started) {
      started = true;
      win.dataLayer = [];
      win.gtag = function () { win.dataLayer.push(arguments); };
      win.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      win.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      // Standard GTM initialization does not apply legacy config commands.
      // Set safe defaults before loading the dedicated .net-only container.
      win.gtag('set', {
        send_page_view: false, page_location: pageLocation, page_referrer: referrer,
        site_language: language, content_group: page,
        ...campaignParameters(win.location.search),
        ...(new URLSearchParams(win.location.search).get('analytics_debug') === '1' ? { debug_mode: true } : {}),
        allow_google_signals: false, allow_ad_personalization_signals: false,
        ads_data_redaction: true, url_passthrough: false,
        cookie_domain: 'none', cookie_expires: CONSENT_TTL / 1000,
        cookie_update: false, cookie_flags: 'SameSite=Lax;Secure'
      });
      win.dataLayer.push({ 'gtm.start': now(), event: 'gtm.js' });
      script = doc.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtm.js?id=' + CONTAINER_ID;
      script.dataset.analyticsTag = '';
      doc.head.append(script);
    }
    track('page_view');
    const section = { schedule: 'schedule_view', contacts: 'contacts_view', library: 'library_view', support: 'support_view', gpm: 'support_view' }[page];
    if (section) track(section);
    timer = win.setInterval(() => {
      if (!active || doc.visibilityState !== 'visible') return;
      readSeconds += 1;
      if (page === 'article' && readSeconds >= 30 && articleScrolled && !articleRead) {
        articleRead = true;
        track('article_read');
      }
    }, 1000);
  }

  function stop() {
    active = false;
    // Block the installed Google tag synchronously, including its own listeners.
    win['ga-disable-' + ID] = true;
    win.clearInterval(timer);
    win.clearTimeout(searchTimer);
    script?.remove();
    if (win.dataLayer) win.dataLayer.length = 0;
    for (const name of ['_ga', '_ga_' + ID.slice(2)]) {
      for (const domain of ['', '; domain=' + HOST, '; domain=.' + HOST]) doc.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax; Secure' + domain;
    }
    // Reload after a withdrawal to remove all Google code from this document.
    if (started) win.location.reload();
  }

  function choose(value, persist = true) {
    if (!['granted', 'denied'].includes(value)) return;
    if (persist) {
      try { win.localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, at: now() })); }
      catch { if (value === 'denied') { try { win.localStorage.removeItem(CONSENT_KEY); } catch { /* unavailable storage cannot restore consent */ } } }
    }
    if (banner) banner.hidden = true;
    if (value === 'granted') start();
    else stop();
  }

  function init() {
    if (blockedByBrowser) return;
    for (const button of doc.querySelectorAll('[data-analytics-manage]')) {
      button.hidden = false;
      button.addEventListener('click', () => {
        if (!banner) return;
        banner.hidden = false;
        banner.querySelector('button')?.focus({ preventScroll: true });
      });
    }
    for (const button of doc.querySelectorAll('[data-analytics-choice]')) button.addEventListener('click', () => choose(button.dataset.analyticsChoice));
    win.addEventListener('storage', event => {
      if (event.key !== CONSENT_KEY) return;
      const value = stored();
      if (value) choose(value, false);
      else { if (banner) banner.hidden = false; stop(); }
    });
    doc.addEventListener('click', event => {
      if (!active) return;
      const target = event.target.closest('a,button');
      if (!target) return;
      if (target.matches('[data-add-to-calendar]')) return; // emitted after the file was created
      if (target.closest('.requisites') && target.matches('[data-copy]')) track('support_details_copy');
      if (!target.matches('a[href]')) return;
      let url;
      try { url = new URL(target.href, win.location.origin); } catch { return; }
      if (url.protocol === 'tel:') track('contact_click', { contact_method: 'phone' });
      else if (url.protocol === 'mailto:') track('contact_click', { contact_method: 'email' });
      else if (url.hostname === 'wa.me') track('contact_click', { contact_method: 'whatsapp' });
      else if (url.hostname === 'www.google.com' && url.pathname.startsWith('/maps/dir/')) track('directions_click');
      else if (url.hostname === 'www.openstreetmap.org') track('map_open');
      else if (url.protocol === 'webcal:' || (url.hostname === 'calendar.google.com' && !url.pathname.includes('/embed'))) track('calendar_subscribe');
      if (url.origin === win.location.origin) {
        const extension = url.pathname.split('.').at(-1).toLowerCase();
        if (extension === 'ics') track('calendar_download', { download_type: 'all_services', file_extension: 'ics' });
        else if (extension === 'vcf') track('file_download', { download_type: 'contact_card', file_extension: 'vcf' });
        else if (['pdf', 'doc', 'docx'].includes(extension)) track('file_download', { file_extension: extension });
        const targetLanguage = target.getAttribute('hreflang');
        if (LANGUAGES.has(targetLanguage) && targetLanguage !== language) track('language_change', { target_language: targetLanguage });
      }
    });
    doc.addEventListener('input', event => {
      if (!active || searched || !event.target.matches('#library-query')) return;
      win.clearTimeout(searchTimer);
      searchTimer = win.setTimeout(() => { if (track('library_search')) searched = true; }, 1200);
    });
    win.addEventListener('scroll', () => {
      if (!active) return;
      const height = doc.documentElement.scrollHeight - win.innerHeight;
      const progress = height > 0 ? win.scrollY / height : 0;
      if (progress >= 0.6) articleScrolled = true;
      if (progress >= 0.9 && !scrolled) { scrolled = true; track('scroll', { percent_scrolled: 90 }); }
    }, { passive: true });
    const choice = stored();
    if (choice) choose(choice, false);
    else if (banner) banner.hidden = false;
  }

  return { init, track, choose };
}

let controller = null;
export function initAnalytics() {
  try {
    controller = createAnalytics({ win: window, doc: document });
    controller?.init();
  } catch { controller = null; } // optional analytics cannot break navigation or forms
}
export function track(name, params) { return controller?.track(name, params) || false; }
