const SUPPORTED_LOCALES = ['ru', 'lt', 'en', 'pl', 'de', 'uk'];
const HOUR_MS = 3600000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/** Validate a request() result without I/O; now is a Unix timestamp in milliseconds. */
export function validateBootstrap({ status, headers, body, error }, now) {
  if (!Number.isFinite(now)) throw new TypeError('now must be a finite timestamp in milliseconds');

  const result = { failures: [], notes: [] };
  const fail = (suffix, detail) => result.failures.push({ id: `net:bootstrap-${suffix}`, detail });

  if (status !== 200) {
    fail('http', `HTTP ${status || error || 'request failed'}`);
    return result;
  }
  const contentType = headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    fail('content-type', 'expected application/json');
    return result;
  }

  let data;
  try { data = JSON.parse(body); } catch {
    // Parser errors may quote the response body; keep diagnostics deliberately small.
    fail('json', 'invalid JSON');
    return result;
  }
  if (data?.schemaVersion !== 1) {
    fail('schema', 'schemaVersion must be 1');
    return result;
  }

  const locales = data.supportedLocales;
  if (!Array.isArray(locales) || locales.length !== SUPPORTED_LOCALES.length
    || !SUPPORTED_LOCALES.every(locale => locales.includes(locale))) {
    fail('locales', `supportedLocales must contain exactly ${SUPPORTED_LOCALES.join(', ')}`);
  }

  const schedule = data.schedule;
  const items = schedule?.items;
  if (!Array.isArray(items) || items.length > 12) {
    fail('items', 'schedule.items must be an array with at most 12 entries');
  }
  const sourceTime = typeof schedule?.sourceUpdatedAt === 'string' ? Date.parse(schedule.sourceUpdatedAt) : NaN;
  if (!Number.isFinite(sourceTime)) {
    fail('source-date', 'schedule.sourceUpdatedAt must be a valid date');
  }
  const maxAgeHours = schedule?.maxAgeHours;
  const validMaxAge = Number.isFinite(maxAgeHours) && maxAgeHours > 0;
  if (!validMaxAge) {
    fail('max-age', 'schedule.maxAgeHours must be a positive finite number');
  }

  if (Number.isFinite(sourceTime)) {
    // The published stale flag describes build time, not the current source age.
    const ageMs = now - sourceTime;
    const sourceDate = new Date(sourceTime).toISOString();
    if (ageMs < -FUTURE_TOLERANCE_MS) {
      fail('future-date', `source date ${sourceDate} is more than 5 min in the future`);
    }
    if (validMaxAge && ageMs / HOUR_MS > maxAgeHours) {
      fail('freshness', `source last updated ${sourceDate} (${(ageMs / HOUR_MS).toFixed(2)} h ago, limit ${maxAgeHours} h)`);
    }
  }

  if (!result.failures.length) {
    result.notes.push(`net: bootstrap schema 1, ${items.length} items, source ${new Date(sourceTime).toISOString()}`);
  }
  return result;
}
