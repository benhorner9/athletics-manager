import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('scripts/persistence-performance-v1.js','utf8');
const hidden={
 id:'hidden-1',name:'Hidden Runner',nation:'GERMANY',disc:'M100',age:19,overall:71,potential:91,
 devProjectionBase:90,devProjectionScoutLevel:2,fitness:91,form:80,fatigue:4,pb:10.44,tier:'Prospect',points:0,
 injury:0,medals:{g:0,s:0,b:0},training:'Balanced',inSquad:false,source:'Hidden Talent',assessmentIntroduced:false,
 visualGroup:'white',portraitSlot:7,scoutingHidden:true,scoutingRegion:'Central',hiddenEnteredSeason:2027,
 hiddenEnteredWeek:2,hiddenVisibility:54,birthPlace:'Berlin',athleticsClubId:'berlin-ac',athleticsClub:'Berlin AC',
 profileResults:Array.from({length:20},(_,i)=>({week:i+1,perf:10.5-i/100})),
 weeklyForm:Array.from({length:52},(_,i)=>({week:i+1,form:70+i%10})),
 attributeDevelopment:{history:Array.from({length:30},(_,i)=>({week:i}))},
 attributeRatings:{acceleration:16,maxVelocity:17},
 story:{memories:Array.from({length:20},(_,i)=>({week:i,text:'hidden story'}))},
 trainingV2:{history:Array.from({length:20},(_,i)=>({week:i}))},
 traitState:{history:Array.from({length:12},(_,i)=>({week:i}))},
 duplicateCache:'x'.repeat(1000)
};
const managedHidden={...hidden,id:'hidden-gb',name:'Hidden GB',nation:'GREAT BRITAIN'};
const state={
 game:{season:2028,week:9,careerWeek:61},managedNation:'GREAT BRITAIN',
 athletes:[
  {id:'de-active',nation:'GERMANY',retired:false},
  {id:'de-retired',nation:'GERMANY',retired:true},
  {id:'gb-active',nation:'GREAT BRITAIN',retired:false}
 ],
 scoutingV2:{nations:{
  GERMANY:{hiddenTalent:[hidden],knowledge:{
   'de-active':{athleteId:'de-active',evidence:48,stage:'developing',lastObservedCW:60,stale:false,firstIdentified:{season:2027,week:3,source:'AI'},observations:Array.from({length:20},(_,i)=>({week:i})),scoutOpinions:{scout:{overall:70}},reportIds:['r1','r2']},
   'de-retired':{athleteId:'de-retired',evidence:80,stage:'clear',lastObservedCW:40,stale:true,observations:[{week:1}]},
   ghost:{athleteId:'ghost',evidence:20,stage:'limited',lastObservedCW:5,stale:true}
  }},
  'GREAT BRITAIN':{hiddenTalent:[managedHidden],knowledge:{
   'gb-active':{athleteId:'gb-active',evidence:70,stage:'strong',lastObservedCW:60,stale:false,firstIdentified:{season:2027,week:2},observations:[{week:8,type:'testing'}],scoutOpinions:{scout:{overall:72}},reportIds:['gb-r1']}
  }}
 }},
 emails:[],history:[],performances:[]
};

let physical=0;
const context={console,Date,Math,JSON,Object,Array,Number,String,Boolean,Set,Map,Promise,setTimeout,clearTimeout,queueMicrotask,s:state};
context.window=context;
context.document={addEventListener(){}};
context.addEventListener=()=>{};
context.save=()=>{physical++};
context.load=()=>{};
context.__amAthleteContractExpiryGateV1=true;
context.AMProgrammeEconomy={__athleteContractExpiryGateV1:1,decisionActions(){return[]}};
vm.createContext(context);
vm.runInContext(code,context,{filename:'persistence-performance-v1.js'});

const truthKeys=['id','name','nation','disc','age','overall','potential','devProjectionBase','devProjectionScoutLevel','fitness','form','fatigue','pb','tier','points','injury','medals','training','inSquad','source','assessmentIntroduced','visualGroup','portraitSlot','scoutingHidden','scoutingRegion','hiddenEnteredSeason','hiddenEnteredWeek','hiddenVisibility','birthPlace','athleticsClubId','athleticsClub'];
const beforeTruth=Object.fromEntries(truthKeys.map(k=>[k,JSON.stringify(hidden[k])]));
const beforeSize=JSON.stringify(state.scoutingV2).length;
context.AMPersistencePerformance.compact();
const afterSize=JSON.stringify(state.scoutingV2).length;

for(const key of truthKeys)assert.equal(JSON.stringify(hidden[key]),beforeTruth[key],`hidden athlete truth changed: ${key}`);
for(const key of ['profileResults','weeklyForm','attributeDevelopment','attributeRatings','story','trainingV2','traitState','duplicateCache'])assert.ok(!(key in hidden),`hidden-only payload survived compaction: ${key}`);
assert.ok(afterSize<beforeSize*0.55,`scouting compaction was too small: ${beforeSize} -> ${afterSize}`);

const foreign=state.scoutingV2.nations.GERMANY.knowledge;
assert.deepEqual(Object.keys(foreign),['de-active'],'foreign AI knowledge retained retired/missing athletes');
assert.deepEqual(Object.keys(foreign['de-active']).sort(),['athleteId','evidence','lastObservedCW','stage','stale'].sort(),'foreign AI knowledge retained player-facing history payloads');
assert.equal(foreign['de-active'].evidence,48,'foreign AI evidence changed');
assert.equal(foreign['de-active'].stage,'developing','foreign AI knowledge stage changed');

const managed=state.scoutingV2.nations['GREAT BRITAIN'].knowledge['gb-active'];
assert.equal(managed.observations.length,1,'managed scouting observations were compacted');
assert.equal(managed.reportIds[0],'gb-r1','managed scouting report history was compacted');
assert.ok(managed.firstIdentified,'managed first-identification history was removed');

physical=0;context.save();assert.equal(physical,1,'direct save no longer reaches physical save after scouting compaction');
console.log('SCOUTING PERSISTENCE REGRESSION: PASSED');
console.log(`✓ Hidden athlete truth retained while lazy payload shrank ${beforeSize} → ${afterSize} characters`);
console.log('✓ Foreign AI knowledge keeps live evidence only; retired/missing knowledge is released');
console.log('✓ Managed nation scouting evidence and report history remain intact');
