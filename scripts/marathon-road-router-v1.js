/* Athletics Manager — Marathon Road Router V1
   Keeps the dedicated road presentation authoritative for marathon disciplines
   without changing Live Event Broadcast V4 for stadium events. */
(function(){
'use strict';
if(window.__amMarathonRoadRouterV1)return;window.__amMarathonRoadRouterV1=1;
if(!window.__amMarathonRoadV1||typeof drawCompetition!=='function'||typeof drawDisciplineScreen!=='function')return;

const previousCompetition=drawCompetition;
/* Captured immediately after marathon-road-v1 loads, while its road-aware
   drawDisciplineScreen wrapper is authoritative. */
const roadAwareDisciplineDraw=drawDisciplineScreen;
const isRoad=d=>['MMarathon','WMarathon'].includes(String(d||''))||!!DISCIPLINES?.[d]?.road;

function resolveCompetitionEvent(){
 try{
  return currentEvent()
   ||s.events.filter(x=>x.completed&&['competition','championship','olympics','testing'].includes(x.kind)).slice(-1)[0]
   ||s.events.find(x=>!x.completed&&['competition','championship','olympics'].includes(x.kind))
   ||nextEvent();
 }catch(_){return null}
}

drawCompetition=function(){
 const e=resolveCompetitionEvent();
 if(e&&competitionMode==='discipline'){
  const discs=(e.disc||[]).filter(d=>d!=='ALL');
  if(!activeEventDisc||!discs.includes(activeEventDisc))activeEventDisc=discs[0];
  if(isRoad(activeEventDisc)){
   const live=e.week===s.game.week&&!e.completed;
   e.results=e.results||{};
   return roadAwareDisciplineDraw(e,live,discs);
  }
 }
 return previousCompetition();
};

window.AMMarathonRoadRouterV1={version:1,isRoad};
})();
