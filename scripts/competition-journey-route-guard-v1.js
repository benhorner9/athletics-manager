/* Athletics Manager — Competition Journey route guard V3
   Keeps Competition routed to the canonical event surface, resolves Summit/normal-event
   collisions deterministically, and silently retries short-lived hand-off misses before
   the UI cutover recovery boundary can fire. */
(function(){
'use strict';
if(window.__amCompetitionJourneyRouteGuardV1)return;window.__amCompetitionJourneyRouteGuardV1=1;
if(typeof drawCompetition!=='function')return;
const candidate=drawCompetition;
let historicalEventId=null;
let recoveryTicket=0;
const baseView=view;
const CANONICAL='.cj,.v3event,[data-am-ui-screen="competition-v2"]';
function competitionRoot(){return document.getElementById('competition')}
function hasCanonicalSurface(){const root=competitionRoot();if(!root)return false;try{return !!(root.matches?.(CANONICAL)||root.querySelector(CANONICAL))}catch(_){return false}}
function competitionActive(){try{return typeof currentView==='string'&&currentView==='competition'}catch(_){return false}}
function explicitSummitMeeting(){
 try{
  if(typeof summitLiveMeetingNumber==='undefined'||!summitLiveMeetingNumber||typeof summitSeasonState!=='function')return null;
  const m=summitSeasonState()?.meetings?.[summitLiveMeetingNumber]||null;
  if(!m||Number(m.week)!==Number(s?.game?.week))return null;
  return m;
 }catch(_){return null}
}
function normalCurrentEvent(){try{return typeof currentEvent==='function'?currentEvent():null}catch(_){return null}}
function summitExistsThisWeek(){try{return typeof summitCurrentLiveMeeting==='function'?summitCurrentLiveMeeting():null}catch(_){return null}}
function asSummitBlock(m){
 if(!m)return null;
 m.kind='summit';
 m.disc=Object.keys(typeof DISCIPLINES!=='undefined'?DISCIPLINES:{});
 m.name=m.name||`Summit Series ${m.number}`;
 m.level='Summit Series';
 return m;
}
function runCandidateWithRouteAuthority(ctx,args){
 const explicit=explicitSummitMeeting();
 if(explicit){
  const originalBlocking=window.currentBlocking;
  try{
   window.currentBlocking=()=>asSummitBlock(explicit);
   return candidate.apply(ctx,args);
  }finally{
   if(originalBlocking)window.currentBlocking=originalBlocking;
  }
 }
 const normal=normalCurrentEvent(),summit=summitExistsThisWeek();
 if(normal&&summit&&typeof window.summitCurrentLiveMeeting==='function'){
  const originalSummitCurrent=window.summitCurrentLiveMeeting;
  try{
   window.summitCurrentLiveMeeting=()=>null;
   return candidate.apply(ctx,args);
  }finally{
   window.summitCurrentLiveMeeting=originalSummitCurrent;
  }
 }
 return candidate.apply(ctx,args);
}
function retryCandidate(my){
 if(my!==recoveryTicket||!competitionActive()||hasCanonicalSurface())return;
 try{runCandidateWithRouteAuthority(this,[])}catch(err){console.warn('[Athletics Manager] Competition hand-off retry failed',err)}
}
function scheduleRecovery(){
 if(!competitionActive()||hasCanonicalSurface())return;
 const my=++recoveryTicket;
 [0,90,220,420].forEach(delay=>setTimeout(()=>retryCandidate(my),delay));
}
view=function(name){
 if(name!=='competition'){historicalEventId=null;recoveryTicket++}
 return baseView.apply(this,arguments)
};
function isHistorical(id){return historicalEventId!=null&&String(id)===String(historicalEventId)}
drawCompetition=function(){
 const explicit=explicitSummitMeeting();
 try{
  const current=normalCurrentEvent();
  if(!explicit&&current&&!isHistorical(s.uiCompetitionV2?.eventId)&&typeof competitionMode!=='undefined'&&competitionMode!=='discipline'){
   s.uiCompetitionV2??={};
   s.uiCompetitionV2.eventId=current.id;
  }
 }catch(_){}
 let out;
 try{out=runCandidateWithRouteAuthority(this,arguments)}
 catch(err){
  console.warn('[Athletics Manager] Competition first render deferred for recovery',err);
  scheduleRecovery();
  return;
 }
 if(competitionActive()&&!hasCanonicalSurface())scheduleRecovery();
 return out;
};
window.__athleticsCompetitionJourneyRouteGuard={
 version:3,
 isHistorical,
 setHistoricalEvent:id=>{historicalEventId=id},
 hasCanonicalSurface,
 scheduleRecovery,
 explicitSummitMeeting,
 debugRoute:()=>({explicitSummit:explicitSummitMeeting()?.number||null,normalEvent:normalCurrentEvent()?.id||null,summitThisWeek:summitExistsThisWeek()?.number||null,canonical:hasCanonicalSurface()})
};
})();
