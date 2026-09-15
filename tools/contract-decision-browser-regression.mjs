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
 await page.waitForFunction(()=>window.__athleticsInboxProduction&&window.__athleticsDecisionFinalizer&&window.__athleticsInboxV3&&typeof window.fresh==='function'&&typeof window.updateCoachContracts==='function',{timeout:20000});

 const seeded=await page.evaluate(()=>{
  try{return window.eval(`
   s=fresh('GREAT BRITAIN');
   ensureState();
   s.appointment=s.appointment||{};s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;
   s.induction=s.induction||{};s.induction.completed=true;s.managerName='Contract QA';
   const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
   ensureCoaches();
   const role=Object.keys(s.coaches||{}).find(r=>s.coaches[r]);
   if(!role)throw new Error('No staff role available');
   const coach=s.coaches[role];
   coach.until=coachWeek()+1;delete coach.warned;
   updateCoachContracts();
   const mail=[...(s.emails||[])].reverse().find(m=>/^Contract decision:/i.test(String(m.subject||'')));
   if(!mail)throw new Error('Contract decision email not generated');
   view('inbox');drawInbox();
   JSON.stringify({id:mail.id,subject:mail.subject,role});
  `)}catch(err){return 'ERROR: '+String(err?.stack||err)}
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
   }catch(err){return 'ERROR: '+String(err?.stack||err)}
  },info.id);
  assert.equal(open,'ok',`Contract decision open failed on pass ${i+1}: ${open}`);
  await page.waitForFunction(subject=>document.querySelector('#reader h2')?.textContent?.includes(subject),info.subject,{timeout:5000});
  const reader=await page.evaluate(()=>({
   heading:document.querySelector('#reader h2')?.textContent||'',
   renew:!!document.querySelector('#reader [data-staff-renew]'),
   expire:!!document.querySelector('#reader [data-staff-expire]'),
   staff:!!document.querySelector('#reader [data-open-staff]'),
   active:[...document.querySelectorAll('.view.on')].map(x=>x.id),
   actionCount:window.__athleticsInboxDecisionCore?.getUnresolvedActions?.().length||0
  }));
  assert.ok(reader.heading.includes(info.subject),'Contract decision reader heading disappeared');
  assert.equal(reader.renew,true,'Renew contract action missing');
  assert.equal(reader.expire,true,'Expire contract action missing');
  assert.equal(reader.staff,true,'Open staff action missing');
  assert.ok(reader.active.includes('inbox'),'Opening contract decision left Inbox unexpectedly');
  assert.ok(reader.actionCount>=1,'Contract decision disappeared from unresolved actions');
  const pulse=await page.evaluate(()=>({alive:true,now:performance.now()}));
  assert.equal(pulse.alive,true,'WebKit became unresponsive after opening contract decision');
 }

 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error while opening contract decisions');
 console.log('Contract decision WebKit regression passed.');
}finally{
 try{await context?.close()}catch(_){}
 try{await browser?.close()}catch(_){}
 try{server.closeAllConnections?.()}catch(_){}
 await new Promise(resolve=>server.close(resolve));
}
