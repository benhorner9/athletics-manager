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
 await page.waitForFunction(()=>window.__amMarathonRoadV1===1&&window.__amMarathonRoadBroadcastV2===1&&window.AMMarathonRoadBroadcastV2&&typeof window.openRoadRaceSelection==='function',{timeout:20000});
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
   const lines=commentaryLines('MMarathon',results,e);
   const presentationMs=AMMarathonRoadBroadcastV2.presentationMs(lines,e,'MMarathon');
   const startSegment=AMMarathonRoadBroadcastV2.segmentFor(e,'MMarathon',lines[0]);
   if(startSegment.fromMetres!==0||startSegment.toMetres!==2000)throw new Error('start broadcast is not the animated opening 2,000m');
   if(presentationMs<105000||presentationMs>125000)throw new Error('marathon broadcast duration outside two-minute target: '+presentationMs);
   const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
   document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));document.getElementById('competition')?.classList.add('on');currentView='competition';competitionMode='discipline';activeEventDisc='MMarathon';
   disciplineRunning=true;liveEventView={event:e,disc:'MMarathon',results,lines,index:0};drawCompetition();
   const stage=document.querySelector('.road-v2-stage');if(!stage)throw new Error('Broadcast V2 stage missing');
   const runnerNodes=[...stage.querySelectorAll('[data-road-v2-runner]')];if(runnerNodes.length<8)throw new Error('not enough animated road runners rendered');
   const geometry=runnerNodes.map(node=>{const x=Number(node.dataset.x),lane=Number(node.dataset.lane),bounds=AMMarathonRoadBroadcastV2.roadBoundsAt(x);return{x,lane,halfWidth:bounds.halfWidth,transform:node.getAttribute('transform')}});
   if(geometry.some(g=>Math.abs(g.lane)>g.halfWidth*.55+.01))throw new Error('runner generated outside road corridor');
   ({events:road.map(x=>x.week),men:men.length,women:women.length,field:field.length,checkpoints:roadMeta.checkpoints.length,presentationMs,startSegment,geometry,lines,html:document.getElementById('competition')?.innerHTML||''});
  `)}catch(err){return {error:String(err?.stack||err)}}
 });
 assert.ok(!seeded.error,seeded.error);
 assert.deepEqual(seeded.events,[10,21,32,43],'road race calendar changed');
 assert.ok(seeded.field>=36,'road field must remain large');
 assert.ok(seeded.checkpoints>=10,'road race needs full checkpoint coverage');
 assert.ok(seeded.presentationMs>=105000&&seeded.presentationMs<=125000,'broadcast should last around two minutes');
 assert.equal(seeded.startSegment.toMetres,2000,'opening sequence must visually cover 2,000m');
 assert.match(seeded.html,/road-live-layout/,'marathon did not render the dedicated road broadcast layout');
 assert.match(seeded.html,/road-v2-stage/,'animated Broadcast V2 stage did not replace the static road snapshot');
 assert.match(seeded.html,/road-v2-body/,'marathon runners did not render as animated runner figures');
 assert.match(seeded.html,/START ZONE|START SEQUENCE/,'start-line environment is missing');
 assert.doesNotMatch(seeded.html,/oval-track|track-svg|athletics-track/i,'marathon leaked into a stadium oval presentation');

 await page.waitForTimeout(650);
 const moved=await page.evaluate(()=>{
  const nodes=[...document.querySelectorAll('[data-road-v2-runner]')];
  return nodes.map((node,i)=>{const x=Number(node.getAttribute('transform')?.match(/translate\(([-\d.]+)/)?.[1]||0),lane=Number(node.dataset.lane),bounds=AMMarathonRoadBroadcastV2.roadBoundsAt(x);return{index:i,x,lane,center:bounds.center,halfWidth:bounds.halfWidth,transform:node.getAttribute('transform')}});
 });
 assert.ok(moved.some((g,i)=>g.transform!==seeded.geometry[i]?.transform),'runner sprites did not move during the opening road segment');
 assert.ok(moved.every(g=>Math.abs(g.lane)<=g.halfWidth*.55+.01),'animated runner escaped the road corridor');

 const recovery=await page.evaluate(()=>window.eval(`
  disciplineRunning=false;liveEventView=null;
  const e=s.events.find(x=>x.id==='road-spring'),men=s.athletes.filter(a=>a.nation==='GREAT BRITAIN'&&a.disc==='MMarathon'),results=e.engine.MMarathon.stages[0].rows.map(x=>{const source=s.athletes.find(a=>a.id===x.id);return{id:x.id,name:x.name,nation:x.nation,perf:x.mark,place:x.place,wallSeverity:0,roadPlan:'even',pb:source?.pb}}).sort((a,b)=>a.perf-b.perf);
  const before=men.map(a=>a.fatigue);commitDisciplineResults(e,'MMarathon',results);const after=men.map(a=>a.fatigue);commitDisciplineResults(e,'MMarathon',results);const twice=men.map(a=>a.fatigue);
  ({before,after,twice});
 `));
 assert.ok(recovery.after.some((v,i)=>v>recovery.before[i]),'marathon recovery load was not applied');
 assert.ok(recovery.twice.every((v,i)=>v===recovery.after[i]),'marathon recovery load applied twice');

 const environments=await page.evaluate(()=>{
  const e=s.events.find(x=>x.id==='road-spring'),rows=e.results?.MMarathon||[];
  const api=AMMarathonRoadBroadcastV2;
  const fakeLines=[
   ...Object.keys(e.engine?.MMarathon?.broadcastCues||{}).filter(x=>/PARK|RIVERSIDE|CANAL|BRIDGE|FINISH/i.test(x))
  ];
  return {themes:[...new Set(fakeLines.map(line=>api.segmentFor(e,'MMarathon',line).theme))],cssLoaded:[...document.styleSheets].some(x=>String(x.href||'').includes('marathon-road-broadcast-v2.css'))};
 });
 assert.equal(environments.cssLoaded,true,'Broadcast V2 stylesheet did not load');
 assert.ok(environments.themes.some(x=>['woodland','waterside','bridge','finish'].includes(x)),'course environment switching is not represented');

 const selection=await page.evaluate(()=>{
  const e=s.events.find(x=>x.id==='road-capital');openRoadRaceSelection(e);const dlg=document.getElementById('roadSelectionDialog');return {open:!!dlg?.open,cards:dlg?.querySelectorAll('.road-entry-card').length||0,pool:[...dlg?.querySelectorAll('.road-entry-card small')||[]].filter(x=>x.textContent.includes('NATIONAL POOL')).length,text:dlg?.textContent||''};
 });
 assert.equal(selection.open,true,'open road selection dialog did not open');
 assert.ok(selection.cards>=6,'open road selection did not show both marathon fields');
 assert.ok(selection.pool>=6,'National Pool marathon athletes were not offered for direct open entry');
 assert.match(selection.text,/no programme entry cap/i,'open-entry rule is not visible to the manager');
 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error');
 console.log('Marathon & Road Racing WebKit regression passed.');
}finally{
 try{await context?.close()}catch(_){}try{await browser?.close()}catch(_){}try{server.closeAllConnections?.()}catch(_){}await new Promise(resolve=>server.close(resolve));
}