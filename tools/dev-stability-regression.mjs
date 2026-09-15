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
  f.w.eval("var SAVE_KEY='test-save',renderMenu=()=>{},preserveDamagedCareerSave=()=>{};");f.w.eval(source.slice(start,end));
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
  f.w.__athleticsExplicitSelectionV3.openEvent(e);assert.ok([...f.w.document.querySelectorAll('[data-clear-slot],[data-athlete]')].every(b=>b.disabled),'submitted choices still look editable');
  assert.equal(f.w.__athleticsInboxDecisionCore.getUnresolvedActions().length,0);
 }finally{f.dom.window.close()}
});
await test('Onboarding keeps stable buttons and observes training before redraw',()=>{
 const f=fixture();try{
  f.w.document.body.insertAdjacentHTML('beforeend','<div id="home"></div>');
  const source=fs.readFileSync('scripts/first-time-experience-v2.js','utf8');
  f.w.eval(`var $=id=>document.getElementById(id),active=()=>true,markSeen=()=>{},ensureState=()=>({steps:{trainingDecision:false}}),agendaHTML=()=>'<section class="ftx-agenda"><button>Review</button></section>';s.appointment={contractSigned:true};`);
  f.w.eval(source.slice(source.indexOf('function decisionState(e,d){'),source.indexOf('function coachPick(e,d){')));
  assert.equal(f.w.firstSelectionComplete({disc:['M100'],entries:{M100:[]},selectionDecisionV3:{slots:{M100:[{mode:'no_entry',id:null}]}}}),true,'guidance rejects current No Entry decision');
  f.w.eval(source.slice(source.indexOf('function decorateHome(){'),source.indexOf('function athleteManagementRoot()')));
  f.w.decorateHome();const button=f.w.document.querySelector('#home button');f.w.decorateHome();
  assert.equal(f.w.document.querySelector('#home button'),button,'observer decoration replaces focused/clickable button');
  f.w.eval(`var detected=0,currentPhase=()=> 'training',queueTrainingDecisionDetection=()=>{detected++};`);
  const listener=source.split('\n').find(line=>line.includes("document.addEventListener('change',event=>"));f.w.eval(listener);
  const root=f.w.document.getElementById('training');root.innerHTML='<select><option>A</option><option>B</option></select>';
  const select=root.firstChild;select.onchange=()=>{root.innerHTML='Redrawn'};
  select.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(f.w.detected,1,'redraw detaches target before guidance observes it');
 }finally{f.dom.window.close()}
});
await test('Playback watchdog follows current frames, respects pause and uses canonical completion',()=>{
 const f=fixture();try{
  const source=fs.readFileSync('scripts/progression-selection-core.js','utf8');
  f.w.eval(`var $=id=>document.getElementById(id),disciplineRunning=true,liveEventView={};`);
  f.w.eval(source.slice(source.indexOf('function playbackSig(){'),source.indexOf('setInterval(()=>{const sig=playbackSig()')));
  Object.defineProperty(f.w.document,'hidden',{value:false,configurable:true});
  const c={e:{id:'meet'},d:'W100',last:100,elapsed:0};f.w.AMLiveBroadcastV4={active:c};
  const before=f.w.playbackSig();c.last=116;assert.notEqual(f.w.playbackSig(),before);
  c.paused=true;assert.equal(f.w.playbackSig(),'');c.paused=false;
  Object.defineProperty(f.w.document,'hidden',{value:true,configurable:true});assert.equal(f.w.playbackSig(),'');
  Object.defineProperty(f.w.document,'hidden',{value:false,configurable:true});
  f.w.document.body.insertAdjacentHTML('beforeend','<button id="v4skip">Instant Result</button>');let completed=0;f.w.document.getElementById('v4skip').onclick=()=>completed++;
  f.w.emergencyFinish();assert.equal(completed,1);
  c.paused=true;f.w.emergencyFinish();assert.equal(completed,1);
 }finally{f.dom.window.close()}
});
await test('Live playback preserves interactive controls across animation frames',()=>{
 const f=fixture();try{
  f.w.document.body.insertAdjacentHTML('beforeend','<div id="liveEventVisual"></div>');
  f.w.eval(`var $=id=>document.getElementById(id),live={paused:false,speed:1},updateBoard=()=>{},refreshQa=()=>{},paintDue=()=>true,clockNow=()=>0,presentationHz=()=>30;var liveVisual=c=>'<div class="v3stage"><div class="v3top">LIVE</div><div class="v3canvas">frame</div><div class="v3controls"><button data-pause>'+ (c.paused?'RESUME':'PAUSE') +'</button><button data-speed="4">4x</button><span>0s</span></div></div>';`);
  const source=fs.readFileSync('scripts/live-event-broadcast-v4.js','utf8');f.w.eval(source.slice(source.indexOf('function wire(c){'),source.indexOf('function draw(e,can,ds){')));
  f.w.render(f.w.live);const pause=f.w.document.querySelector('[data-pause]');f.w.render(f.w.live);f.w.render(f.w.live);
  assert.equal(f.w.document.querySelector('[data-pause]'),pause);pause.click();assert.equal(f.w.live.paused,true);assert.equal(pause.textContent,'RESUME');
  f.w.document.querySelector('[data-speed]').click();assert.equal(f.w.live.speed,4);
 }finally{f.dom.window.close()}
});
await test('Competition live controls follow the unified programme, results and Return Home contract',()=>{
 const f=fixture();try{
  f.w.document.body.insertAdjacentHTML('beforeend','<div id="competition"><div class="v3event lv4event"><header class="v3head"><button id="v3back"></button></header><button id="v3day"></button><button id="v3start"></button></div></div>');
  f.w.eval(`var $=id=>document.getElementById(id),disciplineRunning=false,opened=[],safe=fn=>fn(),register=()=>{},competitionType=()=> 'Meeting',eventCompleted=e=>!!e.completed,openEvent=(id,tab)=>opened.push([id,tab]),showCompletedMeeting=e=>{opened.push([e.id,'results']);return true},returnHomeFromEvent=e=>{opened.push([e.id,'home']);return true};`);
  const source=fs.readFileSync('scripts/competition-journey-v2.js','utf8');f.w.eval(source.slice(source.indexOf('function decorateLive(e,d){'),source.indexOf('function drawV2(){')));
  const e={id:'meet',week:5,results:{W100:[]},completed:false};
  f.w.decorateLive(e,'W100');
  assert.equal(f.w.document.getElementById('v3day').textContent,'COMPETITION OVERVIEW');
  f.w.document.getElementById('v3day').click();
  assert.equal(JSON.stringify(f.w.opened),'[["meet","programme"]]');
  assert.equal(f.w.document.getElementById('v3back').textContent,'‹');
  e.completed=true;f.w.decorateLive(e,'W100');
  assert.equal(f.w.document.getElementById('v3back').textContent,'‹ RESULTS');
  assert.equal(f.w.document.getElementById('v3day').textContent,'RETURN HOME');
  f.w.document.getElementById('v3back').click();
  assert.equal(JSON.stringify(f.w.opened[1]),'["meet","results"]');
  f.w.document.getElementById('v3day').click();
  assert.equal(JSON.stringify(f.w.opened[2]),'["meet","home"]');
 }finally{f.dom.window.close()}
});
await test('Saved-career UI and qualification initialise after discipline registration',()=>{
 const f=fixture();try{
  const source=fs.readFileSync('scripts/game.js','utf8');
  f.w.eval(`var expanded=false,calls=0,renderView=()=>{if(!expanded)throw Error('early UI');calls++},qualificationRoadState=()=>{},ensureQualificationLocks=()=>{if(!expanded)throw Error('early qualification')},updateQualificationTracking=()=>calls++,renderMenu=()=>{};`);
  const render=source.split('\n').find(line=>line.includes("document.addEventListener('DOMContentLoaded',()=>renderView(currentView)"));assert.ok(render);f.w.eval(render);
  const start=source.indexOf('function initialiseQualificationRoad(){');f.w.eval(source.slice(start,source.indexOf('/* ===== End Road to Qualification Update',start)));
  assert.equal(f.w.calls,0);f.w.expanded=true;f.w.document.dispatchEvent(new f.w.Event('DOMContentLoaded'));assert.equal(f.w.calls,2);
 }finally{f.dom.window.close()}
});
await test('Official results replace waiting or provisional commentary',()=>{
 const f=fixture();try{
  f.w.eval(`var performanceMoment=()=>null,championTitle=()=> 'Event winner',label=()=> '100m',normaliseSpeech=String,E=String,officialRows=(e,d,r)=>r;`);
  const source=fs.readFileSync('scripts/live-event-broadcast-v4.js','utf8');
  f.w.eval(source.split('\n').find(line=>line.startsWith('function officialMomentSpeech(')));f.w.eval(source.split('\n').find(line=>line.startsWith('function commentaryHTML(')));
  const e={results:{W100:[{name:'Test Winner',perf:11.27}]},commentary:{W100:['Order provisional']}};
  f.w.document.body.innerHTML=f.w.commentaryHTML(null,e,'W100');const text=f.w.document.querySelector('.lv4-current-comment').textContent;
  assert.match(text,/Test Winner is confirmed/);assert.doesNotMatch(text,/Waiting|provisional/);
 }finally{f.dom.window.close()}
});
await test('Domestic rivals are not counted as programme entrants or medals',()=>{
 const f=fixture();try{
  f.w.eval(`var safe=fn=>fn(),managedNation=()=> 'GREAT BRITAIN',eventDiscs=e=>e.disc;`);
  const source=fs.readFileSync('scripts/competition-journey-v2.js','utf8');f.w.eval(source.slice(source.indexOf('function resultRows(e,d){'),source.indexOf('function athleteNames(e,d){')));
  const e={disc:['W100','W200'],entries:{W100:['own'],W200:[]},results:{W100:[{id:'rival',nation:'GREAT BRITAIN'},{id:'own',nation:'GREAT BRITAIN'}],W200:[{id:'rival2',nation:'GREAT BRITAIN'}]}};
  assert.equal(f.w.playerHighlight(e,'W100').id,'own');assert.equal(f.w.playerHighlight(e,'W100').place,2);assert.equal(f.w.playerHighlight(e,'W200'),null);
  assert.equal(f.w.resultMedals(e).wins,0);assert.equal(f.w.resultMedals(e).podiums,1);
 }finally{f.dom.window.close()}
});
await test('Calendar uses recorded entrants, current Summit weeks and historical result routes',()=>{
 const f=fixture();try{
  f.w.eval(`var safe=fn=>fn(),managedNation=()=> 'GB',summitMeetings=()=>[14,20,26,32,38,44].map(week=>({week}));`);
  const source=fs.readFileSync('scripts/calendar-v2.js','utf8');
  for(const name of ['leagueRound','resultSummary'])f.w.eval(source.split('\n').find(line=>line.startsWith('function '+name+'(')));
  assert.equal(f.w.leagueRound(17),false);assert.equal(f.w.leagueRound(14),true);assert.equal(f.w.leagueRound(44),true);
  assert.equal(f.w.resultSummary({disc:['W100'],entries:{W100:['own']},results:{W100:[{id:'rival',nation:'GB',place:1},{id:'own',nation:'GB',place:2}]}}).podiums,1);
  f.w.document.body.innerHTML='<div id="calendar"><button data-calv2-results="past">VIEW RESULTS</button></div>';
  f.w.eval(`var opened=[],__athleticsCompetitionJourneyV2={openEvent:(...args)=>opened.push(args)},$=()=>null,plannerPreview=()=>{};`);
  f.w.eval(source.split('\n').find(line=>line.startsWith('function bind(')));f.w.bind(f.w.document.getElementById('calendar'),[]);f.w.document.querySelector('button').click();assert.equal(JSON.stringify(f.w.opened),'[["past","results"]]');
 }finally{f.dom.window.close()}
});
await test('Historical results remain accessible during Event Day without trapping future navigation',()=>{
 const f=fixture();try{
  f.w.eval(`var s={uiCompetitionV2:{eventId:'past'}},competitionMode='overview',currentEvent=()=>({id:'current'}),drawCompetition=()=>s.uiCompetitionV2.eventId,view=()=>{};`);
  f.w.eval(fs.readFileSync('scripts/competition-journey-route-guard-v1.js','utf8'));
  f.w.__athleticsCompetitionJourneyRouteGuard.setHistoricalEvent('past');assert.equal(f.w.drawCompetition(),'past');
  f.w.view('home');assert.equal(f.w.drawCompetition(),'current');
 }finally{f.dom.window.close()}
});
await test('Blocked reads and failed corrupt-save backups cannot destroy original saves',()=>{
 const f=fixture();try{
  f.w.eval(`var SAVE_KEY='career',CORRUPT_SAVE_KEY='backup',saveLoadWarning='',damagedCareerSave=null,damagedCareerBackupKey=null,fresh=()=>({fresh:true}),ensureState=()=>{throw Error('invalid career')};`);
  const source=fs.readFileSync('scripts/game.js','utf8');f.w.eval(source.slice(source.indexOf('function readCareerSave(){'),source.indexOf('function ensureState(){')));
  f.w.localStorage.setItem('career','broken original');f.w.localStorage.setItem('backup','previous backup');
  const write=f.w.Storage.prototype.setItem;f.w.Storage.prototype.setItem=function(){throw Error('quota')};
  f.w.load();assert.equal(f.w.localStorage.getItem('career'),'broken original');assert.equal(f.w.localStorage.getItem('backup'),'previous backup');assert.ok(f.w.s.fresh);
  f.w.Storage.prototype.setItem=write;f.w.preserveDamagedCareerSave();assert.equal(f.w.localStorage.getItem(f.w.damagedCareerBackupKey),'broken original');assert.equal(f.w.localStorage.getItem('backup'),'previous backup');
  f.w.Storage.prototype.getItem=function(){throw Error('blocked')};f.w.load();assert.ok(f.w.s.fresh);assert.match(f.w.saveLoadWarning,/unavailable/);
 }finally{f.dom.window.close()}
});
process.exitCode=failures?1:0;
