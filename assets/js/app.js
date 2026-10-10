import { upcomingEvents, isStale, parseNames, searchText } from './domain.js';
import { enableDocumentDownloads } from './document-downloads.js';

const root=document.documentElement;
root.classList.add('js');
const locale=document.body.dataset.locale;
const siteRoot=new URL(document.body.dataset.root,location.href);
const select=(selector)=>document.querySelector(selector);
const all=(selector)=>[...document.querySelectorAll(selector)];
const show=(element,visible)=>{if(element)element.hidden=!visible;};
enableDocumentDownloads(siteRoot);

// Navigation remains visible if JavaScript is unavailable.
const toggle=select('[data-menu-toggle]');
const nav=select('#main-navigation');
if(toggle&&nav){
  show(toggle,true);
  toggle.addEventListener('click',()=>{
    const open=toggle.getAttribute('aria-expanded')!=='true';
    toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&nav.classList.contains('is-open')){
      nav.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.focus();
    }
  });
}

// Only accessibility preferences are persisted. Prayer names never enter browser storage.
const settingsKey='bukiski-reading-v1';
const readingDialog=select('#reading-dialog');
const large=select('[data-large-text]'),contrast=select('[data-high-contrast]');
const applyReading=()=>{root.classList.toggle('large-text',large.checked);root.classList.toggle('high-contrast',contrast.checked);};
try{const saved=JSON.parse(localStorage.getItem(settingsKey)||'{}');large.checked=saved.large===true;contrast.checked=saved.contrast===true;}catch{/* Storage may be unavailable. */}
applyReading();
for(const input of [large,contrast])input.addEventListener('change',()=>{
  applyReading();try{localStorage.setItem(settingsKey,JSON.stringify({large:large.checked,contrast:contrast.checked}));}catch{/* Optional preference persistence. */}
});
const opener=select('[data-access-open]');
if(typeof readingDialog.showModal==='function'){
  show(opener,true);opener.addEventListener('click',()=>readingDialog.showModal());
  select('[data-access-close]').addEventListener('click',()=>readingDialog.close());
  readingDialog.addEventListener('close',()=>opener.focus());
}
select('[data-reset-settings]').addEventListener('click',()=>{
  large.checked=false;contrast.checked=false;applyReading();try{localStorage.removeItem(settingsKey);}catch{/* Optional. */}
});

async function readJSON(path){
  const response=await fetch(new URL(path,siteRoot),{credentials:'omit',cache:'no-cache',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Could not load local content');
  return response.json();
}
const copyPromise=readJSON('assets/data/locales.json').then(data=>data[locale]);
// A load failure leaves all server-rendered content usable.
copyPromise.catch(()=>{});

function node(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;}
function renderSchedule(schedule,copy){
  for(const container of all('[data-schedule]')){
    const list=container.querySelector('[data-service-list]');
    const events=upcomingEvents(schedule).slice(0,Number(container.dataset.limit)||3);
    const fragment=document.createDocumentFragment();
    for(const event of events){
      const row=node('li','','service-row');const time=node('time','');time.dateTime=event.start;
      time.append(node('span',new Intl.DateTimeFormat(locale,{timeZone:'Europe/Vilnius',weekday:'short',day:'numeric',month:'long',year:'numeric'}).format(new Date(event.start))),node('strong',event.startTime));
      const detail=node('div','');detail.append(node('h3',event.title[locale]),node('p',event.subtitle[locale]||''));
      row.append(time,detail);fragment.append(row);
    }
    list.replaceChildren(fragment);
    show(container.querySelector('[data-empty-schedule]'),events.length===0);
    show(container.querySelector('[data-stale]'),isStale(schedule));
    const status=container.querySelector('[data-schedule-status]');
    status.textContent=`${copy.fromCalendar} · ${copy.updated} ${new Intl.DateTimeFormat(locale,{timeZone:'Europe/Vilnius',dateStyle:'medium',timeStyle:'short'}).format(new Date(schedule.sourceUpdatedAt))}`;
  }
}
if(select('[data-schedule]')){
  Promise.all([readJSON('assets/data/schedule.json'),copyPromise]).then(([schedule,copy])=>{
    if(schedule.schemaVersion!==1||schedule.timezone!=='Europe/Vilnius'||!Array.isArray(schedule.events))throw new Error('Invalid schedule');
    renderSchedule(schedule,copy);
    // Recheck elapsed services and freshness while the tab stays open.
    setInterval(()=>{if(document.visibilityState==='visible')renderSchedule(schedule,copy);},60000);
  }).catch(()=>all('[data-stale]').forEach(el=>show(el,true)));
}

if(select('[data-library-item]'))copyPromise.then(copy=>{
  show(select('[data-search-controls]'),true);
  const query=select('#library-query'),language=select('#library-language');
  const items=all('[data-library-item]').map(element=>({element,text:searchText(element.dataset.search),language:element.dataset.language}));
  function filter(){
    const terms=searchText(query.value).trim().split(/\s+/).filter(Boolean);let count=0;
    for(const item of items){const visible=(language.value==='all'||item.language===language.value)&&terms.every(term=>item.text.includes(term));show(item.element,visible);if(visible)count++;}
    select('[data-search-status]').textContent=`${copy.results}: ${count}`;show(select('[data-no-results]'),count===0);
  }
  query.addEventListener('input',filter);language.addEventListener('change',filter);
}).catch(()=>{});

const form=select('#prayer-form');
if(form){
  form.addEventListener('submit',event=>event.preventDefault());
  copyPromise.then(copy=>{
    const textarea=select('#prayer-names'),status=select('#note-status');
    const preview=select('[data-note-preview]'),actions=select('[data-note-actions]');
    const prepare=select('[data-note-prepare]'),clear=select('[data-note-clear]');
    let prepared=null;
    show(prepare,true);show(clear,true);show(select('[data-note-unavailable]'),false);
    const invalidate=()=>{
      prepared=null;status.textContent='';
      select('[data-note-heading]').textContent='';
      select('[data-note-names]').replaceChildren();
      show(preview,false);show(actions,false);show(select('.note-result>.small'),false);
      document.body.classList.remove('note-printing');
    };
    invalidate();
    const erase=()=>{form.reset();textarea.value='';textarea.removeAttribute('aria-invalid');invalidate();status.textContent='';};
    textarea.addEventListener('input',()=>{invalidate();status.textContent='';textarea.removeAttribute('aria-invalid');});
    all('[name=request-type]').forEach(input=>input.addEventListener('change',invalidate));
    prepare.addEventListener('click',()=>{
      const names=parseNames(textarea.value);
      if(!names){invalidate();status.textContent=copy.noteError;textarea.setAttribute('aria-invalid','true');textarea.focus();return;}
      textarea.removeAttribute('aria-invalid');
      const type=form.querySelector('[name=request-type]:checked').value;
      prepared={names,title:copy[type]};
      select('[data-note-heading]').textContent=prepared.title;
      select('[data-note-names]').replaceChildren(...names.map(name=>node('li',name)));
      show(preview,true);show(actions,true);show(select('.note-result>.small'),true);
      status.textContent=copy.noteReady;
    });
    clear.addEventListener('click',()=>{erase();status.textContent=copy.noteCleared;textarea.focus();});
    select('[data-note-print]').addEventListener('click',()=>{
      if(!prepared)return;document.body.classList.add('note-printing');window.print();
    });
    window.addEventListener('afterprint',()=>document.body.classList.remove('note-printing'));
    select('[data-note-download]').addEventListener('click',()=>{
      if(!prepared)return;
      const blob=new Blob(['\uFEFF'+prepared.title+'\n\n'+prepared.names.join('\n')+'\n\n'+copy.name],{type:'text/plain;charset=utf-8'});
      const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='prayer-request.txt';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
    });
    window.addEventListener('pagehide',erase);
    window.addEventListener('pageshow',event=>{if(event.persisted)erase();});
  }).catch(()=>{show(select('.note-result>.small'),false);});
}
