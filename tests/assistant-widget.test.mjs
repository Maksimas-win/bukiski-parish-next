import test from 'node:test';
import assert from 'node:assert/strict';
import { mountAssistant } from '../assets/js/assistant/widget.js';

// A small DOM fixture exercises user actions without contacting the live parish.
function fixture(t, transport, coarse = false) {
  let active;
  const all = [];
  class Element extends EventTarget {
    constructor(tag) {
      super(); this.tag = tag; this.children = []; this.dataset = {}; this.attributes = new Map();
      this.value = ''; this.textContent = ''; this.className = ''; this.offsetTop = 0;
      const classes = new Set();
      this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name) };
      all.push(this);
    }
    append(...nodes) { for (const child of nodes) {child.parent = this; this.children.push(child);} }
    replaceChildren(...nodes) { for (const child of this.children) {child.parent = null;} this.children = []; this.append(...nodes); }
    remove() { if (this.parent) {this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null;} }
    setAttribute(name, value) { this.attributes.set(name, value); }
    get firstElementChild() { return this.children[0]; }
    querySelector(selector) { return this.children.find(child => child.className.split(' ').includes(selector.slice(1))) || this.children.map(child => child.querySelector(selector)).find(Boolean); }
    focus() { active = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
    click() { this.dispatchEvent(new Event('click')); }
    requestSubmit() { this.dispatchEvent(new Event('submit', { cancelable: true })); }
    getBoundingClientRect() { return { left: 10, top: 10, right: 400, bottom: 800 }; }
  }
  const body = new Element('body');
  const document = { body, createElement: tag => new Element(tag), querySelector: selector => {
    if (selector === 'dialog[open]') {return all.find(e => e.tag === 'dialog' && e.open);}
    return null;
  } };
  const events = new EventTarget();
  const restore = [];
  for (const [name, value] of Object.entries({ document, location: { origin: 'https://local.test' }, fetch: transport,
    matchMedia: () => ({ matches: coarse }), addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
  const assistant = mountAssistant();
  t.after(() => {assistant.destroy(); for (const reset of restore) {reset();}});
  const byClass = name => all.find(e => e.className.split(' ').includes(name));
  const button = text => all.find(e => e.tag === 'button' && e.textContent === text);
  return { assistant, all, byClass, button, active: () => active, input: byClass('pa-composer'), form: byClass('pa-form') };
}
const json = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const tick = () => new Promise(resolve => setImmediate(resolve));

test('a failed AI question stays editable; an explicit retry reuses its ID and avoids duplicate bubbles', async t => {
  const requests = [];
  const page = fixture(t, async (_, options) => {
    const data = JSON.parse(options.body);
    if (data.action === 'session') {return json({ ok: true, token: 'a'.repeat(64) });}
    if (data.action === 'forget') {return json({ ok: true });}
    requests.push(data);
    if (requests.length === 1) {throw new TypeError('Network interrupted');}
    return json({ ok: true, ai: true, answer: 'First paragraph.\n\nSecond paragraph.' });
  });
  page.assistant.open();
  page.button('Поговорить с ИИ').click(); await tick(); page.button('Согласен, включить ИИ').click();
  page.input.value = 'How can I learn patience?'; page.form.requestSubmit();
  await tick();
  assert.equal(page.input.value, 'How can I learn patience?');
  assert.equal(page.input.disabled, false);
  assert.match(page.byClass('pa-status').textContent, /Вопрос возвращён/);
  assert.equal(requests.length, 1);
  page.form.requestSubmit(); await tick();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].id, requests[1].id);
  assert.equal(page.byClass('pa-transcript').children.filter(e => e.className.includes('pa-message--user')).length, 1);
  assert.equal(page.input.value, '');
  assert.equal(page.byClass('pa-status').textContent, '');
  assert.equal(page.byClass('pa-transcript').attributes.get('aria-busy'), 'false');
});

test('clearing the dialog while AI is pending discards late text and the restored draft', async t => {
  let resolve;
  const gate = new Promise(done => {resolve = done;});
  const page = fixture(t, async (_, options) => {
    const { action } = JSON.parse(options.body);
    if (action === 'session') {return json({ ok: true, token: 'a'.repeat(64) });}
    if (action === 'forget') {return json({ ok: true });}
    await gate; return json({ ok: true, ai: true, answer: 'Late private answer' });
  });
  page.button('Поговорить с ИИ').click(); await tick(); page.button('Согласен, включить ИИ').click();
  page.input.value = 'How can I learn patience?'; page.form.requestSubmit(); await tick();
  page.button('Очистить диалог').click(); resolve(); await tick();
  assert.equal(page.input.value, '');
  assert.equal(page.byClass('pa-transcript').children.length, 1);
  assert.equal(page.byClass('pa-transcript').attributes.get('aria-busy'), 'false');
});

test('opening on a touch screen does not force the software keyboard', t => {
  const page = fixture(t, () => {throw new Error('No requests before consent');}, true);
  page.assistant.open();
  assert.notEqual(page.active(), page.input);
  let submissions = 0; page.form.addEventListener('submit', () => submissions++);
  const enter = new Event('keydown', { cancelable: true }); Object.defineProperty(enter, 'key', { value: 'Enter' });
  page.input.dispatchEvent(enter);
  assert.equal(submissions, 0); assert.equal(enter.defaultPrevented, false);
});

test('Claude notice precedes consent and the question carries the accepted provider', async t => {
  const calls=[];
  const page=fixture(t,async (_,options)=>{
    const body=JSON.parse(options.body); calls.push(body);
    if(body.action==='session') {return json({ok:true,token:'a'.repeat(64),provider:'anthropic'});}
    return json({ok:true,ai:true,answer:'Welcome.'});
  });
  page.button('Поговорить с ИИ').click(); await tick();
  assert.deepEqual(calls.map(x=>x.action),['session']);
  assert.ok(page.all.some(x=>x.textContent.includes('будут передаваться Anthropic (Claude)')));
  page.button('Согласен, включить ИИ').click();
  page.input.value='How can I learn patience?'; page.form.requestSubmit(); await tick();
  assert.equal(calls.find(x=>x.action==='ai').provider,'anthropic');
});

test('cancelling while provider metadata loads cannot re-enable a discarded dialog', async t => {
  let resolve; const gate=new Promise(done=>{resolve=done;});
  const page=fixture(t,async ()=>{await gate; return json({ok:true,token:'a'.repeat(64),provider:'anthropic'});});
  page.button('Поговорить с ИИ').click();
  page.button('Вернуться к вопросам').click(); resolve(); await tick();
  assert.equal(page.button('Согласен, включить ИИ'),undefined);
  assert.equal(page.form.hidden,false);
});
