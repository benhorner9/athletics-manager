import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html',full=path.resolve(root,rel);
  if(!full.startsWith(path.resolve(root)+path.sep)&&full!==path.resolve(root)){res.writeHead(403);res.end('Forbidden');return}
  if(!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end('Not found');return}
  res.writeHead(200,{'content-type':mime[path.extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(full).pipe(res);
 }catch(err){res.writeHead(500);res.end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();let browser,context,page;
try{
 browser=await webkit.launch({headless:true});context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,deviceScaleFactor:1,reducedMotion:'no-preference'});page=await context.newPage();
 const pageErrors=[];page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
 await page.goto(`http://127.0.0.1:${port}/game.html`,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>window.__amMarathonPlaybackIntegrityV2===1&&window.__amMarathonRoadBroadcastV3===1&&window.AMMarathonPlaybackIntegrityV2&&window.AMMarathonRoadBroadcastV3,{timeout:20000});
 const setup=await page.evaluate(()=>{
  try{return window.eval(`
   s=fresh('GREAT BRITAIN');s.appointment=s.appointment||{};s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;s.induction=s.induction||{};s.induction.completed=true;s.managerName='Natural Marathon QA';
   const e=s.events.find(x=>x.id==='road-spring');if(!e)throw new Error('road-spring missing');e.entries={MMarathon:[],WMarathon:[]};e.decision=true;e.completed=false;e.results={};s.game.week=e.week;s.game.careerWeek=e.week;
   document.getElementById('startup')?.classList.add('hidden');document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));document.getElementById('competition')?.classList.add('on');currentView='competition';competitionMode='discipline';activeEventDisc='MMarathon';disciplineRunning=false;liveEventView=null;drawCompetition();
   window.__qaNativeSetTimeout=window.setTimeout.bind(window);window.setTimeout=(fn,ms,...args)=>window.__qaNativeSetTimeout(fn,Math.min(Number(ms)||0,420),...args);
   ({ready:!!document.getElementById('startDisciplineTop')&&!document.getElementById('startDisciplineTop').disabled});
  `)}catch(err){return{error:String(err?.stack||err)}}
 });
 assert.ok(!setup.error,setup.error);assert.equal(setup.ready,true,'marathon start control should be ready');
 await page.click('#startDisciplineTop');await page.waitForSelector('.road-v3-stage',{timeout:5000});
 await page.waitForTimeout(560);
 const progressed=await page.evaluate(()=>{const e=s.events.find(x=>x.id==='road-spring'),dbg=window.AMMarathonRoadBroadcastV3?.debug?.(),guard=window.AMMarathonPlaybackIntegrityV2?.debug?.(),stage=document.querySelector('.road-v3-stage');return{index:dbg?.index,total:dbg?.total,guard,section:stage?.querySelector('.road-v3-head strong')?.textContent||'',distance:stage?.querySelector('[data-road-v3-distance]')?.textContent||'',results:Array.isArray(e?.results?.MMarathon),commentary:document.getElementById('commentary')?.textContent||''}});
 assert.ok(Number(progressed.index)>=1,'marathon never advanced beyond the start highlight');
 assert.ok(Number(progressed.index)<Number(progressed.total),'marathon completed before an intermediate highlight could render');
 assert.notEqual(progressed.section.trim(),'Start District','visual remained stuck on the opening road section');
 assert.equal(progressed.results,false,'official result committed during intermediate highlight playback');
 assert.doesNotMatch(progressed.commentary,/official result confirmed|wins in/i,'result commentary leaked during intermediate playback');
 await page.waitForFunction(()=>{const e=s.events.find(x=>x.id==='road-spring');return Array.isArray(e?.results?.MMarathon)&&!!document.querySelector('.road-v3-results')&&!document.getElementById('roadV3Skip')},{timeout:7000});
 const finished=await page.evaluate(()=>{const e=s.events.find(x=>x.id==='road-spring');return{results:Array.isArray(e?.results?.MMarathon),running:!!disciplineRunning,resultScreen:!!document.querySelector('.road-v3-results'),skip:!!document.getElementById('roadV3Skip'),guard:window.AMMarathonPlaybackIntegrityV2?.debug?.()}});
 assert.equal(finished.results,true,'natural marathon finish did not commit results');assert.equal(finished.running,false,'natural marathon finish left discipline running');assert.equal(finished.resultScreen,true,'natural marathon finish did not replace the highlight stage with official results');assert.equal(finished.skip,false,'skip-to-finish control remained after natural finish');assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error');
 console.log('Natural marathon playback WebKit regression passed.');
}finally{try{await context?.close()}catch(_){}try{await browser?.close()}catch(_){}try{server.closeAllConnections?.()}catch(_){}await new Promise(resolve=>server.close(resolve));}
