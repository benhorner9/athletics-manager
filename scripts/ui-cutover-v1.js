/* Athletics Manager — Production UI Cutover V1
   Final presentation authority after the staged rebuild.
   Core gameplay and shell primitives may still live in game.js/game.css, but retired screen UI is no longer an accepted fallback. */
(function(){
'use strict';
if(window.__amUICutoverV1)return;window.__amUICutoverV1=1;

const $=id=>document.getElementById(id);
const GENERATION='production';
const BUILD='2026.09.11-cutover01';
const ROUTES={
 home:{selector:'.home-v2,[data-am-ui-screen="home-v2"]',delay:650},
 inbox:{selector:'.am-inbox-v3,[data-am-ui-screen="inbox-v3"]',delay:650},
 squad:{selector:'.sav2,[data-am-ui-screen="squad-v2"]',delay:650},
 pool:{selector:'.sav2,[data-am-ui-screen="pool-v2"]',delay:650},
 calendar:{selector:'.calv2,[data-am-ui-screen="calendar-v2"]',delay:650},
 training:{selector:'.tr2-shell,[data-am-ui-screen="training-v3"]',delay:1800},
 scouting:{selector:'.scouting-v2-active,[data-am-ui-screen="scouting-v2"]',delay:6500},
 staff:{selector:'.sfv2,[data-am-ui-screen="staff-v2"]',delay:650},
 finance:{selector:'.sfv2,[data-am-ui-screen="finance-v2"]',delay:650},
 league:{selector:'.wsv2,[data-am-ui-screen="summit-v2"]',delay:650},
 rankings:{selector:'.wsv2,[data-am-ui-screen="rankings-v2"]',delay:650},
 olympics:{selector:'.wsv2,[data-am-ui-screen="qualification-v3"]',delay:650},
 news:{selector:'.wsv2,[data-am-ui-screen="world-news-v2"]',delay:650},
 competition:{selector:'.cj,.v3event,[data-am-ui-screen="competition-v2"]',delay:650}
};
const COMPONENTS={
 athleteProfile:'squad-athlete-v2',
 staffProfile:'staff-finance-v2',
 competitionOverview:'competition-journey-v2',
 inboxReader:'inbox-v3 + inbox-single-render-v1',
 progressionGate:'inbox-decision-core-v1',
 selection:'selection-decision-v3 + competition-journey-v2'
};
let ticket=0;

function ensureStyles(){
 if($('amUICutoverStyles'))return;const style=document.createElement('style');style.id='amUICutoverStyles';style.textContent=`
 .am-cutover-error{min-height:min(560px,calc(100dvh - 120px));display:grid;place-items:center;padding:24px}.am-cutover-error>div{width:min(560px,100%);padding:24px;border:1px solid rgba(104,168,202,.22);border-radius:14px;background:linear-gradient(180deg,rgba(9,29,43,.96),rgba(6,21,32,.96));box-shadow:0 22px 60px rgba(0,0,0,.3)}.am-cutover-error small{display:block;color:#72c9ee;font-size:9px;font-weight:900;letter-spacing:.13em}.am-cutover-error h2{margin:7px 0 8px;color:#edf6fa;font-size:24px}.am-cutover-error p{margin:0;color:#91aebb;font-size:11px;line-height:1.55}.am-cutover-error-actions{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}@media(max-width:620px){.am-cutover-error{padding:14px}.am-cutover-error>div{padding:18px}.am-cutover-error-actions{display:grid;grid-template-columns:1fr}.am-cutover-error-actions .btn{width:100%}}
 `;document.head.appendChild(style)
}
function currentRoute(){try{return typeof currentView==='string'?currentView:'home'}catch(_){return document.querySelector('.view.on')?.id||'home'}}
function startupOpen(){const el=$('startup');return !!el&&!el.classList.contains('hidden')}
function candidate(route=currentRoute()){
 const root=$(route),def=ROUTES[route];if(!root||!def)return false;
 try{return !!root.querySelector(def.selector)}catch(_){return false}
}
function errorBoundary(route,reason='The production interface did not finish loading.'){
 const root=$(route);if(!root)return false;
 root.innerHTML=`<div class="am-cutover-error" role="alert"><div><small>INTERFACE RECOVERY</small><h2>${route==='competition'?'Competition screen unavailable':'Screen unavailable'}</h2><p>${reason} Your career data has not been changed.</p><div class="am-cutover-error-actions"><button type="button" class="btn secondary" data-am-cutover-retry>RETRY</button><button type="button" class="btn ghost" data-am-cutover-home>RETURN HOME</button></div></div></div>`;
 root.querySelector('[data-am-cutover-retry]')?.addEventListener('click',()=>{try{if(typeof renderView==='function')renderView(route);else if(typeof view==='function')view(route)}catch(_){try{view('home')}catch(__){}};schedule(route)});
 root.querySelector('[data-am-cutover-home]')?.addEventListener('click',()=>{try{view('home')}catch(_){}});
 return true;
}
function markProduction(){
 ensureStyles();document.body.classList.add('am-ui-cutover');document.documentElement.dataset.amUiGeneration=GENERATION;
 const stamp=document.querySelector('.am-build-stamp');if(stamp)stamp.innerHTML=`<b>Closed Alpha</b>Production UI ${BUILD}`;
 const ui=window.AthleticsUI;if(!ui?.migration)return;
 for(const [route,def] of Object.entries(ROUTES)){
  const item=ui.migration.screens?.[route];if(item){item.status='active';item.replacement=def.selector;item.cutover=true}
 }
 for(const [name,replacement] of Object.entries(COMPONENTS)){
  ui.migration.components[name]={...(ui.migration.components[name]||{}),status:'active',canonical:true,replacement,cutover:true};
 }
 if(ui.migration.policy){
  ui.migration.policy.legacyRemoval='Production presentation cutover approved and completed. Retired UI layers must not be reintroduced.';
  ui.migration.policy.cssRemoval='Retired presentation CSS is removed from the active asset graph. game.css remains only for shell/gameplay primitives pending later extraction.';
  ui.migration.policy.cutover='Production replacements are authoritative. game.js/game.css extraction is a separate architecture task and must preserve gameplay state.';
 }
}
function verify(route=currentRoute()){
 const root=$(route),def=ROUTES[route];
 if(!def||!root||startupOpen())return {route,managed:!!def,present:def?candidate(route):null,recovered:false};
 const ok=candidate(route);return {route,managed:true,present:ok,recovered:root.querySelector('.am-cutover-error')!==null};
}
function schedule(route=currentRoute()){
 const def=ROUTES[route];if(!def||startupOpen())return;
 const my=++ticket;
 setTimeout(()=>{
  if(my!==ticket||startupOpen()||currentRoute()!==route)return;
  const root=$(route);if(!root||candidate(route)||root.querySelector('.am-cutover-error'))return;
  console.error('[Athletics Manager] Production UI missing; legacy presentation suppressed',route);
  errorBoundary(route);
 },def.delay);
}
function active(){return Object.keys(ROUTES).reduce((out,r)=>(out[r]=candidate(r),out),{})}

markProduction();
const originalView=typeof view==='function'?view:null;
if(originalView){
 view=function(route,...args){const out=originalView.call(this,route,...args);schedule(currentRoute());return out};
}
const observer=new MutationObserver(()=>schedule());
observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-am-route']});
const content=document.querySelector('.content');if(content)observer.observe(content,{childList:true,subtree:false});
window.addEventListener('pageshow',()=>{markProduction();schedule()});
window.addEventListener('orientationchange',()=>setTimeout(()=>schedule(),120));

window.__athleticsUICutover={version:1,generation:GENERATION,build:BUILD,verify,active,errorBoundary,schedule};
schedule();
})();
