/* Athletics Manager — Scouting & Talent Identification V2 bootstrap */
(function(){
'use strict';
if(window.__amScoutingV2Bootstrap)return;
window.__amScoutingV2Bootstrap=1;
const V='20260910-scouting2';

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
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
  const script=document.createElement('script');
  script.src=url;script.async=false;script.dataset.scoutingV2='runtime';
  script.onload=()=>{URL.revokeObjectURL(url);resolve()};
  script.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Scouting V2 runtime failed'))};
  document.head.appendChild(script);
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
  if(typeof render==='function')render();
  console.info('[Athletics Manager] Scouting V2 loaded');
 }catch(err){console.error('[Athletics Manager] Scouting V2 failed to load',err)}
}
boot();
})();
