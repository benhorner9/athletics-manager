/* Athletics Manager — Scouting & Talent Identification V2 bootstrap */
(function(){
'use strict';
if(window.__amScoutingV2Bootstrap)return;
window.__amScoutingV2Bootstrap=1;
const V='20260913-scouting2-weekbridge1';
const scoutingRoot=()=>document.getElementById('scouting');
function claimRoute(state='loading'){
 const root=scoutingRoot();if(!root)return null;
 root.classList.add('scouting-v2-active');root.dataset.amUiScreen='scouting-v2';root.dataset.scoutingV2State=state;
 try{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){}
 return root;
}
claimRoute();

async function payload(paths){
 const parts=await Promise.all(paths.map(async path=>{
  const response=await fetch(`${path}?v=${V}`,{cache:'no-store'});
  if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
 }));
 const b64=parts.join('').replace(/\s+/g,'');
 const raw=atob(b64),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 return new Response(stream).text();
}

function runJS(code){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.async=false;script.dataset.scoutingV2='runtime';
  if(typeof URL?.createObjectURL==='function'){
   const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));script.src=url;
   script.onload=()=>{try{URL.revokeObjectURL(url)}catch(_){}resolve()};
   script.onerror=()=>{try{URL.revokeObjectURL(url)}catch(_){}reject(new Error('Scouting V2 runtime failed'))};
   document.head.appendChild(script);return;
  }
  try{script.textContent=code;document.head.appendChild(script);resolve()}catch(err){reject(err)}
 });
}

function careerWeek(){
 try{return Number(s?.game?.careerWeek||s?.game?.week||1)||1}catch(_){return 1}
}
function scoutingIntegrationState(){
 try{
  if(!s)return null;
  s.scoutingV2??={version:2,nations:{},debug:false,analytics:{recommendations:[],discoveries:[],reportAccuracy:[]}};
  s.scoutingV2.integration??={};
  return s.scoutingV2.integration;
 }catch(_){return null}
}
function suppressLegacyDiscovery(){
 /* Scouting V2 owns discovery once loaded. Keep the old state current so the
    legacy eight-week generator cannot seed hidden talent behind V2's back. */
 try{
  if(typeof scoutingState!=='function')return;
  const legacy=scoutingState();
  if(legacy)legacy.lastCareerWeek=careerWeek();
 }catch(_){}
}
function runScoutingWeek(){
 const A=window.AMScoutingV2;if(!A)return;
 const mark=scoutingIntegrationState(),cw=careerWeek();
 if(mark?.lastProcessedCareerWeek===cw)return;
 try{A.seedFirstAssignment?.()}catch(err){console.error('[Athletics Manager] Scouting first assignment recovery',err)}
 try{A.processAssignmentWeek?.()}catch(err){console.error('[Athletics Manager] Scouting search progression recovery',err)}
 try{A.processScoutingWeek?.()}catch(err){console.error('[Athletics Manager] Scouting assessment progression recovery',err)}
 try{A.processInvitedTesting?.()}catch(err){console.error('[Athletics Manager] Scouting testing progression recovery',err)}
 try{A.processAssessmentCamps?.()}catch(err){console.error('[Athletics Manager] Scouting camp progression recovery',err)}
 try{A.processPathwayWeek?.()}catch(err){console.error('[Athletics Manager] Scouting pathway progression recovery',err)}
 try{A.processLongTermWeek?.()}catch(err){console.error('[Athletics Manager] Scouting long-term progression recovery',err)}
 try{A.processCommunications?.()}catch(err){console.error('[Athletics Manager] Scouting communication recovery',err)}
 if(mark)mark.lastProcessedCareerWeek=cw;
 try{A.refreshScoutingIntegration?.()}catch(_){}
 try{if(typeof save==='function')save()}catch(_){}
}
function installWeekBridge(){
 if(window.__amScoutingV2WeekBridge)return;
 if(typeof onWeekStart!=='function')return;
 const previous=onWeekStart;
 onWeekStart=function(){
  suppressLegacyDiscovery();
  const out=previous.apply(this,arguments);
  runScoutingWeek();
  return out;
 };
 window.__amScoutingV2WeekBridge=1;
}

async function boot(){
 try{
  const [js,css]=await Promise.all([
   payload([
    'scripts/scouting-v2/bundle-a.b64',
    'scripts/scouting-v2/bundle-b.b64',
    'scripts/scouting-v2/bundle-c.b64',
    'scripts/scouting-v2/bundle-d.b64'
   ]),
   payload(['scripts/scouting-v2/styles.gz.b64'])
  ]);
  if(!document.querySelector('style[data-am-scouting-v2]')){
   const style=document.createElement('style');style.dataset.amScoutingV2='1';style.textContent=css;document.head.appendChild(style);
  }
  await runJS(js);
  try{window.AMScoutingV2?.seedFirstAssignment?.()}catch(err){console.error('[Athletics Manager] Scouting first assignment recovery',err)}
  suppressLegacyDiscovery();
  installWeekBridge();
  if(typeof window.AMScoutingV2?.refreshScoutingIntegration==='function')window.AMScoutingV2.refreshScoutingIntegration();
  claimRoute('ready');
  /* Redraw Scouting directly when it is the active route. Generic render() is not
     guaranteed to repaint an already-open route after an async runtime handoff. */
  try{
   if(typeof currentView!=='undefined'&&currentView==='scouting'&&typeof drawScouting==='function')drawScouting();
   else if(typeof render==='function')render();
  }catch(redrawErr){console.error('[Athletics Manager] Scouting V2 redraw recovered',redrawErr)}
  claimRoute('ready');
  console.info('[Athletics Manager] Scouting V2 loaded');
 }catch(err){
  console.error('[Athletics Manager] Scouting V2 failed to load',err);
  const root=claimRoute('fallback');
  /* Never hand the player to the global cutover error just because the async V2
     payload was slow or unavailable. The existing scouting renderer remains a safe
     career-state fallback while Retry/reload can recover V2. */
  try{if(typeof currentView!=='undefined'&&currentView==='scouting'&&typeof drawScouting==='function')drawScouting();else if(typeof render==='function')render()}catch(fallbackErr){
   console.error('[Athletics Manager] Scouting fallback failed',fallbackErr);
   if(root)root.innerHTML='<div class="am-empty"><div><strong>Scouting is still loading</strong><span>Your scouting data is safe. Refresh this screen to retry the interface.</span></div></div>';
  }
  claimRoute('fallback');
 }
}
boot();
})();
