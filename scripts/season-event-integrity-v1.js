/* Athletics Manager — Season Event Integrity V1
   Repairs a damaged/missing season event graph from the authoritative makeEvents()
   template without replacing live event progress or results. Build 6 also retires
   the removed marathon/road-racing feature from existing development careers. */
(function(){
'use strict';
if(window.__amSeasonEventIntegrityV1Build6)return;window.__amSeasonEventIntegrityV1Build6=1;window.__amSeasonEventIntegrityV1=1;
if(typeof document==='undefined')return;

const RETIRED_ROAD_IDS=new Set(['road-spring','road-capital','road-lakeside','road-autumn']);
const RETIRED_ROAD_DISCS=new Set(['MMarathon','WMarathon']);
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
function available(state=typeof s!=='undefined'?s:null){return !!state?.game&&typeof makeEvents==='function'}
function careerFor(state=typeof s!=='undefined'?s:null){
 if(typeof s!=='undefined'&&state===s)return safe(()=>careerState(),state?.career||{})||{};
 return state?.career||{};
}
function shouldRepairState(state=typeof s!=='undefined'?s:null){const c=careerFor(state);return available(state)&&!c.pendingReview&&!c.finished}
function expectedFor(state=typeof s!=='undefined'?s:null){
 if(!shouldRepairState(state))return[];
 const cycleYear=Number(state.game.cycleYear||1),nation=state.managedNation||safe(()=>managedNation(),'GREAT BRITAIN'),cycleNumber=Number(careerFor(state).cycleNumber||1);
 return safe(()=>makeEvents(cycleYear,nation,cycleNumber),[])||[]
}
function retiredEvent(e){
 const id=String(e?.id||''),disc=Array.isArray(e?.disc)?e.disc:[];
 return e?.roadRace===true||RETIRED_ROAD_IDS.has(id)||disc.some(d=>RETIRED_ROAD_DISCS.has(String(d||'')));
}
function retiredMail(m){
 const ids=[m?.eventId,m?.entityId,m?.competitionId].map(x=>String(x||''));
 const discs=[m?.disc,m?.discipline].map(x=>String(x||''));
 return ids.some(id=>RETIRED_ROAD_IDS.has(id)||id.startsWith('road-'))||discs.some(d=>RETIRED_ROAD_DISCS.has(d));
}
function purgeRetiredRoadRacing(state){
 const removed={events:[],athletes:[],emails:[],records:0,metadata:0};
 if(!state||typeof state!=='object')return{changed:false,removed};
 if(Array.isArray(state.events))state.events=state.events.filter(e=>{if(!retiredEvent(e))return true;removed.events.push(String(e?.id||e?.name||'(unnamed)'));return false});
 if(Array.isArray(state.athletes))state.athletes=state.athletes.filter(a=>{if(!RETIRED_ROAD_DISCS.has(String(a?.disc||'')))return true;removed.athletes.push(String(a?.id||a?.name||'(unnamed)'));return false});
 if(Array.isArray(state.pool))state.pool=state.pool.filter(a=>!RETIRED_ROAD_DISCS.has(String(a?.disc||'')));
 if(Array.isArray(state.emails))state.emails=state.emails.filter(m=>{if(!retiredMail(m))return true;removed.emails.push(String(m?.id||m?.subject||'(unnamed)'));return false});
 const records=state.records;
 if(records?.world)for(const d of RETIRED_ROAD_DISCS)if(Object.prototype.hasOwnProperty.call(records.world,d)){delete records.world[d];removed.records++}
 if(records?.national&&typeof records.national==='object')for(const nation of Object.values(records.national))if(nation&&typeof nation==='object')for(const d of RETIRED_ROAD_DISCS)if(Object.prototype.hasOwnProperty.call(nation,d)){delete nation[d];removed.records++}
 for(const key of ['marathonRoadVersion','marathonRecoveryApplied','marathonRoadState'])if(Object.prototype.hasOwnProperty.call(state,key)){delete state[key];removed.metadata++}
 const changed=removed.events.length>0||removed.athletes.length>0||removed.emails.length>0||removed.records>0||removed.metadata>0;
 return{changed,removed}
}
function cloneEvent(e){
 const out={...e};
 if(e.disc)out.disc=[...e.disc];
 if(e.entries&&typeof e.entries==='object')out.entries=Object.fromEntries(Object.entries(e.entries).map(([k,v])=>[k,Array.isArray(v)?[...v]:v]));
 if(e.results&&typeof e.results==='object')out.results={...e.results};
 return out
}
function mergeState(state,options={}){
 const purge=purgeRetiredRoadRacing(state);
 if(!shouldRepairState(state))return{changed:purge.changed,reason:'career-not-ready',added:[],removed:purge.removed,expected:0,current:Array.isArray(state?.events)?state.events.length:0};
 const expected=expectedFor(state).filter(e=>!retiredEvent(e));
 if(!expected.length)return{changed:purge.changed,reason:'no-authoritative-events',added:[],removed:purge.removed,expected:0,current:Array.isArray(state.events)?state.events.length:0};
 if(!Array.isArray(state.events))state.events=[];
 const existing=new Map(state.events.filter(Boolean).map(e=>[String(e.id||''),e]));
 const added=[],nowWeek=Number(state.game.week||1),markRecovered=options.markRecovered!==false;
 for(const source of expected){
  const id=String(source?.id||'');if(!id||existing.has(id))continue;
  const restored=cloneEvent(source);
  if(markRecovered){
   restored.recoveredMissingSchedule=true;
   restored.recoveredCareerWeek=Number(state.game.careerWeek||nowWeek);
   if(Number(restored.week||0)<nowWeek){restored.completed=true;restored.decision=true}
  }
  state.events.push(restored);existing.set(id,restored);added.push(id)
 }
 state.events.sort((a,b)=>Number(a?.week||999)-Number(b?.week||999)||String(a?.id||'').localeCompare(String(b?.id||'')));
 return{changed:purge.changed||!!added.length,added,removed:purge.removed,expected:expected.length,current:state.events.length}
}
function repair(options={}){
 if(typeof s==='undefined'||!s)return{changed:false,reason:'no-career',added:[],removed:{events:[],athletes:[],emails:[],records:0,metadata:0},expected:0,current:0};
 const result=mergeState(s,{markRecovered:true});
 if(!result.changed)return{...result,reason:result.reason||'complete'};
 s.seasonEventIntegrity??={version:1,build:6,repairs:0,last:null};
 s.seasonEventIntegrity.version=1;s.seasonEventIntegrity.build=6;s.seasonEventIntegrity.repairs=Number(s.seasonEventIntegrity.repairs||0)+1;
 s.seasonEventIntegrity.last={season:Number(s.game.season||1),cycleYear:Number(s.game.cycleYear||1),week:Number(s.game.week||1),careerWeek:Number(s.game.careerWeek||s.game.week||1),added:[...result.added],removed:result.removed};
 try{save()}catch(_){}
 if(options.redraw&&typeof currentView!=='undefined'&&currentView==='calendar')requestAnimationFrame(()=>{try{if(typeof drawCalendar==='function')drawCalendar()}catch(_){}});
 return result
}
function installFreshGuard(){
 const fn=safe(()=>typeof fresh==='function'?fresh:null,null);if(typeof fn!=='function')return false;
 if(fn.__amSeasonEventIntegrityV1Build6)return true;
 const wrapped=function(...args){
  const state=fn.apply(this,args);
  try{mergeState(state,{markRecovered:false})}catch(err){console.warn('[Athletics Manager] Fresh season event integrity recovered',err)}
  return state
 };
 Object.defineProperty(wrapped,'__amSeasonEventIntegrityV1Build6',{value:true});
 try{fresh=wrapped}catch(_){};window.fresh=wrapped;return true
}
function installEnsureStateGuard(){
 const fn=safe(()=>typeof ensureState==='function'?ensureState:null,null);if(typeof fn!=='function')return false;
 if(fn.__amSeasonEventIntegrityV1Build6)return true;
 const wrapped=function(...args){
  const out=fn.apply(this,args);
  try{if(typeof s!=='undefined'&&s)mergeState(s,{markRecovered:true})}catch(err){console.warn('[Athletics Manager] State event integrity recovered',err)}
  return out
 };
 Object.defineProperty(wrapped,'__amSeasonEventIntegrityV1Build6',{value:true});
 try{ensureState=wrapped}catch(_){};window.ensureState=wrapped;return true
}
function installWeekGuard(){
 const fn=window.onWeekStart||safe(()=>typeof onWeekStart==='function'?onWeekStart:null,null);if(typeof fn!=='function')return false;
 if(fn.__amSeasonEventIntegrityV1Build6)return true;
 const wrapped=function(...args){const out=fn.apply(this,args);try{repair()}catch(err){console.warn('[Athletics Manager] Season event repair recovered',err)}return out};
 Object.defineProperty(wrapped,'__amSeasonEventIntegrityV1Build6',{value:true});window.onWeekStart=wrapped;try{onWeekStart=wrapped}catch(_){};return true
}
function reinstall(){
 const freshInstalled=installFreshGuard(),stateInstalled=installEnsureStateGuard(),weekInstalled=installWeekGuard();
 try{repair()}catch(_){}
 return{freshInstalled,stateInstalled,calendarInstalled:false,weekInstalled}
}
window.AMSeasonEventIntegrity={version:1,build:6,repair,mergeState,purgeRetiredRoadRacing,reinstall,expectedEvents:()=>expectedFor(s).filter(e=>!retiredEvent(e)),shouldRepair:()=>shouldRepairState(s),debug:()=>({expected:expectedFor(s).filter(e=>!retiredEvent(e)).map(e=>({id:e.id,name:e.name,week:e.week})),current:(s?.events||[]).map(e=>({id:e.id,name:e.name,week:e.week,completed:!!e.completed,recovered:!!e.recoveredMissingSchedule})),freshGuard:!!safe(()=>fresh.__amSeasonEventIntegrityV1Build6,false),stateGuard:!!safe(()=>ensureState.__amSeasonEventIntegrityV1Build6,false),calendarWrapped:false,meta:s?.seasonEventIntegrity||null})};
reinstall();
requestAnimationFrame(()=>{try{const result=repair({redraw:true});if(result.changed)console.info('[Athletics Manager] Season event integrity repaired state',result)}catch(err){console.warn('[Athletics Manager] Season event integrity check failed',err)}});
})();