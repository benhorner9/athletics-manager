import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';

const root=process.cwd();
const failures=[];
const notes=[];
const fail=message=>failures.push(message);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(predicate,{timeout=2500,interval=20}={}){
 const started=Date.now();
 while(Date.now()-started<timeout){
  try{if(predicate())return true}catch(_){ }
  await sleep(interval)
 }
 try{return !!predicate()}catch(_){return false}
}
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

 const geometryOffsets={M100:0,W100:0,M200:200,W200:200,M400:0,W400:0,M800:0,W800:0,M1500:100,W1500:100,M5000:200,W5000:200,M10000:0,W10000:0,M4X100:0,W4X100:0};
 for(const [d,offset] of Object.entries(geometryOffsets)){
  const g=w.AMLiveBroadcastV4.geometry?.(d,1);
  if(!g){fail(`${d}: track geometry diagnostics are unavailable.`);continue}
  if(Math.abs(g.startOffset-offset)>.01)fail(`${d}: visual start offset is ${g.startOffset}m, expected ${offset}m.`);
  if(Math.abs(g.finish.x-g.finishLineX)>.75)fail(`${d}: athlete path does not finish on the common finish line (x=${g.finish.x.toFixed(2)}, line=${g.finishLineX}).`);
  if(!g.straight&&g.preFinish.x>=g.finish.x)fail(`${d}: final approach is not travelling left-to-right along the home straight.`);
  if(!g.straight&&g.afterFinish?.x<=g.finish.x)fail(`${d}: post-finish path does not continue into the first bend.`);
 }
 const g400=w.AMLiveBroadcastV4.geometry('M400',8),g200=w.AMLiveBroadcastV4.geometry('M200',8),g1500=w.AMLiveBroadcastV4.geometry('M1500',1),g5000=w.AMLiveBroadcastV4.geometry('M5000',1);
 if(g400.stagger<53||g400.stagger>54.5)fail(`M400: lane-eight stagger is not a full-lap stagger (${g400.stagger.toFixed(2)}m).`);
 if(g200.stagger<26||g200.stagger>27.5)fail(`M200: lane-eight stagger is not a half-lap stagger (${g200.stagger.toFixed(2)}m).`);
 if(Math.hypot(g1500.start.x-g1500.finish.x,g1500.start.y-g1500.finish.y)<40)fail('M1500: start line is still effectively on the finish line.');
 if(Math.hypot(g5000.start.x-g5000.finish.x,g5000.start.y-g5000.finish.y)<80)fail('M5000: start line is still effectively on the finish line.');
 if(failures.length)throw new Error(failures.join('\n'));

 for(const d of disciplines){
  w.__amV5QaDisc=d;
  let prepared;
  try{
   prepared=w.eval(`
    (()=>{
     const d=window.__amV5QaDisc;
     const hold=d==='M100'?'W100':'M100';
     const ds=[d,hold];
     const entries=Object.fromEntries(ds.map(x=>[x,[]]));
     const e={id:'v5-qa-'+d,week:s.game.week,name:'Universal Live Event QA',kind:'competition',level:'International',location:'QA Stadium',disc:ds,ranked:false,star:1,entries,results:{},commentary:{}};
     s.events=[e];
     window.__amV5QaEvent=e;
     activeEventDisc=d;competitionMode='discipline';view('competition');drawDisciplineScreen(e,true,ds);
     return true;
    })()
   `)
  }catch(err){fail(`${d}: pre-event draw threw: ${err?.stack||err}`);break}
  if(!prepared){fail(`${d}: pre-event draw did not complete`);break}

  const ready=await waitFor(()=>w.AMLiveEventShellV5.diagnostics()?.active&&!!w.document.querySelector('#competition .lv5-sidebar')&&!!w.document.querySelector('[data-lv5-event-info]'));
  if(!ready){fail(`${d}: V5 shell did not settle on the event-ready screen.`);break}
  if(!w.document.getElementById('liveScoreboard')){fail(`${d}: live scoreboard was missing.`);break}
  if(!w.document.getElementById('commentary')){fail(`${d}: commentary panel was missing.`);break}
  if(!w.document.querySelector('[data-lv5-action]')){fail(`${d}: header progression action was missing.`);break}

  try{w.eval(`startDiscipline(window.__amV5QaEvent,window.__amV5QaDisc)`)}catch(err){fail(`${d}: startDiscipline threw: ${err?.stack||err}`);break}
  const liveReady=await waitFor(()=>{
   const diag=w.AMLiveEventShellV5.diagnostics(),pause=w.document.querySelector('[data-lv5-pause]'),speed4=w.document.querySelector('[data-lv5-speed="4"]'),skip=w.document.querySelector('[data-lv5-skip]');
   return !!w.AMLiveBroadcastV4.active&&diag?.active&&diag?.live&&diag?.redrawObserver&&pause&&!pause.disabled&&speed4&&!speed4.disabled&&skip&&!skip.hidden&&!skip.disabled
  });
  if(!liveReady){
   const diag=w.AMLiveEventShellV5.diagnostics(),sourceSkip=w.document.getElementById('v4skip');
   fail(`${d}: live shell did not reconnect after Broadcast V4 redrew the event (live=${!!w.AMLiveBroadcastV4.active}, shell=${!!diag?.active}, observer=${!!diag?.redrawObserver}, sourceSkip=${!!sourceSkip}).`);
   break
  }
  const family=w.AMLiveEventShellV5.family(d);
  if(!family){fail(`${d}: event family was not resolved.`);break}

  try{w.document.querySelector('[data-lv5-skip]').click()}catch(err){fail(`${d}: skip-to-result threw: ${err?.stack||err}`);break}
  const finished=await waitFor(()=>Array.isArray(w.__amV5QaEvent?.results?.[d])&&w.__amV5QaEvent.results[d].length>0&&!w.AMLiveBroadcastV4.active&&w.AMLiveEventShellV5.diagnostics()?.active,{timeout:3500});
  if(!finished){
   const rows=w.__amV5QaEvent?.results?.[d],diag=w.AMLiveEventShellV5.diagnostics();
   fail(`${d}: authoritative completion did not settle (rows=${Array.isArray(rows)?rows.length:'none'}, live=${!!w.AMLiveBroadcastV4.active}, shell=${!!diag?.active}).`);
   break
  }
  const homeReady=await waitFor(()=>{
   const action=w.document.querySelector('[data-lv5-action]');
   return !!action&&!action.disabled&&/RETURN HOME/i.test(String(action.textContent||''));
  });
  if(!homeReady){
   const action=w.document.querySelector('[data-lv5-action]'),day=w.document.getElementById('v3day'),start=w.document.getElementById('v3start');
   fail(`${d}: confirmed result did not expose Return Home (visible=${String(action?.textContent||'none').trim()}, day=${String(day?.textContent||'none').trim()}, start=${String(start?.textContent||'none').trim()}, startDisabled=${!!start?.disabled}).`);
   break
  }
  try{w.document.querySelector('[data-lv5-action]').click()}catch(err){fail(`${d}: Return Home action threw: ${err?.stack||err}`);break}
  const homeReached=await waitFor(()=>{try{return w.eval(`typeof currentView==='undefined'||currentView==='home'`)}catch(_){return false}});
  if(!homeReached){fail(`${d}: Return Home action did not leave the completed result for Home.`);break}
  const rows=w.__amV5QaEvent.results[d];
  notes.push(`${d} · ${family} · ${rows.length} result rows · Return Home`);
 }

 if(notes.length!==disciplines.length&&!failures.length)fail(`Only ${notes.length}/${disciplines.length} current disciplines completed the universal live-event lifecycle.`);
 const source=fs.readFileSync(path.join(root,'scripts/live-event-shell-v5.js'),'utf8');
 for(const fake of ['K. Thompson','L. Richards','T. Okafor','7.6s','+0.8 m/s'])if(source.includes(fake))fail(`Reference screenshot placeholder leaked into implementation: ${fake}`);
 const css=fs.readFileSync(path.join(root,'styles/live-event-shell-v5.css'),'utf8');
 if(!/@media \(max-width:1180px\) and \(min-width:821px\)/.test(css))fail('iPad landscape breakpoint is missing.');
 if(!/grid-template-columns:minmax\(0,1fr\) clamp\(310px,27vw,390px\)/.test(css))fail('Desktop broadcast viewer/sidebar split is missing.');

}catch(err){
 if(!failures.length)fail(err?.stack||String(err));
}finally{
 try{server.closeAllConnections?.()}catch(_){}
 try{server.close()}catch(_){}
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
console.log('✓ V5 shell survived authoritative live/result redraws without replacing simulation state.');
console.log('✓ V5 shell retained scoreboard, commentary, progression, playback and event-aware information.');
console.log('✓ Every current discipline result exposed and completed a Return Home route.');
console.log('✓ Reference screenshot demo names/values were not hard-coded.');
console.log('✓ iPad landscape and desktop shell contracts are present.');
process.exit(0);