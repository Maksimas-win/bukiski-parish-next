import test from 'node:test';
import assert from 'node:assert/strict';
import { initMenu } from '../assets/js/ui/menu.js';

function fixture(t) {
  const classes = new Set();
  const attributes = new Map();
  const events = new Map();
  let focusCount = 0;
  const toggle = new EventTarget();
  toggle.hidden = true;
  toggle.setAttribute = (name, value) => attributes.set(name, value);
  toggle.focus = () => { focusCount += 1; };
  const menu = { classList: {
    contains: value => classes.has(value),
    toggle: (value, present) => present ? classes.add(value) : classes.delete(value)
  } };
  const folded = new EventTarget();
  folded.matches = true;
  const document = {
    querySelector: selector => selector === '[data-menu-toggle]' ? toggle : menu,
    addEventListener: (name, callback) => events.set(name, callback)
  };
  const window = { matchMedia: query => {
    assert.equal(query, '(max-width: 72rem)');
    return folded;
  } };
  for (const [name, value] of Object.entries({ document, window })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
  initMenu();
  return {
    toggle,
    open: () => classes.has('is-open'),
    expanded: () => attributes.get('aria-expanded'),
    focusCount: () => focusCount,
    click: () => toggle.dispatchEvent(new Event('click')),
    escape: () => events.get('keydown')({ key: 'Escape' }),
    outside: () => events.get('click')({ target: { closest: () => null } }),
    resize: matches => { folded.matches = matches; folded.dispatchEvent(new Event('change')); }
  };
}

test('Mobile menu retains disclosure and keyboard dismissal behavior', t => {
  const page = fixture(t);
  assert.equal(page.toggle.hidden, false);
  page.click();
  assert.equal(page.open(), true);
  assert.equal(page.expanded(), 'true');
  page.escape();
  assert.equal(page.open(), false);
  assert.equal(page.expanded(), 'false');
  assert.equal(page.focusCount(), 1);
  page.click();
  page.outside();
  assert.equal(page.open(), false);
  assert.equal(page.focusCount(), 1);
});

test('Leaving the folded layout clears the state that hides the assistant, without focusing a hidden toggle', t => {
  const page = fixture(t);
  page.click();
  page.resize(false);
  assert.equal(page.open(), false);
  assert.equal(page.expanded(), 'false');
  assert.equal(page.focusCount(), 0);
  page.resize(true);
  assert.equal(page.open(), false);
  page.click();
  assert.equal(page.open(), true);
  page.escape();
  assert.equal(page.open(), false);
});
