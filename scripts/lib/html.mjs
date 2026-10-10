// Minimal HTML templating with escaping by default.
//
//   html`<p>${userText}</p>`      -> userText is escaped
//   html`<ul>${items.map(...)}</ul>` -> nested html`` fragments and arrays pass through
//   raw('<br>')                   -> explicit opt-out for markup produced by this build
//
// Source text from the old sites can therefore never become markup by accident.

import { escapeHTML } from '../../assets/js/domain.js';

export class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

export const raw = value => new SafeHtml(String(value ?? ''));

function render(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined || value === false || value === true) return '';
  return escapeHTML(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, index) => {
    out += render(value) + strings[index + 1];
  });
  return new SafeHtml(out);
}

/** Renders ` name="value"` pairs; false/null/undefined omit the attribute, true renders it bare. */
export function attrs(map) {
  return raw(Object.entries(map)
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([name, value]) => (value === true ? ` ${name}` : ` ${name}="${escapeHTML(value)}"`))
    .join(''));
}

/** Joins truthy class names. */
export const classes = (...names) => names.filter(Boolean).join(' ');

/** Splits text on newlines into escaped lines joined by <br>. */
export const lines = text => raw(String(text).split('\n').map(escapeHTML).join('<br>'));
