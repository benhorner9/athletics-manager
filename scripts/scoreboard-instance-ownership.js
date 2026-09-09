/* ===== Live Scoreboard Instance Ownership V2 ===== */
(function(){
'use strict';
if(window.__athleticsScoreboardInstanceOwnershipV2)return;
const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML'),protectedBoards=new WeakSet();if(!descriptor?.get||!descriptor?.set)return;
function protect(board){if(!board||protectedBoards.has(board))return;Object.defineProperty(board,'innerHTML',{configurable:true,enumerable:false,get(){return descriptor.get.call(this)},set(value){const legacyLiveWrite=typeof disciplineRunning!=='undefined'&&disciplineRunning&&typeof value==='string'&&value.includes('fm-scoreboard-inner');if(legacyLiveWrite){queueMicrotask(()=>window.__athleticsLiveScoreboardSync?.());return}return descriptor.set.call(this,value)}});protectedBoards.add(board);queueMicrotask(()=>window.__athleticsLiveScoreboardSync?.())}
function maintain(){if(typeof disciplineRunning==='undefined'||!disciplineRunning)return;protect(document.getElementById('liveScoreboard'))}
window.__athleticsScoreboardInstanceOwnershipV2=true;window.setInterval(maintain,20);
})();
/* ===== End Live Scoreboard Instance Ownership V2 ===== */
