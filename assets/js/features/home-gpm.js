// The 1,2 % GPM invitation on the home page: the three-button example and the
// campaign state by the visitor's own calendar. The arithmetic is the section's
// own (features/gpm/math.js), so the home page and the guide never disagree.
// Nothing is stored or transmitted; without this module the page already shows
// every example value and the links.

import { $, $$, show, prefersReducedMotion } from '../ui/dom.js?v=e1e0695f8e';
import { campaignPhase } from './gpm/math.js?v=e1e0695f8e';

function vilniusToday() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function initState() {
  const card = $('[data-gpm-state]');
  if (!card) return;
  const current = campaignPhase(vilniusToday(), { filingStart: card.dataset.filingStart, filingDeadline: card.dataset.filingDeadline });
  for (const state of $$('[data-phase]', card)) show(state, state.dataset.phase === current);
}

function initExample() {
  const root = $('[data-home-gpm]');
  const output = $('[data-gpm-example-result]', root || document);
  if (!root || !output) return;
  const chips = $$('[data-gpm-example]', root);
  root.classList.add('is-interactive');
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      for (const other of chips) other.setAttribute('aria-pressed', String(other === chip));
      // The value is pre-computed at build time with the same integer-cent arithmetic.
      if (prefersReducedMotion()) {
        output.textContent = chip.dataset.result;
        return;
      }
      output.classList.add('is-changing');
      setTimeout(() => {
        output.textContent = chip.dataset.result;
        output.classList.remove('is-changing');
      }, 120);
    });
  }
}

export function init() {
  initState();
  initExample();
}
