/* ===== Development Update Panel Tidy ===== */
(function(){
'use strict';

const MAX_VISIBLE_UPDATES=5;

function trimDevelopmentUpdates(){
  if(!Array.isArray(UPDATES))return;
  if(UPDATES.length>MAX_VISIBLE_UPDATES)UPDATES.splice(MAX_VISIBLE_UPDATES);
}

trimDevelopmentUpdates();

/* Keep the panel capped at five even if a later-loaded patch adds another release. */
const _updatesUnshift=UPDATES.unshift.bind(UPDATES);
UPDATES.unshift=function(...items){
  const out=_updatesUnshift(...items);
  if(this.length>MAX_VISIBLE_UPDATES)this.splice(MAX_VISIBLE_UPDATES);
  return Math.min(out,MAX_VISIBLE_UPDATES);
};

UPDATES.unshift({
  timestamp:'2026-09-10T10:05:00+01:00',
  date:'10 September 2026',
  title:'Live View Reset',
  items:[
    'All 2D event visuals have been removed from the active Event Day view for now.',
    'The Live View area is intentionally blank while the event presentation is rebuilt from a clean baseline.',
    'Commentary, event progression, live standings and official results remain active.',
    'Legacy oval-track and field-event graphics are prevented from reappearing in the visible game.'
  ]
});

if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Development Update Panel Tidy ===== */

/* ===== Temporary Live View Reset ===== */
(function(){
'use strict';
if(window.__amLiveViewResetInstalled)return;
window.__amLiveViewResetInstalled=1;

function blankLiveView(){
  const arena=document.getElementById('liveEventVisual');
  if(!arena)return;
  arena.dataset.liveViewDisabled='1';
  if(arena.firstChild)arena.replaceChildren();
}

function installLiveViewReset(){
  try{window.eventVisualHTML=function(){return '';};}catch(_){ }
  try{if(typeof window.syncEventVisual==='function')window.syncEventVisual=function(){blankLiveView();};}catch(_){ }
  blankLiveView();
  const root=document.getElementById('competition')||document.body;
  if(!root)return;
  const observer=new MutationObserver(()=>blankLiveView());
  observer.observe(root,{childList:true,subtree:true});
  window.__amLiveViewResetObserver=observer;
}

if(document.readyState==='complete')installLiveViewReset();
else window.addEventListener('load',installLiveViewReset,{once:true});
})();
/* ===== End Temporary Live View Reset ===== */
