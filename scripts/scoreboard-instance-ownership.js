/* ===== Live Scoreboard Ownership V4 ===== */
(function(){
'use strict';
if(window.__athleticsScoreboardOwnershipV4)return;window.__athleticsScoreboardOwnershipV4=1;
const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML'),protectedBoards=new WeakSet();if(!descriptor?.get||!descriptor?.set)return;
function canonical(){if(liveEventView?.fd&&typeof window.__amFieldScoreboardRender==='function')return window.__amFieldScoreboardRender();if(liveEventView?.trackCoreV5&&typeof window.__athleticsTrackScoreboardRender==='function')return window.__athleticsTrackScoreboardRender();return window.__athleticsLiveScoreboardSync?.()}
function protect(board){if(!board||protectedBoards.has(board))return;Object.defineProperty(board,'innerHTML',{configurable:true,enumerable:false,get(){return descriptor.get.call(this)},set(value){const live=typeof disciplineRunning!=='undefined'&&disciplineRunning,html=typeof value==='string'?value:'';const legacy=live&&(html.includes('fm-scoreboard-inner')||html.includes('universal-live-board')||html.includes('track-v4-board')||html.includes('track-v3-board')||html.includes('live-race-leaderboard'));if(legacy){queueMicrotask(()=>{try{canonical()}catch(_){}});return}return descriptor.set.call(this,value)}});protectedBoards.add(board)}
function maintain(){if(typeof disciplineRunning==='undefined'||!disciplineRunning)return;protect(document.getElementById('liveScoreboard'))}
setInterval(maintain,120);queueMicrotask(maintain);
})();
/* ===== End Live Scoreboard Ownership V4 ===== */