/* ===== Development Update Panel Tidy ===== */
(function(){
'use strict';
const MAX_VISIBLE_UPDATES=5;
function trimDevelopmentUpdates(){if(!Array.isArray(UPDATES))return;if(UPDATES.length>MAX_VISIBLE_UPDATES)UPDATES.splice(MAX_VISIBLE_UPDATES)}
trimDevelopmentUpdates();
const baseUnshift=UPDATES.unshift.bind(UPDATES);
UPDATES.unshift=function(...items){const out=baseUnshift(...items);if(this.length>MAX_VISIBLE_UPDATES)this.splice(MAX_VISIBLE_UPDATES);return Math.min(out,MAX_VISIBLE_UPDATES)};
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Development Update Panel Tidy ===== */

/* ===== Live 2D V3 Release Note ===== */
(function(){
'use strict';
if(window.__amLive2DV3ReleaseNote)return;window.__amLive2DV3ReleaseNote=1;
const update={
 timestamp:'2026-09-10T11:25:00+01:00',
 date:'10 September 2026',
 title:'Live 2D Engine Reset',
 items:[
  'Removed the competing legacy 2D race and field renderers from the active game so one Live Event engine now owns Event Day presentation.',
  'Replaced the broken V2 script with a clean V3 engine that drives animation, live standings and Gavin Potts commentary from the same simulated result.',
  '100m, 200m, 400m, 800m and longer races now use one stadium track made from two straights and two bends; the old oval renderer is no longer part of the build.',
  'Track movement now updates continuously through requestAnimationFrame rather than jumping between commentary screens, with Pause and 1x / 2x / 4x controls tied to the same event state.',
  'Throws and High Jump use the simulation attempt data directly, and official results are only committed after the live sequence finishes.'
 ]
};
function add(){if(typeof window.addDevelopmentUpdate==='function'){window.addDevelopmentUpdate(update);return}setTimeout(add,50)}
add();
})();
/* ===== End Live 2D V3 Release Note ===== */

/* ===== High Jump Live Spoiler Guard ===== */
(function(){
'use strict';
if(window.__amHighJumpSpoilerGuard)return;window.__amHighJumpSpoilerGuard=1;
const countPattern=/^\s*\d+\s*\/\s*\d+\s*$/;
function isHighJump(){
 try{return !!activeEventDisc&&DISCIPLINES?.[activeEventDisc]?.type==='height'}catch(_){return false}
}
function scrub(){
 if(!isHighJump())return;
 const root=document.getElementById('competition');
 if(!root?.classList.contains('on'))return;
 const visual=document.getElementById('liveEventVisual');
 const currentHeight=visual?.querySelector('svg .v3big')?.textContent?.trim()||'CURRENT HEIGHT';
 const boardMeta=document.querySelector('#liveScoreboard .v3board > header > span');
 if(boardMeta&&countPattern.test(boardMeta.textContent||''))boardMeta.textContent=currentHeight;
 const controlMeta=visual?.querySelector('.v3controls > span');
 if(controlMeta&&countPattern.test(controlMeta.textContent||''))controlMeta.textContent=currentHeight;
 visual?.querySelectorAll('.v3intro span').forEach(el=>{if(/\battempts?\b/i.test(el.textContent||''))el.textContent='HIGH JUMP FIELD'});
 document.querySelectorAll('#commentary .v3line time').forEach(el=>{if(countPattern.test(el.textContent||''))el.textContent='LIVE'});
}
let queued=false;
function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scrub()})}
const target=document.getElementById('competition');
if(target)new MutationObserver(queue).observe(target,{childList:true,subtree:true,characterData:true});
queue();
})();
/* ===== End High Jump Live Spoiler Guard ===== */
