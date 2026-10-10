import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { escapeHTML as e, normalizeSchedule, upcomingEvents, isStale, safeExternalURL } from '../assets/js/domain.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const DIST=resolve(ROOT,'dist');
if (relative(ROOT,DIST)!=='dist') throw new Error('Unsafe output path');
const json=async name=>JSON.parse(await readFile(resolve(ROOT,'content',name),'utf8'));
const [settings,locales,pages,assets,documents,sourceLinks,rawSchedule,template]=await Promise.all([
  json('settings.json'),json('locales.json'),json('source-pages.json'),json('source-assets.json'),json('source-documents.json'),json('source-links.json'),json('original-services.json'),readFile(resolve(ROOT,'index.html'),'utf8')
]);
const origin=process.env.SITE_ORIGIN || settings.origin;
if (!safeExternalURL(origin) || new URL(origin).pathname!=='/') throw new Error('SITE_ORIGIN must be an HTTPS origin');
const base=(process.env.BASE_PATH ?? settings.basePath).replace(/\/$/,'');
if (base && !/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(base)) throw new Error('Invalid BASE_PATH');
const production=process.env.PRODUCTION===undefined ? settings.production===true : process.env.PRODUCTION==='true';
if(production){
  const release=await json('release.json');
  const pending=Object.entries(release).filter(([,approved])=>approved!==true).map(([key])=>key);
  if(pending.length)throw new Error(`Production review is incomplete: ${pending.join(', ')}`);
}
const buildTime=process.env.BUILD_TIME ? Date.parse(process.env.BUILD_TIME) : Date.now();
if (!Number.isFinite(buildTime)) throw new Error('Invalid BUILD_TIME');
const schedule=normalizeSchedule(rawSchedule);
const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests";
const core=['home','schedule','history','sacraments','news','contacts','library','notes','support','privacy'];
const route=(lang,page)=>`/${lang}/${page==='home'?'':page+'.html'}`;
const url=path=>base+path;
const canonical=path=>origin+base+path;
const link=(path,label,cls='')=>`<a${cls?` class="${cls}"`:''} href="${e(url(path))}">${label}</a>`;
const ext=(href,label,cls='')=>safeExternalURL(href)?`<a href="${e(href)}" rel="noopener noreferrer"${cls?` class="${cls}"`:''}>${e(label)} <span aria-hidden="true">↗</span></a>`:'';
const phone=(t,cls='button')=>`<a class="${cls}" href="tel:${settings.phone}">${e(t.call)} <span>${e(settings.phoneDisplay)}</span></a>`;
const calendarLink=lang=>{const target=new URL(settings.calendarUrl);target.searchParams.set('hl',lang);return target.href;};
const image=(cls='church-image',loading='lazy')=>`<img class="${cls}" src="${url('/assets/img/church-1280.webp')}" srcset="${url('/assets/img/church-640.webp')} 640w, ${url('/assets/img/church-1280.webp')} 1280w, ${url('/assets/img/church-1920.webp')} 1920w" sizes="(max-width: 760px) 100vw, 65vw" width="1280" height="720" loading="${loading}" ${loading==='eager'?'fetchpriority="high"':''} decoding="async" alt="PHOTO_ALT">`;
const sha=value=>createHash('sha256').update(value).digest('hex').slice(0,16);
const shortTitle=p=>p.url.endsWith('/dokumet-ob-uchastii-vernyh-v-evharistii')?'Об участии верных в Евхаристии':p.title.split(' | ')[0].trim();
const oldMain={
  '/':'home','/raspisanie-bogosluzhenij':'schedule','/kontaktai-hram-rozhdestva-hristova':'contacts',
  '/o-nashem-hrame':'history','/istoriya-o-hrame':'history','/podat-zapisku':'notes',
  '/poleznoe-chtenie':'library','/naudingas-skaitymas':'library','/useful-reading':'library'
};
const netLang=p=>['ru','lt','en'].includes(p.language)?p.language:'ru';
const sourceTarget=p=>{
  const source=new URL(p.url);
  if(source.hostname==='bukiski-hram.org') return source.pathname==='/'?'/ru/':source.pathname;
  if(oldMain[source.pathname])return route(netLang(p),oldMain[source.pathname]);
  return `/${netLang(p)}/library${source.pathname}.html`;
};
const originals=new Map(pages.map(p=>[p.url,`/archive/${sha(p.url)}.html`]));
const corePaths=new Set(settings.locales.flatMap(l=>core.map(p=>route(l,p))));
const records=pages.filter(p=>!corePaths.has(sourceTarget(p)) && new URL(p.url).pathname!=='/');
const navigation=(l,t,current)=>['home','schedule','history','sacraments','library','contacts'].map(p=>`<a href="${url(route(l,p))}"${current===p?' aria-current="page"':''}>${e(t[p])}</a>`).join('');
const allRoutes=new Map();
const redirects=[];
const inventory=[];

function frame({lang='ru',uiLocale=lang,page='article',title,description,body,path,canonicalPath=path,alternates=[],noindex=false,article=false}) {
  const t=locales[uiLocale] || locales.en;
  const l=locales[uiLocale]?uiLocale:'en';
  const languageTargets=alternates.length ? alternates : settings.locales.map(code=>({lang:code,path:route(code,'library')}));
  const header=`<header class="site-header" lang="${l}"><div class="utility"><div class="wrap utility-inner"><span>${e(t.denomination)} · ${e(t.place)}</span><div class="utility-actions"><button class="reading-button" type="button" data-access-open hidden aria-label="${e(t.access)}" aria-haspopup="dialog">Aa <span>${e(t.access)}</span></button><nav aria-label="${e(t.languages)}" class="languages">${languageTargets.map(a=>`<a href="${url(a.path)}" lang="${a.lang}" hreflang="${a.lang}"${a.lang===lang?' aria-current="true"':''}>${a.lang.toUpperCase()}</a>`).join('')}</nav></div></div></div><div class="wrap main-header">${link(route(l,'home'),`<img src="${url('/assets/img/cross.svg')}" alt="" width="33" height="44"><span>${e(t.name)}<small>${e(t.place)}</small></span>`,'brand')}<button type="button" class="menu-toggle" data-menu-toggle hidden aria-expanded="false" aria-controls="main-navigation">${e(t.menu)} <span aria-hidden="true">☰</span></button><nav id="main-navigation" class="main-nav" aria-label="${e(t.menu)}">${navigation(l,t,page)}</nav></div></header>`;
  const footer=`<footer class="site-footer" lang="${l}"><div class="wrap footer-grid"><div><p class="eyebrow">${e(t.place)}</p><h2>${e(t.name)}</h2><p>${e(t.footerLine)}</p></div><div><h3>${e(t.contacts)}</h3><a href="tel:${settings.phone}">${settings.phoneDisplay}</a><p>${e(settings.address)}</p>${link(route(l,'contacts'),e(t.directions)+' ↗')}</div><nav aria-label="${e(t.menu)}">${['schedule','notes','support','news','privacy'].map(p=>link(route(l,p),e(t[p]))).join('')}</nav></div><div class="wrap footer-bottom"><small>© ${new Date(buildTime).getUTCFullYear()} ${e(settings.legalName)}. ${e(t.rights)}</small>${link(route(l,'library'),e(t.library))}</div></footer>`;
  const accessibility=`<dialog lang="${l}" id="reading-dialog" aria-labelledby="reading-title"><div class="dialog-heading"><h2 id="reading-title">${e(t.access)}</h2><button type="button" data-access-close aria-label="${e(t.close)}">×</button></div><label class="setting"><input type="checkbox" data-large-text> ${e(t.large)}</label><label class="setting"><input type="checkbox" data-high-contrast> ${e(t.contrast)}</label><button type="button" class="button" data-reset-settings>${e(t.reset)}</button></dialog>`;
  const vars={lang,uiLocale:l,page,title:e(title===t.name?`${t.name} · ${t.place}`:`${title} | ${t.name}`),siteName:e(t.name),description:e(description || title),csp:e(csp),robots:production&&!noindex?'index,follow':'noindex,follow',canonical:e(canonical(canonicalPath)),base,ogType:article?'article':'website',ogLocale:{ru:'ru_RU',lt:'lt_LT',en:'en_GB',pl:'pl_PL',de:'de_DE',uk:'uk_UA'}[lang]||'en_GB',ogImage:e(canonical('/assets/img/church-1280.webp')),photoAlt:e(t.photo),skip:e(t.skip),alternates:alternates.map(a=>`<link rel="alternate" hreflang="${a.lang}" href="${e(canonical(a.path))}">`).join('\n  ')+(alternates.length?`\n  <link rel="alternate" hreflang="x-default" href="${e(canonical(alternates[0].path))}">`:''),header,footer,accessibility,body:body.replaceAll('PHOTO_ALT',e(t.photo))};
  const html=template.replace(/\{\{(\w+)\}\}/g,(_,key)=>vars[key]??'');
  if(allRoutes.has(path))throw new Error(`Route collision: ${path}`);
  allRoutes.set(path,{html,noindex,canonicalPath,lang});
}
function titleBlock(t,title,intro,tag=t.denomination) {return `<header class="page-heading wrap"><p class="eyebrow">${e(tag)}</p><h1>${e(title)}</h1>${intro?`<p class="lead">${e(intro)}</p>`:''}</header>`;}
function rows(t,events) {
  return events.map(ev=>{
    const locale=t===locales.ru?'ru':t===locales.lt?'lt':'en';
    const date=new Intl.DateTimeFormat(locale,{timeZone:settings.timezone,day:'numeric',month:'long',year:'numeric',weekday:'short'}).format(new Date(ev.start));
    return `<li class="service-row"><time datetime="${e(ev.start)}"><span>${e(date)}</span><strong>${e(ev.startTime)}</strong></time><div><h3>${e(ev.title[locale])}</h3><p>${e(ev.subtitle[locale]||'')}</p></div></li>`;
  }).join('');
}
function scheduleSection(t,l,limit=3) {
  const events=upcomingEvents(schedule,buildTime).slice(0,limit);
  return `<div data-schedule data-limit="${limit}"><p class="eyebrow">${e(t.timeZone)}</p><ol class="service-list" data-service-list>${rows(t,events)}</ol><p data-empty-schedule${events.length?' hidden':''}>${e(t.empty)}</p><p class="schedule-status" data-schedule-status>${e(t.fromCalendar)} · ${e(t.updated)} <time datetime="${schedule.sourceUpdatedAt}">${new Intl.DateTimeFormat(l,{timeZone:settings.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(schedule.sourceUpdatedAt))}</time></p><p class="notice" data-stale${isStale(schedule,buildTime)?'':' hidden'}>${e(t.stale)}</p><noscript><p class="notice">${e(t.stale)}</p></noscript></div>`;
}
function home(t,l) {
  return `<section class="hero wrap"><div class="hero-copy"><p class="eyebrow"><span class="small-rule"></span>${e(t.denomination)} · Bukiškis</p><h1>${t.hero.split('\n').map(e).join('<br>')}</h1><p class="lead">${e(t.heroIntro)}</p><div class="actions">${link(route(l,'schedule'),e(t.allServices)+' <span aria-hidden="true">↗</span>','button')}${link(route(l,'contacts'),e(t.directions),'text-link')}</div><div class="hero-location"><span aria-hidden="true">⌖</span> Sodų g. 8 · Bukiškis · Vilniaus rajonas</div></div><figure class="hero-figure">${image('hero-image','eager')}<figcaption><span>${e(t.name)}</span><span>54.76091° N · 25.207621° E</span></figcaption></figure></section><section class="service-band"><div class="wrap service-grid"><div><p class="eyebrow">${e(t.fromCalendar)}</p><h2>${e(t.next)}</h2><p>${e(t.regular)}</p>${link(route(l,'schedule'),e(t.allServices)+' →','text-link')}</div>${scheduleSection(t,l)}</div></section><section class="wrap welcome"><div><p class="eyebrow">${e(t.place)}</p><h2>${e(t.welcome)}</h2><p class="lead">${e(t.welcomeIntro)}</p>${phone(t,'text-link phone-link')}</div><ol class="welcome-steps">${t.welcomeSteps.map((s,i)=>`<li><span aria-hidden="true">0${i+1}</span><p>${e(s)}</p></li>`).join('')}</ol></section><section class="wrap discover"><div class="section-heading"><div><p class="eyebrow">${e(t.discoverIntro)}</p><h2>${e(t.discover)}</h2></div>${link(route(l,'news'),e(t.news)+' →','text-link')}</div><div class="feature-grid">${[['history','historyTeaser','01'],['notes','notesTeaser','02'],['library','libraryTeaser','03']].map(([p,d,n])=>`<article class="feature"><span class="feature-number">${n}</span><h3>${link(route(l,p),e(t[p])+' <span aria-hidden="true">↗</span>')}</h3><p>${e(t[d])}</p></article>`).join('')}</div></section><section class="support-band"><div class="wrap"><div><p class="eyebrow">${e(t.denomination)}</p><h2>${e(t.support)}</h2></div>${link(route(l,'support'),e(t.support)+' ↗','button button-light')}</div></section>`;
}
function contacts(t,l){
  const map=`https://www.openstreetmap.org/?mlat=${settings.latitude}&mlon=${settings.longitude}#map=17/${settings.latitude}/${settings.longitude}`;
  const routeURL=`https://www.google.com/maps/dir/?api=1&destination=${settings.latitude}%2C${settings.longitude}`;
  return titleBlock(t,t.contacts,t.contactIntro)+`<section class="wrap contact-grid"><div class="contact-details" itemscope itemtype="https://schema.org/Church"><h2 itemprop="name">${e(t.name)}</h2><p class="eyebrow">${e(t.addressLabel)}</p><address itemprop="address">${e(settings.address)}</address><p><a class="contact-phone" itemprop="telephone" href="tel:${settings.phone}">${settings.phoneDisplay}</a></p><p>${link('/assets/parish.vcf',e(t.saveContact),'text-link')}</p><div class="actions">${ext(routeURL,t.route,'button')}${ext(map,t.map,'text-link')}</div><p class="small muted">${e(t.mapPrivacy)}</p><p class="small muted">${e(t.checked)}: ${settings.reviewedOn} · ${ext('https://bukiski-hram.org/ru/contacts.html',t.source)}</p></div><figure class="contact-photo">${image()}<figcaption>Sodų g. 8 · Bukiškis</figcaption></figure></section><section class="wrap two-columns section-space"><article><h2>${e(t.transport)}</h2><p>${e(t.transportIntro)}</p>${ext('https://judu.lt/', 'JUDU', 'text-link')} · ${ext('https://www.stops.lt/vilnius/','stops.lt','text-link')}</article><article><h2>${e(t.entryAccess)}</h2><p>${e(t.entryAccessText)}</p>${phone(t,'text-link')}</article></section>`;
}
function notes(t){return titleBlock(t,t.notes,t.noteIntro)+`<section class="wrap notes-layout"><form id="prayer-form" autocomplete="off"><p class="eyebrow">${e(t.noteLocal)}</p><fieldset><legend>${e(t.noteType)}</legend><label class="radio-label"><input type="radio" name="request-type" value="living" checked> ${e(t.living)}</label><label class="radio-label"><input type="radio" name="request-type" value="departed"> ${e(t.departed)}</label></fieldset><label for="prayer-names">${e(t.names)}</label><p id="names-hint" class="small muted">${e(t.namesHint)}</p><textarea id="prayer-names" rows="7" maxlength="1220" aria-describedby="names-hint note-status" spellcheck="false" autocomplete="off"></textarea><p id="note-status" role="status" aria-live="polite"></p><div class="actions"><button type="button" class="button" data-note-prepare hidden>${e(t.notePrepare)}</button><button type="button" class="button button-outline" data-note-clear hidden>${e(t.noteClear)}</button></div><p class="notice" data-note-unavailable>${e(t.noteNoJs)}</p></form><div class="note-result"><div class="note-preview" data-note-preview hidden><span class="note-cross" aria-hidden="true">☦</span><h2 data-note-heading></h2><ol data-note-names></ol><p>${e(t.name)}</p></div><div class="actions" data-note-actions hidden><button type="button" class="button" data-note-print>${e(t.notePrint)}</button><button type="button" class="button button-outline" data-note-download>${e(t.noteDownload)}</button></div><p class="small muted" hidden>${e(t.noteReady)}</p></div></section>`;}
function history(t,l){return titleBlock(t,t.historyHeading,t.historyIntro)+`<section class="wrap history-layout"><figure>${image()}<figcaption>${e(t.name)} · Bukiškis</figcaption></figure><ol class="timeline">${t.timeline.map(([year,title,text])=>`<li><span>${e(year)}</span><div><h2>${e(title)}</h2><p>${e(text)}</p></div></li>`).join('')}</ol></section><section class="wrap prose section-space"><p>${ext('https://orthodoxy.lt/source/laikrastis/rus_2025-01.pdf',t.historicalSource)}</p><p>${link(originals.get(`https://bukiski-hram.org/${l}/history.html`),e(t.archiveOriginal))}</p></section>`;}
function sacraments(t,l){return titleBlock(t,t.sacraments,t.sacramentsIntro)+`<section class="wrap two-columns sacrament-grid">${t.sacramentItems.map(([h,p],i)=>`<article><span class="feature-number">0${i+1}</span><h2>${e(h)}</h2><p>${e(p)}</p></article>`).join('')}</section><section class="wrap callout">${phone(t)}${link(route(l,'notes'),e(t.notes),'text-link')}</section>`;}
function support(t,l){return titleBlock(t,t.support,t.supportIntro)+`<section class="wrap two-columns section-space"><article class="bank-details"><dl><dt>${e(t.recipient)}</dt><dd>${e(settings.legalName)}</dd><dt>${e(t.bank)}</dt><dd class="iban">${e(settings.iban)}</dd><dt>${e(t.orgCode)}</dt><dd>${settings.organizationCode}</dd></dl><p class="small muted">${e(t.checked)}: ${settings.reviewedOn} · ${ext('https://bukiski-hram.org/',t.source)}</p></article><article><span class="display-number">1,2 %</span><h2>${e(t.gpm)}</h2><p>${e(t.gpmNote)}</p><p>${ext('https://www.vmi.lt/evmi/paramos-skyrimas','VMI','text-link')}</p>${link(`/${l}/gpm.html`,e(t.archiveOriginal),'text-link')}</article></section>`;}
function privacy(t){return titleBlock(t,t.privacy,t.privacyIntro)+`<section class="wrap prose section-space">${new URL(origin).hostname.endsWith('.github.io')?`<p>${e(t.githubHosting)} ${ext('https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',t.hostingPolicy)}</p>`:''}${t.privacyItems.map(([h,p])=>`<h2>${e(h)}</h2><p>${e(p)}</p>`).join('')}</section>`;}
const entryDescription=p=>(p.description || p.blocks.find(b=>b.tag==='p'&&b.text.length>100)?.text || '').slice(0,180);
function articleList(t,l,news=false){
  let list=records.filter(p=>!/^\/(pl)\/(?:contacts|schedule|history|sacraments|news)/.test(new URL(p.url).pathname));
  if(news)list=list.filter(p=>p.publishedAt).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,12);
  return titleBlock(t,news?t.news:t.library,news?t.newsIntro:t.libraryTeaser)+`<section class="wrap library section-space">${news?`<p>${link(originals.get(`https://bukiski-hram.org/${l}/news.html`),e(t.archiveOriginal))}</p>`:''}<div class="search-controls" data-search-controls hidden><div><label for="library-query">${e(t.search)}</label><input id="library-query" type="search" placeholder="${e(t.searchPlaceholder)}" maxlength="100"></div><div><label for="library-language">${e(t.languages)}</label><select id="library-language"><option value="all">${e(t.allLanguages)}</option>${[['ru','Русский'],['lt','Lietuvių'],['en','English'],['pl','Polski'],['de','Deutsch'],['uk','Українська']].map(([v,label])=>`<option value="${v}">${label}</option>`).join('')}</select></div></div><p data-search-status role="status" aria-live="polite">${e(t.results)}: ${list.length}</p><div class="article-grid">${list.map(p=>`<article class="article-card" data-library-item data-language="${e(p.language)}" data-search="${e(shortTitle(p)+' '+entryDescription(p))}"><span class="eyebrow">${e(p.language.toUpperCase())} · ${new URL(p.url).hostname}</span><h2 lang="${e(p.language)}">${link(sourceTarget(p),e(shortTitle(p)))}</h2><p lang="${e(p.language)}">${e(entryDescription(p))}</p>${p.publishedAt?`<time class="small muted" datetime="${e(p.publishedAt)}">${new Intl.DateTimeFormat(l,{dateStyle:'medium',timeZone:'Europe/Vilnius'}).format(new Date(p.publishedAt))}</time>`:''}<span class="read-link">${link(sourceTarget(p),e(t.read)+' ↗')}</span></article>`).join('')}</div><p data-no-results hidden>${e(t.noResults)}</p></section>`;
}
function articleBody(p,t){
  const uniqueImages=assets.filter(a=>p.images.includes(a.source)&&a.local&&a.pages.length<4).slice(0,8);
  const references=new Map();
  for(const ref of sourceLinks.filter(r=>r.from===p.url&&r.label)){
    const document=documents.find(d=>d.source===ref.to);
    const related=pages.find(page=>page.url===ref.to);
    if(document){
      const sourceLink=document.local?link('/'+document.local,e(ref.label)):ext(ref.to,ref.label);
      const unavailable=document.local?'':` <span class="small muted">${e(t.documentUnavailable)}</span>`;
      const alternative=!document.local&&/бланк.*записк|записк.*бланк/i.test(ref.label)?` ${link(route(t===locales.ru?'ru':t===locales.lt?'lt':'en','notes'),e(t.notes))}`:'';
      references.set(ref.to,sourceLink+unavailable+alternative);
    }
    else if(related&&!corePaths.has(sourceTarget(related))&&related.url!==p.url)references.set(ref.to,link(sourceTarget(related),e(ref.label)));
  }
  const referenceHTML=references.size?`<aside class="article-references"><h2>${e(t.source)}</h2><ul>${[...references.values()].map(value=>`<li>${value}</li>`).join('')}</ul></aside>`:'';
  const text=p.blocks.map(b=>{
    const tag=/^h[1-6]$/.test(b.tag)?'h2':b.tag==='blockquote'?'blockquote':'p';
    return `<${tag}>${e(b.text)}</${tag}>`;
  }).join('\n');
  // Source markup never enters the generated page. Only escaped text and locally preserved images do.
  return titleBlock(t,shortTitle(p),'',t.archiveOriginal)+`<article class="wrap prose article-body" lang="${e(p.language)}"><aside class="notice" lang="${t===locales.ru?'ru':t===locales.lt?'lt':'en'}">${e(t.archiveNotice)}<br>${ext(p.url,t.source)} · ${p.fetchedOn}</aside>${text}${referenceHTML}${uniqueImages.length?`<div class="archive-gallery">${uniqueImages.map(a=>`<figure><img src="${url('/'+a.local)}" width="900" height="600" loading="lazy" decoding="async" alt="${e(a.alt && !/bed linen|Image/i.test(a.alt)?a.alt:shortTitle(p))}"></figure>`).join('')}</div>`:''}<p class="source-footnote">${ext(p.url,t.source)}</p></article>`;
}

await rm(DIST,{recursive:true,force:true}); await mkdir(DIST,{recursive:true});
await cp(resolve(ROOT,'assets'),resolve(DIST,'assets'),{recursive:true});
await mkdir(resolve(DIST,'assets/data'),{recursive:true});
await writeFile(resolve(DIST,'assets/data/schedule.json'),JSON.stringify(schedule));
await writeFile(resolve(DIST,'assets/data/locales.json'),JSON.stringify(locales));
await mkdir(resolve(DIST,'data'),{recursive:true});
await writeFile(resolve(DIST,'data/services.json'),JSON.stringify(rawSchedule));
// Preserve publicly referenced image paths on the existing .org domain.
for(const asset of assets){
  const sourceURL=new URL(asset.source);
  if(sourceURL.hostname!=='bukiski-hram.org'||!asset.local||!sourceURL.pathname.startsWith('/assets/'))continue;
  const destination=resolve(DIST,'.'+sourceURL.pathname);
  if(!destination.startsWith(DIST+sep))throw new Error('Unsafe legacy asset path');
  await mkdir(dirname(destination),{recursive:true});await cp(resolve(ROOT,asset.local),destination);
}

for (const l of settings.locales) for(const page of core){
  const t=locales[l];
  const bodies={home:()=>home(t,l),schedule:()=>titleBlock(t,t.allServices,t.regular)+`<section class="wrap schedule-page">${scheduleSection(t,l,90)}<div class="actions">${ext(calendarLink(l),t.calendar,'button')}${link(`/assets/schedule-${l}.ics`,e(t.calendarDownload),'text-link')}</div><p class="small muted">${e(t.calendarNote)}</p>${phone(t,'text-link phone-link')}</section>`,contacts:()=>contacts(t,l),notes:()=>notes(t),history:()=>history(t,l),sacraments:()=>sacraments(t,l),support:()=>support(t,l),privacy:()=>privacy(t),library:()=>articleList(t,l),news:()=>articleList(t,l,true)};
  frame({lang:l,page,title:page==='home'?t.name:t[page],description:page==='home'?t.heroIntro:(t[page+'Intro']||t[page+'Teaser']||t[page]),body:bodies[page](),path:route(l,page),alternates:settings.locales.map(lang=>({lang,path:route(lang,page)}))});
}
// Root is a useful server-rendered RU home with a canonical language route, without JS redirection.
allRoutes.set('/',{...allRoutes.get('/ru/'),canonicalPath:'/ru/'});

for(const p of pages){
  const target=sourceTarget(p);const lang=p.language||'ru'; const uiLocale=locales[lang]?lang:'en';const t=locales[uiLocale];
  frame({lang,uiLocale,title:shortTitle(p),description:p.description||entryDescription(p),body:articleBody(p,t),path:originals.get(p.url),noindex:true,article:true});
  if(!allRoutes.has(target))frame({lang,uiLocale,title:shortTitle(p),description:p.description||entryDescription(p),body:articleBody(p,t),path:target,article:true,alternates:pages.filter(other=>new URL(other.url).hostname==='bukiski-hram.org'&&new URL(p.url).hostname==='bukiski-hram.org'&&new URL(other.url).pathname.split('/').at(-1)===new URL(p.url).pathname.split('/').at(-1)).map(other=>({lang:other.language,path:sourceTarget(other)}))});
  const old=new URL(p.url);
  inventory.push({source:p.url,status:p.status,language:lang,title:shortTitle(p),target,archive:originals.get(p.url),textCharacters:p.text.length,contentHash:sha(p.text),strategy:old.hostname.endsWith('.net')?'301-on-old-host':'preserve-path'});
  if(old.hostname==='bukiski-hram.net')redirects.push({from:old.pathname,to:target});
}
// Static hosts cannot emit HTTP redirects. Serve aliases with the correct canonical and full content.
// On Cloudflare/Apache, _redirects/.htaccess replace these aliases with HTTP 301 responses.
for(const r of redirects){
  if(r.from==='/'||allRoutes.has(r.from))continue;
  allRoutes.set(r.from,{...allRoutes.get(r.to),noindex:true,canonicalPath:r.to});
}
for(const [path,item] of allRoutes){
  const output=resolve(DIST,'.'+(path.endsWith('/')?path+'index.html':path.endsWith('.html')?path:path+'/index.html'));
  if(!output.startsWith(DIST+sep))throw new Error('Output escapes dist');
  await mkdir(dirname(output),{recursive:true});await writeFile(output,item.html);
}
const t=locales.ru;
frame({lang:'ru',title:'404 · '+t.notFound,description:t.notFoundText,body:titleBlock(t,t.notFound,t.notFoundText)+`<div class="wrap actions section-space">${link('/ru/',t.home,'button')}${link('/ru/library.html',t.library,'text-link')}</div>`,path:'/404.html',noindex:true});
await writeFile(resolve(DIST,'404.html'),allRoutes.get('/404.html').html);

const xmlEscape=e;
const indexed=[...allRoutes].filter(([p,r])=>!r.noindex&&p===r.canonicalPath);
await writeFile(resolve(DIST,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexed.map(([p])=>`<url><loc>${xmlEscape(canonical(p))}</loc></url>`).join('')}</urlset>`);
await writeFile(resolve(DIST,'robots.txt'),production?`User-agent: *\nAllow: /\nDisallow: ${base}/archive/\nSitemap: ${canonical('/sitemap.xml')}\n`:'User-agent: *\nDisallow: /\n');
await writeFile(resolve(DIST,'.nojekyll'),'');
const headers=`/*\n  Content-Security-Policy: ${csp}; frame-ancestors 'none'\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n\n${base}/assets/data/*\n  Cache-Control: no-cache, must-revalidate\n`;
await writeFile(resolve(DIST,'_headers'),headers);
await writeFile(resolve(DIST,'_redirects'),redirects.filter(r=>r.from!=='/').map(r=>`${base}${r.from} ${base}${r.to} 301\n${base}${r.from}/ ${base}${r.to} 301`).join('\n')+'\n');
await mkdir(resolve(ROOT,'deploy'),{recursive:true});
const apacheHeader=`<IfModule mod_headers.c>\nHeader always set Content-Security-Policy "${csp}; frame-ancestors 'none'"\nHeader always set X-Content-Type-Options "nosniff"\nHeader always set Referrer-Policy "strict-origin-when-cross-origin"\nHeader always set X-Frame-Options "DENY"\nHeader always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"\n</IfModule>\n`;
const apacheRedirects=redirects.filter(r=>r.from!=='/').map(r=>`RewriteRule ^${r.from.slice(1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/?$ ${base}${r.to} [R=301,L,NE]`).join('\n');
await writeFile(resolve(DIST,'.htaccess'),`${apacheHeader}\n<IfModule mod_rewrite.c>\nRewriteEngine On\n${apacheRedirects}\n</IfModule>\nErrorDocument 404 ${base}/404.html\n`);
await writeFile(resolve(ROOT,'deploy/old-domain.htaccess'),`# Install ONLY on bukiski-hram.net after review. New site must be live first.\nRewriteEngine On\n${redirects.map(r=>`RewriteRule ^${r.from==='/'?'':r.from.slice(1).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/?$ ${canonical(r.to)} [R=301,L,NE]`).join('\n')}\n# Unknown URLs deliberately keep their original 404 instead of redirecting to the home page.\n`);
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const fields=Object.keys(inventory[0]);
await writeFile(resolve(ROOT,'content/migration.csv'),'\uFEFF'+fields.join(',')+'\n'+inventory.map(x=>fields.map(k=>csvCell(x[k])).join(',')).join('\n'));
await writeFile(resolve(ROOT,'content/migration.json'),JSON.stringify(inventory,null,2));

function icsEscape(value){return value.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
function utc(value){return new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');}
function fold(line){let bytes=0,out='',part='';for(const ch of line){const n=Buffer.byteLength(ch);if(bytes+n>73){out+=part+'\r\n ';part='';bytes=1;}part+=ch;bytes+=n;}return out+part;}
for(const l of settings.locales){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Bukiski Parish//Service Schedule//'+l.toUpperCase(),'CALSCALE:GREGORIAN',...schedule.events.flatMap(ev=>['BEGIN:VEVENT',`UID:${ev.id}@bukiski-hram.org`,`DTSTAMP:${utc(schedule.sourceUpdatedAt)}`,`DTSTART:${utc(ev.start)}`,`SUMMARY:${icsEscape(ev.title[l])}`,`LOCATION:${icsEscape(settings.address)}`,`DESCRIPTION:${icsEscape(locales[l].calendarNote)}`,'END:VEVENT']),'END:VCALENDAR'];
  await writeFile(resolve(DIST,`assets/schedule-${l}.ics`),lines.map(fold).join('\r\n')+'\r\n');
}
await writeFile(resolve(DIST,'assets/parish.vcf'),`BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${settings.legalName}\r\nORG:${settings.legalName}\r\nTEL;TYPE=WORK,VOICE:${settings.phone}\r\nADR;TYPE=WORK:;;Sodų g. 8;Bukiškis;;LT-14180;Lietuva\r\nURL:${canonical('/')}\r\nEND:VCARD\r\n`);
await writeFile(resolve(DIST,'build-info.json'),JSON.stringify({generatedAt:new Date(buildTime).toISOString(),production,basePath:base,sourcePages:pages.length,generatedPages:allRoutes.size,confirmedServices:schedule.events.length,sourceUpdatedAt:schedule.sourceUpdatedAt},null,2));
console.log(`Built ${allRoutes.size} pages, ${pages.length} source records, ${schedule.events.length} calendar services. Production indexing: ${production}.`);
