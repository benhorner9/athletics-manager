import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../scripts/career-identity-v2.js',import.meta.url),'utf8');
const documentStub={readyState:'loading',addEventListener(){},getElementById(){return null},querySelector(){return null},querySelectorAll(){return[]},createElement(){return{dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){}}}};
const ctx={console,document:documentStub,MutationObserver:class{observe(){}},setTimeout:fn=>fn(),requestAnimationFrame:fn=>fn(),localStorage:{},HTMLDialogElement:function(){}};
ctx.window=ctx;ctx.globalThis=ctx;
ctx.s={game:{season:2027,week:1,careerWeek:1},managedNation:'GREAT BRITAIN',athletes:[],coaches:{},management:{results:{}},career:{nationsManaged:['GREAT BRITAIN'],tenures:[{nation:'GREAT BRITAIN',startSeason:2027,startCareerYear:1}],seasonHistory:[]}};
ctx.managementState=()=>ctx.s.management;
ctx.careerState=()=>ctx.s.career;
ctx.managedNation=()=>ctx.s.managedNation;
ctx.nationName=n=>n;
ctx.discLabel=d=>d;
ctx.fmtPerf=(d,v)=>String(v);
ctx.careerNow=()=>ctx.s.game.careerWeek;
ctx.save=()=>{};
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'career-identity-v2.js'});
const api=ctx.AMCareerIdentityV2;
assert(api?.version===2,'Career Identity V2 API unavailable');

for(let year=0;year<40;year++){
 const season=2027+year;
 ctx.s.game.season=season;
 ctx.s.game.careerWeek=year*52+1;
 api.record({id:`defining:${season}`,type:'career_milestone',tier:1,season,week:1,title:`Defining milestone ${season}`});
 api.remember({id:`athlete-major:${season}`,athleteId:'long-career-athlete',type:'major_selection',tier:2,season,week:24,title:`Major selection ${season}`});
 for(let week=1;week<=52;week+=2){
  api.record({id:`background:${season}:${week}`,type:'routine_result',tier:3,season,week,title:`Routine result ${season} W${week}`});
  api.remember({id:`athlete-background:${season}:${week}`,athleteId:'long-career-athlete',type:'history',tier:3,season,week,title:`Routine athlete memory ${season} W${week}`});
 }
 api.compact();
}

const st=api.ensure();
assert.equal(st.events.filter(e=>e.tier===1&&e.id.startsWith('defining:')).length,40,'A career-defining season milestone was lost during the 40-year soak');
assert.equal((st.athleteMemories['long-career-athlete']||[]).filter(m=>m.tier===2&&m.id.startsWith('athlete-major:')).length,40,'Important athlete history was lost during the 40-year soak');
assert(st.events.filter(e=>e.tier>=3).length<=4000,'40-year background career history exceeded the compaction budget');
assert((st.athleteMemories['long-career-athlete']||[]).filter(m=>m.tier>=3).length<=80,'40-year athlete background history exceeded the per-athlete compaction budget');
assert(st.compaction.backgroundArchived>0,'40-year soak never exercised historical compaction');

const json=JSON.stringify(ctx.s.management.careerIdentityV2);
assert(json.length<2_500_000,`Career Identity V2 40-year synthetic save grew unexpectedly large: ${json.length} bytes`);
console.log('Career Identity & Legacy V2 40-year soak passed');
console.log(JSON.stringify({bytes:json.length,events:st.events.length,importantAthleteMemories:(st.athleteMemories['long-career-athlete']||[]).filter(m=>m.tier<=2).length,backgroundArchived:st.compaction.backgroundArchived},null,2));
