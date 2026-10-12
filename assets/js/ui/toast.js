import { $, create } from './dom.js?v=b48742dbc0';

const VISIBLE_MS = 3500;

/** Shows a short confirmation in the polite live region at the bottom of the page. */
export function toast(message) {
  const region = $('[data-toasts]');
  if (!region || !message) return;
  region.replaceChildren(create('p', { className: 'toast', text: message }));
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => region.replaceChildren(), VISIBLE_MS);
}
