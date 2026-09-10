/* Athletics Manager — UI Platform V1
   Migration-safe application shell, route context, QA registry and shared UI helpers.
   This file does NOT delete legacy screens. Replacements can only be marked ready after parity checks. */
(function(){
'use strict';
if(window.__amUIPlatformV1)return;window.__amUIPlatformV1=1;

const BUILD='2026.09.10-ui01';
const $=id=>document.getElementById(id);
const nowView=()=>{try{return typeof currentView==='string'?currentView:'home'}catch(_){return'home'}};
const safeSave=()=>{try{save()}catch(_){}};

const ROUTES={
 home:{title:'Performance Centre',area:'Programme',exit:['inbox','calendar','squad'],critical:true},
 inbox:{title:'Inbox',area:'Communications',exit:['home'],critical:true,migration:'candidate'},
 squad:{title:'Squad',area:'Athlete Management',exit:['home','pool'],critical:true},
 pool:{title:'National Pool',area:'Athlete Management',exit:['home','squad'],critical:true},
 calendar:{title:'Calendar',area:'Season Planning',exit:['home','competition'],critical:true},
 training:{title:'Training',area:'High Performance',exit:['home','squad'],critical:true},
 scouting:{title:'Scouting',area:'Talent ID',exit:['home','pool'],critical:true},
 league:{title:'Summit Series',area:'Competition',exit:['home','competition'],critical:true},
 rankings:{title:'Rankings & Records',area:'World Athletics',exit:['home'],critical:false},
 olympics:{title:'Olympic Games',area:'Four-Year Target',exit:['home','competition'],critical:false},
 staff:{title:'Staff',area:'Performance Team',exit:['home'],critical:true},
 finance:{title:'Finance & Facilities',area:'Federation Operations',exit:['home'],critical:false},
 news:{title:'News Centre',area:'Athletics World',exit:['home'],critical:false},
 competition:{title:'Event Day',area:'Competition',exit:['home','calendar'],critical:true},
 activities:{title:'Training',area:'High Performance',alias:'training',exit:['home'],critical:false}
};

const MIGRATION={
 policy:{
  legacyRemoval:'Only after replacement passes functional, intuitive, premium, responsive and regression checks.',
  cssRemoval:'Only after all selectors owned by the migrated screen are no longer required.',
  gameplayState:'Shared authoritative state only. UI replacements may not fork gameplay data.',
  cutover:'Replacement first, parity second, legacy removal last.'
 },
 screens:{},
 components:{
  athleteProfile:{status:'legacy',canonical:true},
  staffProfile:{status:'legacy',canonical:true},
  competitionOverview:{status:'legacy',canonical:true},
  inboxReader:{status:'candidate',replacement:'inbox-single-render-v1'},
  progressionGate:{status:'candidate',replacement:'inbox-decision-core-v1'},
  selection:{status:'candidate',replacement:'selection-decision-v3'}
 }
};
for(const [id,r] of Object.entries(ROUTES))MIGRATION.screens[id]={status:r.migration||'legacy',critical:!!r.critical,replacement:r.migration==='candidate'?'current staged replacement':null,checks:{functional:false,intuitive:false,premium:false,tablet:false,mobile:false,refresh:false,regression:false}};

const navigation={stack:[],restoring:false,max:60,last:null,scrollByRoute:new Map()};
function screenScroll(route=nowView()){
 const node=$(route),content=document.querySelector('.content');
 return {route,windowY:window.scrollY||document.scrollingElement?.scrollTop||0,viewTop:node?.scrollTop||0,viewLeft:node?.scrollLeft||0,contentTop:content?.scrollTop||0,at:Date.now()};
}
function captureScroll(route=nowView()){
 const snap=screenScroll(route);navigation.scrollByRoute.set(route,snap);return snap;
}
function restoreScroll(snap){
 if(!snap)return;
 const apply=()=>{const node=$(snap.route),content=document.querySelector('.content');try{window.scrollTo(0,snap.windowY||0)}catch(_){}if(node){node.scrollTop=snap.viewTop||0;node.scrollLeft=snap.viewLeft||0}if(content)content.scrollTop=snap.contentTop||0};
 requestAnimationFrame(()=>requestAnimationFrame(apply));
}
function contextSnapshot(){
 const route=nowView(),x={route,scroll:captureScroll(route),at:Date.now()};
 try{x.openMail=typeof openMail!=='undefined'?openMail:null}catch(_){}
 try{x.profileId=typeof profileId!=='undefined'?profileId:null;x.profileTab=typeof profileTab!=='undefined'?profileTab:null}catch(_){}
 try{x.trainingTab=typeof trainingTab!=='undefined'?trainingTab:null}catch(_){}
 try{x.squadTab=typeof squadTab!=='undefined'?squadTab:null}catch(_){}
 try{x.activityTab=typeof activityTab!=='undefined'?activityTab:null}catch(_){}
 return x;
}
function sameContext(a,b){return !!a&&!!b&&a.route===b.route&&a.openMail===b.openMail&&a.profileId===b.profileId}
function pushContext(snap=contextSnapshot()){
 const last=navigation.stack.at(-1);if(sameContext(last,snap))return;
 navigation.stack.push(snap);if(navigation.stack.length>navigation.max)navigation.stack.splice(0,navigation.stack.length-navigation.max);
}
function restoreContext(snap){
 if(!snap)return false;navigation.restoring=true;
 try{
  if(typeof openMail!=='undefined'&&snap.openMail!==undefined)openMail=snap.openMail;
  if(typeof trainingTab!=='undefined'&&snap.trainingTab)trainingTab=snap.trainingTab;
  if(typeof squadTab!=='undefined'&&snap.squadTab)squadTab=snap.squadTab;
  if(typeof activityTab!=='undefined'&&snap.activityTab)activityTab=snap.activityTab;
  baseView?.(snap.route);
  if(snap.route==='inbox'&&typeof drawInbox==='function')drawInbox();
  restoreScroll(snap.scroll);
  return true;
 }catch(err){console.warn('[Athletics UI] context restore recovered',err);return false}
 finally{navigation.restoring=false}
}
function back(fallback='home'){
 const openDialog=[...document.querySelectorAll('dialog[open]')].at(-1);
 if(openDialog&&openDialog.id!=='managementProfile'){
  try{openDialog.close();return true}catch(_){}
 }
 let snap=navigation.stack.pop();while(snap&&snap.route===nowView())snap=navigation.stack.pop();
 if(snap&&restoreContext(snap))return true;
 try{baseView?.(fallback);return true}catch(_){return false}
}

function markRoute(){
 const route=nowView();document.documentElement.dataset.amRoute=route;
 document.querySelectorAll('.view').forEach(el=>{if(el.id)el.dataset.amUiScreen=el.id});
 document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===route)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
 const entry=ROUTES[route];if(entry){const title=$('pageTitle');if(title)title.setAttribute('data-am-route-title',entry.title)}
}

let baseView=null;
function installNavigationAuthority(){
 if(typeof view!=='function'||baseView)return;
 baseView=view;
 view=function(route,options){
  const target=ROUTES[route]?.alias||route;
  if(!ROUTES[target]){console.warn('[Athletics UI] unknown route',route);return baseView(route)}
  if(!navigation.restoring&&target!==nowView())pushContext();
  const out=baseView(target);
  navigation.last={from:navigation.stack.at(-1)?.route||null,to:target,at:Date.now()};
  markRoute();
  if(options?.restoreScroll)restoreScroll(navigation.scrollByRoute.get(target));
  return out;
 };
}

function addBuildStamp(){
 const rail=document.querySelector('.rail');if(!rail||rail.querySelector('.am-build-stamp'))return;
 const menu=rail.querySelector('.rail-menu');const stamp=document.createElement('div');stamp.className='am-build-stamp';stamp.innerHTML=`<b>Closed Alpha</b>UI platform ${BUILD}`;
 if(menu)rail.insertBefore(stamp,menu);else rail.appendChild(stamp);
}

function enhanceShellSemantics(){
 document.body.classList.add('am-ui-platform');
 const rail=document.querySelector('.rail');if(rail){rail.setAttribute('aria-label','Primary navigation');rail.setAttribute('role','navigation')}
 const main=document.querySelector('.main');if(main)main.setAttribute('role','main');
 const top=document.querySelector('.topbar');if(top)top.setAttribute('aria-label','Career context');
 const toast=$('toast');if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true')}
 addBuildStamp();markRoute();
}

function visible(el){if(!el||el.hidden)return false;const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'}
function closestScreen(el){return el.closest?.('.view')?.id||nowView()}
function auditDialogs(){
 return [...document.querySelectorAll('dialog')].map(d=>{
  const interactive=[...d.querySelectorAll('button,[role="button"],a[href],input,select,textarea')].filter(visible);
  const close=interactive.some(x=>/close|back|cancel|done|continue|return/i.test(String(x.textContent||x.getAttribute('aria-label')||'')))||typeof d.oncancel==='function';
  return {id:d.id||'(anonymous)',open:d.open,controls:interactive.length,hasExit:close,screen:closestScreen(d)};
 });
}
function auditRoutes(){
 return Object.entries(ROUTES).filter(([,r])=>!r.alias).map(([id,r])=>({id,exists:!!$(id),visible:$(id)?.classList.contains('on')||false,declaredExits:r.exit||[],critical:!!r.critical,migration:MIGRATION.screens[id]?.status||'unknown'}));
}
function auditDuplicateIds(){
 const map=new Map();document.querySelectorAll('[id]').forEach(el=>map.set(el.id,(map.get(el.id)||0)+1));return [...map.entries()].filter(([,n])=>n>1).map(([id,count])=>({id,count}));
}
function auditTouchTargets(){
 return [...document.querySelectorAll('button,a[href],[role="button"]')].filter(visible).map(el=>{const r=el.getBoundingClientRect();return {el,label:String(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,50),w:Math.round(r.width),h:Math.round(r.height),screen:closestScreen(el)}}).filter(x=>x.w>0&&x.h>0&&(x.w<32||x.h<32)).map(({el,...x})=>x).slice(0,100);
}
function auditDisabled(){
 return [...document.querySelectorAll('button:disabled')].filter(visible).map(el=>({label:String(el.textContent||'').trim().slice(0,60),screen:closestScreen(el),explained:!!(el.title||el.getAttribute('aria-describedby')||el.getAttribute('aria-label'))})).filter(x=>!x.explained).slice(0,100);
}
function audit(){
 const result={build:BUILD,route:nowView(),routes:auditRoutes(),dialogs:auditDialogs(),duplicateIds:auditDuplicateIds(),smallTouchTargets:auditTouchTargets(),unexplainedDisabled:auditDisabled(),navigationDepth:navigation.stack.length,legacyPolicy:MIGRATION.policy};
 result.releaseBlockers=[];
 for(const r of result.routes)if(r.critical&&!r.exists)result.releaseBlockers.push(`Missing critical route: ${r.id}`);
 for(const d of result.dialogs)if(d.open&&!d.hasExit)result.releaseBlockers.push(`Open dialog has no obvious exit: ${d.id}`);
 for(const d of result.duplicateIds)result.releaseBlockers.push(`Duplicate DOM id: ${d.id} ×${d.count}`);
 return result;
}

function setMigrationCheck(screen,check,value=true){
 const item=MIGRATION.screens[screen];if(!item||!(check in item.checks))return false;item.checks[check]=!!value;return true;
}
function canCutover(screen){const item=MIGRATION.screens[screen];return !!item&&Object.values(item.checks).every(Boolean)}
function markReplacementReady(screen,replacement){
 const item=MIGRATION.screens[screen];if(!item)return false;if(!canCutover(screen)){console.warn('[Athletics UI] legacy removal blocked; parity checks incomplete',screen,item.checks);return false}item.status='ready_for_cutover';item.replacement=replacement||item.replacement;return true;
}
function registerScreen(screen,definition={}){
 if(!ROUTES[screen])return false;MIGRATION.screens[screen]={...MIGRATION.screens[screen],...definition,checks:{...MIGRATION.screens[screen].checks,...(definition.checks||{})}};return true;
}

function modalOpen(dialog,{initialFocus}={}){
 if(!dialog)return false;dialog.dataset.amReturnFocus='1';dialog.__amReturnFocus=document.activeElement;
 try{if(!dialog.open)dialog.showModal();(initialFocus?dialog.querySelector(initialFocus):dialog.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'))?.focus();return true}catch(err){console.warn('[Athletics UI] modal open recovered',err);return false}
}
function modalClose(dialog){
 if(!dialog)return false;const focus=dialog.__amReturnFocus;try{if(dialog.open)dialog.close()}catch(_){};if(focus?.isConnected)requestAnimationFrame(()=>focus.focus());return true
}
function feedback(message,type='info'){
 try{toast(message)}catch(_){const t=$('toast');if(t){t.textContent=message;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),1800)}}
 document.dispatchEvent(new CustomEvent('am:feedback',{detail:{message,type}}));
}
function formatMoney(value){try{return money(value)}catch(_){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number(value)||0)}}
function formatWeek(value){const n=Number(value);return Number.isFinite(n)?`Week ${n}`:'—'}
function formatRecord(code){const allowed=new Set(['PB','SB','NR','CR','WR','DNS','DNF','DQ']);return allowed.has(String(code).toUpperCase())?String(code).toUpperCase():''}

function debugOutline(on=true){document.body.classList.toggle('am-ui-debug-outline',!!on)}
function boot(){
 installNavigationAuthority();enhanceShellSemantics();
 document.addEventListener('click',event=>{const b=event.target.closest?.('[data-am-back]');if(b){event.preventDefault();back(b.dataset.amBack||'home')}},true);
 window.addEventListener('orientationchange',()=>setTimeout(markRoute,120));
 window.addEventListener('resize',()=>markRoute(),{passive:true});
}
boot();

window.AthleticsUI={
 version:1,build:BUILD,routes:ROUTES,migration:MIGRATION,navigation,
 back,contextSnapshot,captureScroll,restoreScroll,
 audit,debugOutline,registerScreen,setMigrationCheck,canCutover,markReplacementReady,
 modal:{open:modalOpen,close:modalClose},feedback,
 format:{money:formatMoney,week:formatWeek,record:formatRecord},
 refresh:()=>{enhanceShellSemantics();markRoute();return audit()}
};
window.__athleticsUIRebuild=window.AthleticsUI;
})();
