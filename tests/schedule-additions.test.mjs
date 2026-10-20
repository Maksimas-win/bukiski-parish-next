import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE_LANGUAGES } from '../assets/js/domain.js';
import { mergeAdditions } from '../scripts/lib/additions.mjs';

const addition = (patch = {}) => ({
  id: 'confirmed-night', date: '2027-05-01', startTime: '23:30',
  title: Object.fromEntries(SITE_LANGUAGES.map(lang => [lang, 'Confirmed service'])),
  ...patch
});

test('Confirmed additions retain only their explicitly supplied, valid feast metadata', () => {
  for (const [feastDate, kind] of [
    ['2027-05-02', 'paschal-night'], [undefined, undefined], [null, null],
    ['2027-02-29', ''], ['2027-13-01', 'x'.repeat(81)], ['2027-05-02', 'paschal\nnight']
  ]) {
    const schedule = { events: [] };
    mergeAdditions(schedule, { events: [addition({ feastDate, kind })] });
    const [service] = schedule.events;
    assert.equal(service.date, '2027-05-01');
    assert.equal(service.start, '2027-05-01T20:30:00.000Z');
    assert.equal(service.source, 'parish-confirmed');
    if (feastDate === '2027-05-02') assert.equal(service.feastDate, feastDate);
    else assert.equal(Object.hasOwn(service, 'feastDate'), false);
    if (kind === 'paschal-night') assert.equal(service.kind, kind);
    else assert.equal(Object.hasOwn(service, 'kind'), false);
  }
});

test('A matching calendar service keeps precedence over addition feast metadata', () => {
  const original = { id: 'calendar-service', start: '2027-05-01T20:30:00.000Z', feastDate: '2027-05-02', kind: 'paschal-night', source: 'parish-calendar' };
  const schedule = { events: [{ ...original }] };
  mergeAdditions(schedule, { events: [addition({ feastDate: '2027-05-03', kind: 'liturgy' })] });
  assert.deepEqual(schedule.events, [original]);
});
