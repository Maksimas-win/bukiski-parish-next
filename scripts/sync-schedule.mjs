import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSchedule, safeExternalURL } from '../assets/js/domain.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// Explicit input prevents accidentally treating the new site's own snapshot as a fresh upstream feed.
const sourceURL=process.env.SCHEDULE_SOURCE_URL;
const localFile=process.argv[2];
if(!sourceURL&&!localFile)throw new Error('Set SCHEDULE_SOURCE_URL to the approved parish JSON feed, or pass a local reviewed JSON file.');
let raw;
if(localFile){raw=await readFile(resolve(localFile),'utf8');}
else{
  if(!safeExternalURL(sourceURL))throw new Error('An HTTPS feed without credentials is required');
  const response=await fetch(sourceURL,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Feed failed with HTTP ${response.status}; existing schedule retained`);
  raw=await response.text();
}
if(Buffer.byteLength(raw)>2_000_000)throw new Error('Schedule exceeds the 2 MB limit');
const data=JSON.parse(raw);
const normalized=normalizeSchedule(data);
const old=JSON.parse(await readFile(resolve(root,'content/original-services.json'),'utf8'));
if(Date.parse(data.generatedAt)<Date.parse(old.generatedAt))throw new Error('Refusing an older schedule');
// Keep the upstream success timestamp. Downloading an old snapshot does not make it current.
const tmp=resolve(root,'content/schedule.pending.json');
await writeFile(tmp,JSON.stringify(data,null,2)+'\n');
await rename(tmp,resolve(root,'content/original-services.json'));
console.log(`Imported ${normalized.events.length} parish-calendar events. Source updated ${normalized.sourceUpdatedAt}. Review the diff before deployment.`);
