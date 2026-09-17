/* Athletics Manager — Season Archive V1
   Completed seasons retain useful career facts, not every raw weekly/result record.
   Current-season detail stays untouched. Historical ordinary results and routine
   development memories are compacted once their season has finished. */
(function(){
'use strict';
if(window.AMSeasonArchive)return;

const VERSION=1;
const MAX_ARCHIVE_SEASONS=40;
const MAX_MAJOR_RESULTS_MANAGED=16;
const MAX_MAJOR_RESULTS_WORLD=8;
const MAX_PINNED_MEMORIES_MANAGED=12;
const MAX_PINNED_MEMORIES_WORLD=4;
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const season=()=>Number(safe(()=>s.game.season,0))||0;
const managedNationKey=()=>String(safe(()=>typeof managedNation==='function'?managedNation():s?.managedNation,s?.managedNation)||'');
const managedHistory=()=>new Set([managedNationKey(),...(safe(()=>s.career?.nationsManaged,[])||[])].map(String));

function betterMark(d,a,b){
 if(!Number.isFinite(Number(a)))return false;
 if(!Number.isFinite(Number(b)))return true;
 try{if(typeof better==='function')return !!better(d,Number(a),Number(b))}catch(_){ }
 const kind=safe(()=>DISCIPLINES?.[d]?.type,'');
 return kind==='time'?Number(a)<Number(b):Number(a)>Number(b);
}
function seasonBest(a,year){
 let best=null;
 for(const row of a?.profileResults||[]){
  if(Number(row?.season)!==Number(year)||!Number.isFinite(Number(row?.perf)))continue;
  if(betterMark(a.disc,Number(row.perf),best))best=Number(row.perf);
 }
 return best;
}
function startsInSeason(a,year){
 return (a?.profileResults||[]).filter(row=>Number(row?.season)===Number(year)&&Number.isFinite(Number(row?.perf))&&!/test/i.test(String(row?.event||row?.source||''))).length;
}
function netDevelopment(a,year){
 const rows=(a?.attributeDevelopment?.history||[]).filter(row=>Number(row?.season)===Number(year));
 if(!rows.length)return null;
 const byKey=new Map();
 for(const row of rows){
  const key=String(row?.key||row?.label||'').trim();if(!key)continue;
  const current=byKey.get(key);
  const from=Number(row?.from),to=Number(row?.to);
  if(!current)byKey.set(key,{key,from:Number.isFinite(from)?from:null,to:Number.isFinite(to)?to:null});
  else if(Number.isFinite(to))current.to=to;
 }
 const out=[...byKey.values()].filter(x=>Number.isFinite(x.from)&&Number.isFinite(x.to)&&x.from!==x.to).map(x=>[x.key,x.from,x.to]);
 return out.length?out:null;
}
function archiveEntry(a,year,rank=null,points=null){
 const sb=seasonBest(a,year),starts=startsInSeason(a,year),entry={s:Number(year)};
 if(Number.isFinite(Number(rank))&&Number(rank)>0)entry.r=Number(rank);
 if(Number.isFinite(Number(sb)))entry.sb=Number(sb);
 if(Number.isFinite(Number(a?.pb)))entry.pb=Number(a.pb);
 if(starts)entry.n=starts;
 if(Number.isFinite(Number(points))&&Number(points)>0)entry.p=Math.round(Number(points));
 if(managedHistory().has(String(a?.nation))){const d=netDevelopment(a,year);if(d)entry.d=d}
 return entry;
}
function upsertArchive(a,entry){
 if(!a||!entry?.s)return 0;
 const rows=Array.isArray(a.seasonArchiveV1)?a.seasonArchiveV1:[];
 const index=rows.findIndex(x=>Number(x?.s)===Number(entry.s));
 if(index>=0){rows[index]={...rows[index],...entry};a.seasonArchiveV1=rows;return 0}
 rows.push(entry);rows.sort((x,y)=>Number(x?.s)-Number(y?.s));
 if(rows.length>MAX_ARCHIVE_SEASONS)rows.splice(0,rows.length-MAX_ARCHIVE_SEASONS);
 a.seasonArchiveV1=rows;return 1;
}
function rankingMap(){
 const byDisc=new Map();
 for(const a of s?.athletes||[]){
  if(!a||a.retired||!(Number(a.points)>0)||!a.disc)continue;
  const key=String(a.disc);if(!byDisc.has(key))byDisc.set(key,[]);byDisc.get(key).push(a);
 }
 const rank=new Map();
 for(const rows of byDisc.values()){
  rows.sort((a,b)=>Number(b.points||0)-Number(a.points||0)||(betterMark(a.disc,a.pb,b.pb)?-1:betterMark(a.disc,b.pb,a.pb)?1:0)||String(a.id).localeCompare(String(b.id)));
  let lastPoints=null,lastRank=0;
  rows.forEach((a,index)=>{const p=Number(a.points||0);if(lastPoints==null||p!==lastPoints){lastRank=index+1;lastPoints=p}rank.set(String(a.id),lastRank)});
 }
 return rank;
}
function snapshotCurrentSeason(){
 if(!s?.athletes?.length)return 0;
 const year=season();if(!year)return 0;
 s.seasonArchiveStateV1=s.seasonArchiveStateV1||{};
 if(Number(s.seasonArchiveStateV1.snapshottedSeason)===year)return 0;
 const ranks=rankingMap();let changed=0;
 for(const a of s.athletes){
  const hasRows=(a.profileResults||[]).some(row=>Number(row?.season)===year&&Number.isFinite(Number(row?.perf)));
  const ranked=Number(a.points)>0;
  const relevant=hasRows||ranked||String(a.nation)===managedNationKey();
  if(!relevant)continue;
  changed+=upsertArchive(a,archiveEntry(a,year,ranks.get(String(a.id))||null,Number(a.points)||null));
 }
 s.seasonArchiveStateV1.snapshottedSeason=year;
 return changed;
}
function isMajorResult(row){
 const event=String(row?.event||'').toLowerCase(),ach=(row?.achievements||[]).map(String);
 return /olympic|world athletics cup|world championship|national championship|continental championship|european championship|commonwealth|championship final/.test(event)||ach.includes('WR')||ach.includes('NR');
}
function isPinnedMemory(memory){
 const text=`${memory?.type||''} ${memory?.text||''}`.toLowerCase();
 return /call[- ]?up|rival|injur|recover|comeback|retir|conversation|selection|medal|record|champion|olymp|breakthrough/.test(text);
}
function rowSeason(row){const n=Number(row?.season);return Number.isFinite(n)?n:null}
function compactAthlete(a,currentSeason){
 if(!a)return 0;let changed=0;
 const raw=a.profileResults;
 if(Array.isArray(raw)&&raw.length){
  const oldSeasons=[...new Set(raw.map(row=>rowSeason(row)).filter(y=>y&&y<currentSeason))];
  for(const year of oldSeasons)if(!(a.seasonArchiveV1||[]).some(x=>Number(x?.s)===year))changed+=upsertArchive(a,archiveEntry(a,year));
  const historical=raw.filter(row=>{const y=rowSeason(row);return y&&y<currentSeason&&isMajorResult(row)}).map(row=>{
   const out={season:Number(row.season),week:Number(row.week)||0,perf:Number(row.perf),event:String(row.event||''),source:row.source};
   if(Array.isArray(row.achievements)&&row.achievements.length)out.achievements=[...row.achievements];
   return out;
  });
  const limit=managedHistory().has(String(a.nation))?MAX_MAJOR_RESULTS_MANAGED:MAX_MAJOR_RESULTS_WORLD;
  const keepHistorical=historical.slice(-limit),current=raw.filter(row=>{const y=rowSeason(row);return !y||y>=currentSeason});
  const next=[...keepHistorical,...current];
  if(next.length!==raw.length||next.some((row,i)=>row!==raw[i])){changed+=Math.max(1,raw.length-next.length);a.profileResults=next}
 }
 const dev=a.attributeDevelopment?.history;
 if(Array.isArray(dev)&&dev.length){
  const next=dev.filter(row=>{const y=rowSeason(row);return !y||y>=currentSeason});
  if(next.length!==dev.length){changed+=dev.length-next.length;a.attributeDevelopment.history=next}
 }
 const memories=a.story?.memories;
 if(Array.isArray(memories)&&memories.length){
  const current=memories.filter(m=>{const y=rowSeason(m);return !y||y>=currentSeason});
  const pinned=memories.filter(m=>{const y=rowSeason(m);return y&&y<currentSeason&&isPinnedMemory(m)});
  const limit=managedHistory().has(String(a.nation))?MAX_PINNED_MEMORIES_MANAGED:MAX_PINNED_MEMORIES_WORLD;
  const next=[...pinned.slice(-limit),...current].slice(-40);
  if(next.length!==memories.length||next.some((m,i)=>m!==memories[i])){changed+=Math.max(1,memories.length-next.length);a.story.memories=next}
 }
 const testing=a.testingHistory;
 if(Array.isArray(testing)&&testing.length){
  const next=testing.filter(row=>{const y=rowSeason(row);return !y||y>=currentSeason});
  if(next.length!==testing.length){changed+=testing.length-next.length;a.testingHistory=next}
 }
 const legacy=a.trainingV2?.history;
 if(Array.isArray(legacy)&&legacy.length){
  const next=legacy.filter(row=>{const y=rowSeason(row);return !y||y>=currentSeason});
  if(next.length!==legacy.length){changed+=legacy.length-next.length;a.trainingV2.history=next}
 }
 return changed;
}
function compact(){
 if(!s?.athletes?.length)return 0;
 const current=season();if(!current)return 0;let changed=0;
 for(const a of s.athletes)changed+=compactAthlete(a,current);
 s.seasonArchiveStateV1=s.seasonArchiveStateV1||{};
 s.seasonArchiveStateV1.compactedThrough=Math.max(Number(s.seasonArchiveStateV1.compactedThrough)||0,current-1);
 return changed;
}
function stats(){
 const athletes=s?.athletes||[],archives=athletes.reduce((n,a)=>n+(a.seasonArchiveV1?.length||0),0),rawResults=athletes.reduce((n,a)=>n+(a.profileResults?.length||0),0),memories=athletes.reduce((n,a)=>n+(a.story?.memories?.length||0),0),development=athletes.reduce((n,a)=>n+(a.attributeDevelopment?.history?.length||0),0);
 return {version:VERSION,season:season(),athletes:athletes.length,archives,rawResults,memories,development};
}
function installEndSeasonHook(){
 const original=window.endSeason;if(typeof original!=='function'||original.__amSeasonArchiveV1)return false;
 const wrapped=function(...args){snapshotCurrentSeason();const out=original.apply(this,args);compact();return out};
 Object.defineProperty(wrapped,'__amSeasonArchiveV1',{value:true});wrapped.__amSeasonArchiveOriginal=original;
 window.endSeason=wrapped;try{endSeason=wrapped}catch(_){ }
 return true;
}

window.AMSeasonArchive={version:VERSION,snapshotCurrentSeason,compact,stats};
installEndSeasonHook();
compact();
})();
