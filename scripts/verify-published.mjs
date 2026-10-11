// After a GitHub Pages deployment, checks over HTTP that documents are reachable
// only through noindex download pages and that their bytes are the originals.
//
//   PREVIEW_URL=https://maksimas-win.github.io/bukiski-parish-next/ node scripts/verify-published.mjs

import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { documentPath, decodeDocument } from '../assets/js/document-data.js';

const ATTEMPTS = 6;
const LANGUAGES = ['ru', 'lt', 'en', 'pl', 'de', 'uk'];

const base = new URL(process.env.PREVIEW_URL);
if (base.protocol !== 'https:' || base.search || base.hash || !base.pathname.endsWith('/')) throw new Error('Invalid preview URL');
const documents = JSON.parse(await readFile(new URL('../content/source-documents.json', import.meta.url), 'utf8'));

const get = path => fetch(new URL(path.replace(/^\//, ''), base), {
  redirect: 'manual',
  headers: { 'Cache-Control': 'no-cache' },
  signal: AbortSignal.timeout(20000)
});

async function verify() {
  for (const document of documents) {
    const retired = await get(document.local);
    if (retired.status !== 404) throw new Error(`Retired URL still responds ${retired.status}: ${document.local}`);
    await retired.arrayBuffer();

    for (const lang of LANGUAGES) {
      const path = documentPath(document, lang);
      const response = await get(path);
      if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) throw new Error(`Missing download page: ${path}`);
      const html = await response.text();
      if (!html.includes('name="robots" content="noindex,nofollow"')) throw new Error(`Missing noindex: ${path}`);
      const payload = html.match(/<template data-document-payload([^>]*)>([A-Za-z0-9+/=]+)<\/template>/);
      if (!payload) throw new Error(`Missing document: ${path}`);
      const metadata = Object.fromEntries([...payload[1].matchAll(/ data-([a-z0-9]+)="([^"]+)"/g)].map(match => [match[1], match[2]]));
      if (metadata.sha256 !== document.sha256) throw new Error(`Wrong original: ${path}`);
      await decodeDocument({ ...metadata, base64: payload[2] });
    }
  }
}

// Pages may take a short time to expose a new deployment at every edge.
for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    await verify();
    console.log(`Verified ${documents.length} retired URLs (HTTP 404), ${documents.length * LANGUAGES.length} noindex download pages and all original SHA-256 checksums.`);
    break;
  } catch (error) {
    if (attempt === ATTEMPTS) throw error;
    console.log(`Waiting for Pages publication (${attempt}/${ATTEMPTS}): ${error.message}`);
    await delay(10000);
  }
}
