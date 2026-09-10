import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {JSDOM,VirtualConsole} from 'jsdom';

const root=process.cwd();
const failures=[];
const warnings=[];
const fail=message=>failures.push(message);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.b64':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};

const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  let rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
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

const virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',err=>{
 const message=String(err?.message||err);
 if(/Uncaught \[/.test(message))fail(`jsdom uncaught error: ${message}`);
 else if(/Could not load script/i.test(message))fail(`Script resource failed: ${message}`);
 else if(!/Could not parse CSS stylesheet/i.test(message))warnings.push(message);
});
virtualConsole.on('error',(...args)=>{
 const text=args.map(String).join(' ');
 /* The compressed Scouting V2 bootstrap uses blob script URLs, which jsdom does not execute.
    Its caught bootstrap error is not a page crash and Scouting V3 retains a legacy fallback. */
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
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(resolve,3500);
  dom.window.addEventListener('load',()=>{clearTimeout(timer);setTimeout(resolve,900)},{once:true});
  dom.window.addEventListener('error',event=>{fail(`window error: ${event.message||event.error||'unknown error'}`)});
  dom.window.addEventListener('unhandledrejection',event=>{fail(`unhandled rejection: ${event.reason||'unknown rejection'}`)});
 });

 const w=dom.window;
 const requiredGlobals=[
  'AthleticsUI','__athleticsInboxDecisionCore','__athleticsHomeV2','__athleticsInboxV3','__athleticsSquadAthleteV2',
  '__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsRegression'
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

 /* Verify the main staged routes can be rendered from the initialized career shell without
    throwing. Appointment/onboarding guards may redirect; the test therefore checks safety,
    not a specific destination. Competition is excluded because it requires an event context. */
 const smokeRoutes=['home','inbox','squad','pool','calendar','training','scouting','league','rankings','olympics','staff','finance','news'];
 if(typeof w.view==='function'){
  w.document.getElementById('startup')?.classList.add('hidden');
  for(const target of smokeRoutes){
   try{w.view(target);await new Promise(resolve=>setTimeout(resolve,20))}
   catch(err){fail(`Route ${target} threw during smoke render: ${err?.stack||err}`)}
   const on=[...w.document.querySelectorAll('.view.on')];
   if(on.length!==1)fail(`Route ${target} left ${on.length} active views.`);
  }
 }else fail('Global view() router is unavailable.');

} catch(err){
 fail(`Runtime smoke harness failed: ${err?.stack||err}`);
} finally {
 try{dom?.window?.close()}catch(_){}
 await new Promise(resolve=>server.close(resolve));
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
