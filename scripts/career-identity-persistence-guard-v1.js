/* Athletics Manager — Career Identity Persistence Guard V1
   Keeps the player's career/athlete legacy history intact while preventing
   world-wide relationship archives from inflating long-career saves. */
(function(){
'use strict';
if(window.__amCareerIdentityPersistenceGuardV1)return;
window.__amCareerIdentityPersistenceGuardV1=1;

const VERSION=1;
const KEEP_BACKGROUND_MEMORIES=40;
let installed=false;
let baseSave=null;
let lastSignature='';
let timer=0;
let lastReport={changed:0,removedForeignAthletes:0,trimmedBackground:0,season:null,week:null};

const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const text=v=>String(v??'');
const currentWeek=()=>Number(safe(()=>s.game.careerWeek,safe(()=>s.game.week,1)))||1;

function managedNations(){
 const out=new Set();
 const current=text(safe(()=>typeof managedNation==='function'?managedNation():s?.managedNation,''));
 if(current)out.add(current);
 const c=safe(()=>typeof careerState==='function'?careerState():s?.career,{} )||{};
 for(const n of c.nationsManaged||[])if(n)out.add(text(n));
 for(const tenure of c.tenures||[])if(tenure?.nation)out.add(text(tenure.nation));
 return out;
}
function liveAthletes(){
 const map=new Map();
 for(const a of safe(()=>s.athletes,[])||[])if(a?.id!=null)map.set(text(a.id),a);
 return map;
}
function careerStore(){return safe(()=>s.management?.careerIdentityV2,null)}
function athleteNation(id,st,live){return text(live.get(id)?.nation||st.athleteArchive?.[id]?.nation||'')}
function relevantAthletes(st,nations,live){
 const ids=new Set();
 for(const [id,a] of live)if(nations.has(text(a?.nation)))ids.add(id);
 for(const [id,a] of Object.entries(st.athleteArchive||{}))if(nations.has(text(a?.nation)))ids.add(text(id));
 for(const [id,value] of Object.entries(st.favourites||{}))if(value)ids.add(text(id));
 for(const event of st.events||[])if(event?.athleteId&&Number(event.tier||3)<=2)ids.add(text(event.athleteId));
 for(const programme of Object.values(st.programmes||{})){
  if(!programme||!nations.has(text(programme.nation)))continue;
  for(const id of programme.legendIds||[])ids.add(text(id));
  for(const id of programme.hallOfFameIds||[])ids.add(text(id));
 }
 for(const coach of Object.values(safe(()=>s.coaches,{})||{}))if(coach?.formerAthleteId)ids.add(text(coach.formerAthleteId));
 for(const [id,row] of Object.entries(st.postCareer||{}))if(row?.status==='staff')ids.add(text(id));
 return ids;
}
function compact(){
 const st=careerStore();
 if(!st||typeof st!=='object')return {changed:0};
 st.athleteMemories=st.athleteMemories&&typeof st.athleteMemories==='object'?st.athleteMemories:{};
 st.memoryIds=st.memoryIds&&typeof st.memoryIds==='object'?st.memoryIds:{};
 st.athleteArchive=st.athleteArchive&&typeof st.athleteArchive==='object'?st.athleteArchive:{};
 st.programmes=st.programmes&&typeof st.programmes==='object'?st.programmes:{};
 st.postCareer=st.postCareer&&typeof st.postCareer==='object'?st.postCareer:{};
 st.compaction=st.compaction&&typeof st.compaction==='object'?st.compaction:{};
 const nations=managedNations(),live=liveAthletes(),relevant=relevantAthletes(st,nations,live);
 let changed=0,removedForeignAthletes=0,trimmedBackground=0;

 for(const [id,listValue] of Object.entries(st.athleteMemories)){
  const list=Array.isArray(listValue)?listValue:[];
  const keepAthlete=relevant.has(text(id))||nations.has(athleteNation(text(id),st,live));
  if(!keepAthlete){
   delete st.athleteMemories[id];
   if(st.memoryIds[id])delete st.memoryIds[id];
   if(st.athleteArchive[id])delete st.athleteArchive[id];
   changed+=Math.max(1,list.length);removedForeignAthletes++;continue;
  }
  const background=list.filter(m=>Number(m?.tier||3)>=3);
  let next=list;
  if(background.length>KEEP_BACKGROUND_MEMORIES){
   const keepBackground=new Set(background.slice(-KEEP_BACKGROUND_MEMORIES).map(m=>text(m?.id)));
   next=list.filter(m=>Number(m?.tier||3)<=2||keepBackground.has(text(m?.id)));
   trimmedBackground+=list.length-next.length;changed+=list.length-next.length;
   st.athleteMemories[id]=next;
  }
  const ids={};
  for(const memory of next)if(memory?.id)ids[text(memory.id)]=1;
  const old=st.memoryIds[id];
  if(!old||Object.keys(old).length!==Object.keys(ids).length||Object.keys(ids).some(key=>!old[key])){st.memoryIds[id]=ids;changed++}
 }

 for(const id of Object.keys(st.memoryIds))if(!st.athleteMemories[id]){delete st.memoryIds[id];changed++}
 for(const [id,a] of Object.entries(st.athleteArchive)){
  const keep=relevant.has(text(id))||nations.has(text(a?.nation));
  if(!keep){delete st.athleteArchive[id];changed++;removedForeignAthletes++}
 }
 for(const [nationKey,programme] of Object.entries(st.programmes)){
  const n=text(programme?.nation||nationKey);
  if(!nations.has(n)){delete st.programmes[nationKey];changed++}
 }
 for(const [id,row] of Object.entries(st.postCareer)){
  const keep=relevant.has(text(id))||row?.status==='staff'||nations.has(athleteNation(text(id),st,live));
  if(!keep){delete st.postCareer[id];changed++}
 }

 st.compaction.persistenceGuardV1={
  version:VERSION,
  season:Number(safe(()=>s.game.season,0))||0,
  week:Number(safe(()=>s.game.week,1))||1,
  managedNations:[...nations],
  removedForeignAthletes,
  trimmedBackground
 };
 lastReport={changed,removedForeignAthletes,trimmedBackground,season:st.compaction.persistenceGuardV1.season,week:st.compaction.persistenceGuardV1.week};
 return lastReport;
}
function signature(){
 const st=careerStore();
 if(!st)return '';
 return [
  currentWeek(),
  (st.events||[]).length,
  Object.keys(st.athleteMemories||{}).length,
  Object.keys(st.athleteArchive||{}).length,
  Object.keys(st.postCareer||{}).length
 ].join(':');
}
function install(){
 if(installed)return true;
 if(!window.AMPersistencePerformance||!window.AMCareerIdentityV2||typeof window.save!=='function')return false;
 baseSave=window.save;
 if(baseSave.__amCareerIdentityPersistenceGuardV1){installed=true;return true}
 const wrapped=function(...args){
  const before=signature();
  if(before!==lastSignature){compact();lastSignature=signature()}
  return baseSave.apply(this,args);
 };
 Object.defineProperty(wrapped,'__amCareerIdentityPersistenceGuardV1',{value:true});
 window.save=wrapped;try{save=wrapped}catch(_){}
 installed=true;
 compact();lastSignature=signature();
 return true;
}
function boot(){
 if(install())return;
 timer=setTimeout(boot,25);
}
window.AMCareerIdentityPersistenceGuardV1={version:VERSION,compact,report:()=>({...lastReport}),installed:()=>installed};
boot();
})();
