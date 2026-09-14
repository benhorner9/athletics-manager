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
const KEEP_ATHLETE_RESULTS=120;
const KEEP_RESULT_INTEL=4;
const KEEP_STORY_MEMORIES=40;
const KEEP_OPPOSITION_STORY_RECENT=12;
const KEEP_OPPOSITION_STORY_TOTAL=20;
const KEEP_DEVELOPMENT_HISTORY=30;
const KEEP_OPPOSITION_DEVELOPMENT_HISTORY=6;
const KEEP_TRAIT_HISTORY=12;
const KEEP_LIVING_WORLD_MOMENTS=180;
const KEEP_LIVING_WORLD_PROCESSED=800;
const SAVE_KEY_NAME='rto_full_game_v1';
const STORY_PIN_TYPES=['Call-up','Breakthrough win','Comeback','Rivalry','World record','Olympic medal','Injury','Recovery'];
const HIDDEN_ATHLETE_KEEP=new Set([
 'id','name','nation','disc','age','overall','potential','devProjectionBase','devProjectionScoutLevel',
 'fitness','form','fatigue','pb','tier','points','injury','medals','training','inSquad','source',
 'assessmentIntroduced','visualGroup','portraitSlot','scoutingHidden','scoutingRegion',
 'hiddenEnteredSeason','hiddenEnteredWeek','hiddenVisibility','retired',
 'dateOfBirth','birthPlace','athleticsClubId','athleticsClub','athleticsClubHome'
]);
const FOREIGN_KNOWLEDGE_KEEP=new Set(['athleteId','evidence','stage','lastObservedCW','stale']);
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
function trimArray(owner,key,limit){
 const rows=owner?.[key];if(!Array.isArray(rows)||rows.length<=limit)return 0;
 const removed=rows.length-limit;owner[key]=rows.slice(-limit);return removed;
}
function compactProfileResults(athlete){
 const rows=athlete?.profileResults;if(!Array.isArray(rows))return 0;
 let changed=trimArray(athlete,'profileResults',KEEP_ATHLETE_RESULTS);
 const kept=athlete.profileResults||[];
 const intelIndexes=kept.map((row,index)=>row?.intel?index:-1).filter(index=>index>=0);
 const keepIntel=new Set(intelIndexes.slice(-KEEP_RESULT_INTEL));
 for(let i=0;i<kept.length;i++){
  const row=kept[i];if(!row||typeof row!=='object')continue;
  if(row.intel&&!keepIntel.has(i)){delete row.intel;changed++}
  if(row.intelContext){delete row.intelContext;changed++}
 }
 return changed;
}
function compactStoryMemories(athlete){
 const story=athlete?.story,rows=story?.memories;if(!Array.isArray(rows))return 0;
 const managed=athlete?.nation===s?.managedNation;
 if(managed)return trimArray(story,'memories',KEEP_STORY_MEMORIES);
 const chosen=new Set();
 for(let i=Math.max(0,rows.length-KEEP_OPPOSITION_STORY_RECENT);i<rows.length;i++)chosen.add(i);
 for(const type of STORY_PIN_TYPES){for(let i=rows.length-1;i>=0;i--)if(rows[i]?.type===type){chosen.add(i);break}}
 let indexes=[...chosen].sort((a,b)=>a-b);
 if(indexes.length>KEEP_OPPOSITION_STORY_TOTAL){
  const recentFloor=Math.max(0,rows.length-KEEP_OPPOSITION_STORY_RECENT);
  const pinned=new Set();
  for(const type of STORY_PIN_TYPES){for(let i=rows.length-1;i>=0;i--)if(rows[i]?.type===type){pinned.add(i);break}}
  const recent=indexes.filter(i=>i>=recentFloor),olderPinned=indexes.filter(i=>i<recentFloor&&pinned.has(i));
  indexes=[...olderPinned.slice(-(KEEP_OPPOSITION_STORY_TOTAL-recent.length)),...recent].sort((a,b)=>a-b);
 }
 if(indexes.length===rows.length&&indexes.every((value,index)=>value===index))return 0;
 const next=indexes.map(i=>rows[i]);const changed=Math.max(0,rows.length-next.length);story.memories=next;return changed;
}
function compactDevelopment(athlete){
 const development=athlete?.attributeDevelopment;if(!development)return 0;
 const managed=athlete?.nation===s?.managedNation;
 let changed=trimArray(development,'history',managed?KEEP_DEVELOPMENT_HISTORY:KEEP_OPPOSITION_DEVELOPMENT_HISTORY);
 if(!managed&&development.lastSession){delete development.lastSession;changed++}
 return changed;
}
function compactAthletes(){
 let changed=0;
 for(const athlete of s?.athletes||[]){
  changed+=compactProfileResults(athlete);
  changed+=compactStoryMemories(athlete);
  changed+=compactDevelopment(athlete);
  changed+=trimArray(athlete?.traitState,'history',KEEP_TRAIT_HISTORY);
 }
 return changed;
}
function compactScouting(){
 const root=s?.scoutingV2,nations=root?.nations;if(!nations||typeof nations!=='object')return 0;
 let changed=0;
 const managed=String(safe(()=>typeof managedNation==='function'?managedNation():s?.managedNation,s?.managedNation)||'');
 const activeByNation=new Map();
 for(const athlete of s?.athletes||[]){
  if(!athlete||athlete.retired)continue;
  const nation=String(athlete.nation||'');if(!nation)continue;
  if(!activeByNation.has(nation))activeByNation.set(nation,new Set());
  activeByNation.get(nation).add(String(athlete.id));
 }
 for(const [nation,org] of Object.entries(nations)){
  if(!org||typeof org!=='object')continue;
  if(Array.isArray(org.hiddenTalent))for(const athlete of org.hiddenTalent){
   if(!athlete||typeof athlete!=='object')continue;
   for(const key of Object.keys(athlete))if(!HIDDEN_ATHLETE_KEEP.has(key)){delete athlete[key];changed++}
  }
  if(String(nation)===managed)continue;
  const liveIds=activeByNation.get(String(nation))||new Set();
  const knowledge=org.knowledge;
  if(knowledge&&typeof knowledge==='object')for(const [id,row] of Object.entries(knowledge)){
   if(!liveIds.has(String(id))){delete knowledge[id];changed++;continue}
   if(!row||typeof row!=='object')continue;
   for(const key of Object.keys(row))if(!FOREIGN_KNOWLEDGE_KEEP.has(key)){delete row[key];changed++}
  }
 }
 return changed;
}
function compactExpiryEmails(){
 const emails=s?.emails;if(!Array.isArray(emails)||emails.length<2)return 0;
 const kept=[],byAction=new Map();let changed=0;
 for(const mail of emails){
  const actionId=String(mail?.programmeAction?.actionId||'');
  const expiry=mail?.contractExpiryDecision===true||actionId.startsWith('economy:athlete-expiry:');
  if(!expiry||!actionId){kept.push(mail);continue}
  const existing=byAction.get(actionId);
  if(!existing){byAction.set(actionId,mail);kept.push(mail);continue}
  existing.unread=!!(existing.unread||mail.unread);
  if(!existing.contractExpiryResolution&&mail.contractExpiryResolution)existing.contractExpiryResolution=mail.contractExpiryResolution;
  if(!existing.programmeAction&&mail.programmeAction)existing.programmeAction=mail.programmeAction;
  changed++;
 }
 if(changed)s.emails=kept;
 return changed;
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
  if(!result||!Array.isArray(result.rows)||result.persistenceCompactV1)continue;
  result.rows=compactRows(result.rows);result.persistenceCompactV1=1;changed++;
 }
 for(const dossier of Object.values(management.coachArchive||{})){
  for(const result of Object.values(dossier?.results||{})){
   if(!result||!Array.isArray(result.rows)||result.persistenceCompactV1)continue;
   result.rows=compactRows(result.rows);result.persistenceCompactV1=1;changed++;
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
   if(!meeting?.completed||meeting.persistenceCompactV1)continue;
   const historical=season&&season<currentSeason;
   const passedThisSeason=season===currentSeason&&Number(meeting.week||0)<currentWeek;
   if(!historical&&!passedThisSeason)continue;
   if(meeting.results)compactResultMap(meeting.results);
   if(meeting.fields&&Object.keys(meeting.fields).length)delete meeting.fields;
   meeting.persistenceCompactV1=1;changed++;
  }
 }
 return changed;
}
function compactLivingWorld(){
 const world=s?.livingWorld;if(!world||typeof world!=='object')return 0;
 let changed=0;
 if(world.persistenceMigrationV1!==1){world.persistenceMigrationV1=1;changed++}
 if(Array.isArray(world.moments)&&world.moments.length>KEEP_LIVING_WORLD_MOMENTS){changed+=world.moments.length-KEEP_LIVING_WORLD_MOMENTS;world.moments=world.moments.slice(-KEEP_LIVING_WORLD_MOMENTS)}
 const processed=world.processed;
 if(processed&&typeof processed==='object'){
  const keys=Object.keys(processed);
  if(keys.length>KEEP_LIVING_WORLD_PROCESSED){for(const key of keys.slice(0,keys.length-KEEP_LIVING_WORLD_PROCESSED)){delete processed[key];changed++}}
 }
 const currentSeason=nowSeason();
 for(const state of Object.values(world.athletes||{})){
  if(!state||typeof state!=='object')continue;
  if(state.lastMoment){delete state.lastMoment;changed++}
  const flags=state.flags;
  if(flags&&typeof flags==='object')for(const key of Object.keys(flags))if(key.startsWith('upset:')){
   const season=Number(key.slice(6));if(Number.isFinite(season)&&season<currentSeason-1){delete flags[key];changed++}
  }
 }
 return changed;
}
function persistedLivingWorld(){
 try{
  if(typeof localStorage==='undefined')return null;
  const raw=localStorage.getItem(SAVE_KEY_NAME);if(!raw)return null;
  const decoded=window.AMCareerSaveCodec?window.AMCareerSaveCodec.decode(raw):raw;
  const parsed=JSON.parse(decoded),world=parsed?.livingWorld;
  return world?.persistenceMigrationV1===1?world:null;
 }catch(_){return null}
}
function reconcileLivingWorld(savedWorld){
 if(!savedWorld||typeof s==='undefined'||!s)return false;
 const world=s.livingWorld;if(!world||typeof world!=='object')return false;
 world.moments=Array.isArray(savedWorld.moments)?savedWorld.moments:[];
 world.processed=savedWorld.processed&&typeof savedWorld.processed==='object'?savedWorld.processed:{};
 world.athletes=savedWorld.athletes&&typeof savedWorld.athletes==='object'?savedWorld.athletes:{};
 world.persistenceMigrationV1=1;
 return true;
}
function installLoadReconcile(){
 const fn=window.load;if(typeof fn!=='function'||fn.__amPersistenceLivingWorldLoadV1)return false;
 const wrapped=function(...args){
  const savedWorld=persistedLivingWorld(),out=fn.apply(this,args);
  const finish=value=>{reconcileLivingWorld(savedWorld);return value};
  return out&&typeof out.then==='function'?out.then(finish):finish(out);
 };
 Object.defineProperty(wrapped,'__amPersistenceLivingWorldLoadV1',{value:true});
 window.load=wrapped;try{load=wrapped}catch(_){}
 reconcileLivingWorld(persistedLivingWorld());
 return true;
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
 changed+=compactAthletes();
 changed+=compactScouting();
 changed+=compactExpiryEmails();
 changed+=compactHistory();
 changed+=compactManagement();
 changed+=compactSummit();
 changed+=compactLivingWorld();
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
 installLoadReconcile();
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

window.AMPersistencePerformance={version:VERSION,begin,batch,flush,compact:compactState,metrics,resetMetrics,wrapEconomyDecisions,reconcileLivingWorld};
install();
holdBootstrapUntilContractGate();
})();