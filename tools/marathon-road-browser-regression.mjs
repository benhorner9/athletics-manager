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
 await page.waitForFunction(()=>window.__amMarathonRoadV1===1&&window.__amMarathonRoadBroadcastV2===1&&window.__amMarathonRoadBroadcastV3===1&&window.AMMarathonHighlightDirector&&window.AMMarathonRoadBroadcastV3&&typeof window.openRoadRaceSelection==='function',{timeout:20000});
 const seeded=await page.evaluate(()=>{
  try{return window.eval(`
   s=fresh('GREAT BRITAIN');
   s.appointment=s.appointment||{};s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;
   s.induction=s.induction||{};s.induction.completed=true;s.managerName='Road QA';
   const road=s.events.filter(e=>e.roadRace);
   if(road.length!==4)throw new Error('expected four road races, got '+road.length);
   const men=s.athletes.filter(a=>a.nation==='GREAT BRITAIN'&&a.disc==='MMarathon');
   const women=s.athletes.filter(a=>a.nation==='GREAT BRITAIN'&&a.disc==='WMarathon');
   if(men.length<3||women.length<3)throw new Error('missing GB marathon specialists');
   if([...men,...women].some(a=>a.inSquad!==false))throw new Error('marathon specialists should begin in the National Pool');
   const e=road.find(x=>x.id==='road-spring');e.entries={MMarathon:men.map(a=>a.id),WMarathon:women.map(a=>a.id)};e.decision=true;
   s.game.week=e.week;s.game.careerWeek=e.week;
   const eligible=eligibleFor(e,'MMarathon');if(eligible.length<men.length)throw new Error('open entry excluded National Pool marathon athletes');
   if(selectionEntryLimit(e,'MMarathon')<100)throw new Error('open entry cap still active');
   const field=buildEventField(e,'MMarathon');if(field.length<36)throw new Error('road field too small: '+field.length);
   const results=simulateDiscipline(e,'MMarathon');
   if(results.length<36)throw new Error('marathon simulation lost field depth');
   const roadMeta=e.engine?.MMarathon?.road;if(!roadMeta||roadMeta.distance!==42195)throw new Error('missing 42.195km engine metadata');
   if(roadMeta.checkpoints?.at(-1)?.metres!==42195)throw new Error('finish checkpoint missing');
   if(!roadMeta.checkpoints.some(x=>x.metres===35000))throw new Error('35km wall checkpoint missing');
   const ownResults=results.filter(x=>e.entries.MMarathon.includes(x.id));if(ownResults.length!==men.length)throw new Error('not all open GB entries reached race field');
   const plan=AMMarathonRoadBroadcastV3.direct(e,'MMarathon',results);
   const presentationMs=plan.presentationMs;
   if(presentationMs<180000||presentationMs>360000)throw new Error('marathon V3 duration outside 3–6 minute target: '+presentationMs);
   if(plan.highlights[0]?.metres!==0||plan.highlights[0]?.toMetres!==2000)throw new Error('opening broadcast does not animate the opening 2,000m');
   const hs=plan.highlights.map(h=>h.metres);
   for(const required of [0,2000,5000,10000,21097.5,30000,35000,38000,40000,41195,41695,42195])if(!hs.some(m=>Math.abs(m-required)<5))throw new Error('missing broadcast anchor '+required);
   const late=hs.filter(m=>m>=35000);if(late.length<6)throw new Error('late race coverage is not dense enough');
   if(!plan.events.every(x=>['START','ATTACK','LEAD_CHANGE','PACK_SPLIT','ATHLETE_DROPPED','CHASE_STARTED','GAP_CLOSED','INJURY','MAJOR_FADE','CHECKPOINT','FINAL_KM','FINISH'].includes(x.type)))throw new Error('unknown race event type');
   e.majorChampionship=true;const major=AMMarathonRoadBroadcastV3.direct(e,'MMarathon',results);e.majorChampionship=false;
   if(major.presentationMs<300000||major.presentationMs>360000)throw new Error('major championship coverage is not 5–6 minutes');
   if(major.highlights.length<=plan.highlights.length)throw new Error('major championship did not receive richer coverage');
   const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
   document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));document.getElementById('competition')?.classList.add('on');currentView='competition';competitionMode='discipline';activeEventDisc='MMarathon';
   disciplineRunning=false;liveEventView=null;drawCompetition();AMMarathonRoadBroadcastV3.start(e,'MMarathon');
   const stage=document.querySelector('.road-v3-stage');if(!stage)throw new Error('Broadcast V3 stage missing');
   const runnerNodes=[...stage.querySelectorAll('[data-road-v3-runner]')];if(runnerNodes.length<8)throw new Error('not enough road markers rendered');
   if(stage.querySelector('.road-v3-body'))throw new Error('V3 leaked human-sprite runner body instead of dot markers');
   const geometry=runnerNodes.map(node=>{const x=Number(node.dataset.x),lane=Number(node.dataset.lane),bounds=AMMarathonRoadBroadcastV2.roadBoundsAt(x);return{x,lane,halfWidth:bounds.halfWidth,transform:node.getAttribute('transform')}});
   if(geometry.some(g=>Math.abs(g.lane)>g.halfWidth*.62+.01))throw new Error('runner generated outside road corridor');
   const ownMarkers=stage.querySelectorAll('.road-v3-marker.own').length;
   const ownBoard=document.querySelectorAll('#roadLiveBoard .road-v3-board-row.own').length;
   if(!ownMarkers||!ownBoard)throw new Error('programme athletes are not visually trackable');
   const boardLeader=document.querySelector('#roadLiveBoard .road-v3-board-row span')?.textContent||'';
   const snap=AMMarathonRoadBroadcastV3.snapshotAt(e,'MMarathon',results,0);
   if(snap.entries[0]&&!boardLeader.includes(snap.entries[0].row.name))throw new Error('leaderboard is not synced to visual snapshot');
   ({events:road.map(x=>x.week),men:men.length,women:women.length,field:field.length,checkpoints:roadMeta.checkpoints.length,presentationMs,majorMs:major.presentationMs,highlightCount:plan.highlights.length,eventTypes:[...new Set(plan.events.map(x=>x.type))],themes:[...new Set(plan.highlights.map(x=>x.theme))],geometry,ownMarkers,ownBoard,html:document.getElementById('competition')?.innerHTML||''});
  `)}catch(err){return {error:String(err?.stack||err)}}
 });
 assert.ok(!seeded.error,seeded.error);
 assert.deepEqual(seeded.events,[10,21,32,43],'road race calendar changed');
 assert.ok(seeded.field>=36,'road field must remain large');
 assert.ok(seeded.checkpoints>=10,'road race needs full checkpoint coverage');
 assert.ok(seeded.presentationMs>=180000&&seeded.presentationMs<=360000,'routine broadcast must target 3–6 minutes');
 assert.ok(seeded.majorMs>=300000&&seeded.majorMs<=360000,'major marathon must target 5–6 minutes');
 assert.ok(seeded.highlightCount>=12,'highlight director returned too few broadcast moments');
 assert.match(seeded.html,/road-live-layout/,'marathon stopped using the existing road/live-event shell');
 assert.match(seeded.html,/road-v3-stage/,'Broadcast V3 stage did not replace the V2 snapshot');
 assert.match(seeded.html,/road-v3-dot/,'marathon did not use the 2D dot marker language');
 assert.match(seeded.html,/road-v3-progress/,'course progress indicator is missing');
 assert.match(seeded.html,/road-v3-board-row/,'synchronised V3 leaderboard is missing');
 assert.doesNotMatch(seeded.html,/oval-track|track-svg|athletics-track/i,'marathon leaked into a stadium oval presentation');
 assert.ok(seeded.themes.length>=3,'road route does not vary its environment enough');
 assert.ok(seeded.themes.includes('finish'),'finish environment is missing');

 await page.waitForTimeout(700);
 const moved=await page.evaluate(()=>{
  const nodes=[...document.querySelectorAll('[data-road-v3-runner]')];
  return nodes.map((node,i)=>{const x=Number(node.dataset.x||0),lane=Number(node.dataset.lane||0),bounds=AMMarathonRoadBroadcastV2.roadBoundsAt(x);return{index:i,x,lane,halfWidth:bounds.halfWidth,transform:node.getAttribute('transform')}});
 });
 assert.ok(moved.some((g,i)=>g.transform!==seeded.geometry[i]?.transform),'marathon markers did not move during the opening road section');
 assert.ok(moved.every(g=>Math.abs(g.lane)<=g.halfWidth*.62+.01),'animated marker escaped the road corridor');

 const skipped=await page.evaluate(()=>{
  const b=document.getElementById('roadV3Skip');if(!b)throw new Error('skip-to-finish button missing during live marathon');b.click();
  return {running:!!disciplineRunning,hasResults:Array.isArray(s.events.find(x=>x.id==='road-spring')?.results?.MMarathon),html:document.getElementById('roadLiveStage')?.innerHTML||'',rows:document.querySelectorAll('.road-v3-result-row').length,continueButton:!!document.querySelector('[data-road-v3-continue]')};
 });
 assert.equal(skipped.running,false,'skip-to-finish left the marathon running');
 assert.equal(skipped.hasResults,true,'skip-to-finish did not commit the simulated result');
 assert.ok(skipped.rows>=16,'in-event result screen does not show enough finishers');
 assert.equal(skipped.continueButton,true,'in-event results are missing Continue');
 assert.match(skipped.html,/OFFICIAL RESULT • MARATHON/,'official result presentation missing');

 const recovery=await page.evaluate(()=>window.eval(`
  const e=s.events.find(x=>x.id==='road-capital'),men=s.athletes.filter(a=>a.nation==='GREAT BRITAIN'&&a.disc==='MMarathon');e.entries={MMarathon:men.map(a=>a.id),WMarathon:[]};e.decision=true;s.game.week=e.week;s.game.careerWeek=e.week;
  const results=simulateDiscipline(e,'MMarathon');const before=men.map(a=>a.fatigue);commitDisciplineResults(e,'MMarathon',results);const after=men.map(a=>a.fatigue);commitDisciplineResults(e,'MMarathon',results);const twice=men.map(a=>a.fatigue);
  ({before,after,twice});
 `));
 assert.ok(recovery.after.some((v,i)=>v>recovery.before[i]),'marathon recovery load was not applied');
 assert.ok(recovery.twice.every((v,i)=>v===recovery.after[i]),'marathon recovery load applied twice');

 const selection=await page.evaluate(()=>{
  const e=s.events.find(x=>x.id==='road-autumn');openRoadRaceSelection(e);const dlg=document.getElementById('roadSelectionDialog');return {open:!!dlg?.open,cards:dlg?.querySelectorAll('.road-entry-card').length||0,pool:[...dlg?.querySelectorAll('.road-entry-card small')||[]].filter(x=>x.textContent.includes('NATIONAL POOL')).length,text:dlg?.textContent||'',cssLoaded:[...document.styleSheets].some(x=>String(x.href||'').includes('marathon-road-broadcast-v3.css'))};
 });
 assert.equal(selection.open,true,'open road selection dialog did not open');
 assert.ok(selection.cards>=6,'open road selection did not show both marathon fields');
 assert.ok(selection.pool>=6,'National Pool marathon athletes were not offered for direct open entry');
 assert.match(selection.text,/no programme entry cap/i,'open-entry rule is not visible to the manager');
 assert.equal(selection.cssLoaded,true,'Broadcast V3 stylesheet did not load');
 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error');
 console.log('Marathon & Road Racing WebKit regression passed.');
}finally{
 try{await context?.close()}catch(_){}try{await browser?.close()}catch(_){}try{server.closeAllConnections?.()}catch(_){}await new Promise(resolve=>server.close(resolve));
}
