import test from 'node:test';
import assert from 'node:assert/strict';
import { dateFromQuestion, intentOf, answerQuestion, normalizeSchedule } from '../assets/js/assistant/engine.js';

const now = Date.parse('2026-10-12T10:00:00Z');
test('named dates work in all six website languages and as follow-up questions', () => {
  for (const q of ['14 октября', '14 жовтня', '14 October', 'October 14', '14 spalio', 'spalio 14', '14 października', '14. Oktober']) {
    assert.equal(dateFromQuestion(q, now).date, '2026-10-14', q);
    assert.equal(dateFromQuestion(q, now).invalid, false, q);
    assert.equal(intentOf(q), 'schedule', q);
  }
  assert.equal(dateFromQuestion('служба 7 января 2027?', now).date, '2027-01-07');
  assert.equal(dateFromQuestion('January 7, 2027', now).date, '2027-01-07');
});
test('weekday requests preserve Vilnius day boundaries and next-occurrence semantics', () => {
  for (const q of ['в среду', 'у середу', 'Wednesday', 'trečiadienį', 'w środę', 'am Mittwoch']) {
    assert.equal(dateFromQuestion(q, now).date, '2026-10-14', q);
    assert.equal(intentOf(q), 'schedule', q);
  }
  assert.equal(dateFromQuestion('в следующий понедельник', now).date, '2026-10-19');
  assert.equal(dateFromQuestion('в прошлую пятницу', now).date, '2026-10-09');
  assert.equal(dateFromQuestion('в понедельник', Date.parse('2026-10-25T22:30:00Z')).date, '2026-10-26');
  assert.equal(dateFromQuestion('в п’ятницю', now).date, '2026-10-16');
});
test('impossible, conflicting and multiple named dates request clarification', () => {
  for (const q of ['31 февраля', '29 февраля 2027', '14 октября и 15 октября', 'в среду и пятницу', 'в пятницу 14 октября', 'в среду 2030']) {
    assert.equal(dateFromQuestion(q, now).invalid, true, q);
  }
  assert.equal(dateFromQuestion('29 февраля 2028', now).invalid, false);
  assert.equal(dateFromQuestion('в среду 14 октября', now).invalid, false);
  assert.equal(intentOf('Напиши рассказ о среде программирования'), 'unknown');
});
test('named dates select actual records and never generate a service', () => {
  const schedule=normalizeSchedule({schemaVersion:1,timezone:'Europe/Vilnius',sourceUpdatedAt:new Date(now).toISOString(),events:[{
    id:'service',date:'2026-10-14',start:'2026-10-14T05:00:00Z',startTime:'08:00',source:'parish-confirmed',title:{ru:'Литургия'}
  }]});
  assert.equal(answerQuestion('14 октября',{schedule,now}).events[0].startTime,'08:00');
  assert.equal(answerQuestion('в четверг',{schedule,now}).events.length,0);
  assert.equal(answerQuestion('Во сколько исповедь в среду?',{schedule,now}).kind,'sacraments');
});
