// Replaces content/original-services.json with a newer snapshot of the parish feed.
//
//   SCHEDULE_SOURCE_URL=https://… npm run schedule:sync      from the approved feed
//   node scripts/sync-schedule.mjs /path/to/reviewed.json    from a reviewed local file
//
// The source must be named explicitly: after the domain switch this site will
// publish its own copy of the feed, and reading that copy back would make an
// old snapshot look fresh. A failed download or validation leaves the current
// file untouched.

import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSchedule, safeExternalURL } from '../assets/js/domain.js';

const MAX_BYTES = 2_000_000;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'content/original-services.json');
const sourceURL = process.env.SCHEDULE_SOURCE_URL;
const localFile = process.argv[2];

async function readSource() {
  if (localFile) return readFile(resolve(localFile), 'utf8');
  if (!sourceURL) throw new Error('Set SCHEDULE_SOURCE_URL to the approved parish JSON feed, or pass a local reviewed JSON file.');
  if (!safeExternalURL(sourceURL)) throw new Error('An HTTPS feed without credentials is required');
  const response = await fetch(sourceURL, { redirect: 'error', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Feed failed with HTTP ${response.status}; existing schedule retained`);
  return response.text();
}

const raw = await readSource();
if (Buffer.byteLength(raw) > MAX_BYTES) throw new Error('Schedule exceeds the 2 MB limit');
const data = JSON.parse(raw);
// Throws on anything the site could not show safely; nothing is written in that case.
const normalized = normalizeSchedule(data);

const current = JSON.parse(await readFile(target, 'utf8'));
if (Date.parse(data.generatedAt) < Date.parse(current.generatedAt)) throw new Error('Refusing an older schedule');

// The upstream success timestamp is kept as is: downloading an old snapshot does not make it current.
const pending = resolve(root, 'content/schedule.pending.json');
await writeFile(pending, `${JSON.stringify(data, null, 2)}\n`);
await rename(pending, target);
console.log(`Imported ${normalized.events.length} parish-calendar events. Source updated ${normalized.sourceUpdatedAt}.`);
