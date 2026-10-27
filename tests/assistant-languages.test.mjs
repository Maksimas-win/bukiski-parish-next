import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { intentOf, dateFromQuestion, answerQuestion, normalizeSchedule } from '../assets/js/assistant/engine.js';

const now = Date.parse('2026-10-26T10:00:00Z'); // Monday in Vilnius.
const locales = JSON.parse(await readFile(new URL('../content/locales.json', import.meta.url), 'utf8'));
const weekdays = {
  ru: ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'],
  lt: ['pirmadienį', 'antradienį', 'trečiadienį', 'ketvirtadienį', 'penktadienį', 'šeštadienį', 'sekmadienį'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  pl: ['w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę', 'w niedzielę'],
  de: ['am Montag', 'am Dienstag', 'am Mittwoch', 'am Donnerstag', 'am Freitag', 'am Samstag', 'am Sonntag'],
  uk: ['у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у п’ятницю', 'у суботу', 'у неділю']
};

test('all seven weekdays select the correct date in every site language', () => {
  for (const [locale, questions] of Object.entries(weekdays)) {
    for (const [index, question] of questions.entries()) {
      const expected = new Date(now + index * 86400000).toISOString().slice(0, 10);
      assert.equal(intentOf(question), 'schedule', locale + ': ' + question);
      assert.equal(dateFromQuestion(question, now).date, expected, locale + ': ' + question);
    }
  }
});

test('Polish ł and Cyrillic й are normalized in both date input and vocabulary', () => {
  for (const question of ['w poniedziałek', 'w poniedzialek', 'w PONIEDZIAŁEK']) {
    assert.equal(dateFromQuestion(question, now).date, '2026-10-26', question);
  }
  for (const [question, expected] of [['1 май 2027', '2027-05-01'], ['1 лютий 2027', '2027-02-01']]) {
    assert.equal(intentOf(question), 'schedule', question);
    assert.equal(dateFromQuestion(question, now).date, expected, question);
  }
});

test('assistant understands the actual localized navigation labels for prayer requests', () => {
  for (const [locale, text] of Object.entries(locales)) {
    const answer = answerQuestion(text.nav.notes, { locale, now });
    assert.equal(answer.kind, 'notes', locale + ': ' + text.nav.notes);
    assert.equal(answer.links[0].href, '/' + locale + '/notes.html');
    assert.ok(answer.paragraphs[0]);
  }
  for (const question of ['Prayer requests', 'prayer notes', 'Karteczki', 'kartki', 'Intencje', 'Gebetsanliegen', 'Gebetszettel']) {
    assert.equal(intentOf(question), 'notes', question);
  }
});

test('a Polish weekday returns only published services for that day', () => {
  const schedule = normalizeSchedule({schemaVersion: 1, timezone: 'Europe/Vilnius', sourceUpdatedAt: new Date(now).toISOString(), events: [
    {id: 'monday', date: '2026-10-26', start: '2026-10-26T06:00:00Z', startTime: '08:00', source: 'parish-confirmed', title: {pl: 'Boska Liturgia'}},
    {id: 'tuesday', date: '2026-10-27', start: '2026-10-27T06:00:00Z', startTime: '08:00', source: 'parish-confirmed', title: {pl: 'Boska Liturgia'}}
  ]});
  const result = answerQuestion('Nabożeństwa w poniedziałek', {locale: 'pl', schedule, now});
  assert.deepEqual(result.events.map(event => event.id), ['monday']);
  assert.equal(result.events[0].past, true);
});


test('liturgy questions select the published schedule in every assistant language', () => {
  const questions = {
    ru: 'Когда ближайшая литургия?', lt: 'Kada artimiausia liturgija?',
    en: 'When is the next liturgy?', pl: 'Kiedy najbliższa liturgia?',
    de: 'Wann ist die nächste Liturgie?', uk: 'Коли найближча літургія?'
  };
  const schedule = normalizeSchedule({ schemaVersion: 1, timezone: 'Europe/Vilnius',
    sourceUpdatedAt: new Date(now).toISOString(), events: [{
      id: 'published', date: '2026-11-01', start: '2026-11-01T06:00:00Z', startTime: '08:00',
      source: 'parish-confirmed', title: Object.fromEntries(Object.keys(questions).map(locale => [locale, 'Published liturgy']))
    }] });
  for (const [locale, question] of Object.entries(questions)) {
    assert.equal(intentOf(question), 'schedule', locale);
    const answer = answerQuestion(question, { locale, schedule, now });
    assert.deepEqual(answer.events.map(event => event.id), ['published'], locale);
    assert.equal(answer.links[0].href, '/' + locale + '/schedule.html', locale);
  }
});
