import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBootstrap } from '../scripts/monitor/bootstrap-health.mjs';

const NOW = Date.parse('2026-11-09T12:00:00.000Z');
const HOUR_MS = 3600000;
const payload = () => ({
  schemaVersion: 1,
  supportedLocales: ['ru', 'lt', 'en', 'pl', 'de', 'uk'],
  schedule: {
    sourceUpdatedAt: '2026-11-09T11:00:00.000Z',
    maxAgeHours: 48,
    stale: false,
    items: [{ id: 'fixture-service' }]
  }
});
const response = (data = payload(), overrides = {}) => ({
  status: 200,
  headers: new Headers({ 'Content-Type': 'application/json; charset=utf-8' }),
  body: JSON.stringify(data),
  ...overrides
});
const validate = data => validateBootstrap(response(data), NOW);
const ids = result => result.failures.map(failure => failure.id);

test('bootstrap health accepts fresh data and returns a compact note', () => {
  assert.deepEqual(validate(payload()), {
    failures: [],
    notes: ['net: bootstrap schema 1, 1 items, source 2026-11-09T11:00:00.000Z']
  });
});

test('bootstrap health recalculates freshness even when stale is false', () => {
  const data = payload();
  data.schedule.sourceUpdatedAt = '2026-11-07T11:00:00.000Z';
  assert.deepEqual(validate(data), {
    failures: [{
      id: 'net:bootstrap-freshness',
      detail: 'source last updated 2026-11-07T11:00:00.000Z (49.00 h ago, limit 48 h)'
    }],
    notes: []
  });
});

test('bootstrap health rejects a source more than five minutes in the future', () => {
  const data = payload();
  data.schedule.sourceUpdatedAt = '2026-11-09T12:06:00.000Z';
  assert.deepEqual(ids(validate(data)), ['net:bootstrap-future-date']);
});

test('bootstrap health rejects unsupported schemas and non-object JSON', () => {
  for (const data of [{ ...payload(), schemaVersion: 2 }, { ...payload(), schemaVersion: '1' }, {}, null, [], 'text', 1]) {
    assert.deepEqual(ids(validate(data)), ['net:bootstrap-schema']);
  }
});

test('bootstrap health reports malformed JSON without quoting the response', () => {
  const result = validateBootstrap(response(undefined, { body: '{"not-for-diagnostics":' }), NOW);
  assert.deepEqual(result, {
    failures: [{ id: 'net:bootstrap-json', detail: 'invalid JSON' }],
    notes: []
  });
});

test('bootstrap health accepts a valid empty schedule', () => {
  const data = payload();
  data.schedule.items = [];
  assert.deepEqual(validate(data), {
    failures: [],
    notes: ['net: bootstrap schema 1, 0 items, source 2026-11-09T11:00:00.000Z']
  });
});

test('bootstrap health requires HTTP 200 and reports transport failures', () => {
  for (const status of [204, 301, 404, 503]) {
    const result = validateBootstrap(response(undefined, { status, body: 'not-for-diagnostics' }), NOW);
    assert.deepEqual(result, {
      failures: [{ id: 'net:bootstrap-http', detail: `HTTP ${status}` }],
      notes: []
    });
  }
  const result = validateBootstrap(response(undefined, { status: 0, error: 'timeout' }), NOW);
  assert.deepEqual(result.failures, [{ id: 'net:bootstrap-http', detail: 'HTTP timeout' }]);
});

test('bootstrap health requires the JSON media type, allowing parameters and case differences', () => {
  for (const contentType of [null, 'text/html', 'application/jsonp', 'application/problem+json']) {
    const headers = new Headers(contentType ? { 'Content-Type': contentType } : {});
    assert.deepEqual(ids(validateBootstrap(response(undefined, { headers }), NOW)), ['net:bootstrap-content-type']);
  }
  const headers = new Headers({ 'Content-Type': 'Application/JSON ; charset=UTF-8' });
  assert.deepEqual(validateBootstrap(response(undefined, { headers }), NOW).failures, []);
});

test('bootstrap health requires exactly the six supported locales, in any order', () => {
  const data = payload();
  for (const locales of [null, 'ru', ['ru', 'lt', 'en', 'pl', 'de'], ['ru', 'lt', 'en', 'pl', 'de', 'de'], ['ru', 'lt', 'en', 'pl', 'de', 'fr']]) {
    data.supportedLocales = locales;
    assert.deepEqual(ids(validate(data)), ['net:bootstrap-locales']);
  }
  data.supportedLocales = ['uk', 'de', 'pl', 'en', 'lt', 'ru'];
  assert.deepEqual(validate(data).failures, []);
});

test('bootstrap health requires an array of at most twelve schedule items', () => {
  const data = payload();
  for (const items of [undefined, null, {}, 'items', Array.from({ length: 13 }, () => ({ id: 'fixture' }))]) {
    data.schedule.items = items;
    assert.deepEqual(ids(validate(data)), ['net:bootstrap-items']);
  }
  data.schedule.items = Array.from({ length: 12 }, () => ({ id: 'fixture' }));
  assert.deepEqual(validate(data).failures, []);
});

test('bootstrap health rejects missing or invalid source dates without echoing their contents', () => {
  const data = payload();
  for (const date of [undefined, null, '', 'not-for-diagnostics', 1794222000000, ['2026-11-09T11:00:00Z']]) {
    data.schedule.sourceUpdatedAt = date;
    assert.deepEqual(validate(data), {
      failures: [{ id: 'net:bootstrap-source-date', detail: 'schedule.sourceUpdatedAt must be a valid date' }],
      notes: []
    });
  }
});

test('bootstrap health requires a positive finite maxAgeHours number', () => {
  const data = payload();
  for (const maxAge of [undefined, null, 0, -1, '48', true]) {
    data.schedule.maxAgeHours = maxAge;
    assert.deepEqual(ids(validate(data)), ['net:bootstrap-max-age']);
  }
  const body = JSON.stringify(payload()).replace('"maxAgeHours":48', '"maxAgeHours":1e400');
  assert.deepEqual(ids(validateBootstrap(response(undefined, { body }), NOW)), ['net:bootstrap-max-age']);
  data.schedule.maxAgeHours = 1.5;
  assert.deepEqual(validate(data).failures, []);
});

test('bootstrap health reports missing schedule fields without throwing', () => {
  const data = payload();
  delete data.schedule;
  assert.deepEqual(ids(validate(data)), ['net:bootstrap-items', 'net:bootstrap-source-date', 'net:bootstrap-max-age']);
});

test('bootstrap freshness uses the supplied now and includes both allowed time boundaries', () => {
  const data = payload();
  data.schedule.stale = true;
  data.schedule.sourceUpdatedAt = new Date(NOW - 48 * HOUR_MS).toISOString();
  const sourceResponse = response(data);
  assert.deepEqual(validateBootstrap(sourceResponse, NOW).failures, []);
  assert.deepEqual(ids(validateBootstrap(sourceResponse, NOW + 1)), ['net:bootstrap-freshness']);

  data.schedule.sourceUpdatedAt = new Date(NOW + 5 * 60 * 1000).toISOString();
  assert.deepEqual(validate(data).failures, []);
  data.schedule.sourceUpdatedAt = new Date(NOW + 5 * 60 * 1000 + 1).toISOString();
  assert.deepEqual(ids(validate(data)), ['net:bootstrap-future-date']);
});

test('bootstrap health requires an explicit finite now', () => {
  for (const now of [undefined, NaN, Infinity, '2026-11-09']) {
    assert.throws(() => validateBootstrap(response(), now), TypeError);
  }
});
