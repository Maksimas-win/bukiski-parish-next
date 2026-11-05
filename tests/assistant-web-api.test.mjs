import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebApi } from '../assets/js/assistant/web-api.js';
import { WEB_UI } from '../assets/js/assistant/web-i18n.js';

const token = 'a'.repeat(64);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('creating a client makes no request; concurrent calls share one session', async () => {
  const calls = [];
  const gate = deferred();
  const api = createWebApi(async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url, options, body });
    if (body.action === 'session') { await gate.promise; return json({ ok: true, token }); }
    return json({ ok: true, answer: 'Reviewed answer' });
  });
  assert.equal(calls.length, 0);
  const first = api.call({ action: 'ai', question: 'One' });
  const second = api.call({ action: 'ai', question: 'Two' });
  assert.equal(calls.length, 1);
  gate.resolve(); await Promise.all([first, second]);
  assert.deepEqual(calls.map(call => call.body.action), ['session', 'ai', 'ai']);
  assert.equal(calls[1].options.headers['X-Parish-Session'], token);
  for (const { options } of calls) {
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
  }
});

test('clearing during session creation never sends the queued private question', async () => {
  const gate = deferred(); const calls = []; let openingSignal;
  const api = createWebApi(async (_, options) => {
    calls.push(JSON.parse(options.body).action); openingSignal = options.signal;
    // Simulate a transport that resolves even after cancellation.
    await gate.promise; return json({ ok: true, token });
  });
  const pending = api.call({ action: 'ai', question: 'Private draft' });
  const rejected = assert.rejects(pending, /session/);
  await api.forget(); assert.equal(openingSignal.aborted, true);
  gate.resolve(); await rejected;
  assert.deepEqual(calls, ['session']);
});

test('clearing cancels an active answer and sends deletion using the old session', async () => {
  const calls = []; const started = deferred();
  const api = createWebApi(async (_, options) => {
    const body = JSON.parse(options.body); calls.push({ body, options });
    if (body.action === 'session') {return json({ ok: true, token });}
    if (body.action === 'forget') {return json({ ok: true });}
    return new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
      started.resolve();
    });
  });
  const pending = api.call({ action: 'ai' });
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await started.promise; await api.forget(); await rejected;
  const removal = calls.find(call => call.body.action === 'forget');
  assert.equal(removal.options.headers['X-Parish-Session'], token);
  assert.equal(removal.options.keepalive, true);
  assert.equal(removal.options.signal.aborted, false);
});

test('an old session completion cannot overwrite a new session', async () => {
  const gate = deferred(); let opens = 0; const received = [];
  const api = createWebApi(async (_, options) => {
    const body = JSON.parse(options.body);
    if (body.action === 'session') {
      if (++opens === 1) {await gate.promise; return json({ ok: true, token });}
      return json({ ok: true, token: 'b'.repeat(64) });
    }
    received.push(options.headers['X-Parish-Session']); return json({ ok: true });
  });
  const old = assert.rejects(api.ready(), /session/);
  await api.forget(); await api.ready(); gate.resolve(); await old;
  await api.call({ action: 'ai' });
  assert.deepEqual(received, ['b'.repeat(64)]);
});

test('invalid session tokens prevent message transmission', async () => {
  for (const invalid of ['', 'abc', null, 123, 'a'.repeat(65)]) {
    const calls = [];
    const api = createWebApi(async (_, options) => {calls.push(JSON.parse(options.body).action); return json({ ok: true, token: invalid });});
    await assert.rejects(api.call({ action: 'ai' }), /session/);
    assert.deepEqual(calls, ['session']);
  }
});

test('network errors and rate limits do not silently resend messages', async () => {
  for (const fail of [() => {throw new TypeError('offline');}, () => json({ ok: false, error: 'limited' }, 429)]) {
    let messages = 0;
    const api = createWebApi(async (_, options) => {
      if (JSON.parse(options.body).action === 'session') {return json({ ok: true, token });}
      messages++; return fail();
    });
    await assert.rejects(api.call({ action: 'ai' }));
    assert.equal(messages, 1);
  }
});

test('HTML, oversized and malformed payloads fail safely', async () => {
  const replies = [
    () => new Response('<html>Unavailable</html>', { headers: { 'Content-Type': 'text/html' } }),
    () => json({ ok: true, answer: 'x'.repeat(20001) }),
    () => json(null),
    () => new Response('{', { headers: { 'Content-Type': 'application/json' } })
  ];
  for (const reply of replies) {
    const api = createWebApi(async (_, options) => JSON.parse(options.body).action === 'session' ? json({ ok: true, token }) : reply());
    await assert.rejects(api.call({ action: 'ai' }));
  }
});

test('recovery guidance exists consistently in all six languages', () => {
  for (const copy of Object.values(WEB_UI)) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(WEB_UI.ru).sort());
    assert.ok(copy.draftRestored.length > 30);
  }
});
