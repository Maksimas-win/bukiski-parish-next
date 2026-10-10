import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir,stat } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { escapeHTML } from '../assets/js/domain.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=resolve(root,'dist');
const read=p=>readFile(resolve(root,p),'utf8');
const info=JSON.parse(await read('dist/build-info.json'));
const base=info.basePath;
const htmlFiles=(await readdir(dist,{recursive:true})).filter(p=>p.endsWith('.html'));
const pages=await Promise.all(htmlFiles.map(async file=>({file,html:await readFile(resolve(dist,file),'utf8')})));
const fileFor=path=>resolve(dist,'.'+(path.endsWith('/')?path+'index.html':/\.\w+$/.test(path)?path:path+'/index.html'));

test('Every generated page has one H1, a language, metadata, canonical, and no inline executable code',()=>{
  assert.ok(pages.length>300);
  for(const {file,html} of pages){
    assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,file);
    for(const pattern of [/<html lang="[a-z]{2}"/,/<title>[^<]+<\/title>/,/<meta name="description" content="[^"]+"/,/<link rel="canonical" href="https:\/\//,/<meta property="og:title"/,/<main id="main"/])assert.match(html,pattern,file);
    assert.doesNotMatch(html,/<(?:iframe|style)(?:\s|>)|\s(?:style|on\w+)\s*=|javascript:|unsafe-inline/i,file);
    for(const script of html.matchAll(/<script\b([^>]*)>/g))assert.match(script[1],/\bsrc="/,file);
    assert.doesNotMatch(html,/\{\{\w+\}\}|PHOTO_ALT|href="undefined"|src="undefined"/,file);
    if(!info.production)assert.match(html,/name="robots" content="noindex,follow"/,file);
  }
});
test('All generated internal links and assets resolve, including the GitHub project prefix',async()=>{
  const checked=new Set();
  for(const {file,html} of pages)for(const attr of html.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const link=attr[1];if(!link.startsWith('/'))continue;
    assert.ok(!base||link.startsWith(base+'/'),`${file}: missing base prefix ${link}`);
    const path=link.slice(base.length).split('#')[0].split('?')[0];
    if(checked.has(path))continue;checked.add(path);
    assert.ok((await stat(fileFor(path))).isFile(),`${file}: broken ${link}`);
  }
});
test('Each source URL has a target and every preserved text block survives HTML escaping',async()=>{
  const sources=JSON.parse(await read('content/source-pages.json'));
  const migration=JSON.parse(await read('content/migration.json'));
  assert.equal(migration.length,sources.length);
  assert.equal(new Set(migration.map(x=>x.source)).size,sources.length);
  for(const source of sources){
    const record=migration.find(r=>r.source===source.url);
    assert.ok(record,source.url);
    assert.ok((await stat(fileFor(record.target))).isFile());
    const archive=await readFile(fileFor(record.archive),'utf8');
    for(const block of source.blocks)assert.ok(archive.includes(escapeHTML(block.text)),`Missing text in ${source.url}`);
  }
});
test('Recovered originals retain their bytes and replace every document reference',async()=>{
  const documents=JSON.parse(await read('content/source-documents.json'));
  const migration=JSON.parse(await read('content/migration.json'));
  assert.equal(documents.length,4);
  for(const document of documents){
    assert.match(document.local,/^assets\/documents\/[a-z0-9-]+\.(pdf|doc)$/);
    const original=await readFile(resolve(root,document.local));
    const published=await readFile(resolve(dist,document.local));
    assert.equal(original.length,document.bytes);
    assert.deepEqual(published,original);
    assert.equal(createHash('sha256').update(original).digest('hex'),document.sha256);
    const signature=document.local.endsWith('.pdf')?'255044462d':'d0cf11e0a1b11ae1';
    assert.equal(original.subarray(0,signature.length/2).toString('hex'),signature);
    for(const ref of document.links){
      const record=migration.find(r=>r.source===ref.from);
      assert.ok(record,ref.from);
      const legacyPath=new URL(ref.from).pathname;
      for(const path of [record.target,record.archive,legacyPath]){
        const html=await readFile(fileFor(path),'utf8');
        assert.ok(html.includes(`href="${base}/${document.local}" download rel="nofollow"`),path);
        assert.ok(!html.includes(`href="${escapeHTML(document.source)}"`),path);
      }
    }
  }
});

test('RU/LT/EN core keys and hreflang equivalents are complete',async()=>{
  const locales=JSON.parse(await read('content/locales.json'));
  const keys=Object.keys(locales.ru).sort();
  for(const lang of ['ru','lt','en']){
    assert.deepEqual(Object.keys(locales[lang]).sort(),keys);
    for(const value of Object.values(locales[lang]))assert.ok(value && (!Array.isArray(value)||value.length));
    const html=await readFile(fileFor(`/${lang}/contacts.html`),'utf8');
    for(const target of ['ru','lt','en'])assert.match(html,new RegExp(`hreflang="${target}" href="https:[^"]+/${target}/contacts\\.html"`));
  }
});
test('ICS uses UTC instants and valid byte-folded lines for all three languages',async()=>{
  for(const lang of ['ru','lt','en']){
    const text=await read(`dist/assets/schedule-${lang}.ics`);
    assert.match(text,/BEGIN:VCALENDAR\r\nVERSION:2.0/);
    assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,info.confirmedServices);
    for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75,'ICS line exceeds 75 octets');
    for(const match of text.matchAll(/DTSTART:([^\r]+)/g))assert.match(match[1],/^\d{8}T\d{6}Z$/);
  }
});
test('The downloaded contact opens this site including the project path',async()=>{
  const vcard=await read('dist/assets/parish.vcf');
  const href=vcard.match(/^URL:(.+)$/m)[1].trim();
  const home=await read('dist/ru/index.html');
  const canonical=home.match(/rel="canonical" href="([^"]+)"/)[1];
  assert.equal(href,canonical.replace(/ru\/$/,''));
});
test('Runtime assets do not contain analytics, remote fetches, or stored prayer names',async()=>{
  const js=await read('assets/js/app.js');
  assert.doesNotMatch(js,/innerHTML|document\.write|gtag\(|googletagmanager|facebook\.net|eval\(/);
  assert.match(js,/form\.addEventListener\('submit',event=>event\.preventDefault\(\)\)/);
  assert.match(js,/window\.addEventListener\('pagehide',erase\)/);
  assert.equal((js.match(/localStorage\.setItem/g)||[]).length,1);
});
test('Redirect targets are internal existing pages and have no loops',async()=>{
  const rules=(await read('dist/_redirects')).trim().split('\n');
  for(const line of rules){
    const [from,to,status]=line.split(' ');assert.notEqual(from,to);assert.equal(status,'301');
    assert.ok((await stat(fileFor(to.slice(base.length)))).isFile());
    assert.ok(!rules.some(r=>r.startsWith(to+' ')),`Redirect chain for ${from}`);
  }
});
test('Normal-size text colour tokens meet 4.5:1 against their backgrounds',async()=>{
  const css=await read('assets/css/site.css');
  const color=token=>css.match(new RegExp(`--${token}:(#[a-f0-9]{6})`))[1].slice(1);
  const luminance=hex=>{
    const channels=hex.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
    return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
  };
  for(const [foreground,background] of [['ink','paper'],['muted','paper'],['gold','paper'],['gold','soft'],['white','wine']]){
    const a=luminance(color(foreground)),b=luminance(color(background));
    assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${foreground} on ${background}`);
  }
});
