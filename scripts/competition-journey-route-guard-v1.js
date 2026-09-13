/* Athletics Manager — Competition Journey route guard V2
   Keeps Competition routed to the canonical event surface and silently retries short-lived
   Summit/Competition hand-off misses before the UI cutover recovery boundary can fire. */
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
function retryCandidate(my){
 if(my!==recoveryTicket||!competitionActive()||hasCanonicalSurface())return;
 try{candidate()}catch(err){console.warn('[Athletics Manager] Competition hand-off retry failed',err)}
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
 try{
  const current=typeof currentEvent==='function'?currentEvent():null;
  if(current&&!isHistorical(s.uiCompetitionV2?.eventId)&&typeof competitionMode!=='undefined'&&competitionMode!=='discipline'){
   s.uiCompetitionV2??={};
   s.uiCompetitionV2.eventId=current.id;
  }
 }catch(_){}
 let out;
 try{out=candidate.apply(this,arguments)}
 catch(err){
  console.warn('[Athletics Manager] Competition first render deferred for recovery',err);
  scheduleRecovery();
  return;
 }
 if(competitionActive()&&!hasCanonicalSurface())scheduleRecovery();
 return out;
};
window.__athleticsCompetitionJourneyRouteGuard={version:2,isHistorical,setHistoricalEvent:id=>{historicalEventId=id},hasCanonicalSurface,scheduleRecovery};
})();