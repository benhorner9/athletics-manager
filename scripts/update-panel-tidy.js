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
