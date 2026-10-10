// Small DOM helpers. Text always enters the page through textContent.

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function show(element, visible = true) {
  if (element) element.hidden = !visible;
}

export function create(tag, { className, text } = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Fills «Имён: {n} из {max}»-style templates. */
export function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

/** Offers generated text as a file download without contacting a server. */
export function downloadText(filename, content, type) {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const anchor = create('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Mobile download managers read the blob a little later.
  setTimeout(() => URL.revokeObjectURL(href), 60000);
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
