import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,webkit} from 'playwright';

const root=process.cwd();
const artifacts=path.join(root,'.qa-artifacts');
fs.mkdirSync(artifacts,{recursive:true});

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
const gameUrl=`http://127.0.0.1:${port}/game.html`;

const allRoutes=[
 ['home','.home-v2,[data-am-ui-screen="home-v2"]'],
 ['inbox','.am-inbox-v3,[data-am-ui-screen="inbox-v3"]'],
 ['squad','.sav2,[data-am-ui-screen="squad-v2"]'],
 ['pool','.sav2,[data-am-ui-screen="pool-v2"]'],
 ['clubs','.clv1,[data-am-ui-screen="club-world-v1"]'],
 ['calendar','.calv2,[data-am-ui-screen="calendar-v2"]'],
 ['training','.tr4-shell,[data-am-ui-screen="training-v4"]'],
 ['scouting','.scouting-v2-active,[data-am-ui-screen="scouting-v2"]'],
 ['league','.wsv2,[data-am-ui-screen="summit-v2"]'],
 ['rankings','.wsv2,[data-am-ui-screen="rankings-v2"]'],
 ['olympics','.wsv2,[data-am-ui-screen="qualification-v3"]'],
 ['staff','.pe-shell,[data-am-ui-screen="programme-staff-v2"]'],
 ['finance','.pe-shell,[data-am-ui-screen="programme-economy-v2"]'],
 ['news','.wsv2,[data-am-ui-screen="world-news-v2"]']
];
const mobileRoutes=allRoutes.filter(([route])=>['home','inbox','squad','pool','calendar','training','league','rankings','finance'].includes(route));
const scenarios=[
 {engine:'chromium',browserType:chromium,name:'chromium-desktop',viewport:{width:1440,height:900},mobile:false,routes:allRoutes},
 {engine:'webkit',browserType:webkit,name:'webkit-ipad-landscape',viewport:{width:1366,height:1024},mobile:false,touch:true,routes:allRoutes},
 {engine:'webkit',browserType:webkit,name:'webkit-iphone',viewport:{width:430,height:932},mobile:true,touch:true,routes:mobileRoutes}
];

const failures=[];
const notes=[];
const fail=(scenario,message)=>failures.push(`${scenario}: ${message}`);

async function initialiseCareer(page){
 await page.goto(gameUrl,{waitUntil:'load',timeout:30000});
 await page.waitForFunction(()=>window.AthleticsUI&&window.AMTrainingSystem2&&typeof window.fresh==='function',{timeout:20000});
 const result=await page.evaluate(()=>{
  try{
   return window.eval(`
    s=fresh('GREAT BRITAIN');
    ensureState();
    s.appointment=s.appointment||{};
    s.appointment.contractSigned=true;
    s.appointment.completed=true;
    s.appointment.introSeeded=true;
    s.induction=s.induction||{};
    s.induction.completed=true;
    s.managerName='Automated QA';
    const startup=document.getElementById('startup');if(startup)startup.classList.add('hidden');
    try{save()}catch(_){ }
    view('home');
    'ok';
   `);
  }catch(err){return 'ERROR: '+String(err?.stack||err)}
 });
 if(result!=='ok')throw new Error(result);
 await page.waitForTimeout(250);
}

async function inspectRoute(page,scenario,route,selector){
 await page.evaluate(target=>view(target),route);
 const settle=route==='scouting'?7600:['training','staff','finance'].includes(route)?2100:850;
 await page.waitForTimeout(settle);
 try{await page.waitForSelector(`#${route} ${selector}, #${route}${selector.startsWith('.')?selector:''}`,{state:'attached',timeout:route==='scouting'?9000:4000})}
 catch(_){
  const has=await page.evaluate(({route,selector})=>{const root=document.getElementById(route);try{return !!root&&(root.matches?.(selector)||!!root.querySelector(selector))}catch(_){return false}},{route,selector});
  if(!has)fail(scenario.name,`${route} did not render canonical selector ${selector}`);
 }
 const state=await page.evaluate(route=>{
  const active=[...document.querySelectorAll('.view.on')].map(x=>x.id);
  const root=document.getElementById(route);
  const docOverflow=Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth);
  const rootOverflow=root&&root.clientWidth?Math.max(0,root.scrollWidth-root.clientWidth):0;
  return{
   active,
   recovery:!!root?.querySelector('.am-cutover-error'),
   docOverflow,
   rootOverflow,
   coachPanel:route==='training'?!!root?.querySelector('.am-coach-plan'):null,
   attentionTab:route==='training'?!!root?.querySelector('[data-am-tr4-attention-tab]'):null,
   attentionAuthority:route==='training'?Number(window.__athleticsTrainingAttentionDecisions?.version||0):null,
   poolClipped:route==='pool'?[...root.querySelectorAll('.sav2-attr,.sav2-range,.sav2-keyattrs span')].some(el=>{
    const cell=el.closest('td');if(!cell)return false;
    const a=el.getBoundingClientRect(),b=cell.getBoundingClientRect();
    return a.right>b.right+1||a.left<b.left-1||a.bottom>b.bottom+1;
   }):null
  }
 },route);
 if(state.active.length!==1||state.active[0]!==route)fail(scenario.name,`${route} left active routes: ${state.active.join(', ')||'none'}`);
 if(state.recovery)fail(scenario.name,`${route} displayed the Interface Recovery fallback`);
 if(state.docOverflow>2)fail(scenario.name,`${route} creates ${state.docOverflow}px of page-level horizontal overflow`);
 if(route==='training'&&!state.coachPanel)fail(scenario.name,'Training Overview is missing the Performance Staff recommendation panel');
 if(route==='training'&&!state.attentionTab)fail(scenario.name,'Training is missing the canonical Needs Attention tab');
 if(route==='training'&&state.attentionAuthority!==5)fail(scenario.name,`Training attention authority version ${state.attentionAuthority||'none'} loaded instead of V5`);
 if(route==='pool'&&state.poolClipped)fail(scenario.name,'National Pool ratings extend outside their table cells');
 notes.push(`${scenario.name} · ${route} · overflow ${state.docOverflow}px`);

 if(scenario.name==='webkit-ipad-landscape'&&['pool','training','league'].includes(route)){
  await page.screenshot({path:path.join(artifacts,`${scenario.name}-${route}.png`),fullPage:true});
 }
}

for(const scenario of scenarios){
 console.log(`\n══ Browser QA: ${scenario.name} ══`);
 let browser,context,page;
 const pageErrors=[];
 try{
  browser=await scenario.browserType.launch({headless:true});
  context=await browser.newContext({viewport:scenario.viewport,isMobile:scenario.mobile,hasTouch:!!scenario.touch,deviceScaleFactor:1});
  page=await context.newPage();
  page.on('pageerror',err=>pageErrors.push(String(err?.stack||err)));
  await initialiseCareer(page);
  for(const [route,selector] of scenario.routes){
   console.log(`[browser-qa] ${scenario.name} → ${route}`);
   await inspectRoute(page,scenario,route,selector);
  }
  if(pageErrors.length)for(const err of pageErrors)fail(scenario.name,`uncaught page error: ${err}`);
 }catch(err){
  fail(scenario.name,err?.stack||String(err));
  try{if(page)await page.screenshot({path:path.join(artifacts,`${scenario.name}-failure.png`),fullPage:true})}catch(_){}
 }finally{
  try{await context?.close()}catch(_){}
  try{await browser?.close()}catch(_){}
 }
}

try{server.closeAllConnections?.()}catch(_){}
await new Promise(resolve=>server.close(resolve));

if(failures.length){
 console.error('\nATHLETICS MANAGER REAL-BROWSER QA: FAILED\n');
 failures.forEach(item=>console.error(`✗ ${item}`));
 console.error(`\nScreenshots, where available, are in ${path.relative(root,artifacts)}/`);
 process.exit(1);
}
console.log('\nATHLETICS MANAGER REAL-BROWSER QA: PASSED\n');
console.log(`✓ ${notes.length} route/viewport checks completed`);
console.log('✓ Chromium desktop route sweep');
console.log('✓ WebKit iPad landscape route sweep');
console.log('✓ WebKit iPhone core-route sweep');
console.log('✓ no Interface Recovery screen appeared');
console.log('✓ no page-level horizontal overflow appeared');
console.log('✓ Training Overview exposed coach recommendations');
console.log('✓ Training V5 attention authority and Needs Attention tab loaded across all browser scenarios');
console.log('✓ National Pool rating elements remained inside their cells');
