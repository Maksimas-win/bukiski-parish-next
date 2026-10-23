// The 1,2 % GPM section: /<lang>/gpm.html in six languages.
//
// Every figure comes from content/gpm/config.json and the parish requisites in
// content/settings.json; the texts in content/gpm/<lang>.json refer to them
// through {placeholders}, so a new campaign changes one file. The page is
// complete without JavaScript: all steps visible, all answers open, the
// calculator explained in prose. assets/js/features/gpm/* adds the one-step
// helper, the calculator, the answer search, share/print and the WebGL figure.

import { html, attrs, raw } from '../html.mjs';
import { icon, emblem } from '../icons.mjs';
import { formatDate } from '../site.mjs';
import { externalLink, phoneLink, siteLink } from '../components.mjs';

const UI_LOCALES = { ru: 'ru-RU', lt: 'lt-LT', en: 'en-GB', pl: 'pl-PL', de: 'de-DE', uk: 'uk-UA' };

/** Vilnius calendar date of an instant, for choosing the campaign state at build time. */
function vilniusDate(instant) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function campaignPhaseOf(dateISO, campaign) {
  if (dateISO < campaign.filingStart) return 'before';
  if (dateISO > campaign.filingDeadline) return 'after';
  return 'during';
}

/** The values every text may refer to, formatted for the page language. */
function placeholders(site, lang) {
  const { config } = site.gpm;
  const { campaign, review } = config;
  const date = iso => formatDate(lang, `${iso}T12:00:00Z`, { dateStyle: 'long' });
  const dayMonth = iso => formatDate(lang, `${iso}T12:00:00Z`, { day: 'numeric', month: 'long' });
  return {
    taxYear: String(campaign.taxYear),
    filingYear: String(campaign.filingYear),
    lastTaxYear: String(campaign.lastTaxYear),
    start: date(campaign.filingStart),
    deadline: date(campaign.filingDeadline),
    correction: date(campaign.correctionDeadline),
    transferFrom: dayMonth(campaign.transferFrom),
    transferTo: dayMonth(campaign.transferTo),
    code: site.settings.organizationCode,
    name: site.settings.legalName,
    checked: date(review.sourcesCheckedOn),
    edited: date(review.editedOn),
    lawNumber: review.law.number,
    lawDate: date(review.law.adopted),
    lawRegister: review.law.register,
    lawEffective: date(review.law.effective),
    asOf: date(config.budgetAsOf)
  };
}

/** Fills {placeholders}; unknown keys (the client-side {n}, {amount}…) stay as they are. */
export const fill = (template, values) => String(template)
  .replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match))
  // «3 мая 2027 г.» at the end of a sentence must not double its full stop.
  .replace(/\.\.(?!\.)/g, '.');

const money = (lang, amount) => new Intl.NumberFormat(UI_LOCALES[lang] || lang, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);

function sectionHead(kicker, title, intro, id) {
  return html`<header class="gpm-section__head">
    ${kicker && html`<p class="eyebrow">${kicker}</p>`}
    <h2${attrs({ id: id ? `${id}-title` : null, tabindex: id ? '-1' : null })}>${title}</h2>
    ${intro && html`<p class="lead">${intro}</p>`}
  </header>`;
}

function hero(site, lang, t, f) {
  const decimal = lang === 'en' ? '.' : ',';
  return html`<section class="gpm-hero" data-gpm-hero data-decimal="${decimal}" aria-labelledby="gpm-title">
    <div class="shell gpm-hero__grid">
      <div class="gpm-hero__copy">
        <p class="eyebrow eyebrow--light">${f(t.eyebrow)}</p>
        <h1 id="gpm-title" class="gpm-hero__title"><span>${t.hero.title[0]}</span> <span>${t.hero.title[1]}</span></h1>
        <p class="gpm-hero__lead">${f(t.hero.lead)}</p>
        <div class="actions gpm-hero__actions">
          <a class="button button--on-dark" href="#scenarios">${t.hero.primary}</a>
          <a class="button button--ghost" href="#calculator">${t.hero.secondary}</a>
        </div>
        <p class="gpm-hero__caption">${t.hero.caption}</p>
      </div>
      <div class="gpm-hero__figure" role="img" aria-label="${t.hero.figureNote}">
        <canvas class="gpm-hero__canvas" aria-hidden="true"></canvas>
        <div class="gpm-hero__static" aria-hidden="true"><span class="gpm-figure">${t.hero.figure}</span></div>
      </div>
    </div>
  </section>`;
}

function phaseBlock(site, lang, t, f) {
  const { campaign } = site.gpm.config;
  const current = campaignPhaseOf(vilniusDate(site.buildTime), campaign);
  const states = ['before', 'during', 'after'];
  return html`<section class="shell gpm-phase" data-gpm-phase data-filing-start="${campaign.filingStart}" data-filing-deadline="${campaign.filingDeadline}" aria-labelledby="gpm-phase-title">
    <h2 id="gpm-phase-title" class="visually-hidden">${t.phase.title}</h2>
    <div class="gpm-phase__grid">
      <div class="gpm-phase__states">
        ${states.map(state => html`<article class="gpm-status gpm-status--${state}" data-phase="${state}"${attrs({ hidden: state !== current })}>
          <p class="gpm-status__label">${icon(state === 'during' ? 'clock' : state === 'after' ? 'info' : 'calendar')}<span>${t.phase[state].label}</span></p>
          <p>${f(t.phase[state].text)}</p>
          ${state === 'during' && html`<p class="actions">${externalLink(t.ui, site.gpm.config.links.eds, t.phase.during.action, 'button')}</p>`}
        </article>`)}
        <p class="gpm-phase__verify">${icon('info')}<span>${f(t.phase.verify)}</span></p>
      </div>
      <dl class="gpm-facts">
        ${t.facts.map(([label, value]) => html`<div><dt>${label}</dt><dd>${f(value)}</dd></div>`)}
      </dl>
    </div>
    <div class="gpm-toolbar">
      <button type="button" class="button button--quiet with-icon" data-gpm-share data-shared="${t.actions.shared}" data-share-title="${t.actions.shareTitle}" hidden>${icon('share')}<span>${t.actions.share}</span></button>
      <button type="button" class="button button--quiet with-icon" data-gpm-print hidden>${icon('print')}<span>${t.actions.print}</span></button>
      <span class="hint">${t.actions.printNote}</span>
    </div>
  </section>`;
}

function scenarios(t) {
  const emblems = { learn: 'book', first: 'route', again: 'calendar' };
  return html`<section class="shell gpm-section gpm-scenarios" id="scenarios" aria-labelledby="scenarios-title">
    ${sectionHead(null, t.scenarios.title, t.scenarios.intro, 'scenarios')}
    <ul class="gpm-scenarios__list">
      ${t.scenarios.items.map(item => html`<li><a class="gpm-scenario" href="#${item.target}" data-gpm-scenario="${item.target}" data-tilt>
        <span class="gpm-scenario__badge">${emblem(emblems[item.id] || 'book')}</span>
        <span class="gpm-scenario__title">${item.title}</span>
        <span class="gpm-scenario__text">${item.text}</span>
        <span class="gpm-scenario__action">${item.action}${icon('arrow')}</span>
      </a></li>`)}
    </ul>
  </section>`;
}

function basics(t, f) {
  const emblems = ['bank', 'heart', 'id', 'calendar'];
  return html`<section class="shell gpm-section" id="basics" aria-labelledby="basics-title">
    ${sectionHead(null, t.basics.title, f(t.basics.intro), 'basics')}
    <ul class="gpm-grid gpm-grid--four">
      ${t.basics.items.map(([heading, text], index) => html`<li class="card card--icon" data-tilt><span class="card__badge">${emblem(emblems[index])}</span><h3>${heading}</h3><p>${f(text)}</p></li>`)}
    </ul>
    <div class="gpm-grid gpm-grid--two gpm-basics__more">
      <article class="card card--tinted">
        <h3>${t.basics.who.title}</h3>
        <p>${f(t.basics.who.text)}</p>
      </article>
      <article class="card card--tinted">
        <h3>${t.basics.difference.title}</h3>
        <dl class="gpm-compare">
          ${t.basics.difference.items.map(([heading, text]) => html`<div><dt>${heading}</dt><dd>${f(text)}</dd></div>`)}
        </dl>
      </article>
    </div>
  </section>`;
}

function calculator(site, lang, t, f) {
  const c = t.calculator;
  const minimum = site.gpm.config.campaign.minimumTransferCents;
  const locale = UI_LOCALES[lang] || lang;
  return html`<section class="shell gpm-section" id="calculator" aria-labelledby="calculator-title">
    ${sectionHead(null, c.title, f(c.intro), 'calculator')}
    <form class="gpm-calc card" data-gpm-calc${attrs({ 'data-locale': locale, 'data-minimum': String(minimum), 'data-formula': c.formulaLine, 'data-together': c.together, 'data-below': c.belowMinimum, 'data-invalid': c.invalid })} novalidate>
      <div class="gpm-calc__inputs">
        <div class="field">
          <label for="gpm-amount">${f(c.inputLabel)}</label>
          <input id="gpm-amount" class="input" type="text" inputmode="decimal" autocomplete="off" placeholder="${c.inputHint}" data-calc-amount aria-describedby="gpm-amount-hint">
          <p id="gpm-amount-hint" class="hint">${c.local}</p>
        </div>
        <div class="field field--narrow">
          <label for="gpm-people">${c.peopleLabel}</label>
          <input id="gpm-people" class="input" type="number" inputmode="numeric" min="1" max="500" step="1" value="1" data-calc-people aria-describedby="gpm-people-hint">
          <p id="gpm-people-hint" class="hint">${c.peopleHint}</p>
        </div>
      </div>
      <div class="gpm-calc__unknown">
        <button type="button" class="button button--quiet" data-calc-unknown aria-expanded="false" aria-controls="gpm-examples" hidden>${c.unknownToggle}</button>
        <div id="gpm-examples" class="gpm-calc__examples" data-calc-examples>
          <p class="hint">${c.unknownIntro}</p>
          <ul class="gpm-calc__example-list">
            ${c.examples.map(example => html`<li><button type="button" class="gpm-chip" data-calc-example="${example.amount}">${example.label}: ${money(lang, Number(example.amount))} GPM</button></li>`)}
          </ul>
          <ul class="gpm-calc__static">
            ${c.examples.map(example => html`<li>${fill(c.formulaLine, { amount: new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(Number(example.amount)), result: new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(Math.round(Number(example.amount) * 12) / 10) })} <span class="gpm-badge">${c.exampleBadge}</span></li>`)}
          </ul>
        </div>
      </div>
      <p class="form-error" data-calc-error hidden role="alert"></p>
      <div class="gpm-calc__result" aria-live="polite">
        <div class="gpm-calc__main">
          <p class="gpm-calc__label">${c.result}</p>
          <output class="gpm-calc__value" for="gpm-amount" data-calc-result>—</output>
          <p class="gpm-calc__formula"><span>${c.formula}</span><span data-calc-formula></span></p>
        </div>
        <div class="gpm-calc__group" data-calc-group hidden>
          <p class="gpm-calc__label" data-calc-together-label></p>
          <output class="gpm-calc__value gpm-calc__value--small" for="gpm-people" data-calc-together>—</output>
          <p class="hint" data-calc-below hidden></p>
        </div>
      </div>
      <p class="hint">${c.approx}</p>
      <p class="hint">${c.minimumNote}</p>
    </form>
  </section>`;
}

function steps(site, lang, t, f) {
  const s = t.steps;
  const total = s.items.length;
  const code = site.settings.organizationCode;
  return html`<section class="shell gpm-section" id="steps" aria-labelledby="steps-title" data-gpm-steps data-progress="${s.progress}" data-show-all="${s.showAll}" data-show-one="${s.showOne}">
    ${sectionHead(null, s.title, s.intro, 'steps')}
    <div class="gpm-steps__controls" data-steps-controls hidden>
      <p class="gpm-steps__progress"><span data-steps-progress></span><span class="gpm-steps__bar" aria-hidden="true"><span data-steps-bar></span></span></p>
      <button type="button" class="button button--quiet" data-steps-mode aria-pressed="false">${s.showAll}</button>
    </div>
    <ol class="gpm-steps">
      ${s.items.map((step, index) => html`<li class="gpm-step card" data-step${attrs({ id: `step-${index + 1}` })}>
        <p class="gpm-step__number"><span class="visually-hidden">${fill(s.progress, { n: index + 1, total })}</span><span aria-hidden="true">${index + 1}</span></p>
        <div class="gpm-step__body">
          <h3 class="gpm-step__title">${step.title}</h3>
          <p class="gpm-step__action">${f(step.action)}</p>
          <p class="gpm-step__where"><strong>${s.whereLabel}:</strong> ${step.where}</p>
          <dl class="gpm-eds"><dt>${s.edsLabel}</dt>
            ${step.eds.map(([label, explain]) => html`<dd><code lang="lt">${label}</code><span>${explain}</span></dd>`)}
          </dl>
          ${step.copy && html`<p class="actions"><button type="button" class="button with-icon" data-gpm-copy="${code}" data-copied="${fill(s.copied, { code })}" hidden>${icon('copy')}<span>${s.copyCode}</span></button><span class="gpm-code" aria-label="${t.recipient.codeLabel}">${code}</span></p>`}
          ${index === 0 && html`<p class="actions">${externalLink(t.ui, site.gpm.config.links.eds, s.openEds, 'button button--quiet')}</p>`}
        </div>
        <div class="gpm-step__diagram" aria-hidden="true">${diagram(index)}</div>
      </li>`)}
    </ol>
    <p class="hint">${s.diagramNote}</p>
    <div class="gpm-steps__nav" data-steps-nav hidden>
      <button type="button" class="button button--quiet with-icon" data-steps-prev>${icon('arrow')}<span>${s.prev}</span></button>
      <button type="button" class="button with-icon" data-steps-next data-next="${s.next}" data-finish="${s.finish}"><span>${s.next}</span>${icon('arrow')}</button>
    </div>
    <aside class="gpm-checklist card card--tinted" id="checklist" aria-labelledby="checklist-title">
      <h3 id="checklist-title">${s.checklist.title}</h3>
      <ul class="gpm-checklist__list">
        ${s.checklist.items.map(item => html`<li>${icon('check')}<span>${f(item)}</span></li>`)}
      </ul>
      <p class="hint">${s.checklist.note}</p>
    </aside>
  </section>`;
}

/** Teaching illustrations of each step: abstract screens, never a copy of EDS. */
function diagram(index) {
  const frames = [
    '<rect x="26" y="34" width="68" height="52" rx="6"/><circle cx="60" cy="52" r="8"/><rect x="40" y="66" width="40" height="6" rx="3"/><rect x="48" y="90" width="24" height="6" rx="3" class="d-accent"/>',
    '<rect x="18" y="26" width="84" height="12" rx="3"/><rect x="18" y="44" width="84" height="12" rx="3"/><rect x="18" y="62" width="84" height="12" rx="3" class="d-accent"/><rect x="18" y="80" width="84" height="12" rx="3"/>',
    '<rect x="18" y="38" width="54" height="14" rx="3" class="d-accent"/><rect x="78" y="38" width="24" height="14" rx="3"/><rect x="18" y="60" width="84" height="12" rx="3"/><rect x="18" y="78" width="60" height="12" rx="3"/>',
    '<rect x="18" y="34" width="36" height="16" rx="3" class="d-accent"/><rect x="62" y="34" width="40" height="16" rx="3"/><rect x="18" y="62" width="84" height="12" rx="3"/><circle cx="30" cy="88" r="5"/><circle cx="60" cy="88" r="5"/><circle cx="90" cy="88" r="5" class="d-accent"/>',
    '<rect x="18" y="30" width="84" height="40" rx="6"/><path d="M40 50l10 10 24-24" class="d-check"/><rect x="36" y="82" width="48" height="14" rx="7" class="d-accent"/>'
  ];
  return raw(`<svg class="gpm-diagram" viewBox="0 0 120 120" focusable="false">${frames[index] || ''}</svg>`);
}

function again(t, f) {
  return html`<section class="shell gpm-section" id="again" aria-labelledby="again-title">
    ${sectionHead(null, t.again.title, t.again.intro, 'again')}
    <ol class="gpm-grid gpm-grid--two gpm-again">
      ${t.again.items.map(([heading, text], index) => html`<li class="card"><p class="gpm-again__number" aria-hidden="true">${index + 1}</p><h3>${heading}</h3><p>${f(text)}</p></li>`)}
    </ol>
    <p class="actions"><a class="button" href="#steps">${t.again.action}</a></p>
  </section>`;
}

function recipient(site, lang, t, f) {
  const r = t.recipient;
  const code = site.settings.organizationCode;
  return html`<section class="shell gpm-section" id="recipient" aria-labelledby="recipient-title">
    ${sectionHead(null, r.title, r.intro, 'recipient')}
    <div class="gpm-recipient card card--tinted">
      <dl class="gpm-recipient__list">
        <div><dt>${r.codeLabel}</dt><dd><span class="gpm-code gpm-code--large">${code}</span><button type="button" class="button button--quiet with-icon" data-gpm-copy="${code}" data-copied="${fill(t.steps.copied, { code })}" hidden>${icon('copy')}<span>${r.copyCode}</span></button></dd></div>
        <div><dt>${r.nameLabel}</dt><dd lang="lt">${site.settings.legalName}</dd></div>
      </dl>
      <p>${r.edsHint}</p>
      <p class="notice notice--warning">${f(r.verify)}</p>
      <p class="actions">${externalLink(t.ui, site.gpm.config.links.recipientSearch, r.search, 'link')}</p>
    </div>
  </section>`;
}

function help(site, lang, t, f) {
  const h = t.help;
  const { config } = site.gpm;
  return html`<section class="shell gpm-section" id="help" aria-labelledby="help-title">
    ${sectionHead(null, h.title, h.intro, 'help')}
    <ul class="gpm-projects">
      ${config.projects.map((project, index) => {
        const text = h.projects[index];
        const status = h.statusLabels[project.status];
        return html`<li class="gpm-project card" data-status="${project.status}">
          <div class="gpm-project__head">
            <span class="card__badge">${emblem(project.emblem)}</span>
            <p class="gpm-project__status"><span class="gpm-badge gpm-badge--${project.status}">${status}</span></p>
          </div>
          <h3>${text.title}</h3>
          <p>${text.text}</p>
          ${project.image && html`<figure class="gpm-project__media">
            ${project.now && html`<div class="gpm-project__shot"><img src="${site.url(project.now)}" alt="${text.title} — ${h.nowLabel}" loading="lazy" decoding="async" width="480" height="270"><figcaption>${h.nowLabel}</figcaption></div>`}
            <div class="gpm-project__shot gpm-project__shot--concept"><img src="${site.url(project.image)}" alt="${text.title} — ${h.conceptLabel}" loading="lazy" decoding="async" width="480" height="270"><figcaption>${h.conceptLabel}</figcaption></div>
          </figure>`}
          ${project.budget && html`<dl class="gpm-budget">
            <div><dt>${h.budget.total}</dt><dd>${money(lang, project.budget.total)}</dd></div>
            <div><dt>${h.budget.raised}</dt><dd>${money(lang, project.budget.raised)}</dd></div>
            <p class="hint">${f(h.budget.label)}</p>
          </dl>`}
          ${project.link && html`<p class="actions">${externalLink(t.ui, config.links[project.link], text.link, 'link')}</p>`}
        </li>`;
      })}
    </ul>
    <p class="hint gpm-projects__note">${h.budget.note}</p>
    <div class="gpm-grid gpm-grid--two gpm-help__more">
      <article class="card">
        <h3>${h.done.title}</h3>
        <p>${h.done.text}</p>
        <p class="actions">${siteLink(site, site.route(lang, 'history'), h.historyLink)}</p>
      </article>
      <article class="card card--tinted gpm-appeal">
        <h3>${h.appeal.heading}</h3>
        ${h.appeal.paragraphs.map(paragraph => html`<p>${paragraph}</p>`)}
        <p class="gpm-appeal__signature">${h.appeal.signature}</p>
        <div class="actions">
          ${phoneLink(site, t.ui)}
          ${siteLink(site, site.route(lang, 'contacts'), h.contact, 'button button--quiet')}
        </div>
      </article>
    </div>
  </section>`;
}

function donate(site, lang, t) {
  const d = t.donate;
  const { settings } = site;
  const { bank } = site.gpm.config;
  const ibanCompact = settings.iban.replace(/\s/g, '');
  const rows = [
    [d.fields.recipient, settings.legalName, settings.legalName],
    [d.fields.code, settings.organizationCode, settings.organizationCode],
    [d.fields.bank, bank.name, null],
    [d.fields.iban, settings.iban, ibanCompact],
    [d.fields.bic, bank.bic, bank.bic],
    [d.fields.purpose, html`${bank.purpose} <span class="hint">(${d.purposeExplain})</span>`, bank.purpose]
  ];
  const all = [settings.legalName, settings.organizationCode, bank.name, ibanCompact, bank.bic, bank.purpose].join('\n');
  return html`<section class="shell gpm-section" id="donate" aria-labelledby="donate-title">
    ${sectionHead(null, d.title, d.intro, 'donate')}
    <div class="gpm-donate card">
      <dl class="gpm-requisites">
        ${rows.map(([label, value, copy]) => html`<div><dt>${label}</dt><dd><span${attrs({ lang: label === d.fields.recipient || label === d.fields.purpose ? 'lt' : null })}>${value}</span>${copy && html`<button type="button" class="icon-button copy-button" data-gpm-copy="${copy}" data-copied="${t.ui.copied}" aria-label="${t.ui.copy}: ${label}" title="${t.ui.copy}" hidden>${icon('copy')}</button>`}</dd></div>`)}
      </dl>
      <div class="actions">
        <button type="button" class="button with-icon" data-gpm-copy="${settings.iban}" data-copied="${t.ui.copied}" hidden>${icon('copy')}<span>${d.copyIban}</span></button>
        <button type="button" class="button button--quiet with-icon" data-gpm-copy="${all}" data-copied="${t.ui.copied}" hidden>${icon('copy')}<span>${d.copyAll}</span></button>
      </div>
      <p class="hint">${d.note}</p>
      <p class="hint">${d.safety}</p>
    </div>
  </section>`;
}

function faq(t, f) {
  const q = t.faq;
  return html`<section class="shell gpm-section" id="faq" aria-labelledby="faq-title" data-gpm-faq>
    ${sectionHead(null, q.title, q.intro, 'faq')}
    <form class="gpm-faq__search" data-faq-form role="search" hidden>
      <label for="gpm-faq-search">${q.searchLabel}</label>
      <input id="gpm-faq-search" class="input" type="search" autocomplete="off" placeholder="${q.searchPlaceholder}" data-faq-search>
      <button type="button" class="button button--quiet" data-faq-reset>${q.showAll}</button>
    </form>
    <p class="hint" data-faq-empty hidden>${q.noMatch}</p>
    <div class="gpm-faq">
      ${q.items.map((item, index) => html`<details class="gpm-faq__item" data-faq-item${attrs({ id: `faq-${index + 1}` })}>
        <summary><span>${item.q}</span>${icon('chevron')}</summary>
        <div class="gpm-faq__answer"><p>${f(item.a)}</p>${item.link && html`<p><a class="link" href="#${item.link}">${t.scenarios.items.find(scenario => scenario.target === item.link)?.action || t.steps.title}${icon('arrow')}</a></p>`}</div>
      </details>`)}
    </div>
  </section>`;
}

function sources(site, lang, t, f) {
  const s = t.sources;
  const { config } = site.gpm;
  return html`<section class="shell gpm-section gpm-sources" id="sources" aria-labelledby="sources-title">
    ${sectionHead(null, s.title, f(s.intro), 'sources')}
    <ul class="gpm-sources__list">
      ${config.sources.map(source => html`<li>${externalLink(t.ui, source.url, f(s.items[source.id]))}</li>`)}
    </ul>
    <p class="gpm-sources__checked">${icon('check')}<span>${f(s.checked)} ${f(s.law)}</span></p>
    <p class="hint">${s.disclaimer} ${externalLink(t.ui, config.links.standalone, t.standalone)}</p>
    <p class="actions"><a class="button button--quiet" href="#gpm-title">${t.actions.top}</a></p>
  </section>`;
}

export function gpmPage(site, lang, ui) {
  const texts = { ...site.gpm.texts[lang], ui };
  const f = template => fill(template, placeholders(site, lang));
  return html`<div class="gpm" data-gpm>
    ${hero(site, lang, texts, f)}
    ${phaseBlock(site, lang, texts, f)}
    <noscript><p class="shell notice">${texts.noJs}</p></noscript>
    ${scenarios(texts)}
    ${basics(texts, f)}
    ${calculator(site, lang, texts, f)}
    ${steps(site, lang, texts, f)}
    ${again(texts, f)}
    ${recipient(site, lang, texts, f)}
    ${help(site, lang, texts, f)}
    ${donate(site, lang, texts)}
    ${faq(texts, f)}
    ${sources(site, lang, texts, f)}
  </div>`;
}

/** Title, description and FAQ entries for the route and its structured data. */
export function gpmMeta(site, lang) {
  const texts = site.gpm.texts[lang];
  const f = template => fill(template, placeholders(site, lang));
  return {
    title: f(texts.title),
    description: f(texts.description),
    faq: texts.faq.items.map(item => ({ question: item.q, answer: f(item.a) }))
  };
}
