/* ===== Live Scoreboard Instance Ownership V3 ===== */
(function(){
'use strict';
if(window.__athleticsScoreboardInstanceOwnershipV3)return;
const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML'),protectedBoards=new WeakSet();if(!descriptor?.get||!descriptor?.set)return;
function protect(board){if(!board||protectedBoards.has(board))return;Object.defineProperty(board,'innerHTML',{configurable:true,enumerable:false,get(){return descriptor.get.call(this)},set(value){const live=typeof disciplineRunning!=='undefined'&&disciplineRunning,html=typeof value==='string'?value:'',fieldOwned=live&&!!liveEventView?.fd&&!!window.__amFieldScoreAuthorityV2,legacyLiveWrite=live&&html.includes('fm-scoreboard-inner'),competingFieldWrite=fieldOwned&&html.includes('universal-live-board');if(legacyLiveWrite||competingFieldWrite){queueMicrotask(()=>{if(fieldOwned)window.__amFieldScoreboardRender?.();else window.__athleticsLiveScoreboardSync?.()});return}return descriptor.set.call(this,value)}});protectedBoards.add(board);queueMicrotask(()=>window.__athleticsLiveScoreboardSync?.())}
function maintain(){if(typeof disciplineRunning==='undefined'||!disciplineRunning)return;protect(document.getElementById('liveScoreboard'))}
window.__athleticsScoreboardInstanceOwnershipV3=true;window.setInterval(maintain,80);
})();
/* ===== End Live Scoreboard Instance Ownership V3 ===== */
