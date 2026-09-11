/* Athletics Manager — Scouting & Talent Identification V2 bootstrap */
(function(){
'use strict';
if(window.__amScoutingV2Bootstrap)return;
window.__amScoutingV2Bootstrap=1;
const V='20260911-scouting2-recovery1';
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
