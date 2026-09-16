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
  res.writeHead(200,{'content-type':mime[path.extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(full).pipe(res);
 }catch(err){res.writeHead(500);res.end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
let browser,context,page;
try{
 browser=await webkit.launch({headless:true});
 context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,deviceScaleFactor:2});
 page=await context.newPage();
 const pageErrors=[];
 page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
 await page.goto(`http://127.0.0.1:${port}/game.html`,{waitUntil:'load',timeout:30000});

 // A no-save browser deliberately lands on the main menu with `s === null`. Some late
 // UI layers finish attaching immediately after load, so poll for the actual APIs rather
 // than asking the page to render a career before the fixture installs one.
 let ready=false;
 for(let i=0;i<100&&!ready;i++){
  ready=await page.evaluate(()=>{
   try{return !!(window.__athleticsInboxProduction&&window.__athleticsInboxDecisionCore&&window.AMProgrammeEconomy&&window.AMAthleteContractExpiryGate&&window.eval(`typeof fresh==='function'&&typeof ensureState==='function'&&typeof view==='function'&&typeof drawInbox==='function'`))}catch(_){return false}
  });
  if(!ready)await page.waitForTimeout(50);
 }
 assert.equal(ready,true,'Athletics Manager contract/inbox runtime did not finish loading');
 // Startup/main-menu noise is outside this regression. From here on, every page error
 // belongs to the seeded urgent-contract journey and must fail the test.
 pageErrors.length=0;

 const seeded=await page.evaluate(()=>{
  try{return window.eval(`
   s=fresh('GREAT BRITAIN');
   ensureState();
   s.induction=s.induction||{};s.induction.completed=true;s.managerName='Contract Crash QA';
   const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
   const p=AMProgrammeEconomy.state();
   const c=Object.values(p.athleteContracts||{}).find(x=>x&&x.state==='active');
   if(!c)throw new Error('No active athlete programme contract available');
   const a=s.athletes.find(x=>String(x.id)===String(c.athleteId));
   if(!a)throw new Error('Contract athlete missing');
   const now=typeof careerNow==='function'?Number(careerNow()):Number(s.game?.careerWeek||s.game?.week||1);
   c.endCareerWeek=now+2;delete c.expiryDecision;delete c.expiryActionMailId;delete c.urgentWarned;
   s.emails=(s.emails||[]).filter(m=>m?.programmeAction?.kind!=='athlete-contract-expiry');
   const actions=__athleticsInboxDecisionCore.getUnresolvedActions();
   const action=actions.find(x=>x?.source==='programme-economy'&&String(x.entityId)===String(a.id));
   if(!action)throw new Error('Urgent contract action was not created');
   const mail=(s.emails||[]).find(m=>String(m.id)===String(action.emailId));
   if(!mail)throw new Error('Urgent contract email was not created');
   view('inbox');drawInbox();
   JSON.stringify({athleteId:a.id,mailId:mail.id,actionId:action.actionId,subject:mail.subject});
  `)}catch(err){return 'ERROR: '+String(err?.message||err)+' | '+String(err?.stack||'')}
 });
 assert.ok(!String(seeded).startsWith('ERROR:'),seeded);
 const info=JSON.parse(seeded);

 const opened=await page.evaluate(id=>{
  const row=document.querySelector(`[data-v3-mail="${CSS.escape(String(id))}"]`);
  if(!row)return {ok:false,reason:'missing-row'};
  row.click();return {ok:true};
 },info.mailId);
 assert.equal(opened.ok,true,`Urgent contract email could not be opened: ${opened.reason||'unknown'}`);
 await page.waitForFunction(subject=>document.querySelector('#reader h2')?.textContent?.includes('Contract decision')||document.querySelector('#reader h2')?.textContent?.includes(subject),info.subject,{timeout:5000});

 const routeButton=page.locator('#reader [data-open-programme],#reader [data-open-athlete-contracts],#reader [data-action-destination="finance"],#reader .reader-actions button').filter({hasText:/OPEN CONTRACTS|REVIEW CONTRACT|CONTRACT/i}).first();
 assert.ok(await routeButton.count(),'Urgent contract email did not expose a contract review action');
 await routeButton.click();
 await page.waitForFunction(()=>document.getElementById('finance')?.classList.contains('on'),null,{timeout:5000});
 await page.waitForTimeout(800);

 const heartbeat=await Promise.race([
  page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({
   alive:true,
   financeOn:document.getElementById('finance')?.classList.contains('on')||false,
   notes:document.querySelectorAll('#finance .am-contract-expiry-note').length,
   actionGroups:document.querySelectorAll('#finance .am-contract-expiry-actions').length,
   expiryButtons:document.querySelectorAll('#finance [data-am-contract-expire]').length
  }))))),
  new Promise((_,reject)=>setTimeout(()=>reject(new Error('Finance view stopped responding after urgent contract handoff')),4000))
 ]);
 assert.equal(heartbeat.alive,true,'WebKit heartbeat failed after urgent contract handoff');
 assert.equal(heartbeat.financeOn,true,'Finance Contracts view was not left active');
 assert.ok(heartbeat.notes>=1,'Urgent contract decoration was not rendered');
 assert.equal(heartbeat.actionGroups,heartbeat.notes,'Urgent contract controls duplicated during observer updates');
 assert.ok(heartbeat.expiryButtons>=1,'Allow Expiry action was not available');
 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error during urgent contract handoff');
 console.log('Urgent contract Finance WebKit stability regression passed.');
}finally{
 try{await context?.close()}catch(_){}
 try{await browser?.close()}catch(_){}
 try{server.closeAllConnections?.()}catch(_){}
 await new Promise(resolve=>server.close(resolve));
}
