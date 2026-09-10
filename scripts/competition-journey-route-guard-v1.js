/* Athletics Manager — Competition Journey route guard V1
   Migration-only safety: when Event Day is active, the Competition route must never reopen a stale historical event. */
(function(){
'use strict';
if(window.__amCompetitionJourneyRouteGuardV1)return;window.__amCompetitionJourneyRouteGuardV1=1;
if(typeof drawCompetition!=='function')return;
const candidate=drawCompetition;
drawCompetition=function(){
 try{
  const current=typeof currentEvent==='function'?currentEvent():null;
  if(current&&typeof competitionMode!=='undefined'&&competitionMode!=='discipline'){
   s.uiCompetitionV2??={};
   s.uiCompetitionV2.eventId=current.id;
  }
 }catch(_){}
 return candidate.apply(this,arguments);
};
window.__athleticsCompetitionJourneyRouteGuard={version:1};
})();