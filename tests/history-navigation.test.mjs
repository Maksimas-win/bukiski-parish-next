import test from 'node:test';
import assert from 'node:assert/strict';
import { init } from '../assets/js/features/history.js';

// Exercise the controller with actual events, without adding a DOM dependency.
class Element extends EventTarget {
  constructor() {
    super();
    this.selectors = new Map();
    this.attributes = new Map();
    this.classes = new Set();
    this.classList = { toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name) };
    this.scrolls = [];
    this.focuses = [];
  }
  querySelectorAll(selector) { return this.selectors.get(selector) || []; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  matches(selector) { return selector === '[tabindex]' && this.attributes.has('tabindex'); }
  contains(element) {
    for (let current = element; current; current = current.parent) if (current === this) return true;
    return false;
  }
  focus(options) { this.focuses.push(options); document.activeElement = this; }
  scrollIntoView(options) { this.scrolls.push(options); }
}

function fixture(t, { compact: small = false, hash = '' } = {}) {
  const root = new Element();
  const contents = new Element();
  contents.open = true;
  contents.parent = root;
  const summary = new Element();
  summary.parent = contents;
  contents.selectors.set('summary', [summary]);
  const progress = new Element();
  progress.value = 0;
  progress.hidden = true;
  const current = new Element();
  current.textContent = '01';
  const media = new EventTarget();
  media.matches = small;
  const window = new EventTarget();
  window.innerHeight = 900;
  window.scrollY = 0;
  window.location = { hash };
  window.matchMedia = () => media;
  const frames = [];
  let requests = 0;
  window.requestAnimationFrame = callback => { frames.push(callback); return ++requests; };

  const chapters = ['place', 'founders', 'church'].map((id, index) => {
    const chapter = new Element();
    chapter.id = id;
    chapter.parent = root;
    chapter.getBoundingClientRect = () => {
      const top = 500 + (contents.open && media.matches ? 500 : 0) + index * 1200 - window.scrollY;
      return { top, bottom: top + 1200 };
    };
    const heading = new Element();
    heading.setAttribute('tabindex', '-1');
    chapter.selectors.set('h2[tabindex]', [heading]);
    return chapter;
  });
  const links = chapters.map(chapter => {
    const link = new Element();
    link.hash = `#${chapter.id}`;
    link.parent = contents;
    return link;
  });
  const sources = new Element();
  sources.id = 'history-sources-title';
  sources.parent = root;
  sources.setAttribute('tabindex', '-1');
  const sourceLink = new Element();
  sourceLink.hash = '#history-sources-title';
  sourceLink.parent = contents;
  contents.selectors.set('a[href^="#"]', [...links, sourceLink]);
  for (const [selector, elements] of [
    ['[data-history-chapter]', chapters], ['[data-history-link]', links],
    ['[data-history-progress]', [progress]], ['[data-history-current]', [current]],
    ['[data-history-contents]', [contents]]
  ]) root.selectors.set(selector, elements);

  const document = new Element();
  document.activeElement = null;
  document.selectors.set('[data-history]', [root]);
  const targets = new Map([...chapters, sources].map(element => [element.id, element]));
  document.getElementById = id => targets.get(id) || null;
  for (const [name, value] of Object.entries({ window, document })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }

  const flush = () => {
    for (let round = 0; frames.length && round < 10; round += 1) frames.splice(0).forEach(callback => callback());
    assert.equal(frames.length, 0, 'updates must not schedule a perpetual animation');
  };
  init();
  flush();
  return {
    root, window, document, contents, summary, progress, current, chapters, links, sources, sourceLink, flush,
    requests: () => requests,
    resize(compact) { media.matches = compact; media.dispatchEvent(new Event('change')); flush(); },
    scroll(y) { window.scrollY = y; window.dispatchEvent(new Event('scroll')); flush(); }
  };
}

function click(element, modifiers = {}) {
  const event = new Event('click', { cancelable: true });
  Object.assign(event, { button: 0, ...modifiers });
  element.dispatchEvent(event);
  return event;
}

test('History progress is bounded and the visible chapter is marked in the contents', t => {
  const page = fixture(t);
  assert.equal(page.root.getAttribute('data-history-ready'), '');
  assert.equal(page.progress.hidden, false);
  assert.equal(page.progress.value, 0);
  assert.equal(page.links[0].getAttribute('aria-current'), 'location');
  page.scroll(1700);
  assert.equal(page.current.textContent, '02');
  assert.equal(page.links[0].getAttribute('aria-current'), null);
  assert.equal(page.links[1].getAttribute('aria-current'), 'location');
  assert.ok(page.progress.value > 0 && page.progress.value < 100);
  page.scroll(10000);
  assert.equal(page.progress.value, 100);
  assert.equal(page.current.textContent, '03');
  page.scroll(-500);
  assert.equal(page.progress.value, 0);
});

test('Mobile contents close before native navigation and move keyboard focus without a second scroll', t => {
  const page = fixture(t, { compact: true });
  assert.equal(page.contents.open, false);
  page.contents.open = true;
  const event = click(page.links[1]);
  assert.equal(event.defaultPrevented, false, 'native hash navigation and Back must keep working');
  assert.equal(page.contents.open, false, 'layout must settle before the default anchor action');
  page.flush();
  assert.deepEqual(page.chapters[1].querySelector('h2[tabindex]').focuses, [{ preventScroll: true }]);
  assert.equal(page.chapters[1].scrolls.length, 0, 'a normal click must not perform a competing scripted scroll');

  page.contents.open = true;
  click(page.sourceLink);
  page.flush();
  assert.equal(page.contents.open, false, 'secondary contents links close the disclosure too');
  assert.deepEqual(page.sources.focuses, [{ preventScroll: true }]);
});

test('Modified or already-handled clicks preserve the disclosure and focus', t => {
  const page = fixture(t, { compact: true });
  page.contents.open = true;
  for (const modifiers of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    assert.equal(click(page.links[1], modifiers).defaultPrevented, false);
    assert.equal(page.contents.open, true);
  }
  const event = new Event('click', { cancelable: true });
  Object.assign(event, { button: 0 });
  event.preventDefault();
  page.links[1].dispatchEvent(event);
  page.flush();
  assert.equal(page.contents.open, true);
  assert.equal(page.chapters[1].querySelector('h2[tabindex]').focuses.length, 0);
});

test('An initial deep link is realigned once after mobile contents collapse', t => {
  const page = fixture(t, { compact: true, hash: '#%66ounders' });
  assert.equal(page.contents.open, false);
  assert.deepEqual(page.chapters[1].scrolls, [{ block: 'start', behavior: 'instant' }]);
  page.scroll(1700);
  assert.equal(page.chapters[1].scrolls.length, 1);
});

test('Responsive contents preserve manual opening within a breakpoint and never hide keyboard focus', t => {
  const page = fixture(t, { compact: true });
  page.contents.open = true;
  page.window.dispatchEvent(new Event('resize'));
  page.flush();
  assert.equal(page.contents.open, true);
  page.resize(false);
  assert.equal(page.contents.open, true);
  page.document.activeElement = page.links[0];
  page.resize(true);
  assert.equal(page.contents.open, false);
  assert.equal(page.document.activeElement, page.summary);
});

test('Repeated initialization and a burst of scroll events produce one queued update', t => {
  const page = fixture(t);
  init();
  const before = page.requests();
  for (let i = 0; i < 20; i += 1) page.window.dispatchEvent(new Event('scroll'));
  assert.equal(page.requests() - before, 1);
  page.flush();
  click(page.links[1]);
  page.flush();
  assert.equal(page.chapters[1].querySelector('h2[tabindex]').focuses.length, 1);
});

test('Malformed and unrelated initial fragments do not break mobile contents', t => {
  const page = fixture(t, { compact: true, hash: '#%E0%A4%A' });
  assert.equal(page.contents.open, false);
  assert.equal(page.chapters.some(chapter => chapter.scrolls.length), false);
});
