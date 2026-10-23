// The 1,2 % GPM section: one configuration, six languages, honest wording.
// Run `npm run build` first (`npm run check` does both).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_LANGUAGES } from '../assets/js/domain.js';
import { parseAmountToCents, supportCents, transferableSupportCents, campaignPhase } from '../assets/js/features/gpm/math.js';
import { loadGpm } from '../scripts/lib/site.mjs';
import { fill, campaignPhaseOf } from '../scripts/lib/pages/gpm.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFile(resolve(root, path), 'utf8');
const settings = JSON.parse(await read('content/settings.json'));
const { config, texts } = await loadGpm();
const pages = Object.fromEntries(await Promise.all(SITE_LANGUAGES.map(async lang => [lang, await read(`dist/${lang}/gpm.html`)])));
const migration = JSON.parse(await read('content/migration.json'));

test('calculator arithmetic matches the standalone guide: integer cents, 1,2 %, 3 € threshold per person', () => {
  assert.equal(parseAmountToCents('1 850,50'), 185050);
  assert.equal(parseAmountToCents('1000'), 100000);
  assert.equal(parseAmountToCents('12.345'), null);
  assert.equal(parseAmountToCents('-5'), null);
  assert.equal(supportCents(100000), 1200); // 1 000 € → 12 €
  assert.equal(supportCents(20000), 240); // 200 € → 2,40 €
  assert.equal(transferableSupportCents(20000), 0); // below 3 € is not transferred
  assert.equal(transferableSupportCents(25000), 300);
  assert.equal(transferableSupportCents(25000) * 5, 1500); // pooled only after each share passes the threshold
  assert.throws(() => supportCents(-1));
});

test('campaign states follow the configured filing window, never a guessed next period', () => {
  const { campaign } = config;
  for (const phase of [campaignPhase, campaignPhaseOf]) {
    assert.equal(phase('2026-12-31', campaign), 'before');
    assert.equal(phase(campaign.filingStart, campaign), 'during');
    assert.equal(phase(campaign.filingDeadline, campaign), 'during');
    assert.equal(phase('2027-05-04', campaign), 'after');
  }
  assert.equal(campaign.taxYear, 2026);
  assert.equal(campaign.filingYear, 2027);
  assert.equal(campaign.filingDeadline, '2027-05-03');
});

test('verification flags are owner statements: still unconfirmed and never rendered', () => {
  assert.equal(config.campaign.recipientVerified, false);
  assert.equal(config.campaign.gpmBankAccountVerified, false);
  for (const [lang, html] of Object.entries(pages)) {
    assert.doesNotMatch(html, /recipientVerified|gpmBankAccountVerified/, lang);
  }
});

test('every language renders the section with the same requisites and no unfilled placeholders', () => {
  const iban = settings.iban;
  for (const [lang, html] of Object.entries(pages)) {
    assert.match(html, /data-gpm-hero/, lang);
    assert.match(html, /data-gpm-calc/, lang);
    assert.equal((html.match(/data-step\b/g) || []).length, texts[lang].steps.items.length, lang);
    assert.equal((html.match(/data-faq-item/g) || []).length, 12, lang);
    assert.ok(html.includes(settings.legalName), `${lang}: legal name`);
    assert.ok(html.includes(`data-gpm-copy="${settings.organizationCode}"`), `${lang}: code copy`);
    assert.ok(html.includes(iban), `${lang}: IBAN`);
    assert.ok(html.includes(config.bank.bic), `${lang}: BIC`);
    assert.doesNotMatch(html, /\{(taxYear|filingYear|start|deadline|correction|lastTaxYear|transferFrom|transferTo|code|name|checked|edited|law\w*|asOf)\}/, `${lang}: unfilled placeholder`);
    assert.doesNotMatch(html, /\.\.(?!\.)/, `${lang}: doubled full stop`);
    for (const other of SITE_LANGUAGES) assert.match(html, new RegExp(`hreflang="${other}" href="[^"]+/${other}/gpm\\.html"`), `${lang}: alternate ${other}`);
    assert.match(html, /"@type":"FAQPage"/, `${lang}: FAQ structured data`);
    assert.match(html, new RegExp(`${config.campaign.lastTaxYear}`), lang);
  }
});

test('the page prepares but never pretends to file: no acceptance message, no EDS button before filing opens', () => {
  for (const [lang, html] of Object.entries(pages)) {
    assert.doesNotMatch(html, /Заявление принято VMI|Application accepted by VMI|Prašymas priimtas VMI/i, lang);
    // The EDS button lives only inside the «during» state, which is hidden outside the window.
    const during = html.match(/<article class="gpm-status gpm-status--during"[^>]*>[\s\S]*?<\/article>/)?.[0];
    assert.ok(during, `${lang}: during state`);
    assert.match(during, /deklaravimas\.vmi\.lt/, lang);
    const before = html.match(/<article class="gpm-status gpm-status--before"[^>]*>[\s\S]*?<\/article>/)?.[0];
    assert.doesNotMatch(before, /deklaravimas\.vmi\.lt/, lang);
    const states = [...html.matchAll(/<article class="gpm-status gpm-status--(\w+)"([^>]*)>/g)];
    assert.equal(states.filter(match => !match[2].includes('hidden')).length, 1, `${lang}: exactly one state visible at build time`);
  }
});

test('texts stay in sync: identical structure, placeholders used consistently, EDS labels in Lithuanian', () => {
  const edsLabels = texts.ru.steps.items.map(step => step.eds.map(([label]) => label).join('|')).join('||');
  for (const lang of SITE_LANGUAGES) {
    assert.equal(texts[lang].steps.items.map(step => step.eds.map(([label]) => label).join('|')).join('||'), edsLabels, `${lang}: EDS element names`);
    assert.equal(texts[lang].faq.items.length, 12, lang);
    assert.ok(texts[lang].faq.items.every(item => item.link), `${lang}: every answer leads somewhere`);
    for (const step of texts[lang].steps.items) assert.match(step.action, /.{40,}/, `${lang}: step action`);
    // Amounts and periods live in config: texts must not hard-code the deadline or the code.
    const json = JSON.stringify(texts[lang]);
    assert.doesNotMatch(json, /301004570|LT40 7044|2027-05-03/, `${lang}: hard-coded figure`);
  }
  assert.equal(fill('{a} и {b}..', { a: 'х' }), 'х и {b}.');
});

test('the preserved .org guide pages moved to the archive and the new route is in the footer', async () => {
  for (const lang of SITE_LANGUAGES) {
    const entry = migration.find(item => item.source === `https://bukiski-hram.org/${lang}/gpm.html`);
    assert.ok(entry, `${lang}: .org guide inventory`);
    assert.equal(entry.target, `/${lang}/gpm.html`);
    assert.match(entry.archive, /^\/archive\/[a-f0-9]+\.html$/, `${lang}: archive copy`);
    await read(`dist${entry.archive}`);
    const home = await read(`dist/${lang}/index.html`);
    assert.match(home, new RegExp(`href="[^"]*/${lang}/gpm\\.html"`), `${lang}: footer link`);
  }
});

test('projects: figures only with their date, concepts labelled, no promise of a specific purchase', () => {
  assert.match(config.budgetAsOf, /^\d{4}-\d{2}-\d{2}$/);
  for (const [lang, html] of Object.entries(pages)) {
    for (const project of config.projects) {
      if (!project.budget) continue;
      assert.ok(html.includes(`gpm-project__shot--concept`), `${lang}: concept label`);
    }
    assert.ok(html.includes(texts[lang].help.budget.note), `${lang}: budget note`);
  }
});

test('the home page invites once: hero card, one band after the services, one navigation item', async () => {
  for (const lang of SITE_LANGUAGES) {
    const home = await read(`dist/${lang}/index.html`);
    assert.equal((home.match(/class="hero-gpm"/g) || []).length, 1, lang);
    assert.equal((home.match(/class="gpm-band"/g) || []).length, 1, lang);
    assert.equal((home.match(/class="site-nav__gpm"/g) || []).length, 1, lang);
    assert.ok(home.indexOf('class="services-band"') < home.indexOf('class="gpm-band"') && home.indexOf('class="gpm-band"') < home.indexOf('class="shell home-photos"'), `${lang}: band sits between services and photographs`);
    for (const anchor of ['#steps', '#calculator']) assert.ok(home.includes(`/${lang}/gpm.html${anchor}"`), `${lang}: link to ${anchor}`);
    // The example uses the section's arithmetic: 600 → 7,20, 1 500 → 18, 3 000 → 36.
    const results = [...home.matchAll(/data-gpm-example="(\d+)" data-result="([^"]+)"/g)].map(match => [Number(match[1]), match[2].replace(/\s/g, '').replace(',', '.')]);
    assert.deepEqual(results.map(([amount]) => amount), [600, 1500, 3000], lang);
    for (const [amount, text] of results) assert.equal(Number.parseFloat(text), supportCents(amount * 100) / 100, `${lang}: ${amount}`);
    // The card shows the configured campaign state, never an internal flag or a filing promise before the window.
    const card = home.slice(home.indexOf('<aside class="hero-gpm"'), home.indexOf('</aside>', home.indexOf('<aside class="hero-gpm"')));
    assert.doesNotMatch(card, /deklaravimas\.vmi\.lt|recipientVerified/, lang);
    const visibleStates = [...card.matchAll(/class="hero-gpm__state" data-phase="(\w+)"([^>]*)>/g)].filter(match => !match[2].includes('hidden'));
    assert.equal(visibleStates.length, 1, `${lang}: one campaign state`);
    assert.match(home, /data-gpm-state data-filing-start="\d{4}-\d{2}-\d{2}" data-filing-deadline="\d{4}-\d{2}-\d{2}"/, lang);
    assert.ok(home.includes(`>${config.campaign.taxYear}`) || home.includes(`${config.campaign.taxYear} `), `${lang}: tax year from config in the band text`);
  }
});
