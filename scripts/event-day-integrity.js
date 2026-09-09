/* ===== Event Day Integrity Guard ===== */
(function(){
'use strict';
if(window.__amEventDayIntegrity)return;window.__amEventDayIntegrity=1;
function audit(){const root=document.getElementById('competition');if(!root?.classList.contains('on'))return true;root.querySelectorAll('#liveEventVisual .track-v4-board,#liveEventVisual .track-v3-board,#liveEventVisual .live-race-leaderboard,#liveEventVisual .fm-scoreboard-inner').forEach(x=>x.remove());const board=document.getElementById('liveScoreboard');if(disciplineRunning&&liveEventView?.fd&&board){board.querySelectorAll('.universal-live-board,.am-track-board,.fm-scoreboard-inner').forEach(x=>x.remove());window.__amFieldScoreboardRender?.()}else if(disciplineRunning&&liveEventView?.trackCoreV5&&board){board.querySelectorAll('.universal-live-board,.am-field-board,.fm-scoreboard-inner').forEach(x=>x.remove());window.__athleticsTrackScoreboardRender?.()}if(disciplineRunning&&liveEventView?.trackCoreV5&&document.querySelector('#liveEventVisual ellipse')){console.warn('Legacy oval track detected; canonical track renderer restored.');const v=liveEventView,arena=document.getElementById('liveEventVisual');if(arena)arena.innerHTML=eventVisualHTML(v.event,v.disc)}return true}
if(typeof drawCompetition==='function'){const base=drawCompetition;drawCompetition=function(){const out=base();queueMicrotask(audit);return out}}
window.__athleticsEventDayIntegrityAudit=audit;queueMicrotask(audit);
})();
/* ===== End Event Day Integrity Guard ===== */