/* Athletics Manager — Marathon & Road Racing V1
   Four open-entry road marathons per season with road-specific selection,
   pacing, large fields, checkpoint simulation and course-stage visuals. */
(function(){
'use strict';
if(window.__amMarathonRoadV1)return;window.__amMarathonRoadV1=1;

const VERSION=1;
const ROAD_DISCIPLINES={
 MMarathon:{label:"Men's Marathon",type:'time',unit:'s',distance:42195,family:'road',road:true},
 WMarathon:{label:"Women's Marathon",type:'time',unit:'s',distance:42195,family:'road',road:true}
};
/* Men's record: 1:59:30. Women's overall record: 2:09:56. */
const ROAD_WORLD_RECORDS={MMarathon:7170,WMarathon:7796};
const ROAD_DISCS=Object.keys(ROAD_DISCIPLINES);
const ROAD_NATIONS=['GREAT BRITAIN','USA','JAMAICA','GERMANY','CANADA','FRANCE','ITALY','AUSTRALIA','JAPAN','NETHERLANDS','POLAND','SOUTH AFRICA','KENYA','ETHIOPIA','UGANDA'];
const ROAD_STYLES=['Even Pacer','Aggressive Racer','Negative Split','Strength Runner'];
const ROAD_PLANS={
 conservative:{label:'Conservative',detail:'Settle early, protect the legs and try to finish strongly.'},
 even:{label:'Even Pace',detail:'Hold a controlled target effort from the opening kilometres.'},
 aggressive:{label:'Aggressive',detail:'Race the front early. Higher upside, but a bigger late-race risk.'}
};
const ROAD_EVENTS=[
 {id:'road-spring',week:10,name:'Canal City Marathon',kind:'competition',level:'International',disc:['MMarathon','WMarathon'],ranked:true,star:4,location:'Rotterdam',roadRace:true,openEntry:true,roadCourse:{profile:'Flat & fast',courseSeconds:0,weatherSeconds:2,scenes:[['Start District','city'],['Canal Roads','water'],['Riverside','water'],['Park Roads','park'],['Halfway Boulevard','city'],['Harbour Roads','water'],['Bridge District','bridge'],['Outer City','city'],['Central Return','city'],['Finish Approach','finish']]}},
 {id:'road-capital',week:21,name:'Capital Roads Marathon',kind:'competition',level:'International',disc:['MMarathon','WMarathon'],ranked:true,star:4,location:'London',roadRace:true,openEntry:true,roadCourse:{profile:'Rolling city course',courseSeconds:42,weatherSeconds:6,scenes:[['City Start','city'],['Embankment','water'],['Royal Parks','park'],['Riverside','water'],['Halfway District','city'],['Docklands','water'],['East City','city'],['River Crossing','bridge'],['Central Return','city'],['Ceremonial Finish','finish']]}},
 {id:'road-lakeside',week:32,name:'Lakeside Marathon',kind:'competition',level:'International',disc:['MMarathon','WMarathon'],ranked:true,star:4,location:'Zurich',roadRace:true,openEntry:true,roadCourse:{profile:'Rolling lakeside',courseSeconds:78,weatherSeconds:4,scenes:[['Lakeside Start','water'],['Old Town','city'],['Lake Road','water'],['Rolling Suburbs','hills'],['Halfway Shore','water'],['Hillside Roads','hills'],['Lake Return','water'],['North Shore','water'],['City Approach','city'],['Lakeside Finish','finish']]}},
 {id:'road-autumn',week:43,name:'Autumn City Marathon',kind:'competition',level:'International',disc:['MMarathon','WMarathon'],ranked:true,star:5,location:'Tokyo',roadRace:true,openEntry:true,roadCourse:{profile:'Fast urban course',courseSeconds:18,weatherSeconds:8,scenes:[['City Start','city'],['Business District','city'],['River Crossing','bridge'],['Temple District','city'],['Halfway Avenue','city'],['East City','city'],['Bridge Network','bridge'],['Central Roads','city'],['Finish Approach','city'],['City Finish','finish']]}}
];
const CHECKPOINTS=[0,5000,10000,15000,20000,21097.5,25000,30000,35000,40000,42195];
const E=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isRoad=d=>ROAD_DISCS.includes(String(d||''));
const hash=v=>{try{return hashString(String(v))>>>0}catch(_){let x=2166136261;for(const c of String(v)){x^=c.charCodeAt(0);x=Math.imul(x,16777619)}return x>>>0}};
const seeded=(key,a=0,b=1)=>a+(hash(key)%10000)/10000*(b-a);
const athlete=id=>(s?.athletes||[]).find(a=>String(a.id)===String(id));
const myNation=()=>{try{return managedNation()}catch(_){return s?.managedNation||'GREAT BRITAIN'}};
const roadEvent=e=>!!(e?.roadRace&&e?.openEntry&&ROAD_DISCS.some(d=>(e.disc||[]).includes(d)));
const courseFor=e=>e?.roadCourse||ROAD_EVENTS.find(x=>x.id===e?.id)?.roadCourse||ROAD_EVENTS[0].roadCourse;

Object.assign(DISCIPLINES,ROAD_DISCIPLINES);
Object.assign(WORLD_RECORDS,ROAD_WORLD_RECORDS);
for(const template of ROAD_EVENTS)if(!EVENTS_TEMPLATE.some(e=>e.id===template.id))EVENTS_TEMPLATE.push({...template,roadCourse:{...template.roadCourse,scenes:template.roadCourse.scenes.map(x=>[...x])}});
EVENTS_TEMPLATE.sort((a,b)=>a.week-b.week||String(a.id).localeCompare(String(b.id)));

function roadTime(value){
 const total=Math.max(0,Math.round(Number(value)||0)),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;
 return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
const _roadBaseFmtPerf=fmtPerf;
fmtPerf=function(d,v){return isRoad(d)?roadTime(v):_roadBaseFmtPerf(d,v)};

function nameFor(nation,female,index,taken){
 let firsts=[],lasts=[];
 try{const p=visualProfileForNation(nation);firsts=(female?p?.femaleFirst:p?.maleFirst)||[];lasts=p?.surnames||[]}catch(_){}
 if(!firsts.length)firsts=female?['Maya','Sofia','Amelia','Hannah','Naomi','Elena']:['Daniel','Samuel','Jacob','Lucas','Noah','Isaac'];
 if(!lasts.length)lasts=['Morgan','Grant','Carter','Mills','Foster','Clarke','Reid','Martin'];
 const base=`${firsts[hash(`${nation}|road|${female}|${index}|first`)%firsts.length]} ${lasts[hash(`${nation}|road|${female}|${index}|last`)%lasts.length]}`;
 if(!taken.has(base)){taken.add(base);return base}
 const second=lasts[hash(`${nation}|road|${female}|${index}|second`)%lasts.length],alt=`${base}-${second}`;
 taken.add(alt);return alt;
}
function roadPB(d,overall,key){
 const female=d==='WMarathon',wr=ROAD_WORLD_RECORDS[d],anchor=female?7900:7310,slope=female?50:45,noise=seeded(`${key}|pb`,-55,80);
 return Math.round(Math.max(wr+10,anchor+(95-overall)*slope+noise));
}
function nationRoadStrength(rows,nation,female){
 const preferred=female?['W10000','W5000','W1500']:['M10000','M5000','M1500'];
 const xs=rows.filter(a=>a.nation===nation&&preferred.includes(a.disc)).map(a=>Number(a.overall)||0);
 if(xs.length)return Math.max(...xs);
 const elite=['KENYA','ETHIOPIA','UGANDA'].includes(nation)?91:['GREAT BRITAIN','USA','JAPAN','FRANCE','ITALY','AUSTRALIA','NETHERLANDS','GERMANY','CANADA'].includes(nation)?84:78;
 return elite;
}
function roadAthletes(rows,managed=null){
 const out=[],ids=new Set(rows.map(a=>String(a.id))),taken=new Set(rows.map(a=>String(a.name)));
 for(const nation of ROAD_NATIONS){
  if(typeof COUNTRIES!=='undefined'&&!COUNTRIES[nation]&&typeof WORLD_COUNTRIES!=='undefined'&&!WORLD_COUNTRIES[nation])continue;
  for(const female of [false,true]){
   const d=female?'WMarathon':'MMarathon',base=nationRoadStrength(rows,nation,female);
   for(let i=0;i<3;i++){
    const id=`road-${nation.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,7)}-${female?'w':'m'}-${i+1}`;if(ids.has(id))continue;
    const overall=clamp(base+[1,-2,-4][i]+Math.round(seeded(`${id}|ovr`,-1,1)),68,98),name=nameFor(nation,female,i,taken);
    const a={id,name,nation,disc:d,age:23+(hash(`${id}|age`)%11),overall,potential:clamp(overall+(hash(`${id}|pot`)%4),overall,99),fitness:86+(hash(`${id}|fit`)%12),form:76+(hash(`${id}|form`)%18),fatigue:7+(hash(`${id}|fat`)%18),pb:roadPB(d,overall,id),tier:overall>=92?'Elite':overall>=82?'International':'Developing',points:0,injury:0,medals:{g:0,s:0,b:0},training:'Balanced',inSquad:managed===nation?false:true,source:managed===nation?'National Pool':'World',profileResults:[],marathonStyle:ROAD_STYLES[hash(`${id}|style`)%ROAD_STYLES.length],marathonDurability:clamp(overall-4+(hash(`${id}|dur`)%13),65,99),marathonFueling:clamp(72+(hash(`${id}|fuel`)%27),65,99)};
    try{ensureAthleteVisualIdentity(a)}catch(_){}
    out.push(a);ids.add(id);
   }
  }
 }
 return out;
}
const _roadBaseMakeAthletes=makeAthletes;
makeAthletes=function(){const rows=_roadBaseMakeAthletes();return rows.concat(roadAthletes(rows,null))};

function ensureRoadEvents(state){
 state.events??=[];let changed=false;
 for(const src of ROAD_EVENTS){
  if(state.events.some(e=>e.id===src.id))continue;
  const past=Number(src.week)<Number(state.game?.week||1);
  state.events.push({...src,roadCourse:{...src.roadCourse,scenes:src.roadCourse.scenes.map(x=>[...x])},entries:{},results:{},completed:past,decision:past,roadAddedMidSeason:true});changed=true;
 }
 state.events.sort((a,b)=>a.week-b.week||String(a.id).localeCompare(String(b.id)));
 return changed;
}
function ensureRoadRecords(state){
 state.records??={world:{},national:{}};state.records.world??={};state.records.national??={};let changed=false;
 for(const [d,value] of Object.entries(ROAD_WORLD_RECORDS))if(!state.records.world[d]){state.records.world[d]={value,holder:'World Record',nation:'WORLD',season:'Pre-career'};changed=true}
 for(const nation of Object.keys(typeof COUNTRIES!=='undefined'?COUNTRIES:{})){
  state.records.national[nation]??={};
  for(const d of ROAD_DISCS)if(!state.records.national[nation][d]){
   const values=(state.athletes||[]).filter(a=>a.nation===nation&&a.disc===d&&Number.isFinite(Number(a.pb))).map(a=>Number(a.pb));if(!values.length)continue;
   const best=Math.min(...values),wr=ROAD_WORLD_RECORDS[d];state.records.national[nation][d]={value:Math.round(Math.max(wr+1,best-(d==='WMarathon'?35:30))),holder:'Historic benchmark',season:'Pre-career'};changed=true;
  }
 }
 return changed;
}
function ensureRoadAthletes(state,managed,preserve=true){
 state.athletes??=[];const additions=roadAthletes(state.athletes,managed);if(!additions.length)return false;state.athletes.push(...additions);return true;
}
function prepareFreshRoadState(st,nation){
 ensureRoadAthletes(st,nation,false);ensureRoadEvents(st);ensureRoadRecords(st);st.marathonRoadVersion=VERSION;
 /* Keep the established four-athlete opening intact. Marathon specialists begin in the pool,
    but open road entries do not require a senior-squad call-up. */
 const established=st.athletes.filter(a=>a.nation===nation&&!isRoad(a.disc)&&a.source==='Established').sort((a,b)=>(b.overall||0)-(a.overall||0)||(b.form||0)-(a.form||0)).slice(0,4),keep=new Set(established.map(a=>a.id));
 for(const a of st.athletes.filter(a=>a.nation===nation)){if(isRoad(a.disc)){a.inSquad=false;a.source='National Pool';a.tier=a.tier==='Elite'?'Elite':'National Pool'}else if(a.source==='Established')a.inSquad=keep.has(a.id)}
 return st;
}
const _roadBaseFresh=fresh;
fresh=function(nation='GREAT BRITAIN'){return prepareFreshRoadState(_roadBaseFresh(nation),nation)};

function migrateRoad(){
 if(typeof s==='undefined'||!s)return false;let changed=false;
 changed=ensureRoadAthletes(s,myNation())||changed;changed=ensureRoadEvents(s)||changed;changed=ensureRoadRecords(s)||changed;
 if(Number(s.marathonRoadVersion)!==VERSION){s.marathonRoadVersion=VERSION;changed=true}
 if(changed){try{save()}catch(_){}try{render()}catch(_){}}
 return changed;
}

const _roadBaseSelectionLimit=selectionEntryLimit;
selectionEntryLimit=function(e,d){return e?.openEntry&&isRoad(d)?9999:_roadBaseSelectionLimit(e,d)};
const _roadBaseEligible=eligibleFor;
eligibleFor=function(e,d){
 if(e?.openEntry&&isRoad(d))return (s?.athletes||[]).filter(a=>a&&!a.retired&&a.nation===myNation()&&a.disc===d&&(a.injury||0)<=0&&!activityBusy(a,e.week));
 return _roadBaseEligible(e,d);
};
const _roadBaseField=buildEventField;
buildEventField=function(e,d){
 if(!e?.roadRace||!isRoad(d))return _roadBaseField(e,d);
 const mn=myNation(),ids=new Set(e.entries?.[d]||[]),own=(s.athletes||[]).filter(a=>!a.retired&&a.nation===mn&&a.disc===d&&a.injury<=0&&!activityBusy(a,e.week)&&ids.has(a.id));
 const world=(s.athletes||[]).filter(a=>!a.retired&&a.nation!==mn&&a.disc===d&&a.injury<=0&&!activityBusy(a,e.week)).sort((a,b)=>performanceScore(b)-performanceScore(a)||a.pb-b.pb);
 const target=Math.max(36,48-own.length),picked=[],nationCount={};
 for(const a of world){if((nationCount[a.nation]||0)>=4)continue;picked.push(a);nationCount[a.nation]=(nationCount[a.nation]||0)+1;if(picked.length>=target)break}
 return own.concat(picked);
};

const _roadBaseFamily=athleticsFamily;
athleticsFamily=function(d){return isRoad(d)?'road':_roadBaseFamily(d)};
const _roadBaseFormat=athleticsFormat;
athleticsFormat=function(e,d,fieldSize=null){
 if(!isRoad(d))return _roadBaseFormat(e,d,fieldSize);
 const n=fieldSize??(()=>{try{return buildEventField(e,d).length}catch(_){return 0}})();
 return {family:'road',label:'OPEN ROAD RACE',format:'OPEN ROAD RACE',detail:`Open-entry marathon with ${n||'a large field'} starters. No lanes and no national entry cap. The broadcast follows packs and 5 km checkpoints around the course rather than laps of a stadium track.`,stages:['Start','10 km','Halfway','30 km','40 km','Finish']};
};

function planFor(e,d,id){e.marathonPlans??={};e.marathonPlans[d]??={};return e.marathonPlans[d][id]||'even'}
const _roadBaseRawPerformance=rawPerformance;
rawPerformance=function(a,d,staffBonus=0){
 if(!isRoad(d))return _roadBaseRawPerformance(a,d,staffBonus);
 const pb=Math.max(ROAD_WORLD_RECORDS[d]+1,Number(a?.pb)||9000),readiness=(Number(a?.form)||78)*.40+(Number(a?.fitness)||85)*.32+(100-(Number(a?.fatigue)||15))*.28,dur=Number(a?.marathonDurability)||78,fuel=Number(a?.marathonFueling)||80;
 const starts=a?.marathonSeason===s.game.season?Number(a.marathonSeasonStarts)||0:0,load=Math.max(0,starts-1)*18,staff=(Number(s?.staff?.endurance)||1)*2.5+(Number(staffBonus)||0)*1.5;
 const penalty=Math.max(0,(86-readiness)*2.3)+Math.max(0,78-dur)*1.1+Math.max(0,76-fuel)*.7+load-staff;
 return Math.round(Math.max(ROAD_WORLD_RECORDS[d]+4,pb+penalty+seeded(`${s.game.season}|${s.game.week}|${a.id}|roadperf`,-24,55)));
};
function wallRisk(a,plan){
 const dur=Number(a?.marathonDurability)||78,fuel=Number(a?.marathonFueling)||78,fat=Number(a?.fatigue)||0;
 let risk=Math.max(3,24+(82-dur)*2+(80-fuel)*1.25+Math.max(0,fat-30)*1.3);if(plan==='aggressive')risk*=1.35;if(plan==='conservative')risk*=.62;return clamp(risk,2,92);
}
function sectionFor(e,metres){
 const scenes=courseFor(e).scenes||[],p=clamp(Number(metres)/42195,0,1),i=Math.min(scenes.length-1,Math.floor(p*Math.max(1,scenes.length-1)+.0001));return scenes[Math.max(0,i)]||['Road Course','city'];
}
function checkpointOrder(e,d,rows,metres){
 if(metres>=42195)return [...rows];const p=metres/42195;
 return [...rows].sort((x,y)=>{
  const score=r=>{const a=athlete(r.id),finalRank=rows.findIndex(z=>z.id===r.id),plan=r.roadPlan||planFor(e,d,r.id),style=a?.marathonStyle||'Even Pacer',wall=Number(r.wallSeverity)||0;let n=-finalRank*1.85+seeded(`${e.id}|${d}|${r.id}|${metres}`,-.9,.9);if(plan==='aggressive')n+=(1-p)*2.8-p*.35;if(plan==='conservative')n-=(1-p)*1.6;n+=style==='Aggressive Racer'?(1-p)*1.25:style==='Negative Split'?p*1.55-(1-p)*.5:style==='Strength Runner'?p*.85:.2;if(p>.66)n-=wall*(p-.66)/22;return n};
  return score(y)-score(x)||x.perf-y.perf;
 });
}
function roadCheckpoint(e,d,rows,metres){
 const order=checkpointOrder(e,d,rows,metres),p=metres/42195,leader=order[0],leaderFinal=Number(rows[0]?.perf)||1,gaps={};
 order.forEach((r,i)=>{const finalGap=Math.max(0,(Number(r.perf)||leaderFinal)-leaderFinal),live=metres>=42195?finalGap:Math.max(0,finalGap*Math.pow(Math.max(.04,p),1.22)*.78+i*1.15+seeded(`${e.id}|${r.id}|gap|${metres}`,-1.5,1.5));gaps[r.id]=Math.round(live)});
 const [section,scene]=sectionFor(e,metres);return {metres,order:order.map(r=>r.id),leaderId:leader?.id||null,gaps,section,scene};
}
function engineRoad(e,d,base){
 const course=courseFor(e),rows=base.map(r=>{const a=athlete(r.id),plan=planFor(e,d,r.id),risk=wallRisk(a,plan),hit=seeded(`${e.id}|${d}|${r.id}|wall`,0,100)<risk,wall=hit?Math.round(18+risk*.65+seeded(`${r.id}|wallsev`,0,38)):0;let planEffect=plan==='aggressive'?-9:plan==='conservative'?7:0;if(plan==='aggressive'&&wall)planEffect+=Math.round(wall*.45);if(plan==='conservative'&&wall)planEffect-=Math.min(14,Math.round(wall*.18));const coursePenalty=Number(course.courseSeconds)||0,weather=Number(course.weatherSeconds)||0;return {...r,roadPlan:plan,wallSeverity:wall,perf:Math.round(Math.max(ROAD_WORLD_RECORDS[d]+2,Number(r.perf)+coursePenalty+weather+planEffect))}}).sort((a,b)=>a.perf-b.perf||String(a.name).localeCompare(String(b.name)));
 rows.forEach((r,i)=>r.finalPlace=i+1);
 const checkpoints=CHECKPOINTS.map(m=>roadCheckpoint(e,d,rows,m));
 return {rows,meta:{version:1,family:'road',format:'OPEN ROAD RACE',detail:`${course.profile}. Large open field, 5 km timing points and course-stage coverage.`,stages:[{name:'Road Race',rows:rows.map((r,i)=>({id:r.id,name:r.name,nation:r.nation,mark:r.perf,place:i+1}))}],road:{distance:42195,profile:course.profile,checkpoints},broadcastCues:{},generatedAt:{season:s.game.season,week:s.game.week}}};
}
const _roadBaseRunEngine=athleticsRunEngine;
athleticsRunEngine=function(e,d,base){return isRoad(d)?engineRoad(e,d,base||[]):_roadBaseRunEngine(e,d,base)};

const _roadBaseWorldWeek=simulateWorldWeek;
simulateWorldWeek=function(){
 const removed={};for(const d of ROAD_DISCS)if(DISCIPLINES[d]){removed[d]=DISCIPLINES[d];delete DISCIPLINES[d]}
 try{return _roadBaseWorldWeek()}finally{Object.assign(DISCIPLINES,removed)}
};

const _roadBaseRivalries=recordRivalries;
recordRivalries=function(eventKey,d,results,eventName){
 if(!isRoad(d))return _roadBaseRivalries(eventKey,d,results,eventName);
 const oldIs=isSprintDiscipline,oldMargin=sprintCloseMargin;isSprintDiscipline=x=>isRoad(x)||oldIs(x);sprintCloseMargin=x=>isRoad(x)?6:oldMargin(x);
 try{return _roadBaseRivalries(eventKey,d,results,eventName)}finally{isSprintDiscipline=oldIs;sprintCloseMargin=oldMargin}
};

function cueAt(e,d){
 const meta=e?.engine?.[d],line=liveEventView?.event===e&&liveEventView?.disc===d?liveEventView.lines?.[liveEventView.index]:null,cue=line?meta?.broadcastCues?.[line]:null;
 if(cue)return cue;if(Array.isArray(e?.results?.[d]))return meta?.road?.checkpoints?.at(-1)||{metres:42195,section:'Finish',scene:'finish'};return meta?.road?.checkpoints?.[0]||{metres:0,section:sectionFor(e,0)[0],scene:sectionFor(e,0)[1]};
}
function cpAt(e,d,metres){const xs=e?.engine?.[d]?.road?.checkpoints||[];return xs.reduce((best,x)=>Math.abs(x.metres-metres)<Math.abs((best?.metres??0)-metres)?x:best,xs[0]||null)}
function roadRows(e,d,fallback=[]){return (liveEventView?.event===e&&liveEventView?.disc===d?liveEventView.results:Array.isArray(e?.results?.[d])?e.results[d]:fallback)||[]}
function orderAt(e,d,rows,metres){const cp=cpAt(e,d,metres),ids=cp?.order||rows.map(r=>r.id),map=new Map(rows.map(r=>[String(r.id),r]));return ids.map(id=>map.get(String(id))).filter(Boolean).concat(rows.filter(r=>!ids.map(String).includes(String(r.id))))}
function gapText(sec){const n=Math.max(0,Math.round(Number(sec)||0));return n<=0?'LEAD':`+${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function kmLabel(m){if(Math.abs(m-21097.5)<2)return'HALFWAY';if(m>=42195)return'42.195 KM';return `${(m/1000).toFixed(m%1000?1:0)} KM`}
function roadCommentary(d,r,e){
 const rows=[...r].sort((a,b)=>a.perf-b.perf),meta=e.engine?.[d],cps=meta?.road?.checkpoints||[],ownIds=new Set(e.entries?.[d]||[]),own=rows.filter(x=>ownIds.has(x.id)&&x.nation===myNation()),lines=[];
 const add=(text,cp,phase='race')=>{lines.push(text);meta.broadcastCues[text]={family:'road',metres:cp?.metres||0,section:cp?.section||'',scene:cp?.scene||'city',phase}};
 const first=cps[0];add(`GAVIN POTTS • START\nWelcome to ${e.location} for the ${discLabel(d)}. ${courseFor(e).profile}. This is an open road race, so the field is deep and there are no lanes to hide in.`,first,'start');
 for(const cp of cps.slice(1,-1)){
  const ordered=orderAt(e,d,rows,cp.metres),lead=ordered[0],second=ordered[1],gap=cp.gaps?.[second?.id]||0,p=cp.metres/42195;let body='';
  if(cp.metres===5000)body=`${lead?.name||'The lead group'} has settled at the front. The opening five kilometres have been controlled; the serious decisions are still a long way away.`;
  else if(cp.metres===10000)body=`Ten kilometres down. ${lead?.name||'The leader'} heads the main pack${second?`, with ${second.name} only ${gapText(gap)} back`:''}. The field is beginning to find its natural groups.`;
  else if(cp.metres===15000)body=`The rhythm is established now. ${lead?.name||'The front group'} is keeping the pressure honest, but nobody at the sharp end wants to spend the race too early.`;
  else if(cp.metres===20000)body=`Twenty kilometres. The front pack is thinning, and every change of pace is starting to cost something.`;
  else if(Math.abs(cp.metres-21097.5)<2)body=`Halfway. ${lead?.name||'The leader'} takes the race through the midpoint. This is where a sensible first half starts to matter; the marathon still has more than twenty-one kilometres to collect its debts.`;
  else if(cp.metres===25000)body=`Twenty-five kilometres gone. The race is no longer comfortable. The strongest athletes are beginning to test the pack without fully committing.`;
  else if(cp.metres===30000)body=`Thirty kilometres. This is the point where the marathon changes character. ${lead?.name||'The leader'} is still moving well, but the gaps behind are becoming real.`;
  else if(cp.metres===35000){const fading=ordered.filter(x=>Number(x.wallSeverity)>=28).slice(0,2);body=fading.length?`Thirty-five kilometres and the damage is showing. ${fading.map(x=>x.name).join(' and ')} ${fading.length===1?'is':'are'} paying for the earlier effort. The front of the race is moving away.`:`Thirty-five kilometres. No dramatic collapse at the front yet, but this is the part of the course where tired legs turn small mistakes into minutes.`}
  else if(cp.metres===40000)body=`Forty kilometres. There is nowhere left to save energy. ${lead?.name||'The leader'} has the road ahead, and anyone who wants this race has to go now.`;
  else body=`${kmLabel(cp.metres)}. ${lead?.name||'The leader'} controls the front as the course moves through ${cp.section}.`;
  if(own.length&&p>=.1){const bestOwn=ordered.find(x=>ownIds.has(x.id));if(bestOwn){const pos=ordered.indexOf(bestOwn)+1,ownGap=cp.gaps?.[bestOwn.id]||0;body+=` ${nationName(myNation())}: ${bestOwn.name} is ${pos}${pos===1?'st':pos===2?'nd':pos===3?'rd':'th'}${pos===1?'':` (${gapText(ownGap)})`}.`}}
  add(`${kmLabel(cp.metres)} • ${cp.section.toUpperCase()}\nGavin Potts — ${body}`,cp);
 }
 const finish=cps.at(-1),winner=rows[0],second=rows[1];add(`FINISH • 42.195 KM\nGavin Potts — ${winner?`${winner.name} reaches the line first in ${fmtPerf(d,winner.perf)}${second?`, with ${second.name} next in ${fmtPerf(d,second.perf)}`:''}.`: 'The field reaches the finish.'} Forty-two kilometres of decisions, and now the clock is official.`,finish,'finish');
 if(own.length)add(`YOUR PROGRAMME\nGavin Potts — ${own.map(x=>`${x.name}: ${rows.indexOf(x)+1}${rows.indexOf(x)===0?'st':rows.indexOf(x)===1?'nd':rows.indexOf(x)===2?'rd':'th'} in ${fmtPerf(d,x.perf)}`).join(' • ')}.`,finish,'finish');
 return lines;
}
const _roadBaseCommentary=commentaryLines;
commentaryLines=function(d,r,e){return isRoad(d)?roadCommentary(d,r,e):_roadBaseCommentary(d,r,e)};

function sceneDecor(scene){
 if(scene==='water')return `<rect width="900" height="360" fill="#9fc9d5"/><rect y="196" width="900" height="164" fill="#82b7c8"/><path d="M0 205 C180 170 320 235 500 190 S760 180 900 140" fill="none" stroke="#d7edf3" stroke-width="20" opacity=".38"/><g fill="#315b53">${[80,150,785,840].map((x,i)=>`<circle cx="${x}" cy="${110+i%2*22}" r="28"/>`).join('')}</g>`;
 if(scene==='park')return `<rect width="900" height="360" fill="#a7cfa5"/><g fill="#39734d">${[50,120,190,720,790,855].map((x,i)=>`<circle cx="${x}" cy="${80+(i%3)*45}" r="34"/><rect x="${x-5}" y="${105+(i%3)*45}" width="10" height="38" fill="#6c5137"/>`).join('')}</g>`;
 if(scene==='hills')return `<rect width="900" height="360" fill="#b8d2c0"/><path d="M0 190 Q120 70 250 180 T520 175 T900 155 V360 H0Z" fill="#6f9b78"/><path d="M0 225 Q180 130 350 220 T700 210 T900 190 V360 H0Z" fill="#8cb08e"/>`;
 if(scene==='bridge')return `<rect width="900" height="360" fill="#a4cad6"/><rect y="215" width="900" height="145" fill="#6fa8bb"/><path d="M0 175 Q225 70 450 175 T900 175" fill="none" stroke="#657b84" stroke-width="10"/><g stroke="#657b84" stroke-width="4">${[90,180,270,360,450,540,630,720,810].map(x=>`<line x1="${x}" y1="145" x2="${x}" y2="222"/>`).join('')}</g>`;
 const finish=scene==='finish';return `<rect width="900" height="360" fill="#b7cbd8"/><g fill="#5b6873">${[0,90,170,690,770,845].map((x,i)=>`<rect x="${x}" y="${68+(i%2)*22}" width="72" height="${110-(i%2)*10}" rx="3"/>`).join('')}</g>${finish?'<rect x="690" y="86" width="12" height="126" fill="#172433"/><rect x="830" y="86" width="12" height="126" fill="#172433"/><rect x="690" y="86" width="152" height="30" fill="#f4f8fb"/><text x="766" y="106" text-anchor="middle" fill="#142231" font-size="12" font-weight="900">FINISH</text>':''}`;
}
function roadVisualHTML(e,d,rows=[]){
 const cue=cueAt(e,d),metres=Number(cue.metres)||0,p=Math.min(1,metres/42195),ordered=orderAt(e,d,rows,metres),cp=cpAt(e,d,metres),display=[...ordered.slice(0,10)],ownIds=new Set(e.entries?.[d]||[]);for(const x of ordered.filter(r=>ownIds.has(r.id)))if(!display.some(y=>y.id===x.id))display.push(x);const leaderX=730;
 const runners=display.slice(0,14).map((r,i)=>{const gap=Number(cp?.gaps?.[r.id]||0),x=Math.max(115,leaderX-Math.min(590,gap*8+i*3)),y=238-(x-110)*.155+(i%3-1)*13,managed=r.nation===myNation(),colour=typeof nationDotColour==='function'?nationDotColour(r.nation):'#4f84a1';return `<g class="road-runner ${managed?'managed':''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="${managed?13:10}" fill="${colour}" stroke="${managed?'#ffffff':'#10202d'}" stroke-width="${managed?4:2}"/><text y="4" text-anchor="middle" fill="#fff" font-size="8" font-weight="950">${ordered.indexOf(r)+1}</text><title>${E(r.name)} • ${E(nationName(r.nation))} • ${gapText(gap)}</title></g>`}).join('');
 const section=cue.section||sectionFor(e,metres)[0],scene=cue.scene||sectionFor(e,metres)[1],remaining=Math.max(0,42195-metres),leader=ordered[0],fieldExtra=Math.max(0,rows.length-display.length);
 return `<div class="road-broadcast"><div class="road-route-head"><div><small>COURSE CAMERA</small><strong>${E(section)}</strong></div><div><b>${kmLabel(metres)}</b><span>${remaining?`${(remaining/1000).toFixed(1)} km remaining`:'FINISH'}</span></div></div><div class="road-route-strip"><i style="width:${(p*100).toFixed(2)}%"></i>${[0,10,20,30,40,42.195].map(k=>`<span style="left:${(k/42.195*100).toFixed(2)}%"><b></b><em>${k===42.195?'42.2':k}</em></span>`).join('')}</div><div class="road-scene"><svg viewBox="0 0 900 360" role="img" aria-label="Road marathon broadcast at ${E(section)}">${sceneDecor(scene)}<path d="M-40 315 C170 275 310 292 470 235 S715 205 950 145" fill="none" stroke="#626b70" stroke-width="118"/><path d="M-40 315 C170 275 310 292 470 235 S715 205 950 145" fill="none" stroke="#d8d8d1" stroke-width="3" stroke-dasharray="24 20" opacity=".75"/>${runners}<g transform="translate(28 28)"><rect width="250" height="58" rx="10" fill="#07131d" fill-opacity=".82"/><text x="16" y="22" fill="#9db2c0" font-size="10" font-weight="800">${E(courseFor(e).profile.toUpperCase())}</text><text x="16" y="44" fill="#f6fbff" font-size="18" font-weight="950">${leader?E(leader.name):'Race not started'}</text></g>${fieldExtra?`<g transform="translate(700 308)"><rect width="170" height="30" rx="8" fill="#07131d" fill-opacity=".82"/><text x="85" y="20" text-anchor="middle" fill="#dbe9ef" font-size="10" font-weight="850">+ ${fieldExtra} IN THE FIELD</text></g>`:''}</svg></div></div>`;
}
function roadLeaderboardHTML(e,d,rows=[]){
 if(!rows.length)return `<div class="road-board-empty"><strong>OPEN ROAD FIELD</strong><span>${courseFor(e).profile} • Entries close with your event selection.</span></div>`;
 const cue=cueAt(e,d),metres=Number(cue.metres)||0,cp=cpAt(e,d,metres),ordered=orderAt(e,d,rows,metres),ownIds=new Set(e.entries?.[d]||[]),seen=new Set(),show=[];for(const r of ordered.slice(0,8)){show.push(r);seen.add(r.id)}for(const r of ordered.filter(x=>ownIds.has(x.id)))if(!seen.has(r.id)){show.push(r);seen.add(r.id)}
 return `<div class="road-board-head"><span>LIVE ORDER</span><b>${kmLabel(metres)}</b></div><div class="road-board-rows">${show.slice(0,12).map(r=>{const pos=ordered.indexOf(r)+1,gap=cp?.gaps?.[r.id]||0,own=ownIds.has(r.id);return `<div class="road-board-row ${own?'own':''}"><strong>${pos}</strong><span>${flag(r.nation)} ${E(r.name)}<small>${E(nationName(r.nation))}</small></span><b>${gapText(gap)}</b></div>`}).join('')}</div>`;
}
function planPanel(e,d,chosen){
 if(!chosen.length)return `<section class="road-plan-panel"><div><small>RACE PLAN</small><strong>No programme entries</strong><p>You can still follow the open road field.</p></div></section>`;
 return `<section class="road-plan-panel"><header><div><small>RACE PLAN</small><strong>Set the opening approach</strong></div><span>Changes lock when the gun goes</span></header>${chosen.map(a=>{const selected=planFor(e,d,a.id);return `<div class="road-plan-athlete"><div><strong>${E(a.name)}</strong><small>PB ${fmtPerf(d,a.pb)} • Durability ${a.marathonDurability||'—'} • Fuel prep ${a.marathonFueling||'—'}</small></div><div class="road-plan-buttons">${Object.entries(ROAD_PLANS).map(([key,p])=>`<button type="button" data-road-plan="${E(a.id)}" data-road-plan-key="${key}" class="${selected===key?'on':''}"><b>${p.label}</b><span>${p.detail}</span></button>`).join('')}</div></div>`}).join('')}</section>`;
}

function drawRoadDiscipline(e,live,discs,d){
 const results=Array.isArray(e.results?.[d])?e.results[d]:null,running=disciplineRunning&&liveEventView?.event===e&&liveEventView?.disc===d,rows=running?liveEventView.results:(results||[]),chosen=(e.entries?.[d]||[]).map(athlete).filter(Boolean),done=discs.filter(x=>Array.isArray(e.results?.[x])).length,status=results?'COMPLETE':running?'LIVE':live?'READY':'SCHEDULED',rawCall=running?liveEventView.lines?.[liveEventView.index]||'Gavin Potts is setting the scene.':results?`Official result confirmed. ${results[0]?`${results[0].name} wins in ${fmtPerf(d,results[0].perf)}.`:''}`:'The field is assembling on the road.';
 $('competition').innerHTML=`<div class="matchday-shell road-matchday"><header class="matchday-scorebar"><div class="matchday-scorebar-left"><button id="eventOverview" class="matchday-back" aria-label="Back to Event Day">‹</button><div class="matchday-event-id"><small>ROAD RACING • OPEN ENTRY</small><strong>${E(e.name)}</strong><span>${E(e.location)} • Week ${e.week}</span></div></div><div class="matchday-centre"><div class="matchday-live-row">${running?'<i class="matchday-live-dot"></i>':''}<small>${status} • 42.195 KM</small></div><h1>${discLabel(d)}</h1></div><div class="matchday-scorebar-right"><div class="matchday-stat"><small>Programme</small><strong>${chosen.length}</strong></div><div class="matchday-stat"><small>Field</small><strong>${rows.length||buildEventField(e,d).length}</strong></div><button id="startDisciplineTop" class="btn ${results?'good':'primary'} matchday-start" ${results||!live||disciplineRunning?'disabled':''}>${results?'COMPLETE':running?'IN PROGRESS':'START RACE'}</button></div></header>${!results&&!running?planPanel(e,d,chosen):''}<div class="road-live-layout"><section class="matchday-card road-live-card"><div id="roadLiveStage" class="matchday-arena">${roadVisualHTML(e,d,rows)}</div><div class="matchday-commentary"><div class="matchday-commentator"><div class="matchday-gp">GP</div><div><small>Lead commentator</small><strong>Gavin Potts</strong></div></div><div id="commentary" class="matchday-call" role="region" aria-label="Marathon commentary">${typeof matchdayCommentaryHTML==='function'?matchdayCommentaryHTML(rawCall):E(rawCall)}</div></div><footer class="matchday-dashboard"><div class="matchday-dash-cell"><span class="matchday-dash-label">Course</span><strong class="matchday-dash-main">${E(courseFor(e).profile)}</strong><span class="matchday-dash-sub">Road sections • 5 km timing • pack racing</span></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Entry rule</span><strong class="matchday-dash-main">Open field</strong><span class="matchday-dash-sub">No programme entry cap • Squad and National Pool eligible</span></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Controls</span><div class="matchday-controls"><button id="startDiscipline" class="btn ${results?'good':'primary'}" ${results||!live||disciplineRunning?'disabled':''}>${results?'COMPLETE':running?'IN PROGRESS':'START'}</button><button id="backEvent" class="btn ghost">EVENT DAY</button></div></div></footer></section><aside id="roadLiveBoard" class="road-live-board">${roadLeaderboardHTML(e,d,rows)}</aside></div></div>`;
 const back=()=>{competitionMode='overview';drawCompetition()};if($('eventOverview'))$('eventOverview').onclick=back;if($('backEvent'))$('backEvent').onclick=back;if($('startDiscipline'))$('startDiscipline').onclick=()=>startRoad(e,d);if($('startDisciplineTop'))$('startDisciplineTop').onclick=()=>startRoad(e,d);
 document.querySelectorAll('[data-road-plan]').forEach(b=>b.onclick=()=>{e.marathonPlans??={};e.marathonPlans[d]??={};e.marathonPlans[d][b.dataset.roadPlan]=b.dataset.roadPlanKey;save();drawRoadDiscipline(e,live,discs,d)});
}
const _roadBaseDrawDiscipline=drawDisciplineScreen;
drawDisciplineScreen=function(e,live,discs){const d=activeEventDisc;if(isRoad(d))return drawRoadDiscipline(e,live,discs,d);return _roadBaseDrawDiscipline(e,live,discs)};

function startRoad(e,d){
 if(!e||e.completed||disciplineRunning)return;if(e.week!==s.game.week){toast('This marathon is not live yet');return}e.results??={};if(Array.isArray(e.results[d])){activeEventDisc=d;competitionMode='discipline';drawCompetition();return}
 const career=s,r=simulateDiscipline(e,d),lines=roadCommentary(d,r,e);disciplineRunning=true;activeEventDisc=d;competitionMode='discipline';liveEventView={event:e,disc:d,results:r,lines,index:-1};e.commentary??={};e.commentary[d]=lines;drawCompetition();let j=0;
 function step(){if(s!==career)return;if(j<lines.length){liveEventView.index=j;const visible=currentView==='competition'&&competitionMode==='discipline'&&activeEventDisc===d,comm=visible?$('commentary'):null,stage=visible?$('roadLiveStage'):null,board=visible?$('roadLiveBoard'):null;if(comm){if(typeof renderMatchdayCommentary==='function')renderMatchdayCommentary(comm,lines[j]);else comm.textContent=lines[j]}if(stage)stage.innerHTML=roadVisualHTML(e,d,r);if(board)board.innerHTML=roadLeaderboardHTML(e,d,r);j++;timers.push(setTimeout(step,Math.min(4400,typeof commentaryDelay==='function'?commentaryDelay(lines[j-1]):3600)));return}commitDisciplineResults(e,d,r);save();disciplineRunning=false;liveEventView=null;const ds=e.disc.filter(x=>x!=='ALL');activeEventDisc=d;competitionMode='discipline';if(ds.every(x=>Array.isArray(e.results[x])))finaliseEvent(e,false);else{drawCompetition();toast(discLabel(d)+' complete — official marathon result confirmed')}}
 step();
}
const _roadBaseStart=startDiscipline;
startDiscipline=function(e,d){return isRoad(d)?startRoad(e,d):_roadBaseStart(e,d)};

const _roadBaseCommit=commitDisciplineResults;
commitDisciplineResults=function(e,d,r){
 const already=Array.isArray(e.results?.[d]),out=_roadBaseCommit(e,d,r);if(!isRoad(d)||already)return out;e.marathonRecoveryApplied??={};if(e.marathonRecoveryApplied[d])return out;e.marathonRecoveryApplied[d]=true;const selected=new Set(e.entries?.[d]||[]),finishers=new Set((r||[]).map(x=>x.id));
 for(const a of (s.athletes||[]).filter(x=>x.nation===myNation()&&selected.has(x.id)&&finishers.has(x.id))){const plan=planFor(e,d,a.id),extra=18+(hash(`${e.id}|${d}|${a.id}|recovery`)%8)+(plan==='aggressive'?4:0);a.fatigue=clamp((Number(a.fatigue)||0)+extra,0,100);a.lastMarathon={season:s.game.season,week:s.game.week,event:e.name};if(a.marathonSeason!==s.game.season){a.marathonSeason=s.game.season;a.marathonSeasonStarts=0}a.marathonSeasonStarts=(Number(a.marathonSeasonStarts)||0)+1;try{rememberAthlete(a,'Marathon',`${e.name}: completed ${discLabel(d)} in ${fmtPerf(d,(r.find(x=>x.id===a.id)||{}).perf)}. The medical team has flagged a higher recovery load after 42.195 km.`)}catch(_){}}
 return out;
};

function ensureSelectionDialog(){let dlg=document.getElementById('roadSelectionDialog');if(dlg)return dlg;dlg=document.createElement('dialog');dlg.id='roadSelectionDialog';dlg.className='road-selection-dialog';document.body.appendChild(dlg);return dlg}
function roadSelectionAthletes(d){return (s.athletes||[]).filter(a=>a.nation===myNation()&&a.disc===d&&!a.retired).sort((a,b)=>Number(a.pb)-Number(b.pb)||String(a.name).localeCompare(String(b.name)))}
function openRoadSelection(e){
 const dlg=ensureSelectionDialog();e.roadSelectionDraft??=Object.fromEntries(ROAD_DISCS.map(d=>[d,[...(e.entries?.[d]||[])]]));const locked=!!e.decision;
 const render=()=>{dlg.innerHTML=`<div class="road-selection-shell"><header><div><small>OPEN ROAD ENTRY • WEEK ${e.week}</small><h2>${E(e.name)}</h2><p>${E(e.location)} • ${E(courseFor(e).profile)} • There is no programme entry cap. Marathon specialists can enter directly from the Squad or National Pool.</p></div><button type="button" id="roadSelectionClose" aria-label="Close">×</button></header><div class="road-selection-notice"><strong>Open means open.</strong><span>Select one athlete, six athletes, or every eligible marathon runner you have. These entries do not require a senior-squad place.</span></div>${ROAD_DISCS.map(d=>{const pool=roadSelectionAthletes(d),picked=locked?(e.entries?.[d]||[]):(e.roadSelectionDraft?.[d]||[]);return `<section class="road-selection-event"><div class="road-selection-event-head"><div><small>${discLabel(d)}</small><strong>${picked.length} selected</strong></div><button type="button" data-road-select-all="${d}" ${locked?'disabled':''}>${picked.length===pool.filter(a=>a.injury<=0&&!activityBusy(a,e.week)).length&&picked.length?'CLEAR ALL':'SELECT ALL AVAILABLE'}</button></div><div class="road-selection-grid">${pool.map(a=>{const available=a.injury<=0&&!activityBusy(a,e.week),on=picked.includes(a.id),last=a.lastMarathon?.season===s.game.season?`Last marathon W${a.lastMarathon.week}`:'No marathon this season';return `<article class="road-entry-card ${on?'selected':''} ${!available?'unavailable':''}"><div><strong>${E(a.name)}</strong><small>${a.inSquad===false?'NATIONAL POOL':'SENIOR SQUAD'} • PB ${fmtPerf(d,a.pb)}</small></div><div class="road-entry-metrics"><span>Fitness <b>${a.fitness}</b></span><span>Fatigue <b>${a.fatigue}</b></span><span>Durability <b>${a.marathonDurability||'—'}</b></span></div><p>${available?last:a.injury>0?`Injured • ${a.injury} week(s) remaining`:'Unavailable because of another programme commitment.'}</p><button type="button" data-road-entry="${E(a.id)}" data-road-disc="${d}" ${locked||!available?'disabled':''}>${on?'SELECTED':'ENTER'}</button></article>`}).join('')}</div></section>`}).join('')}<footer><div><small>Selection status</small><strong>${locked?'ENTRY SUBMITTED':'DRAFT SAVED IN CAREER'}</strong></div>${locked?'<button type="button" id="roadSelectionDone" class="btn primary">CLOSE</button>':'<button type="button" id="roadSelectionConfirm" class="btn primary">CONFIRM OPEN ENTRIES</button>'}</footer></div>`;
  dlg.querySelector('#roadSelectionClose').onclick=()=>dlg.close();if(dlg.querySelector('#roadSelectionDone'))dlg.querySelector('#roadSelectionDone').onclick=()=>dlg.close();
  dlg.querySelectorAll('[data-road-entry]').forEach(b=>b.onclick=()=>{const d=b.dataset.roadDisc,id=b.dataset.roadEntry,arr=e.roadSelectionDraft[d]||[];e.roadSelectionDraft[d]=arr.includes(id)?arr.filter(x=>x!==id):arr.concat(id);save();render()});
  dlg.querySelectorAll('[data-road-select-all]').forEach(b=>b.onclick=()=>{const d=b.dataset.roadSelectAll,avail=roadSelectionAthletes(d).filter(a=>a.injury<=0&&!activityBusy(a,e.week)).map(a=>a.id),arr=e.roadSelectionDraft[d]||[];e.roadSelectionDraft[d]=arr.length===avail.length&&avail.every(id=>arr.includes(id))?[]:avail;save();render()});
  const confirm=dlg.querySelector('#roadSelectionConfirm');if(confirm)confirm.onclick=()=>{e.entries??={};for(const d of ROAD_DISCS)e.entries[d]=[...(e.roadSelectionDraft[d]||[])];e.decision=true;e.selectionCentreV2??={};e.selectionCentreV2.status='submitted';e.selectionCentreV2.locked=true;e.selectionCentreV2.submitted=JSON.parse(JSON.stringify(e.entries));save();dlg.close();try{render()}catch(_){}toast('Marathon entries confirmed — open field submitted')};
 };
 render();if(!dlg.open)dlg.showModal();
}
if(window.openCompetitionSelectionCentre){const base=window.openCompetitionSelectionCentre;window.openCompetitionSelectionCentre=function(eventOrId){const e=typeof eventOrId==='string'?(s.events||[]).find(x=>x.id===eventOrId):eventOrId;return roadEvent(e)?openRoadSelection(e):base(eventOrId)}}
if(window.openCompactEventSelection){const base=window.openCompactEventSelection;window.openCompactEventSelection=function(e){return roadEvent(e)?openRoadSelection(e):base(e)}}
window.openRoadRaceSelection=openRoadSelection;

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Marathon & Road Racing'))UPDATES.unshift({date:'15 September 2026',title:'Marathon & Road Racing',items:[
 'Added men’s and women’s marathon as full road disciplines, with four distinct open-entry marathons spread across the season.',
 'Road events use a dedicated open-entry screen: eligible marathon specialists can enter directly from the senior squad or National Pool, with no programme entry cap.',
 'Marathons use large international fields, 5 km timing points, changing packs, pacing plans, late-race fatigue risk and a heavier post-race recovery load.',
 'Live marathon coverage moves through city, riverside, park, bridge and finish sections of the course. The camera jumps to meaningful race moments instead of showing endless stadium laps.',
 'Gavin Potts follows the race from the start through halfway, 30 km, the late-race wall and the final 2.195 km, with your programme position and gaps updated along the route.'
]});

migrateRoad();
try{if(typeof renderMenu==='function')renderMenu()}catch(_){}
})();
