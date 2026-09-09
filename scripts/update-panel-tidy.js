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

if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Development Update Panel Tidy ===== */
