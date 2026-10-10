import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSchedule, upcomingEvents, isStale, parseNames, validateNames, safeExternalURL, escapeHTML,
  searchText, calendarDaysBetween, localDate, icsCalendar, icsFold
} from '../assets/js/domain.js';

const event = (patch = {}) => ({
  id: 'test', date: '2026-10-11', startTime: '08:00', start: '2026-10-11T05:00:00.000Z',
  source: 'parish-calendar', allDay: false, timePending: false,
  title: { ru: 'Литургия', lt: 'Liturgija', en: 'Liturgy' }, ...patch
});
const feed = events => ({ schemaVersion: 1, timezone: 'Europe/Vilnius', generatedAt: '2026-10-10T06:00:00Z', events });

test('Vilnius autumn DST keeps 08:00 on both sides of the clock change', () => {
  const schedule = normalizeSchedule(feed([event(), event({ id: 'winter', date: '2026-10-25', start: '2026-10-25T06:00:00Z' })]));
  assert.equal(schedule.events.length, 2);
  assert.throws(() => normalizeSchedule(feed([event({ date: '2026-10-25', start: '2026-10-25T05:00:00Z' })])), /disagrees/);
});

test('Parish rules, cancelled events and uncertain times cannot become confirmed services', () => {
  const schedule = normalizeSchedule(feed([
    event({ id: 'rule', source: 'parish-rule' }), event({ id: 'cancel', status: 'cancelled' }),
    event({ id: 'allDay', allDay: true }), event({ id: 'pending', timePending: true }), event()
  ]));
  assert.deepEqual(schedule.events.map(e => e.id), ['test']);
});

test('Cancellation suppresses an earlier occurrence with the same event ID', () => {
  assert.equal(normalizeSchedule(feed([event(), event({ status: 'cancelled' })])).events.length, 0);
});

test('Feast days are taken from the feed and never inferred', () => {
  const schedule = normalizeSchedule(feed([event({ id: 'a', feastType: 'twelve-great-feast' }), event({ id: 'b', feastType: null }), event({ id: 'c' })]));
  assert.deepEqual(schedule.events.map(e => [e.id, e.feast]), [['a', true], ['b', false], ['c', false]]);
});

test('Past services are excluded using instants, not date strings', () => {
  const schedule = normalizeSchedule(feed([event()]));
  assert.equal(upcomingEvents(schedule, Date.parse('2026-10-11T04:59:59Z')).length, 1);
  assert.equal(upcomingEvents(schedule, Date.parse('2026-10-11T05:00:01Z')).length, 0);
});

test('Old and future-dated snapshots are visibly stale', () => {
  const schedule = normalizeSchedule(feed([event()]));
  assert.equal(isStale(schedule, Date.parse('2026-10-11T06:00:00Z')), false);
  assert.equal(isStale(schedule, Date.parse('2026-10-12T06:00:01Z')), true);
  assert.equal(isStale(schedule, Date.parse('2026-10-09T06:00:00Z')), true);
  assert.equal(isStale(schedule, Date.parse('2026-10-12T06:00:01Z'), 72), false, 'the limit is configurable');
});

test('Schedule rejects missing translations, naive datetimes and duplicate IDs', () => {
  assert.throws(() => normalizeSchedule(feed([event({ title: { ru: 'Литургия' } })])), /translation/);
  assert.throws(() => normalizeSchedule(feed([event({ start: '2026-10-11T08:00:00' })])), /offset/);
  assert.throws(() => normalizeSchedule(feed([event(), event()])), /duplicate/);
});

test('«Today» and «tomorrow» follow the Vilnius calendar, including across the DST change', () => {
  // 23:30 in Vilnius on 10 October; the service is at 08:00 on the 11th.
  assert.equal(calendarDaysBetween(Date.parse('2026-10-10T20:30:00Z'), Date.parse('2026-10-11T05:00:00Z')), 1);
  assert.equal(calendarDaysBetween(Date.parse('2026-10-10T21:30:00Z'), Date.parse('2026-10-11T05:00:00Z')), 0);
  // Clocks go back on 25 October 2026: that local day lasts 25 hours.
  assert.equal(calendarDaysBetween(Date.parse('2026-10-24T22:00:00Z'), Date.parse('2026-10-25T22:30:00Z')), 1);
  assert.equal(localDate('2026-12-31T22:30:00Z'), '2027-01-01');
});

test('Prayer form accepts Cyrillic, Lithuanian, hyphenated names and customary abbreviations', () => {
  assert.deepEqual(parseNames(' Анна\nĄžuolas\nAnne-Marie\nO’Neil '), ['Анна', 'Ąžuolas', 'Anne-Marie', 'O’Neil']);
  assert.deepEqual(parseNames('прот. Николая\nмл. Анны\nотр. Петра\nболящего Иоанна'), ['прот. Николая', 'мл. Анны', 'отр. Петра', 'болящего Иоанна']);
});

test('Prayer form rejects HTML, empty input, excess names and oversize text', () => {
  for (const input of ['', '<img src=x onerror=alert(1)>', Array(21).fill('Anna').join('\n'), 'a'.repeat(61), 'Anna\u0000', '.Анна', 'Анна 1985', 'https://example.com']) {
    assert.equal(parseNames(input), null, JSON.stringify(input));
  }
});

test('Prayer form reports which line is wrong', () => {
  const result = validateNames('Анна\n\nПётр 2\n' + 'я'.repeat(61));
  assert.deepEqual(result.names, ['Анна']);
  assert.deepEqual(result.errors, [{ line: 3, reason: 'characters' }, { line: 4, reason: 'length' }]);
  assert.equal(result.tooMany, false);
  assert.equal(validateNames(Array(21).fill('Анна').join('\n')).tooMany, true);
});

test('Untrusted URLs and text cannot introduce active content', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,x', 'http://example.com', 'https://user:secret@example.com']) assert.equal(safeExternalURL(href), null);
  assert.equal(safeExternalURL('https://www.openstreetmap.org/'), 'https://www.openstreetmap.org/');
  assert.equal(escapeHTML('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});

test('Library search tolerates Lithuanian accents and Russian yo', () => {
  assert.equal(searchText('Bukiškis ĄŽUOLAS'), 'bukiskis azuolas');
  assert.equal(searchText('Ещё'), 'еще');
});

test('English Sunday ordinals are grammatical and do not alter the imported source', () => {
  for (const [n, suffix] of [[1, 'st'], [2, 'nd'], [3, 'rd'], [11, 'th'], [12, 'th'], [13, 'th'], [19, 'th'], [21, 'st'], [22, 'nd'], [23, 'rd']]) {
    const liturgical = { ru: `Неделя ${n}-я по Пятидесятнице`, en: `Sunday ${n} after Pentecost` };
    const normalized = normalizeSchedule(feed([event({ liturgical })])).events[0];
    assert.equal(normalized.subtitle.en, `${n}${suffix} Sunday after Pentecost`);
    assert.equal(normalized.subtitle.ru, liturgical.ru);
    assert.equal(liturgical.en, `Sunday ${n} after Pentecost`);
  }
});

test('A single-service calendar file is valid and carries no invented end time', () => {
  const text = icsCalendar({
    events: [{ id: 'svc-1', start: '2026-10-11T05:00:00.000Z', title: 'Божественная литургия; праздник, особый', subtitle: 'Неделя 19-я по Пятидесятнице' }],
    lang: 'ru', name: 'Храм Рождества Христова', location: 'Sodų g. 8, Bukiškis', note: 'Снимок расписания.',
    stamp: '2026-10-08T19:13:26.071Z', uidDomain: 'bukiski-hram.org'
  });
  assert.match(text, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  assert.match(text, /\r\nUID:svc-1@bukiski-hram\.org\r\n/);
  assert.match(text, /\r\nDTSTART:20261011T050000Z\r\n/);
  const unfolded = text.replace(/\r\n /g, '');
  assert.match(unfolded, /SUMMARY:Божественная литургия\\; праздник\\, особый\r\n/);
  assert.match(unfolded, /DESCRIPTION:Неделя 19-я по Пятидесятнице\\nСнимок расписания\.\r\n/);
  assert.doesNotMatch(text, /DTEND|DURATION/);
  assert.ok(text.endsWith('END:VCALENDAR\r\n'));
  for (const line of text.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.equal(icsFold('я'.repeat(60)).split('\r\n ').join(''), 'я'.repeat(60), 'folding must not split a character');
});
