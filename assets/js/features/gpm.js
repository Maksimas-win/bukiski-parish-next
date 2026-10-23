// Enhancements for the 1,2 % GPM section. The server-rendered page is already
// complete: every step, answer and figure is visible without this module.
// Here: the campaign state by the visitor's own calendar, the calculator
// (local arithmetic only — nothing is stored or transmitted), the one-step
// helper with progress, copy buttons with their own confirmation, the answer
// search, share and print, and the WebGL figure when the browser allows it.

import { $, $$, show, fill, prefersReducedMotion } from '../ui/dom.js?v=865c754a6b';
import { toast } from '../ui/toast.js?v=865c754a6b';
import { parseAmountToCents, supportCents, transferableSupportCents, campaignPhase, formatCents } from './gpm/math.js?v=865c754a6b';

/** Today's calendar date in Lithuania, so the state flips at Vilnius midnight. */
function vilniusToday() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function initPhase() {
  const root = $('[data-gpm-phase]');
  if (!root) return;
  const { filingStart, filingDeadline } = root.dataset;
  const current = campaignPhase(vilniusToday(), { filingStart, filingDeadline });
  for (const state of $$('[data-phase]', root)) show(state, state.dataset.phase === current);
}

function initScenarios() {
  for (const link of $$('[data-gpm-scenario]')) {
    link.addEventListener('click', event => {
      const target = document.getElementById(link.dataset.gpmScenario);
      if (!target) return;
      event.preventDefault();
      history.replaceState(null, '', `#${target.id}`);
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      const heading = $('h2', target);
      if (heading) heading.focus({ preventScroll: true });
    });
  }
}

function initCopy() {
  if (!navigator.clipboard?.writeText) return;
  for (const button of $$('[data-gpm-copy]')) {
    show(button);
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.gpmCopy);
        toast(button.dataset.copied || document.body.dataset.labelCopied);
      } catch {
        toast(document.body.dataset.labelCopyFailed);
      }
    });
  }
}

function initCalculator() {
  const form = $('[data-gpm-calc]');
  if (!form) return;
  const amount = $('[data-calc-amount]', form);
  const people = $('[data-calc-people]', form);
  const result = $('[data-calc-result]', form);
  const formula = $('[data-calc-formula]', form);
  const group = $('[data-calc-group]', form);
  const together = $('[data-calc-together]', form);
  const togetherLabel = $('[data-calc-together-label]', form);
  const below = $('[data-calc-below]', form);
  const error = $('[data-calc-error]', form);
  const unknown = $('[data-calc-unknown]', form);
  const examples = $('[data-calc-examples]', form);
  const { locale, formula: formulaTemplate, together: togetherTemplate, below: belowText, invalid } = form.dataset;
  const minimum = Number(form.dataset.minimum) || 300;

  // Examples are a mode the visitor opens on purpose; without JavaScript they are simply listed.
  show(examples, false);
  show(unknown);
  unknown.addEventListener('click', () => {
    const open = examples.hidden;
    show(examples, open);
    unknown.setAttribute('aria-expanded', String(open));
  });
  for (const chip of $$('[data-calc-example]', form)) {
    chip.addEventListener('click', () => {
      amount.value = chip.dataset.calcExample;
      for (const other of $$('[data-calc-example]', form)) other.setAttribute('aria-pressed', String(other === chip));
      compute();
      amount.focus();
    });
  }

  function peopleCount() {
    const value = Math.floor(Number(people.value));
    return Number.isFinite(value) && value >= 1 ? Math.min(value, 500) : 1;
  }

  function compute() {
    const text = amount.value.trim();
    if (!text) {
      amount.removeAttribute('aria-invalid');
      show(error, false);
      result.textContent = '—';
      formula.textContent = '';
      show(group, false);
      return;
    }
    const cents = parseAmountToCents(text);
    if (cents === null) {
      amount.setAttribute('aria-invalid', 'true');
      error.textContent = invalid;
      show(error);
      result.textContent = '—';
      formula.textContent = '';
      show(group, false);
      return;
    }
    amount.removeAttribute('aria-invalid');
    show(error, false);
    const share = supportCents(cents);
    result.textContent = `${formatCents(share, locale)} €`;
    formula.textContent = fill(formulaTemplate, { amount: formatCents(cents, locale), result: formatCents(share, locale) });
    const count = peopleCount();
    if (count > 1) {
      const each = transferableSupportCents(cents, minimum);
      togetherLabel.textContent = fill(togetherTemplate, { people: count });
      together.textContent = `${formatCents(each * count, locale)} €`;
      below.textContent = belowText;
      show(below, each === 0);
      show(group);
    } else {
      show(group, false);
    }
  }

  amount.addEventListener('input', compute);
  people.addEventListener('input', compute);
  form.addEventListener('submit', event => { event.preventDefault(); compute(); });
  compute();
}

function initSteps() {
  const root = $('[data-gpm-steps]');
  if (!root) return;
  const steps = $$('[data-step]', root);
  const controls = $('[data-steps-controls]', root);
  const nav = $('[data-steps-nav]', root);
  const progress = $('[data-steps-progress]', root);
  const bar = $('[data-steps-bar]', root);
  const prev = $('[data-steps-prev]', root);
  const next = $('[data-steps-next]', root);
  const mode = $('[data-steps-mode]', root);
  if (steps.length < 2) return;
  let index = 0;
  let all = false;

  function render(focus = false) {
    root.classList.toggle('is-all', all);
    steps.forEach((step, i) => step.classList.toggle('is-current', i === index));
    progress.textContent = fill(root.dataset.progress, { n: index + 1, total: steps.length });
    bar.style.width = `${((index + 1) / steps.length) * 100}%`;
    prev.disabled = index === 0;
    show(nav, !all);
    $('span', next).textContent = index === steps.length - 1 ? next.dataset.finish : next.dataset.next;
    mode.textContent = all ? root.dataset.showOne : root.dataset.showAll;
    mode.setAttribute('aria-pressed', String(all));
    if (focus) {
      const heading = $('.gpm-step__title', steps[index]);
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
      steps[index].scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
    }
  }

  prev.addEventListener('click', () => { if (index > 0) { index -= 1; render(true); } });
  next.addEventListener('click', () => {
    if (index < steps.length - 1) { index += 1; render(true); return; }
    const checklist = document.getElementById('checklist');
    checklist?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    $('h3', checklist)?.setAttribute('tabindex', '-1');
    $('h3', checklist)?.focus({ preventScroll: true });
  });
  mode.addEventListener('click', () => { all = !all; render(); });
  // A direct link to a step (#step-3) opens that step.
  const linked = steps.findIndex(step => `#${step.id}` === location.hash);
  if (linked >= 0) index = linked;
  show(controls);
  render();
  // Printing shows the whole guide, whatever is on screen.
  addEventListener('beforeprint', () => { root.classList.add('is-all'); for (const details of $$('details', document)) details.open = true; });
  addEventListener('afterprint', () => { root.classList.toggle('is-all', all); });
}

function initFaq() {
  const root = $('[data-gpm-faq]');
  if (!root) return;
  const form = $('[data-faq-form]', root);
  const input = $('[data-faq-search]', root);
  const reset = $('[data-faq-reset]', root);
  const empty = $('[data-faq-empty]', root);
  const items = $$('[data-faq-item]', root).map(element => ({ element, text: element.textContent.toLowerCase() }));
  show(form);
  function filter() {
    const query = input.value.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(term => term.length > 1);
    let shown = 0;
    for (const item of items) {
      const match = !terms.length || terms.every(term => item.text.includes(term));
      show(item.element, match);
      if (terms.length && match) item.element.open = true;
      if (match) shown += 1;
    }
    show(empty, shown === 0);
  }
  input.addEventListener('input', filter);
  form.addEventListener('submit', event => { event.preventDefault(); filter(); });
  reset.addEventListener('click', () => { input.value = ''; for (const item of items) item.element.open = false; filter(); input.focus(); });
}

function initShare() {
  const share = $('[data-gpm-share]');
  const print = $('[data-gpm-print]');
  const url = location.href.split('#')[0];
  if (share && (navigator.share || navigator.clipboard?.writeText)) {
    show(share);
    share.addEventListener('click', async () => {
      const title = share.dataset.shareTitle || document.title;
      try {
        if (navigator.share) await navigator.share({ title, url });
        else { await navigator.clipboard.writeText(url); toast(share.dataset.shared); }
      } catch (error) {
        if (error?.name !== 'AbortError') toast(document.body.dataset.labelCopyFailed);
      }
    });
  }
  if (print && typeof window.print === 'function') {
    show(print);
    print.addEventListener('click', () => window.print());
  }
}

export function init() {
  initPhase();
  initScenarios();
  initCopy();
  initCalculator();
  initSteps();
  initFaq();
  initShare();
  import('./gpm/hero.js?v=865c754a6b').then(hero => hero.init()).catch(() => {});
}
