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
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  check: 'M5 12l4 4L19 7',
  chevron: 'M6 9l6 6 6-6',
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

/**
 * Emblems: larger pictorial icons with depth for section cards, tiles and
 * badges. Each one is built from a few layers — a soft contact shadow, a
 * darker extrusion, the body in a palette gradient, and a gloss highlight —
 * so it reads as a small object rather than a line drawing. Gradients live in
 * one shared <defs> block per page (svgDefs below); their colours come from
 * the stylesheet, so emblems follow the light and dark themes.
 */
const DEPTH = 2;
const EMBLEMS = {
  calendar: `
    <rect x="13" y="16" width="38" height="34" rx="6" class="em-depth"/>
    <rect x="13" y="14" width="38" height="34" rx="6" fill="url(#em-cream)"/>
    <path d="M13 20a6 6 0 0 1 6-6h26a6 6 0 0 1 6 6v8H13z" fill="url(#em-wine)"/>
    <rect x="21" y="9" width="5" height="11" rx="2.5" fill="url(#em-gilt)"/>
    <rect x="38" y="9" width="5" height="11" rx="2.5" fill="url(#em-gilt)"/>
    <circle cx="22" cy="36" r="2.6" fill="url(#em-dome)"/><circle cx="32" cy="36" r="2.6" fill="url(#em-dome)"/><circle cx="42" cy="36" r="2.6" fill="url(#em-dome)"/>
    <circle cx="22" cy="43" r="2.6" fill="url(#em-dome)"/><circle cx="32" cy="43" r="2.6" fill="url(#em-dome)"/><circle cx="42" cy="43" r="2.6" fill="url(#em-wine)"/>
    <path d="M13 20a6 6 0 0 1 6-6h26a6 6 0 0 1 6 6v3H13z" fill="url(#em-gloss)"/>`,
  note: `
    <path d="M17 14h22l10 10v28a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" class="em-depth"/>
    <path d="M17 12h22l10 10v28a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" fill="url(#em-cream)"/>
    <path d="M39 12v6a4 4 0 0 0 4 4h6z" fill="url(#em-gilt)"/>
    <path d="M30 18h4v4h4v4h-4v8h-4v-8h-4v-4h4z" fill="url(#em-wine)"/>
    <rect x="21" y="37" width="22" height="3" rx="1.5" fill="url(#em-dome)" opacity="0.55"/>
    <rect x="21" y="43" width="15" height="3" rx="1.5" fill="url(#em-dome)" opacity="0.55"/>
    <path d="M17 12h22v8H13v-4a4 4 0 0 1 4-4z" fill="url(#em-gloss)"/>`,
  pin: `
    <ellipse cx="32" cy="51" rx="14" ry="5" fill="url(#em-dome)"/>
    <ellipse cx="32" cy="50" rx="10" ry="3" class="em-depth"/>
    <path d="M32 52C32 52 18 36 18 25a14 14 0 0 1 28 0c0 11-14 27-14 27z" fill="url(#em-wine)"/>
    <circle cx="32" cy="25" r="6.5" fill="url(#em-cream)"/>
    <circle cx="32" cy="25" r="6.5" fill="none" stroke="url(#em-gilt)" stroke-width="2"/>
    <path d="M22 20a10 10 0 0 1 17-6l-14 6z" fill="url(#em-gloss)"/>`,
  phone: `
    <path d="M19 14l8 2 4 10-5 3a19 19 0 0 0 11 11l3-5 10 4 2 8a5 5 0 0 1-5 5A33 33 0 0 1 14 19a5 5 0 0 1 5-5z" class="em-depth"/>
    <path d="M19 12l8 2 4 10-5 3a19 19 0 0 0 11 11l3-5 10 4 2 8a5 5 0 0 1-5 5A33 33 0 0 1 14 17a5 5 0 0 1 5-5z" fill="url(#em-wine)"/>
    <path d="M40 14a10 10 0 0 1 10 10" fill="none" stroke="url(#em-gilt)" stroke-width="3" stroke-linecap="round"/>
    <path d="M40 21a3.5 3.5 0 0 1 3.5 3.5" fill="none" stroke="url(#em-gilt)" stroke-width="3" stroke-linecap="round"/>
    <path d="M19 12l8 2 3 7-10 1-4-5a5 5 0 0 1 3-5z" fill="url(#em-gloss)"/>`,
  manor: `
    <rect x="12" y="32" width="40" height="22" rx="2" class="em-depth"/>
    <rect x="12" y="30" width="40" height="22" rx="2" fill="url(#em-cream)"/>
    <rect x="18" y="37" width="6" height="8" rx="1" fill="url(#em-dome)"/>
    <rect x="40" y="37" width="6" height="8" rx="1" fill="url(#em-dome)"/>
    <path d="M28 52v-11a4 4 0 0 1 8 0v11z" fill="url(#em-gilt)"/>
    <rect x="12" y="30" width="40" height="3" fill="url(#em-gilt)"/>
    <path d="M10 31L32 14l22 17z" fill="url(#em-wine)"/>
    <path d="M10 31L32 14l5 4-23 13z" fill="url(#em-gloss)"/>`,
  church: `
    <rect x="18" y="36" width="28" height="18" rx="2" class="em-depth"/>
    <rect x="18" y="34" width="28" height="18" rx="2" fill="url(#em-cream)"/>
    <path d="M32 12c7 7 12 11 12 18a12 12 0 0 1-24 0c0-7 5-11 12-18z" fill="url(#em-dome)"/>
    <path d="M31 4h2v3h3v2h-3v5h-2V9h-3V7h3z" fill="url(#em-gilt)"/>
    <path d="M28 52v-9a4 4 0 0 1 8 0v9z" fill="url(#em-wine)"/>
    <path d="M21 47v-5a2 2 0 0 1 4 0v5z" fill="url(#em-dome)"/>
    <path d="M39 47v-5a2 2 0 0 1 4 0v5z" fill="url(#em-dome)"/>
    <path d="M32 12c4 4 8 7 10 11l-15 3c0-6 2-9 5-14z" fill="url(#em-gloss)"/>`,
  photo: `
    <rect x="12" y="22" width="40" height="30" rx="6" class="em-depth"/>
    <rect x="22" y="14" width="14" height="8" rx="3" fill="url(#em-dome)"/>
    <rect x="12" y="20" width="40" height="30" rx="6" fill="url(#em-dome)"/>
    <circle cx="32" cy="35" r="11" fill="url(#em-cream)"/>
    <circle cx="32" cy="35" r="11" fill="none" stroke="url(#em-gilt)" stroke-width="2.5"/>
    <circle cx="32" cy="35" r="6" fill="url(#em-wine)"/>
    <circle cx="29.5" cy="32.5" r="2" fill="#fff" opacity="0.7"/>
    <rect x="42" y="24" width="6" height="4" rx="1" fill="url(#em-gilt)"/>
    <path d="M12 26a6 6 0 0 1 6-6h34a6 6 0 0 1 6 6v2H12z" fill="url(#em-gloss)"/>`,
  book: `
    <path d="M18 12h26a4 4 0 0 1 4 4v34a2 2 0 0 1-2 2H20a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" class="em-depth"/>
    <path d="M18 10h26a4 4 0 0 1 4 4v34a2 2 0 0 1-2 2H20a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="url(#em-wine)"/>
    <path d="M16 46a4 4 0 0 0 4 4h26v-6H20a4 4 0 0 0-4 2z" fill="url(#em-cream)"/>
    <path d="M30 16h4v8h7v4h-7v12h-4V28h-7v-4h7z" fill="url(#em-gilt)"/>
    <rect x="16" y="10" width="5" height="40" rx="2" fill="#fff" opacity="0.14"/>
    <path d="M18 10h26a4 4 0 0 1 4 4v4H16v-4a4 4 0 0 1 2-4z" fill="url(#em-gloss)"/>`,
  heart: `
    <path d="M32 55s-19-11-19-26a10 10 0 0 1 19-5 10 10 0 0 1 19 5c0 15-19 26-19 26z" class="em-depth"/>
    <path d="M32 53s-19-11-19-26a10 10 0 0 1 19-5 10 10 0 0 1 19 5c0 15-19 26-19 26z" fill="url(#em-wine)"/>
    <ellipse cx="23" cy="25" rx="6" ry="4" transform="rotate(-30 23 25)" fill="url(#em-gloss)"/>`,
  font: `
    <path d="M14 28h36l-4 14a12 12 0 0 1-12 9h-4a12 12 0 0 1-12-9z" class="em-depth"/>
    <path d="M14 26h36l-4 14a12 12 0 0 1-12 9h-4a12 12 0 0 1-12-9z" fill="url(#em-gilt)"/>
    <ellipse cx="32" cy="26" rx="18" ry="5" fill="url(#em-dome)"/>
    <ellipse cx="32" cy="26" rx="11" ry="2.5" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.6"/>
    <rect x="29" y="48" width="6" height="5" fill="url(#em-gilt)"/>
    <rect x="22" y="52" width="20" height="4" rx="2" fill="url(#em-gilt)"/>
    <path d="M30 6h4v4h4v4h-4v6h-4v-6h-4v-4h4z" fill="url(#em-wine)"/>
    <path d="M14 26h36l-1 4H15z" fill="url(#em-gloss)"/>`,
  chalice: `
    <path d="M16 16h32l-3 14a13 13 0 0 1-13 11 13 13 0 0 1-13-11z" class="em-depth"/>
    <path d="M16 14h32l-3 14a13 13 0 0 1-13 11 13 13 0 0 1-13-11z" fill="url(#em-gilt)"/>
    <path d="M19 14h26l-1.5 6h-23z" fill="url(#em-wine)"/>
    <rect x="29" y="38" width="6" height="9" fill="url(#em-gilt)"/>
    <path d="M20 52a12 4 0 0 1 24 0v2H20z" fill="url(#em-gilt)"/>
    <path d="M30 23h4v3h3v3h-3v6h-4v-6h-3v-3h3z" fill="url(#em-cream)"/>
    <path d="M16 14h12l-2 10-8-2z" fill="url(#em-gloss)"/>`,
  rings: `
    <circle cx="26" cy="36" r="13" fill="none" class="em-depth-stroke" stroke-width="6"/>
    <circle cx="38" cy="36" r="13" fill="none" class="em-depth-stroke" stroke-width="6"/>
    <circle cx="26" cy="34" r="13" fill="none" stroke="url(#em-gilt)" stroke-width="6"/>
    <circle cx="38" cy="34" r="13" fill="none" stroke="url(#em-gilt)" stroke-width="6"/>
    <path d="M38 21a13 13 0 0 1 13 13" fill="none" stroke="url(#em-gilt)" stroke-width="6"/>
    <path d="M16 30a13 13 0 0 1 8-8" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
    <path d="M40 22a13 13 0 0 1 7 4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>`,
  candle: `
    <rect x="26" y="26" width="12" height="26" rx="2" class="em-depth"/>
    <path d="M20 50h24v4a2 2 0 0 1-2 2H22a2 2 0 0 1-2-2z" fill="url(#em-gilt)"/>
    <rect x="26" y="24" width="12" height="27" rx="2" fill="url(#em-cream)"/>
    <path d="M28 30v7a1.5 1.5 0 0 0 3 0" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
    <rect x="31.3" y="20" width="1.4" height="4" fill="#3a2a16"/>
    <path d="M32 6c5 5 6 9 3 13a3.5 3.5 0 0 1-6 0c-3-4-2-8 3-13z" fill="url(#em-flame)"/>
    <path d="M32 13c2 2.5 2.5 4.5 1 6.5a1.6 1.6 0 0 1-2 0c-1.5-2-1-4 1-6.5z" fill="url(#em-cream)"/>`,
  anvil: `
    <rect x="16" y="50" width="32" height="4" rx="2" class="em-depth"/>
    <path d="M14 22h38a6 6 0 0 1-6 6h-6l-3 12H27l-3-12h-4a6 6 0 0 1-6-6z" fill="url(#em-ink)"/>
    <rect x="21" y="40" width="22" height="8" rx="2" fill="url(#em-ink)"/>
    <rect x="16" y="48" width="32" height="4" rx="2" fill="url(#em-ink)"/>
    <path d="M14 22h38a6 6 0 0 1-1 3H15a6 6 0 0 1-1-3z" fill="url(#em-gloss)"/>`,
  carriage: `
    <path d="M14 26h28l6 8h4v8H14z" class="em-depth"/>
    <rect x="12" y="20" width="32" height="5" rx="2" fill="url(#em-dome)"/>
    <path d="M14 24h28l6 8h4v8H14z" fill="url(#em-wine)"/>
    <rect x="20" y="28" width="10" height="6" rx="1" fill="url(#em-cream)"/>
    <circle cx="22" cy="44" r="6" fill="url(#em-ink)"/><circle cx="22" cy="44" r="6" fill="none" stroke="url(#em-gilt)" stroke-width="2"/>
    <circle cx="44" cy="44" r="6" fill="url(#em-ink)"/><circle cx="44" cy="44" r="6" fill="none" stroke="url(#em-gilt)" stroke-width="2"/>
    <path d="M14 24h28l2 3H14z" fill="url(#em-gloss)"/>`,
  house: `
    <rect x="16" y="32" width="32" height="22" rx="1" class="em-depth"/>
    <rect x="16" y="30" width="32" height="22" rx="1" fill="url(#em-cream)"/>
    <rect x="42" y="18" width="5" height="8" fill="url(#em-dome)"/>
    <path d="M10 32L32 14l22 18z" fill="url(#em-wine)"/>
    <rect x="28" y="38" width="8" height="14" rx="1" fill="url(#em-wine)"/>
    <rect x="19" y="36" width="6" height="6" rx="1" fill="url(#em-dome)"/>
    <rect x="39" y="36" width="6" height="6" rx="1" fill="url(#em-dome)"/>
    <path d="M10 32L32 14l5 4-22 14z" fill="url(#em-gloss)"/>`,
  bath: `
    <rect x="16" y="32" width="32" height="22" rx="1" class="em-depth"/>
    <rect x="16" y="30" width="32" height="22" rx="1" fill="url(#em-cream)"/>
    <path d="M10 32L32 18l22 14z" fill="url(#em-dome)"/>
    <rect x="28" y="38" width="8" height="14" rx="1" fill="url(#em-wine)"/>
    <rect x="19" y="36" width="6" height="6" rx="1" fill="url(#em-dome)"/>
    <path d="M24 6c0 3 3 3 3 6s-3 3-3 6" fill="none" stroke="url(#em-gilt)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M32 4c0 3 3 3 3 6s-3 3-3 6" fill="none" stroke="url(#em-gilt)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 6c0 3 3 3 3 6s-3 3-3 6" fill="none" stroke="url(#em-gilt)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M10 32L32 18l5 3-22 11z" fill="url(#em-gloss)"/>`,
  bank: `
    <rect x="12" y="50" width="40" height="5" rx="1" class="em-depth"/>
    <path d="M10 24L32 12l22 12z" fill="url(#em-gilt)"/>
    <rect x="12" y="24" width="40" height="4" fill="url(#em-cream)"/>
    <rect x="16" y="30" width="5" height="18" fill="url(#em-cream)"/><rect x="25" y="30" width="5" height="18" fill="url(#em-cream)"/>
    <rect x="34" y="30" width="5" height="18" fill="url(#em-cream)"/><rect x="43" y="30" width="5" height="18" fill="url(#em-cream)"/>
    <rect x="12" y="48" width="40" height="5" rx="1" fill="url(#em-cream)"/>
    <path d="M10 24L32 12l6 3-24 9z" fill="url(#em-gloss)"/>`,
  id: `
    <rect x="12" y="20" width="40" height="30" rx="4" class="em-depth"/>
    <rect x="12" y="18" width="40" height="30" rx="4" fill="url(#em-cream)"/>
    <path d="M12 22a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v3H12z" fill="url(#em-dome)"/>
    <circle cx="22" cy="36" r="5" fill="url(#em-wine)"/>
    <rect x="31" y="32" width="16" height="3" rx="1.5" fill="url(#em-dome)" opacity="0.6"/>
    <rect x="31" y="38" width="12" height="3" rx="1.5" fill="url(#em-dome)" opacity="0.6"/>`,
  user: `
    <path d="M14 54a18 18 0 0 1 36 0z" class="em-depth"/>
    <circle cx="32" cy="22" r="9" fill="url(#em-gilt)"/>
    <path d="M14 52a18 18 0 0 1 36 0z" fill="url(#em-wine)"/>
    <ellipse cx="29" cy="18" rx="4" ry="2.5" transform="rotate(-25 29 18)" fill="url(#em-gloss)"/>`,
  route: `
    <path d="M16 52c0-10 32-8 32-20a8 8 0 0 0-16 0" fill="none" class="em-depth-stroke" stroke-width="7" stroke-linecap="round"/>
    <path d="M16 50c0-10 32-8 32-20a8 8 0 0 0-16 0" fill="none" stroke="url(#em-dome)" stroke-width="7" stroke-linecap="round"/>
    <path d="M16 50c0-10 32-8 32-20a8 8 0 0 0-16 0" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="4 5" opacity="0.7"/>
    <circle cx="16" cy="50" r="5.5" fill="url(#em-gilt)"/>
    <path d="M32 34C32 34 24 25 24 19a8 8 0 0 1 16 0c0 6-8 15-8 15z" fill="url(#em-wine)"/>
    <circle cx="32" cy="19" r="3.5" fill="url(#em-cream)"/>`,
  bus: `
    <rect x="12" y="18" width="40" height="30" rx="6" class="em-depth"/>
    <rect x="12" y="16" width="40" height="30" rx="6" fill="url(#em-wine)"/>
    <rect x="16" y="20" width="14" height="11" rx="2" fill="url(#em-cream)"/>
    <rect x="34" y="20" width="14" height="11" rx="2" fill="url(#em-cream)"/>
    <circle cx="22" cy="48" r="5" fill="url(#em-ink)"/><circle cx="42" cy="48" r="5" fill="url(#em-ink)"/>
    <circle cx="16.5" cy="40" r="2" fill="url(#em-gilt)"/><circle cx="47.5" cy="40" r="2" fill="url(#em-gilt)"/>
    <path d="M12 22a6 6 0 0 1 6-6h34a6 6 0 0 1 6 6v1H12z" fill="url(#em-gloss)"/>`
};

export function emblem(name) {
  const body = EMBLEMS[name];
  if (!body) throw new Error(`Unknown emblem: ${name}`);
  return raw(`<svg class="emblem emblem--${name}" viewBox="0 0 64 64" width="48" height="48" aria-hidden="true" focusable="false"><ellipse cx="32" cy="${56 + DEPTH / 2}" rx="17" ry="3.2" class="em-shadow" filter="url(#em-blur)"/>${body.replace(/\s*\n\s*/g, '')}</svg>`);
}

export const emblemNames = () => Object.keys(EMBLEMS);

/** Shared gradient definitions, emitted once per page; stop colours are set in the stylesheet. */
export function svgDefs() {
  const linear = id => `<linearGradient id="em-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="em-${id}-a"/><stop offset="1" class="em-${id}-b"/></linearGradient>`;
  return raw(`<svg class="svg-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${['wine', 'gilt', 'dome', 'cream', 'ink', 'flame'].map(linear).join('')}<radialGradient id="em-gloss" cx="0.3" cy="0.2" r="0.9"><stop offset="0" class="em-gloss-a"/><stop offset="1" class="em-gloss-b"/></radialGradient><filter id="em-blur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="1.6"/></filter></defs></svg>`);
}
