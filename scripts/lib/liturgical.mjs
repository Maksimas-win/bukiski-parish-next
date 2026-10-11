// Service titles and liturgical day names for site languages that the parish
// feed does not carry (see content/liturgical-terms.json). Nothing is invented:
// a text without a reviewed translation falls back to the feed's English and is
// reported, so the build log shows what still needs translating.

const UK_SUFFIX = number => {
  const lastTwo = number % 100;
  const last = number % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return 'та';
  return { 1: 'ша', 2: 'га', 3: 'тя', 7: 'ма', 8: 'ма' }[last] || 'та';
};

export function createTranslator(dictionary) {
  const missing = new Set();
  function translate(english, lang) {
    if (typeof english !== 'string' || !english) return '';
    const term = dictionary.terms[english]?.[lang];
    if (term) return term;
    const sunday = /^(\d+)(?:st|nd|rd|th)? Sunday after Pentecost$|^Sunday (\d+) after Pentecost$/.exec(english);
    const pattern = dictionary.patterns.sundayAfterPentecost[lang];
    if (sunday && pattern) {
      const n = Number(sunday[1] || sunday[2]);
      return pattern.replace('{n}', n).replace('{suffix}', UK_SUFFIX(n));
    }
    missing.add(`${lang}: ${english}`);
    return english;
  }
  return { translate, missing };
}

/** Adds the extra languages to every event, keyed by the feed's English text. */
export function localizeSchedule(schedule, dictionary, languages, rawEvents = []) {
  const { translate, missing } = createTranslator(dictionary);
  // The English subtitle is reworded by normalizeSchedule; translate from the feed's original.
  const originals = new Map(rawEvents.map(event => [event.id, event.liturgical?.en]));
  for (const event of schedule.events) {
    for (const lang of languages) {
      if (!event.title[lang]) event.title = { ...event.title, [lang]: translate(event.title.en, lang) };
      const english = originals.get(event.id) ?? event.subtitle.en;
      if (english && !event.subtitle[lang]) event.subtitle[lang] = translate(english, lang);
    }
  }
  return [...missing];
}
