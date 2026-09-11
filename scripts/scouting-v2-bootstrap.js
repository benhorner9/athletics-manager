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
  const root=document.getElementById('scouting');if(root){root.classList.add('scouting-v2-active');root.dataset.amUiScreen='scouting-v2'}
  try{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){ }
  if(typeof render==='function')render();
  console.info('[Athletics Manager] Scouting V2 loaded');
 }catch(err){console.error('[Athletics Manager] Scouting V2 failed to load',err)}
}
boot();
})();
