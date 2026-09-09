/* ===== Live Scoreboard Instance Ownership ===== */
(function(){
'use strict';

if(window.__athleticsScoreboardInstanceOwnership)return;

const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
const protectedBoards=new WeakSet();
if(!descriptor?.get||!descriptor?.set)return;

function protect(board){
  if(!board||protectedBoards.has(board))return;
  Object.defineProperty(board,'innerHTML',{
    configurable:true,
    enumerable:false,
    get(){return descriptor.get.call(this)},
    set(value){
      const legacyLiveWrite=typeof disciplineRunning!=='undefined'
        && disciplineRunning
        && typeof value==='string'
        && value.includes('fm-scoreboard-inner');
      if(legacyLiveWrite)return;
      return descriptor.set.call(this,value);
    }
  });
  protectedBoards.add(board);
}

function maintainOwnership(){
  if(typeof disciplineRunning==='undefined'||!disciplineRunning)return;
  protect(document.getElementById('liveScoreboard'));
}

window.__athleticsScoreboardInstanceOwnership=true;
window.setInterval(maintainOwnership,25);
})();
/* ===== End Live Scoreboard Instance Ownership ===== */
