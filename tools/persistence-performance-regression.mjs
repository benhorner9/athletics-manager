import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('scripts/persistence-performance-v1.js','utf8');
const oldArchive=Array.from({length:100},(_,i)=>({id:`old-${i}`,body:'archived body '.repeat(10)}));
const emailMeta=Object.fromEntries(oldArchive.map(m=>[m.id,{emailId:m.id,read:'read'}]));
emailMeta.live={emailId:'live',read:'unread'};
const intel=i=>({verdict:`Review ${i}`,note:'Detailed performance review '.repeat(8),factors:[{name:'Readiness',text:'Long explanation '.repeat(5)},{name:'Execution',text:'Long explanation '.repeat(5)}]});
const profileResults=Array.from({length:150},(_,i)=>({season:2027+Math.floor(i/60),week:(i%52)+1,perf:10+i/1000,event:`Meet ${i}`,source:'event',achievements:i===149?['PB']:[],intel:intel(i),intelContext:{hidden:'duplicate context '.repeat(10)}}));
const activeOppResults=Array.from({length:50},(_,i)=>({season:i<25?2027:2028,week:(i%52)+1,perf:10.3+i/100,event:`Away ${i}`,source:'world-tour',achievements:i===2?['WR']:i===20?['PB']:[],intel:intel(i),intelContext:{hidden:'foreign duplicate context '.repeat(8)}}));
const retiredOppResults=Array.from({length:45},(_,i)=>({season:i<30?2027:2028,week:(i%52)+1,perf:1.9+i/100,event:`Retired ${i}`,source:'event',achievements:i===1?['NR']:[],intel:intel(i),intelContext:{hidden:'retired duplicate context '.repeat(8)}}));
const oppositionMemories=Array.from({length:40},(_,i)=>({type:i===0?'Call-up':i===10?'World record':'Routine',week:i+1,season:i<20?2027:2028,text:`Opposition memory ${i} `.repeat(4)}));
const retiredMemories=Array.from({length:30},(_,i)=>({type:i===0?'Rivalry':i===5?'Olympic medal':'Routine',week:i+1,season:i<15?2027:2028,text:`Retired memory ${i} `.repeat(4)}));
const livingMoments=Array.from({length:220},(_,i)=>({id:`lw-${i}`,athleteId:i%2?'a':'b',season:i<100?2027:2028,week:(i%52)+1,text:`Moment ${i}`}));
const livingProcessed=Object.fromEntries(Array.from({length:900},(_,i)=>[`processed-${i}`,1]));
const activeDevelopment={version:2,focus:'velocity',intensity:'standard',blockWeeks:8,xp:{speed:.45},decline:{speed:.2},ceilings:{speed:18},history:Array.from({length:35},(_,i)=>({careerWeek:i,key:'speed',from:10,to:11})),lastSession:{week:30,changes:[{key:'speed',from:10,to:11}]}};
const retiredDevelopment={version:2,focus:'technique',intensity:'low',blockWeeks:4,xp:{technique:.3},decline:{technique:.1},ceilings:{technique:17},history:Array.from({length:20},(_,i)=>({careerWeek:i,key:'technique',from:12,to:13})),lastSession:{week:12,changes:[{key:'technique',from:12,to:13}]}};
const state={
 game:{season:2028,week:30,careerWeek:82},
 managedNation:'GBR',
 history:[{year:2,week:20,event:'International Meeting',results:{M100:[
  {id:'a',name:'A Runner',nation:'GBR',perf:10.12,points:10,achievements:['PB'],splits:[2.1,4.2,6.3],animation:{frames:Array(50).fill(1)}},
  {id:'b',name:'B Runner',nation:'USA',perf:10.18,points:8,throwAttempts:[1,2,3]}
 ]}}],
 management:{
  results:{'2028:Meet:20:M100':{rows:[{id:'a',name:'A Runner',nation:'GBR',perf:10.12,place:1,achievements:['PB'],hugeReplay:Array(100).fill('x')}] }},
  coachArchive:{coach:{results:{'2028:Meet:20:M100':{rows:[{id:'a',name:'A Runner',nation:'GBR',perf:10.12,place:1,achievements:['PB'],hugeReplay:Array(100).fill('x')}]}}}}
 },
 summitSeries:{
  2028:{season:2028,meetings:{
   1:{week:14,completed:true,fields:{M100:['a','b']},results:{M100:[{id:'a',name:'A Runner',nation:'GBR',perf:10.12,points:10,throwAttempts:[1,2,3]}]}},
   4:{week:30,completed:true,fields:{M100:['a','b']},results:{M100:[{id:'a',name:'A Runner',nation:'GBR',perf:10.11,points:10,throwAttempts:[1,2,3]}]}}
  }}
 },
 athletes:[{
  id:'a',nation:'GBR',profileResults,
  story:{memories:Array.from({length:50},(_,i)=>({type:'Managed memory',week:i,text:`Memory ${i}`}))},
  attributeDevelopment:{version:2,focus:'velocity',intensity:'high',blockWeeks:9,xp:{speed:.7},decline:{speed:.1},ceilings:{speed:19},history:Array.from({length:35},(_,i)=>({careerWeek:i,key:'speed',from:10,to:11})),lastSession:{week:30,changes:[{key:'speed',from:10,to:11}]}},
  traitState:{active:{confident:{season:2028,week:20}},good:3,poor:0,history:Array.from({length:20},(_,i)=>({week:i,type:'confidence'})),processedResults:{'2027:old:1:M100':true,'2028:current:20:M100':true}}
 },{
  id:'b',nation:'USA',profileResults:activeOppResults,
  story:{trust:61,starts:44,development:6,experience:8,memories:oppositionMemories},
  attributeDevelopment:activeDevelopment,
  traitState:{active:{confident:{season:2028,week:18}},good:4,poor:1,trainingWeeks:2,history:Array.from({length:10},(_,i)=>({week:i,type:'confidence'}))}
 },{
  id:'c',nation:'GERMANY',retired:true,profileResults:retiredOppResults,
  story:{trust:65,starts:80,development:9,experience:15,memories:retiredMemories},
  attributeDevelopment:retiredDevelopment,
  traitState:{active:{rhythm:{season:2027,week:12}},good:1,poor:2,history:Array.from({length:9},(_,i)=>({week:i,type:'trait'}))}
 }],
 livingWorld:{version:1,moments:livingMoments,processed:livingProcessed,athletes:{
  a:{heat:20,flags:{'upset:2026':true,'upset:2028':true},lastMoment:livingMoments.at(-1)},
  b:{heat:10,flags:{callupMessage:true},lastMoment:livingMoments.at(-2)}
 }},
 rivalries:{processed:{'2027:old:1:M100':true,'2028:current:20:M100':true}},
 programmeEconomies:{GBR:{bonusPaid:{'2027:old:M100:a:1':1000,'2028:meet:M100:a:1':1000}}},
 inboxDecisionSystem:{archive:oldArchive,emailMeta,actions:{live:{emailId:'live',resolution:'awaiting_response'}}},
 emails:[{id:'live',unread:true}],
 performances:Array.from({length:1100},(_,i)=>({id:`p${i}`,perf:i}))
};

let physical=0;
const listeners={};
const context={
 console,Date,Math,JSON,Object,Array,Number,String,Boolean,Set,Map,Promise,
 setTimeout,clearTimeout,queueMicrotask,
 s:state,
 document:{addEventListener(type,fn){listeners[`document:${type}`]=fn}},
 addEventListener(type,fn){listeners[`window:${type}`]=fn},
 __amAthleteContractExpiryGateV1:true,
 AMProgrammeEconomy:{__athleteContractExpiryGateV1:1,decisionActions(){return[]}}
};
context.window=context;
context.save=function(){physical++;context.lastPersisted=JSON.stringify(context.s)};
context.advanceWeek=function(){for(let i=0;i<8;i++)context.save();context.s.game.week++};
context.simulateSummitMeeting=function(){for(let i=0;i<20;i++)context.save()};
context.simulateWholeEvent=function(){for(let i=0;i<12;i++)context.save()};
context.finishSummitMeeting=function(){context.save();context.save()};
context.finaliseEvent=function(){context.save();context.save()};
context.render=function(){context.save();context.save();context.save()};

vm.createContext(context);
vm.runInContext(code,context,{filename:'persistence-performance-v1.js'});

assert.equal(context.AMPersistencePerformance.version,1,'persistence authority missing');
context.AMPersistencePerformance.resetMetrics();
physical=0;
context.simulateSummitMeeting({});
assert.equal(physical,1,'Summit meeting should collapse repeated save calls into one physical save');
let metrics=context.AMPersistencePerformance.metrics();
assert.equal(metrics.physicalSaves,1,'physical save metric should record one Summit save');
assert.ok(metrics.deferredSaves>=20,'Summit save calls were not deferred inside the batch');

const athlete=context.s.athletes[0];
assert.equal(athlete.profileResults.length,120,'managed athlete result history must remain at the 120-result profile window');
assert.equal(athlete.profileResults[0].event,'Meet 30','managed result compaction did not retain the newest 120 rows');
assert.equal(athlete.profileResults.at(-1).event,'Meet 149','latest managed athlete result was lost');
assert.deepEqual(athlete.profileResults.at(-1).achievements,['PB'],'latest managed result achievement was lost');
assert.equal(athlete.profileResults.filter(row=>row.intel).length,4,'managed athlete should retain four detailed performance reviews');
assert.ok(!('intel' in athlete.profileResults[0]),'old managed detailed performance review payload was retained');
assert.ok(!athlete.profileResults.some(row=>'intelContext' in row),'hidden duplicate performance context was retained');
assert.equal(athlete.story.memories.length,40,'managed athlete story memories exceeded their player-facing retention window');
assert.equal(athlete.attributeDevelopment.history.length,30,'managed attribute development history exceeded its UI retention window');
assert.ok(athlete.attributeDevelopment.lastSession,'managed athlete should retain latest training-session detail');
assert.equal(athlete.attributeDevelopment.focus,'velocity','managed development focus changed');
assert.equal(athlete.attributeDevelopment.xp.speed,.7,'managed development XP changed');
assert.equal(athlete.traitState.history.length,12,'managed trait history exceeded its UI retention window');
assert.ok(athlete.traitState.active.confident,'managed active trait state changed');

const opposition=context.s.athletes[1];
assert.equal(opposition.profileResults.length,26,'active opposition should retain 24 recent results plus older milestone rows');
assert.ok(opposition.profileResults.some(r=>r.event==='Away 2'&&r.achievements.includes('WR')),'old opposition world-record result was lost');
assert.ok(opposition.profileResults.some(r=>r.event==='Away 20'&&r.achievements.includes('PB')),'old opposition PB result was lost');
assert.ok(!opposition.profileResults.some(r=>r.event==='Away 5'),'old routine opposition result should be released');
assert.equal(opposition.profileResults.at(-1).event,'Away 49','latest opposition result was lost');
assert.equal(opposition.profileResults.filter(row=>row.intel).length,2,'active opposition should retain only two detailed recent performance reviews');
assert.ok(!opposition.profileResults.some(row=>'intelContext' in row),'active opposition retained hidden performance context');
assert.ok(opposition.story.memories.length<=12,'active opposition story history should be compact');
assert.ok(opposition.story.memories.some(m=>m.type==='Call-up'),'important opposition call-up chapter was lost');
assert.ok(opposition.story.memories.some(m=>m.type==='World record'),'important opposition world-record chapter was lost');
assert.equal(opposition.story.starts,44,'opposition story simulation state changed');
assert.equal(opposition.attributeDevelopment.history.length,2,'active non-managed development history should retain two recent changes');
assert.ok(!('lastSession' in opposition.attributeDevelopment),'active non-managed duplicate last-session payload should be released');
assert.equal(opposition.attributeDevelopment.focus,'velocity','active opposition development focus changed');
assert.equal(opposition.attributeDevelopment.xp.speed,.45,'active opposition development XP changed');
assert.equal(opposition.attributeDevelopment.ceilings.speed,18,'active opposition development ceiling changed');
assert.equal(opposition.traitState.history.length,4,'active opposition trait history should retain four recent changes');
assert.ok(opposition.traitState.active.confident,'active opposition trait state changed');
assert.equal(opposition.traitState.good,4,'active opposition trait streak state changed');

const retired=context.s.athletes[2];
assert.equal(retired.profileResults.length,13,'retired opposition should retain 12 recent results plus milestone history');
assert.ok(retired.profileResults.some(r=>r.event==='Retired 1'&&r.achievements.includes('NR')),'retired opposition milestone result was lost');
assert.ok(!retired.profileResults.some(r=>r.event==='Retired 8'),'old routine retired result should be released');
assert.equal(retired.profileResults.at(-1).event,'Retired 44','latest retired result was lost');
assert.equal(retired.profileResults.filter(row=>row.intel).length,1,'retired opposition should retain one detailed recent performance review');
assert.ok(retired.story.memories.length<=8,'retired opposition story history should be compact');
assert.ok(retired.story.memories.some(m=>m.type==='Rivalry'),'retired opposition rivalry chapter was lost');
assert.ok(retired.story.memories.some(m=>m.type==='Olympic medal'),'retired opposition Olympic-medal chapter was lost');
assert.equal(retired.story.experience,15,'retired story simulation state changed');
assert.equal(retired.attributeDevelopment.history.length,1,'retired opposition should retain only its latest development change');
assert.ok(!('lastSession' in retired.attributeDevelopment),'retired opposition duplicate last-session payload should be released');
assert.equal(retired.attributeDevelopment.focus,'technique','retired development focus changed');
assert.equal(retired.attributeDevelopment.xp.technique,.3,'retired development XP changed');
assert.equal(retired.traitState.history.length,2,'retired opposition trait history should retain two recent changes');
assert.ok(retired.traitState.active.rhythm,'retired active trait archive changed');

assert.equal(context.s.livingWorld.moments.length,180,'living-world moment archive is not bounded');
assert.equal(Object.keys(context.s.livingWorld.processed).length,800,'living-world processed dedupe map is not bounded');
assert.ok(!('lastMoment' in context.s.livingWorld.athletes.a),'living-world athlete state retained duplicate moment payload');
assert.ok(!context.s.livingWorld.athletes.a.flags['upset:2026'],'stale season-specific living-world flag was retained');
assert.equal(context.s.livingWorld.athletes.a.flags['upset:2028'],true,'current season living-world flag was lost');

const oldSummit=context.s.summitSeries[2028].meetings[1];
assert.ok(!oldSummit.fields,'completed past Summit fields should be released after the week has passed');
assert.ok(!('throwAttempts' in oldSummit.results.M100[0]),'past Summit replay detail was not compacted');
const currentSummit=context.s.summitSeries[2028].meetings[4];
assert.ok(currentSummit.fields,'current-week Summit detail must stay intact');
assert.ok('throwAttempts' in currentSummit.results.M100[0],'current-week Summit attempts must remain available');

context.AMPersistencePerformance.resetMetrics();
physical=0;
context.advanceWeek();
assert.equal(physical,1,'week advance should finish with one physical save');
assert.equal(context.s.game.week,31,'week advance gameplay state changed unexpectedly');
assert.ok(!currentSummit.fields,'Summit fields should be released once the career advances beyond the meeting week');
assert.ok(!('throwAttempts' in currentSummit.results.M100[0]),'Summit replay detail should compact after the meeting week has passed');

const compacted=context.s.history[0].results.M100;
assert.equal(compacted.length,2,'historical standings must retain every result row');
assert.equal(compacted[0].perf,10.12,'historical performance changed during compaction');
assert.equal(compacted[0].place,1,'historical placing must remain recoverable');
assert.ok(!('splits' in compacted[0])&&!('animation' in compacted[0]),'replay-only historical payload was not removed');
assert.ok(!('throwAttempts' in compacted[1]),'attempt detail should not be duplicated in historical archive rows');

const managerRow=context.s.management.results['2028:Meet:20:M100'].rows[0];
assert.equal(managerRow.place,1,'manager result placing was lost');
assert.ok(!('hugeReplay' in managerRow),'manager result duplicate replay payload was not compacted');
const coachRow=context.s.management.coachArchive.coach.results['2028:Meet:20:M100'].rows[0];
assert.equal(coachRow.achievements[0],'PB','coach result achievement was lost');
assert.ok(!('hugeReplay' in coachRow),'coach result duplicate replay payload was not compacted');

assert.deepEqual(Object.keys(context.s.athletes[0].traitState.processedResults),['2028:current:20:M100'],'old trait dedupe keys were not pruned');
assert.deepEqual(Object.keys(context.s.rivalries.processed),['2028:current:20:M100'],'old rivalry dedupe keys were not pruned');
assert.deepEqual(Object.keys(context.s.programmeEconomies.GBR.bonusPaid),['2028:meet:M100:a:1'],'old bonus guard keys were not pruned');
assert.equal(context.s.inboxDecisionSystem.archive.length,80,'hidden decision archive is not bounded');
assert.equal(context.s.performances.length,1000,'global performance cache must remain capped');
assert.ok(context.s.inboxDecisionSystem.emailMeta.live,'live inbox metadata was removed');
assert.ok(!context.s.inboxDecisionSystem.emailMeta['old-0'],'metadata for discarded hidden archive mail was retained');

physical=0;
context.save();
assert.equal(physical,1,'ordinary direct save must remain synchronous outside a batch');
assert.ok(context.lastPersisted.includes('International Meeting'),'direct save did not persist current state');

console.log('PERSISTENCE PERFORMANCE REGRESSION: PASSED');
console.log('✓ Summit operation: 20 save requests → 1 physical save');
console.log('✓ Week operation: 8 save requests → 1 physical save');
console.log('✓ Managed athlete history remains rich; active/retired opposition retain recent + milestone result archives');
console.log('✓ Opposition story, development and trait history compact without changing current simulation state');
console.log('✓ Living-world moments, dedupe state and duplicate athlete moment payloads bounded');
console.log('✓ Historical standings retained while replay-only duplicate payloads are compacted');
console.log('✓ Current-week Summit attempt detail retained, then compacted after progression');
console.log('✓ Technical dedupe maps and hidden decision archive bounded');