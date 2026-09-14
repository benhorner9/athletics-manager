import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

let passed=0;
let failed=0;
const failures=[];

async function test(name,fn){
 try{
  await fn();
  passed++;
  console.log(`✓ ${name}`);
 }catch(err){
  failed++;
  failures.push({name,error:err});
  console.error(`✗ ${name}`);
  console.error(err?.stack||err);
 }
}

function fixture(html='<div></div>'){
 const dom=new JSDOM(html,{url:'http://localhost/game.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.TextEncoder=TextEncoder;
 w.TextDecoder=TextDecoder;
 w.queueMicrotask=fn=>{fn()};
 w.requestAnimationFrame=fn=>{fn(Date.now());return 1};
 w.cancelAnimationFrame=()=>{};
 w.scrollTo=()=>{};
 w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
 w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 w.CSS=w.CSS||{};
 w.CSS.escape=w.CSS.escape||function(value){return String(value).replace(/[^a-zA-Z0-9_-]/g,ch=>`\\${ch}`)};
 if(w.HTMLDialogElement){
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  w.HTMLDialogElement.prototype.show=function(){this.setAttribute('open','')};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};
 }
 const load=path=>w.eval(fs.readFileSync(path,'utf8'));
 return{dom,w,load};
}

await test('Contract expiry becomes a mandatory decision exactly two weeks out',async()=>{
 const f=fixture('<div id="finance"></div>');
 try{
  f.w.eval(`
   var currentView='finance';
   var s={game:{week:10,careerWeek:10,season:2029},managedNation:'GREAT BRITAIN',athletes:[{id:'a1',name:'Alex Test',nation:'GREAT BRITAIN',inSquad:true,retired:false}],emails:[]};
   var careerNow=()=>s.game.careerWeek;
   var managedNation=()=>s.managedNation;
   var sender=()=> 'Performance Director';
   var save=()=>true,render=()=>{},rememberAthlete=()=>{},toast=()=>{};
   var mailSeq=0;
   var newMail=(from,subject,body,type)=>{s.emails.push({id:'mail-'+(++mailSeq),sender:from,subject,body,type,unread:true})};
  `);
  const programme={athleteContracts:{a1:{id:'contract-a1',athleteId:'a1',state:'active',status:'Elite',endCareerWeek:13}}};
  f.w.AMProgrammeEconomy={state:()=>programme,decisionActions:()=>[],renderFinance:()=>{}};
  f.w.AMUX={confirm:async()=>true};
  f.load('scripts/athlete-contract-expiry-gate-v1.js');
  assert.equal(f.w.AMAthleteContractExpiryGate.pending().length,0,'three weeks remaining should not block progression');
  programme.athleteContracts.a1.endCareerWeek=12;
  const actions=f.w.AMProgrammeEconomy.decisionActions();
  assert.equal(actions.length,1);
  assert.equal(actions[0].blocks,true);
  assert.equal(actions[0].priority,'critical');
  assert.match(f.w.s.emails[0].subject,/URGENT/i);
  assert.match(f.w.s.emails[0].body,/cannot advance|career cannot advance/i);
  assert.equal(await f.w.AMAthleteContractExpiryGate.allowExpiry('a1'),true);
  assert.equal(f.w.AMAthleteContractExpiryGate.pending().length,0,'explicit allow-expiry must clear the blocker');
  assert.equal(f.w.AMProgrammeEconomy.decisionActions().length,0,'resolved contract must disappear from Action Required');
  assert.equal(programme.athleteContracts.a1.state,'active','allowing expiry early must not remove the athlete immediately');
 }finally{f.dom.window.close()}
});

await test('Coach recommendation chooses recovery, reduced load, championship prep and block rotation from evidence',()=>{
 const f=fixture('<div id="training"></div>');
 try{
  f.w.eval(`
   var currentView='training';
   var s={game:{week:10,careerWeek:10,season:2029},managedNation:'GREAT BRITAIN',athletes:[],events:[],coaches:{sprint:{name:'Coach Test'}}};
   var managedTeam=()=>s.athletes.filter(a=>!a.retired&&a.inSquad!==false);
   var careerNow=()=>s.game.careerWeek;
   var save=()=>true,toast=()=>{},appointmentTask=()=>{},rememberAthlete=()=>{};
  `);
  const programmes=[
   {id:'speed',label:'Maximum Velocity',weights:{speed:.7,technique:.3}},
   {id:'technical',label:'Sprint Technique',weights:{technique:.8,speed:.2}},
   {id:'prep',label:'Competition Preparation',weights:{technique:1}},
   {id:'recovery',label:'Recovery',weights:{}}
  ];
  f.w.AMAthleteAttributes={
   familyFor:()=> 'sprint',
   get:a=>({attributes:[{key:'speed',score:Number(a.speed||12)},{key:'technique',score:Number(a.technique||12)}]})
  };
  f.w.AMTrainingSystem2={
   ensureDevelopment(a){
    a.attributeDevelopment??={focus:'speed',intensity:'standard',blockWeeks:0,ceilings:{speed:18,technique:18},xp:{speed:0,technique:0}};
    a.trainingV2??={load:{status:'Normal'}};
    return a.attributeDevelopment;
   },
   programmesFor:()=>programmes,
   setFocus(a,id){this.ensureDevelopment(a).focus=id;return true},
   setIntensity(a,id){this.ensureDevelopment(a).intensity=id;return true},
   syncAttention(){},render(){}
  };
  f.load('scripts/training-coach-recommendation-v1.js');
  const a={id:'a1',name:'Alex Test',nation:'GREAT BRITAIN',disc:'M100',inSquad:true,retired:false,injury:0,fatigue:86,speed:12,technique:12,trainingV2:{load:{status:'Normal'}},attributeDevelopment:{focus:'speed',intensity:'high',blockWeeks:3,ceilings:{speed:18,technique:18},xp:{speed:0,technique:0}}};
  f.w.s.athletes=[a];
  let rec=f.w.AMTrainingCoachRecommendation.recommendationFor(a);
  assert.equal(rec.kind,'recovery');
  assert.equal(rec.focus,'recovery');
  assert.equal(rec.intensity,'recovery');
  assert.equal(f.w.AMTrainingCoachRecommendation.applyAll(),1);
  assert.equal(a.attributeDevelopment.focus,'recovery');
  assert.equal(a.trainingCoachHistory.length,1,'coach action should be recorded in athlete history');

  a.fatigue=75;a.trainingV2.load.status='Normal';a.attributeDevelopment={focus:'speed',intensity:'standard',blockWeeks:3,ceilings:{speed:18,technique:18},xp:{speed:0,technique:0}};
  rec=f.w.AMTrainingCoachRecommendation.recommendationFor(a);
  assert.equal(rec.kind,'reduce');
  assert.equal(rec.intensity,'low');

  a.fatigue=32;a.attributeDevelopment={focus:'speed',intensity:'standard',blockWeeks:3,ceilings:{speed:18,technique:18},xp:{speed:0,technique:0}};
  f.w.s.events=[{id:'major',name:'World Championships',kind:'championship',week:13,completed:false,disc:['M100']}];
  rec=f.w.AMTrainingCoachRecommendation.recommendationFor(a);
  assert.equal(rec.kind,'prep');
  assert.equal(rec.focus,'prep');

  f.w.s.events=[];a.fatigue=40;a.attributeDevelopment={focus:'speed',intensity:'standard',blockWeeks:10,ceilings:{speed:12,technique:19},xp:{speed:.9,technique:0}};
  rec=f.w.AMTrainingCoachRecommendation.recommendationFor(a);
  assert.equal(rec.kind,'block');
  assert.equal(rec.focus,'technical','adapted block should rotate toward the strongest remaining development opportunity');
 }finally{f.dom.window.close()}
});

await test('Explicit Summit entry owns Competition even when a normal meeting exists in the same week',()=>{
 const f=fixture('<div id="competition" class="view on"><div class="cj"></div></div>');
 try{
  f.w.eval(`
   var currentView='competition';
   var s={game:{week:9},uiCompetitionV2:{}};
   var summitLiveMeetingNumber=1;
   var DISCIPLINES={M100:{},W100:{}};
   var competitionMode='overview';
   var normal={id:'normal-9',kind:'competition',week:9};
   var summit={number:1,week:9,name:'Summit Series 1'};
   var currentEvent=()=>normal;
   var summitSeasonState=()=>({meetings:{1:summit}});
   var summitCurrentLiveMeeting=()=>summit;
   var currentBlocking=()=>normal;
   var routeCalls=[];
   var drawCompetition=function(){routeCalls.push({blocking:currentBlocking()?.kind||null,summit:summitCurrentLiveMeeting()?.number||null})};
   var view=function(name){currentView=name};
  `);
  f.load('scripts/competition-journey-route-guard-v1.js');
  f.w.drawCompetition();
  assert.equal(f.w.routeCalls[0].blocking,'summit','explicitly opened Summit meeting lost authority to the normal event');
  assert.equal(f.w.__athleticsCompetitionJourneyRouteGuard.debugRoute().explicitSummit,1);

  f.w.summitLiveMeetingNumber=null;
  f.w.routeCalls.length=0;
  f.w.drawCompetition();
  assert.equal(f.w.routeCalls[0].blocking,'competition');
  assert.equal(f.w.routeCalls[0].summit,null,'normal event should suppress same-week Summit when Summit was not explicitly opened');
 }finally{f.dom.window.close()}
});

await test('Completed event exits through the universal Return Home authority',async()=>{
 const f=fixture('<div id="home" class="view"></div><div id="competition" class="view on"><button id="completeEventReturn">RETURN HOME</button></div><div id="pageKicker"></div><div id="pageTitle"></div>');
 try{
  f.w.eval(`
   var currentView='competition',disciplineRunning=true,activeEventDisc='M100',competitionMode='discipline';
   var s={game:{week:8},events:[{id:'meet',kind:'competition',week:8,disc:['M100'],completed:true,decision:true,results:{M100:[{id:'a',perf:10.2}]}}]};
   var liveEventView={event:s.events[0]};
   var save=()=>true,toast=()=>{},renderView=()=>{},drawHome=()=>{},resetScreenPosition=()=>{};
   var managedNation=()=> 'GREAT BRITAIN',nationName=()=> 'Great Britain';
   var view=function(name){currentView=name;document.querySelectorAll('.view').forEach(x=>x.classList.toggle('on',x.id===name))};
  `);
  f.load('scripts/event-exit-authority-v1.js');
  f.w.document.getElementById('completeEventReturn').click();
  await Promise.resolve();
  assert.equal(f.w.currentView,'home');
  assert.equal(f.w.document.querySelectorAll('.view.on').length,1);
  assert.ok(f.w.document.getElementById('home').classList.contains('on'));
  assert.equal(f.w.disciplineRunning,false);
  assert.equal(f.w.activeEventDisc,null);
  assert.equal(f.w.competitionMode,'overview');
 }finally{f.dom.window.close()}
});

await test('Athlete nickname is a manager label and never overwrites the official name',()=>{
 const f=fixture('<div id="squad"></div><div id="pool"></div><dialog id="athleteProfile"></dialog>');
 try{
  f.w.eval(`
   var s={managedNation:'GREAT BRITAIN',athletes:[{id:'a1',name:'Alexandra Brown',nation:'GREAT BRITAIN',inSquad:true}]};
   var managedNation=()=>s.managedNation;
   var save=()=>true,toast=()=>{};
  `);
  f.load('scripts/athlete-nickname-v1.js');
  const a=f.w.s.athletes[0];
  assert.equal(f.w.AMAthleteNickname.set('a1','Flash'),true);
  assert.equal(a.name,'Alexandra Brown','nickname changed the official athlete name');
  assert.equal(a.nickname,'Flash');
  assert.equal(f.w.AMAthleteNickname.displayName(a),'Flash');
  assert.equal(f.w.AMAthleteNickname.officialName(a),'Alexandra Brown');
  assert.equal(f.w.AMAthleteNickname.set('a1',''),true);
  assert.equal(a.name,'Alexandra Brown');
  assert.equal('nickname' in a,false);
 }finally{f.dom.window.close()}
});

console.log(`\nAutomated gameplay regressions: ${passed} passed, ${failed} failed.`);
if(failed){
 console.error('\nBlocking failures:');
 for(const item of failures)console.error(`- ${item.name}: ${item.error?.message||item.error}`);
 process.exit(1);
}
process.exit(0);
