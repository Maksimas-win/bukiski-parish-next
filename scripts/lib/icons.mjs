// Inline SVG icons. They are decorative: every control that uses one also has
// a visible label or an aria-label. Stroke styling lives in the stylesheet.

import { raw } from './html.mjs';

const PATHS = {
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M8 17h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  'calendar-plus': 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4 M12 13v4 M10 15h4',
  copy: 'M9 9h11v11H9z M5 15H4V4h11v1',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  close: 'M6 6l12 12 M18 6L6 18',
  sliders: 'M4 7h10 M18 7h2 M4 17h2 M10 17h10 M16 5v4 M8 15v4',
  'arrow-right': 'M5 12h14 M13 6l6 6-6 6',
  'arrow-up': 'M12 19V5 M6 11l6-6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-right': 'M9 6l6 6-6 6',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  print: 'M7 8V4h10v4 M7 17H4V9h16v8h-3 M7 14h10v6H7z',
  share: 'M12 15V4 M8 8l4-4 4 4 M5 12v8h14v-8',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  contact: 'M5 4h14v16H5z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M8 17a4 4 0 0 1 8 0',
  message: 'M4 5h16v11H9l-5 4z',
  send: 'M4 12l16-8-6 16-3-7z M11 13l9-9',
  bus: 'M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2z M4 11h16 M7 19v-3 M17 19v-3 M7.5 14h.01 M16.5 14h.01',
  car: 'M5 16V11l2-5h10l2 5v5z M3 16h18 M7.5 13.5h.01 M16.5 13.5h.01 M7 16v2 M17 16v2',
  manor: 'M3 21h18 M4 21V10l8-6 8 6v11 M4 14h16 M8 21v-4 M16 21v-4 M8 10h.01 M12 10h.01 M16 10h.01',
  church: 'M12 2v4 M10 4h4 M8 10a4 4 0 0 1 8 0 M7 21V10h10v11 M4 21h16 M4 21v-7l3-2 M20 21v-7l-3-2 M12 21v-4',
  anvil: 'M4 7h12a4 4 0 0 1-4 4H9 M9 11v4 M14 11v4 M6 19h12 M8 15h8 M18 4l3 3',
  bath: 'M12 3s-5 6-5 10a5 5 0 0 0 10 0c0-4-5-10-5-10z M4 21h16',
  carriage: 'M3 14h13l2-5H6z M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M15 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18 9h3',
  house: 'M3 11l9-7 9 7 M5 10v11h14V10 M10 21v-6h4v6',
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z M5 19.5A1.5 1.5 0 0 0 6.5 21H19 M9 7h6',
  chalice: 'M6.5 3h11c0 5.5-2.5 8.5-5.5 8.5S6.5 8.5 6.5 3z M12 11.5V18 M8 21h8 M9.5 18h5',
  rings: 'M3.5 14.5a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M10.5 14.5a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M8.5 5.5l2-2.5 2 2.5',
  candle: 'M10 10h4v11h-4z M12 3c1.6 1.8 1.6 3.6 0 5.2c-1.6-1.6-1.6-3.4 0-5.2z M7 21h10',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  bank: 'M3 9l9-5 9 5 M5 9v9 M10 9v9 M14 9v9 M19 9v9 M3 20h18',
  id: 'M4 5h16v14H4z M8 10h.01 M11 10h5 M8 14h8',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  home: 'M3 11.5 12 4l9 7.5 M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9 M12 3c-2.5 2.6-3.8 5.6-3.8 9s1.3 6.4 3.8 9',
  door: 'M6 21V4h12v17 M3 21h18 M14 12h.01',
  photo: 'M4 6h16v13H4z M4 15l5-5 4 4 3-3 4 4 M15.5 9.5h.01'
};

export function icon(name) {
  const path = PATHS[name];
  if (!path) throw new Error(`Unknown icon: ${name}`);
  return raw(`<svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`);
}

/** The three-bar Orthodox cross used as the site mark. */

/**
 * Social network marks, simplified, in the networks' own colours on the page.
 * Used only next to the network's name, which carries the meaning.
 */
const SOCIAL = {
  telegram: '<path fill="currentColor" d="M20.7 3.6 2.9 10.5c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.7 5.4c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.2-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.8-1.4-1.4zM9.6 13.5l8.4-5.3c.4-.2.8-.1.5.2l-7.2 6.5-.3 3-1.4-4.4z"/>',
  facebook: '<path fill="currentColor" d="M13.6 21v-8h2.7l.4-3.2h-3.1v-2c0-.9.3-1.6 1.6-1.6h1.7V3.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.5V13h2.8v8z"/>',
  instagram: '<path fill="none" stroke="currentColor" stroke-width="1.9" d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><circle fill="currentColor" cx="17.3" cy="6.7" r="1.2"/>'
};

export function socialIcon(id) {
  const path = SOCIAL[id];
  if (!path) throw new Error(`Unknown social icon: ${id}`);
  return raw(`<svg class="social-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">${path}</svg>`);
}

/** The account name shown under a network, read from its address: t.me/bukhram → @bukhram. */
export function socialHandle(url) {
  const name = new URL(url).pathname.split('/').filter(Boolean)[0] || '';
  return new URL(url).hostname.includes('facebook') ? name : `@${name}`;
}
