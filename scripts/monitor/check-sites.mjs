// Lightweight external checks of the two published parish sites.
//
//   node scripts/monitor/check-sites.mjs            # health: pages, versions, schedule freshness
//   MODE=release node scripts/monitor/check-sites.mjs   # after a .net release: wait until the host serves it
//   MODE=links node scripts/monitor/check-sites.mjs     # weekly: every sitemap page, its links and assets
//   SIMULATE=failure node scripts/monitor/check-sites.mjs   # adds one failing check to test the alerting
//
// Every request has a 15-second timeout. A network error, timeout, 5xx or 404
// is retried once after 20 seconds, so a single hiccup (or a file being
// replaced during a deployment) is not an incident. A site
// whose pages disagree with its version marker is re-checked once after 90 s,
// so a publication in progress is not an incident either.
// The result is written to $GITHUB_OUTPUT (failures, summary) and to
// monitor-result.json for scripts/monitor/report.mjs; nothing is sent anywhere.

import { writeFile, appendFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const MODE = process.env.MODE || 'health';
const TIMEOUT_MS = 15000;
const RETRY_AFTER_MS = 20000;
const DEPLOY_WINDOW_MS = 90000; // pages are uploaded before the version marker during a publication
const STALE_HOURS = 48;
const SITES = {
  net: {
    origin: 'https://bukiski-hram.net',
    pages: ['/', '/ru/', '/ru/schedule.html', '/ru/contacts.html', '/lt/', '/en/', '/pl/', '/de/', '/uk/'],
    marker: '<main id="main"'
  },
  org: {
    origin: 'https://bukiski-hram.org',
    pages: ['/', '/ru/', '/ru/schedule.html', '/ru/contacts.html', '/lt/', '/en/', '/pl/', '/ru/gpm.html'],
    marker: 'id="main-content"'
  }
};

const failures = [];
const notes = [];
const fail = (id, detail) => failures.push({ id, detail });

async function request(url, { retry = true } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'bukiski-site-monitor/1 (+github.com/Maksimas-win/bukiski-parish-next)' },
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      const body = await response.text();
      // 5xx: the host is struggling. 404: a known page may be mid-replacement during a deployment.
      if ((response.status >= 500 || response.status === 404) && retry && attempt === 1) { await delay(RETRY_AFTER_MS); continue; }
      return { status: response.status, headers: response.headers, body };
    } catch (error) {
      if (retry && attempt === 1) { await delay(RETRY_AFTER_MS); continue; }
      return { status: 0, headers: new Headers(), body: '', error: error.name === 'TimeoutError' ? 'timeout' : String(error.message || error) };
    }
  }
}

function ageHours(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? (Date.now() - time) / 3600000 : Infinity;
}

async function checkPage(site, path, { version, marker }) {
  const url = SITES[site].origin + path;
  const page = await request(url);
  if (page.status !== 200) return fail(`${site}:${path}`, `HTTP ${page.status || page.error}`);
  if (!page.headers.get('content-type')?.includes('text/html')) return fail(`${site}:${path}`, 'not HTML');
  if (!page.body.includes(marker)) return fail(`${site}:${path}`, 'main content marker missing');
  if (!page.body.includes('data-parish-assistant-entry')) return fail(`${site}:${path}`, 'assistant script missing');
  if (version && !page.body.includes(version)) return fail(`${site}:${path}`, `page does not reference version ${version}`);
  return page.body;
}

async function checkAsset(site, path, type) {
  const asset = await request(SITES[site].origin + path);
  if (asset.status !== 200 || !asset.headers.get('content-type')?.includes(type)) fail(`${site}:${path}`, `HTTP ${asset.status || asset.error}, ${asset.headers.get('content-type') || 'no type'}`);
}

async function checkNet(expectedVersion) {
  const info = await request(`${SITES.net.origin}/build-info.json`);
  let build = null;
  try { build = JSON.parse(info.body); } catch { /* reported below */ }
  if (info.status !== 200 || !build) { fail('net:build-info', `HTTP ${info.status || info.error}`); return; }
  if (build.production !== true) fail('net:build-info', 'production flag is not true (preview build published?)');
  if (expectedVersion && build.assetVersion !== expectedVersion) { fail('net:release', `live asset version ${build.assetVersion}, expected ${expectedVersion}`); return; }
  notes.push(`net: build ${build.generatedAt}, assets ${build.assetVersion}, calendar data from ${build.sourceUpdatedAt}`);
  const age = ageHours(build.sourceUpdatedAt);
  if (age > STALE_HOURS) fail('net:schedule-freshness', `calendar data last fetched ${build.sourceUpdatedAt} (${Math.round(age)} h ago, limit ${STALE_HOURS} h)`);
  for (const path of SITES.net.pages) await checkPage('net', path, { version: `?v=${build.assetVersion}`, marker: SITES.net.marker });
  await checkAsset('net', `/assets/css/site.css?v=${build.assetVersion}`, 'text/css');
  await checkAsset('net', `/assets/js/app.js?v=${build.assetVersion}`, 'javascript');
  await checkAsset('net', '/assets/js/parish-assistant.js', 'javascript');
  const feed = await request(`${SITES.net.origin}/data/services.json`);
  try { if (!Array.isArray(JSON.parse(feed.body).events)) throw new Error(); } catch { fail('net:services-json', `HTTP ${feed.status || feed.error} or invalid JSON`); }
  const sitemap = await request(`${SITES.net.origin}/sitemap.xml`);
  if (sitemap.status !== 200 || !sitemap.body.includes('<loc>https://bukiski-hram.net/ru/</loc>')) fail('net:sitemap', `HTTP ${sitemap.status || sitemap.error}`);
  const www = await request('https://www.bukiski-hram.net/ru/', { retry: false });
  if (www.status !== 301 || www.headers.get('location') !== 'https://bukiski-hram.net/ru/') fail('net:www-redirect', `HTTP ${www.status || www.error} → ${www.headers.get('location')}`);
}

async function checkOrg() {
  const versionFile = await request(`${SITES.org.origin}/version.json`);
  let version = null;
  try { version = JSON.parse(versionFile.body).version; } catch { /* reported below */ }
  if (versionFile.status !== 200 || !version) { fail('org:version', `HTTP ${versionFile.status || versionFile.error}`); return; }
  const feedResponse = await request(`${SITES.org.origin}/data/services.json`);
  let feed = null;
  try { feed = JSON.parse(feedResponse.body); } catch { /* reported below */ }
  if (!feed || !Array.isArray(feed.events)) fail('org:services-json', `HTTP ${feedResponse.status || feedResponse.error} or invalid JSON`);
  else {
    const fetchedAt = feed.source?.lastSuccessAt || feed.generatedAt;
    notes.push(`org: release ${version}, calendar data from ${fetchedAt}`);
    const age = ageHours(fetchedAt);
    if (age > STALE_HOURS) fail('org:schedule-freshness', `calendar data last fetched ${fetchedAt} (${Math.round(age)} h ago, limit ${STALE_HOURS} h)`);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius' }).format(new Date());
    if (!feed.coverage?.to || feed.coverage.to < today) fail('org:schedule-coverage', `coverage ends ${feed.coverage?.to}`);
  }
  for (const path of SITES.org.pages) await checkPage('org', path, { version: `content="${version}"`, marker: SITES.org.marker });
  await checkAsset('org', `/assets/css/base.css?v=${version}`, 'text/css');
  await checkAsset('org', `/assets/js/parish-assistant.js?v=${version}`, 'javascript');
  const sitemap = await request(`${SITES.org.origin}/sitemap.xml`);
  if (sitemap.status !== 200 || !sitemap.body.includes('sitemap-ru.xml')) fail('org:sitemap', `HTTP ${sitemap.status || sitemap.error}`);
  const www = await request('https://www.bukiski-hram.org/ru/', { retry: false });
  if (www.status !== 301 || www.headers.get('location') !== 'https://bukiski-hram.org/ru/') fail('org:www-redirect', `HTTP ${www.status || www.error} → ${www.headers.get('location')}`);
}

/** Every sitemap page of both sites, then every internal link and asset found on them. Sequential, gentle. */
async function checkLinks() {
  for (const [site, { origin }] of Object.entries(SITES)) {
    const pages = new Set();
    const index = await request(`${origin}/sitemap.xml`);
    const locs = text => [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    for (const loc of locs(index.body)) {
      if (loc.endsWith('.xml')) { const child = await request(loc); locs(child.body).forEach(page => pages.add(page)); } else pages.add(loc);
    }
    const targets = new Map();
    let checked = 0;
    for (const page of pages) {
      const response = await request(page);
      checked += 1;
      if (response.status !== 200) { fail(`${site}:page`, `${page} → HTTP ${response.status || response.error}`); continue; }
      for (const match of response.body.matchAll(/\b(href|src|srcset|imagesrcset)="([^"]+)"/g)) {
        // Only srcset lists are comma-separated; an href may legitimately contain commas (map links).
        const candidates = match[1].endsWith('srcset') ? match[2].split(',') : [match[2]];
        for (const candidate of candidates) {
          const value = candidate.trim().split(/\s+/)[0];
          if (!value || /^(?:#|tel:|mailto:|javascript:|webcal:|data:)/.test(value)) continue;
          let url;
          try { url = new URL(value.replace(/&amp;/g, '&'), page); } catch { continue; }
          if (url.origin !== origin) continue;
          url.hash = '';
          if (!targets.has(url.href)) targets.set(url.href, page);
        }
      }
      await delay(150);
    }
    for (const [href, from] of targets) {
      if (pages.has(href)) continue;
      const response = await request(href, { retry: false });
      if (response.status === 0 || response.status >= 400) {
        const again = await request(href);
        if (again.status === 0 || again.status >= 400) fail(`${site}:link:${href}`, `HTTP ${again.status || again.error} (linked from ${from})`);
      }
      await delay(100);
    }
    notes.push(`${site}: ${checked} pages, ${targets.size} links and assets checked`);
  }
}

/**
 * Runs one site's checks; if pages and the version marker disagree, a publication
 * may be in progress (files are uploaded before the marker), so that site is
 * re-checked once from scratch after a pause before anything is reported.
 */
async function checkSite(site, run) {
  await run();
  const mismatch = failures.some(item => item.id.startsWith(`${site}:`) && /does not reference version/.test(item.detail));
  if (!mismatch) return;
  await delay(DEPLOY_WINDOW_MS);
  for (let index = failures.length - 1; index >= 0; index -= 1) if (failures[index].id.startsWith(`${site}:`)) failures.splice(index, 1);
  for (let index = notes.length - 1; index >= 0; index -= 1) if (notes[index].startsWith(`${site}:`)) notes.splice(index, 1);
  notes.push(`${site}: version mismatch on the first pass, re-checked after ${DEPLOY_WINDOW_MS / 1000} s`);
  await run();
}

if (MODE === 'links') {
  await checkLinks();
} else if (MODE === 'release') {
  // The host pulls the new branch on its own schedule; allow it a few minutes.
  const expected = process.env.EXPECTED_ASSET_VERSION;
  if (!expected) throw new Error('EXPECTED_ASSET_VERSION is required in release mode');
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    failures.length = 0; notes.length = 0;
    await checkSite('net', () => checkNet(expected));
    if (!failures.some(item => item.id === 'net:release')) break;
    if (attempt < 8) await delay(45000);
  }
  await checkSite('org', checkOrg);
} else {
  await checkSite('net', () => checkNet());
  await checkSite('org', checkOrg);
}

if (process.env.SIMULATE === 'failure') fail('simulation', 'искусственный сбой для проверки уведомлений (SIMULATE=failure)');

const summary = [...notes, ...failures.map(item => `FAIL ${item.id}: ${item.detail}`)].join('\n');
console.log(summary || 'all checks passed');
await writeFile('monitor-result.json', JSON.stringify({ mode: MODE, checkedAt: new Date().toISOString(), failures, notes }, null, 2));
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `failed=${failures.length > 0}\n`);
