/* Athletics Manager — Competition Journey route guard V1
   Migration-only safety: when Event Day is active, the Competition route must never reopen a stale historical event. */
(function(){
'use strict';
if(window.__amCompetitionJourneyRouteGuardV1)return;window.__amCompetitionJourneyRouteGuardV1=1;
if(typeof drawCompetition!=='function')return;
const candidate=drawCompetition;
let historicalEventId=null;
const baseView=view;
view=function(name){if(name!=='competition')historicalEventId=null;return baseView.apply(this,arguments)};
function isHistorical(id){return historicalEventId!=null&&String(id)===String(historicalEventId)}
drawCompetition=function(){
 try{
  const current=typeof currentEvent==='function'?currentEvent():null;
  if(current&&!isHistorical(s.uiCompetitionV2?.eventId)&&typeof competitionMode!=='undefined'&&competitionMode!=='discipline'){
   s.uiCompetitionV2??={};
   s.uiCompetitionV2.eventId=current.id;
  }
 }catch(_){}
 return candidate.apply(this,arguments);
};
window.__athleticsCompetitionJourneyRouteGuard={version:1,isHistorical,setHistoricalEvent:id=>{historicalEventId=id}};
})();