/* Athletics Manager — Season Event Integrity V1
   Repairs a damaged/missing season event graph from the authoritative makeEvents()
   template without replacing live event progress or results. It also guards fresh()
   so a new career cannot be born with only a partial competition calendar. */
(function(){
'use strict';
if(window.__amSeasonEventIntegrityV1Build3)return;window.__amSeasonEventIntegrityV1Build3=1;window.__amSeasonEventIntegrityV1=1;
if(typeof document==='undefined')return;

const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
function available(state=typeof s!=='undefined'?s:null){return !!state?.game&&typeof makeEvents==='function'}
function careerFor(state=typeof s!=='undefined'?s:null){
 if(state===s)return safe(()=>careerState(),state?.career||{})||{};
 return state?.career||{};
}
function shouldRepairState(state=typeof s!=='undefined'?s:null){const c=careerFor(state);return available(state)&&!c.pendingReview&&!c.finished}
function expectedFor(state=typeof s!=='undefined'?s:null){
 if(!shouldRepairState(state))return[];
 const cycleYear=Number(state.game.cycleYear||1),nation=state.managedNation||safe(()=>managedNation(),'GREAT BRITAIN'),cycleNumber=Number(careerFor(state).cycleNumber||1);
 return safe(()=>makeEvents(cycleYear,nation,cycleNumber),[])||[]
}
function cloneEvent(e){
 const out={...e};
 if(e.disc)out.disc=[...e.disc];
 if(e.roadCourse&&typeof e.roadCourse==='object')out.roadCourse={...e.roadCourse,scenes:Array.isArray(e.roadCourse.scenes)?e.roadCourse.scenes.map(x=>Array.isArray(x)?[...x]:x):e.roadCourse.scenes};
 if(e.entries&&typeof e.entries==='object')out.entries=Object.fromEntries(Object.entries(e.entries).map(([k,v])=>[k,Array.isArray(v)?[...v]:v]));
 if(e.results&&typeof e.results==='object')out.results={...e.results};
 return out
}
function mergeState(state,options={}){
 if(!shouldRepairState(state))return{changed:false,reason:'career-not-ready',added:[],expected:0,current:Array.isArray(state?.events)?state.events.length:0};
 const expected=expectedFor(state);if(!expected.length)return{changed:false,reason:'no-authoritative-events',added:[],expected:0,current:Array.isArray(state.events)?state.events.length:0};
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
 return{changed:!!added.length,added,expected:expected.length,current:state.events.length}
}
function repair(options={}){
 if(typeof s==='undefined'||!s)return{changed:false,reason:'no-career',added:[],expected:0,current:0};
 const result=mergeState(s,{markRecovered:true});
 if(!result.changed)return{...result,reason:result.reason||'complete'};
 s.seasonEventIntegrity??={version:1,repairs:0,last:null};
 s.seasonEventIntegrity.version=1;s.seasonEventIntegrity.repairs=Number(s.seasonEventIntegrity.repairs||0)+1;
 s.seasonEventIntegrity.last={season:Number(s.game.season||1),cycleYear:Number(s.game.cycleYear||1),week:Number(s.game.week||1),careerWeek:Number(s.game.careerWeek||s.game.week||1),added:[...result.added]};
 try{save()}catch(_){}
 if(options.redraw&&typeof currentView!=='undefined'&&currentView==='calendar')requestAnimationFrame(()=>{try{baseCalendar?baseCalendar():drawCalendar()}catch(_){}});
 return result
}

/* fresh() is part of the save authority. Several expansion modules legitimately wrap it.
   This final integrity wrapper does not replace any event already created by those systems;
   it only fills IDs that the authoritative makeEvents() graph says must exist. */
function installFreshGuard(){
 const fn=safe(()=>typeof fresh==='function'?fresh:null,null);if(typeof fn!=='function')return false;
 if(fn.__amSeasonEventIntegrityV1Build3)return true;
 const wrapped=function(...args){
  const state=fn.apply(this,args);
  try{mergeState(state,{markRecovered:false})}catch(err){console.warn('[Athletics Manager] Fresh season event integrity recovered',err)}
  return state
 };
 Object.defineProperty(wrapped,'__amSeasonEventIntegrityV1Build3',{value:true});
 try{fresh=wrapped}catch(_){};window.fresh=wrapped;return true
}

let baseCalendar=null;
function installCalendarGuard(){
 const draw=safe(()=>typeof drawCalendar==='function'?drawCalendar:null,null);if(typeof draw!=='function')return false;
 if(draw.__amSeasonEventIntegrityV1)return true;baseCalendar=draw;
 const wrapped=function(...args){repair();return baseCalendar.apply(this,args)};
 Object.defineProperty(wrapped,'__amSeasonEventIntegrityV1',{value:true});
 try{drawCalendar=wrapped}catch(_){};window.drawCalendar=wrapped;return true
}
function installWeekGuard(){
 const fn=window.onWeekStart||safe(()=>typeof onWeekStart==='function'?onWeekStart:null,null);if(typeof fn!=='function')return false;
 if(fn.__amSeasonEventIntegrityV1)return true;
 const wrapped=function(...args){const out=fn.apply(this,args);try{repair()}catch(err){console.warn('[Athletics Manager] Season event repair recovered',err)}return out};
 Object.defineProperty(wrapped,'__amSeasonEventIntegrityV1',{value:true});window.onWeekStart=wrapped;try{onWeekStart=wrapped}catch(_){};return true
}

window.AMSeasonEventIntegrity={version:1,build:3,repair,mergeState,expectedEvents:()=>expectedFor(s),shouldRepair:()=>shouldRepairState(s),debug:()=>({expected:expectedFor(s).map(e=>({id:e.id,name:e.name,week:e.week})),current:(s?.events||[]).map(e=>({id:e.id,name:e.name,week:e.week,completed:!!e.completed,recovered:!!e.recoveredMissingSchedule})),meta:s?.seasonEventIntegrity||null})};
installFreshGuard();installCalendarGuard();installWeekGuard();
requestAnimationFrame(()=>{try{const result=repair({redraw:true});if(result.changed)console.info('[Athletics Manager] Restored missing season events',result.added)}catch(err){console.warn('[Athletics Manager] Season event integrity check failed',err)}});
})();