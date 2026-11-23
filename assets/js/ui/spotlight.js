import { $, show } from './dom.js?v=b66f0eb5dd';

// The only thing stored: a session flag that the home spotlight of one
// publication has already been shown, so it does not come back on the next
// page in the same tab. Nothing personal, nothing that outlives the session.
const STORAGE_PREFIX = 'bukiski-spotlight:';

function announced(id) {
  try {
    return sessionStorage.getItem(STORAGE_PREFIX + id) === '1';
  } catch {
    return undefined; // storage unavailable
  }
}

function remember(id) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + id, '1');
    return true;
  } catch {
    return false;
  }
}

/** True while a dialog or the menu needs the visitor's attention. */
function busy() {
  if ($('dialog[open]')) return true;
  return Boolean($('[data-menu]')?.classList.contains('is-open'));
}

/**
 * The card is server-rendered and hidden. On the home page it appears once
 * per browser session, a moment after the page is ready, and slides in with
 * CSS. It never takes focus or blocks scrolling; Escape, the close button and
 * following the link hide it. A browser that cannot remember the session
 * never shows it, so nobody is nagged on every visit.
 */
export function initSpotlight() {
  const card = $('[data-spotlight]');
  if (!card) return;
  const id = card.dataset.spotlight;
  const dismiss = () => show(card, false);
  $('[data-spotlight-close]', card)?.addEventListener('click', dismiss);
  $('[data-spotlight-read]', card)?.addEventListener('click', dismiss);
  card.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    dismiss();
  });

  const seen = announced(id);
  if (seen === undefined || seen) return;
  let retries = 0;
  const attempt = () => {
    if (busy()) {
      if (retries++ < 15) setTimeout(attempt, 2000);
      return;
    }
    // Remember first: a card that cannot be remembered must not appear.
    if (remember(id)) show(card);
  };
  setTimeout(attempt, Number(card.dataset.delay) || 1200);
}
