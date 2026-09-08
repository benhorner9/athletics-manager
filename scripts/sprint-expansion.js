/* ===== Update #10: Event Expansion I — Sprinting ===== */
(function(){
'use strict';

const SPRINT_EXPANSION_VERSION=1;
const SPRINT_DISCIPLINES={
  M200:{label:"Men's 200m",type:'time',unit:'s',distance:200},
  W200:{label:"Women's 200m",type:'time',unit:'s',distance:200},
  M400:{label:"Men's 400m",type:'time',unit:'s',distance:400},
  W400:{label:"Women's 400m",type:'time',unit:'s',distance:400}
};
const SPRINT_WORLD_RECORDS={M200:19.19,W200:21.34,M400:43.03,W400:47.60};
const ALL_SPRINTS=['M100','W100','M200','W200','M400','W400'];
const ALL_EVENTS=['M100','W100','M200','W200','M400','W400','MHJ','WHJ','MSP','WSP'];

Object.assign(DISCIPLINES,SPRINT_DISCIPLINES);
DISCIPLINES.M100.distance=100;DISCIPLINES.W100.distance=100;
Object.assign(WORLD_RECORDS,SPRINT_WORLD_RECORDS);

/* Selection and qualification standards. */
if(typeof SELECTION_STANDARDS!=='undefined')Object.assign(SELECTION_STANDARDS,{
 M200:{National:20.80,International:20.55,World:20.30,Olympic:20.20},
 W200:{National:23.30,International:22.95,World:22.65,Olympic:22.55},
 M400:{National:45.80,International:45.20,World:44.70,Olympic:44.50},
 W400:{National:52.20,International:51.40,World:50.70,Olympic:50.50}
});
if(typeof QUALIFICATION_TARGETS!=='undefined'){
 Object.assign(QUALIFICATION_TARGETS.worldcup.standards,{M200:20.45,W200:22.80,M400:45.00,W400:51.10});
 Object.assign(QUALIFICATION_TARGETS.olympics.standards,{M200:20.20,W200:22.55,M400:44.60,W400:50.60});
}

function sprintEventDisciplines(id,current=[]){
 if(id==='indoor')return [...ALL_SPRINTS];
 if(id==='spring')return [...ALL_SPRINTS,'MHJ','WHJ'];
 if(['euro','nationals','diamond','worldcup','development','olympics'].includes(id))return [...ALL_EVENTS];
 return [...current];
}
for(const e of EVENTS_TEMPLATE)e.disc=sprintEventDisciplines(e.id,e.disc);

/* One established specialist per new discipline in every federation. */
const SPRINT_SEEDS=[
 ['gb200m','Adam Cole','GREAT BRITAIN','M200',22,80,88,93,84,22,20.48,'Developing'],
 ['gb200w','Leah Hughes','GREAT BRITAIN','W200',24,82,88,94,87,18,22.75,'Elite'],
 ['gb400m','Owen Clarke','GREAT BRITAIN','M400',25,84,89,92,86,28,45.12,'Elite'],
 ['gb400w','Jasmine Turner','GREAT BRITAIN','W400',23,81,90,93,85,24,51.22,'Developing'],
 ['us200m','Xavier Price','USA','M200',24,94,96,96,92,18,19.78,'Elite'],
 ['us200w','Brielle Jackson','USA','W200',23,94,97,97,93,17,21.92,'Elite'],
 ['us400m','Elijah Moore','USA','M400',25,95,97,96,94,22,43.62,'Elite'],
 ['us400w','Naomi Hill','USA','W400',24,94,96,96,93,21,48.88,'Elite'],
 ['jm200m','Kadeem Sinclair','JAMAICA','M200',24,96,98,97,95,19,19.67,'Elite'],
 ['jm200w','Rochelle Campbell','JAMAICA','W200',23,96,98,97,95,18,21.83,'Elite'],
 ['jm400m','Jamar Bailey','JAMAICA','M400',26,91,94,94,91,24,44.18,'Elite'],
 ['jm400w','Tia Morgan','JAMAICA','W400',24,92,95,95,92,22,49.72,'Elite'],
 ['de200m','Florian Beck','GERMANY','M200',25,84,89,92,85,24,20.18,'International'],
 ['de200w','Lena Schmitt','GERMANY','W200',24,83,88,93,85,22,22.82,'International'],
 ['de400m','Matthias Kruger','GERMANY','M400',26,90,93,94,90,26,44.31,'Elite'],
 ['de400w','Emilia Wolf','GERMANY','W400',24,88,92,93,89,25,50.20,'Elite'],
 ['ca200m','Dylan Fraser','CANADA','M200',24,91,94,95,91,19,20.02,'Elite'],
 ['ca200w','Naomi Sinclair','CANADA','W200',23,89,93,94,90,18,22.38,'Elite'],
 ['ca400m','Elliot Tremblay','CANADA','M400',26,90,93,94,90,23,44.42,'Elite'],
 ['ca400w','Camille Reid','CANADA','W400',24,88,92,93,88,22,50.38,'International'],
 ['fr200m','Mathis Girard','FRANCE','M200',25,89,92,93,88,21,20.17,'Elite'],
 ['fr200w','Clara Martin','FRANCE','W200',24,88,92,93,89,20,22.51,'International'],
 ['fr400m','Lucas Bernard','FRANCE','M400',26,88,91,92,88,25,44.72,'International'],
 ['fr400w','Ines Laurent','FRANCE','W400',24,89,93,94,90,23,50.02,'Elite'],
 ['it200m','Marco De Luca','ITALY','M200',24,92,95,95,92,19,19.96,'Elite'],
 ['it200w','Chiara Rizzo','ITALY','W200',23,87,91,93,88,20,22.66,'International'],
 ['it400m','Davide Romano','ITALY','M400',25,87,91,92,88,25,44.88,'International'],
 ['it400w','Martina Conti','ITALY','W400',24,85,90,91,87,24,50.74,'International'],
 ['au200m','Lachlan Reid','AUSTRALIA','M200',24,90,94,94,91,20,20.04,'Elite'],
 ['au200w','Sienna Walsh','AUSTRALIA','W200',23,91,94,95,92,19,22.19,'Elite'],
 ['au400m','Noah Mitchell','AUSTRALIA','M400',25,92,95,95,92,23,44.10,'Elite'],
 ['au400w','Tahlia Cooper','AUSTRALIA','W400',24,90,94,94,91,22,49.86,'Elite'],
 ['jp200m','Kaito Mori','JAPAN','M200',24,88,92,93,89,20,20.21,'International'],
 ['jp200w','Mei Kobayashi','JAPAN','W200',23,84,89,91,86,19,22.91,'International'],
 ['jp400m','Yuto Watanabe','JAPAN','M400',25,89,93,93,89,24,44.68,'Elite'],
 ['jp400w','Rin Ishikawa','JAPAN','W400',24,86,91,92,87,23,50.65,'International'],
 ['nl200m','Jesse de Boer','NETHERLANDS','M200',24,86,90,92,87,21,20.35,'International'],
 ['nl200w','Noor van Dijk','NETHERLANDS','W200',23,91,94,95,92,19,22.24,'Elite'],
 ['nl400m','Milan Smit','NETHERLANDS','M400',25,87,91,92,88,24,44.91,'International'],
 ['nl400w','Fleur Visser','NETHERLANDS','W400',24,93,96,96,93,21,49.34,'Elite'],
 ['pl200m','Mateusz Nowak','POLAND','M200',25,83,88,91,84,23,20.48,'International'],
 ['pl200w','Julia Kowalska','POLAND','W200',24,84,89,92,85,21,22.89,'International'],
 ['pl400m','Mikolaj Zielinski','POLAND','M400',26,91,94,94,91,25,44.34,'Elite'],
 ['pl400w','Oliwia Wojcik','POLAND','W400',24,90,94,94,90,23,49.78,'Elite'],
 ['za200m','Lethabo Mokoena','SOUTH_AFRICA','M200',24,94,96,96,93,18,19.84,'Elite'],
 ['za200w','Ayanda Khumalo','SOUTH_AFRICA','W200',23,87,92,93,88,20,22.63,'International'],
 ['za400m','Sibusiso Nkosi','SOUTH_AFRICA','M400',25,93,96,95,92,23,43.98,'Elite'],
 ['za400w','Thandi Dlamini','SOUTH_AFRICA','W400',24,86,91,92,87,23,50.88,'International']
];
const SPRINT_POOL={
 'GREAT BRITAIN':[
  ['gbp200m','Finley Ward','M200',21,73,86,90,79,12,20.98],['gbp200w','Molly Shaw','W200',20,72,87,91,80,11,23.42],
  ['gbp400m','Lewis Hall','M400',22,74,87,89,79,15,46.20],['gbp400w','Amber Webb','W400',20,71,88,90,78,12,52.55]],
 USA:[['usp200m','Cameron Reed','M200',21,82,91,92,84,12,20.36],['usp200w','Aaliyah Brooks','W200',20,82,92,93,85,11,22.88],['usp400m','Jayden Cole','M400',22,83,92,92,84,14,45.28],['usp400w','Maya Ross','W400',21,82,92,93,84,13,51.32]],
 JAMAICA:[['jmp200m','Romaine Grant','M200',20,84,94,93,85,11,20.24],['jmp200w','Alicia Reid','W200',20,84,95,94,86,10,22.72],['jmp400m','Trevon Blake','M400',21,82,93,92,84,13,45.10],['jmp400w','Shari Lewis','W400',20,83,94,93,85,12,51.02]],
 GERMANY:[['dep200m','Jonas Keller','M200',21,77,87,90,80,12,20.72],['dep200w','Mia Braun','W200',20,77,88,91,80,11,23.18],['dep400m','Leon Hartmann','M400',22,82,91,92,83,14,45.36],['dep400w','Nele Fischer','W400',21,81,91,92,82,13,51.38]]
};
function seedToAthlete(x,managed=null){
 return {id:x[0],name:x[1],nation:x[2],disc:x[3],age:x[4],overall:x[5],potential:x[6],fitness:x[7],form:x[8],fatigue:x[9],pb:x[10],tier:x[11],points:0,injury:0,medals:{g:0,s:0,b:0},training:'Balanced',inSquad:managed===x[2]?false:true,source:(typeof NATIONS!=='undefined'&&NATIONS[x[2]])?'Established':'World',profileResults:[]};
}
function poolToAthlete(x,nation){return {id:x[0],name:x[1],nation,disc:x[2],age:x[3],overall:x[4],potential:x[5],fitness:x[6],form:x[7],fatigue:x[8],pb:x[9],tier:'National Pool',points:0,injury:0,medals:{g:0,s:0,b:0},training:'Balanced',inSquad:false,source:'National Pool',profileResults:[]}}

const _sprintBaseMakeAthletes=makeAthletes;
makeAthletes=function(){
 const rows=_sprintBaseMakeAthletes(),ids=new Set(rows.map(a=>a.id));
 for(const x of SPRINT_SEEDS)if(!ids.has(x[0]))rows.push(seedToAthlete(x,null));
 return rows;
};
const _sprintBaseMakeInitialPool=makeInitialPool;
makeInitialPool=function(nation){
 const rows=_sprintBaseMakeInitialPool(nation),ids=new Set(rows.map(a=>a.id));
 for(const x of (SPRINT_POOL[nation]||[]))if(!ids.has(x[0]))rows.push(poolToAthlete(x,nation));
 return rows;
};

const _sprintBaseMakeEvents=makeEvents;
makeEvents=function(cycleYear,nation='GREAT BRITAIN',cycleNumber=1){
 const rows=_sprintBaseMakeEvents(cycleYear,nation,cycleNumber);
 rows.forEach(e=>{e.disc=sprintEventDisciplines(e.id,e.disc)});
 return rows;
};


/* New sprint events rotate international fields so the wider world earns real
   season marks instead of the same small group appearing at every meeting. */
const _sprintBaseBuildEventField=buildEventField;
buildEventField=function(e,d){
 const distance=DISCIPLINES[d]?.distance||100;
 if(!isSprintDiscipline(d)||distance===100||!e||e.id==='worldcup'||e.id==='olympics'||e.level==='National')return _sprintBaseBuildEventField(e,d);
 const mn=managedNation(),ownIds=new Set(e.entries?.[d]||[]),own=s.athletes.filter(a=>!a.retired&&a.disc===d&&a.nation===mn&&a.injury===0&&!activityBusy(a,e.week)&&a.inSquad!==false&&ownIds.has(a.id));
 const target=Math.max(6,9-own.length),world=s.athletes.filter(a=>!a.retired&&a.disc===d&&a.nation!==mn&&a.injury===0&&!activityBusy(a,e.week)).sort((a,b)=>performanceScore(b)-performanceScore(a)||String(a.id).localeCompare(String(b.id)));
 const picked=[],nationCount={};
 const add=a=>{if(!a||picked.includes(a)||(nationCount[a.nation]||0)>=2)return false;picked.push(a);nationCount[a.nation]=(nationCount[a.nation]||0)+1;return true};
 const protectedCount=Math.min(5,target,world.length);world.slice(0,protectedCount).forEach(add);
 const rotation=world.slice(protectedCount),seed=rotation.length?hashString(`${s.game.season}|${e.id}|${d}|sprint-field`)%rotation.length:0;
 for(let i=0;i<rotation.length&&picked.length<target;i++)add(rotation[(seed+i)%rotation.length]);
 for(const a of world){if(picked.length>=target)break;add(a)}
 return [...own,...picked];
};

function sprintProspectPB(d,overall){
 const n=DISCIPLINES[d]?.distance||100,female=String(d).startsWith('W');
 if(n===200)return (female?22.55:20.20)+(90-overall)*(female?.085:.075);
 if(n===400)return (female?50.50:44.65)+(90-overall)*(female?.18:.16);
 return (female?11.1:10.1)+(90-overall)*.035;
}
const _sprintBaseNewProspect=newProspect;
newProspect=function(nation,focus='All',level=1){
 const a=_sprintBaseNewProspect(nation,focus,level);
 if(isSprintDiscipline(a.disc)&&DISCIPLINES[a.disc]?.distance>100){a.pb=+sprintProspectPB(a.disc,a.overall).toFixed(2)}
 return a;
};

/* Sprint programme identity now recognises all three sprint distances. */
identityDisciplineStrength=function(n,d){const st=nationalIdentityState(n);return isSprintDiscipline(d)?st.sprint:st.field};
identityDisciplineChoice=function(n){
 const st=n===managedNation()?nationalIdentityState(n):(typeof rivalProgramme==='function'?rivalProgramme(n):nationalIdentityState(n));
 const weights=Object.keys(DISCIPLINES).map(d=>[d,Math.max(15,isSprintDiscipline(d)?st.sprint:st.field)]),total=weights.reduce((t,[,w])=>t+w,0);let roll=Math.random()*total;
 for(const [d,w] of weights){roll-=w;if(roll<=0)return d}return weights[0][0]
};

/* Distance-aware competitive performance model. 100m retains the existing formula. */
const _sprintBaseRawPerformance=rawPerformance;
rawPerformance=function(a,d,staffBonus=0){
 const q=DISCIPLINES[d],distance=q?.distance||100;if(q?.type!=='time'||distance===100)return _sprintBaseRawPerformance(a,d,staffBonus);
 const cond=(a.form*.42+a.fitness*.30+(100-a.fatigue)*.28+(athleteMorale(a)-65)*.1);
 let perf;
 if(distance===200)perf=a.pb+rand(-.07,.23)+(82-cond)*.006+(88-a.overall)*.0025-staffBonus*.014+rand(-.055,.075);
 else perf=a.pb+rand(-.12,.48)+(82-cond)*.014+(88-a.overall)*.005-staffBonus*.024+rand(-.11,.15);
 return +Math.max(0,perf).toFixed(2);
};

/* 400m isn't wind-assisted in the same way as 100/200m. */
const _sprintBaseConditions=performanceConditions;
performanceConditions=function(e,d){
 if(DISCIPLINES[d]?.distance!==400)return _sprintBaseConditions(e,d);
 const seed=hashString(`${s.game.season}|${e.id}|${e.week}|${d}|400conditions`),options=[
  ['Mild conditions','Comfortable conditions gave the one-lap field a neutral platform.',0,'neutral'],
  ['Cool evening','The cooler air slightly favoured controlled pacing over an aggressive opening.',.02,'neutral'],
  ['Warm conditions','Warm conditions made the final 100 metres slightly more demanding.',.05,'negative'],
  ['Still conditions','There was little environmental influence on the one-lap race.',0,'neutral'],
  ['Light breeze','A light breeze was present around the circuit but offered no legal wind adjustment.',.02,'neutral']
 ];const x=options[seed%options.length];return {label:x[0],detail:x[1],effect:x[2],tone:x[3]};
};

const _sprintBaseAthleticsFormat=athleticsFormat;
athleticsFormat=function(e,d,fieldSize=null){
 const distance=DISCIPLINES[d]?.distance||100;if(!isSprintDiscipline(d)||distance===100)return _sprintBaseAthleticsFormat(e,d,fieldSize);
 const n=fieldSize??(()=>{try{return buildEventField(e,d).length}catch(_){return 0}})(),heats=athleticsMajorEvent(e)&&n>8;
 const race=distance===200?'A staggered half-lap race. Athletes remain in lanes through the bend and attack the home straight.':'A full one-lap race from staggered starts. Athletes stay in lanes throughout, balancing early speed with the final 100 metres.';
 return {family:'sprint',label:heats?'HEATS → FINAL':'STRAIGHT FINAL',detail:heats?`${race} Two seeded heats advance the top three from each heat plus the next two fastest into an eight-lane final.`:`${race} One race decides the result.`,stages:heats?['Heats','Final']:['Final']};
};

/* Gavin Potts gets distance-specific calls instead of reusing the 100m script. */
const _sprintBaseBroadcastSprintLines=broadcastSprintLines;
broadcastSprintLines=function(d,r,e,key){
 const distance=DISCIPLINES[d]?.distance||100;if(distance===100)return _sprintBaseBroadcastSprintLines(d,r,e,key);
 const rows=broadcastVisibleRows(d,r,e),winner=rows[0],second=rows[1],own=rows.filter(x=>(e.entries?.[d]||[]).includes(x.id)&&x.nation===managedNation()),watch=own[0]||winner,lane=x=>x?.lane?` in lane ${x.lane}`:'',close=second&&Math.abs(winner.perf-second.perf)<=sprintCloseMargin(d);
 if(distance===200)return [
  `ON YOUR MARKS\nGavin Potts — The stagger makes this look deceptive from here. They settle into the blocks for half a lap, one bend and one home straight.`,
  `SET… GO!\nGavin Potts — Away they go. ${watch?`${watch.name}${lane(watch)} attacks the opening curve`:'The field drives into the bend'}, and the first job is to stay relaxed while building speed.`,
  `50 METRES\nGavin Potts — Still on the bend. ${winner&&winner.id!==watch?.id?`${winner.name} is moving very smoothly through the stagger.`:`${watch?.name||'The field'} is beginning to unwind into full speed.`}`,
  `100 METRES\nGavin Potts — Halfway and the stagger is beginning to unwind. ${winner&&second?`${winner.name} and ${second.name} are emerging as the strongest pair.`:'Now we can start to see the real shape of the race.'}`,
  `150 METRES\nGavin Potts — Into the straight. ${winner&&second?(close?`${winner.name} and ${second.name} are almost together — fifty metres to settle it.`:`${winner.name} has the advantage, but the last fifty can change a 200 quickly.`):'The bend is behind them and it is pure speed to the line now.'}`,
  `200 METRES • THE LINE\nGavin Potts — ${winner&&second?(close?`Very close at the line between ${winner.name} and ${second.name}. We wait for the official clock.`:`${winner.name} gets there first and drives right through the finish.`):`${winner?.name||'The field'} reaches the line.`}`
 ];
 return [
  `ON YOUR MARKS\nGavin Potts — One full lap. The stagger hides the true order early, and anyone who spends too much in the first half will pay for it late.`,
  `SET… GO!\nGavin Potts — The gun goes. ${watch?`${watch.name}${lane(watch)} is away cleanly`:'A clean start around the track'}. They have to be assertive without turning the opening 100 into a sprint they cannot finish.`,
  `100 METRES\nGavin Potts — Through the first bend. The stagger still makes the order difficult to read, but ${winner?.name||'the leaders'} looks controlled at this stage.`,
  `200 METRES\nGavin Potts — Halfway down the back straight. ${winner&&second?`${winner.name} and ${second.name} are beginning to establish themselves, but the decisive work is still ahead.`:'The field is settling into the hard middle section of the lap.'}`,
  `300 METRES\nGavin Potts — Final bend. This is where the 400 starts asking serious questions. ${winner&&second?(close?`${winner.name} and ${second.name} are almost level as they turn for home.`:`${winner.name} has a small advantage, but everyone is beginning to feel the race now.`):'The field is fighting to keep form under fatigue.'}`,
  `350 METRES\nGavin Potts — Fifty to go. ${winner&&second?(close?`Nothing safe here — ${winner.name} and ${second.name} are both tying up and still driving.`:`${winner.name} is holding the lead. ${second.name} has one last chance to close.`):`${winner?.name||'The leader'} is trying to keep the stride together.`}`,
  `400 METRES • THE LINE\nGavin Potts — ${winner&&second?(close?`${winner.name} and ${second.name} hit the line close together after a brutal last straight.`:`${winner.name} reaches the line first. That final hundred decided it.`):`${winner?.name||'The field'} finishes the lap.`}`
 ];
};

function ensureSprintEventRecords(){
 s.records??={world:{},national:{}};s.records.world??={};s.records.national??={};
 for(const [d,value] of Object.entries(SPRINT_WORLD_RECORDS))if(!s.records.world[d])s.records.world[d]={value,holder:'World Record',nation:'WORLD',season:'Pre-career'};
 for(const nation of Object.keys(COUNTRIES)){
  s.records.national[nation]??={};
  for(const d of Object.keys(SPRINT_DISCIPLINES))if(!s.records.national[nation][d]){
   const xs=s.athletes.filter(a=>!a.retired&&a.nation===nation&&a.disc===d&&Number.isFinite(a.pb)).map(a=>a.pb);if(!xs.length)continue;
   const best=Math.min(...xs),buffer=(DISCIPLINES[d].distance===400?.18:.08);s.records.national[nation][d]={value:+Math.max(.01,best-buffer).toFixed(2),holder:'Historic benchmark',season:'Pre-career'};
  }
 }
}
function ensureSprintExpansionEvents(){
 for(const e of s.events||[]){if(e.completed)continue;e.disc=sprintEventDisciplines(e.id,e.disc);e.entries??={};e.results??={}}
}
function ensureSprintExpansionAthletes(){
 const ids=new Set((s.athletes||[]).map(a=>a.id));
 for(const x of SPRINT_SEEDS)if(!ids.has(x[0])){const a=seedToAthlete(x,s.managedNation);ensureAthleteVisualIdentity(a);s.athletes.push(a);ids.add(a.id)}
 const ownIds=new Set((s.athletes||[]).filter(a=>a.nation===s.managedNation).map(a=>a.id));
 for(const x of (SPRINT_POOL[s.managedNation]||[]))if(!ownIds.has(x[0])){const a=poolToAthlete(x,s.managedNation);ensureAthleteVisualIdentity(a);s.athletes.push(a);ownIds.add(a.id)}
}
function migrateSprintExpansion(){
 if(!s)return;ensureSprintExpansionAthletes();ensureSprintExpansionEvents();ensureSprintEventRecords();s.seasonLeads??={};s.sprintExpansionVersion=SPRINT_EXPANSION_VERSION;
 if(typeof qualificationRoadState==='function'){qualificationRoadState();if(typeof ensureQualificationLocks==='function')ensureQualificationLocks()}
 save();render();
}

/* Ensure a new save created after this script loads is expanded immediately too. */
const _sprintBaseFresh=fresh;
fresh=function(nation='GREAT BRITAIN'){
 const st=_sprintBaseFresh(nation),old=s;s=st;try{ensureSprintExpansionAthletes();ensureSprintExpansionEvents();ensureSprintEventRecords();st.sprintExpansionVersion=SPRINT_EXPANSION_VERSION}finally{s=old}return st;
};

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Event Expansion I — Sprinting')){
 UPDATES.unshift({date:'8 September 2026',title:'Event Expansion I — Sprinting',items:[
  'Added the men’s and women’s 200m and 400m as full disciplines, expanding Athletics Manager from six events to ten without changing the existing 100m, High Jump or Shot Put systems.',
  'New sprint specialists and national-pool athletes have been added across the playable nations and wider world. Existing careers migrate automatically, while future scouting can discover genuine 200m and 400m prospects.',
  'The new events are integrated into selection, rankings, national records, World Cup and Olympic qualification, major championships, Summit Series, training, injuries, rival programmes and the long-term athletics world.',
  '200m and 400m use distance-specific performance behaviour and Gavin Potts commentary: the 200m follows the bend into the home straight, while the 400m models a full-lap race where fatigue and the final 100 metres matter much more.',
  'Event Day supports the new sprint races through the Football Manager-style 2D presentation and live scoreboard, including staggered lane racing and distance-aware live progress.'
 ]});
}

migrateSprintExpansion();
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Event Expansion I — Sprinting ===== */
