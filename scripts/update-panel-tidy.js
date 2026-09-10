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

/* ===== Live Event Engine Loader ===== */
(function(){
'use strict';
if(window.__amLiveEventLoader)return;window.__amLiveEventLoader=1;
function load(){
 if(!document.querySelector('link[data-am-live-engine-css]')){
  const css=document.createElement('link');css.rel='stylesheet';css.href='styles/live-event-engine-v1.css?v=20260910-live2';css.dataset.amLiveEngineCss='1';document.head.appendChild(css);
 }
 if(!document.querySelector('script[data-am-live-engine-js]')){
  const js=document.createElement('script');js.src='scripts/live-event-engine-v2.js?v=20260910-live2';js.dataset.amLiveEngineJs='1';js.async=false;document.body.appendChild(js);
 }
}
if(document.readyState==='complete')setTimeout(load,0);else window.addEventListener('load',load,{once:true});
})();
/* ===== End Live Event Engine Loader ===== */

/* ===== Live 2D Rebuild Release Note ===== */
(function(){
'use strict';
if(window.__amLive2DReleaseNote)return;window.__amLive2DReleaseNote=1;
const update={
 timestamp:'2026-09-10T10:31:00+01:00',
 date:'10 September 2026',
 title:'Live 2D Event Viewer Rebuild',
 items:[
  'Rebuilt the Live Event presentation around one shared event timeline so animation, standings and commentary all read from the same simulation result.',
  'Track races now support live race progression, position changes, checkpoints, lap-based pacing and up to eight competitors without revealing the final result early.',
  'Field events now play attempts individually, with recorded throws and jumps driving the visual distance, scoreboard changes and commentary reactions.',
  'Added event controls for pause and 1x / 2x / 4x speed, plus a clear completion route so finished events cannot leave the player trapped on Event Day.',
  'The new Live 2D layer is designed as the single reusable foundation for future track, throws and jumps work rather than adding more separate event renderers.'
 ]
};
function add(){
 if(typeof window.addDevelopmentUpdate==='function'){window.addDevelopmentUpdate(update);return}
 setTimeout(add,50);
}
add();
})();
/* ===== End Live 2D Rebuild Release Note ===== */
