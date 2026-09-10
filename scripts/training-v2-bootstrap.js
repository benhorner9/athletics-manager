/* ===== Athletics Manager Training System V2 bootstrap ===== */
(function(){
'use strict';
if(window.__amTrainingV2Bootstrap)return;window.__amTrainingV2Bootstrap=1;
const BASE='scripts/training-v2/';
const VERSION='20260910-training2g';
async function text(path){
 const response=await fetch(BASE+path+'?v='+VERSION,{cache:'no-store'});
 if(!response.ok)throw new Error(path+' '+response.status);
 return (await response.text()).trim();
}
async function decode(b64){
 const raw=atob(b64),bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 return await new Response(stream).text();
}
async function unpack(path){return decode(await text(path))}
async function unpackJoined(paths){return decode((await Promise.all(paths.map(text))).join(''))}
async function run(code,label){
 await new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'})),script=document.createElement('script');
  script.src=url;script.async=false;script.dataset.trainingV2=label;
  script.onload=()=>{URL.revokeObjectURL(url);resolve()};script.onerror=err=>{URL.revokeObjectURL(url);reject(err)};
  document.head.appendChild(script);
 });
}
async function boot(){
 try{
  const [css,engine,camps,ui]=await Promise.all([
   unpack('styles.gz.b64'),
   unpackJoined(['engine-a.b64','engine-b.b64']),
   unpack('camps.gz.b64'),
   unpack('ui.gz.b64')
  ]);
  if(!document.getElementById('amTrainingV2Styles')){const style=document.createElement('style');style.id='amTrainingV2Styles';style.textContent=css;document.head.appendChild(style)}
  await run(engine,'engine');
  await run(camps,'camps');
  await run(ui,'ui');
  const cleanupResponse=await fetch('scripts/calendar-training-cleanup-v1.js?v='+VERSION,{cache:'no-store'});
  if(!cleanupResponse.ok)throw new Error('calendar-training-cleanup-v1.js '+cleanupResponse.status);
  await run(await cleanupResponse.text(),'calendar-cleanup');
  const testingResponse=await fetch('scripts/training-squad-testing-v1.js?v='+VERSION,{cache:'no-store'});
  if(!testingResponse.ok)throw new Error('training-squad-testing-v1.js '+testingResponse.status);
  await run(await testingResponse.text(),'squad-testing');
  if(typeof currentView!=='undefined'&&currentView==='training'&&typeof drawTraining==='function')drawTraining();
  if(typeof currentView!=='undefined'&&currentView==='calendar'&&window.__athleticsSquadTestingTraining?.calendar)window.__athleticsSquadTestingTraining.calendar();
  console.info('[Athletics Manager] Training System V2 loaded');
 }catch(err){console.error('[Athletics Manager] Training System V2 failed to load',err)}
}
boot();
})();
/* ===== End Athletics Manager Training System V2 bootstrap ===== */
