import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const settings = await readJSON('content/settings.json');
const locales = await readJSON('content/locales.json');
const bootstrapPath = resolve(root, 'dist/api/v1/bootstrap.json');
const bootstrap = await readJSON('dist/api/v1/bootstrap.json');
const sorted = values => [...values].sort();
const assertKeys = (value, keys, label) => assert.deepEqual(sorted(Object.keys(value)), sorted(keys), label);
const localeKeys = value => assertKeys(value, settings.locales, 'localized object must contain exactly the supported locales');
const forbidden = [
  settings.notes?.endpoint,
  settings.calendarId,
  settings.iban,
  'integrations/telegram/website.php',
  'formspree.io'
].filter(Boolean);

test('the application bootstrap is a small, versioned public contract', async () => {
  assertKeys(bootstrap, ['schemaVersion', 'siteUrl', 'timezone', 'supportedLocales', 'parish', 'routes', 'schedule']);
  assert.equal(bootstrap.schemaVersion, 1);
  assert.equal(bootstrap.siteUrl, settings.origin);
  assert.equal(bootstrap.timezone, settings.timezone);
  assert.deepEqual(bootstrap.supportedLocales, settings.locales);
  assert.ok((await stat(bootstrapPath)).size <= 100 * 1024);

  const serialized = JSON.stringify(bootstrap);
  for (const value of forbidden) assert.ok(!serialized.includes(value), `private operational value leaked: ${value}`);
  assert.doesNotMatch(serialized, /<[^>]*>/, 'the data contract must not contain HTML');
});

test('the bootstrap exposes reviewed parish details and real generated routes', async () => {
  assertKeys(bootstrap.parish, ['name', 'address', 'phone', 'coordinates', 'rector']);
  assertKeys(bootstrap.parish.phone, ['display', 'href']);
  assertKeys(bootstrap.parish.coordinates, ['latitude', 'longitude']);
  assertKeys(bootstrap.parish.rector, ['name']);
  localeKeys(bootstrap.parish.name);
  localeKeys(bootstrap.parish.rector.name);
  localeKeys(bootstrap.routes);
  assert.equal(bootstrap.parish.address, settings.address);
  assert.deepEqual(bootstrap.parish.phone, { display: settings.phoneDisplay, href: `tel:${settings.phone}` });
  assert.deepEqual(bootstrap.parish.coordinates, { latitude: settings.latitude, longitude: settings.longitude });
  assert.deepEqual(bootstrap.parish.rector.name, settings.rector.name);

  for (const lang of settings.locales) {
    assertKeys(bootstrap.routes[lang], ['home', 'schedule', 'notes', 'contacts']);
    assert.equal(bootstrap.parish.name[lang], locales[lang].name);
    for (const [page, suffix] of Object.entries({ home: '/', schedule: '/schedule.html', notes: '/notes.html', contacts: '/contacts.html' })) {
      const url = new URL(bootstrap.routes[lang][page]);
      assert.equal(url.origin, settings.origin);
      assert.equal(url.pathname, `/${lang}${suffix}`);
      const output = suffix === '/' ? `dist/${lang}/index.html` : `dist/${lang}${suffix}`;
      assert.ok((await stat(resolve(root, output))).isFile(), `${lang}.${page} does not resolve to a built page`);
    }
  }
});

test('the bootstrap contains only the next twelve confirmed services', async () => {
  const build = await readJSON('dist/build-info.json');
  const schedule = await readJSON('dist/data/assistant-services.json');
  const items = bootstrap.schedule.items;
  assertKeys(bootstrap.schedule, ['sourceUpdatedAt', 'maxAgeHours', 'stale', 'items']);
  assert.equal(bootstrap.schedule.sourceUpdatedAt, schedule.sourceUpdatedAt);
  assert.equal(bootstrap.schedule.maxAgeHours, settings.scheduleMaxAgeHours);
  assert.ok(Number.isFinite(Date.parse(bootstrap.schedule.sourceUpdatedAt)), 'sourceUpdatedAt must be an ISO instant');
  const sourceAge = Date.parse(build.generatedAt) - Date.parse(bootstrap.schedule.sourceUpdatedAt);
  const expectedStale = sourceAge > settings.scheduleMaxAgeHours * 3600000 || sourceAge < -300000;
  assert.equal(bootstrap.schedule.stale, expectedStale);
  assert.ok(items.length <= 12);

  const starts = items.map(item => Date.parse(item.start));
  assert.ok(starts.every(Number.isFinite));
  assert.ok(starts.every(start => start >= Date.parse(build.generatedAt)), 'past services must not be published');
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b));

  const confirmed = new Map(schedule.events.map(event => [event.id, event]));
  for (const item of items) {
    const source = confirmed.get(item.id);
    assert.ok(source, `unknown service ${item.id}`);
    assert.equal(item.start, source.start);
    assert.equal(item.type, 'service');
    assertKeys(item, ['detailsUrl', 'id', 'start', 'title', 'type', item.summary && 'summary', item.note && 'note'].filter(Boolean));
    localeKeys(item.title);
    localeKeys(item.detailsUrl);
    if (item.summary) localeKeys(item.summary);
    if (item.note) localeKeys(item.note);
    for (const lang of settings.locales) {
      assert.equal(item.title[lang], source.title[lang]);
      assert.equal(item.detailsUrl[lang], `${settings.origin}/${lang}/schedule.html`);
      if (item.summary) assert.equal(item.summary[lang], source.subtitle[lang] || '');
      if (item.note) assert.equal(item.note[lang], source.note[lang] || '');
    }
  }

  const publishedWithNote = items.find(item => confirmed.get(item.id)?.note);
  if (publishedWithNote) {
    assert.deepEqual(publishedWithNote.note, confirmed.get(publishedWithNote.id).note, 'confirmed service notes must survive the public contract');
  }
});
