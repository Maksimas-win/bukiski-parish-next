import { $, show } from './dom.js?v=d2b25f3da3';

/** Today's date in Vilnius as YYYY-MM-DD, whatever the visitor's clock zone. */
function vilniusToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * The strip is server-rendered and readable without JavaScript. A page built
 * earlier may still be cached after the last day; here it hides itself then.
 * Nothing is stored in the browser.
 */
export function initAnnouncement() {
  const strip = $('[data-announcement]');
  if (!strip) return;
  const today = vilniusToday();
  show(strip, today >= strip.dataset.showFrom && today <= strip.dataset.showUntil);
}
