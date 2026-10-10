import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { documentPath,decodeDocument } from '../assets/js/document-data.js';

const base=new URL(process.env.PREVIEW_URL);
if(base.protocol!=='https:'||base.search||base.hash||!base.pathname.endsWith('/'))throw new Error('Invalid preview URL');
const documents=JSON.parse(await readFile(new URL('../content/source-documents.json',import.meta.url),'utf8'));
const get=path=>fetch(new URL(path.replace(/^\//,''),base),{redirect:'manual',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});

async function verify(){
  for(const document of documents){
    const retired=await get(document.local);
    if(retired.status!==404)throw new Error(`Retired URL still responds ${retired.status}: ${document.local}`);
    await retired.arrayBuffer();
    for(const lang of ['ru','lt','en']){
      const path=documentPath(document,lang);
      const response=await get(path);
      if(response.status!==200||!response.headers.get('content-type')?.includes('text/html'))throw new Error(`Missing download page: ${path}`);
      const html=await response.text();
      if(!html.includes('name="robots" content="noindex,nofollow"'))throw new Error(`Missing noindex: ${path}`);
      const payload=html.match(/<template data-document-payload([^>]*)>([A-Za-z0-9+/=]+)<\/template>/);
      if(!payload)throw new Error(`Missing document: ${path}`);
      const metadata=Object.fromEntries([...payload[1].matchAll(/ data-([a-z0-9]+)="([^"]+)"/g)].map(m=>[m[1],m[2]]));
      if(metadata.sha256!==document.sha256)throw new Error(`Wrong original: ${path}`);
      await decodeDocument({...metadata,base64:payload[2]});
    }
  }
}

// Pages may take a short time to expose the newly deployed artifact at every edge.
for(let attempt=1;attempt<=6;attempt++){
  try{
    await verify();
    console.log('Verified 4 retired URLs (HTTP 404), 12 noindex HTML downloads and all original SHA-256 checksums.');
    break;
  }catch(error){
    if(attempt===6)throw error;
    console.log(`Waiting for Pages publication (${attempt}/6): ${error.message}`);
    await delay(10000);
  }
}
