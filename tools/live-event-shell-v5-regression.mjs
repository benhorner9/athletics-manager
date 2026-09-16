import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';

const root=process.cwd();
const failures=[];
const notes=[];
const fail=message=>failures.push(message);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};

const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'game.html';
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
 else if(/Could not load script/i.test(message))fail(`resource load failed: ${message}`);
});

let dom;
try{
 dom=await JSDOM.fromURL(url,{
  runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole,
  beforeParse(window){
   window.TextEncoder=TextEncoder;window.TextDecoder=TextDecoder;
   window.fetch=(input,init)=>globalThis.fetch(new URL(String(input),window.location.href),init);
   if(globalThis.Response)window.Response=globalThis.Response;
   if(globalThis.Request)window.Request=globalThis.Request;
   if(globalThis.Headers)window.Headers=globalThis.Headers;
   if(globalThis.Blob)window.Blob=globalThis.Blob;
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
  const timer=setTimeout(()=>reject(new Error('Live Event Shell V5 regression page load timed out')),20000);
  dom.window.addEventListener('load',()=>{clearTimeout(timer);setTimeout(resolve,900)},{once:true});
 });
 const w=dom.window;
 if(!w.AMLiveBroadcastV4)fail('Broadcast V4 did not load.');
 if(!w.AMLiveEventShellV5)fail('Universal Live Event Shell V5 did not load.');
 if(failures.length)throw new Error(failures.join('\n'));

 const initial=w.eval(`
  s=fresh('GREAT BRITAIN');
  ensureState();
  s.game.week=12;
  s.appointment=s.appointment||{};s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;
  s.induction=s.induction||{};s.induction.completed=true;
  const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
  view('competition');
  Object.getOwnPropertyNames(DISCIPLINES).filter(d=>{
   const q=DISCIPLINES[d];return q&&['time','height','distance'].includes(q.type)&&(!q.relay||/^M4X100$|^W4X100$/.test(d));
  });
 `);
 const disciplines=Array.from(initial||[]);
 const expected=['M100','W100','M200','W200','M400','W400','M800','W800','M1500','W1500','M5000','W5000','M10000','W10000','MHJ','WHJ','MSP','WSP','M4X100','W4X100'];
 for(const d of expected)if(!disciplines.includes(d))fail(`Current discipline ${d} is missing from the runtime event registry.`);
 if(failures.length)throw new Error(failures.join('\n'));

 for(const d of disciplines){
  w.__amV5QaDisc=d;
  let prepared;
  try{
   prepared=w.eval(`
    (()=>{
     const d=window.__amV5QaDisc;
     const e={id:'v5-qa-'+d,week:s.game.week,name:'Universal Live Event QA',kind:'competition',level:'International',location:'QA Stadium',disc:[d],ranked:false,star:1,entries:{[d]:[]},results:{},commentary:{}};
     window.__amV5QaEvent=e;
     activeEventDisc=d;competitionMode='discipline';view('competition');drawDisciplineScreen(e,true,[d]);
     return true;
    })()
   `)
  }catch(err){fail(`${d}: pre-event draw threw: ${err?.stack||err}`);continue}
  if(!prepared){fail(`${d}: pre-event draw did not complete`);continue}
  await new Promise(r=>setTimeout(r,35));

  const pre=w.AMLiveEventShellV5.diagnostics();
  if(!pre?.active)fail(`${d}: V5 shell was not active on the event-ready screen.`);
  if(!w.document.querySelector('#competition .lv5-sidebar'))fail(`${d}: adaptive sidebar was missing.`);
  if(!w.document.getElementById('liveScoreboard'))fail(`${d}: live scoreboard was missing.`);
  if(!w.document.getElementById('commentary'))fail(`${d}: commentary panel was missing.`);
  if(!w.document.querySelector('[data-lv5-action]'))fail(`${d}: header progression action was missing.`);
  if(!w.document.querySelector('[data-lv5-event-info]'))fail(`${d}: event information panel was missing.`);

  try{w.eval(`startDiscipline(window.__amV5QaEvent,window.__amV5QaDisc)`)}catch(err){fail(`${d}: startDiscipline threw: ${err?.stack||err}`);continue}
  await new Promise(r=>setTimeout(r,70));
  const live=w.AMLiveBroadcastV4.active,diag=w.AMLiveEventShellV5.diagnostics();
  if(!live)fail(`${d}: authoritative live simulation did not start.`);
  if(!diag?.active||!diag?.live)fail(`${d}: V5 shell did not remain connected to the live simulation.`);
  const family=w.AMLiveEventShellV5.family(d);
  if(!family)fail(`${d}: event family was not resolved.`);
  const pause=w.document.querySelector('[data-lv5-pause]'),speed4=w.document.querySelector('[data-lv5-speed="4"]'),skip=w.document.querySelector('[data-lv5-skip]');
  if(!pause||pause.disabled)fail(`${d}: pause control was unavailable during live play.`);
  if(!speed4||speed4.disabled)fail(`${d}: 4× control was unavailable during live play.`);
  if(!skip||skip.hidden||skip.disabled)fail(`${d}: safe skip-to-result control was unavailable during live play.`);

  try{
   if(skip&&!skip.hidden&&!skip.disabled)skip.click();
   else w.document.getElementById('v4skip')?.click();
  }catch(err){fail(`${d}: skip-to-result threw: ${err?.stack||err}`)}
  await new Promise(r=>setTimeout(r,55));
  const rows=w.__amV5QaEvent?.results?.[d];
  if(!Array.isArray(rows)||rows.length<1)fail(`${d}: no authoritative result was committed after completion.`);
  if(w.AMLiveBroadcastV4.active)fail(`${d}: live simulation remained active after result completion.`);
  const resultShell=w.AMLiveEventShellV5.diagnostics();
  if(!resultShell?.active)fail(`${d}: V5 shell disappeared on the confirmed result screen.`);
  notes.push(`${d} · ${family} · ${Array.isArray(rows)?rows.length:0} result rows`);
 }

 const source=fs.readFileSync(path.join(root,'scripts/live-event-shell-v5.js'),'utf8');
 for(const fake of ['K. Thompson','L. Richards','T. Okafor','7.6s','+0.8 m/s'])if(source.includes(fake))fail(`Reference screenshot placeholder leaked into implementation: ${fake}`);
 const css=fs.readFileSync(path.join(root,'styles/live-event-shell-v5.css'),'utf8');
 if(!/@media \(max-width:1180px\) and \(min-width:821px\)/.test(css))fail('iPad landscape breakpoint is missing.');
 if(!/grid-template-columns:minmax\(0,1fr\) clamp\(310px,27vw,390px\)/.test(css))fail('Desktop broadcast viewer/sidebar split is missing.');

}catch(err){
 if(!failures.length)fail(err?.stack||String(err));
}finally{
 try{dom?.window?.close()}catch(_){}
 try{server.closeAllConnections?.()}catch(_){}
 await new Promise(resolve=>server.close(resolve));
}

if(failures.length){
 console.error('\nUNIVERSAL LIVE EVENT SHELL V5 REGRESSION: FAILED\n');
 failures.forEach(item=>console.error(`✗ ${item}`));
 process.exit(1);
}
console.log('\nUNIVERSAL LIVE EVENT SHELL V5 REGRESSION: PASSED\n');
console.log(`✓ ${notes.length} current disciplines exercised from event-ready → live → confirmed result.`);
notes.forEach(item=>console.log(`✓ ${item}`));
console.log('✓ Broadcast V4 remained the authoritative simulation layer.');
console.log('✓ V5 shell retained scoreboard, commentary, progression, playback and event-aware information.');
console.log('✓ Reference screenshot demo names/values were not hard-coded.');
console.log('✓ iPad landscape and desktop shell contracts are present.');