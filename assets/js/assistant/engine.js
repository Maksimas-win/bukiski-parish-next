import { UI } from './i18n.js?v=4bf6e21e5f';
import { FAQ, PARISH } from './knowledge.js?v=4bf6e21e5f';
import { namedCalendarDate, isCalendarFollowUp } from './calendar-requests.js?v=4bf6e21e5f';

export const TIMEZONE = 'Europe/Vilnius';
export const MAX_QUESTION = 500;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export const fold = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ё/g, 'е');
export const localeOf = value => Object.hasOwn(UI, value) ? value : 'ru';

export function localParts(now) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
}
export function localDate(now) {
  const p = localParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}
function validDate(date) {
  return DATE.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}
function shiftDate(date, days) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/** Fixed read-only intents. All patterns operate on accent-folded text. */
export function intentOf(question) {
  const q = fold(question).slice(0, MAX_QUESTION);
  if (/крещ|хрещ|венчан|вінчан|испов|спов|причаст|причащ|таинств|таінств|krikst|santuok|ispaz|komun|sakrament|baptis|wedding|marriage|confess|communion|sacrament|chrz|slub|spowiedz|taufe|trauung|beichte|панихид|панахид|помин|поминан|отпев/.test(q)) {return 'sacraments';}
  if (/записк|rašt|rastel|prayer note|kartk|gebetszett/.test(q)) {return 'notes';}
  if (/открыт|закрыт|відкрит|зачин|atidary|uzdary|opening|open(?:s|ing)?\b|closed|otwar|offnung|geoffnet/.test(q)) {return 'hours';}
  if (/контакт|телефон|позвон|звонить|связа|связь|зв.яз|настоятель|священник|kunig|klebon|susisiek|kontakt|telefon|skamb|contact|phone|call|priest|rector|pfarrer|erreich/.test(q)) {return 'contacts';}
  if (/адрес|добрат|доехать|дістат|проехать|автобус|atvykt|adres|autobus|address|direction|where|get there|bus (?:route|number)|dojech|anfahrt|komme.*hin|\bwo\b/.test(q)) {return 'directions';}
  if (/истори|істор|istor|history|histori|geschichte/.test(q)) {return 'history';}
  if (/впервые|первый раз|вперше|pirma kart|first visit|first time|pierwszy|erster besuch/.test(q)) {return 'visit';}
  if (/распис|розклад|служб|литург|богослуж|лiтург|pamald|tvarkar|liturg|service|schedule|nabozen|gottesdienst|пасх|покров|рождеств|різдв|easter|christmas|velyk|kaled|wielkanoc|ostern|weihnacht/.test(q)) {return 'schedule';}
  if (/^(?:(?:а|а на|на|в|and|what about)\s+)?(?:сегодня|сьогодн[іи]|завтра|послезавтра|післязавтра|воскресенье|нед[іи]лю|siandien|rytoj|poryt|sekmadieni|today|tomorrow|day after tomorrow|sunday|dzisiaj|jutro|pojutrze|niedziele|heute|morgen|ubermorgen|sonntag|\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}(?:[./]\d{4})?)[?!.\s]*$/.test(q)) {return 'schedule';}
  return isCalendarFollowUp(q) ? 'schedule' : 'unknown';
}

export function dateFromQuestion(question, now = Date.now()) {
  const q = fold(question);
  const today = localDate(now);
  const iso = q.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) {return { date: iso[1], invalid: !validDate(iso[1]) };}
  const short = q.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?\b/);
  if (short) {
    const date = `${short[3] || today.slice(0, 4)}-${short[2].padStart(2, '0')}-${short[1].padStart(2, '0')}`;
    return { date, invalid: !validDate(date) };
  }
  const named = namedCalendarDate(q, today);
  if (named) {return named;}
  if (/послезавтра|післязавтра|poryt|day after tomorrow|pojutrze|ubermorgen/.test(q)) {return { date: shiftDate(today, 2) };}
  if (/завтра|rytoj|tomorrow|jutro|morgen/.test(q)) {return { date: shiftDate(today, 1) };}
  if (/сегодня|сьогодн|siandien|today|dzis|heute/.test(q)) {return { date: today };}
  if (/воскресен|неділ|sekmadien|sunday|niedziel|sonntag/.test(q)) {
    let days = (7 - new Date(`${today}T12:00:00Z`).getUTCDay()) % 7;
    if (!days && /следующ|наступн|next|nachsten|nastepn|kit/.test(q)) {days = 7;}
    return { date: shiftDate(today, days) };
  }
  // Do not silently answer an unrecognised date request with unrelated services.
  if (/\d/.test(q) || /понедель|вторник|сред[ау]|четверг|пятниц|суббот|субот|monday|tuesday|wednesday|thursday|friday|saturday|saus|vasar|kov[oa]|baland|gegu|birzel|liep|rugpj|rugsej|spal|lapkr|gruod/.test(q)) {return { invalid: true };}
  return {};
}

/** Validates published records; no recurrence or feast times are invented. */
export function normalizeSchedule(raw) {
  if (raw?.schemaVersion !== 1 || raw.timezone !== TIMEZONE || !Array.isArray(raw.events) || raw.events.length > 3000) {throw new Error('Invalid schedule');}
  const updated = raw.sourceUpdatedAt || raw.source?.lastSuccessAt;
  if (!Number.isFinite(Date.parse(updated))) {throw new Error('Missing source update time');}
  const cancelled = new Set(raw.events.filter(e => e.status === 'cancelled').map(e => e.id));
  const ids = new Set();
  const events = [];
  for (const e of raw.events) {
    if (!e?.id || cancelled.has(e.id) || ids.has(e.id) || e.allDay || !validDate(e.date)) {continue;}
    if (!['parish-calendar', 'parish-confirmed'].includes(e.source)) {continue;}
    const pending = e.timePending === true;
    if (!pending) {
      if (!INSTANT.test(e.start) || !Number.isFinite(Date.parse(e.start))) {continue;}
      const parts = localParts(e.start);
      if (localDate(e.start) !== e.date || `${parts.hour}:${parts.minute}` !== e.startTime) {continue;}
    }
    const textMap = obj => Object.fromEntries(Object.keys(UI).filter(l => typeof obj?.[l] === 'string').map(l => [l, obj[l].trim().slice(0, 350)]));
    const title = textMap(e.title);
    if (!Object.values(title).some(Boolean)) {continue;}
    ids.add(e.id);
    events.push({ id: String(e.id), date: e.date, start: pending ? null : e.start, startTime: pending ? null : e.startTime,
      pending, title, subtitle: textMap(e.subtitle || e.liturgical), note: textMap(e.note), source: e.source });
  }
  return { updated, events: events.sort((a, b) => `${a.date} ${a.startTime || '99:99'}`.localeCompare(`${b.date} ${b.startTime || '99:99'}`)) };
}

export function pageURL(page, locale, site = 'net', base = '') {
  const language = localeOf(locale);
  const org = site === 'org';
  const supported = org && ['de', 'uk'].includes(language) ? 'en' : language;
  if (org && page === 'notes') {return `https://bukiski-hram.net/${language}/notes.html`;}
  const prefix = /^\/[a-zA-Z0-9_/-]*$/.test(base) ? base.replace(/\/$/, '') : '';
  return `${prefix}/${supported}/${page}.html`;
}
export function safeLink(value, origin = 'https://bukiski-hram.net') {
  if (value === `tel:${PARISH.phone}`) {return value;}
  try {
    const url = new URL(value, origin);
    if (url.username || url.password) {return null;}
    if (url.origin === origin && ['https:', 'http:'].includes(url.protocol) && !value.startsWith('//')) {return url.href;}
    if (url.protocol === 'https:' && ['bukiski-hram.net', 'bukiski-hram.org', 'www.google.com'].includes(url.hostname)) {return url.href;}
  } catch { /* Invalid links are never rendered. */ }
  return null;
}

export function answerQuestion(question, { locale = 'ru', schedule = null, now = Date.now(), site = 'net', base = '' } = {}) {
  locale = localeOf(locale);
  const t = UI[locale];
  const intent = intentOf(question);
  const link = (page, label = t.source) => ({ label, href: pageURL(page, locale, site, base) });
  const contactLinks = [link('contacts', t.contacts), { label: `${t.call} · ${PARISH.displayPhone}`, href: `tel:${PARISH.phone}` }];
  if (!String(question).trim()) {return { kind: 'empty', paragraphs: [t.empty], links: [] };}
  if (intent === 'contacts') {return { kind: intent, paragraphs: [PARISH.displayPhone, PARISH.address], links: contactLinks };}
  if (intent === 'directions') {return { kind: intent, paragraphs: [PARISH.address], links: [{ label: t.map, href: PARISH.map }, ...contactLinks] };}
  if (FAQ[intent]) {return { kind: intent, paragraphs: [FAQ[intent][locale]], links: [link(FAQ[intent].page), contactLinks[1]] };}
  if (intent !== 'schedule') {return { kind: 'unknown', paragraphs: [t.unknown], links: contactLinks };}
  const links = [link('schedule', t.schedule), contactLinks[1]];
  const request = dateFromQuestion(question, now);
  if (request.invalid) {return { kind: 'date', paragraphs: [t.invalidDate], links };}
  if (!schedule) {return { kind: 'unavailable', paragraphs: [t.unavailable], links };}
  const age = now - Date.parse(schedule.updated);
  if (!Number.isFinite(age) || age > 48 * 3600000 || age < -300000) {return { kind: 'stale', paragraphs: [t.stale], links, updated: schedule.updated };}
  const today = localDate(now);
  let events = schedule.events.filter(e => request.date ? e.date === request.date : e.pending ? e.date >= today : Date.parse(e.start) >= now);
  const q = fold(question);
  const feasts = [
    [/пасх|easter|velyk|wielkanoc|ostern/, /пасх|easter|pasch|velyk|wielkanoc|ostern/],
    [/рождеств|різдв|christmas|kaled|weihnacht|boze narodz/, /рождеств|різдв|christmas|kaled|weihnacht|boze narodz/],
    [/покров/, /покров|protection|uztarim|opieki/]
  ];
  const feast = feasts.find(([pattern]) => pattern.test(q));
  if (feast) {events = events.filter(e => feast[1].test(fold(Object.values(e.title).join(' ') + ' ' + Object.values(e.subtitle).join(' '))));}
  const result = events.slice(0, request.date ? 10 : 3).map(e => {
    const sourceLocale = e.title[locale] ? locale : e.title.en ? 'en' : Object.keys(e.title)[0];
    return { ...e, titleText: e.title[sourceLocale], titleLanguage: sourceLocale,
      subtitleText: e.subtitle[locale] || '', noteText: e.note[locale] || '', past: !e.pending && Date.parse(e.start) < now };
  });
  return { kind: 'schedule', paragraphs: [result.length ? request.date ? t.selected : t.upcoming : t.noEvents],
    events: result, links, updated: schedule.updated, more: events.length > result.length };
}
