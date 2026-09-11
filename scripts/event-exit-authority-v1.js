/* ===== Event Exit Authority V1 ===== */
(function(){
'use strict';
if(window.__amEventExitAuthorityV1)return;window.__amEventExitAuthorityV1=1;

function currentWeek(){return Number(s?.game?.week)||0}
function normalEventsThisWeek(){
 return (s?.events||[]).filter(e=>Number(e?.week)===currentWeek()&&['competition','championship','olympics','testing'].includes(e?.kind));
}
function completedEventForScreen(){
 const live=typeof liveEventView!=='undefined'?liveEventView:null;
 const liveEvent=live?.event;
 if(liveEvent?.completed&&!liveEvent?.__summit)return liveEvent;
 const events=normalEventsThisWeek();
 const d=typeof activeEventDisc!=='undefined'?activeEventDisc:null;
 if(d){
  const hit=events.find(e=>e?.completed&&Array.isArray(e?.results?.[d]));
  if(hit)return hit;
 }
 return events.find(e=>e?.completed)||null;
}
function sealIfResultsComplete(e){
 if(!e||e.__summit)return false;
 const discs=(e.disc||[]).filter(d=>d!=='ALL');
 if(!discs.length||!discs.every(d=>Array.isArray(e?.results?.[d])))return !!e.completed;
 e.completed=true;
 e.decision=true;
 return true;
}
function hardHomeFallback(){
 try{currentView='home'}catch(_){}
 document.body.classList.remove('event-focus');
 document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id==='home'));
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view==='home'));
 const kicker=document.getElementById('pageKicker'),title=document.getElementById('pageTitle');
 try{if(kicker)kicker.textContent=nationName(managedNation()).toUpperCase()}catch(_){if(kicker)kicker.textContent='NATIONAL PROGRAMME'}
 if(title)title.textContent='Performance Centre';
 try{renderView('home')}catch(_){try{drawHome()}catch(__){}}
 try{resetScreenPosition()}catch(_){}
}
function leaveCompletedEvent(){
 const e=completedEventForScreen();
 if(e)sealIfResultsComplete(e);
 try{disciplineRunning=false}catch(_){}
 try{liveEventView=null}catch(_){}
 try{activeEventDisc=null}catch(_){}
 try{competitionMode='overview'}catch(_){}
 try{save()}catch(_){}
 let left=false;
 try{view('home');left=typeof currentView==='undefined'||currentView==='home'}catch(_){}
 queueMicrotask(()=>{
  if(!left||typeof currentView!=='undefined'&&currentView!=='home')hardHomeFallback();
  try{save()}catch(_){}
 });
 try{toast('Event complete')}catch(_){}
}

try{if(typeof returnFromCompletedEvent==='function')returnFromCompletedEvent=leaveCompletedEvent}catch(_){}

document.addEventListener('click',event=>{
 if(typeof currentView!=='undefined'&&currentView!=='competition')return;
 const button=event.target.closest('button');
 if(!button)return;
 const label=String(button.textContent||'').trim().toUpperCase();
 const exitControl=button.matches('#completeEventReturn,.event-complete-return,[data-core-home],.flow-event-exit.home-return')||/COMPLETE EVENT|RETURN TO GAME|RETURN HOME/.test(label);
 if(!exitControl)return;
 const e=completedEventForScreen();
 if(!e&&!normalEventsThisWeek().some(sealIfResultsComplete))return;
 event.preventDefault();
 event.stopImmediatePropagation();
 leaveCompletedEvent();
},true);

window.__athleticsEventExitAuthority={version:1,leave:leaveCompletedEvent};
})();
/* ===== End Event Exit Authority V1 ===== */
