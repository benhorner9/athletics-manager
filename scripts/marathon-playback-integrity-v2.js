/* Athletics Manager — Marathon Playback Integrity V2
   Runtime authority for marathon playback. This layer loads before the late marathon
   presentation stack on dev, blocks legacy result commits while V3 is active, routes
   every road-race start through the V3 highlight director, repairs stale live context,
   and makes sure each highlight/result actually reaches the screen. */
(function(){
'use strict';
if(window.__amMarathonPlaybackIntegrityV2)return;window.__amMarathonPlaybackIntegrityV2=1;
if(typeof document==='undefined')return;

const VERSION=2;
const ROAD=new Set(['MMarathon','WMarathon']);
const isRoad=d=>ROAD.has(String(d||''))||!!(typeof DISCIPLINES!=='undefined'&&DISCIPLINES?.[d]?.road);
const api=()=>window.AMMarathonRoadBroadcastV3;
const activeDisc=()=>{try{return typeof activeEventDisc!=='undefined'?activeEventDisc:null}catch(_){return null}};
const live=()=>{try{return typeof liveEventView!=='undefined'?liveEventView:null}catch(_){return null}};
const debug=()=>{try{return api()?.debug?.()||null}catch(_){return null}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
let remembered={event:null,disc:null,results:null,lines:null};
let pendingStart=null;
let authorizedCommitKey=null;
let blockedCommits=0;
let authorizedCommits=0;
let repairedContexts=0;
let forcedStages=0;
let forcedResults=0;
let queued=false;

function eventKey(e,d){return `${String(e?.id||e?.name||'road')}|${String(d||'')}`}
function injectStaticRoadStyle(){
 if(document.getElementById('amMarathonPlaybackIntegrityV2Style'))return;
 const style=document.createElement('style');style.id='amMarathonPlaybackIntegrityV2Style';style.textContent=`
 .road-matchday .road-v3-road-mark,
 .road-matchday .road-v3-scroll-far,
 .road-matchday .road-v3-scroll-near{animation:none!important}
 `;document.head.appendChild(style);
}
function resolveEvent(d){
 try{
  const lv=live();if(lv?.event&&(!d||lv.disc===d))return lv.event;
  if(remembered.event&&(!d||remembered.disc===d))return remembered.event;
  if(typeof currentEvent==='function'){const e=currentEvent();if(e&&(!d||(e.disc||[]).includes(d)))return e}
  return (typeof s!=='undefined'&&s?.events||[]).find(e=>Number(e?.week)===Number(s?.game?.week)&&(e?.disc||[]).includes(d)&&e?.roadRace)||null;
 }catch(_){return null}
}
function rememberLive(){
 const lv=live();if(!lv?.event||!isRoad(lv.disc)||!Array.isArray(lv.results))return false;
 remembered={event:lv.event,disc:lv.disc,results:lv.results,lines:Array.isArray(lv.lines)?lv.lines:null};return true
}
function session(){
 const a=api(),dbg=debug();if(!a||!dbg)return null;
 const d=dbg.disc||remembered.disc||activeDisc(),e=remembered.event||resolveEvent(d),lv=live(),results=(lv?.event===e&&lv?.disc===d&&Array.isArray(lv.results)?lv.results:remembered.results);
 if(!e||!isRoad(d)||!Array.isArray(results))return null;
 const plan=a.direct(e,d,results),total=plan?.highlights?.length||0;if(!total)return null;
 const index=clamp(Number(dbg.index),0,total-1),h=plan.highlights[index];if(!h)return null;
 return{a,dbg,event:e,disc:d,results,plan,total,index,h}
}
function restoreLive(c){
 let lv=live();
 if(!lv||lv.event!==c.event||lv.disc!==c.disc||!Array.isArray(lv.results)){
  const lines=c.plan.highlights.map(h=>h.commentary);try{liveEventView={event:c.event,disc:c.disc,results:c.results,lines,index:c.index}}catch(_){};window.liveEventView=typeof liveEventView!=='undefined'?liveEventView:{event:c.event,disc:c.disc,results:c.results,lines,index:c.index};
  lv=live();repairedContexts++;
 }
 if(lv)lv.index=c.index;
 try{disciplineRunning=true}catch(_){};window.disciplineRunning=true;
 remembered={event:c.event,disc:c.disc,results:c.results,lines:c.plan.highlights.map(h=>h.commentary)};
}
function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
function stageMatches(c){
 const stage=document.querySelector('.road-v3-stage');if(!stage)return false;
 const section=stage.querySelector('.road-v3-head strong')?.textContent?.trim()||'';
 return stage.dataset.phase===String(c.h.phase||'')&&stage.dataset.camera===String(c.h.camera||'')&&section===String(c.h.section||'').trim();
}
function forceCurrentStage(c){
 if(stageMatches(c))return false;
 if(c.a.renderStage(c.event,c.disc,c.results,c.h)){
  forcedStages++;
  requestAnimationFrame(()=>{try{window.AMMarathonRoadMotionV4?.animate?.()}catch(_){}});
  return true;
 }
 return false
}
function syncLiveShell(c){
 restoreLive(c);forceCurrentStage(c);
 const root=document.querySelector('.road-matchday');if(!root)return false;root.classList.add('road-playback-integrity-v2');
 const commentary=document.getElementById('commentary');if(commentary&&c.h.commentary){if(typeof matchdayCommentaryHTML==='function')commentary.innerHTML=matchdayCommentaryHTML(c.h.commentary);else setText(commentary,c.h.commentary)}
 const liveRow=root.querySelector('.matchday-live-row');if(liveRow){if(!liveRow.querySelector('.matchday-live-dot')){const dot=document.createElement('i');dot.className='matchday-live-dot';liveRow.prepend(dot)}const label=liveRow.querySelector('small'),phase=c.h.phase==='finish'?'FINISH':`HIGHLIGHT ${c.index+1}/${c.total}`;setText(label,`${phase} • 42.195 KM`)}
 for(const id of ['startDiscipline','startDisciplineTop']){const b=document.getElementById(id);if(!b)continue;b.disabled=true;b.classList.remove('good');b.classList.add('primary');setText(b,'IN PROGRESS')}
 const cells=[...root.querySelectorAll('.matchday-dash-cell')];for(const cell of cells){if(/controls/i.test(cell.querySelector('.matchday-dash-label')?.textContent||'')){setText(cell.querySelector('.matchday-dash-main'),'Watching highlights');break}}
 return true
}
function syncFinishedScreen(){
 const d=activeDisc();if(!isRoad(d))return false;const e=resolveEvent(d),results=e?.results?.[d],a=api();if(!e||!a||!Array.isArray(results))return false;
 document.getElementById('roadV3Skip')?.remove();
 const root=document.getElementById('roadLiveStage');if(root&&!root.querySelector('.road-v3-results')){if(a.renderResults(e,d,results)){forcedResults++;return true}}
 return false
}
function sync(){
 injectStaticRoadStyle();ensureCommitGuard();ensureStartGuard();ensureApiSkipGuard();rememberLive();const c=session();if(c)return syncLiveShell(c);return syncFinishedScreen()
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;try{sync()}catch(err){console.warn('[Marathon Integrity V2] sync failed',err)}})}

function queueStart(e,d){
 if(!e||!isRoad(d)||Array.isArray(e.results?.[d]))return;
 const key=eventKey(e,d);if(pendingStart===key)return;pendingStart=key;let attempts=0;
 const go=()=>{attempts++;const a=api();if(typeof a?.start==='function'){pendingStart=null;a.start(e,d);schedule();return}if(attempts<80){setTimeout(go,50);return}pendingStart=null;console.warn('[Marathon Integrity V2] V3 start authority did not become available')};go()
}
function authorizeCommit(e,d){authorizedCommitKey=eventKey(e,d)}
function runSkip(){
 const c=session();if(!c||typeof c.a?.skip!=='function')return false;
 authorizeCommit(c.event,c.disc);
 try{c.a.skip();return true}finally{setTimeout(()=>{authorizedCommitKey=null},0)}
}
function roadStartTarget(target){return target instanceof Element?target.closest('#startDiscipline,#startDisciplineTop'):null}
document.addEventListener('click',event=>{
 const skip=event.target instanceof Element?event.target.closest('#roadV3Skip'):null;
 if(skip){const c=session();if(c){event.preventDefault();event.stopImmediatePropagation();runSkip();schedule();return}}
 const target=roadStartTarget(event.target);if(!target||target.disabled)return;const d=activeDisc();if(!isRoad(d))return;const e=resolveEvent(d);if(!e||Array.isArray(e.results?.[d]))return;
 event.preventDefault();event.stopImmediatePropagation();queueStart(e,d)
},true);

function ensureStartGuard(){
 let current=null;try{current=typeof startDiscipline==='function'?startDiscipline:window.startDiscipline}catch(_){current=window.startDiscipline}
 if(typeof current!=='function'||current.__amMarathonPlaybackIntegrityV2Start)return false;
 const base=current,wrapped=function(e,d){if(isRoad(d)){if(Array.isArray(e?.results?.[d]))return base.apply(this,arguments);queueStart(e,d);return}return base.apply(this,arguments)};
 Object.defineProperty(wrapped,'__amMarathonPlaybackIntegrityV2Start',{value:true});
 try{startDiscipline=wrapped}catch(_){};window.startDiscipline=wrapped;return true
}
function ensureApiSkipGuard(){
 const a=api();if(!a||typeof a.skip!=='function'||a.skip.__amMarathonPlaybackIntegrityV2Skip)return false;
 const base=a.skip,wrapped=function(...args){const c=session();if(c)authorizeCommit(c.event,c.disc);try{return base.apply(this,args)}finally{setTimeout(()=>{authorizedCommitKey=null},0)}};
 Object.defineProperty(wrapped,'__amMarathonPlaybackIntegrityV2Skip',{value:true});a.skip=wrapped;return true
}
function ensureCommitGuard(){
 let current=null;try{current=typeof commitDisciplineResults==='function'?commitDisciplineResults:window.commitDisciplineResults}catch(_){current=window.commitDisciplineResults}
 if(typeof current!=='function'||current.__amMarathonPlaybackIntegrityV2Commit)return false;
 const base=current,wrapped=function(e,d,r){
  if(isRoad(d)){
   const key=eventKey(e,d);
   if(authorizedCommitKey===key){authorizedCommitKey=null;authorizedCommits++;return base.apply(this,arguments)}
   const dbg=debug();
   if(dbg&&String(dbg.disc)===String(d)&&Number(dbg.index)<Number(dbg.total)){
    blockedCommits++;console.warn('[Marathon Integrity V2] blocked premature marathon result commit',{disc:d,index:dbg.index,total:dbg.total});return;
   }
  }
  return base.apply(this,arguments)
 };
 Object.defineProperty(wrapped,'__amMarathonPlaybackIntegrityV2Commit',{value:true});
 try{commitDisciplineResults=wrapped}catch(_){};window.commitDisciplineResults=wrapped;return true
}

const observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('pageshow',schedule);window.addEventListener('orientationchange',()=>setTimeout(schedule,80));
setInterval(schedule,200);setInterval(()=>{ensureCommitGuard();ensureStartGuard();ensureApiSkipGuard()},750);
window.AMMarathonPlaybackIntegrityV2={version:VERSION,sync,session,skip:runSkip,debug:()=>{const c=session();return{installed:true,active:!!c,index:c?.index??null,total:c?.total??null,phase:c?.h?.phase??null,blockedCommits,authorizedCommits,repairedContexts,forcedStages,forcedResults,pendingStart,authorizedCommit:authorizedCommitKey}}};
schedule();
})();
