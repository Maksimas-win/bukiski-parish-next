import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics, readConsent, campaignParameters, CONSENT_KEY, CONSENT_TTL } from '../assets/js/analytics.js';
import { loadSite } from '../scripts/lib/site.mjs';
import { renderDocument, contentSecurityPolicy } from '../scripts/lib/layout.mjs';
import { html } from '../scripts/lib/html.mjs';

const ID = 'G-RK3WMMM3V2';
const NOW = Date.parse('2026-11-16T20:00:00Z');

function browser({ stored = null, page = 'home', host = 'bukiski-hram.net', gpc = false } = {}) {
  const storage = new Map(stored ? [[CONSENT_KEY, stored]] : []);
  const listeners = new Map();
  const intervals = new Map();
  const timeouts = new Map();
  const scripts = [];
  const cookies = [];
  let handle = 0;
  let reloads = 0;
  const banner = { hidden: true, querySelector: () => null };
  const win = {
    location: { protocol: 'https:', hostname: host, origin: 'https://' + host, search: '?q=PRIVATE-NAME&email=private%40example.com', hash: '#private', reload: () => { reloads += 1; } },
    navigator: { globalPrivacyControl: gpc },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    addEventListener: (name, callback) => listeners.set('win:' + name, callback),
    setInterval: callback => { intervals.set(++handle, callback); return handle; },
    clearInterval: id => intervals.delete(id),
    setTimeout: callback => { timeouts.set(++handle, callback); return handle; },
    clearTimeout: id => timeouts.delete(id),
    innerHeight: 800, scrollY: 0
  };
  const doc = {
    body: { dataset: { page, locale: 'ru', analyticsId: ID } },
    referrer: 'https://referrer.example/private?q=PRIVATE-REFERRER', visibilityState: 'visible',
    documentElement: { scrollHeight: 2000 },
    querySelector: selector => selector === 'link[rel="canonical"]' ? { href: 'https://' + host + '/ru/' } : selector === '[data-analytics-banner]' ? banner : null,
    querySelectorAll: () => [],
    addEventListener: (name, callback) => listeners.set('doc:' + name, callback),
    createElement: () => ({ dataset: {}, remove() { this.removed = true; } }),
    head: { append: script => scripts.push(script) },
    set cookie(value) { cookies.push(value); }
  };
  const controller = createAnalytics({ win, doc, now: () => NOW });
  return { win, doc, controller, storage, listeners, intervals, timeouts, scripts, cookies, banner, get reloads() { return reloads; } };
}

test('No tag or queue exists before consent, on denial, expired choices or a browser privacy signal', () => {
  for (const options of [{}, { stored: JSON.stringify({ value: 'denied', at: NOW - 1000 }) }, { stored: JSON.stringify({ value: 'granted', at: NOW - CONSENT_TTL }) }, { gpc: true }]) {
    const b = browser(options);
    b.controller.init();
    assert.equal(b.controller.track('contact_click', { contact_method: 'phone' }), false);
    assert.equal(b.scripts.length, 0);
    assert.equal(b.win.dataLayer, undefined);
    assert.equal(b.win.gtag, undefined);
  }
  assert.equal(readConsent('{broken', NOW), null);
  assert.equal(readConsent(JSON.stringify({ value: 'granted', at: NOW + 1 }), NOW), null);
});

test('Grant starts one tag, records only later actions and strips queries, fragments and unapproved fields', () => {
  const b = browser();
  b.controller.init();
  b.controller.track('directions_click'); // must never be replayed
  b.controller.choose('granted');
  b.controller.choose('granted');
  assert.equal(b.scripts.length, 1);
  assert.equal(b.win.dataLayer.filter(command => command[0] === 'event' && command[1] === 'page_view').length, 1);
  assert.equal(b.win.dataLayer.some(command => command[1] === 'directions_click'), false);
  assert.equal(b.controller.track('contact_click', { contact_method: 'phone', message: 'PRIVATE-MESSAGE', email: 'private@example.com', link_url: 'PRIVATE-LINK' }), true);
  assert.equal(b.controller.track('arbitrary_event', { contact_method: 'phone' }), false);
  assert.equal(readConsent(b.storage.get(CONSENT_KEY), NOW), 'granted');
  const payload = JSON.stringify(b.win.dataLayer.map(command => [...command]));
  assert.doesNotMatch(payload, /PRIVATE|private@|\?q=|#private|link_url|search_term/);
  const config = b.win.dataLayer.find(command => command[0] === 'config')[2];
  assert.equal(config.page_location, 'https://bukiski-hram.net/ru/');
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.send_page_view, false);
  assert.equal(config.cookie_expires, 15552000);
});

test('Withdrawal blocks immediately, deletes only analytics cookies, clears queued events and unloads Google', () => {
  const b = browser({ stored: JSON.stringify({ value: 'granted', at: NOW - 1000 }) });
  b.controller.init();
  b.controller.choose('denied');
  assert.equal(b.win['ga-disable-' + ID], true);
  assert.equal(b.controller.track('directions_click'), false);
  assert.equal(b.win.dataLayer.length, 0);
  assert.equal(b.scripts[0].removed, true);
  assert.equal(b.intervals.size, 0);
  assert.equal(b.reloads, 1);
  assert.equal(readConsent(b.storage.get(CONSENT_KEY), NOW), 'denied');
  assert.ok(b.cookies.length > 0);
  assert.ok(b.cookies.every(value => /^_ga(?:_RK3WMMM3V2)?=; Max-Age=0;/.test(value)));
});

test('Consent withdrawal in another tab stops measurement; blocked storage keeps the current tab usable', () => {
  const b = browser({ stored: JSON.stringify({ value: 'granted', at: NOW - 1000 }) });
  b.controller.init();
  b.storage.set(CONSENT_KEY, JSON.stringify({ value: 'denied', at: NOW }));
  b.listeners.get('win:storage')({ key: CONSENT_KEY });
  assert.equal(b.controller.track('directions_click'), false);
  const privateTab = browser();
  privateTab.win.localStorage.getItem = () => { throw new Error('blocked'); };
  privateTab.win.localStorage.setItem = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => privateTab.controller.init());
  assert.doesNotThrow(() => privateTab.controller.choose('denied'));
  assert.equal(privateTab.scripts.length, 0);
});

test('Article reading requires visible time and a scroll after consent; background time does not count', () => {
  const b = browser({ page: 'article' });
  b.controller.init();
  b.win.scrollY = 1200;
  b.listeners.get('win:scroll')(); // pre-consent scroll must not count
  b.controller.choose('granted');
  for (let second = 0; second < 31; second++) for (const tick of b.intervals.values()) tick();
  assert.equal(b.win.dataLayer.some(command => command[1] === 'article_read'), false);
  b.listeners.get('win:scroll')();
  for (const tick of b.intervals.values()) tick();
  assert.equal(b.win.dataLayer.filter(command => command[1] === 'article_read').length, 1);
  const hidden = browser({ page: 'article' });
  hidden.controller.init(); hidden.controller.choose('granted');
  hidden.win.scrollY = 1200; hidden.listeners.get('win:scroll')(); hidden.doc.visibilityState = 'hidden';
  for (let second = 0; second < 60; second++) for (const tick of hidden.intervals.values()) tick();
  assert.equal(hidden.win.dataLayer.some(command => command[1] === 'article_read'), false);
});

test('Client refuses other hosts and prayer, document or unknown page types even if an ID is injected', () => {
  for (const options of [{ host: 'bukiski-hram.org' }, { host: 'maksimas-win.github.io' }, { page: 'notes' }, { page: 'document' }, { page: 'not-found' }]) assert.equal(browser(options).controller, null);
});

test('Campaign attribution accepts only known parish labels and debug mode requires its explicit flag', () => {
  assert.deepEqual(campaignParameters('?utm_source=viber&utm_medium=social&utm_campaign=parish_news&q=PRIVATE'), { campaign_source: 'viber', campaign_medium: 'social', campaign_name: 'parish_news' });
  assert.deepEqual(campaignParameters('?utm_source=private@example.com&utm_medium=PRIVATE&utm_campaign=PRIVATE'), {});
  const b = browser();
  b.win.location.search = '?analytics_debug=1&q=PRIVATE';
  b.controller.init(); b.controller.choose('granted');
  assert.equal(b.win.dataLayer.find(command => command[0] === 'config')[2].debug_mode, true);
});

test('Production markup gates analytics on public .net pages; preview, prayer and archive pages cannot opt in', async () => {
  const production = await loadSite({ PRODUCTION: 'true', SITE_ORIGIN: 'https://bukiski-hram.net', BASE_PATH: '' });
  const preview = await loadSite({ PRODUCTION: 'false', SITE_ORIGIN: 'https://maksimas-win.github.io', BASE_PATH: '/bukiski-parish-next' });
  const render = (site, pageId, noindex = false) => renderDocument(site, { pageId, noindex, lang: 'ru', title: 'Test', path: '/ru/test.html', body: html`<p>Public content</p>` }).html;
  assert.match(render(production, 'home'), /data-analytics-id="G-RK3WMMM3V2"/);
  assert.doesNotMatch(render(preview, 'home'), /data-analytics-id|data-analytics-banner/);
  assert.doesNotMatch(render(production, 'notes'), /data-analytics-id|data-analytics-banner/);
  assert.doesNotMatch(render(production, 'article', true), /data-analytics-id|data-analytics-banner/);
  assert.doesNotMatch(contentSecurityPolicy(preview), /google-analytics|googletagmanager/);
  assert.doesNotMatch(contentSecurityPolicy(production), /unsafe-inline|unsafe-eval|doubleclick|facebook\.net|\*\.google/);
  for (const lang of production.languages) {
    const page = renderDocument(production, { pageId: 'home', lang, title: 'Test', path: '/' + lang + '/', body: html`<p>Public content</p>` }).html;
    assert.match(page, /data-analytics-choice="denied"/);
    assert.match(page, /data-analytics-choice="granted"/);
    assert.match(page, /data-analytics-manage hidden/);
    assert.doesNotMatch(page, /<script[^>]+src="https:\/\//);
  }
});
