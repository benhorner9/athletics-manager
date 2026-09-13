import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

let failures=0;
async function test(name,fn){try{await fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
function fixture(){
 const dom=new JSDOM('<div id="railNav"><button data-view="inbox"><span id="mailBadge"></span></button><button data-view="training"></button></div><div id="bottomNav"></div><div id="training"></div><div id="inbox"></div>',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.eval(`var s={game:{week:5,careerWeek:5,season:2027,cycleYear:1},managedNation:'GREAT BRITAIN',athletes:[],events:[],emails:[]},currentView='home',openMail=null;var drawInbox=()=>{},drawReader=()=>{},drawTraining=()=>{},syncMailBadge=()=>{},save=()=>{},view=()=>{},toast=()=>{};var mailCategory=m=>m.type;var managedTeam=()=>s.athletes.filter(a=>!a.retired&&a.inSquad!==false);`);
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.matchMedia=()=>({matches:false});w.CSS={escape:String};w.setTimeout=()=>0;
 const frames=[];w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length};
 const load=name=>w.eval(fs.readFileSync(`scripts/${name}.js`,'utf8'));
 return{dom,w,load,frames};
}
await test('Inbox counter observer settles without changing state',async()=>{
 const f=fixture();try{
  f.w.__athleticsInboxDecisionCore={getUnresolvedActions:()=>[],getProgressionBlockers:()=>[]};
  f.w.document.getElementById('inbox').innerHTML='<span data-v3-count="actions"><b>0</b></span><span data-v3-count="unread"><b>0</b></span><span data-v3-count="important"><b>0</b></span>';
  f.load('inbox-production-authority-v1');
  for(let i=0;i<8;i++){await Promise.resolve();const batch=f.frames.splice(0);batch.forEach(fn=>fn());}
  await Promise.resolve();assert.equal(f.frames.length,0,'unchanged counters keep scheduling animation frames');
 }finally{f.dom.window.close()}
});
await test('Action Required reveals outstanding decisions despite old filters and missing mail',()=>{
 const f=fixture();try{
  const acts=[{actionId:'one',emailId:'missing',title:'Missing mail decision',source:'competition',destination:'competition'},{actionId:'two',emailId:'live',title:'Current selection'}];
  f.w.__athleticsInboxDecisionCore={getUnresolvedActions:()=>acts,getProgressionBlockers:()=>[]};
  f.w.s.emails=[{id:'live',type:'selection',subject:'Select team',sender:'Coach'}];
  f.w.s.inboxDecisionSystem={ui:{filter:'inbox',search:'unrelated text',category:'medical'}};
  f.load('inbox-v3');f.w.__athleticsInboxV3.render();
  f.w.document.querySelector('[data-v3-filter="actions"]').click();
  assert.equal(f.w.document.querySelectorAll('[data-v3-mail],[data-v3-action]').length,2,'active decisions are hidden');
 }finally{f.dom.window.close()}
});
await test('Training attention has one authority and recovery resolves it',()=>{
 const f=fixture();try{
  const a={id:'a',name:'Test Athlete',nation:'GREAT BRITAIN',disc:'M100',inSquad:true,fatigue:85,injury:0};f.w.s.athletes=[a];
  f.load('training-system-v4');f.load('training-attention-decisions-v2');
  const api=f.w.AMTrainingSystem2;api.setIntensity(a,'high');
  assert.equal(typeof api.attentionRows,'function','current training queue is not exposed');
  assert.equal(api.attentionRows().length,1);
  assert.equal(f.w.__athleticsTrainingAttentionDecisions.queue().length,1);
  api.setIntensity(a,'recovery');
  assert.equal(api.attentionRows().length,0);
  assert.equal(f.w.__athleticsTrainingAttentionDecisions.queue().length,0);
  a.injury=3;assert.equal(api.attentionRows().length,0,'medical recovery is not an unresolved training decision');
  a.injury=0;a.fatigue=0;api.setFocus(a,'balanced');a.attributeDevelopment.blockWeeks=10;
  assert.equal(api.attentionRows().length,1);
  assert.equal(f.w.__athleticsTrainingAttentionDecisions.queue().length,1,'Home misses adapted block');
 }finally{f.dom.window.close()}
});
await test('Storage failure retains the last save and offers recovery and retry',()=>{
 const f=fixture();try{
  const source=fs.readFileSync('scripts/game.js','utf8'),start=source.indexOf('function save(){'),end=source.indexOf('function toast(',start);
  f.w.eval("var SAVE_KEY='test-save',renderMenu=()=>{};");f.w.eval(source.slice(start,end));
  f.w.document.body.insertAdjacentHTML('beforeend','<span id="careerSaveStatus">AUTOSAVED</span>');
  f.w.localStorage.setItem('test-save','previous valid save');
  const original=f.w.Storage.prototype.setItem;f.w.Storage.prototype.setItem=function(){throw new f.w.DOMException('Quota reached','QuotaExceededError')};
  f.w.console.error=()=>{};
  assert.equal(f.w.save(),false);assert.equal(f.w.localStorage.getItem('test-save'),'previous valid save');
  assert.equal(f.w.document.getElementById('careerSaveStatus').textContent,'NOT SAVED');
  assert.ok(f.w.document.querySelector('[data-save-download]'));assert.ok(f.w.document.querySelector('[data-save-retry]'));
  f.w.save();assert.equal(f.w.document.querySelectorAll('#careerSaveFailure').length,1);
  f.w.Storage.prototype.setItem=original;assert.equal(f.w.save(),true);assert.ok(!f.w.document.getElementById('careerSaveFailure'));
  assert.equal(JSON.parse(f.w.localStorage.getItem('test-save')).game.week,5);
 }finally{f.dom.window.close()}
});
await test('Compressed and legacy saves round-trip without losing Unicode or career data',()=>{
 const f=fixture();try{
  f.load('vendor/fflate-0.8.2');f.load('save-codec');
  const json=JSON.stringify({athletes:Array.from({length:16000},(_,i)=>({id:i,name:'Zoë 🏃 Côte d’Ivoire',history:['selection','training','results'],perf:12.34,attempts:[null,18.6,19.2],notes:'Career history '.repeat(25)}))});
  assert.ok(json.length>5000000);
  const packed=f.w.AMCareerSaveCodec.encode(json);assert.ok(packed.length<1000000);
  f.w.localStorage.setItem('large-career',packed);
  assert.equal(f.w.AMCareerSaveCodec.decode(f.w.localStorage.getItem('large-career')),json);
  assert.equal(f.w.AMCareerSaveCodec.decode(json),json);
  assert.equal(f.w.AMCareerSaveCodec.encode(json),packed);
  assert.throws(()=>f.w.AMCareerSaveCodec.decode('AMGZ1:damaged'));
 }finally{f.dom.window.close()}
});
await test('Withdrawals reopen selection and single No Entry resolves a slot',()=>{
 const f=fixture();try{
  f.w.eval("var DISCIPLINES={M100:{}},discLabel=d=>d,selectionEntryLimit=()=>1,eligibleFor=()=>[],managedNation=()=> 'GREAT BRITAIN';");
  f.w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  f.w.HTMLDialogElement.prototype.close=function(){this.open=false};
  const e={id:'test',name:'Test Meet',kind:'competition',week:5,disc:['M100'],decision:false,entries:{M100:[]},selectionCentreV2:{locked:true,draft:{M100:['withdrawn']},submitted:{M100:['withdrawn']}},selectionDecisionV3:{locked:true,status:'submitted',slots:{M100:[{mode:'athlete',id:'withdrawn'}]}}};
  f.w.s.events=[e];f.w.s.emails=[{id:'mail',type:'selection',eventId:'test',selectionSubmitted:true}];
  f.load('inbox-decision-core-v1');
  assert.ok(f.w.__athleticsInboxDecisionCore.getUnresolvedActions().some(a=>a.entityId==='test'),'stale submitted mail conceals reopened selection');
  f.load('selection-decision-v3');f.w.__athleticsExplicitSelectionV3.openEvent(e);
  assert.equal(e.selectionCentreV2.locked,false);assert.equal(e.selectionDecisionV3.locked,false);
  assert.ok(f.w.document.querySelector('[data-review]').disabled);
  f.w.document.querySelector('[data-noentry]').click();
  assert.equal(f.w.document.querySelector('[data-review]').disabled,false);
  assert.equal(e.selectionDecisionV3.slots.M100[0].mode,'no_entry');
  f.w.document.querySelector('[data-review]').click();f.w.document.querySelector('[data-submit]').click();
  assert.equal(e.decision,true);assert.equal(e.selectionCentreV2.locked,true);
  assert.equal(f.w.__athleticsInboxDecisionCore.getUnresolvedActions().length,0);
 }finally{f.dom.window.close()}
});
process.exitCode=failures?1:0;
