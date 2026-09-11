import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {JSDOM,VirtualConsole} from 'jsdom';

const scriptPath=fileURLToPath(import.meta.url);

if(process.env.AM_SMOKE_CHILD!=='1'){
 const child=spawn(process.execPath,[scriptPath],{
  cwd:process.cwd(),
  env:{...process.env,AM_SMOKE_CHILD:'1'},
  stdio:['ignore','pipe','pipe']
 });
 child.stdout.pipe(process.stdout);
 child.stderr.pipe(process.stderr);
 const timer=setTimeout(()=>{
  console.error('\nATHLETICS MANAGER RUNTIME SMOKE: TIMED OUT\n');
  console.error('The child process stopped responding. The last [smoke] route printed above identifies the likely blocking renderer.');
  child.kill('SIGKILL');
 },25000);
 const code=await new Promise(resolve=>child.on('exit',(value,signal)=>resolve(value??(signal?124:1))));
 clearTimeout(timer);
 process.exit(code);
}

const root=process.cwd();
const failures=[];
const warnings=[];
const fail=message=>failures.push(message);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.b64':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};

const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  const full=path.resolve(root,rel);
  if(!full.startsWith(path.resolve(root)+path.sep)&&full!==path.resolve(root)){res.writeHead(403);res.end('Forbidden');return}
  if(!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'content-type':mime[path.extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(full).pipe(res);
 }catch(err){res.writeHead(500);res.end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const url=`http://127.0.0.1:${port}/game.html`;
console.log(`[smoke] loading ${url}`);

const virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',err=>{
 const message=String(err?.message||err);
 if(/Uncaught \[/.test(message))fail(`jsdom uncaught error: ${message}`);
 else if(/Could not load script/i.test(message))fail(`Script resource failed: ${message}`);
 else if(!/Could not parse CSS stylesheet/i.test(message))warnings.push(message);
});
virtualConsole.on('error',(...args)=>{
 const text=args.map(String).join(' ');
 if(/Scouting V2 failed to load|Not implemented:/i.test(text))return;
 warnings.push(text);
});

let dom;
try{
 dom=await JSDOM.fromURL(url,{
  runScripts:'dangerously',
  resources:'usable',
  pretendToBeVisual:true,
  virtualConsole,
  beforeParse(window){
   window.fetch=(input,init)=>globalThis.fetch(new URL(String(input),window.location.href),init);
   if(globalThis.Response)window.Response=globalThis.Response;
   if(globalThis.Request)window.Request=globalThis.Request;
   if(globalThis.Headers)window.Headers=globalThis.Headers;
   if(globalThis.Blob)window.Blob=globalThis.Blob;
   if(globalThis.DecompressionStream)window.DecompressionStream=globalThis.DecompressionStream;
   if(globalThis.CompressionStream)window.CompressionStream=globalThis.CompressionStream;
   if(globalThis.crypto)Object.defineProperty(window,'crypto',{value:globalThis.crypto,configurable:true});
   window.matchMedia=query=>({matches:false,media:String(query),onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}});
   window.scrollTo=()=>{};
   window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
   window.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
   window.CSS=window.CSS||{};
   window.CSS.escape=window.CSS.escape||function(value){return String(value).replace(/[^a-zA-Z0-9_-]/g,ch=>`\\${ch}`)};
   if(window.HTMLElement&&!window.HTMLElement.prototype.scrollIntoView)window.HTMLElement.prototype.scrollIntoView=function(){};
   if(window.HTMLDialogElement){
    if(!window.HTMLDialogElement.prototype.showModal)window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
    if(!window.HTMLDialogElement.prototype.show)window.HTMLDialogElement.prototype.show=function(){this.setAttribute('open','')};
    if(!window.HTMLDialogElement.prototype.close)window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'))};
   }
  }
 });
 await new Promise(resolve=>{
  const timer=setTimeout(resolve,3500);
  dom.window.addEventListener('load',()=>{clearTimeout(timer);setTimeout(resolve,900)},{once:true});
  dom.window.addEventListener('error',event=>fail(`window error: ${event.message||event.error||'unknown error'}`));
  dom.window.addEventListener('unhandledrejection',event=>fail(`unhandled rejection: ${event.reason||'unknown rejection'}`));
 });
 console.log('[smoke] page load settled');

 const w=dom.window;
 const requiredGlobals=[
  'AthleticsUI','__athleticsInboxDecisionCore','__athleticsHomeV2','__athleticsInboxV3','__athleticsSquadAthleteV2',
  '__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','__athleticsRegression','AMLiveBroadcastV4'
 ];
 for(const key of requiredGlobals)if(!w[key])fail(`Required runtime global missing after page load: ${key}`);

 const active=[...w.document.querySelectorAll('.view.on')].map(el=>el.id);
 if(active.length!==1)fail(`Expected one active route after startup, found: ${active.join(', ')||'none'}`);

 const regression=w.__athleticsRegression;
 if(regression){
  try{
   const snapshot=regression.snapshot();
   if(!snapshot||snapshot.version!==1)fail('Regression runtime did not return a valid snapshot.');
   if(snapshot?.duplicateIds?.length)fail(`Runtime duplicate DOM ids: ${snapshot.duplicateIds.map(x=>`${x.id}×${x.count}`).join(', ')}`);
   if(snapshot?.activeViews?.length!==1)fail(`Regression snapshot has ${snapshot?.activeViews?.length||0} active views.`);
  }catch(err){fail(`Regression snapshot threw: ${err?.stack||err}`)}
 }
 if(w.AMLiveBroadcastV4){
  try{
   const diag=w.AMLiveBroadcastV4.diagnostics();
   if(!diag||diag.loaded!==true||diag.renderer!=='Broadcast V4.6 Optimised')fail('Broadcast V4.6 diagnostics are not authoritative.');
   const qa=w.AMLiveBroadcastV4.qa();
   if(!qa||qa.ok!==true||!Array.isArray(qa.issues))fail('Broadcast V4.6 QA snapshot is invalid while idle.');
  }catch(err){fail(`Broadcast V4.6 diagnostics threw: ${err?.stack||err}`)}
 }
 if(w.__athleticsManagerCareerV1){
  try{
   const profile=w.__athleticsManagerCareerV1.snapshot();
   if(!profile||profile.version!==1||profile.managerId!=='player-manager-v1')fail('Manager Career V1 snapshot is not authoritative.');
   if(!profile.migration?.completed)fail('Manager Career V1 migration did not complete in runtime smoke.');
   if(!profile.reputation?.current)fail('Manager Career V1 reputation state is missing.');
  }catch(err){fail(`Manager Career V1 diagnostics threw: ${err?.stack||err}`)}
 }
 console.log('[smoke] runtime globals and snapshot checked');

 const smokeRoutes=['home','inbox','squad','pool','calendar','training','scouting','league','rankings','olympics','staff','finance','news'];
 if(typeof w.view==='function'){
  w.document.getElementById('startup')?.classList.add('hidden');
  for(const target of smokeRoutes){
   console.log(`[smoke] route ${target}`);
   try{w.view(target);await new Promise(resolve=>setTimeout(resolve,20))}
   catch(err){fail(`Route ${target} threw during smoke render: ${err?.stack||err}`)}
   const on=[...w.document.querySelectorAll('.view.on')];
   if(on.length!==1)fail(`Route ${target} left ${on.length} active views.`);
  }
 }else fail('Global view() router is unavailable.');
 console.log('[smoke] route render sweep finished');

} catch(err){
 fail(`Runtime smoke harness failed: ${err?.stack||err}`);
} finally {
 try{dom?.window?.close()}catch(_){}
 try{server.closeAllConnections?.()}catch(_){}
 try{server.close()}catch(_){}
}

if(failures.length){
 console.error('\nATHLETICS MANAGER RUNTIME SMOKE: FAILED\n');
 failures.forEach(item=>console.error(`✗ ${item}`));
 if(warnings.length)warnings.slice(0,12).forEach(item=>console.error(`! ${item}`));
 process.exit(1);
}
console.log('\nATHLETICS MANAGER RUNTIME SMOKE: PASSED\n');
console.log('✓ game.html executed without an uncaught startup error');
console.log('✓ staged runtime globals were installed');
console.log('✓ regression snapshot completed without duplicate runtime ids');
console.log('✓ main management routes rendered without throwing');
if(warnings.length)console.log(`! ${warnings.length} non-fatal jsdom/browser-emulation warning${warnings.length===1?'':'s'} ignored`);
process.exit(0);
