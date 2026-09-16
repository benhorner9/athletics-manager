import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
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
  res.writeHead(200,{'content-type':mime[path.extname(full).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(full).pipe(res);
 }catch(err){res.writeHead(500);res.end(String(err))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const gameUrl=`http://127.0.0.1:${port}/game.html`;

let browser,context,page;
const pageErrors=[];
const fail=message=>{throw new Error(message)};
try{
 browser=await webkit.launch({headless:true});
 context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true});
 page=await context.newPage();
 page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));

 console.log('[new-career] load locked main menu');
 await page.goto(gameUrl,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>typeof window.fresh==='function'&&document.getElementById('alphaAccessForm'),{timeout:20000});
 await page.waitForSelector('.menu-side.alpha-locked',{timeout:5000});

 console.log('[new-career] unlock alpha access');
 await page.fill('#alphaAccessCode','AM-ALPHA-16');
 await page.click('#alphaAccessSubmit');
 await page.waitForSelector('.menu-side.alpha-unlocked',{timeout:8000});
 if(await page.locator('#newBtn').isDisabled())fail('Start New Career stayed disabled after valid alpha access.');

 console.log('[new-career] choose nation and create career');
 await page.click('#newBtn');
 await page.waitForSelector('#nationModal:not(.hidden)',{timeout:5000});
 await page.click('#nationGrid [data-nation="GREAT BRITAIN"]');
 if(await page.locator('#beginCareerBtn').isDisabled())fail('Review Job Offer stayed disabled after choosing Great Britain.');
 await page.click('#beginCareerBtn');
 await page.waitForFunction(()=>document.getElementById('firstDay')?.open&&s?.induction?.step==='arrival',{timeout:10000});
 await page.waitForSelector('#firstDay[open] .ftx-firstday [data-ftx-review-offer]',{timeout:5000});
 const initial=await page.evaluate(()=>({
  nation:s.managedNation,
  contractSigned:s.appointment?.contractSigned,
  inductionStep:s.induction?.step,
  week:s.game?.week,
  active:[...document.querySelectorAll('.view.on')].map(el=>el.id)
 }));
 if(initial.nation!=='GREAT BRITAIN')fail(`New career created the wrong nation: ${initial.nation}`);
 if(initial.contractSigned!==false)fail('Fresh career unexpectedly started with appointment already signed.');
 if(initial.inductionStep!=='arrival')fail(`Fresh career opened the wrong onboarding step: ${initial.inductionStep}`);
 if(initial.week!==1)fail(`Fresh career started in Week ${initial.week} instead of Week 1.`);
 if(!initial.active.includes('inbox'))fail(`Unsigned appointment did not route to Inbox; active views: ${initial.active.join(', ')}`);

 console.log('[new-career] review and accept appointment');
 await page.click('[data-ftx-review-offer]');
 await page.waitForFunction(()=>s?.induction?.step==='contract',{timeout:5000});
 await page.waitForSelector('#firstDay[open] #ftxFirstDayName',{timeout:5000});
 await page.fill('#ftxFirstDayName','Phase One QA');
 await page.click('[data-ftx-sign]');
 await page.waitForFunction(()=>s?.appointment?.contractSigned===true&&document.getElementById('firstDay')?.open,{timeout:10000});
 await page.waitForSelector('#firstDay[open] [data-ftx-enter]',{timeout:5000});
 const signed=await page.evaluate(()=>({
  signed:s.appointment?.contractSigned,
  name:s.managerName,
  welcome:s.emails.some(m=>m.type==='welcome'),
  ftx:window.AMFirstTimeExperienceV2?true:false,
  opening:(s.events||[]).find(e=>e.id==='opening-meet-v2')||null
 }));
 if(!signed.signed)fail('Accepting the appointment did not persist contractSigned.');
 if(signed.name!=='Phase One QA')fail(`Manager name did not persist from onboarding: ${signed.name}`);
 if(!signed.welcome)fail('Accepting the appointment did not seed the welcome message.');
 if(!signed.ftx)fail('First-Time Experience V2 was not loaded for a fresh career.');
 if(!signed.opening||Number(signed.opening.week)!==5)fail(`Fresh career did not schedule the Week 5 opening competition: ${JSON.stringify(signed.opening)}`);

 console.log('[new-career] enter performance centre');
 await page.click('[data-ftx-enter]');
 await page.waitForFunction(()=>!document.getElementById('firstDay')?.open,{timeout:5000});
 await page.waitForSelector('#home.view.on',{timeout:5000});
 const complete=await page.evaluate(()=>({
  induction:s.induction?.completed,
  week:s.game?.week,
  careerYear:careerState().careerYear,
  save:!!readCareerSave(),
  startupHidden:document.getElementById('startup')?.classList.contains('hidden'),
  ftxState:s.firstTimeExperienceV2||null
 }));
 if(!complete.induction)fail('First-day onboarding did not enter completed state.');
 if(complete.week!==1)fail('Entering the Performance Centre incorrectly advanced the opening week.');
 if(complete.careerYear!==1)fail(`New career reports Career Year ${complete.careerYear} instead of 1.`);
 if(!complete.save)fail('Completed onboarding did not leave a recoverable career save.');
 if(!complete.startupHidden)fail('Main menu remained visible after onboarding completed.');
 if(!complete.ftxState||complete.ftxState.completed)fail(`Guided First-Time Experience was not active after onboarding: ${JSON.stringify(complete.ftxState)}`);

 console.log('[new-career] reload and continue saved career');
 await page.reload({waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>typeof window.readCareerSave==='function'&&document.getElementById('continueBtn'),{timeout:20000});
 await page.waitForSelector('.menu-side.alpha-unlocked',{timeout:5000});
 if(await page.locator('#continueBtn').isDisabled())fail('Continue Career was disabled after reloading a completed new-career save.');
 await page.click('#continueBtn');
 await page.waitForSelector('#home.view.on',{timeout:8000});
 const resumed=await page.evaluate(()=>({
  nation:s.managedNation,
  name:s.managerName,
  signed:s.appointment?.contractSigned,
  induction:s.induction?.completed,
  week:s.game?.week,
  firstDayOpen:!!document.getElementById('firstDay')?.open,
  ftxActive:!!s.firstTimeExperienceV2&&!s.firstTimeExperienceV2.completed
 }));
 if(resumed.nation!=='GREAT BRITAIN'||resumed.name!=='Phase One QA'||!resumed.signed||!resumed.induction||resumed.week!==1)fail(`Saved career resumed with incorrect state: ${JSON.stringify(resumed)}`);
 if(resumed.firstDayOpen)fail('Completed appointment onboarding reopened after reload/continue.');
 if(!resumed.ftxActive)fail('Guided First-Time Experience did not survive reload/continue.');
 if(pageErrors.length)fail(`Uncaught page errors during new-career flow:\n${pageErrors.join('\n---\n')}`);

 console.log('\nNEW CAREER FLOW REGRESSION: PASSED');
 console.log('✓ locked main menu → alpha access');
 console.log('✓ Start New Career → nation selection → appointment');
 console.log('✓ authoritative First-Time Experience → Home without accidental week advance');
 console.log('✓ Week 5 opening competition scheduled');
 console.log('✓ reload → Continue Career restored the same save and guided state');
}finally{
 try{await context?.close()}catch(_){}
 try{await browser?.close()}catch(_){}
 try{server.closeAllConnections?.()}catch(_){}
 await new Promise(resolve=>server.close(resolve));
}
