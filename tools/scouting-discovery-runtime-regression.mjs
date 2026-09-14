import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';

const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.b64':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
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
const virtualConsole=new VirtualConsole();
const errors=[];
virtualConsole.on('jsdomError',err=>{const text=String(err?.message||err);if(/Uncaught \[|Could not load script/i.test(text))errors.push(text)});
virtualConsole.on('error',(...args)=>{const text=args.map(String).join(' ');if(!/Scouting V2 failed to load|Not implemented:/i.test(text))errors.push(text)});

let dom;
try{
 dom=await JSDOM.fromURL(`http://127.0.0.1:${port}/game.html`,{
  runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole,
  beforeParse(window){
   window.TextEncoder=TextEncoder;window.TextDecoder=TextDecoder;
   window.fetch=(input,init)=>globalThis.fetch(new URL(String(input),window.location.href),init);
   if(globalThis.Response)window.Response=globalThis.Response;
   if(globalThis.Request)window.Request=globalThis.Request;
   if(globalThis.Headers)window.Headers=globalThis.Headers;
   if(globalThis.Blob)window.Blob=globalThis.Blob;
   if(globalThis.DecompressionStream)window.DecompressionStream=globalThis.DecompressionStream;
   if(globalThis.CompressionStream)window.CompressionStream=globalThis.CompressionStream;
   if(globalThis.crypto)Object.defineProperty(window,'crypto',{value:globalThis.crypto,configurable:true});
   window.matchMedia=query=>({matches:false,media:String(query),onchange:null,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}});
   window.scrollTo=()=>{};
   window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
   window.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
   window.CSS=window.CSS||{};window.CSS.escape=window.CSS.escape||function(value){return String(value).replace(/[^a-zA-Z0-9_-]/g,ch=>`\\${ch}`)};
   if(window.HTMLElement&&!window.HTMLElement.prototype.scrollIntoView)window.HTMLElement.prototype.scrollIntoView=function(){};
   if(window.HTMLDialogElement){
    if(!window.HTMLDialogElement.prototype.showModal)window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
    if(!window.HTMLDialogElement.prototype.show)window.HTMLDialogElement.prototype.show=function(){this.setAttribute('open','')};
    if(!window.HTMLDialogElement.prototype.close)window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'))};
   }
  }
 });
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Page load did not complete within 15 seconds')),15000);
  dom.window.addEventListener('load',()=>{clearTimeout(timer);setTimeout(resolve,900)},{once:true});
 });
 assert.deepEqual(errors,[],`runtime load errors: ${errors.join(' | ')}`);
 const w=dom.window,read=code=>w.eval(code);
 assert.ok(w.AMScoutingV2?.discover,'Scouting V2 discovery API is unavailable');
 assert.ok(w.AMPersistencePerformance?.compact,'Persistence compaction API is unavailable');

 read(`s=fresh('GREAT BRITAIN');ensureState();s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;s.induction.completed=true;s.managerName='Discovery QA';AMScoutingV2.organisation();AMScoutingV2.seedHiddenTalent?.(12);`);
 const beforeCount=read(`AMScoutingV2.hiddenTalent().length`);
 assert.ok(beforeCount>0,'fresh scouting organisation has no hidden athlete');

 read(`(()=>{const a=AMScoutingV2.hiddenTalent()[0];a.profileResults=Array.from({length:40},(_,i)=>({season:s.game.season,week:i+1,perf:10.5-i/100,intel:{blob:'x'.repeat(400)}}));a.weeklyForm=Array.from({length:52},(_,i)=>({week:i+1,form:70+i%10}));a.attributeDevelopment={history:Array.from({length:30},(_,i)=>({week:i,xp:{speed:i}})),lastSession:{blob:'x'.repeat(1000)}};a.story={memories:Array.from({length:40},(_,i)=>({week:i,type:'Form',text:'hidden history'}))};a.trainingV2={history:Array.from({length:30},(_,i)=>({week:i}))};a.traitState={history:Array.from({length:20},(_,i)=>({week:i}))};})()`);
 const truth=read(`(()=>{const a=AMScoutingV2.hiddenTalent()[0];return {id:a.id,name:a.name,nation:a.nation,disc:a.disc,age:a.age,overall:a.overall,potential:a.potential,pb:a.pb,visibility:a.hiddenVisibility,region:a.scoutingRegion}})()`);
 const bloatedSize=read(`JSON.stringify(AMScoutingV2.hiddenTalent()[0]).length`);
 read(`AMPersistencePerformance.compact()`);
 const compacted=read(`(()=>{const a=AMScoutingV2.hiddenTalent().find(x=>x.id===${JSON.stringify(truth.id)});return {exists:!!a,size:a?JSON.stringify(a).length:0,profileResults:!!a?.profileResults,weeklyForm:!!a?.weeklyForm,attributeDevelopment:!!a?.attributeDevelopment,story:!!a?.story,trainingV2:!!a?.trainingV2,traitState:!!a?.traitState}})()`);
 assert.equal(compacted.exists,true,'compaction removed the hidden athlete');
 assert.ok(compacted.size<bloatedSize*0.45,`hidden athlete did not compact enough: ${bloatedSize} -> ${compacted.size}`);
 for(const key of ['profileResults','weeklyForm','attributeDevelopment','story','trainingV2','traitState'])assert.equal(compacted[key],false,`hidden athlete retained lazy payload: ${key}`);
 const compactTruth=read(`(()=>{const a=AMScoutingV2.hiddenTalent().find(x=>x.id===${JSON.stringify(truth.id)});return {id:a.id,name:a.name,nation:a.nation,disc:a.disc,age:a.age,overall:a.overall,potential:a.potential,pb:a.pb,visibility:a.hiddenVisibility,region:a.scoutingRegion}})()`);
 assert.deepEqual(JSON.parse(JSON.stringify(compactTruth)),JSON.parse(JSON.stringify(truth)),'compaction changed hidden athlete truth');

 const discovered=read(`(()=>{const o=AMScoutingV2.organisation(),a=AMScoutingV2.hiddenTalent().find(x=>x.id===${JSON.stringify(truth.id)}),item={id:'qa-force-discovery',label:'QA forced discovery',group:'all',goal:'balanced',ageMax:35,gender:'Any',region:'National',mode:'live',priority:'High',scoutId:o.headScoutId,discoveries:[]};const result=AMScoutingV2.discover(a,item,'QA forced discovery');const found=s.athletes.find(x=>x.id===a.id),op=AMScoutingV2.buildOpinion(found,AMScoutingV2.headScout(o),o),k=AMScoutingV2.knowledge(found,o);return {result:!!result,hiddenStillThere:AMScoutingV2.hiddenTalent().some(x=>x.id===a.id),found:{id:found?.id,name:found?.name,nation:found?.nation,disc:found?.disc,age:found?.age,overall:found?.overall,potential:found?.potential,pb:found?.pb,source:found?.source,tier:found?.tier,inSquad:found?.inSquad,scoutingHidden:found?.scoutingHidden},reportId:result?.report?.id||null,knowledge:{evidence:k?.evidence,stage:k?.stage},opinion:{current:op?.current?.mid,potential:op?.potential?.numericCenter,verdict:op?.verdict}}})()`);
 assert.equal(discovered.result,true,'forced discovery did not return a result');
 assert.equal(discovered.hiddenStillThere,false,'discovered athlete remained in hidden pool');
 for(const key of ['id','name','nation','disc','age','overall','potential','pb'])assert.equal(discovered.found[key],truth[key],`discovery changed athlete truth: ${key}`);
 assert.equal(discovered.found.source,'Scouted','discovered athlete source is not Scouted');
 assert.equal(discovered.found.tier,'National Pool','discovered athlete did not enter National Pool tier');
 assert.equal(discovered.found.inSquad,false,'discovered athlete incorrectly entered the squad');
 assert.equal(discovered.found.scoutingHidden,false,'discovered athlete remained scoutingHidden');
 assert.ok(discovered.reportId,'discovery did not create a scout report');
 assert.ok(Number.isFinite(Number(discovered.opinion.current)),'discovered athlete has no valid current-ability scout opinion');
 assert.ok(Number.isFinite(Number(discovered.opinion.potential)),'discovered athlete has no valid potential scout opinion');
 assert.ok(discovered.opinion.verdict,'discovered athlete has no scout verdict');

 read(`save()`);
 const savedLength=read(`localStorage.getItem('rto_full_game_v1')?.length||0`);
 assert.ok(savedLength>0,'forced-discovery career did not save');
 read(`load()`);
 const reloaded=read(`(()=>{const a=s.athletes.find(x=>x.id===${JSON.stringify(truth.id)});return {id:a?.id,name:a?.name,overall:a?.overall,potential:a?.potential,pb:a?.pb,source:a?.source,tier:a?.tier,hidden:(s.scoutingV2?.nations?.[managedNation()]?.hiddenTalent||[]).some(x=>x.id===${JSON.stringify(truth.id)})}})()`);
 assert.equal(reloaded.id,truth.id,'discovered athlete disappeared after save/load');
 assert.equal(reloaded.name,truth.name,'discovered athlete identity changed after save/load');
 assert.equal(reloaded.overall,truth.overall,'discovered athlete ability changed after save/load');
 assert.equal(reloaded.potential,truth.potential,'discovered athlete potential changed after save/load');
 assert.equal(reloaded.pb,truth.pb,'discovered athlete PB changed after save/load');
 assert.equal(reloaded.source,'Scouted','discovered athlete source changed after save/load');
 assert.equal(reloaded.tier,'National Pool','discovered athlete tier changed after save/load');
 assert.equal(reloaded.hidden,false,'discovered athlete returned to hidden pool after save/load');

 console.log('SCOUTING DISCOVERY RUNTIME REGRESSION: PASSED');
 console.log(`✓ Compacted real hidden athlete ${bloatedSize} → ${compacted.size} characters with truth unchanged`);
 console.log('✓ Same athlete ID/name/ability/potential/PB entered the National Pool through the real discovery pipeline');
 console.log('✓ Scout report/opinion remained valid and the discovered athlete survived save/load');
}finally{
 // load() can queue a history/navigation microtask in JSDOM. Let it settle before
 // disposing the document so teardown itself cannot create a false-negative test.
 await new Promise(resolve=>setTimeout(resolve,250));
 try{dom?.window?.stop?.()}catch(_){}
 try{dom?.window?.close()}catch(_){}
 await new Promise(resolve=>server.close(resolve));
}
