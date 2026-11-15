import test from 'node:test';
import assert from 'node:assert/strict';
import { init } from '../assets/js/features/notes.js';

class Element extends EventTarget {
  constructor(value = '') {
    super();
    this.value = value;
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
    this.dataset = {};
    this.selectors = new Map();
    this.attributes = new Map();
    const classes = new Set();
    this.classList = {
      contains: name => classes.has(name),
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      toggle: (name, active) => active ? classes.add(name) : classes.delete(name)
    };
  }
  querySelectorAll(selector) { return this.selectors.get(selector) || []; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  replaceChildren(...children) { this.children = children; }
  focus() { document.activeElement = this; }
  checkValidity() { return true; }
}

function fixture(t) {
  const root = new Element();
  root.dataset = {
    notesEndpoint: 'https://example.invalid/isolated-test', notesSubject: 'Test',
    labelLiving: 'Living', labelDeparted: 'Departed', parishName: 'Test parish',
    labelCount: '{n}/{max}', labelLineError: 'Invalid line {n}', labelTooMany: 'Too many',
    labelReady: 'Ready', labelSending: 'Sending', labelSent: 'Accepted',
    labelSendError: 'Retry', labelConsentRequired: 'Consent required'
  };
  const form = new Element();
  const names = new Element();
  const living = new Element('living');
  const departed = new Element('departed');
  living.checked = true;
  const consent = new Element();
  const fields = Object.fromEntries(['sender', 'email', 'comment', '_gotcha'].map(name => [name, new Element()]));
  form.elements = fields;
  const controls = [names, living, departed, ...Object.values(fields), consent];
  form.selectors.set('[name="request-type"]', [living, departed]);
  form.selectors.set('input, textarea, select', controls);
  form.reset = () => {
    for (const element of [names, ...Object.values(fields)]) element.value = '';
    living.checked = true;
    departed.checked = false;
    consent.checked = false;
  };
  const send = new Element();
  const clear = new Element();
  const message = new Element();
  const noteNames = new Element();
  const rootSelectors = {
    '[data-note-send]': send, '[data-note-clear]': clear,
    '[data-note-consent]': consent, '[data-note-message]': message,
    '[data-note-names]': noteNames
  };
  for (const selector of [
    '[data-names-count]', '[data-names-errors]', '[data-notes-status]',
    '[data-note-heading]', '[data-note-empty]', '[data-note-print]',
    '[data-note-download]', '[data-note-copy]', '[data-notes-unavailable]',
    '[data-notes-online]', '[data-notes-result]'
  ]) rootSelectors[selector] = new Element();
  for (const [selector, element] of Object.entries(rootSelectors)) root.selectors.set(selector, [element]);

  const document = new Element();
  document.body = new Element();
  document.body.dataset.labelCopyFailed = 'Copy failed';
  document.createElement = () => new Element();
  document.selectors.set('[data-notes]', [root]);
  document.selectors.set('#prayer-form', [form]);
  document.selectors.set('#prayer-names', [names]);
  const window = new EventTarget();
  const requests = [];
  const transport = (_url, options) => new Promise((resolve, reject) => {
    requests.push({ options, resolve, reject });
  });
  const globals = { document, window, location: { origin: 'https://example.invalid', pathname: '/notes.html' }, fetch: transport };
  const previous = new Map(Object.keys(globals).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, value });
  const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };
  t.after(async () => {
    window.dispatchEvent(new Event('pagehide'));
    requests.forEach(request => request.resolve({ ok: true }));
    await settle();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  init();
  return {
    names, controls, consent, form, send, clear, message, noteNames, requests, window, settle,
    type(value) { names.value = value; names.dispatchEvent(new Event('input')); },
    submit() { consent.checked = true; form.dispatchEvent(new Event('submit', { cancelable: true })); },
    clearDraft() { clear.dispatchEvent(new Event('click')); }
  };
}

test('A pending prayer request locks its editable fields and prevents a duplicate submission', async t => {
  const page = fixture(t);
  page.type('SyntheticFirst');
  page.submit();
  assert.equal(page.requests.length, 1);
  assert.equal(page.send.disabled, true);
  assert.ok(page.controls.every(control => control.disabled), 'the accepted draft must not change while it is sending');
  page.submit();
  assert.equal(page.requests.length, 1);
  page.requests[0].resolve({ ok: true });
  await page.settle();
  assert.equal(page.names.value, '');
  assert.ok(page.controls.every(control => !control.disabled));
  assert.equal(page.message.textContent, 'Accepted');
});

test('Clearing a pending request aborts it and a late response cannot erase the next draft', async t => {
  const page = fixture(t);
  page.type('SyntheticFirst');
  page.submit();
  const first = page.requests[0];
  page.clearDraft();
  assert.equal(page.names.value, '');
  page.type('SyntheticSecond');
  first.resolve({ ok: true });
  await page.settle();
  assert.equal(page.names.value, 'SyntheticSecond');
  assert.equal(first.options.signal.aborted, true);
  assert.notEqual(page.message.textContent, 'Accepted');
});

test('A cleared request cannot change the controls or status of a new submission', async t => {
  const page = fixture(t);
  page.type('SyntheticFirst');
  page.submit();
  const first = page.requests[0];
  page.clearDraft();
  page.type('SyntheticSecond');
  page.submit();
  assert.equal(page.requests.length, 2);
  first.resolve({ ok: true });
  await page.settle();
  assert.equal(page.names.value, 'SyntheticSecond');
  assert.equal(page.message.textContent, 'Sending');
  assert.equal(page.send.disabled, true, 'the old request must not unlock the new one');
  page.requests[1].resolve({ ok: true });
  await page.settle();
  assert.equal(page.names.value, '');
  assert.equal(page.message.textContent, 'Accepted');
});

test('A failed request keeps the draft and permits a successful retry', async t => {
  const page = fixture(t);
  page.type('SyntheticFirst');
  page.submit();
  page.requests[0].reject(new Error('Simulated offline transport'));
  await page.settle();
  assert.equal(page.names.value, 'SyntheticFirst');
  assert.ok(page.controls.every(control => !control.disabled));
  assert.equal(page.send.disabled, false);
  assert.equal(page.message.textContent, 'Retry');
  page.submit();
  page.requests[1].resolve({ ok: true });
  await page.settle();
  assert.equal(page.names.value, '');
  assert.equal(page.message.textContent, 'Accepted');
});

test('Leaving the page aborts the request and clears names before a cached return', async t => {
  const page = fixture(t);
  page.type('SyntheticFirst');
  page.submit();
  const request = page.requests[0];
  page.window.dispatchEvent(new Event('pagehide'));
  assert.equal(request.options.signal.aborted, true);
  assert.equal(page.names.value, '');
  assert.deepEqual(page.noteNames.children, []);
  assert.ok(page.controls.every(control => !control.disabled));
  const restored = new Event('pageshow');
  Object.assign(restored, { persisted: true });
  page.window.dispatchEvent(restored);
  page.type('SyntheticSecond');
  request.resolve({ ok: true });
  await page.settle();
  assert.equal(page.names.value, 'SyntheticSecond');
  assert.notEqual(page.message.textContent, 'Accepted');
});
