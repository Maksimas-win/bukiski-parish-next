export const TIMEZONE = 'Europe/Vilnius';

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

export function safeExternalURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function localParts(value) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
}

export function normalizeSchedule(source) {
  if (source.schemaVersion !== 1 || source.timezone !== TIMEZONE || !Array.isArray(source.events)
    || !Number.isFinite(Date.parse(source.generatedAt))) throw new Error('Invalid schedule metadata');
  const cancelled = new Set(source.events.filter(e => e.status === 'cancelled').map(e => e.id));
  const ids = new Set();
  const events = [];
  for (const event of source.events) {
    // A church-calendar feast or recurring rule is not evidence of a parish service.
    if (event.source !== 'parish-calendar' || cancelled.has(event.id) || event.allDay || event.timePending) continue;
    if (!event.id || ids.has(event.id)) throw new Error('Missing or duplicate event ID');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(event.start)
      || !Number.isFinite(Date.parse(event.start))) throw new Error('Event requires an explicit UTC offset');
    const parts = localParts(event.start);
    if (`${parts.year}-${parts.month}-${parts.day}` !== event.date || `${parts.hour}:${parts.minute}` !== event.startTime) {
      throw new Error(`Service time disagrees with Europe/Vilnius: ${event.id}`);
    }
    if (!['ru','lt','en'].every(lang => typeof event.title?.[lang] === 'string' && event.title[lang].trim())) {
      throw new Error(`Missing service-title translation: ${event.id}`);
    }
    ids.add(event.id);
    const subtitle={...event.liturgical};
    // Correct English word order without changing the source's liturgical numbering.
    if(typeof subtitle.en==='string') subtitle.en=subtitle.en.replace(/^Sunday (\d+) after Pentecost$/,(_,number)=>{
      const n=Number(number), lastTwo=n%100;
      const suffix=lastTwo>=11&&lastTwo<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');
      return `${n}${suffix} Sunday after Pentecost`;
    });
    events.push({ id:event.id, date:event.date, start:event.start, startTime:event.startTime,
      title:event.title, subtitle, source:event.source });
  }
  return {
    schemaVersion:1, timezone:TIMEZONE, generatedAt:source.generatedAt,
    sourceUpdatedAt:source.source?.lastSuccessAt || source.generatedAt,
    sourceURL:safeExternalURL(source.source?.url), events:events.sort((a,b) => Date.parse(a.start)-Date.parse(b.start))
  };
}

export function upcomingEvents(schedule, now = Date.now()) {
  return schedule.events.filter(event => Date.parse(event.start) >= now);
}

export function isStale(schedule, now = Date.now(), hours = 48) {
  const updated = Date.parse(schedule.sourceUpdatedAt);
  return !Number.isFinite(updated) || now - updated > hours * 3600000 || updated > now + 300000;
}

export function parseNames(text) {
  const names=String(text).normalize('NFC').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (!names.length || names.length > 20 || names.some(name => [...name].length > 60
    || !/^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u.test(name))) return null;
  return names;
}

export function searchText(text) {
  return String(text).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase().replace(/ё/g,'е');
}
