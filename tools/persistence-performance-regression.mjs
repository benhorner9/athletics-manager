import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('scripts/persistence-performance-v1.js','utf8');
const oldArchive=Array.from({length:100},(_,i)=>({id:`old-${i}`,body:'archived body '.repeat(10)}));
const emailMeta=Object.fromEntries(oldArchive.map(m=>[m.id,{emailId:m.id,read:'read'}]));
emailMeta.live={emailId:'live',read:'unread'};

const profileResults=Array.from({length:150},(_,i)=>({season:2027+Math.floor(i/60),week:(i%52)+1,perf:10+i/1000,event:`Meet ${i}`,source:'event',achievements:i===149?['PB']:[]}));
const state={
 game:{season:2028,week:30,careerWeek:82},
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
  id:'a',profileResults,
  story:{memories:Array.from({length:50},(_,i)=>({week:i,text:`Memory ${i}`}))},
  attributeDevelopment:{history:Array.from({length:35},(_,i)=>({careerWeek:i,key:'speed',from:10,to:11}))},
  traitState:{history:Array.from({length:20},(_,i)=>({week:i,type:'confidence'})),processedResults:{'2027:old:1:M100':true,'2028:current:20:M100':true}}
 }],
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
assert.equal(athlete.profileResults.length,120,'athlete result history must be bounded to the 120 results exposed by the profile UI');
assert.equal(athlete.profileResults[0].event,'Meet 30','athlete result compaction did not retain the newest 120 rows');
assert.equal(athlete.profileResults.at(-1).event,'Meet 149','latest athlete result was lost');
assert.deepEqual(athlete.profileResults.at(-1).achievements,['PB'],'latest result achievement was lost');
assert.equal(athlete.story.memories.length,40,'athlete story memories exceeded their player-facing retention window');
assert.equal(athlete.attributeDevelopment.history.length,30,'attribute development history exceeded its UI retention window');
assert.equal(athlete.traitState.history.length,12,'trait history exceeded its UI retention window');

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
console.log(`✓ Summit operation: 20 save requests → 1 physical save`);
console.log(`✓ Week operation: 8 save requests → 1 physical save`);
console.log('✓ Athlete profile, story, development and trait histories bounded to visible retention windows');
console.log('✓ Historical standings retained while replay-only duplicate payloads are compacted');
console.log('✓ Current-week Summit attempt detail retained, then compacted after progression');
console.log('✓ Technical dedupe maps and hidden decision archive bounded');