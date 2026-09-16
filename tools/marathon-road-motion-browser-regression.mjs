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
 context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1,reducedMotion:'no-preference'});
 page=await context.newPage();
 const pageErrors=[];page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
 await page.goto(`http://127.0.0.1:${port}/game.html`,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>window.__amMarathonRoadBroadcastV3===1&&window.__amMarathonRoadMotionV4===1&&window.AMMarathonRoadMotionV4?.version===4,{timeout:20000});

 const seeded=await page.evaluate(()=>{
  try{return window.eval(`
   s=fresh('GREAT BRITAIN');
   s.appointment=s.appointment||{};s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;
   s.induction=s.induction||{};s.induction.completed=true;s.managerName='Motion QA';
   const e=s.events.find(x=>x.id==='road-spring');
   const men=s.athletes.filter(a=>a.nation==='GREAT BRITAIN'&&a.disc==='MMarathon');
   e.entries={MMarathon:men.map(a=>a.id),WMarathon:[]};e.decision=true;s.game.week=e.week;s.game.careerWeek=e.week;
   const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
   document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));document.getElementById('competition')?.classList.add('on');currentView='competition';competitionMode='discipline';activeEventDisc='MMarathon';disciplineRunning=false;liveEventView=null;
   drawCompetition();AMMarathonRoadBroadcastV3.start(e,'MMarathon');
   ({eventId:e.id});
  `)}catch(err){return {error:String(err?.stack||err)}}
 });
 assert.ok(!seeded.error,seeded.error);
 await page.waitForFunction(()=>document.querySelector('.road-v3-stage')?.dataset.motionModel==='athlete-first-v4'&&document.querySelectorAll('[data-road-v4-travel] [data-road-v3-runner][data-motion-v4="1"]').length>=8,{timeout:8000});

 const before=await page.evaluate(()=>({
  runners:[...document.querySelectorAll('[data-road-v3-runner]')].map(n=>({id:n.dataset.runnerId,renderX:Number(n.dataset.renderX),left:n.getBoundingClientRect().left})),
  roadMark:getComputedStyle(document.querySelector('.road-v3-road-mark')).animationName,
  far:getComputedStyle(document.querySelector('.road-v3-scroll-far')).animationName,
  near:getComputedStyle(document.querySelector('.road-v3-scroll-near')).animationName,
  model:document.querySelector('.road-v3-stage')?.dataset.motionModel||'',
  wrappers:document.querySelectorAll('[data-road-v4-travel]').length,
  cssLoaded:[...document.styleSheets].some(x=>String(x.href||'').includes('marathon-road-motion-v4.css'))
 }));
 await page.waitForTimeout(900);
 const after=await page.evaluate(()=>({
  runners:[...document.querySelectorAll('[data-road-v3-runner]')].map(n=>({id:n.dataset.runnerId,renderX:Number(n.dataset.renderX),renderLane:Number(n.dataset.renderLane),left:n.getBoundingClientRect().left,motion:n.dataset.motionV4})),
  geometry:[...document.querySelectorAll('[data-road-v3-runner]')].map(n=>{const x=Number(n.dataset.renderX),lane=Number(n.dataset.renderLane),b=AMMarathonRoadBroadcastV2.roadBoundsAt(x);return{x,lane,halfWidth:b.halfWidth}})
 }));
 const initial=new Map(before.runners.map(x=>[x.id,x]));
 const svgDeltas=after.runners.filter(x=>initial.has(x.id)).map(x=>x.renderX-initial.get(x.id).renderX);
 const pixelDeltas=after.runners.filter(x=>initial.has(x.id)).map(x=>x.left-initial.get(x.id).left);
 assert.ok(svgDeltas.length>=8,'not enough marathon markers survived motion sample');
 assert.ok(svgDeltas.filter(x=>x>10).length>=Math.ceil(svgDeltas.length*.7),`athletes did not travel forward through the road section: ${JSON.stringify(svgDeltas)}`);
 assert.ok(pixelDeltas.filter(x=>x>5).length>=Math.ceil(pixelDeltas.length*.7),`rendered athlete markers did not move forward on screen: ${JSON.stringify(pixelDeltas)}`);
 assert.ok(Math.max(...svgDeltas)>18,'lead motion was too small to read visually');
 assert.equal(before.roadMark,'none','road centre markings are still scrolling instead of staying fixed');
 assert.equal(before.far,'none','far scenery is still scrolling instead of staying fixed');
 assert.equal(before.near,'none','near scenery is still scrolling instead of staying fixed');
 assert.equal(before.model,'athlete-first-v4','marathon stage is not using athlete-first motion model');
 assert.ok(before.wrappers>=8,'athlete travel wrappers were not installed');
 assert.equal(before.cssLoaded,true,'athlete-first marathon motion stylesheet did not load');
 assert.ok(after.geometry.every(g=>Math.abs(g.lane)<=g.halfWidth*.60+.05),'athlete-first motion pushed a marker outside the road corridor');

 const model=await page.evaluate(()=>{
  const h={phase:'race',camera:'pack'};
  const leader={id:'leader',rank:1,gap:0,lane:0},chaser={id:'chaser',rank:2,gap:8,lane:0};
  const early=AMMarathonRoadMotionV4.screenPosition(leader,.12,h),late=AMMarathonRoadMotionV4.screenPosition(leader,.72,h),behind=AMMarathonRoadMotionV4.screenPosition(chaser,.72,h);
  return {early,late,behind,debug:AMMarathonRoadMotionV4.debug()};
 });
 assert.ok(model.late.x-model.early.x>250,'athlete world progress is not producing strong forward screen travel');
 assert.ok(model.late.x-model.behind.x>55,'simulated eight-second gap is not visually readable');
 assert.equal(model.debug.model,'athlete-first','motion API is not reporting athlete-first ownership');
 assert.equal(model.debug.ownership,'wrapper-transform','V3 and V4 do not have separated transform ownership');
 assert.equal(model.debug.roadScroll,false,'motion API still reports scrolling-road ownership');
 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error in athlete-first marathon motion');
 console.log('Marathon athlete-first motion WebKit regression passed.');
}finally{
 try{await context?.close()}catch(_){}try{await browser?.close()}catch(_){}try{server.closeAllConnections?.()}catch(_){}await new Promise(resolve=>server.close(resolve));
}
