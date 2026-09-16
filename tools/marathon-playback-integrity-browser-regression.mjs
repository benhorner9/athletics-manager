import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.b64':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  const full=path.resolve(root,rel);
  if(!full.startsWith(path.resolve(root)+path.sep)&&full!==path.resolve(root)){res.writeHead(403);res.end('Forbidden');return}
  if(!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'content-type':mime[path.extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(full).pipe(res);
 }catch(err){res.writeHead(500);res.end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
let browser,context,page;
try{
 browser=await webkit.launch({headless:true});
 context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,deviceScaleFactor:1,reducedMotion:'no-preference'});
 page=await context.newPage();
 const pageErrors=[];page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
 await page.goto(`http://127.0.0.1:${port}/game.html`,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>window.__amMarathonRoadBroadcastV3===1&&window.__amMarathonRoadMotionV4===1&&window.__amMarathonPlaybackIntegrityV2===1&&window.AMMarathonRoadBroadcastV3&&window.AMMarathonPlaybackIntegrityV2,{timeout:20000});

 const setup=await page.evaluate(()=>{
  try{return window.eval(`
   s=fresh('GREAT BRITAIN');
   s.appointment=s.appointment||{};s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;
   s.induction=s.induction||{};s.induction.completed=true;s.managerName='Marathon Integrity QA';
   const e=s.events.find(x=>x.id==='road-spring');if(!e)throw new Error('road-spring missing');
   e.entries={MMarathon:[],WMarathon:[]};e.decision=true;e.completed=false;e.results={};
   s.game.week=e.week;s.game.careerWeek=e.week;
   const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
   document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));document.getElementById('competition')?.classList.add('on');
   currentView='competition';competitionMode='discipline';activeEventDisc='MMarathon';disciplineRunning=false;liveEventView=null;drawCompetition();
   ({button:document.getElementById('startDisciplineTop')?.textContent||'',disabled:!!document.getElementById('startDisciplineTop')?.disabled});
  `)}catch(err){return{error:String(err?.stack||err)}}
 });
 assert.ok(!setup.error,setup.error);assert.equal(setup.disabled,false,'marathon start control should be available');

 await page.click('#startDisciplineTop');
 await page.waitForSelector('.road-v3-stage',{timeout:5000});
 await page.waitForTimeout(800);
 const liveState=await page.evaluate(()=>{
  const e=s.events.find(x=>x.id==='road-spring'),commentary=document.getElementById('commentary')?.textContent||'',status=document.querySelector('.road-matchday .matchday-live-row small')?.textContent||'',stage=document.querySelector('.road-v3-stage');
  const roadMark=stage?.querySelector('.road-v3-road-mark'),far=stage?.querySelector('.road-v3-scroll-far'),near=stage?.querySelector('.road-v3-scroll-near');
  return {
   status,commentary,
   resultsCommitted:Array.isArray(e?.results?.MMarathon),
   live:!!liveEventView,
   index:Number(liveEventView?.index),
   phase:stage?.dataset.phase||'',
   roadMarkAnimation:roadMark?getComputedStyle(roadMark).animationName:'missing',
   farAnimation:far?getComputedStyle(far).animationName:'missing',
   nearAnimation:near?getComputedStyle(near).animationName:'missing',
   topButton:document.getElementById('startDisciplineTop')?.textContent||'',
   guard:window.AMMarathonPlaybackIntegrityV2?.debug?.()
  };
 });
 assert.equal(liveState.resultsCommitted,false,'official marathon result was committed before the highlight package finished');
 assert.equal(liveState.live,true,'live marathon context disappeared during the opening highlight');
 assert.match(liveState.status,/HIGHLIGHT 1\/6/i,'matchday shell did not stay in highlight playback state');
 assert.doesNotMatch(liveState.status,/COMPLETE|OFFICIAL/i,'matchday shell exposed a completed state during the opening highlight');
 assert.doesNotMatch(liveState.commentary,/official result|wins in|winner is|confirmed/i,'winner/result commentary leaked before the finish');
 assert.match(liveState.commentary,/field is away|start/i,'opening highlight commentary is not visible');
 assert.equal(liveState.topButton.trim(),'IN PROGRESS','top control did not show in-progress state');
 assert.equal(liveState.roadMarkAnimation,'none','road markings are still scrolling');
 assert.equal(liveState.farAnimation,'none','far scenery is still moving');
 assert.equal(liveState.nearAnimation,'none','near scenery is still moving');

 await page.click('#roadV3Skip');await page.waitForTimeout(250);
 const finished=await page.evaluate(()=>{const e=s.events.find(x=>x.id==='road-spring');return{results:Array.isArray(e?.results?.MMarathon),running:!!disciplineRunning,resultScreen:!!document.querySelector('.road-v3-results'),continueButton:!!document.querySelector('[data-road-v3-continue]')}});
 assert.equal(finished.results,true,'skip-to-finish did not commit the official result');
 assert.equal(finished.running,false,'skip-to-finish left marathon playback running');
 assert.equal(finished.resultScreen,true,'official result screen did not replace the highlight stage');
 assert.equal(finished.continueButton,true,'official result screen is missing Continue');
 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error');
 console.log('Marathon playback integrity WebKit regression passed.');
}finally{
 try{await context?.close()}catch(_){}try{await browser?.close()}catch(_){}try{server.closeAllConnections?.()}catch(_){}await new Promise(resolve=>server.close(resolve));
}
