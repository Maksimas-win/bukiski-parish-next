import test from 'node:test';
import assert from 'node:assert/strict';
import { init } from '../assets/js/features/schedule.js';

// Minimal DOM fixture: run the real schedule controller without a browser dependency.
class Element extends EventTarget {
  constructor(dataset = {}) {
    super();
    this.dataset = dataset;
    this.hidden = false;
    this.selectors = new Map();
    this.classList = { toggle() {} };
    this.scrolls = 0;
  }
  querySelectorAll(selector) { return this.selectors.get(selector) || []; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return selector === '[data-month]' ? this.month : null; }
  scrollIntoView() { this.scrolls += 1; }
  setAttribute() {}
}

function fixture(t, hash = '') {
  t.mock.method(Date, 'now', () => Date.parse('2030-01-01T00:00:00Z'));
  t.mock.method(globalThis, 'setInterval', () => 0);
  const container = new Element({ initialMonths: '3', updated: '2030-01-01T00:00:00Z' });
  const targets = new Map();
  const months = Array.from({ length: 6 }, (_, i) => {
    const key = `2030-${String(i + 1).padStart(2, '0')}`;
    const month = new Element({ month: key });
    month.month = month;
    const heading = new Element();
    heading.month = month;
    const service = new Element({ start: `${key}-15T06:00:00Z`, feast: 'false' });
    service.selectors.set('[data-relative]', [new Element()]);
    service.selectors.set('[data-add-to-calendar]', [new Element()]);
    month.selectors.set('[data-service]', [service]);
    month.selectors.set('h2', [heading]);
    targets.set(`m-${key}`, month);
    targets.set(`h-${key}`, heading);
    return month;
  });
  const links = months.map(month => new Element({ monthLink: month.dataset.month }));
  const more = new Element();
  container.selectors.set('[data-month]', months);
  container.selectors.set('[data-service]', months.flatMap(month => month.querySelectorAll('[data-service]')));
  container.selectors.set('[data-month-link]', links);
  container.selectors.set('[data-show-more]', [more]);
  const document = new Element();
  document.body = { dataset: { locale: 'ru' } };
  document.selectors.set('[data-schedule]', [container]);
  document.getElementById = id => targets.get(id) || null;
  const window = new EventTarget();
  const location = { hash };
  for (const [name, value] of Object.entries({ document, window, location })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
  init();
  return { months, links, more, targets, navigate(fragment) {
    location.hash = fragment;
    window.dispatchEvent(new Event('hashchange'));
  } };
}

function click(element, modifiers = {}) {
  const event = new Event('click');
  Object.assign(event, { button: 0, ...modifiers });
  element.dispatchEvent(event);
}

test('A direct month link unfolds and scrolls to a month beyond the initial three', t => {
  const page = fixture(t, '#m-2030-05');
  assert.equal(page.months[4].hidden, false);
  assert.equal(page.months[4].scrolls, 1);
  assert.equal(page.months[5].hidden, true);
  assert.equal(page.more.hidden, false);
});

test('Fragment navigation and history changes reveal the requested month heading', t => {
  const page = fixture(t);
  assert.equal(page.months[5].hidden, true);
  page.navigate('#h-2030-06');
  assert.equal(page.months[5].hidden, false);
  assert.equal(page.targets.get('h-2030-06').scrolls, 1);
  assert.equal(page.more.hidden, true);
  page.navigate('#m-2030-01');
  assert.equal(page.months[0].scrolls, 1);
});

test('Encoded fragments work, while malformed or unrelated fragments leave controls usable', t => {
  const page = fixture(t, '#%6D-2030-04');
  assert.equal(page.months[3].hidden, false);
  page.navigate('#%E0%A4%A');
  page.navigate('#main');
  assert.equal(page.months[4].hidden, true);
  click(page.more);
  assert.equal(page.months[5].hidden, false);
});

test('Month chips keep normal and modified clicks distinct', t => {
  const page = fixture(t);
  click(page.links[5], { ctrlKey: true });
  assert.equal(page.months[5].hidden, true);
  click(page.links[5]);
  assert.equal(page.months[5].hidden, false);
});
