import { $, $$, show } from './dom.js?v=c405fa1548';

// The only thing stored: the day the thank-you dialog last opened by itself,
// so it does not come back for `data-repeat-days`. Nothing personal.
const STORAGE_KEY = 'bukiski-thanks-shown';

function lastShown() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && !Number.isNaN(Date.parse(value)) ? Date.parse(value) : null;
  } catch {
    return undefined; // storage unavailable
  }
}

function rememberShown() {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

/** True while something else needs the visitor's attention. */
function busy(dialog) {
  if ($$('dialog[open]').some(other => other !== dialog)) return true;
  const active = document.activeElement;
  if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return true;
  if ($('[data-menu]')?.classList.contains('is-open')) return true;
  return false;
}

/**
 * The dialog is static markup on every page; this makes the footer link open
 * it and, on the home page only, opens it once by itself: after the delay,
 * once the visitor has scrolled a little, and not more than once in
 * `data-repeat-days`. If the browser cannot remember that, it never opens by
 * itself, so a visitor is not nagged on every visit.
 */
export function initThanks() {
  const dialog = $('[data-thanks]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  let returnFocus = null;
  const open = trigger => {
    if (dialog.open || $('dialog[open]')) return false;
    returnFocus = trigger || document.activeElement;
    dialog.showModal();
    dialog.scrollTop = 0;
    $('.thanks__close', dialog)?.focus({ preventScroll: true });
    return true;
  };

  for (const button of $$('[data-dialog-close]', dialog)) button.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  });

  for (const link of $$('[data-thanks-open]')) {
    show(link);
    link.addEventListener('click', () => open(link));
  }

  if (dialog.dataset.auto !== 'true') return;
  const previous = lastShown();
  if (previous === undefined) return;
  const repeatMs = Number(dialog.dataset.repeatDays) * 86400000;
  if (previous !== null && Date.now() - previous < repeatMs) return;
  const minScroll = Number(dialog.dataset.minScroll);
  const delay = Number(dialog.dataset.delay) * 1000;

  let elapsed = false;
  let scrolled = window.scrollY >= minScroll;
  let retries = 0;
  const attempt = () => {
    if (!elapsed || !scrolled) return;
    if (busy(dialog)) {
      if (retries++ < 12) setTimeout(attempt, 5000);
      return;
    }
    // Remember first: a dialog that cannot be remembered must not open.
    if (rememberShown()) open(null);
  };
  setTimeout(() => { elapsed = true; attempt(); }, delay);
  if (!scrolled) {
    window.addEventListener('scroll', function onScroll() {
      if (window.scrollY < minScroll) return;
      scrolled = true;
      window.removeEventListener('scroll', onScroll);
      attempt();
    }, { passive: true });
  }
}
