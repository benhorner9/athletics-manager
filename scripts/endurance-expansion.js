/* ===== Update #11: Event Expansion II — Endurance ===== */
(function(){
'use strict';

const ENDURANCE_EXPANSION_VERSION=1;
const ENDURANCE_DISCIPLINES={
  M800:{label:"Men's 800m",type:'time',unit:'s',distance:800,family:'endurance'},
  W800:{label:"Women's 800m",type:'time',unit:'s',distance:800,family:'endurance'},
  M1500:{label:"Men's 1500m",type:'time',unit:'s',distance:1500,family:'endurance'},
  W1500:{label:"Women's 1500m",type:'time',unit:'s',distance:1500,family:'endurance'},
  M5000:{label:"Men's 5000m",type:'time',unit:'s',distance:5000,family:'endurance'},
  W5000:{label:"Women's 5000m",type:'time',unit:'s',distance:5000,family:'endurance'},
  M10000:{label:"Men's 10,000m",type:'time',unit:'s',distance:10000,family:'endurance'},
  W10000:{label:"Women's 10,000m",type:'time',unit:'s',distance:10000,family:'endurance'}
};
const ENDURANCE_WORLD_RECORDS={
  M800:100.91,W800:113.28,
  M1500:206.00,W1500:228.68,
  M5000:755.36,W5000:838.06,
  M10000:1571.00,W10000:1734.14
};
const ALL_ENDURANCE=Object.keys(ENDURANCE_DISCIPLINES);
const ENDURANCE_MAJOR=['euro','nationals','worldcup','development','olympics'];
const ENDURANCE_CIRCUIT=['spring','diamond'];
const ENDURANCE_COUNTRIES={
  KENYA:{name:'Kenya',flag:'🇰🇪'},
  ETHIOPIA:{name:'Ethiopia',flag:'🇪🇹'},
  UGANDA:{name:'Uganda',flag:'🇺🇬'}
};

Object.assign(DISCIPLINES,ENDURANCE_DISCIPLINES);
Object.assign(WORLD_RECORDS,ENDURANCE_WORLD_RECORDS);
Object.assign(WORLD_COUNTRIES,ENDURANCE_COUNTRIES);
Object.assign(COUNTRIES,ENDURANCE_COUNTRIES);
for(const [k,v] of Object.entries(ENDURANCE_COUNTRIES))FLAGS[k]=v.flag;

function isEnduranceDiscipline(d){return Object.hasOwn(ENDURANCE_DISCIPLINES,String(d||''))}
function enduranceDistance(d){return ENDURANCE_DISCIPLINES[d]?.distance||0}
function enduranceCloseMargin(d){const n=enduranceDistance(d);return n>=10000?10:n>=5000?5:n>=1500?1.5:.8}
function enduranceTime(v){
  const value=Math.max(0,Number(v)||0),mins=Math.floor(value/60),secs=(value-mins*60).toFixed(2).padStart(5,'0');
  return `${mins}:${secs}`;
}

const _enduranceBaseFmtPerf=fmtPerf;
fmtPerf=function(d,v){return isEnduranceDiscipline(d)?enduranceTime(v):_enduranceBaseFmtPerf(d,v)};

if(typeof SELECTION_STANDARDS!=='undefined')Object.assign(SELECTION_STANDARDS,{
  M800:{National:106.50,International:104.80,World:103.50,Olympic:102.80},
  W800:{National:122.50,International:120.50,World:119.00,Olympic:117.80},
  M1500:{National:220.00,International:216.50,World:214.00,Olympic:212.50},
  W1500:{National:247.00,International:243.00,World:240.00,Olympic:237.00},
  M5000:{National:825.00,International:810.00,World:795.00,Olympic:786.00},
  W5000:{National:930.00,International:915.00,World:900.00,Olympic:888.00},
  M10000:{National:1725.00,International:1690.00,World:1660.00,Olympic:1645.00},
  W10000:{National:1950.00,International:1910.00,World:1880.00,Olympic:1850.00}
});
if(typeof QUALIFICATION_TARGETS!=='undefined'){
  Object.assign(QUALIFICATION_TARGETS.worldcup.standards,{
    M800:103.50,W800:119.00,M1500:214.00,W1500:240.00,
    M5000:795.00,W5000:900.00,M10000:1660.00,W10000:1880.00
  });
  Object.assign(QUALIFICATION_TARGETS.olympics.standards,{
    M800:102.80,W800:117.80,M1500:212.50,W1500:237.00,
    M5000:786.00,W5000:888.00,M10000:1645.00,W10000:1850.00
  });
}

/* Add endurance without changing the Week 4 sprint-only opening story. */
function enduranceEventDisciplines(id,current=[]){
  const set=new Set(current||[]);
  if(id==='spring'){['M800','W800','M1500','W1500'].forEach(d=>set.add(d))}
  if(id==='diamond'){['M800','W800','M1500','W1500','M5000','W5000'].forEach(d=>set.add(d))}
  if(ENDURANCE_MAJOR.includes(id))ALL_ENDURANCE.forEach(d=>set.add(d));
  return [...set];
}
for(const e of EVENTS_TEMPLATE)e.disc=enduranceEventDisciplines(e.id,e.disc);

const ENDURANCE_NAMES={
  'GREAT BRITAIN':['Oliver Grant','Callum Price','Ben Carter','Jacob Mills','Sophie Allen','Hannah Clarke','Imogen Ward','Freya Morgan'],
  USA:['Mason Brooks','Jordan Hayes','Caleb Foster','Luke Bennett','Tessa Reed','Maya Collins','Lauren Price','Zoe Turner'],
  JAMAICA:['Andre Lewis','Malik Grant','Dario Campbell','Rohan Blake','Tiana Foster','Alicia Brown','Shari Reid','Kiara Morgan'],
  GERMANY:['Jonas Keller','Leon Hartmann','Felix Braun','Moritz Vogel','Nele Fischer','Mia Werner','Lena Hoffmann','Sophie Kruger'],
  CANADA:['Evan Fraser','Julien Tremblay','Noah Sinclair','Liam Reid','Camille Roy','Naomi Bouchard','Sophie Gagnon','Avery Clarke'],
  FRANCE:['Hugo Martin','Theo Laurent','Mathis Bernard','Lucas Girard','Clara Moreau','Ines Dubois','Juliette Petit','Manon Lefevre'],
  ITALY:['Matteo Romano','Lorenzo Conti','Marco Rizzo','Davide Ferrari','Giulia Bianchi','Chiara Rossi','Martina Ricci','Elena De Luca'],
  AUSTRALIA:['Jack Walsh','Lachlan Reid','Noah Mitchell','Ethan Cooper','Sienna Evans','Tahlia Clarke','Ruby Bennett','Mia Fraser'],
  JAPAN:['Haruto Sato','Kaito Mori','Yuto Watanabe','Ren Takahashi','Mei Kobayashi','Rin Ishikawa','Aoi Nakamura','Yui Tanaka'],
  NETHERLANDS:['Daan de Boer','Milan Smit','Jesse Visser','Bram van Dijk','Noor Bakker','Fleur de Vries','Sanne Vos','Lotte Meijer'],
  POLAND:['Jakub Nowak','Mateusz Zielinski','Mikolaj Kowalski','Kacper Wozniak','Julia Wojcik','Oliwia Mazur','Zofia Lewandowska','Maja Kaminska'],
  SOUTH_AFRICA:['Thabo Mokoena','Lethabo Nkosi','Sibusiso Dlamini','Kagiso Khumalo','Ayanda Ndlovu','Thandi Maseko','Zanele Mthembu','Naledi Molefe'],
  KENYA:['Kibet Cheruiyot','Daniel Kiptoo','Samuel Kiplagat','Brian Koech','Akinyi Chebet','Mercy Jepkirui','Sheila Wanjiru','Naomi Kipkemoi'],
  ETHIOPIA:['Bekele Tadesse','Dawit Gebre','Hagos Tesfaye','Mulugeta Alemu','Selamawit Bekele','Hana Tadesse','Mekdes Abebe','Rahel Gebre'],
  UGANDA:['Isaac Kato','Moses Okello','Daniel Ouma','Brian Ssempala','Sarah Namusoke','Esther Auma','Grace Akello','Ruth Nanyonga']
};
const ENDURANCE_STRENGTH={
  'GREAT BRITAIN':[88,88,84,82,87,88,84,82],
  USA:[89,87,86,84,89,87,86,84],
  JAMAICA:[82,75,70,68,82,75,70,68],
  GERMANY:[84,84,83,82,84,84,83,82],
  CANADA:[86,85,84,82,86,85,84,82],
  FRANCE:[88,87,86,84,87,87,86,84],
  ITALY:[86,86,85,84,85,86,85,84],
  AUSTRALIA:[89,88,87,85,89,88,87,85],
  JAPAN:[83,84,86,88,82,84,86,88],
  NETHERLANDS:[92,88,84,82,93,89,85,83],
  POLAND:[87,84,83,82,88,85,84,83],
  SOUTH_AFRICA:[87,85,85,84,86,85,85,84],
  KENYA:[97,96,95,94,96,96,95,94],
  ETHIOPIA:[90,95,98,98,89,95,98,98],
  UGANDA:[88,93,97,97,87,92,96,96]
};
const ENDURANCE_DISC_ORDER=['M800','M1500','M5000','M10000','W800','W1500','W5000','W10000'];
const ENDURANCE_STYLE=['Front Runner','Kicker','Even Pacer','Strength Runner'];

function endurancePBFor(d,overall){
  const female=String(d).startsWith('W'),n=enduranceDistance(d);
  let base,slope;
  if(n===800){base=female?119.00:103.20;slope=female?.37:.30}
  else if(n===1500){base=female?241.00:214.00;slope=female?1.05:.80}
  else if(n===5000){base=female?905.00:800.00;slope=female?4.0:3.3}
  else {base=female?1900.00:1670.00;slope=female?8.0:7.0}
  const raw=base+(90-overall)*slope,wr=ENDURANCE_WORLD_RECORDS[d],margin=n===800?.30:n===1500?.75:n===5000?3:6;
  return +Math.max(wr+margin,raw).toFixed(2);
}
function enduranceSeedAthlete(nation,d,name,overall,id,managed=null){
  const female=d.startsWith('W'),n=enduranceDistance(d),noise=((hashString(`${id}|pb`)%101)-50)/100;
  const noiseScale=n===800?.5:n===1500?1.3:n===5000?4.5:9;
  const floor=ENDURANCE_WORLD_RECORDS[d]+(n===800?.08:n===1500?.20:n===5000?.80:1.50);
  const pb=+Math.max(floor,endurancePBFor(d,overall)+noise*noiseScale).toFixed(2);
  return {
    id,name,nation,disc:d,age:21+(hashString(`${id}|age`)%9),overall,
    potential:clamp(overall+(hashString(`${id}|pot`)%5),overall,99),
    fitness:88+(hashString(`${id}|fit`)%11),form:78+(hashString(`${id}|form`)%16),
    fatigue:8+(hashString(`${id}|fat`)%24),pb,tier:overall>=92?'Elite':overall>=82?'International':'Developing',
    points:0,injury:0,medals:{g:0,s:0,b:0},training:'Balanced',
    inSquad:managed===nation?false:true,source:NATIONS[nation]?'Established':'World',
    profileResults:[],raceStyle:ENDURANCE_STYLE[hashString(`${id}|style`)%ENDURANCE_STYLE.length]
  };
}
function enduranceEstablishedRows(managed=null){
  const out=[];
  for(const [nation,names] of Object.entries(ENDURANCE_NAMES)){
    const ratings=ENDURANCE_STRENGTH[nation]||Array(8).fill(82);
    ENDURANCE_DISC_ORDER.forEach((d,i)=>{
      const id=`end-${nation.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)}-${d.toLowerCase()}`;
      out.push(enduranceSeedAthlete(nation,d,names[i],ratings[i],id,managed));
    });
  }
  return out;
}
const ENDURANCE_POOL_NAMES={
  'GREAT BRITAIN':['Archie Wells','Theo Burns','Max Harper','Owen Foster','Evie Shaw','Molly Webb','Isla Turner','Amelia Wood'],
  USA:['Cameron Davis','Jayden Scott','Logan Price','Eli Morgan','Aaliyah Hayes','Maya Carter','Avery Reed','Sofia Brooks'],
  JAMAICA:['Romaine Grant','Trevon Foster','Kemar Lewis','Dwayne Reid','Alicia Blake','Tia Campbell','Shanice Brown','Renee Morgan'],
  GERMANY:['Finn Becker','Lukas Wolf','Noah Hartmann','Elias Koch','Lea Braun','Emma Fischer','Mila Keller','Lina Vogel']
};
function endurancePoolRows(nation){
  const names=ENDURANCE_POOL_NAMES[nation]||ENDURANCE_POOL_NAMES['GREAT BRITAIN'],base=nation==='USA'?78:nation==='JAMAICA'?69:nation==='GERMANY'?74:72;
  return ENDURANCE_DISC_ORDER.map((d,i)=>{
    const overall=clamp(base+(i%4===0?2:0)+(hashString(`${nation}|${d}|pool`)%5),66,84);
    return {
      id:`endpool-${nation.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,4)}-${d.toLowerCase()}`,
      name:names[i],nation,disc:d,age:18+(hashString(`${nation}|${d}|poolage`)%5),overall,
      potential:clamp(overall+10+(hashString(`${nation}|${d}|poolpot`)%10),overall,95),
      fitness:84+(hashString(`${nation}|${d}|poolfit`)%10),form:72+(hashString(`${nation}|${d}|poolform`)%12),
      fatigue:5+(hashString(`${nation}|${d}|poolfat`)%13),pb:endurancePBFor(d,overall),
      tier:'National Pool',points:0,injury:0,medals:{g:0,s:0,b:0},training:'Balanced',
      inSquad:false,source:'National Pool',profileResults:[],
      raceStyle:ENDURANCE_STYLE[hashString(`${nation}|${d}|poolstyle`)%ENDURANCE_STYLE.length]
    };
  });
}

const _enduranceBaseMakeAthletes=makeAthletes;
makeAthletes=function(){
  const rows=_enduranceBaseMakeAthletes(),ids=new Set(rows.map(a=>a.id));
  for(const a of enduranceEstablishedRows(null))if(!ids.has(a.id)){rows.push(a);ids.add(a.id)}
  return rows;
};
const _enduranceBaseMakeInitialPool=makeInitialPool;
makeInitialPool=function(nation){
  const rows=_enduranceBaseMakeInitialPool(nation),ids=new Set(rows.map(a=>a.id));
  for(const a of endurancePoolRows(nation))if(!ids.has(a.id)){rows.push(a);ids.add(a.id)}
  return rows;
};
const _enduranceBaseMakeEvents=makeEvents;
makeEvents=function(cycleYear,nation='GREAT BRITAIN',cycleNumber=1){
  const rows=_enduranceBaseMakeEvents(cycleYear,nation,cycleNumber);
  rows.forEach(e=>e.disc=enduranceEventDisciplines(e.id,e.disc));
  return rows;
};

/* Scouting and long-save regeneration receive distance-correct PBs and a race identity. */
const _enduranceBaseNewProspect=newProspect;
newProspect=function(nation,focus='All',level=1){
  const a=_enduranceBaseNewProspect(nation,focus,level);
  if(isEnduranceDiscipline(a.disc)){
    a.pb=endurancePBFor(a.disc,a.overall);
    a.raceStyle??=ENDURANCE_STYLE[hashString(`${a.id}|endurance-style`)%ENDURANCE_STYLE.length];
  }
  return a;
};

/* A dedicated coach is added without introducing a fourth facility tree. Endurance preparation
   leans on the coach, sports science and the existing recovery suite. */
STAFF_DEF.endurance={name:'Endurance Coach',desc:'Improves aerobic development, pacing, race judgement and championship readiness from 800m to 10,000m.'};
const _enduranceBaseAthleteFacility=athleteFacility;
athleteFacility=function(a){return isEnduranceDiscipline(a?.disc)?facilityLevel('recovery'):_enduranceBaseAthleteFacility(a)};

const _enduranceBaseRawPerformance=rawPerformance;
rawPerformance=function(a,d,staffBonus=0){
  if(!isEnduranceDiscipline(d))return _enduranceBaseRawPerformance(a,d,staffBonus);
  const n=enduranceDistance(d),cond=(a.form*.38+a.fitness*.34+(100-a.fatigue)*.28+(athleteMorale(a)-65)*.09);
  let support=0;
  if(a.nation===managedNation()&&a.inSquad!==false){
    support=((s.staff?.endurance||1)-1)*.55+((s.staff?.science||1)-1)*.18+(facilityLevel('recovery')-1)*.22;
  }else if(typeof rivalProgrammeSupport==='function'&&a.nation!==managedNation()){
    support=(rivalProgrammeSupport(a.nation,d)-2.5)*.38;
  }
  const cfg=n===800?{j:[-.35,1.65],c:.040,o:.020,st:.20}:n===1500?{j:[-.85,3.8],c:.095,o:.045,st:.42}:n===5000?{j:[-2.5,11.0],c:.30,o:.15,st:1.35}:{j:[-5.0,22.0],c:.66,o:.32,st:2.8};
  const style=a.raceStyle||'Even Pacer',styleEffect=style==='Even Pacer'?-cfg.st*.06:style==='Kicker'?cfg.st*.03:style==='Front Runner'?cfg.st*.05:0;
  const perf=a.pb+rand(cfg.j[0],cfg.j[1])+(82-cond)*cfg.c+(88-a.overall)*cfg.o-support*cfg.st+styleEffect;
  return +Math.max(0,perf).toFixed(2);
};

const _enduranceBaseConditions=performanceConditions;
performanceConditions=function(e,d){
  if(!isEnduranceDiscipline(d))return _enduranceBaseConditions(e,d);
  const n=enduranceDistance(d),scale=n===800?.12:n===1500?.28:n===5000?1.1:2.2;
  const seed=hashString(`${s.game.season}|${e?.id}|${e?.week}|${d}|endurance-conditions`),opts=[
    ['Cool and still','Cool air and still conditions favour controlled distance running.',-.18,'positive'],
    ['Mild evening','Comfortable temperatures give the field a neutral platform.',0,'neutral'],
    ['Warm conditions','The warmer conditions will make sustained pace more expensive late in the race.',.45,'negative'],
    ['Light breeze','A light breeze around the circuit may punish anyone left doing too much work at the front.',.18,'neutral'],
    ['Heavy air','The air feels heavy and the longer the race goes, the more patience will matter.',.32,'negative']
  ],x=opts[seed%opts.length];
  return {label:x[0],detail:x[1],effect:+(x[2]*scale).toFixed(2),tone:x[3]};
};
const _enduranceBasePressure=performancePressure;
performancePressure=function(a,e,d){
  const p=_enduranceBasePressure(a,e,d);
  if(!isEnduranceDiscipline(d))return p;
  const scale=Math.max(1,enduranceDistance(d)/500);
  return {...p,effect:+(p.effect*scale).toFixed(2)};
};

const _enduranceBaseAthleticsFamily=athleticsFamily;
athleticsFamily=function(d){return isEnduranceDiscipline(d)?'endurance':_enduranceBaseAthleticsFamily(d)};
const _enduranceBaseAthleticsFormat=athleticsFormat;
athleticsFormat=function(e,d,fieldSize=null){
  if(!isEnduranceDiscipline(d))return _enduranceBaseAthleticsFormat(e,d,fieldSize);
  const n=fieldSize??(()=>{try{return buildEventField(e,d).length}catch(_){return 0}})(),distance=enduranceDistance(d);
  const heats=athleticsMajorEvent(e)&&distance<=1500&&n>8;
  const start=distance===800?'Staggered start for the opening bend before the field breaks to the rail.':'Pack start with athletes free to establish position before settling into race rhythm.';
  return {
    family:'endurance',label:heats?'HEATS → FINAL':'PACK-RACE FINAL',
    detail:heats?`${start} Two seeded heats advance the top three from each race plus the next two fastest into an eight-athlete final.`:`${start} Position, pace judgement and the final move matter as much as raw speed.`,
    stages:heats?['Heats','Final']:['Final']
  };
};

function enduranceHeatJitter(d,key){
  const n=enduranceDistance(d),scale=n===800?1.2:3.0;
  return Math.abs(engineRoundJitter(key,scale));
}
function enduranceCheckpoints(d){
  const n=enduranceDistance(d);
  if(n===800)return [0,200,400,600,700,800];
  if(n===1500)return [0,300,700,1100,1300,1500];
  if(n===5000)return [0,1000,2500,4000,4600,5000];
  return [0,2000,5000,8000,9400,10000];
}
function enduranceCheckpointOrder(d,rows,metres,e){
  const distance=enduranceDistance(d),progress=distance?metres/distance:0;
  return [...rows].sort((a,b)=>{
    const aa=s.athletes.find(x=>x.id===a.id),bb=s.athletes.find(x=>x.id===b.id);
    const styleScore=x=>{
      const athlete=s.athletes.find(a=>a.id===x.id),style=athlete?.raceStyle||'Even Pacer';
      let bonus=0;
      if(style==='Front Runner')bonus=(1-progress)*2.4-progress*.4;
      else if(style==='Kicker')bonus=progress*2.6-(1-progress)*1.1;
      else if(style==='Strength Runner')bonus=progress>0.45?1.1:.2;
      else bonus=.45;
      const finalRank=rows.findIndex(r=>r.id===x.id);
      const jitter=((hashString(`${e.id}|${d}|${x.id}|${metres}`)%201)-100)/100*.75;
      return -finalRank*1.6+bonus+jitter;
    };
    return styleScore(b)-styleScore(a)||a.perf-b.perf||String(aa?.name||a.name).localeCompare(String(bb?.name||b.name));
  });
}
function engineEndurance(e,d,base){
  const format=athleticsFormat(e,d,base.length),meta={version:1,family:'endurance',format:format.label,detail:format.detail,stages:[],extraMarks:[],generatedAt:{season:s.game.season,week:s.game.week}},distance=enduranceDistance(d);
  let finalRows=[...base],eliminated=[];
  if(format.label==='HEATS → FINAL'){
    const seeded=[...base].sort((a,b)=>a.perf-b.perf),heats=[[],[]],heatRows=[];
    seeded.forEach((r,i)=>heats[i%2].push(r));
    heats.forEach((heat,hi)=>{
      const rows=heat.map(r=>({...r,perf:applyMarkEffect(d,r.perf,enduranceHeatJitter(d,`${e.id}|${d}|${r.id}|endheat${hi}`)),heat:hi+1}));
      rows.sort((a,b)=>a.perf-b.perf);rows.forEach((r,i)=>r.heatPlace=i+1);heatRows.push(rows);
      meta.stages.push({name:`Heat ${hi+1}`,rows:rows.map(r=>({id:r.id,name:r.name,nation:r.nation,mark:r.perf,place:r.heatPlace}))});
    });
    const qualifiers=[];heatRows.forEach(rows=>qualifiers.push(...rows.slice(0,3)));
    const autoIds=new Set(qualifiers.map(r=>r.id)),next=[...heatRows.flat()].filter(r=>!autoIds.has(r.id)).sort((a,b)=>a.perf-b.perf).slice(0,2);
    qualifiers.push(...next);const qIds=new Set(qualifiers.map(r=>r.id));
    finalRows=qualifiers.map(q=>({...base.find(r=>r.id===q.id),stage:'Final'})).sort((a,b)=>a.perf-b.perf);
    eliminated=heatRows.flat().filter(r=>!qIds.has(r.id)).sort((a,b)=>a.perf-b.perf).map(r=>({...r,stage:`Heat ${r.heat}`,eliminated:true}));
    for(const r of heatRows.flat())meta.extraMarks.push({id:r.id,mark:r.perf,stage:`Heat ${r.heat}`});
    meta.advancement={automatic:6,nextFastest:2,finalists:finalRows.map(r=>r.id)};
  }else{
    finalRows.sort((a,b)=>a.perf-b.perf);
  }
  finalRows.forEach((r,i)=>r.finalPlace=i+1);
  meta.stages.push({name:'Final',rows:finalRows.map((r,i)=>({id:r.id,name:r.name,nation:r.nation,mark:r.perf,place:i+1}))});
  meta.race={distance,checkpoints:enduranceCheckpoints(d).map(m=>{
    const order=enduranceCheckpointOrder(d,finalRows,m,e);return {metres:m,order:order.map(x=>x.id),leaderId:order[0]?.id||null};
  })};
  return {rows:[...finalRows,...eliminated],meta};
}
const _enduranceBaseRunEngine=athleticsRunEngine;
athleticsRunEngine=function(e,d,base){
  if(isEnduranceDiscipline(d))return engineEndurance(e,d,base||[]);
  return _enduranceBaseRunEngine(e,d,base);
};

/* Distance commentary follows the pack and uses intermediate leaders, not the final result
   repeated at every checkpoint. */
function enduranceRows(r,e,d){return broadcastVisibleRows(d,r,e)}
function enduranceLeaderAt(e,d,rows,metres){
  const cp=e?.engine?.[d]?.race?.checkpoints?.find(x=>x.metres===metres),id=cp?.leaderId;
  return rows.find(x=>x.id===id)||rows[0]||null;
}
function endurancePackNames(e,d,rows,metres,count=3){
  const cp=e?.engine?.[d]?.race?.checkpoints?.find(x=>x.metres===metres),ids=cp?.order||rows.map(x=>x.id);
  return ids.slice(0,count).map(id=>rows.find(x=>x.id===id)).filter(Boolean);
}
function ensureEnduranceRaceMeta(e,d,rows){
  e.engine??={};
  if(e.engine[d]?.family==='endurance')return e.engine[d];
  const format=athleticsFormat(e,d,rows.length),finalRows=[...rows].filter(x=>!x.eliminated).sort((a,b)=>a.perf-b.perf),distance=enduranceDistance(d);
  e.engine[d]={version:1,family:'endurance',format:format.label,detail:format.detail,stages:[{name:'Final',rows:finalRows.map((x,i)=>({id:x.id,name:x.name,nation:x.nation,mark:x.perf,place:i+1}))}],extraMarks:[],race:{distance,checkpoints:enduranceCheckpoints(d).map(m=>{const order=enduranceCheckpointOrder(d,finalRows,m,e);return {metres:m,order:order.map(x=>x.id),leaderId:order[0]?.id||null}})},generatedAt:{season:s.game.season,week:s.game.week}};
  return e.engine[d];
}
function buildEnduranceCommentary(d,r,e){
  const rows=enduranceRows(r,e,d),winner=rows[0],second=rows[1],own=rows.filter(x=>(e.entries?.[d]||[]).includes(x.id)&&x.nation===managedNation()),distance=enduranceDistance(d),meta=ensureEnduranceRaceMeta(e,d,rows),lines=[];
  let opening;
  if(e?.kind==='olympics')opening=`Good evening from ${e.location}. Gavin Potts with you for the Olympic ${discLabel(d)}. The fitness is done now; this will come down to position, nerve and when the decisive move is made.`;
  else if(e?.kind==='championship'||e?.level==='World')opening=`Welcome to ${e.location}. Gavin Potts with you for ${e.name} and the ${discLabel(d)}. Championship distance racing rarely follows the form book in a straight line.`;
  else opening=`Welcome to ${e.location}. Gavin Potts with you for ${e.name} and the ${discLabel(d)}. The clock matters, but so does how the field chooses to get there.`;
  lines.push(`GAVIN POTTS • LIVE\n${opening}`);
  const conditions=broadcastConditions(r,e,d);if(conditions)lines.push(`EVENT CONDITIONS\nGavin Potts — ${conditions}`);
  if(meta)lines.push(`COMPETITION FORMAT\nGavin Potts — ${meta.format}. ${meta.detail}`);
  const fieldNote=broadcastFieldNotes(d,rows,e,own);if(fieldNote)lines.push(`FIELD WATCH\nGavin Potts — ${fieldNote}`);
  const context=(own[0]&&broadcastContextLine(s.athletes.find(a=>a.id===own[0].id),d))||broadcastSummitBuild(d,e);if(context)lines.push(`STORYLINE\nGavin Potts — ${context}`);
  const checkpoints=enduranceCheckpoints(d);
  meta.broadcastCues={};
  const startLine=`THE GUN\nGavin Potts — Away they go in the ${discLabel(d)}. ${distance===800?'They hold the stagger through the first bend before the break line brings them together.':'It is a clean pack start, and there is no hurry to win the first fifty metres.'}`;
  lines.push(startLine);meta.broadcastCues[startLine]={family:'endurance',metres:0,phase:'start'};
  for(const metres of checkpoints.filter(x=>x>0&&x<distance)){
    const leader=enduranceLeaderAt(e,d,rows,metres),pack=endurancePackNames(e,d,rows,metres,3),names=pack.map(x=>x.name);
    const pct=metres/distance,remaining=distance-metres;let body;
    if(pct<=.28)body=`${leader?.name||'The field'} has taken responsibility at the front. ${names.length>1?`${names.slice(1).join(' and ')} are tucked close behind.`:'The pack is still tightly grouped.'} Nobody wants to spend too much this early.`;
    else if(pct<=.58)body=`The race is beginning to take shape. ${leader?.name||'The leader'} controls the front, with ${names.slice(1).join(' and ')||'the main pack'} still within striking distance. ${remaining>1000?'There is a lot of running left.':'The tactical margin is shrinking now.'}`;
    else if(pct<.86)body=`This is the serious part of the race. ${leader?.name||'The leader'} is trying to stretch the group, and the athletes behind are being asked whether they can cover it without losing their finish.`;
    else body=`The move is on. ${leader?.name||'The leader'} has committed, ${second&&second.id!==leader?.id?`${second.name} is trying to respond, `:''}and there are only ${remaining} metres left to settle it.`;
    const line=`${metres} METRES\nGavin Potts — ${body}`;lines.push(line);meta.broadcastCues[line]={family:'endurance',metres,phase:'race'};
  }
  const finish=`${distance} METRES • THE LINE\nGavin Potts — ${winner?`${winner.name} drives through the line first in ${fmtPerf(d,winner.perf)}${second?`, with ${second.name} next in ${fmtPerf(d,second.perf)}`:''}.`:'The field reaches the finish.'}`;
  lines.push(finish);meta.broadcastCues[finish]={family:'endurance',metres:distance,phase:'finish'};
  lines.push(broadcastResultLine(d,r,e));
  if(own.length)lines.push(`YOUR SQUAD • ${nationName(managedNation())}\nGavin Potts — ${own.map(x=>`${x.name}: ${rows.indexOf(x)+1}${rows.indexOf(x)===0?'st':rows.indexOf(x)===1?'nd':rows.indexOf(x)===2?'rd':'th'}, ${fmtPerf(d,x.perf)}`).join('. ')}.`);
  return lines;
}
const _enduranceBaseBuildGavin=buildGavinCommentary;
buildGavinCommentary=function(d,r,e){return isEnduranceDiscipline(d)?buildEnduranceCommentary(d,r,e):_enduranceBaseBuildGavin(d,r,e)};

/* Close-race rivalry thresholds scale with distance. */
const _enduranceBaseRecordRivalries=recordRivalries;
recordRivalries=function(eventKey,d,results,eventName){
  if(!isEnduranceDiscipline(d))return _enduranceBaseRecordRivalries(eventKey,d,results,eventName);
  const oldIs=isSprintDiscipline,oldMargin=sprintCloseMargin;
  isSprintDiscipline=x=>isEnduranceDiscipline(x)||oldIs(x);
  sprintCloseMargin=x=>isEnduranceDiscipline(x)?enduranceCloseMargin(x):oldMargin(x);
  try{return _enduranceBaseRecordRivalries(eventKey,d,results,eventName)}
  finally{isSprintDiscipline=oldIs;sprintCloseMargin=oldMargin}
};

/* Pack-race 2D visual. Uses the race-engine checkpoint order so leaders can change. */
function enduranceCurrentMetres(e,d){
  const line=liveEventView?.event===e&&liveEventView?.disc===d?liveEventView.lines?.[liveEventView.index]:'',cue=line&&e?.engine?.[d]?.broadcastCues?.[line];
  if(Number.isFinite(cue?.metres))return cue.metres;
  const m=String(line||'').match(/(\d+)\s*METRES?/i);return m?Math.min(enduranceDistance(d),Number(m[1])):0;
}
function enduranceVisualRows(e,d){
  const rows=(liveEventView?.event===e&&liveEventView?.disc===d?liveEventView.results:e?.results?.[d])||[];
  return rows.filter(x=>!x.eliminated);
}
function enduranceOrderAt(e,d,rows,metres){
  const cps=e?.engine?.[d]?.race?.checkpoints||[],cp=[...cps].sort((a,b)=>Math.abs(a.metres-metres)-Math.abs(b.metres-metres))[0],ids=cp?.order||rows.map(x=>x.id);
  return ids.map(id=>rows.find(x=>x.id===id)).filter(Boolean).concat(rows.filter(x=>!ids.includes(x.id)));
}
function enduranceOvalPoint(progress,offset=0){
  const cx=380,cy=228,rx=236+offset,ry=124+offset*.45,angle=-Math.PI/2+Math.PI*2*progress;
  return {x:cx+Math.cos(angle)*rx,y:cy+Math.sin(angle)*ry};
}
function endurancePackVisual(e,d){
  const rows=enduranceVisualRows(e,d);if(!rows.length)return '<div class="fm2d-empty">No starters for this discipline.</div>';
  const distance=enduranceDistance(d),metres=enduranceCurrentMetres(e,d),progress=distance?metres/distance:0,order=enduranceOrderAt(e,d,rows,metres),winner=rows[0],leader=order[0],best=winner?.perf||order[0]?.perf||1,speed=distance/best;
  const spreadScale=Math.pow(Math.max(.08,progress),1.15),dots=order.map((r,i)=>{
    const gap=Math.max(0,(Number(r.perf)-Number(best))*speed)*spreadScale,liveMetres=Math.max(0,metres-gap),p=distance?liveMetres/distance:0,offset=(i%3-1)*4,pos=enduranceOvalPoint(p,offset),colour=nationDotColour(r.nation),managed=r.nation===managedNation();
    return `<g transform="translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})"><circle r="${managed?12:10}" fill="${colour}" stroke="${managed?'#fff':'#07131d'}" stroke-width="${managed?4:2}"/><text y="-15" text-anchor="middle" fill="#f5fbff" font-size="8" font-weight="900">${i+1}</text><title>${profileEscape(r.name)} • ${nationName(r.nation)}</title></g>`;
  }).join('');
  const packNames=order.slice(0,3).map(x=>profileEscape(x.name)).join(' • ');
  return `<div class="fm2d-arena refined-arena endurance-arena"><div class="fm2d-arena-head refined-head"><span>${profileEscape(discLabel(d))} • ${metres?`${metres}m`:'Start'}</span><b>${metres>=distance?'FINISH':`${metres}m / ${distance}m`}</b></div><svg viewBox="0 0 760 455" role="img" aria-label="Top-down pack race for ${profileEscape(discLabel(d))}"><rect width="760" height="455" fill="#173f31"/><ellipse cx="380" cy="228" rx="300" ry="188" fill="#82484e" stroke="#b07074" stroke-width="2"/><ellipse cx="380" cy="228" rx="214" ry="102" fill="#246044"/><ellipse cx="380" cy="228" rx="225" ry="113" fill="none" stroke="#f5eadf" stroke-opacity=".48" stroke-width="2"/><ellipse cx="380" cy="228" rx="236" ry="124" fill="none" stroke="#f5eadf" stroke-opacity=".32"/><ellipse cx="380" cy="228" rx="247" ry="135" fill="none" stroke="#f5eadf" stroke-opacity=".24"/><line x1="365" y1="93" x2="424" y2="55" stroke="#fff" stroke-width="4"/><text x="438" y="51" fill="#e7f0f4" font-size="9" font-weight="900">FINISH</text>${dots}<text x="380" y="217" text-anchor="middle" fill="#e0ece5" font-size="22" font-weight="950">${distance>=10000?'10,000':distance}m</text><text x="380" y="239" text-anchor="middle" fill="#9ebcab" font-size="9" font-weight="850">PACK RACE • LIVE ORDER</text><text x="380" y="258" text-anchor="middle" fill="#7ea18e" font-size="8">${packNames}</text></svg><div class="fm2d-caption refined-caption"><span>Positions follow the live race checkpoint; the final clock remains provisional until the line.</span><span>${leader?profileEscape(leader.name)+' leads':''}</span></div></div>`;
}
const _enduranceBaseEventVisual=eventVisualHTML;
eventVisualHTML=function(e,d){return isEnduranceDiscipline(d)?endurancePackVisual(e,d):_enduranceBaseEventVisual(e,d)};

/* Endurance focus is available in the training centre. The existing weekly engine remains
   compatible; this wrapper adds the event-specific coaching correction after its normal work. */
const _enduranceBaseProcessWeek=processWeek;
processWeek=function(){
  const focus=s.trainingFocus,before=new Map(managedTeam().filter(a=>isEnduranceDiscipline(a.disc)&&!a.camp&&a.injury===0).map(a=>[a.id,{form:a.form}]));
  _enduranceBaseProcessWeek();
  for(const [id] of before){
    const a=s.athletes.find(x=>x.id===id);if(!a||a.injury>0)continue;
    let correction=((s.staff?.endurance||1)-(s.staff?.throws||1))*.15;
    if(focus==='Endurance')correction+=.55;
    if(focus==='Speed'&&enduranceDistance(a.disc)<=1500)correction+=.15;
    if(a.training==='Recovery')correction*=.45;
    a.form=clamp(Math.round(a.form+correction),55,99);
    if(focus==='Endurance')a.fatigue=clamp(Math.round(a.fatigue+2),0,100);
  }
};
const _enduranceBaseDrawTraining=drawTraining;
drawTraining=function(){
  _enduranceBaseDrawTraining();
  const root=$('training'),grid=root?.querySelector('.focus-grid');if(!grid||grid.querySelector('[data-focus="Endurance"]'))return;
  const recovery=grid.querySelector('[data-focus="Recovery"]'),button=document.createElement('button');
  button.className=`focus-card ${s.trainingFocus==='Endurance'?'on':''}`;button.dataset.focus='Endurance';
  button.innerHTML='<strong>Endurance</strong><small>Aerobic and pace emphasis for 800m–10,000m athletes; slightly higher training load.</small>';
  if(recovery)grid.insertBefore(button,recovery);else grid.appendChild(button);
  button.onclick=()=>{s.trainingFocus='Endurance';appointmentTask('training');save();drawTraining();toast('Training focus updated')};
};

/* Existing saves migrate immediately; new careers receive the same expansion through fresh(). */
function ensureEnduranceAthletes(){
  const ids=new Set((s.athletes||[]).map(a=>a.id));
  for(const a of enduranceEstablishedRows(s.managedNation))if(!ids.has(a.id)){ensureAthleteVisualIdentity(a);s.athletes.push(a);ids.add(a.id)}
  const ownIds=new Set((s.athletes||[]).filter(a=>a.nation===s.managedNation).map(a=>a.id));
  for(const a of endurancePoolRows(s.managedNation))if(!ownIds.has(a.id)){ensureAthleteVisualIdentity(a);s.athletes.push(a);ownIds.add(a.id)}
}
function ensureEnduranceEvents(){
  for(const e of s.events||[]){if(e.completed)continue;e.disc=enduranceEventDisciplines(e.id,e.disc);e.entries??={};e.results??={}}
}
function ensureEnduranceRecords(){
  s.records??={world:{},national:{}};s.records.world??={};s.records.national??={};
  for(const [d,value] of Object.entries(ENDURANCE_WORLD_RECORDS))if(!s.records.world[d])s.records.world[d]={value,holder:'World Record',nation:'WORLD',season:'Pre-career'};
  for(const nation of Object.keys(COUNTRIES)){
    s.records.national[nation]??={};s.nationPoints??={};s.nationPoints[nation]??=0;
    for(const d of ALL_ENDURANCE)if(!s.records.national[nation][d]){
      const xs=s.athletes.filter(a=>!a.retired&&a.nation===nation&&a.disc===d&&Number.isFinite(a.pb)).map(a=>a.pb);if(!xs.length)continue;
      const best=Math.min(...xs),n=enduranceDistance(d),buffer=n===800?.45:n===1500?1.2:n===5000?4:8,wr=ENDURANCE_WORLD_RECORDS[d];
      s.records.national[nation][d]={value:+Math.max(wr+.01,best-buffer).toFixed(2),holder:'Historic benchmark',season:'Pre-career'};
    }
  }
}
function ensureEnduranceCoach(){
  if(typeof ensureCoaches!=='function')return;
  ensureCoaches();
  if(!s.coaches)return;
  s.coachHistory??=[];
  if(!Object.hasOwn(s.coaches,'endurance')){
    const index=Math.max(0,Object.keys(STAFF_DEF).indexOf('endurance')),name=COACH_NAMES[index*5]||'Keisha Powell';
    s.coaches.endurance={id:'incumbent-endurance',name,role:'endurance',level:Math.max(1,Math.min(5,s.staff.endurance||1)),until:coachWeek()+52,joined:coachWeek(),inherited:true};
  }
}
function migrateEnduranceExpansion(){
  if(!s)return;
  s.staff??={};s.staff.endurance??=Math.max(1,Math.round(((s.staff.sprint||1)+(s.staff.science||1))/2));
  ensureEnduranceAthletes();ensureEnduranceEvents();ensureEnduranceRecords();s.seasonLeads??={};s.enduranceExpansionVersion=ENDURANCE_EXPANSION_VERSION;
  ensureEnduranceCoach();
  if(typeof ensureRivalProgrammes==='function')ensureRivalProgrammes();
  if(typeof qualificationRoadState==='function'){qualificationRoadState();if(typeof ensureQualificationLocks==='function')ensureQualificationLocks()}
  save();render();
}
const _enduranceBaseFresh=fresh;
fresh=function(nation='GREAT BRITAIN'){
  const st=_enduranceBaseFresh(nation),old=s;s=st;
  try{
    st.staff??={};st.staff.endurance??=Math.max(1,Math.round(((st.staff.sprint||1)+(st.staff.science||1))/2));
    ensureEnduranceAthletes();ensureEnduranceEvents();ensureEnduranceRecords();st.enduranceExpansionVersion=ENDURANCE_EXPANSION_VERSION;
  }finally{s=old}
  return st;
};

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Event Expansion II — Endurance')){
  UPDATES.unshift({date:'9 September 2026',title:'Event Expansion II — Endurance',items:[
    'Added men’s and women’s 800m, 1500m, 5000m and 10,000m as full disciplines, taking Athletics Manager from ten events to eighteen.',
    'Endurance races use their own competition model: pack starts, 800m break-line behaviour, distance-aware pacing, changing intermediate leaders, late-race moves and championship heats for the 800m and 1500m.',
    'Event Day now presents endurance races as live top-down pack racing rather than stretched sprint lanes. Gavin Potts follows the changing race shape at meaningful checkpoints before the final move and official result.',
    'Added an Endurance Coach role, an Endurance weekly focus, distance-correct scouting PBs, performance conditions, national records, selection standards, World Cup and Olympic qualification standards.',
    'Kenya, Ethiopia and Uganda join the wider simulated athletics world with endurance depth, while every existing nation receives established distance athletes and playable nations gain National Pool prospects. Existing careers migrate automatically.'
  ]});
}

migrateEnduranceExpansion();
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Update #11: Event Expansion II — Endurance ===== */
