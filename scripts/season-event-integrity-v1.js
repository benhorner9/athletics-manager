/* Athletics Manager — Season Event Integrity V1
   Repairs a damaged/missing s.events season graph from the authoritative
   makeEvents() template without replacing live event progress or results. */
(function(){
'use strict';
if(window.__amSeasonEventIntegrityV1)return;window.__amSeasonEventIntegrityV1=1;
if(typeof document==='undefined')return;

const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
function available(){return typeof s!=='undefined'&&!!s?.game&&typeof makeEvents==='function'}
function career(){return safe(()=>careerState(),s?.career||{})||{}}
function shouldRepair(){const c=career();return available()&&!c.pendingReview&&!c.finished}
function expectedEvents(){
 if(!shouldRepair())return[];
 const cycleYear=Number(s.game.cycleYear||1),nation=safe(()=>managedNation(),s.managedNation||'GREAT BRITAIN'),cycleNumber=Number(career().cycleNumber||1);
 return safe(()=>makeEvents(cycleYear,nation,cycleNumber),[])||[]
}
function cloneEvent(e){
 const out={...e};
 if(e.entries&&typeof e.entries==='object')out.entries=Object.fromEntries(Object.entries(e.entries).map(([k,v])=>[k,Array.isArray(v)?[...v]:v]));
 if(e.results&&typeof e.results==='object')out.results={...e.results};
 return out
}
function repair(options={}){
 if(!shouldRepair())return{changed:false,reason:'career-not-ready',added:[],expected:0,current:Array.isArray(s?.events)?s.events.length:0};
 const expected=expectedEvents();if(!expected.length)return{changed:false,reason:'no-authoritative-events',added:[],expected:0,current:Array.isArray(s.events)?s.events.length:0};
 if(!Array.isArray(s.events))s.events=[];
 const existing=new Map(s.events.filter(Boolean).map(e=>[String(e.id||''),e]));
 const added=[],nowWeek=Number(s.game.week||1);
 for(const source of expected){
  const id=String(source?.id||'');if(!id||existing.has(id))continue;
  const restored=cloneEvent(source);
  if(Number(restored.week||0)<nowWeek){
   restored.completed=true;
   restored.decision=true;
   restored.recoveredMissingSchedule=true;
   restored.recoveredCareerWeek=Number(s.game.careerWeek||nowWeek);
  }else{
   restored.recoveredMissingSchedule=true;
   restored.recoveredCareerWeek=Number(s.game.careerWeek||nowWeek);
  }
  s.events.push(restored);existing.set(id,restored);added.push(id)
 }
 if(!added.length)return{changed:false,reason:'complete',added,expected:expected.length,current:s.events.length};
 s.events.sort((a,b)=>Number(a?.week||999)-Number(b?.week||999)||String(a?.id||'').localeCompare(String(b?.id||'')));
 s.seasonEventIntegrity??={version:1,repairs:0,last:null};
 s.seasonEventIntegrity.version=1;s.seasonEventIntegrity.repairs=Number(s.seasonEventIntegrity.repairs||0)+1;
 s.seasonEventIntegrity.last={season:Number(s.game.season||1),cycleYear:Number(s.game.cycleYear||1),week:nowWeek,careerWeek:Number(s.game.careerWeek||nowWeek),added:[...added]};
 try{save()}catch(_){}
 if(options.redraw&&typeof currentView!=='undefined'&&currentView==='calendar')requestAnimationFrame(()=>{try{baseCalendar?baseCalendar():drawCalendar()}catch(_){}});
 return{changed:true,added,expected:expected.length,current:s.events.length}
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

window.AMSeasonEventIntegrity={version:1,repair,expectedEvents,shouldRepair,debug:()=>({expected:expectedEvents().map(e=>({id:e.id,name:e.name,week:e.week})),current:(s?.events||[]).map(e=>({id:e.id,name:e.name,week:e.week,completed:!!e.completed,recovered:!!e.recoveredMissingSchedule})),meta:s?.seasonEventIntegrity||null})};
installCalendarGuard();installWeekGuard();
requestAnimationFrame(()=>{try{const result=repair({redraw:true});if(result.changed)console.info('[Athletics Manager] Restored missing season events',result.added)}catch(err){console.warn('[Athletics Manager] Season event integrity check failed',err)}});
})();
