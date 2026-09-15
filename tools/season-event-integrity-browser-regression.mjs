import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.b64':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  const full=path.resolve(root,rel);
  if(!full.startsWith(path.resolve(root)+path.sep)&&full!==path.resolve(root)){res.writeHead(403);res.end('Forbidden');return}
  if(!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'content-type':mime[path.extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(full).pipe(res)
 }catch(err){res.writeHead(500);res.end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
let browser,context,page;
try{
 browser=await webkit.launch({headless:true});
 context=await browser.newContext({viewport:{width:1024,height:1366},hasTouch:true,deviceScaleFactor:2});
 page=await context.newPage();
 const pageErrors=[];page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
 await page.goto(`http://127.0.0.1:${port}/game.html`,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>window.AMMarathonRoad&&window.AMSeasonEventIntegrity&&typeof window.fresh==='function'&&typeof window.makeEvents==='function',{timeout:20000});
 const outcome=await page.evaluate(()=>{
  try{return window.eval(`
   s=fresh('GREAT BRITAIN');ensureState();
   s.appointment=s.appointment||{};s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;
   s.induction=s.induction||{};s.induction.completed=true;s.managerName='Schedule QA';
   document.getElementById('startup')?.classList.add('hidden');
   const expected=makeEvents(Number(s.game.cycleYear||1),managedNation(),Number(careerState().cycleNumber||1));
   const normal=expected.filter(e=>!String(e.id||'').startsWith('road-'));
   const road=expected.find(e=>String(e.id||'').startsWith('road-'));
   if(normal.length<3)throw new Error('Expected normal season events were not generated');
   if(!road)throw new Error('Expected marathon road event was not generated');
   const keep=s.events.find(e=>String(e.id)===String(normal[0].id));
   const keepRoad=s.events.find(e=>String(e.id)===String(road.id));
   if(!keep||!keepRoad)throw new Error('Fresh season did not contain baseline event graph');
   keep.completed=true;keep.decision=true;keep.qaSentinel='preserve-me';keep.results={QA:[{id:'qa',place:1}]};
   s.game.week=20;s.game.careerWeek=20;
   s.events=[keep,keepRoad];
   const beforeIds=s.events.map(e=>e.id);
   const repair=AMSeasonEventIntegrity.repair();
   const expectedIds=expected.map(e=>String(e.id));
   const currentIds=s.events.map(e=>String(e.id));
   const missing=expectedIds.filter(id=>!currentIds.includes(id));
   const preserved=s.events.find(e=>String(e.id)===String(keep.id));
   const pastSource=normal.find(e=>Number(e.week)<20&&String(e.id)!==String(keep.id));
   const futureSource=normal.find(e=>Number(e.week)>=20&&String(e.id)!==String(keep.id));
   const past=pastSource?s.events.find(e=>String(e.id)===String(pastSource.id)):null;
   const future=futureSource?s.events.find(e=>String(e.id)===String(futureSource.id)):null;
   if(futureSource){s.uiCalendarV2=s.uiCalendarV2||{};s.uiCalendarV2.selectedWeek=Number(futureSource.week);s.uiCalendarV2.showPast=true;view('calendar');drawCalendar()}
   JSON.stringify({repair,beforeIds,missing,preservedSentinel:preserved?.qaSentinel,preservedResult:preserved?.results?.QA?.[0]?.place,pastRecovered:!!past?.recoveredMissingSchedule,pastCompleted:!!past?.completed,pastDecision:!!past?.decision,futureRecovered:!!future?.recoveredMissingSchedule,futureCompleted:!!future?.completed,normalCount:normal.length,roadCount:s.events.filter(e=>String(e.id||'').startsWith('road-')).length,calendarText:document.getElementById('calendar')?.textContent||'',futureName:futureSource?.name||''});
  `)}catch(err){return 'ERROR: '+String(err?.message||err)+' | '+String(err?.stack||'')}
 });
 assert.ok(!String(outcome).startsWith('ERROR:'),outcome);
 const data=JSON.parse(outcome);
 assert.equal(data.repair.changed,true,'Integrity layer did not detect the missing season graph');
 assert.equal(data.missing.length,0,'Not every authoritative season event was restored');
 assert.equal(data.preservedSentinel,'preserve-me','Existing event object/progress was replaced');
 assert.equal(data.preservedResult,1,'Existing event results were overwritten');
 assert.equal(data.pastRecovered,true,'Past missing event was not marked as recovered');
 assert.equal(data.pastCompleted,true,'Past restored event could still block the current career');
 assert.equal(data.pastDecision,true,'Past restored event was left awaiting a selection decision');
 assert.equal(data.futureRecovered,true,'Future missing event was not restored');
 assert.equal(data.futureCompleted,false,'Future restored event was incorrectly auto-completed');
 assert.ok(data.normalCount>=3,'Normal athletics meetings disappeared from the authoritative schedule');
 assert.ok(data.roadCount>=1,'Marathon/Road meetings disappeared during recovery');
 assert.ok(data.futureName&&data.calendarText.includes(data.futureName),'Restored normal event did not appear on Calendar');
 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error during event recovery');
 console.log('Season event integrity WebKit regression passed.');
}finally{
 try{await context?.close()}catch(_){}try{await browser?.close()}catch(_){}try{server.closeAllConnections?.()}catch(_){}await new Promise(resolve=>server.close(resolve));
}
