/* Athletics Manager — Integration & Regression V1
   Cross-screen flow safety for the staged UI rebuild.
   This layer does not replace gameplay systems and does not mark migration checks as passed.
   It repairs navigation/presentation state only, then exposes a non-destructive regression snapshot. */
(function(){
'use strict';
if(window.__amIntegrationRegressionV1)return;window.__amIntegrationRegressionV1=1;

const $=id=>document.getElementById(id);
const ROUTES=['home','inbox','squad','pool','calendar','training','scouting','league','rankings','olympics','staff','finance','news','competition'];
const CANDIDATES={
 home:['.home-v2'],
 inbox:['.am-inbox-v3'],
 squad:['[data-am-ui-screen="squad-v2"],.sav2,.squad-v2'],
 pool:['[data-am-ui-screen="pool-v2"],.sav2,.squad-v2'],
 calendar:['.calv2,[data-am-ui-screen="calendar-v2"]'],
 training:['.tr3-frame,.tr2-shell,[data-am-ui-screen="training-v3"]'],
 scouting:['.scv3,[data-am-ui-screen="scouting-v3"]'],
 staff:['.sfv2,[data-am-ui-screen="staff-v2"]'],
 finance:['.sfv2,[data-am-ui-screen="finance-v2"]'],
 league:['.wsv2,[data-am-ui-screen="summit-v2"]'],
 rankings:['.wsv2,[data-am-ui-screen="rankings-v2"]'],
 olympics:['.wsv2,[data-am-ui-screen="qualification-v3"]'],
 news:['.wsv2,[data-am-ui-screen="world-news-v2"]'],
 competition:['.cj,.v3event,[data-am-ui-screen="competition-v2"]']
};
let scheduled=false,repairing=false,lastRoute=null,lastCareerWeek=null,historyReady=false,suppressHistory=false;

function safe(fn,fallback){try{const v=fn();return v==null?fallback:v}catch(_){return fallback}}
function state(){try{return typeof s!=='undefined'?s:null}catch(_){return null}}
function route(){try{if(typeof currentView==='string'&&ROUTES.includes(currentView))return currentView}catch(_){};return document.querySelector('.view.on')?.id||'home'}
function careerWeek(){const st=state();return Number(st?.game?.careerWeek||(((Number(st?.game?.cycleYear)||1)-1)*52+(Number(st?.game?.week)||1)))||1}
function startupOpen(){const el=$('startup');return !!el&&!el.classList.contains('hidden')}
function feedback(msg){try{window.AthleticsUI?.feedback?.(msg,'warning')}catch(_){try{toast(msg)}catch(__){}}}
function activeViews(){return [...document.querySelectorAll('.view.on')].map(x=>x.id).filter(Boolean)}
function core(){return window.__athleticsInboxDecisionCore||null}
function actions(){return safe(()=>core()?.getUnresolvedActions?.()||[],[])}
function blockers(){return safe(()=>core()?.getProgressionBlockers?.()||[],[])}

function normalizeViews(){
 const r=route(),views=[...document.querySelectorAll('.view')];if(!views.length)return;
 const active=views.filter(x=>x.classList.contains('on'));
 if(active.length===1&&active[0].id===r)return;
 views.forEach(x=>x.classList.toggle('on',x.id===r));
}
function normalizeNav(){
 const r=route();
 document.querySelectorAll('[data-view]').forEach(b=>{
  const on=b.dataset.view===r;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
 const more=$('mobileMoreBtn');if(more)more.classList.toggle('on',!['home','inbox','squad','calendar'].includes(r));
}
function explainDisabled(){
 const r=$(route());if(!r)return;
 r.querySelectorAll('button:disabled').forEach(b=>{
  b.setAttribute('aria-disabled','true');if(b.title||b.getAttribute('aria-describedby')||b.getAttribute('aria-label'))return;
  const text=String(b.textContent||'').trim().toUpperCase();
  let title='This action is not currently available.';
  if(/RESULT/.test(text))title='Results are not available yet.';
  else if(/PREVIOUS/.test(text))title='There are no earlier items on this page.';
  else if(/NEXT/.test(text))title='There are no more items on this page.';
  else if(/CLOSED|LOCKED/.test(text))title='This decision is currently locked.';
  else if(/INSUFFICIENT/.test(text))title='The programme does not have enough available funding.';
  b.title=title;
 });
}
function staleMailCleanup(){
 const st=state();if(!st||typeof openMail==='undefined'||openMail==null)return;
 const live=(st.emails||[]).some(m=>String(m.id)===String(openMail));
 const archived=(st.inboxDecisionSystem?.archive||[]).some(m=>String(m.id)===String(openMail));
 if(!live&&!archived)try{openMail=null}catch(_){}
}
function competitionStateCleanup(){
 const st=state();if(!st)return;
 const cw=careerWeek();if(lastCareerWeek===cw)return;lastCareerWeek=cw;
 const id=st.uiCompetitionV2?.eventId,e=id?(st.events||[]).find(x=>String(x.id)===String(id)):null;
 const current=safe(()=>typeof currentEvent==='function'?currentEvent():null,null);
 if(e?.completed&&Number(e.week)<Number(st.game?.week||1)&&current&&String(current.id)!==String(e.id)){
  st.uiCompetitionV2.eventId=current.id;st.uiCompetitionV2.tab='overview';st.uiCompetitionV2.page=0;
  try{competitionMode='overview';activeEventDisc=null}catch(_){}
 }
 staleMailCleanup();
}
function competitionRouteValid(){
 if(route()!=='competition')return true;
 const st=state();if(!st)return true;
 const summit=safe(()=>typeof summitCurrentLiveMeeting==='function'?summitCurrentLiveMeeting():null,null)||safe(()=>typeof summitLiveMeetingNumber!=='undefined'&&summitLiveMeetingNumber?typeof summitSeasonState==='function'?summitSeasonState().meetings?.[summitLiveMeetingNumber]:null:null,null);
 const explicit=st.uiCompetitionV2?.eventId?(st.events||[]).find(e=>String(e.id)===String(st.uiCompetitionV2.eventId)):null;
 const current=safe(()=>typeof currentEvent==='function'?currentEvent():null,null);
 return !!(summit||explicit||current);
}
function rootHasContent(r){const el=$(r);if(!el)return false;return !!(el.childElementCount||String(el.textContent||'').trim())}
function recoverEmptyRoute(){
 const r=route();if(startupOpen()||!ROUTES.includes(r))return;
 const root=$(r);if(!root||rootHasContent(r))return;
 try{if(typeof renderView==='function')renderView(r)}catch(err){console.warn('[AM regression] route rerender failed',r,err)}
 requestAnimationFrame(()=>{
  if(rootHasContent(r))return;
  console.error('[AM regression] empty route recovered to Home',r);
  feedback('That screen could not be displayed. Returned to Home.');
  try{view('home')}catch(_){normalizeViews()}
 });
}
function candidatePresent(r=route()){
 const root=$(r),selectors=CANDIDATES[r]||[];if(!root||!selectors.length)return null;
 return selectors.some(sel=>{try{return !!root.querySelector(sel)}catch(_){return false}});
}

function findAction(id){return actions().find(a=>String(a.actionId)===String(id))||null}
function interceptActionRouting(event){
 const button=event.target?.closest?.('[data-home-v2-action],[data-v3-action]');if(!button)return;
 const id=button.dataset.homeV2Action||button.dataset.v3Action,a=findAction(id),c=core();if(!a||typeof c?.openAction!=='function')return;
 event.preventDefault();event.stopImmediatePropagation();
 try{c.openAction(a)}catch(err){console.error('[AM regression] decision route failed',err);if(a.destination)try{view(a.destination)}catch(_){try{view('inbox')}catch(__){}}}
}
function interceptAdvance(event){
 const b=event.target?.closest?.('#advanceTop');if(!b)return;const g=blockers();if(!g.length||typeof core()?.showGate!=='function')return;
 event.preventDefault();event.stopImmediatePropagation();core().showGate(g);
}

function closeTopDialogForBack(){
 const open=[...document.querySelectorAll('dialog[open]')].at(-1);if(!open)return false;
 if(open.id==='managementProfile'){
  const close=open.querySelector('[data-sfv2-profile-close],[data-management-close]');if(close){close.click();return true}
  return false;
 }
 try{open.close();return true}catch(_){return false}
}
function historyState(r=route()){return{...(history.state||{}),athleticsManager:true,amRoute:r}}
function syncHistory(){
 if(startupOpen())return;
 const r=route();
 try{
  if(!historyReady){history.replaceState(historyState(r),'');historyReady=true;lastRoute=r;return}
  if(suppressHistory){history.replaceState(historyState(r),'');suppressHistory=false;lastRoute=r;return}
  if(lastRoute!==r){history.pushState(historyState(r),'');lastRoute=r}
 }catch(_){}
}
function browserBack(event){
 if(!historyReady||startupOpen())return;
 if(closeTopDialogForBack()){
  try{history.pushState(historyState(route()),'')}catch(_){};return;
 }
 const ui=window.AthleticsUI;let handled=false;
 try{handled=!!ui?.back?.('home')}catch(_){}
 if(handled){suppressHistory=true;requestAnimationFrame(()=>{try{ui?.refresh?.()}catch(_){};syncHistory();schedule()});return}
 if(event.state?.athleticsManager){try{view(event.state.amRoute||'home')}catch(_){}}
}

function auditState(){
 const st=state(),r=route(),act=actions(),blk=blockers(),views=activeViews(),duplicates=[];
 const ids=new Map();document.querySelectorAll('[id]').forEach(el=>ids.set(el.id,(ids.get(el.id)||0)+1));ids.forEach((n,id)=>{if(n>1)duplicates.push({id,count:n})});
 const orphanActions=act.filter(a=>a.emailId&&!(st?.emails||[]).some(m=>String(m.id)===String(a.emailId)));
 const squad=safe(()=>typeof managedTeam==='function'?managedTeam():[],[]),pool=safe(()=>typeof nationalPool==='function'?nationalPool():[],[]);
 const overlap=squad.filter(a=>pool.some(p=>String(p.id)===String(a.id))).map(a=>a.id);
 const event=st?.uiCompetitionV2?.eventId?(st.events||[]).find(e=>String(e.id)===String(st.uiCompetitionV2.eventId)):null;
 const openDialogs=[...document.querySelectorAll('dialog[open]')].map(d=>({id:d.id,hasExit:!!d.querySelector('button,[data-am-back]')}));
 const platform=safe(()=>window.AthleticsUI?.audit?.(),null);
 return {
  version:1,route:r,careerWeek:careerWeek(),candidate:candidatePresent(r),activeViews:views,
  routeIntegrity:{singleActive:views.length===1&&views[0]===r,hasContent:rootHasContent(r),competitionContext:competitionRouteValid()},
  decisions:{unresolved:act.length,blockers:blk.length,orphanActions:orphanActions.map(a=>a.actionId)},
  athletes:{squad:squad.length,pool:pool.length,squadPoolOverlap:overlap},
  competition:{eventId:event?.id||null,eventWeek:event?.week||null,eventCompleted:!!event?.completed},
  dialogs:openDialogs,duplicateIds:duplicates,platform,
  releaseReady:false,
  note:'This runtime snapshot is diagnostic only. It does not mark migration checks as passed.'
 };
}
function issues(snapshot=auditState()){
 const out=[];
 if(!snapshot.routeIntegrity.singleActive)out.push(`Route integrity: active views = ${snapshot.activeViews.join(', ')||'none'}`);
 if(!snapshot.routeIntegrity.hasContent&&!startupOpen())out.push(`Empty active route: ${snapshot.route}`);
 if(!snapshot.routeIntegrity.competitionContext)out.push('Competition route has no event context');
 if(snapshot.decisions.orphanActions.length)out.push(`Decision actions reference missing emails: ${snapshot.decisions.orphanActions.join(', ')}`);
 if(snapshot.athletes.squadPoolOverlap.length)out.push(`Athletes appear in Squad and Pool: ${snapshot.athletes.squadPoolOverlap.join(', ')}`);
 snapshot.duplicateIds.forEach(x=>out.push(`Duplicate DOM id: ${x.id} ×${x.count}`));
 if(snapshot.platform?.releaseBlockers?.length)out.push(...snapshot.platform.releaseBlockers.map(x=>`UI audit: ${x}`));
 return [...new Set(out)];
}
function logAudit(){const snap=auditState(),found=issues(snap);if(found.length)console.warn('[Athletics Manager] Integration regression issues',found,snap);return{snapshot:snap,issues:found}}

function repair(){
 if(repairing)return;repairing=true;
 try{
  normalizeViews();normalizeNav();competitionStateCleanup();explainDisabled();recoverEmptyRoute();
  if(route()==='competition'&&!competitionRouteValid()&&!startupOpen()){
   console.warn('[AM regression] competition route missing context; recovering');
   try{view('calendar')}catch(_){try{view('home')}catch(__){}}
   return;
  }
  try{window.AthleticsUI?.refresh?.()}catch(_){}
  syncHistory();
 }finally{repairing=false}
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{scheduled=false;repair()}))}

/* Capture only the two known action-routing holes. Existing gameplay handlers remain authoritative everywhere else. */
document.addEventListener('click',interceptActionRouting,true);
document.addEventListener('click',interceptAdvance,true);
window.addEventListener('popstate',browserBack);
const htmlObserver=new MutationObserver(schedule);htmlObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-am-route']});
const content=document.querySelector('.content');if(content)new MutationObserver(schedule).observe(content,{childList:true,subtree:false,attributes:true,attributeFilter:['class']});
window.addEventListener('pageshow',schedule);
window.addEventListener('orientationchange',()=>setTimeout(schedule,120));

window.__athleticsRegression={version:1,snapshot:auditState,issues:()=>issues(auditState()),run:logAudit,repair,schedule};
window.AthleticsRegression=window.__athleticsRegression;
schedule();
})();
