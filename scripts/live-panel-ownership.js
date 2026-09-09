/* ===== Live Event Panel Ownership ===== */
(function(){
'use strict';

if(window.__athleticsLivePanelOwnership)return;
if(typeof fmUpdateLivePanels!=='function'||typeof eventVisualHTML!=='function')return;

const legacyUpdater=fmUpdateLivePanels;

/* The legacy 2D viewer used to refresh both the arena and the scoreboard on
   every commentary cue. The universal scoreboard has its own live state and
   update loop, so the legacy updater now owns only the animation area. */
fmUpdateLivePanels=function(e,d){
  const arena=typeof $==='function'?$('liveEventVisual'):document.getElementById('liveEventVisual');
  if(arena)arena.innerHTML=eventVisualHTML(e,d);
};

window.__athleticsLivePanelOwnership={legacyUpdater};
})();
/* ===== End Live Event Panel Ownership ===== */
