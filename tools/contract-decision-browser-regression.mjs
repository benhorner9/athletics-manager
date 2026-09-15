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
 context=await browser.newContext({viewport:{width:1024,height:1366},hasTouch:true,deviceScaleFactor:2});
 page=await context.newPage();
 const pageErrors=[];
 page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
 await page.goto(`http://127.0.0.1:${port}/game.html`,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>window.__athleticsInboxProduction&&window.__athleticsInboxV3&&window.AMProgrammeEconomy&&window.__athleticsInboxSingleRender&&typeof window.fresh==='function',{timeout:20000});

 const seeded=await page.evaluate(()=>{
  try{return window.eval(`
   s=fresh('GREAT BRITAIN');
   ensureState();
   s.induction=s.induction||{};s.induction.completed=true;s.managerName='Contract QA';
   const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
   const p=AMProgrammeEconomy.state();
   const contract=Object.values(p.athleteContracts||{}).find(c=>c&&c.state==='active');
   if(!contract)throw new Error('No active athlete programme contract available');
   const athlete=s.athletes.find(a=>String(a.id)===String(contract.athleteId));
   if(!athlete)throw new Error('Contract athlete missing');
   /* Reproduce an older/stale save where the appointment gate can still report pending. */
   const originalAppointmentPending=window.appointmentPending;
   window.appointmentPending=()=>true;
   const id='qa-athlete-contract-'+String(athlete.id);
   const mail={id,type:'contract',subject:'Contract decision: '+athlete.name,body:'There are eight weeks remaining on '+athlete.name+'’s programme agreement. Review the options in Finance → Contracts.',sender:'Performance Director',year:Number(s.game?.cycleYear||1),week:Number(s.game?.week||1),unread:true};
   s.emails=(s.emails||[]).filter(m=>m.id!==id);s.emails.push(mail);
   view('inbox');drawInbox();
   JSON.stringify({id,subject:mail.subject,athleteId:athlete.id});
  `)}catch(err){return 'ERROR: '+String(err?.message||err)+' | '+String(err?.stack||'')}
 });
 assert.ok(!String(seeded).startsWith('ERROR:'),seeded);
 const info=JSON.parse(seeded);

 for(let i=0;i<8;i++){
  const open=await page.evaluate(id=>{
   try{
    if(typeof drawInbox==='function')drawInbox();
    const row=document.querySelector(`[data-v3-mail="${CSS.escape(String(id))}"]`);
    if(!row)return 'missing-row';
    row.click();
    return 'ok';
   }catch(err){return 'ERROR: '+String(err?.message||err)+' | '+String(err?.stack||'')}
  },info.id);
  assert.equal(open,'ok',`Contract decision open failed on pass ${i+1}: ${open}`);
  await page.waitForFunction(subject=>document.querySelector('#reader h2')?.textContent?.includes(subject),info.subject,{timeout:5000});
  const reader=await page.evaluate(()=>({
   heading:document.querySelector('#reader h2')?.textContent||'',
   active:[...document.querySelectorAll('.view.on')].map(x=>x.id),
   readerHeads:document.querySelectorAll('#reader .reader-head').length,
   readerBodies:document.querySelectorAll('#reader .amv2-reader-body').length,
   readerActions:document.querySelectorAll('#reader .amv2-sticky-actions').length,
   contractButton:document.querySelectorAll('#reader [data-open-athlete-contracts]').length,
   appointmentSign:document.querySelectorAll('#reader #signContract,#reader #signContractBtn').length,
   contractDocs:document.querySelectorAll('#reader .contract-doc,#reader [data-appointment-contract]').length,
   inboxRows:document.querySelectorAll('#inbox [data-v3-mail]').length
  }));
  assert.ok(reader.heading.includes(info.subject),'Contract decision reader heading disappeared');
  assert.ok(reader.active.includes('inbox'),'Opening contract decision left Inbox unexpectedly');
  assert.equal(reader.readerHeads,1,'Contract decision reader header duplicated during repeated opens');
  assert.equal(reader.readerBodies,1,'Contract decision reader body duplicated during repeated opens');
  assert.equal(reader.readerActions,1,'Contract decision reader actions duplicated during repeated opens');
  assert.equal(reader.contractButton,1,'Athlete contract decision did not expose exactly one Open Contracts action');
  assert.equal(reader.appointmentSign,0,'Athlete contract decision leaked into appointment contract signing');
  assert.equal(reader.contractDocs,0,'Athlete contract decision rendered legacy appointment contract content');
  assert.ok(reader.inboxRows>=1,'Inbox rows disappeared after opening contract decision');
  const pulse=await page.evaluate(()=>({alive:true,now:performance.now()}));
  assert.equal(pulse.alive,true,'WebKit became unresponsive after opening contract decision');
 }

 const route=await page.evaluate(()=>{
  const b=document.querySelector('#reader [data-open-athlete-contracts]');if(!b)return {clicked:false};b.click();
  return {clicked:true,currentView:window.currentView,financeOn:document.getElementById('finance')?.classList.contains('on')||false};
 });
 assert.equal(route.clicked,true,'Open Contracts action was unavailable');
 assert.equal(route.currentView,'finance','Open Contracts did not route into Finance');
 assert.equal(route.financeOn,true,'Finance view was not activated by contract decision action');
 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error while opening programme contract decisions');
 console.log('Contract decision WebKit regression passed.');
}finally{
 try{await context?.close()}catch(_){}
 try{await browser?.close()}catch(_){}
 try{server.closeAllConnections?.()}catch(_){}
 await new Promise(resolve=>server.close(resolve));
}
