import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSchedule,upcomingEvents,isStale,parseNames,safeExternalURL,escapeHTML,searchText } from '../assets/js/domain.js';

const event=(patch={})=>({id:'test',date:'2026-10-11',startTime:'08:00',start:'2026-10-11T05:00:00.000Z',source:'parish-calendar',allDay:false,timePending:false,title:{ru:'Литургия',lt:'Liturgija',en:'Liturgy'},...patch});
const feed=(events)=>({schemaVersion:1,timezone:'Europe/Vilnius',generatedAt:'2026-10-10T06:00:00Z',events});
test('Vilnius autumn DST keeps 08:00 on both sides of the clock change',()=>{
  const schedule=normalizeSchedule(feed([event(),event({id:'winter',date:'2026-10-25',start:'2026-10-25T06:00:00Z'})]));
  assert.equal(schedule.events.length,2);
  assert.throws(()=>normalizeSchedule(feed([event({date:'2026-10-25',start:'2026-10-25T05:00:00Z'})])),/disagrees/);
});
test('Parish rules, cancelled events and uncertain times cannot become confirmed services',()=>{
  const schedule=normalizeSchedule(feed([event({id:'rule',source:'parish-rule'}),event({id:'cancel',status:'cancelled'}),event({id:'allDay',allDay:true}),event({id:'pending',timePending:true}),event()]));
  assert.deepEqual(schedule.events.map(e=>e.id),['test']);
});
test('Cancellation suppresses an earlier occurrence with the same event ID',()=>{
  assert.equal(normalizeSchedule(feed([event(),event({status:'cancelled'})])).events.length,0);
});
test('Past services are excluded using instants, not date strings',()=>{
  const schedule=normalizeSchedule(feed([event()]));
  assert.equal(upcomingEvents(schedule,Date.parse('2026-10-11T04:59:59Z')).length,1);
  assert.equal(upcomingEvents(schedule,Date.parse('2026-10-11T05:00:01Z')).length,0);
});
test('Old and future-dated snapshots are visibly stale',()=>{
  const schedule=normalizeSchedule(feed([event()]));
  assert.equal(isStale(schedule,Date.parse('2026-10-11T06:00:00Z')),false);
  assert.equal(isStale(schedule,Date.parse('2026-10-12T06:00:01Z')),true);
  assert.equal(isStale(schedule,Date.parse('2026-10-09T06:00:00Z')),true);
});
test('Schedule rejects missing translations, naive datetimes and duplicate IDs',()=>{
  assert.throws(()=>normalizeSchedule(feed([event({title:{ru:'Литургия'}})])),/translation/);
  assert.throws(()=>normalizeSchedule(feed([event({start:'2026-10-11T08:00:00'})])),/offset/);
  assert.throws(()=>normalizeSchedule(feed([event(),event()])),/duplicate/);
});
test('Prayer form accepts Cyrillic, Lithuanian and hyphenated names',()=>{
  assert.deepEqual(parseNames(' Анна\nĄžuolas\nAnne-Marie\nO’Neil '),['Анна','Ąžuolas','Anne-Marie','O’Neil']);
});
test('Prayer form rejects HTML, empty input, excess names and oversize text',()=>{
  for(const input of ['', '<img src=x onerror=alert(1)>',Array(21).fill('Anna').join('\n'),'a'.repeat(61),'Anna\u0000'])assert.equal(parseNames(input),null);
});
test('Untrusted URLs and text cannot introduce active content',()=>{
  for(const href of ['javascript:alert(1)','data:text/html,x','http://example.com','https://user:secret@example.com'])assert.equal(safeExternalURL(href),null);
  assert.equal(safeExternalURL('https://www.openstreetmap.org/'),'https://www.openstreetmap.org/');
  assert.equal(escapeHTML('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
});
test('Library search tolerates Lithuanian accents and Russian yo',()=>{
  assert.equal(searchText('Bukiškis ĄŽUOLAS'),'bukiskis azuolas');
  assert.equal(searchText('Ещё'),'еще');
});
test('English Sunday ordinals are grammatical and do not alter the imported source',()=>{
  for(const [n,suffix] of [[1,'st'],[2,'nd'],[3,'rd'],[11,'th'],[12,'th'],[13,'th'],[19,'th'],[21,'st'],[22,'nd'],[23,'rd']]){
    const liturgical={ru:`Неделя ${n}-я по Пятидесятнице`,en:`Sunday ${n} after Pentecost`};
    const normalized=normalizeSchedule(feed([event({liturgical})])).events[0];
    assert.equal(normalized.subtitle.en,`${n}${suffix} Sunday after Pentecost`);
    assert.equal(normalized.subtitle.ru,liturgical.ru);
    assert.equal(liturgical.en,`Sunday ${n} after Pentecost`);
  }
});
