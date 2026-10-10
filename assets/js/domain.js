// Pure data rules shared by the Node build, the tests and the browser.
// Nothing here touches the DOM, the network or storage.

export const TIMEZONE = 'Europe/Vilnius';
export const SITE_LANGUAGES = ['ru', 'lt', 'en'];
export const MAX_NAMES = 20;
export const MAX_NAME_LENGTH = 60;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

/** Returns the normalised href for an HTTPS URL without credentials, otherwise null. */
export function safeExternalURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/** Calendar fields of an instant as seen on a clock in Vilnius. */
export function localParts(value) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  return Object.fromEntries(formatter.formatToParts(new Date(value)).map(part => [part.type, part.value]));
}

/** Local Vilnius date of an instant as YYYY-MM-DD. */
export function localDate(value) {
  const parts = localParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Whole calendar days in Vilnius between two instants: 0 is today, 1 is tomorrow.
 * Comparing dates rather than hours keeps "tomorrow" correct across DST changes.
 */
export function calendarDaysBetween(from, to) {
  const day = value => Date.parse(`${localDate(value)}T00:00:00Z`);
  return Math.round((day(to) - day(from)) / 86400000);
}

const EVENT_START = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

function englishOrdinal(number) {
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${number}th`;
  return `${number}${{ 1: 'st', 2: 'nd', 3: 'rd' }[number % 10] || 'th'}`;
}

/**
 * Validates the parish feed and keeps only services the parish calendar confirms
 * with an exact time. A church-calendar feast or a recurring rule is not evidence
 * of a service, so planned, all-day, time-pending and cancelled entries are dropped.
 */
export function normalizeSchedule(source) {
  if (source.schemaVersion !== 1 || source.timezone !== TIMEZONE || !Array.isArray(source.events)
    || !Number.isFinite(Date.parse(source.generatedAt))) {
    throw new Error('Invalid schedule metadata');
  }
  const cancelled = new Set(source.events.filter(event => event.status === 'cancelled').map(event => event.id));
  const ids = new Set();
  const events = [];

  for (const event of source.events) {
    if (event.source !== 'parish-calendar' || cancelled.has(event.id) || event.allDay || event.timePending) continue;
    if (!event.id || ids.has(event.id)) throw new Error('Missing or duplicate event ID');
    if (!EVENT_START.test(event.start) || !Number.isFinite(Date.parse(event.start))) {
      throw new Error('Event requires an explicit UTC offset');
    }
    const parts = localParts(event.start);
    if (`${parts.year}-${parts.month}-${parts.day}` !== event.date || `${parts.hour}:${parts.minute}` !== event.startTime) {
      throw new Error(`Service time disagrees with Europe/Vilnius: ${event.id}`);
    }
    if (!SITE_LANGUAGES.every(lang => typeof event.title?.[lang] === 'string' && event.title[lang].trim())) {
      throw new Error(`Missing service-title translation: ${event.id}`);
    }
    ids.add(event.id);

    const subtitle = { ...event.liturgical };
    // Correct English word order without changing the source's liturgical numbering.
    if (typeof subtitle.en === 'string') {
      subtitle.en = subtitle.en.replace(/^Sunday (\d+) after Pentecost$/, (_, number) => `${englishOrdinal(Number(number))} Sunday after Pentecost`);
    }
    events.push({
      id: event.id,
      date: event.date,
      start: event.start,
      startTime: event.startTime,
      title: event.title,
      subtitle,
      // The feed marks great feasts itself; the site never infers them.
      feast: typeof event.feastType === 'string' && event.feastType.length > 0,
      source: event.source
    });
  }

  return {
    schemaVersion: 1,
    timezone: TIMEZONE,
    generatedAt: source.generatedAt,
    sourceUpdatedAt: source.source?.lastSuccessAt || source.generatedAt,
    sourceURL: safeExternalURL(source.source?.url),
    events: events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  };
}

export function upcomingEvents(schedule, now = Date.now()) {
  return schedule.events.filter(event => Date.parse(event.start) >= now);
}

/** A snapshot is stale when it is older than the limit or claims to come from the future. */
export function isStale(schedule, now = Date.now(), hours = 48) {
  const updated = Date.parse(schedule.sourceUpdatedAt);
  return !Number.isFinite(updated) || now - updated > hours * 3600000 || updated > now + 300000;
}

// Letters, spaces, hyphen, apostrophe and the full stop used in customary
// abbreviations such as «прот.», «мл.» or «отр.». Digits and markup are rejected.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'\u2019-]*$/u;

/**
 * Checks prayer-request names line by line.
 * @returns {{ names: string[], errors: { line: number, reason: 'characters' | 'length' }[], tooMany: boolean }}
 */
export function validateNames(text) {
  const names = [];
  const errors = [];
  String(text).normalize('NFC').split(/\r?\n/).forEach((raw, index) => {
    const name = raw.trim();
    if (!name) return;
    if ([...name].length > MAX_NAME_LENGTH) errors.push({ line: index + 1, reason: 'length' });
    else if (!NAME_PATTERN.test(name)) errors.push({ line: index + 1, reason: 'characters' });
    else names.push(name);
  });
  return { names, errors, tooMany: names.length + errors.length > MAX_NAMES };
}

/** Returns the list of names, or null when the text cannot be used as written. */
export function parseNames(text) {
  const { names, errors, tooMany } = validateNames(text);
  return names.length && !errors.length && !tooMany ? names : null;
}

/** Folds case and diacritics so «Ещё» finds «еще» and «Bukiskis» finds «Bukiškis». */
export function searchText(text) {
  return String(text).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/ё/g, 'е');
}

// --- iCalendar (RFC 5545) -------------------------------------------------

export function icsEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function icsInstant(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

const utf8Length = char => (char.codePointAt(0) <= 0x7f ? 1 : char.codePointAt(0) <= 0x7ff ? 2 : char.codePointAt(0) <= 0xffff ? 3 : 4);

/** Folds a content line so that no physical line exceeds 75 octets. */
export function icsFold(line) {
  let bytes = 0;
  let out = '';
  let part = '';
  for (const char of line) {
    const size = utf8Length(char);
    if (bytes + size > 73) {
      out += `${part}\r\n `;
      part = '';
      bytes = 1;
    }
    part += char;
    bytes += size;
  }
  return out + part;
}

/**
 * Builds a calendar file. Events carry a start only: the parish feed publishes
 * no end time, and the site does not invent a duration.
 */
export function icsCalendar({ events, lang, name, location, note, stamp, uidDomain }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Bukiski Parish//Service Schedule//${lang.toUpperCase()}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(name)}`,
    `X-WR-TIMEZONE:${TIMEZONE}`
  ];
  for (const event of events) {
    const description = [event.subtitle, note].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@${uidDomain}`,
      `DTSTAMP:${icsInstant(stamp)}`,
      `DTSTART:${icsInstant(event.start)}`,
      `SUMMARY:${icsEscape(event.title)}`,
      `LOCATION:${icsEscape(location)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(icsFold).join('\r\n')}\r\n`;
}
