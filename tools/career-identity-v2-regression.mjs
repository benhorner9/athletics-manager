import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../scripts/career-identity-v2.js',import.meta.url),'utf8');
const game=fs.readFileSync(new URL('../game.html',import.meta.url),'utf8');
const sidebar=fs.readFileSync(new URL('../scripts/manager-profile-sidebar-v1.js',import.meta.url),'utf8');
assert(!/\bOVR\b|overall rating/i.test(source),'Career Identity V2 must not introduce visible OVR language');
assert(source.includes('function programmeStats'),'Career Identity V2 source is incomplete after migration/repair');
assert(game.includes('styles/career-identity-v2.css'),'Career Identity V2 stylesheet is missing from the normal asset graph');
assert(game.includes('scripts/career-identity-v2.js'),'Career Identity V2 script is missing from the normal asset graph');
assert(game.indexOf('scripts/career-identity-v2.js')>game.indexOf('scripts/live-event-shell-v5.js'),'Career Identity V2 must load after the final authoritative gameplay layers');
assert(!sidebar.includes("script.src='scripts/career-identity-v2.js"),'Temporary dynamic Career Identity loader is still active');

const listeners={};
const documentStub={
 readyState:'loading',
 addEventListener:(name,fn)=>{listeners[name]=fn},
 getElementById:()=>null,
 querySelector:()=>null,
 querySelectorAll:()=>[],
 createElement:()=>({dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){}})
};
const ctx={console,document:documentStub,MutationObserver:class{observe(){}},setTimeout:fn=>fn(),requestAnimationFrame:fn=>fn(),localStorage:{},HTMLDialogElement:function(){}};
ctx.window=ctx;ctx.globalThis=ctx;
ctx.s={
 game:{season:2032,week:10,careerWeek:270},managedNation:'GREAT BRITAIN',athletes:[],coaches:{},management:{results:{}},career:{nationsManaged:['GREAT BRITAIN'],tenures:[{nation:'GREAT BRITAIN',startSeason:2027,startCareerYear:1}],seasonHistory:[]}
};
ctx.managementState=()=>ctx.s.management;
ctx.careerState=()=>ctx.s.career;
ctx.managedNation=()=>ctx.s.managedNation;
ctx.nationName=n=>n==='GREAT BRITAIN'?'Great Britain':n;
ctx.discLabel=d=>({M100:"Men's 100m"}[d]||d);
ctx.fmtPerf=(d,v)=>`${Number(v).toFixed(2)}s`;
ctx.careerNow=()=>ctx.s.game.careerWeek;
ctx.save=()=>{};
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'career-identity-v2.js'});
const api=ctx.AMCareerIdentityV2;
assert(api&&api.version===2,'Career Identity V2 API did not initialise');

for(let i=0;i<4500;i++)api.record({id:`bg:${i}`,type:'routine_result',tier:3,season:2027+Math.floor(i/200),week:(i%52)+1,title:`Routine ${i}`});
for(let i=0;i<12;i++)api.record({id:`major:${i}`,type:'career_milestone',tier:1,season:2027+i,week:1,title:`Major ${i}`});
api.compact();
let st=api.ensure();
assert.equal(st.events.filter(e=>e.tier===1).length,12,'Tier 1 history was lost during compaction');
assert(st.events.filter(e=>e.tier>=3).length<=4000,'Background career history was not compacted');

for(let i=0;i<105;i++)api.remember({id:`mem-bg:${i}`,athleteId:'a1',type:'history',tier:3,season:2027,week:(i%52)+1,title:`Memory ${i}`});
for(let i=0;i<4;i++)api.remember({id:`mem-major:${i}`,athleteId:'a1',type:'medal',tier:1,season:2028+i,week:20,title:`Major memory ${i}`});
api.compact();
st=api.ensure();
assert.equal(st.athleteMemories.a1.filter(m=>m.tier===1).length,4,'Important athlete memories were lost');
assert(st.athleteMemories.a1.filter(m=>m.tier>=3).length<=80,'Background athlete memories were not compacted');

ctx.s.athletes.push({id:'champ1',name:'Hannah Cole',nation:'GREAT BRITAIN',disc:'M100',age:36,pb:10.01,retired:true,retirement:{season:2030,week:40,age:34,reason:'Retirement'},medals:{g:1,s:0,b:1},story:{trust:82,memories:[{type:'Call-up',text:'Called into the national squad.',season:2027,week:8}]}});
ctx.s.management.results['2030:olympics:M100']={season:2030,week:36,event:'Olympic Games',disc:'M100',olympic:true,national:false,rows:[{id:'champ1',name:'Hannah Cole',nation:'GREAT BRITAIN',place:1,perf:10.01,achievements:['PB','NR']}]};
api.sync();
const stats=api.athleteStats('champ1');
assert.equal(stats.olympicGolds,1,'Olympic gold was not retained in athlete history');
assert.equal(stats.majorMedals,1,'Major medal count is incorrect');
assert.equal(stats.years,4,'Retired athlete relationship incorrectly extends beyond retirement season');
assert(api.ensure().programmes['GREAT BRITAIN'].legendIds.includes('champ1'),'Qualifying retired athlete was not recognised as a programme legend');
assert(api.ensure().programmes['GREAT BRITAIN'].hallOfFameIds.includes('champ1'),'Exceptional retired athlete was not inducted after retirement');
assert.equal(api.relationship('champ1').label,'Former programme athlete','Retired relationship label is incorrect');
const summary=api.retirementSummary('champ1');
assert.equal(summary.olympicGames,1,'Retirement summary lost Olympic history');
assert.equal(summary.withProgramme,4,'Retirement summary uses an inflated relationship length');
assert(summary.definingMoment.includes('Olympic Games'),'Retirement summary did not use factual defining moment');

const beforeNationEvents=api.events({nation:'GREAT BRITAIN'}).length;
ctx.s.career.tenures[0].endSeason=2032;
ctx.s.career.tenures.push({nation:'CANADA',startSeason:2033,startCareerYear:7});ctx.s.career.nationsManaged.push('CANADA');ctx.s.managedNation='CANADA';ctx.s.game.season=2033;ctx.s.game.week=1;api.sync();
assert(api.events({nation:'GREAT BRITAIN'}).length>=beforeNationEvents,'Changing nation destroyed previous programme history');
assert(api.ensure().programmes['GREAT BRITAIN'],'Previous programme archive disappeared after nation change');
assert(api.ensure().programmes.CANADA,'New programme history was not created after nation change');

console.log('Career Identity & Legacy V2 regression passed');
console.log(JSON.stringify(api.snapshot(),null,2));
