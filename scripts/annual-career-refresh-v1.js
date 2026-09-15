/* Athletics Manager — Annual Career Refresh V1
   Runs once at each calendar-year rollover. Removes transient season state while
   preserving permanent career history, athlete development and management records. */
(function(){
'use strict';
if(window.__amAnnualCareerRefreshV1)return;
window.__amAnnualCareerRefreshV1=1;

const VERSION=1;
const KEEP_TECH_LOG=20;
const safe=(fn,fallback)=>{try{const value=fn();return value==null?fallback:value}catch(_){return fallback}};

function countObject(value){return value&&typeof value==='object'?Object.keys(value).length:0}
function state(){
 if(typeof s==='undefined'||!s)return null;
 s.annualCareerRefresh??={version:VERSION,runs:0,lastCompletedSeason:null,lastSummary:null};
 s.annualCareerRefresh.version=VERSION;
 return s.annualCareerRefresh;
}
function cleanupDecisionSystem(){
 const ds=s?.inboxDecisionSystem;
 if(!ds||typeof ds!=='object')return {archiveRemoved:0,actionsRemoved:0,metaRemoved:0,logRemoved:0};
 const pendingEntries=Object.entries(ds.actions||{}).filter(([,action])=>action?.resolution==='awaiting_response');
 const pendingIds=new Set(pendingEntries.map(([,action])=>String(action?.emailId||'')).filter(Boolean));
 const liveMailIds=new Set((s.emails||[]).map(mail=>String(mail?.id||'')).filter(Boolean));
 for(const id of pendingIds)liveMailIds.add(id);
 const archiveBefore=Array.isArray(ds.archive)?ds.archive.length:0;
 if(Array.isArray(ds.archive))ds.archive=ds.archive.filter(mail=>pendingIds.has(String(mail?.id||'')));
 const actionsBefore=countObject(ds.actions);
 if(ds.actions&&typeof ds.actions==='object')ds.actions=Object.fromEntries(pendingEntries);
 const metaBefore=countObject(ds.emailMeta);
 if(ds.emailMeta&&typeof ds.emailMeta==='object')for(const id of Object.keys(ds.emailMeta))if(!liveMailIds.has(String(id)))delete ds.emailMeta[id];
 const logBefore=Array.isArray(ds.log)?ds.log.length:0;
 if(Array.isArray(ds.log)&&ds.log.length>KEEP_TECH_LOG)ds.log=ds.log.slice(-KEEP_TECH_LOG);
 return {
  archiveRemoved:Math.max(0,archiveBefore-(Array.isArray(ds.archive)?ds.archive.length:0)),
  actionsRemoved:Math.max(0,actionsBefore-countObject(ds.actions)),
  metaRemoved:Math.max(0,metaBefore-countObject(ds.emailMeta)),
  logRemoved:Math.max(0,logBefore-(Array.isArray(ds.log)?ds.log.length:0))
 };
}
function run(completedSeason=Number(safe(()=>s.game.season,0))||0){
 const meta=state();if(!meta)return {ran:false,reason:'no-state'};
 if(Number(meta.lastCompletedSeason)===Number(completedSeason))return {ran:false,reason:'already-refreshed',summary:meta.lastSummary||null};
 const before={
  emails:Array.isArray(s.emails)?s.emails.length:0,
  news:Array.isArray(s.news)?s.news.length:0,
  events:Array.isArray(s.events)?s.events.length:0,
  plans:Array.isArray(s.plans)?s.plans.length:0,
  leagues:countObject(s.leagues)
 };
 const emailRemoved=Number(safe(()=>typeof pruneOldEmails==='function'?pruneOldEmails():0,0))||0;
 const decision=cleanupDecisionSystem();
 const newsRemoved=Array.isArray(s.news)?s.news.length:0;if(Array.isArray(s.news))s.news=[];
 const eventsRemoved=Array.isArray(s.events)?s.events.length:0;if(Array.isArray(s.events))s.events=[];
 const plansRemoved=Array.isArray(s.plans)?s.plans.length:0;if(Array.isArray(s.plans))s.plans=[];
 const leaguesRemoved=countObject(s.leagues);if(s.leagues&&typeof s.leagues==='object')s.leagues={};
 const compact=window.AMPersistencePerformance?.compact?.()||{changed:0};
 const summary={
  completedSeason:Number(completedSeason)||0,
  careerWeek:Number(safe(()=>s.game.careerWeek,0))||0,
  emailRemoved,
  newsRemoved,
  eventsRemoved,
  plansRemoved,
  leaguesRemoved,
  decision,
  compacted:Number(compact?.changed)||0,
  before
 };
 meta.runs=(Number(meta.runs)||0)+1;
 meta.lastCompletedSeason=Number(completedSeason)||0;
 meta.lastSummary=summary;
 return {ran:true,summary};
}
function install(){
 const base=window.endSeason;
 if(typeof base!=='function'){setTimeout(install,0);return false}
 if(base.__amAnnualCareerRefreshV1)return true;
 const wrapped=function(...args){run(Number(safe(()=>s.game.season,0))||0);return base.apply(this,args)};
 Object.defineProperty(wrapped,'__amAnnualCareerRefreshV1',{value:true});
 window.endSeason=wrapped;
 try{endSeason=wrapped}catch(_){}
 return true;
}

window.AMAnnualCareerRefresh={version:VERSION,run,state,cleanupDecisionSystem};
install();
})();
