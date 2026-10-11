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
  door: 'M6 21V4h12v17 M3 21h18 M14 12h.01',
  photo: 'M4 6h16v13H4z M4 15l5-5 4 4 3-3 4 4 M15.5 9.5h.01'
};

export function icon(name) {
  const path = PATHS[name];
  if (!path) throw new Error(`Unknown icon: ${name}`);
  return raw(`<svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`);
}

/** The three-bar Orthodox cross used as the site mark. */
