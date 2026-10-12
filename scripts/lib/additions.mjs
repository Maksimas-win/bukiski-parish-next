// Services the rector has confirmed that the parish calendar feed does not yet
// carry with a time (content/schedule-additions.json). They are merged into the
// normalised schedule; a feed service at the same date and time takes priority
// and only receives the addition's note.

import { SITE_LANGUAGES, localParts } from '../../assets/js/domain.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** The UTC instant of a Vilnius wall-clock time, checked against the time zone rules. */
function vilniusInstant(date, time) {
  for (const offset of ['+02:00', '+03:00']) {
    const start = new Date(`${date}T${time}:00${offset}`).toISOString();
    const parts = localParts(start);
    if (`${parts.year}-${parts.month}-${parts.day}` === date && `${parts.hour}:${parts.minute}` === time) return start;
  }
  throw new Error(`schedule-additions.json: ${date} ${time} is not a valid Vilnius time`);
}

const complete = value => SITE_LANGUAGES.every(lang => typeof value?.[lang] === 'string' && value[lang].trim());

export function mergeAdditions(schedule, additions) {
  for (const item of additions.events || []) {
    if (!item.id || !DATE.test(item.date) || !TIME.test(item.startTime)) throw new Error(`schedule-additions.json: invalid entry ${item.id}`);
    if (!complete(item.title)) throw new Error(`schedule-additions.json: ${item.id} needs a title in every site language`);
    if (item.subtitle && !complete(item.subtitle)) throw new Error(`schedule-additions.json: ${item.id} needs a subtitle in every site language`);
    if (item.note && !complete(item.note)) throw new Error(`schedule-additions.json: ${item.id} needs a note in every site language`);
    const start = vilniusInstant(item.date, item.startTime);
    const existing = schedule.events.find(event => event.start === start);
    if (existing) {
      if (item.note) existing.note = item.note;
      continue;
    }
    schedule.events.push({
      id: item.id,
      date: item.date,
      start,
      startTime: item.startTime,
      title: item.title,
      subtitle: item.subtitle || {},
      note: item.note || null,
      feast: false,
      source: 'parish-confirmed',
      church: null
    });
  }
  schedule.events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
