// Date words are matched against a small, explicit vocabulary; no date is guessed.
// Fold vocabulary and questions alike, including Polish ł and Cyrillic й.
const fold = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ё/g, 'е').replace(/ł/g, 'l').replace(/[’']/g, '');
const monthNames = [
  'января|январь|січня|січень|january|sausio|stycznia|styczen|januar',
  'февраля|февраль|лютого|лютий|february|vasario|lutego|luty|februar',
  'марта|март|березня|березень|march|kovo|marca|marzec|marz',
  'апреля|апрель|квітня|квітень|april|balandzio|kwietnia|kwiecien',
  'мая|май|травня|травень|may|geguzes|maja|maj|mai',
  'июня|июнь|червня|червень|june|birzelio|czerwca|czerwiec|juni',
  'июля|июль|липня|липень|july|liepos|lipca|lipiec|juli',
  'августа|август|серпня|серпень|august|rugpjucio|sierpnia|sierpien',
  'сентября|сентябрь|вересня|вересень|september|rugsejo|wrzesnia|wrzesien',
  'октября|октябрь|жовтня|жовтень|october|spalio|pazdziernika|pazdziernik|oktober',
  'ноября|ноябрь|листопада|листопад|november|lapkricio|listopada|listopad',
  'декабря|декабрь|грудня|грудень|december|gruodzio|grudnia|grudzien|dezember'
];
const weekdayNames = [
  'воскресенье|воскресенья|неділю|неділі|sekmadieni|sunday|niedziele|sonntag',
  'понедельник|понеділок|pirmadieni|monday|poniedzialek|montag',
  'вторник|вівторок|antradieni|tuesday|wtorek|dienstag',
  'среда|среду|середу|treciadieni|wednesday|srode|mittwoch',
  'четверг|четвер|ketvirtadieni|thursday|czwartek|donnerstag',
  'пятница|пятницу|пятниці|пятницю|penktadieni|friday|piatek|freitag',
  'суббота|субботу|суботу|sestadieni|saturday|sobote|samstag'
];
const months = new Map(monthNames.flatMap((names, i) => names.split('|').map(name => [fold(name), i + 1])));
const monthPattern = [...months.keys()].sort((a, b) => b.length - a.length).join('|');
const boundaryStart = '(?<![\\p{L}\\d])';
const boundaryEnd = '(?![\\p{L}\\d])';
const namedDay = new RegExp(`${boundaryStart}(\\d{1,2})\\.?\\s+(${monthPattern})(?:\\s+(\\d{4}))?${boundaryEnd}`, 'gu');
const monthFirst = new RegExp(`${boundaryStart}(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th|\\s+d\\.)?(?:,?\\s+(\\d{4}))?${boundaryEnd}`, 'gu');
const weekdays = weekdayNames.map(names => new RegExp(`${boundaryStart}(?:${fold(names)})${boundaryEnd}`, 'u'));
const valid = date => Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;

/** Missing years use this Vilnius calendar year, as numeric dates already do. */
export function namedCalendarDate(question, today) {
  const q = fold(question);
  const matches = [
    ...[...q.matchAll(namedDay)].map(m => ({ day: m[1], month: m[2], year: m[3] })),
    ...[...q.matchAll(monthFirst)].map(m => ({ day: m[2], month: m[1], year: m[3] }))
  ];
  if (matches.length > 1) {return { invalid: true };}
  const days = weekdays.map((pattern, day) => pattern.test(q) ? day : -1).filter(day => day >= 0);
  if (days.length > 1) {return { invalid: true };}
  if (matches.length) {
    const m = matches[0];
    const date = `${m.year || today.slice(0, 4)}-${String(months.get(m.month)).padStart(2, '0')}-${m.day.padStart(2, '0')}`;
    return { date, invalid: !valid(date) || (days.length === 1 && new Date(`${date}T12:00:00Z`).getUTCDay() !== days[0]) };
  }
  if (!days.length) {return null;}
  // An unsupported numbered date alongside a weekday must not be silently ignored.
  if (/\d/.test(q)) {return { invalid: true };}
  const current = new Date(`${today}T12:00:00Z`);
  let offset = (days[0] - current.getUTCDay() + 7) % 7;
  if (!offset && /следующ|наступн|next|nachsten|nastepn|kita/.test(q)) {offset = 7;}
  if (/прошл|минул|last\s|vergang|zeszl|praejus/.test(q)) {offset = offset ? offset - 7 : -7;}
  current.setUTCDate(current.getUTCDate() + offset);
  return { date: current.toISOString().slice(0, 10) };
}

/** Recognise standalone follow-ups without treating arbitrary prose as a schedule. */
export function isCalendarFollowUp(question) {
  const q = fold(question).replace(/^(?:а\s+)?(?:на|в|у|on|for|am|w)\s+/u, '').replace(/[?!.\s]+$/u, '');
  if (weekdays.some(pattern => pattern.test(q)) && q.split(/\s+/).length <= 3) {return true;}
  return new RegExp(`^(?:\\d{1,2}\\.?\\s+(?:${monthPattern})(?:\\s+\\d{4})?|(?:${monthPattern})\\s+\\d{1,2}(?:,?\\s+\\d{4})?)$`, 'u').test(q);
}
