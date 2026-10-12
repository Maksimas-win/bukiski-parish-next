import test from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestion, normalizeSchedule, dateFromQuestion, intentOf, safeLink, pageURL } from '../assets/js/assistant/engine.js';
import { UI } from '../assets/js/assistant/i18n.js';

const now = Date.parse('2026-10-12T10:00:00Z');
const event = (extra = {}) => ({ id: 'service-1', date: '2026-10-14', startTime: '08:00', start: '2026-10-14T05:00:00Z', source: 'parish-calendar', title: { ru: 'Божественная литургия', en: 'Divine Liturgy', lt: 'Dieviškoji liturgija' }, ...extra });
const raw = (events = [event()], extra = {}) => ({ schemaVersion: 1, timezone: 'Europe/Vilnius', source: { lastSuccessAt: '2026-10-12T09:00:00Z' }, events, ...extra });
const ask = (q, schedule = normalizeSchedule(raw()), options = {}) => answerQuestion(q, { schedule, now, ...options });

test('contacts and directions work without a schedule or API key', () => {
  assert.match(ask('Как связаться?', null).paragraphs.join(' '), /370/);
  assert.match(ask('Как добраться?', null).paragraphs.join(' '), /Sodų/);
});
test('all six languages have matching quick actions and complete UI', () => {
  for (const [locale, ui] of Object.entries(UI)) {
    assert.deepEqual(Object.keys(ui).sort(), Object.keys(UI.ru).sort(), locale);
    assert.deepEqual(ui.suggestions.map(intentOf), ['schedule', 'schedule', 'directions', 'contacts'], locale);
    assert.equal(ask(ui.suggestions[0], undefined, { locale }).events[0].startTime, '08:00');
  }
});
test('unknown questions do not invent parish facts', () => {
  assert.equal(ask('Какая сегодня погода?').kind, 'unknown');
  assert.equal(ask('Расскажи об ипотеке').kind, 'unknown');
});
test('tomorrow is a Vilnius calendar date across DST and UTC midnight', () => {
  assert.equal(dateFromQuestion('завтра', Date.parse('2026-10-24T22:30:00Z')).date, '2026-10-26');
  assert.equal(dateFromQuestion('today', Date.parse('2026-10-24T22:30:00Z')).date, '2026-10-25');
  assert.equal(dateFromQuestion('послезавтра', now).date, '2026-10-14');
});
test('exact, impossible, ambiguous dates and Sunday are handled explicitly', () => {
  assert.equal(dateFromQuestion('14.10.2026', now).date, '2026-10-14');
  assert.equal(dateFromQuestion('31.02.2026', now).invalid, true);
  assert.equal(dateFromQuestion('14 октября', now).invalid, true);
  assert.equal(dateFromQuestion('в воскресенье', now).date, '2026-10-18');
  assert.equal(ask('Есть ли служба 14.10.2026?').events.length, 1);
});
test('no entry tomorrow never becomes a claim that there is no service', () => {
  const answer = ask('Есть ли служба завтра?');
  assert.equal(answer.events.length, 0);
  assert.match(answer.paragraphs[0], /не означает/);
});
test('calendar cancellation overrides all duplicates and unrelated sources are excluded', () => {
  const schedule = normalizeSchedule(raw([event(), event({ status: 'cancelled' }), event({ id: 'computed', source: 'computed-feast' })]));
  assert.equal(schedule.events.length, 0);
});
test('explicit timezone and wall time are validated including daylight saving', () => {
  assert.equal(normalizeSchedule(raw([event({ start: '2026-10-14T08:00:00' })])).events.length, 0);
  assert.equal(normalizeSchedule(raw([event({ startTime: '09:00' })])).events.length, 0);
  assert.equal(normalizeSchedule(raw([event({ date: '2026-10-25', start: '2026-10-25T06:00:00Z' })])).events.length, 1);
});
test('rector-confirmed additions survive normalized .net exports', () => {
  assert.equal(normalizeSchedule(raw([event({ source: 'parish-confirmed' })])).events.length, 1);
});
test('pending calendar events never get an invented hour', () => {
  const result = ask('ближайшие службы', normalizeSchedule(raw([event({ timePending: true, start: null, startTime: null })])));
  assert.equal(result.events[0].pending, true);
  assert.equal(result.events[0].startTime, null);
});
test('old, future and failed-source refreshes cannot masquerade as fresh', () => {
  for (const timestamp of ['2026-10-09T10:00:00Z', '2027-01-01T00:00:00Z']) {
    assert.equal(ask('расписание', normalizeSchedule(raw(undefined, { generatedAt: new Date(now).toISOString(), source: { lastSuccessAt: timestamp } }))).kind, 'stale');
  }
  assert.throws(() => normalizeSchedule(raw([], { source: {} })), /update/);
  assert.equal(ask('расписание', null).kind, 'unavailable');
});
test('upcoming excludes elapsed services, exact date retains and labels them', () => {
  const data = normalizeSchedule(raw([event({ date: '2026-10-12', start: '2026-10-12T05:00:00Z' })]));
  assert.equal(ask('ближайшая служба', data).events.length, 0);
  assert.equal(ask('сегодня', data).events[0].past, true);
});
test('links reject script URLs, credentials, external hosts and unsafe telephone numbers', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,hello', 'https://evil.test/', 'https://evil.test@bukiski-hram.net/', '//evil.test/', 'tel:+12345']) assert.equal(safeLink(href), null);
  assert.equal(safeLink('tel:+37063693506'), 'tel:+37063693506');
  assert.equal(pageURL('contacts', 'lt', 'net', '/preview'), '/preview/lt/contacts.html');
  assert.equal(pageURL('contacts', 'de', 'org'), '/en/contacts.html');
  assert.equal(pageURL('notes', 'pl', 'org'), 'https://bukiski-hram.net/pl/notes.html');
});
test('personal sacrament timing questions go to priest instead of guessing a service', () => {
  assert.equal(ask('Во сколько завтра исповедь?').kind, 'sacraments');
  assert.equal(ask('Когда крещение?').kind, 'sacraments');
});
