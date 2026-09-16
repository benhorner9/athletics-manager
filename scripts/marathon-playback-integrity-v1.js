/* Athletics Manager — Marathon Playback Integrity V1
   Keeps the six-scene marathon highlight director authoritative during live playback.
   Prevents legacy road-start handlers from racing the highlight director, keeps the
   matchday shell in-progress until the finish, and never exposes the winner early. */
(function(){
'use strict';
if(window.__amMarathonPlaybackIntegrityV1)return;window.__amMarathonPlaybackIntegrityV1=1;
if(typeof document==='undefined')return;

const ROAD=new Set(['MMarathon','WMarathon']);
const isRoad=d=>ROAD.has(String(d||''))||!!(typeof DISCIPLINES!=='undefined'&&DISCIPLINES?.[d]?.road);
const api=()=>window.AMMarathonRoadBroadcastV3;
const live=()=>{try{return typeof liveEventView!=='undefined'?liveEventView:null}catch(_){return null}};
const disc=()=>{try{return typeof activeEventDisc!=='undefined'?activeEventDisc:null}catch(_){return null}};
function resolveEvent(d){
 try{
  const lv=live();if(lv?.event&&(!d||lv.disc===d))return lv.event;
  if(typeof currentEvent==='function'){const e=currentEvent();if(e&&(e.disc||[]).includes(d))return e}
  return (typeof s!=='undefined'&&s?.events||[]).find(e=>Number(e?.week)===Number(s?.game?.week)&&(e?.disc||[]).includes(d)&&e?.roadRace)||null;
 }catch(_){return null}
}
function playback(){
 const lv=live(),a=api();if(!a?.direct||!lv?.event||!isRoad(lv.disc)||!Array.isArray(lv.results))return null;
 const plan=a.direct(lv.event,lv.disc,lv.results),max=Math.max(0,plan.highlights.length-1),index=Math.max(0,Math.min(Number(lv.index)||0,max)),h=plan.highlights[index];
 if(!h)return null;return{lv,event:lv.event,disc:lv.disc,plan,index,h}
}
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
function syncShell(){
 const c=playback();if(!c)return false;
 const root=document.querySelector('.road-matchday');if(!root)return false;root.classList.add('road-playback-integrity-v1');
 const commentary=document.getElementById('commentary');
 if(commentary&&c.h.commentary){
  if(typeof matchdayCommentaryHTML==='function'){
   const html=matchdayCommentaryHTML(c.h.commentary);if(commentary.innerHTML!==html)commentary.innerHTML=html;
  }else setText(commentary,c.h.commentary);
 }
 const liveRow=root.querySelector('.matchday-live-row');
 if(liveRow){
  if(!liveRow.querySelector('.matchday-live-dot')){const dot=document.createElement('i');dot.className='matchday-live-dot';liveRow.prepend(dot)}
  const label=liveRow.querySelector('small'),phase=c.h.phase==='finish'?'FINISH':`HIGHLIGHT ${c.index+1}/${c.plan.highlights.length}`;setText(label,`${phase} • 42.195 KM`);
 }
 for(const id of ['startDiscipline','startDisciplineTop']){
  const b=document.getElementById(id);if(!b)continue;b.disabled=true;b.classList.remove('good');b.classList.add('primary');setText(b,'IN PROGRESS');
 }
 const cells=[...root.querySelectorAll('.matchday-dash-cell')];for(const cell of cells){if(/controls/i.test(cell.querySelector('.matchday-dash-label')?.textContent||'')){setText(cell.querySelector('.matchday-dash-main'),'Watching highlights');break}}
 return true
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;try{syncShell()}catch(err){console.warn('[Marathon Integrity] shell sync failed',err)}})}

/* Capture the start controls before legacy road handlers can fire. The public V3
   director is the only accepted marathon start path once it is available. */
document.addEventListener('click',event=>{
 const target=event.target instanceof Element?event.target.closest('#startDiscipline,#startDisciplineTop'):null;if(!target||target.disabled)return;
 const d=disc(),a=api();if(!isRoad(d)||typeof a?.start!=='function')return;
 const e=resolveEvent(d);if(!e||Array.isArray(e.results?.[d]))return;
 event.preventDefault();event.stopImmediatePropagation();a.start(e,d);schedule();
},true);

const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('pageshow',schedule);window.addEventListener('orientationchange',()=>setTimeout(schedule,80));
setInterval(schedule,500);
window.AMMarathonPlaybackIntegrityV1={version:1,sync:syncShell,playback,debug:()=>{const c=playback();return{installed:true,active:!!c,index:c?.index??null,type:c?.h?.type??null,phase:c?.h?.phase??null,resultsCommitted:!!(c&&Array.isArray(c.event?.results?.[c.disc]))}}};
schedule();
})();
