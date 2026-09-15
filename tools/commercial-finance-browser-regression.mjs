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
 context=await browser.newContext({viewport:{width:1366,height:1024},hasTouch:true,deviceScaleFactor:1});
 page=await context.newPage();
 const pageErrors=[];
 page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
 await page.goto(`http://127.0.0.1:${port}/game.html`,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>window.AMProgrammeEconomy&&window.AMCommercialMediaPlanning&&window.AMCommercialContractLifecycle&&typeof window.fresh==='function',{timeout:20000});
 const seeded=await page.evaluate(()=>{
  try{
   return window.eval(`
    s=fresh('GREAT BRITAIN');
    ensureState();
    s.appointment=s.appointment||{};s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;
    s.induction=s.induction||{};s.induction.completed=true;s.managerName='Finance QA';
    const season=Number(s.game.season||1);
    const mgmt=managementState();mgmt.sponsors=mgmt.sponsors||{};
    mgmt.sponsors[season]={id:'podium',name:'Apex Performance',structure:'tiered',risk:'MEDIUM',season,signedWeek:Number(s.game.week||1),modelVersion:2,commercialVersion:2,mediaLegacy:false,mediaPlanningVersion:1,mediaDeadlineWeek:51,upfront:900000,annualGuaranteed:900000,bonus:805000,annualBonus:805000,goal:'Earn three international podiums after signing.',requiredMedia:3,mediaCompleted:0,mediaMissed:0,athleteAccess:'selected',athleteAccessLabel:'Selected athlete access',contractSeasons:2,contractStartSeason:season,contractEndSeason:season+1,contractYear:1,contractStatus:'active',podiums:0,wins:0,championshipMedals:0,internationalStarts:0,seen:{},commercialSeen:{},settled:false};
    s.commercial=s.commercial||{version:1,relationships:{},meetings:{},mediaEvents:[],history:[],proposalMailSeasons:{}};
    s.commercial.relationships=s.commercial.relationships||{};s.commercial.relationships.podium=55;s.commercial.mediaEvents=s.commercial.mediaEvents||[];
    const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
    AMCommercialMediaPlanning.activateDeal(mgmt.sponsors[season]);
    view('finance');
    AMProgrammeEconomy.renderFinance();
    'ok';
   `);
  }catch(err){return 'ERROR: '+String(err?.stack||err)}
 });
 assert.equal(seeded,'ok',seeded);

 const income=page.locator('#finance .pe-tabs button[data-tab="income"]');
 await income.click({timeout:3000});
 await page.waitForSelector('#finance #amCommercialMediaFinance',{state:'attached',timeout:5000});
 await page.waitForSelector('#finance #amCommercialContractTerms',{state:'attached',timeout:5000});

 for(let i=0;i<8;i++){
  await page.locator('#finance .pe-tabs button[data-tab="overview"]').click({timeout:3000});
  await page.locator('#finance .pe-tabs button[data-tab="income"]').click({timeout:3000});
  await page.waitForSelector('#finance #amCommercialMediaFinance',{state:'attached',timeout:3000});
  await page.waitForSelector('#finance #amCommercialContractTerms',{state:'attached',timeout:3000});
 }

 const state=await page.evaluate(()=>({
  active:[...document.querySelectorAll('.view.on')].map(x=>x.id),
  contractPanels:document.querySelectorAll('#finance #amCommercialContractTerms').length,
  mediaPanels:document.querySelectorAll('#finance #amCommercialMediaFinance').length,
  financeTabs:document.querySelectorAll('#finance .pe-tabs button').length
 }));
 assert.deepEqual(state.active,['finance'],'Finance interaction left the Finance route');
 assert.equal(state.contractPanels,1,'Negotiated contract panel duplicated during Finance interaction');
 assert.equal(state.mediaPanels,1,'Sponsor media panel duplicated during Finance interaction');
 assert.ok(state.financeTabs>=8,'Finance tab controls disappeared during interaction');
 assert.deepEqual(pageErrors,[],'WebKit reported an uncaught page error');
 console.log('Commercial finance WebKit regression passed.');
}finally{
 try{await context?.close()}catch(_){}
 try{await browser?.close()}catch(_){}
 try{server.closeAllConnections?.()}catch(_){}
 await new Promise(resolve=>server.close(resolve));
}
