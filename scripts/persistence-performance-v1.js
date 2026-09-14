/* Athletics Manager — Career Persistence & Performance V1
   Batches redundant physical saves inside one gameplay operation and compacts
   duplicate historical/technical state without removing player-facing career records. */
(function(){
'use strict';
if(window.__amPersistencePerformanceV1)return;
window.__amPersistencePerformanceV1=1;

const VERSION=1;
const KEEP_DECISION_ARCHIVE=80;
const KEEP_DECISION_COMPLETED_ACTIONS=80;
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const nowSeason=()=>Number(safe(()=>s.game.season,0))||0;
const nowWeek=()=>Number(safe(()=>s.game.week,1))||1;

let baseSave=typeof save==='function'?save:null;
let depth=0;
let dirty=false;
let installed=false;
let economyTimer=0;
const counters={physicalSaves:0,deferredSaves:0,batches:0,compactions:0,lastBatch:null,lastCompaction:null};

function compactResultRow(row,index){
 if(!row||typeof row!=='object')return row;
 const out={};
 for(const key of ['id','name','nation','perf','points','place','round','dnf','dns','dq','noMark','noHeight','eliminated']){
  if(row[key]!==undefined&&row[key]!==null&&row[key]!==false)out[key]=row[key];
 }
 if(out.place==null&&Number.isFinite(Number(index)))out.place=Number(index)+1;
 if(Array.isArray(row.achievements)&&row.achievements.length)out.achievements=[...row.achievements];
 return out;
}
function compactRows(rows){return Array.isArray(rows)?rows.map((row,index)=>compactResultRow(row,index)):rows}
function compactResultMap(results){
 if(!results||typeof results!=='object')return results;
 for(const [disc,rows] of Object.entries(results))if(Array.isArray(rows))results[disc]=compactRows(rows);
 return results;
}
function compactHistory(){
 let changed=0;
 for(const item of s?.history||[]){
  if(!item||!item.results||item.persistenceCompactV1)continue;
  compactResultMap(item.results);
  item.persistenceCompactV1=1;
  changed++;
 }
 return changed;
}
function compactManagement(){
 let changed=0;
 const management=s?.management;
 if(!management)return changed;
 for(const result of Object.values(management.results||{})){
  if(!result||!Array.isArray(result.rows))continue;
  result.rows=compactRows(result.rows);changed++;
 }
 for(const dossier of Object.values(management.coachArchive||{})){
  for(const result of Object.values(dossier?.results||{})){
   if(!result||!Array.isArray(result.rows))continue;
   result.rows=compactRows(result.rows);changed++;
  }
 }
 return changed;
}
function compactSummit(){
 let changed=0;
 const currentSeason=nowSeason(),currentWeek=nowWeek();
 for(const [seasonKey,series] of Object.entries(s?.summitSeries||{})){
  const season=Number(seasonKey)||Number(series?.season)||0;
  for(const meeting of Object.values(series?.meetings||{})){
   if(!meeting?.completed)continue;
   const historical=season&&season<currentSeason;
   const passedThisSeason=season===currentSeason&&Number(meeting.week||0)<currentWeek;
   if(!historical&&!passedThisSeason)continue;
   if(meeting.results)compactResultMap(meeting.results);
   if(meeting.fields&&Object.keys(meeting.fields).length){delete meeting.fields;changed++}
   if(!meeting.persistenceCompactV1){meeting.persistenceCompactV1=1;changed++}
  }
 }
 return changed;
}
function compactProcessedGuards(){
 let changed=0;
 const seasonPrefix=String(nowSeason())+':';
 for(const athlete of s?.athletes||[]){
  const map=athlete?.traitState?.processedResults;
  if(!map||typeof map!=='object')continue;
  for(const key of Object.keys(map))if(!String(key).startsWith(seasonPrefix)){delete map[key];changed++}
 }
 const rivalry=s?.rivalries?.processed;
 if(rivalry&&typeof rivalry==='object')for(const key of Object.keys(rivalry))if(!String(key).startsWith(seasonPrefix)){delete rivalry[key];changed++}
 for(const programme of Object.values(s?.programmeEconomies||{})){
  const paid=programme?.bonusPaid;
  if(!paid||typeof paid!=='object')continue;
  for(const key of Object.keys(paid))if(!String(key).startsWith(seasonPrefix)){delete paid[key];changed++}
 }
 return changed;
}
function compactDecisionSystem(){
 const ds=s?.inboxDecisionSystem;if(!ds)return 0;
 let changed=0;
 if(Array.isArray(ds.archive)&&ds.archive.length>KEEP_DECISION_ARCHIVE){changed+=ds.archive.length-KEEP_DECISION_ARCHIVE;ds.archive=ds.archive.slice(-KEEP_DECISION_ARCHIVE)}
 const liveIds=new Set((s?.emails||[]).map(m=>String(m?.id||'')).filter(Boolean));
 for(const m of ds.archive||[])if(m?.id!=null)liveIds.add(String(m.id));
 for(const action of Object.values(ds.actions||{}))if(action?.emailId!=null)liveIds.add(String(action.emailId));
 if(ds.emailMeta&&typeof ds.emailMeta==='object')for(const id of Object.keys(ds.emailMeta))if(!liveIds.has(String(id))){delete ds.emailMeta[id];changed++}
 if(ds.actions&&typeof ds.actions==='object'){
  const entries=Object.entries(ds.actions),pending=entries.filter(([,a])=>a?.resolution==='awaiting_response'),completed=entries.filter(([,a])=>a?.resolution!=='awaiting_response');
  if(completed.length>KEEP_DECISION_COMPLETED_ACTIONS){const keep=new Set([...pending,...completed.slice(-KEEP_DECISION_COMPLETED_ACTIONS)].map(([id])=>id));for(const id of Object.keys(ds.actions))if(!keep.has(id)){delete ds.actions[id];changed++}}
 }
 return changed;
}
function compactState(){
 if(typeof s==='undefined'||!s)return {changed:0};
 let changed=0;
 changed+=compactHistory();
 changed+=compactManagement();
 changed+=compactSummit();
 changed+=compactProcessedGuards();
 changed+=compactDecisionSystem();
 if(Array.isArray(s.performances)&&s.performances.length>1000){changed+=s.performances.length-1000;s.performances=s.performances.slice(-1000)}
 counters.compactions++;
 counters.lastCompaction={season:nowSeason(),week:nowWeek(),changed};
 return {changed};
}

function physicalSave(context,args){
 if(!baseSave)return;
 compactState();
 counters.physicalSaves++;
 return baseSave.apply(context,args||[]);
}
function managedSave(...args){
 if(depth>0){dirty=true;counters.deferredSaves++;return}
 return physicalSave(this,args);
}
function flush(reason='batch'){
 if(depth>0||!dirty)return;
 dirty=false;
 counters.lastBatch=reason;
 return physicalSave(window,[]);
}
function begin(reason='batch'){
 depth++;
 counters.batches++;
 let ended=false;
 return function end(){
  if(ended)return;ended=true;
  depth=Math.max(0,depth-1);
  if(depth===0)flush(reason);
 };
}
function batch(fn,reason='batch'){
 const end=begin(reason);
 try{
  const out=fn();
  if(out&&typeof out.then==='function')return out.finally(end);
  end();return out;
 }catch(err){end();throw err}
}
function wrapGlobal(name,reason=name){
 const fn=window[name];
 if(typeof fn!=='function'||fn.__amPersistencePerformanceV1)return false;
 const wrapped=function(...args){return batch(()=>fn.apply(this,args),reason)};
 Object.defineProperty(wrapped,'__amPersistencePerformanceV1',{value:true});
 window[name]=wrapped;
 return true;
}
function wrapEconomyDecisions(){
 const api=window.AMProgrammeEconomy;
 if(!api?.decisionActions||!api.__athleteContractExpiryGateV1)return false;
 const fn=api.decisionActions;
 if(fn.__amPersistencePerformanceV1)return true;
 const wrapped=function(...args){return batch(()=>fn.apply(this,args),'programme-decisions')};
 Object.defineProperty(wrapped,'__amPersistencePerformanceV1',{value:true});
 api.decisionActions=wrapped;
 return true;
}
function scheduleEconomyWrap(){
 if(wrapEconomyDecisions())return;
 if(economyTimer)return;
 economyTimer=setTimeout(()=>{economyTimer=0;scheduleEconomyWrap()},50);
}
function install(){
 if(installed)return true;
 if(typeof save!=='function'){setTimeout(install,0);return false}
 baseSave=save;
 save=managedSave;
 window.save=managedSave;
 installed=true;
 for(const [name,reason] of [['advanceWeek','advance-week'],['simulateSummitMeeting','summit-meeting'],['simulateWholeEvent','whole-event'],['finishSummitMeeting','summit-finish'],['finaliseEvent','event-finalise'],['render','render']])wrapGlobal(name,reason);
 scheduleEconomyWrap();
 document.addEventListener('click',event=>{
  const target=event.target?.closest?.('#skipAllSummitNoEntry,[data-summit-skip]');
  if(!target)return;
  const end=begin('summit-skip-ui');
  queueMicrotask(end);
 },true);
 window.addEventListener('pagehide',()=>{if(dirty){depth=0;flush('pagehide')}},{capture:true});
 return true;
}
function metrics(){return {...counters,depth,dirty,installed}}
function resetMetrics(){counters.physicalSaves=0;counters.deferredSaves=0;counters.batches=0;counters.compactions=0;counters.lastBatch=null;counters.lastCompaction=null}
function holdBootstrapUntilContractGate(){
 const end=begin('bootstrap-contract-gate'),started=Date.now();
 const poll=()=>{
  if(window.__amAthleteContractExpiryGateV1||Date.now()-started>=5000){end();return}
  setTimeout(poll,25);
 };
 poll();
}

window.AMPersistencePerformance={version:VERSION,begin,batch,flush,compact:compactState,metrics,resetMetrics,wrapEconomyDecisions};
install();
holdBootstrapUntilContractGate();
})();
