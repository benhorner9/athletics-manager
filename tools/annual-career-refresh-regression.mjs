import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('scripts/annual-career-refresh-v1.js','utf8');
const permanent={
 athletes:[{id:'a1',name:'Athlete',pb:10.12,medals:{g:1,s:0,b:0},profileResults:[{event:'Final',perf:10.12}],story:{trust:70,memories:[{type:'Olympic medal',text:'Won gold'}]}}],
 history:[{event:'Championship',results:{M100:[{id:'a1',perf:10.12}]}}],
 performances:[{athleteId:'a1',perf:10.12,season:2027}],
 medals:{g:1,s:0,b:0},
 records:{M100:{world:9.58}},
 career:{careerYear:2,cycleNumber:1,seasonHistory:[{season:2027,rank:2}],completedCycles:[]},
 scoutingV2:{nations:{'GREAT BRITAIN':{knowledge:{a1:{stage:4}}}}},
 rivalries:{pairs:{r1:{formed:true,ids:['a1','b1'],wins:{a1:2,b1:1}}}},
 programmeEconomies:{'GREAT BRITAIN':{athleteContracts:{a1:{state:'active'}}}}
};
const s={
 game:{season:2027,week:52,careerWeek:53},
 ...structuredClone(permanent),
 emails:[{id:'live',unread:false},{id:'pending-mail',unread:true}],
 news:[{id:'n1'},{id:'n2'}],
 events:[{id:'e1',completed:true,results:{M100:[{id:'a1',perf:10.12}]}}],
 plans:[{id:'p1',season:2027,status:'completed'}],
 leagues:{2027:{season:2027,rounds:{17:{}}}},
 inboxDecisionSystem:{
  archive:[{id:'old-archive'},{id:'pending-mail'}],
  actions:{done:{actionId:'done',emailId:'old-archive',resolution:'completed'},pending:{actionId:'pending',emailId:'pending-mail',resolution:'awaiting_response'}},
  emailMeta:{live:{emailId:'live'},'pending-mail':{emailId:'pending-mail'},stale:{emailId:'stale'}},
  log:Array.from({length:30},(_,i)=>({kind:'test',i}))
 }
};
let pruneCalls=0,compactCalls=0,baseEndSeasonCalls=0;
const context={
 window:{},s,
 pruneOldEmails(){pruneCalls++;return 0},
 endSeason(){baseEndSeasonCalls++;return 'base-end-season'},
 setTimeout(){},
 console,
 structuredClone
};
context.window.endSeason=context.endSeason;
context.window.AMPersistencePerformance={compact(){compactCalls++;return {changed:7}}};
vm.createContext(context);
vm.runInContext(source,context,{filename:'annual-career-refresh-v1.js'});
const need=(ok,msg)=>{if(!ok)throw new Error('Annual career refresh regression: '+msg)};
const beforePermanent=structuredClone(permanent);
const endResult=context.window.endSeason();
need(endResult==='base-end-season'&&baseEndSeasonCalls===1,'wrapped endSeason must run the refresh then call the original rollover');
need(pruneCalls===1,'four-week email pruning must run once');
need(compactCalls===1,'persistence compaction must run once');
need(s.news.length===0,'old World News must clear');
need(s.events.length===0,'old season event working graph must clear');
need(s.plans.length===0,'old calendar plans must clear');
need(Object.keys(s.leagues).length===0,'old league working state must clear');
need(Object.keys(s.inboxDecisionSystem.actions).length===1&&s.inboxDecisionSystem.actions.pending,'unresolved inbox action must survive while completed actions clear');
need(s.inboxDecisionSystem.archive.length===1&&s.inboxDecisionSystem.archive[0].id==='pending-mail','only archive mail backing a pending action may survive');
need(s.inboxDecisionSystem.emailMeta.live&&s.inboxDecisionSystem.emailMeta['pending-mail']&&!s.inboxDecisionSystem.emailMeta.stale,'only live/pending email metadata may survive');
need(s.inboxDecisionSystem.log.length===20,'technical inbox log must be bounded annually');
for(const [key,value] of Object.entries(beforePermanent))need(JSON.stringify(s[key])===JSON.stringify(value),`permanent ${key} state must survive unchanged`);
need(s.annualCareerRefresh.lastCompletedSeason===2027&&s.annualCareerRefresh.runs===1,'refresh audit marker must record completed season');
const second=context.window.AMAnnualCareerRefresh.run(2027);
need(second.ran===false&&second.reason==='already-refreshed','same season refresh must be idempotent');
need(pruneCalls===1&&compactCalls===1,'idempotent call must not repeat cleanup');
console.log('Annual career refresh regression passed');
