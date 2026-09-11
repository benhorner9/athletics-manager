(function(){
'use strict';

const VERSION=1;
const MANAGER_ID='player-manager-v1';
const MAX_EVENTS=2500;
const REPUTATION_TIERS=[
 [94,'Legendary'],[82,'World Class'],[68,'Elite'],[54,'Continental'],[40,'Established'],[26,'National'],[14,'Emerging'],[0,'Unknown']
];
let activeTab='overview';
let statsScope='career';
let seasonFocus=null;
let timelinePage=0;
let restoreScroll=0;
let migrating=false;
let synchronising=false;

const byId=id=>document.getElementById(id);
const esc=value=>typeof profileEscape==='function'?profileEscape(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safeNumber=value=>Number.isFinite(Number(value))?Number(value):0;
const uniq=items=>[...new Set(items)];
const clampValue=(value,min,max)=>Math.max(min,Math.min(max,value));
const nowSeason=()=>safeNumber(s?.game?.season)||2027;
const nowWeek=()=>safeNumber(s?.game?.week)||1;
const resultKey=(season,event,week,disc)=>`${season}:${event}:${week}:${disc}`;
const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
const medalName=place=>place===1?'Gold':place===2?'Silver':'Bronze';
const recordCodes=row=>(row.achievements||[]).filter(code=>['WR','CR','NR'].includes(code));
const isWorldEvent=name=>/world/i.test(String(name||''));
const isContinentalEvent=name=>/europe|continental|commonwealth|pan american|asian|african/i.test(String(name||''));
const isSummitEvent=name=>/summit/i.test(String(name||''));
const isMajorEventRecord=record=>!!(record.olympic||isWorldEvent(record.event)||isContinentalEvent(record.event));
const currentNation=()=>typeof managedNation==='function'?managedNation():(s?.managedNation||'GREAT BRITAIN');
const nationLabel=n=>typeof nationName==='function'?nationName(n):String(n||'National Programme');
const nationFlag=n=>typeof flag==='function'?flag(n):'';
const disciplineLabel=d=>typeof discLabel==='function'?discLabel(d):String(d||'Event');
const performanceText=(d,v)=>typeof fmtPerf==='function'&&Number.isFinite(Number(v))?fmtPerf(d,Number(v)):String(v??'—');
const moneyText=v=>typeof money==='function'?money(safeNumber(v)):`£${safeNumber(v).toLocaleString('en-GB')}`;
const career=()=>typeof careerState==='function'?careerState():(s.career||{});
const management=()=>typeof managementState==='function'?managementState():(s.management??={});
const careerYear=()=>safeNumber(career().careerYear)||1;
const currentTenure=()=>{const list=career().tenures||[];return [...list].reverse().find(t=>!t.endSeason)||list.at(-1)||null};
const currentRank=()=>{
 const points=s?.nationPoints||{};
 if(!Object.values(points).some(v=>safeNumber(v)>0))return null;
 try{const rows=typeof nationRanks==='function'?nationRanks():Object.entries(points).sort((a,b)=>safeNumber(b[1])-safeNumber(a[1]));const idx=rows.findIndex(row=>row[0]===currentNation());return idx>=0?idx+1:null}catch(_){return null}
};
const athleteById=id=>(s?.athletes||[]).find(a=>a.id===id)||null;
const assessmentMidSafe=a=>{try{return typeof assessmentMid==='function'?Math.round(assessmentMid(a,'overall')):Math.round(safeNumber(a?.overall))}catch(_){return Math.round(safeNumber(a?.overall))}};
const assessmentTextSafe=a=>{try{return typeof assessmentText==='function'?assessmentText(a,'overall'):String(assessmentMidSafe(a))}catch(_){return String(assessmentMidSafe(a))}};

function makeStore(){
 return {
  version:VERSION,
  managerId:MANAGER_ID,
  createdSeason:nowSeason(),
  createdWeek:nowWeek(),
  events:[],
  eventIds:{},
  milestones:{},
  reputation:{score:14,current:'Emerging',peakScore:14,peak:'Emerging',history:[]},
  contracts:[],
  arrivalSnapshots:{},
  seasons:{},
  discoveries:{},
  migration:{version:0,completed:false,notes:[]}
 };
}

function normaliseStore(mc){
 mc.version=VERSION;mc.managerId??=MANAGER_ID;mc.createdSeason??=nowSeason();mc.createdWeek??=nowWeek();
 mc.events=Array.isArray(mc.events)?mc.events:[];mc.eventIds=mc.eventIds&&typeof mc.eventIds==='object'?mc.eventIds:{};
 mc.milestones=mc.milestones&&typeof mc.milestones==='object'?mc.milestones:{};
 mc.reputation=mc.reputation&&typeof mc.reputation==='object'?mc.reputation:{};
 mc.reputation.score=safeNumber(mc.reputation.score)||14;mc.reputation.current??='Emerging';mc.reputation.peakScore=safeNumber(mc.reputation.peakScore)||mc.reputation.score;mc.reputation.peak??=mc.reputation.current;mc.reputation.history=Array.isArray(mc.reputation.history)?mc.reputation.history:[];
 mc.contracts=Array.isArray(mc.contracts)?mc.contracts:[];mc.arrivalSnapshots=mc.arrivalSnapshots&&typeof mc.arrivalSnapshots==='object'?mc.arrivalSnapshots:{};
 mc.seasons=mc.seasons&&typeof mc.seasons==='object'?mc.seasons:{};mc.discoveries=mc.discoveries&&typeof mc.discoveries==='object'?mc.discoveries:{};
 mc.migration=mc.migration&&typeof mc.migration==='object'?mc.migration:{version:0,completed:false,notes:[]};mc.migration.notes=Array.isArray(mc.migration.notes)?mc.migration.notes:[];
 return mc;
}

function rawStore(){
 const m=management();
 if(!m.managerCareerV1)m.managerCareerV1=makeStore();
 return normaliseStore(m.managerCareerV1);
}

function addEvent(mc,id,type,title,detail='',data={},when={}){
 if(!id||mc.eventIds[id])return false;
 const item={id,type,title,detail,season:safeNumber(when.season)||nowSeason(),week:safeNumber(when.week)||nowWeek(),nation:when.nation||data.nation||currentNation(),data};
 mc.eventIds[id]=1;mc.events.push(item);
 if(mc.events.length>MAX_EVENTS){const remove=mc.events.splice(0,mc.events.length-MAX_EVENTS);remove.forEach(x=>delete mc.eventIds[x.id])}
 return true;
}

function managerResults(){
 try{if(typeof importManagerResults==='function')importManagerResults()}catch(_){ }
 const records=management().results||{};
 const rows=[];
 for(const [key,record] of Object.entries(records)){
  if(!record||!Array.isArray(record.rows))continue;
  record.rows.forEach((row,index)=>rows.push({
   ...row,
   resultKey:key,
   season:safeNumber(record.season)||nowSeason(),
   week:safeNumber(record.week)||1,
   event:record.event||'Competition',
   disc:record.disc,
   national:!!record.national,
   olympic:!!record.olympic,
   place:safeNumber(row.place)||index+1,
   nation:row.nation||currentNation()
  }));
 }
 return rows.sort((a,b)=>a.season-b.season||a.week-b.week||String(a.event).localeCompare(String(b.event))||a.place-b.place);
}

function disciplineGroup(code){
 const label=disciplineLabel(code).toLowerCase();
 if(/800|1500|3000|5000|10000|distance|steeple/.test(label))return 'Distance';
 if(/high jump|long jump|triple jump|pole vault|jump/.test(label)||/HJ|LJ|TJ|PV/.test(String(code||'')))return 'Jumps';
 if(/shot|discus|hammer|javelin|throw/.test(label)||/SP|DT|HT|JT/.test(String(code||'')))return 'Throws';
 return 'Sprints';
}

function currentJobStart(){return safeNumber(currentTenure()?.startSeason)||Math.max(2027,nowSeason()-Math.max(0,(safeNumber(s?.game?.cycleYear)||1)-1))}
function filterRows(scope='career'){
 const rows=managerResults();
 if(scope==='season')return rows.filter(row=>row.season===nowSeason()&&row.nation===currentNation());
 if(scope==='job')return rows.filter(row=>row.nation===currentNation()&&row.season>=currentJobStart());
 return rows;
}

function discoveryIds(mc=rawStore()){
 const ids=new Set(Object.keys(mc.discoveries||{}));
 for(const report of s?.scouting?.reports||[])if(report?.athleteId)ids.add(report.athleteId);
 return ids;
}

function developmentSummary(mc=rawStore()){
 const earliest=new Map();
 const seed=(id,overall,season)=>{if(!id||!Number.isFinite(Number(overall)))return;const old=earliest.get(id);if(!old||safeNumber(season)<old.season)earliest.set(id,{overall:Number(overall),season:safeNumber(season)||nowSeason()})};
 for(const snap of Object.values(mc.arrivalSnapshots||{}))for(const a of snap?.squad||[])seed(a.id,a.internalOverall,snap.season);
 for(const snap of Object.values(mc.seasons||{}))for(const a of snap?.squad||[])seed(a.id,a.internalOverall,snap.season);
 for(const item of Object.values(mc.discoveries||{}))seed(item.athleteId,item.initialOverall,item.season);
 const developed=[],elite=[];
 for(const [id,base] of earliest){const a=athleteById(id);if(!a)continue;const gain=safeNumber(a.overall)-base.overall;if(gain>=5)developed.push(id);if(base.overall<90&&safeNumber(a.overall)>=90)elite.push(id)}
 return {tracked:earliest.size,developed:developed.length,elite:elite.length,ids:developed};
}

function careerStats(scope='career'){
 const mc=rawStore(),rows=filterRows(scope),eventKeys=uniq(rows.map(r=>r.resultKey)),wins=rows.filter(r=>r.place===1),podiums=rows.filter(r=>r.place<=3);
 const olympic=rows.filter(r=>r.olympic&&r.place<=3),world=rows.filter(r=>!r.olympic&&isWorldEvent(r.event)&&r.place<=3),continental=rows.filter(r=>!r.olympic&&!isWorldEvent(r.event)&&isContinentalEvent(r.event)&&r.place<=3);
 const medals={g:olympic.filter(r=>r.place===1).length,s:olympic.filter(r=>r.place===2).length,b:olympic.filter(r=>r.place===3).length};
 const majorMedals=olympic.length+world.length+continental.length;
 const recordRows=rows.filter(r=>recordCodes(r).length),recordCount=recordRows.reduce((total,row)=>total+recordCodes(row).length,0);
 const uniqueAthletes=new Set(rows.map(r=>r.id||r.name));
 if(scope!=='career'||rows.length===0){for(const a of (typeof managedTeam==='function'?managedTeam():[]))uniqueAthletes.add(a.id)}
 const discoveries=discoveryIds(mc),scoutedUsed=new Set(rows.filter(r=>discoveries.has(r.id)).map(r=>r.id));
 const development=developmentSummary(mc);
 const groups={Sprints:0,Distance:0,Jumps:0,Throws:0};rows.forEach(r=>groups[disciplineGroup(r.disc)]++);
 const gender={Men:rows.filter(r=>String(r.disc||'').startsWith('M')).length,Women:rows.filter(r=>String(r.disc||'').startsWith('W')).length};
 const firstSeason=Math.min(...rows.map(r=>r.season).concat([nowSeason()]));
 const years=scope==='career'?careerYear():scope==='job'?Math.max(1,nowSeason()-currentJobStart()+1):1;
 return {
  scope,rows,years,competitions:eventKeys.length,entries:rows.length,wins:wins.length,podiums:podiums.length,
  olympicMedals:olympic.length,olympicGolds:medals.g,medals,worldMedals:world.length,continentalMedals:continental.length,majorMedals,
  nationalTitles:wins.filter(r=>r.national).length,records:recordCount,worldRecords:recordRows.reduce((n,r)=>n+recordCodes(r).filter(x=>x==='WR').length,0),nationalRecords:recordRows.reduce((n,r)=>n+recordCodes(r).filter(x=>x==='NR').length,0),championshipRecords:recordRows.reduce((n,r)=>n+recordCodes(r).filter(x=>x==='CR').length,0),
  athletesManaged:uniqueAthletes.size,athletesDiscovered:scope==='career'?discoveries.size:scoutedUsed.size,athletesDeveloped:scope==='career'?development.developed:0,worldClassDeveloped:scope==='career'?development.elite:0,
  groups,gender,firstSeason
 };
}

function boardData(){
 let b=null;try{b=typeof immersionState==='function'?immersionState().board:null}catch(_){ }
 const blueprint=(()=>{try{return typeof nationalIdentityBlueprint==='function'?nationalIdentityBlueprint():null}catch(_){return null}})();
 return {
  targetRank:safeNumber(b?.targetRank)||safeNumber(blueprint?.board?.rank)||4,
  prospects:Array.isArray(b?.prospects)?b.prospects:[],
  targetProspects:safeNumber(b?.targetProspects)||safeNumber(blueprint?.board?.prospects)||2,
  priority:b?.priority||blueprint?.board?.priority||'Build a stronger national programme.'
 };
}

function federationConfidence(){
 const board=boardData(),rank=currentRank(),prospectRatio=board.targetProspects?board.prospects.length/board.targetProspects:1;
 let score=50,reasonsGood=[],reasonsConcern=[];
 if(rank!==null){if(rank<=board.targetRank){score+=18;reasonsGood.push(`The programme is currently #${rank}, inside the federation's top-${board.targetRank} ranking target.`)}else{const gap=rank-board.targetRank;score-=Math.min(22,6+gap*4);reasonsConcern.push(`The programme is currently #${rank}, outside the federation's top-${board.targetRank} ranking target.`)}}
 else reasonsGood.push('The current season ranking is still forming; the federation is judging the programme on delivery rather than an empty early-season table.');
 if(prospectRatio>=1){score+=14;reasonsGood.push(`${board.prospects.length}/${board.targetProspects} pathway opportunities have been delivered this season.`)}else if(prospectRatio>=.5){score+=3;reasonsConcern.push(`Pathway delivery is ${board.prospects.length}/${board.targetProspects}; more opportunities are expected before the season closes.`)}else{score-=10;reasonsConcern.push(`Pathway delivery is only ${board.prospects.length}/${board.targetProspects} against the current target.`)}
 const latest=[...(career().completedCycles||[])].at(-1);if(latest){if(latest.renewed){score+=8;reasonsGood.push(`The most recent Olympic-cycle review was ${String(latest.verdict||'positive').toLowerCase()} and earned a renewal.`)}else{score-=12;reasonsConcern.push(`The most recent Olympic-cycle review fell below the renewal line.`)}}
 score=clampValue(score,0,100);
 const label=score>=78?'Excellent':score>=64?'Very Good':score>=50?'Good':score>=38?'Stable':score>=24?'Under Pressure':'Critical';
 return {score,label,reasonsGood,reasonsConcern,board,rank};
}

function objectiveState(){
 const f=federationConfidence(),b=f.board,cycleYear=safeNumber(s?.game?.cycleYear)||1;
 const rankStatus=f.rank===null?'Future':f.rank<=b.targetRank?'Completed':f.rank<=b.targetRank+2?'On Track':'At Risk';
 const pathwayStatus=b.prospects.length>=b.targetProspects?'Completed':b.prospects.length>=Math.max(1,Math.ceil(b.targetProspects/2))?'On Track':'At Risk';
 const cycleStatus=cycleYear<4?'Future':f.score>=50?'On Track':'At Risk';
 return [
  {name:`Finish inside national ranking top ${b.targetRank}`,status:rankStatus,detail:f.rank===null?'Ranking progress will appear once the season produces ranking points.':`Current national programme position: #${f.rank}.`},
  {name:`Create ${b.targetProspects} pathway opportunities`,status:pathwayStatus,detail:`${b.prospects.length}/${b.targetProspects} young-athlete opportunities recorded this season.`},
  {name:'Deliver the Olympic-cycle review',status:cycleStatus,detail:cycleYear<4?`Year ${cycleYear}/4. The formal federation review arrives after the Olympic season.`:`Current programme indicators point to a ${f.label.toLowerCase()} federation position.`}
 ];
}

function currentContract(){
 const c=career(),pending=c.pendingReview,tenure=currentTenure(),cycleYear=safeNumber(s?.game?.cycleYear)||1;
 const start=Math.max(safeNumber(tenure?.startSeason)||nowSeason()-cycleYear+1,nowSeason()-cycleYear+1),end=start+3;
 let status='Secure';
 if(pending)status=pending.renewed?'Renewal Offered':'Leaving';
 else if(cycleYear===4&&nowWeek()>=40)status='Expiring Soon';
 return {start,end,status,yearsInRole:Math.max(1,nowSeason()-(safeNumber(tenure?.startSeason)||start)+1),appointed:safeNumber(tenure?.startSeason)||start,careerStartYear:safeNumber(tenure?.startCareerYear)||1};
}

function tierForScore(score){return (REPUTATION_TIERS.find(([min])=>score>=min)||REPUTATION_TIERS.at(-1))[1]}
function reputationScore(stats=careerStats('career')){
 const bestRank=Math.min(...(career().seasonHistory||[]).map(x=>safeNumber(x.rank)||99).concat([99]));
 const recent=[...(career().seasonHistory||[])].slice(-2);let recentAdj=0;if(recent.length){const avg=recent.reduce((n,x)=>n+(safeNumber(x.rank)||10),0)/recent.length;recentAdj=avg<=2?5:avg<=4?3:avg>=9?-4:avg>=7?-2:0}
 return clampValue(14+Math.min(24,stats.wins*.55)+Math.min(20,stats.majorMedals*2.6)+Math.min(16,stats.records*1.8)+Math.min(10,stats.athletesDeveloped*1.3)+Math.min(8,stats.years*.35)+(bestRank===1?8:bestRank<=3?4:0)+recentAdj,0,100);
}

function syncReputation(mc){
 const stats=careerStats('career'),score=reputationScore(stats),tier=tierForScore(score),old=mc.reputation.current;
 mc.reputation.score=+score.toFixed(1);mc.reputation.current=tier;
 if(score>safeNumber(mc.reputation.peakScore)){mc.reputation.peakScore=+score.toFixed(1);mc.reputation.peak=tier}
 if(!mc.reputation.history.length){mc.reputation.history.push({season:nowSeason(),week:nowWeek(),tier,score:+score.toFixed(1),baseline:true});mc.reputation.peak=tier;mc.reputation.peakScore=Math.max(score,safeNumber(mc.reputation.peakScore));}
 else if(old&&old!==tier){mc.reputation.history.push({season:nowSeason(),week:nowWeek(),tier,score:+score.toFixed(1)});addEvent(mc,`reputation:${tier}:${nowSeason()}:${nowWeek()}`,'reputation',`Reputation reached ${tier}`,`Career results moved your standing from ${old} to ${tier}.`,{from:old,to:tier})}
 return mc.reputation;
}

function snapshotSquad(){
 const team=typeof managedTeam==='function'?managedTeam():[];
 return team.map(a=>({id:a.id,name:a.name,age:a.age,disc:a.disc,tier:a.tier,pb:a.pb,ability:assessmentMidSafe(a),abilityText:assessmentTextSafe(a),internalOverall:safeNumber(a.overall)}));
}
function squadSummary(){const team=typeof managedTeam==='function'?managedTeam():[],strength=team.length?Math.round(team.reduce((n,a)=>n+assessmentMidSafe(a),0)/team.length):0;return {size:team.length,strength,elite:team.filter(a=>a.tier==='Elite'||safeNumber(a.overall)>=90).length}}
function facilityAverage(){const levels=s?.facilityLevels||{};const vals=Object.values(levels).map(safeNumber).filter(Boolean);return vals.length?+(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):safeNumber(s?.facilities)||1}

function arrivalKey(nation=currentNation(),start=currentJobStart()){return `${start}:${nation}`}
function captureArrival(mc,nation=currentNation(),force=false){
 const start=safeNumber(currentTenure()?.startSeason)||currentJobStart(),key=arrivalKey(nation,start);if(mc.arrivalSnapshots[key])return mc.arrivalSnapshots[key];
 const reliable=force||(careerYear()===1&&nowWeek()<=1&&start===nowSeason());
 if(!reliable){mc.arrivalSnapshots[key]={available:false,nation,startSeason:start,reason:'Arrival baseline was not recorded in this earlier career data.'};return mc.arrivalSnapshots[key]}
 const sq=squadSummary(),rank=currentRank();mc.arrivalSnapshots[key]={available:true,nation,startSeason:start,season:nowSeason(),week:nowWeek(),rank,squadSize:sq.size,squadStrength:sq.strength,eliteCount:sq.elite,funding:safeNumber(s?.funding),facilityAverage:facilityAverage(),squad:snapshotSquad()};
 addEvent(mc,`arrival:${key}`,'appointment',`Took charge of ${nationLabel(nation)}`,`Programme baseline captured for the start of this role.`,{nation,startSeason:start},{season:start,week:1,nation});return mc.arrivalSnapshots[key]
}

function buildSeasonSnapshot(summary){
 const stats=careerStats('season'),sq=squadSummary(),f=federationConfidence(),rows=filterRows('season'),athletes=athletePerformanceAggregate(rows),top=athletes[0]||null;
 return {
  available:true,season:nowSeason(),careerYear:careerYear(),cycleNumber:safeNumber(career().cycleNumber)||1,cycleYear:safeNumber(s?.game?.cycleYear)||1,nation:currentNation(),rank:safeNumber(summary?.rank)||f.rank,
  federation:f.label,federationScore:f.score,records:stats.records,wins:stats.wins,podiums:stats.podiums,majorMedals:stats.majorMedals,olympicMedals:stats.olympicMedals,
  funding:safeNumber(s?.funding),annualSpend:safeNumber(s?.annualSpend),facilityAverage:facilityAverage(),squadSize:sq.size,squadStrength:sq.strength,eliteCount:sq.elite,squad:snapshotSquad(),topAthlete:top?{id:top.id,name:top.name,wins:top.wins,podiums:top.podiums,score:top.score}:null,
  resultKeys:uniq(rows.map(r=>r.resultKey)),snapshotAtWeek:nowWeek()
 };
}

function syncSeasonHistory(mc){
 for(const summary of career().seasonHistory||[]){const key=String(summary.season);if(mc.seasons[key])continue;mc.seasons[key]={available:false,season:safeNumber(summary.season),careerYear:safeNumber(summary.careerYear),cycleNumber:safeNumber(summary.cycleNumber),cycleYear:safeNumber(summary.cycleYear),nation:summary.nation,rank:safeNumber(summary.rank)||null,records:safeNumber(summary.records),youngInternationals:safeNumber(summary.youngInternationals),targetProspects:safeNumber(summary.targetProspects),bonus:safeNumber(summary.bonus),reason:'This season predates full manager snapshots. Only reliable archived fields are shown.'}}
}

function syncDiscoveries(mc){
 for(const report of s?.scouting?.reports||[]){if(!report?.athleteId)continue;const a=athleteById(report.athleteId),id=report.athleteId;if(!mc.discoveries[id])mc.discoveries[id]={athleteId:id,name:a?.name||'Archived prospect',season:safeNumber(report.season)||a?.discoveredSeason||nowSeason(),week:safeNumber(report.week)||a?.discoveredWeek||1,reason:report.reason||'Scouting report',age:a?.discoveredAge??null,initialOverall:null,initialPB:null,nation:a?.nation||currentNation(),migrated:true};const d=mc.discoveries[id];addEvent(mc,`discovery:${id}:${d.season}:${d.week}`,'scouting',`Discovered ${d.name}`,`${disciplineLabel(a?.disc)} prospect added through the national scouting network.`,{athleteId:id},{season:d.season,week:d.week,nation:d.nation})}
}

function recordFreshDiscoveries(mc,athletes,reason){
 for(const a of athletes||[]){if(!a?.id)continue;mc.discoveries[a.id]={athleteId:a.id,name:a.name,season:a.discoveredSeason||nowSeason(),week:a.discoveredWeek||nowWeek(),reason:reason||'Scouting report',age:a.discoveredAge??a.age,initialOverall:safeNumber(a.overall),initialPB:safeNumber(a.pb),nation:a.nation||currentNation(),migrated:false};const d=mc.discoveries[a.id];addEvent(mc,`discovery:${a.id}:${d.season}:${d.week}`,'scouting',`Discovered ${a.name}`,`${disciplineLabel(a.disc)} prospect identified by the national scouting network.`,{athleteId:a.id},{season:d.season,week:d.week,nation:d.nation})}
}

function syncContracts(mc){
 const seen=new Set(mc.contracts.map(c=>c.id));
 for(const tenure of career().tenures||[]){const nation=tenure.nation||currentNation(),start=safeNumber(tenure.startSeason)||nowSeason(),id=`appointment:${nation}:${start}`;if(!seen.has(id)){mc.contracts.push({id,type:'Appointment',nation,startSeason:start,endSeason:tenure.endSeason||null,status:tenure.endSeason?'Completed':'Current',outcome:tenure.endSeason?'Role ended':'In role'});seen.add(id)}addEvent(mc,`job:${nation}:${start}`,'appointment',`Appointed ${nationLabel(nation)} Performance Director`,`Management tenure began in ${start}.`,{nation},{season:start,week:1,nation})}
 for(const review of career().completedCycles||[]){const id=`cycle:${review.cycle}:${review.nation}`;if(!seen.has(id)){mc.contracts.push({id,type:'Olympic Cycle',nation:review.nation,startSeason:review.startSeason,endSeason:review.endSeason,status:review.renewed?'Completed · Renewal offered':'Completed · Not renewed',outcome:review.acceptedNation&&review.acceptedNation!==review.nation?`Moved to ${nationLabel(review.acceptedNation)}`:review.renewed?'Renewed':'Contract completed'});seen.add(id)}addEvent(mc,`review:${review.cycle}:${review.nation}`,'review',`${nationLabel(review.nation)} Olympic-cycle review`,`${review.verdict||'Federation review'} · Board score ${safeNumber(review.score)} · ${safeNumber(review.medals?.g)}G ${safeNumber(review.medals?.s)}S ${safeNumber(review.medals?.b)}B.`,{review},{season:review.endSeason,week:52,nation:review.nation})}
 mc.contracts.sort((a,b)=>safeNumber(a.startSeason)-safeNumber(b.startSeason));
}

function syncFacilityEvents(mc){for(const item of s?.facilityHistory||[]){const id=`facility:${item.key}:${item.level}:${item.season}:${item.week}`;addEvent(mc,id,'programme',`${String(item.key||'Programme')} facility reached Level ${safeNumber(item.level)}`,`Investment ${moneyText(item.cost)}.`,{facility:item.key,level:item.level},{season:item.season,week:item.week})}}
function syncRetirements(mc){const connected=new Set(managerResults().map(r=>r.id));for(const a of s?.athletes||[]){if(!a.retired||!a.retirement||!connected.has(a.id))continue;addEvent(mc,`retirement:${a.id}:${a.retirement.season}:${a.retirement.week}`,'athlete',`${a.name} retired`,`A managed athlete closed their career after ${a.retirement.reason||'retirement'}.`,{athleteId:a.id},{season:a.retirement.season,week:a.retirement.week,nation:a.nation})}}

function syncMajorResults(mc){
 const records=management().results||{};
 for(const [key,record] of Object.entries(records)){
  if(!record||!Array.isArray(record.rows))continue;
  record.rows.forEach((row,index)=>{
   const place=safeNumber(row.place)||index+1,athlete=row.name||athleteById(row.id)?.name||'Athlete',when={season:record.season,week:record.week,nation:row.nation};
   if(record.olympic&&place<=3)addEvent(mc,`olympic-medal:${key}:${row.id||athlete}:${place}`,'medal',`Olympic ${medalName(place)} · ${athlete}`,`${disciplineLabel(record.disc)} at ${record.event}.`,{athleteId:row.id,event:record.event,disc:record.disc,place,perf:row.perf,olympic:true},when);
   else if((isWorldEvent(record.event)||isContinentalEvent(record.event))&&place<=3)addEvent(mc,`major-medal:${key}:${row.id||athlete}:${place}`,'medal',`${medalName(place)} · ${athlete}`,`${record.event} · ${disciplineLabel(record.disc)}.`,{athleteId:row.id,event:record.event,disc:record.disc,place,perf:row.perf},when);
   else if(record.national&&place===1)addEvent(mc,`national-title:${key}:${row.id||athlete}`,'title',`National title · ${athlete}`,`${record.event} · ${disciplineLabel(record.disc)}.`,{athleteId:row.id,event:record.event,disc:record.disc,place,perf:row.perf},when);
   for(const code of recordCodes(row))addEvent(mc,`record:${key}:${row.id||athlete}:${code}`,'record',`${code} · ${athlete}`,`${record.event} · ${disciplineLabel(record.disc)} · ${performanceText(record.disc,row.perf)}.`,{athleteId:row.id,event:record.event,disc:record.disc,code,perf:row.perf},when);
  });
 }
}

function sortedRows(){return managerResults().sort((a,b)=>a.season-b.season||a.week-b.week||a.place-b.place)}
function nth(items,n){return items.length>=n?items[n-1]:null}
function addMilestone(mc,id,title,detail,source){if(mc.milestones[id])return;mc.milestones[id]={id,title,detail,season:source?.season||nowSeason(),week:source?.week||nowWeek(),athleteId:source?.id||source?.athleteId||null};addEvent(mc,`milestone:${id}`,'milestone',title,detail,{milestoneId:id,athleteId:source?.id||source?.athleteId||null},{season:source?.season,week:source?.week,nation:source?.nation})}
function syncMilestones(mc){
 const rows=sortedRows(),wins=rows.filter(r=>r.place===1),podiums=rows.filter(r=>r.place<=3),olympicMedals=rows.filter(r=>r.olympic&&r.place<=3),olympicGolds=rows.filter(r=>r.olympic&&r.place===1),recordRows=rows.filter(r=>recordCodes(r).length),wrRows=rows.filter(r=>recordCodes(r).includes('WR'));
 const definitions=[
  ['first-win','First event win','The first recorded event victory of your management career.',nth(wins,1)],
  ['10-wins','10 event wins','Your programme reached 10 recorded event victories.',nth(wins,10)],
  ['50-wins','50 event wins','Your programme reached 50 recorded event victories.',nth(wins,50)],
  ['100-wins','100 event wins','Your programme reached 100 recorded event victories.',nth(wins,100)],
  ['first-podium','First podium','The first recorded podium of your management career.',nth(podiums,1)],
  ['first-olympic-medal','First Olympic medal','Your programme won its first Olympic medal under your management.',nth(olympicMedals,1)],
  ['first-olympic-gold','First Olympic gold','Your programme won its first Olympic title under your management.',nth(olympicGolds,1)],
  ['first-record','First record','The first national, championship or world record recorded under your management.',nth(recordRows,1)],
  ['first-world-record','First world record','The first world record achieved under your management.',nth(wrRows,1)]
 ];
 for(const [id,title,detail,source] of definitions)if(source)addMilestone(mc,id,title,detail,source);
 const firstDiscovery=Object.values(mc.discoveries||{}).sort((a,b)=>a.season-b.season||a.week-b.week)[0];if(firstDiscovery)addMilestone(mc,'first-discovery','First scouting discovery',`${firstDiscovery.name} became the first prospect logged by your scouting network.`,{season:firstDiscovery.season,week:firstDiscovery.week,athleteId:firstDiscovery.athleteId,nation:firstDiscovery.nation});
 for(const years of [5,10,20,30,40])if(careerYear()>=years){const start=safeNumber(career().tenures?.[0]?.startSeason)||2027;addMilestone(mc,`${years}-seasons`,`${years} seasons in management`,`Your management career reached ${years} seasons.`,{season:start+years-1,week:52,nation:career().tenures?.[0]?.nation})}
 const no1=(career().seasonHistory||[]).find(x=>safeNumber(x.rank)===1);if(no1)addMilestone(mc,'first-world-number-one','Programme reaches #1',`${nationLabel(no1.nation)} finished ${no1.season} at the top of the national programme standings.`,{season:no1.season,week:52,nation:no1.nation});
}

function migrate(mc){
 if(migrating||safeNumber(mc.migration.version)>=VERSION)return mc;migrating=true;
 try{
  try{if(typeof importManagerResults==='function')importManagerResults()}catch(_){ }
  syncContracts(mc);syncSeasonHistory(mc);syncDiscoveries(mc);syncFacilityEvents(mc);syncRetirements(mc);syncMajorResults(mc);
  captureArrival(mc,currentNation(),false);
  mc.migration.version=VERSION;mc.migration.completed=true;mc.migration.completedSeason=nowSeason();mc.migration.completedWeek=nowWeek();mc.migration.notes=['Existing saves were backfilled only from reliable career, result, scouting, facility and contract data.','Historical fields that were never stored remain explicitly unavailable rather than being invented.'];
  syncMilestones(mc);syncReputation(mc);
 }finally{migrating=false}
 return mc;
}

function careerStore(){const mc=rawStore();if(safeNumber(mc.migration.version)<VERSION)migrate(mc);return mc}
function syncAll(options={}){
 if(synchronising)return rawStore();synchronising=true;try{const mc=careerStore();syncContracts(mc);syncSeasonHistory(mc);syncDiscoveries(mc);syncFacilityEvents(mc);syncRetirements(mc);syncMajorResults(mc);if(options.captureArrival)captureArrival(mc,currentNation(),true);syncMilestones(mc);syncReputation(mc);return mc}finally{synchronising=false}
}
function persist(){try{if(typeof save==='function')save()}catch(err){console.warn('Manager Career V1 save failed',err)}}

function athletePerformanceAggregate(rows=managerResults()){
 const map=new Map();
 for(const row of rows){const key=row.id||row.name;if(!key)continue;const item=map.get(key)||{id:row.id||null,name:row.name||athleteById(row.id)?.name||'Athlete',starts:0,wins:0,podiums:0,olympicMedals:0,majorMedals:0,records:0,score:0,lastSeason:0};item.starts++;if(row.place===1)item.wins++;if(row.place<=3)item.podiums++;if(row.olympic&&row.place<=3)item.olympicMedals++;if(isMajorEventRecord(row)&&row.place<=3)item.majorMedals++;item.records+=recordCodes(row).length;item.lastSeason=Math.max(item.lastSeason,row.season);item.score=item.olympicMedals*18+item.majorMedals*9+item.wins*4+item.podiums+item.records*6+item.starts*.2;map.set(key,item)}
 return [...map.values()].sort((a,b)=>b.score-a.score||b.olympicMedals-a.olympicMedals||b.wins-a.wins||a.name.localeCompare(b.name));
}
function greatestDiscovery(mc=careerStore()){const ids=discoveryIds(mc),ranked=athletePerformanceAggregate().filter(x=>ids.has(x.id));return ranked[0]||null}
function greatestAthletes(limit=6){return athletePerformanceAggregate().slice(0,limit)}

function philosophy(){
 const mc=careerStore(),stats=careerStats('career'),discoveries=discoveryIds(mc),athletes=s?.athletes||[];
 let callups=0,drops=0,youngCallups=0;
 for(const a of athletes){for(const memory of a.story?.memories||[]){if(memory.type==='Call-up'){callups++;const ageAt=Math.max(15,safeNumber(a.age)-(nowSeason()-safeNumber(memory.season)));if(ageAt<=21)youngCallups++}if(memory.type==='Squad decision'&&/pool|moved/i.test(String(memory.text||'')))drops++}}
 const scoutedCallups=athletes.filter(a=>discoveries.has(a.id)&&(a.inSquad!==false||(a.story?.memories||[]).some(m=>m.type==='Call-up'))).length;
 const camps=athletes.reduce((n,a)=>n+(a.campHistory||[]).filter(c=>c.outcome==='Completed').length,0),facilities=(s?.facilityHistory||[]).length;
 const styles=[
  {name:'Talent Developer',score:youngCallups*3+scoutedCallups*3+stats.athletesDeveloped*4,detail:`${youngCallups} young call-up${youngCallups===1?'':'s'}, ${scoutedCallups} scouted prospect${scoutedCallups===1?'':'s'} promoted and ${stats.athletesDeveloped} confirmed development success${stats.athletesDeveloped===1?'':'es'}.`},
  {name:'Performance Specialist',score:stats.majorMedals*4+stats.records*3+stats.wins*.6,detail:`${stats.majorMedals} major medal${stats.majorMedals===1?'':'s'}, ${stats.records} record${stats.records===1?'':'s'} and ${stats.wins} event win${stats.wins===1?'':'s'} shape the performance profile.`},
  {name:'Squad Builder',score:callups*2+stats.athletesManaged*.8,detail:`${callups} recorded squad call-up${callups===1?'':'s'} and ${stats.athletesManaged} athletes used in competition show how widely you have built the programme.`},
  {name:'Long-Term Planner',score:camps*1.5+facilities*3+careerYear()*.7,detail:`${camps} completed camp${camps===1?'':'s'}, ${facilities} facility investment${facilities===1?'':'s'} and ${careerYear()} season${careerYear()===1?'':'s'} of career planning drive this tendency.`},
  {name:'Ruthless Selector',score:drops*3,detail:`${drops} recorded squad move${drops===1?'':'s'} back to the National Pool show a willingness to change personnel.`}
 ].sort((a,b)=>b.score-a.score);
 if(styles[0].score<3)return {primary:{name:'Still Taking Shape',detail:'There is not enough career evidence yet to assign a strong management identity.'},secondary:null,metrics:{callups,drops,youngCallups,scoutedCallups,camps,facilities}};
 return {primary:styles[0],secondary:styles[1].score>=3?styles[1]:null,metrics:{callups,drops,youngCallups,scoutedCallups,camps,facilities}};
}

function careerBiography(){
 const stats=careerStats('career'),c=career(),first=c.tenures?.[0],name=management().name||'Performance Director',parts=[`${name} began this management career with ${nationLabel(first?.nation||currentNation())} in ${safeNumber(first?.startSeason)||2027}.`];
 if(stats.wins)parts.push(`Across ${stats.years} season${stats.years===1?'':'s'}, the programme has recorded ${stats.wins} event win${stats.wins===1?'':'s'} and ${stats.podiums} podium${stats.podiums===1?'':'s'}.`);else parts.push(`The career is in its opening stage, with the first major results still ahead.`);
 if(stats.olympicMedals)parts.push(`${stats.olympicMedals} Olympic medal${stats.olympicMedals===1?' has':'s have'} been won under this management.`);
 if(stats.records)parts.push(`${stats.records} national, championship or world record achievement${stats.records===1?' has':'s have'} been logged.`);
 if((c.nationsManaged||[]).length>1)parts.push(`The career has now included ${(c.nationsManaged||[]).length} national programmes.`);
 return parts.join(' ');
}

function legacyStatus(){const stats=careerStats('career'),score=stats.olympicGolds*8+stats.majorMedals*3+stats.records*2+stats.wins*.25+stats.athletesDeveloped+careerYear()*.4;return score>=80?'Legendary':score>=52?'Historic':score>=30?'Elite':score>=14?'Successful':'Developing'}

function programmeImpact(){
 const mc=careerStore(),key=arrivalKey(),base=mc.arrivalSnapshots[key],sq=squadSummary(),current={rank:currentRank(),squadSize:sq.size,squadStrength:sq.strength,eliteCount:sq.elite,funding:safeNumber(s?.funding),facilityAverage:facilityAverage()};
 if(!base?.available)return {available:false,reason:base?.reason||'No reliable arrival snapshot is available for this role.',current};
 return {available:true,base,current};
}

function olympicHistory(){
 const map=new Map();for(const row of managerResults().filter(r=>r.olympic)){const key=`${row.season}:${row.event}`,x=map.get(key)||{season:row.season,event:row.event,g:0,s:0,b:0,total:0,rows:[]};if(row.place<=3){x.total++;if(row.place===1)x.g++;else if(row.place===2)x.s++;else x.b++}x.rows.push(row);map.set(key,x)}return [...map.values()].sort((a,b)=>b.season-a.season)
}
function honours(){return managerResults().filter(r=>r.place===1&&(r.olympic||isWorldEvent(r.event)||isContinentalEvent(r.event)||r.national||isSummitEvent(r.event))).sort((a,b)=>b.season-a.season||b.week-a.week)}
function recordMoments(){return managerResults().filter(r=>recordCodes(r).length).sort((a,b)=>b.season-a.season||b.week-a.week)}
function firsts(){const rows=sortedRows(),mc=careerStore(),firstDiscovery=Object.values(mc.discoveries).sort((a,b)=>a.season-b.season||a.week-b.week)[0];return [
 ['First event win',rows.find(r=>r.place===1)],['First podium',rows.find(r=>r.place<=3)],['First Olympic medal',rows.find(r=>r.olympic&&r.place<=3)],['First Olympic gold',rows.find(r=>r.olympic&&r.place===1)],['First world record',rows.find(r=>recordCodes(r).includes('WR'))],['First scouting discovery',firstDiscovery?{season:firstDiscovery.season,week:firstDiscovery.week,name:firstDiscovery.name,id:firstDiscovery.athleteId}:null]
 ].filter(([,x])=>x)}

function managerRecords(){
 const rows=managerResults(),bySeason=new Map();for(const r of rows){const x=bySeason.get(r.season)||{season:r.season,wins:0,podiums:0,majorMedals:0,records:0};if(r.place===1)x.wins++;if(r.place<=3)x.podiums++;if(isMajorEventRecord(r)&&r.place<=3)x.majorMedals++;x.records+=recordCodes(r).length;bySeason.set(r.season,x)}
 const values=[...bySeason.values()];const best=(key)=>[...values].sort((a,b)=>b[key]-a[key]||b.season-a.season)[0]||null;
 return {wins:best('wins'),podiums:best('podiums'),majorMedals:best('majorMedals'),records:best('records')};
}

function statBox(label,value,note=''){return `<div class="am-mgr-stat"><small>${esc(label)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`}
function statusClass(status){return /complete|excellent|very good|secure|world class|legendary|historic|elite/i.test(status)?'good':/risk|pressure|critical|leaving|failed/i.test(status)?'bad':/expiring|review|future|stable/i.test(status)?'warn':''}
function tabButton(id,label){return `<button type="button" role="tab" aria-selected="${activeTab===id?'true':'false'}" class="${activeTab===id?'on':''}" data-manager-tab="${id}">${label}</button>`}
function athleteButton(id,name,sub=''){return id&&athleteById(id)?`<button type="button" class="am-mgr-entity" data-manager-athlete="${esc(id)}"><strong>${esc(name)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</button>`:`<div class="am-mgr-entity static"><strong>${esc(name||'Archived athlete')}</strong>${sub?`<span>${esc(sub)}</span>`:''}</div>`}
function emptyState(title,copy){return `<div class="am-mgr-empty"><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`}

function heroHTML(){
 const mc=careerStore(),stats=careerStats('career'),contract=currentContract(),rep=mc.reputation,confidence=federationConfidence(),name=management().name||'Performance Director',initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'PD';
 return `<section class="am-mgr-hero">
  <div class="am-mgr-avatar" aria-label="Manager initials ${esc(initials)}"><span>${esc(initials)}</span><b>${esc(nationFlag(currentNation()))}</b></div>
  <div class="am-mgr-identity"><div class="am-mgr-kicker">MY PROFILE · CAREER YEAR ${careerYear()}</div><h1 id="managementName">${esc(name)}</h1><p>${esc(nationLabel(currentNation()))} · Performance Director</p><div class="am-mgr-badges"><span class="am-mgr-badge nation">${esc(nationFlag(currentNation()))} ${esc(nationLabel(currentNation()))}</span><span class="am-mgr-badge">${esc(rep.current)} Reputation</span><span class="am-mgr-badge ${statusClass(contract.status)}">${esc(contract.status)}</span><span class="am-mgr-badge ${statusClass(confidence.label)}">Federation ${esc(confidence.label)}</span></div></div>
  <div class="am-mgr-contract"><small>CURRENT CONTRACT</small><strong>${contract.start}–${contract.end}</strong><span>${contract.yearsInRole} season${contract.yearsInRole===1?'':'s'} in this role</span><em>${esc(contract.status)}</em></div>
 </section>
 <div class="am-mgr-stat-strip">
  ${statBox('Years Managed',stats.years)}${statBox('Olympic Golds',stats.olympicGolds)}${statBox('Major Medals',stats.majorMedals)}${statBox('Event Wins',stats.wins)}${statBox('Records',stats.records)}${statBox('Athletes Developed',stats.athletesDeveloped,developmentSummary(mc).tracked?'confirmed from saved baselines':'tracking begins with saved baselines')}
 </div>`;
}

function currentJobHTML(){
 const contract=currentContract(),confidence=federationConfidence(),review=[...(career().completedCycles||[])].at(-1),reasons=[...confidence.reasonsGood.slice(0,2),...confidence.reasonsConcern.slice(0,2)];
 return `<section class="am-mgr-card am-mgr-job"><div class="am-mgr-card-head"><div><small>CURRENT JOB</small><h2>${esc(nationFlag(currentNation()))} ${esc(nationLabel(currentNation()))}</h2></div><span class="am-mgr-state ${statusClass(confidence.label)}">${esc(confidence.label)}</span></div><div class="am-mgr-job-grid">${statBox('Appointed',contract.appointed)}${statBox('Contract',`${contract.start}–${contract.end}`)}${statBox('Years in Role',contract.yearsInRole)}${statBox('Job Security',contract.status)}</div><div class="am-mgr-explain"><strong>Why the federation feels this way</strong>${reasons.map((x,i)=>`<p class="${i<confidence.reasonsGood.slice(0,2).length?'positive':'concern'}">${esc(x)}</p>`).join('')}${!reasons.length?'<p>No formal performance evidence has been recorded yet.</p>':''}</div>${review?`<div class="am-mgr-review-note"><small>Most recent Olympic-cycle review</small><strong>${esc(review.verdict||'Review complete')}</strong><span>${review.endSeason} · Board score ${safeNumber(review.score)}</span></div>`:'<div class="am-mgr-review-note"><small>Formal review</small><strong>First Olympic-cycle review ahead</strong><span>Contract review follows the Olympic season.</span></div>'}</section>`;
}

function objectivesHTML(){const items=objectiveState();return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>FEDERATION EXPECTATIONS</small><h2>Current objectives</h2></div><span>${safeNumber(s?.game?.season)}</span></div><div class="am-mgr-objectives">${items.map(x=>`<article><span class="am-mgr-state ${statusClass(x.status)}">${esc(x.status)}</span><div><strong>${esc(x.name)}</strong><p>${esc(x.detail)}</p></div></article>`).join('')}</div></section>`}

function highlightsHTML(){
 const mc=careerStore(),events=[...mc.events].sort((a,b)=>b.season-a.season||b.week-a.week),major=events.filter(e=>['medal','record','milestone','appointment','review'].includes(e.type)).slice(0,6);
 return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>CAREER HIGHLIGHTS</small><h2>The story so far</h2></div><span>${legacyStatus()} Legacy</span></div>${major.length?`<div class="am-mgr-highlight-list">${major.map(e=>`<article><time>${e.season} · W${e.week}</time><strong>${esc(e.title)}</strong><p>${esc(e.detail)}</p></article>`).join('')}</div>`:emptyState('The first big moment is still ahead','Major medals, records, appointments and career milestones will build this section.')}</section>`;
}

function legacyHTML(){const stats=careerStats('career'),rep=careerStore().reputation;return `<section class="am-mgr-card am-mgr-legacy"><div class="am-mgr-card-head"><div><small>CAREER LEGACY</small><h2>${esc(legacyStatus())}</h2></div><span>${esc(rep.current)} reputation</span></div><div class="am-mgr-legacy-grid">${statBox('Olympic Gold',stats.olympicGolds)}${statBox('World Medals',stats.worldMedals)}${statBox('Records',stats.records)}${statBox('Nations Managed',(career().nationsManaged||[]).length)}</div><p>${esc(careerBiography())}</p></section>`}

function impactHTML(){
 const impact=programmeImpact();if(!impact.available)return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>PROGRAMME IMPACT</small><h2>${esc(nationLabel(currentNation()))}</h2></div></div>${emptyState('Historic baseline unavailable',impact.reason)}<div class="am-mgr-current-baseline">${statBox('Current Squad',impact.current.squadSize)}${statBox('Staff Squad Assessment',impact.current.squadStrength||'—')}${statBox('Elite Athletes',impact.current.eliteCount)}${statBox('Facilities',`L${impact.current.facilityAverage}`)}</div></section>`;
 const b=impact.base,c=impact.current,delta=(x,y,format=v=>String(v))=>`${format(x)} → ${format(y)}`;return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>PROGRAMME IMPACT</small><h2>Your impact at ${esc(nationLabel(currentNation()))}</h2></div><span>Since ${b.startSeason}</span></div><div class="am-mgr-impact-grid">${statBox('Squad Staff Assessment',delta(b.squadStrength,c.squadStrength))}${statBox('Elite Athletes',delta(b.eliteCount,c.eliteCount))}${statBox('Squad Size',delta(b.squadSize,c.squadSize))}${statBox('Facilities',delta(b.facilityAverage,c.facilityAverage,v=>`L${v}`))}${b.rank&&c.rank?statBox('Programme Rank',`#${b.rank} → #${c.rank}`):''}</div></section>`;
}

function greatestHTML(){const athlete=greatestAthletes(1)[0],discovery=greatestDiscovery();return `<div class="am-mgr-two"><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>GREATEST ATHLETE CONNECTION</small><h2>${athlete?esc(athlete.name):'Still to emerge'}</h2></div></div>${athlete?athleteButton(athlete.id,athlete.name,`${athlete.wins} wins · ${athlete.majorMedals} major medals · ${athlete.records} records`):emptyState('No defining athlete yet','Career athlete connections will emerge from real results over time.')}</section><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>GREATEST DISCOVERY</small><h2>${discovery?esc(discovery.name):'Still to emerge'}</h2></div></div>${discovery?athleteButton(discovery.id,discovery.name,`${discovery.wins} wins · ${discovery.majorMedals} major medals · ${discovery.records} records`):emptyState('No major discovery yet','A scouted prospect who becomes a major performer will appear here.')}</section></div>`}

function recentMilestonesHTML(){const events=[...careerStore().events].sort((a,b)=>b.season-a.season||b.week-a.week).slice(0,8);return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>RECENT MILESTONES</small><h2>Career feed</h2></div><span>${careerStore().events.length} logged moments</span></div>${events.length?`<div class="am-mgr-timeline compact">${events.map(timelineEntry).join('')}</div>`:emptyState('Your career log is ready','Meaningful results and decisions will begin filling the timeline.')}</section>`}

function profileEditorHTML(){return `<details class="am-mgr-profile-editor"><summary>Profile details</summary><div><label>Manager name<input id="managerCareerName" maxlength="60" value="${esc(management().name||'Performance Director')}"></label><button type="button" class="am-button am-button--secondary" data-manager-save-name>SAVE NAME</button></div><p>Only your displayed manager name is editable here. Career history and results remain attached to the same manager ID.</p></details>`}

function overviewHTML(){return `<div class="am-mgr-dashboard"><div class="am-mgr-main-column">${currentJobHTML()}${impactHTML()}${recentMilestonesHTML()}</div><div class="am-mgr-side-column">${objectivesHTML()}${highlightsHTML()}${legacyHTML()}</div></div>${greatestHTML()}${profileEditorHTML()}`}

function timelineEntry(e){const icon={appointment:'JOB',review:'REV',medal:'MED',record:'REC',milestone:'MILE',scouting:'SCOUT',programme:'PROG',athlete:'ATH',reputation:'REP',season:'YEAR',title:'WIN'}[e.type]||'CAREER';const athleteId=e.data?.athleteId;return `<article class="am-mgr-timeline-row"><div class="am-mgr-timeline-mark">${icon}</div><div><time>${e.season} · Week ${e.week}</time><strong>${esc(e.title)}</strong><p>${esc(e.detail)}</p>${athleteId?athleteButton(athleteId,athleteById(athleteId)?.name||e.title,'Open athlete profile'):''}</div></article>`}

function seasonCardsHTML(){
 const years=uniq([...(career().seasonHistory||[]).map(x=>safeNumber(x.season)),nowSeason()]).filter(Boolean).sort((a,b)=>b-a);return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>SEASON ARCHIVE</small><h2>${years.length} season${years.length===1?'':'s'}</h2></div><span>Historical snapshots</span></div><div class="am-mgr-season-grid">${years.map(year=>{const snap=careerStore().seasons[String(year)],current=year===nowSeason();const summary=(career().seasonHistory||[]).find(x=>safeNumber(x.season)===year);const nation=snap?.nation||summary?.nation||currentNation();return `<button type="button" class="am-mgr-season-card ${current?'current':''}" data-manager-season="${year}"><small>${current?'CURRENT SEASON':`CAREER YEAR ${snap?.careerYear||summary?.careerYear||'—'}`}</small><strong>${year}</strong><span>${esc(nationFlag(nation))} ${esc(nationLabel(nation))}</span><em>${snap?.available?`${safeNumber(snap.wins)} wins · ${safeNumber(snap.records)} records`:summary?`Final rank ${summary.rank?'#'+summary.rank:'—'} · ${safeNumber(summary.records)} records`:'Season in progress'}</em></button>`}).join('')}</div></section>`;
}

function jobHistoryHTML(){
 const rows=(career().tenures||[]).map((t,i)=>{const start=safeNumber(t.startSeason),end=safeNumber(t.endSeason)||nowSeason(),jobRows=managerResults().filter(r=>r.nation===t.nation&&r.season>=start&&r.season<=end),stats=aggregateRows(jobRows);const current=!t.endSeason;return `<article class="am-mgr-job-history ${current?'current':''}"><div><small>${current?'CURRENT ROLE':'FORMER ROLE'}</small><h3>${esc(nationFlag(t.nation))} ${esc(nationLabel(t.nation))}</h3><p>${start}–${current?'Present':end} · ${Math.max(1,end-start+1)} season${end-start+1===1?'':'s'}</p></div><div>${statBox('Wins',stats.wins)}${statBox('Major Medals',stats.majorMedals)}${statBox('Records',stats.records)}${statBox('Olympic Gold',stats.olympicGolds)}</div></article>`}).reverse();return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>JOB HISTORY</small><h2>${rows.length} national programme${rows.length===1?'':'s'}</h2></div></div><div class="am-mgr-job-history-list">${rows.join('')}</div></section>`;
}

function aggregateRows(rows){const wins=rows.filter(r=>r.place===1),olympic=rows.filter(r=>r.olympic&&r.place<=3),world=rows.filter(r=>!r.olympic&&isWorldEvent(r.event)&&r.place<=3),continental=rows.filter(r=>!r.olympic&&isContinentalEvent(r.event)&&r.place<=3);return {wins:wins.length,podiums:rows.filter(r=>r.place<=3).length,majorMedals:olympic.length+world.length+continental.length,olympicGolds:olympic.filter(r=>r.place===1).length,records:rows.reduce((n,r)=>n+recordCodes(r).length,0)}}

function contractHistoryHTML(){const rows=[...careerStore().contracts].reverse();return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>CONTRACT HISTORY</small><h2>Appointments & Olympic cycles</h2></div></div>${rows.length?`<div class="am-mgr-contract-list">${rows.map(c=>`<article><span class="am-mgr-state ${statusClass(c.status)}">${esc(c.status)}</span><div><strong>${esc(nationFlag(c.nation))} ${esc(nationLabel(c.nation))} · ${esc(c.type)}</strong><p>${c.startSeason}${c.endSeason?'–'+c.endSeason:'–Present'} · ${esc(c.outcome||'')}</p></div></article>`).join('')}</div>`:emptyState('No contract history yet','Your appointment and future Olympic-cycle decisions will appear here.')}</section>`}

function firstsHTML(){const items=firsts();return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>CAREER FIRSTS</small><h2>The moments that started it</h2></div></div>${items.length?`<div class="am-mgr-firsts">${items.map(([label,row])=>`<article><small>${esc(label)}</small><strong>${esc(row.name||row.event||'Career milestone')}</strong><span>${row.season} · Week ${row.week}${row.event?' · '+esc(row.event):''}</span></article>`).join('')}</div>`:emptyState('Firsts still to come','Your first win, medal, record and discovery will be preserved here.')}</section>`}

function careerHTML(){
 const events=[...careerStore().events].sort((a,b)=>b.season-a.season||b.week-a.week),pageSize=60,start=timelinePage*pageSize,page=events.slice(start,start+pageSize),pages=Math.max(1,Math.ceil(events.length/pageSize));
 return `${seasonCardsHTML()}<div class="am-mgr-two">${jobHistoryHTML()}${contractHistoryHTML()}</div>${firstsHTML()}<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>CAREER TIMELINE</small><h2>${events.length} meaningful moments</h2></div><div class="am-mgr-pager"><button type="button" data-manager-timeline="newer" ${timelinePage===0?'disabled':''}>NEWER</button><span>${timelinePage+1}/${pages}</span><button type="button" data-manager-timeline="older" ${timelinePage>=pages-1?'disabled':''}>OLDER</button></div></div>${page.length?`<div class="am-mgr-timeline">${page.map(timelineEntry).join('')}</div>`:emptyState('Timeline ready','Meaningful career events will be stored here without logging routine clicks or screen visits.')}</section>`;
}

function medalCabinetHTML(){const stats=careerStats('career');return `<section class="am-mgr-card am-mgr-medals"><div class="am-mgr-card-head"><div><small>MAJOR MEDAL RECORD</small><h2>${stats.majorMedals} major medals</h2></div></div><div class="am-mgr-medal-row"><div class="gold"><i>G</i><strong>${stats.medals.g}</strong><span>Olympic Gold</span></div><div class="silver"><i>S</i><strong>${stats.medals.s}</strong><span>Olympic Silver</span></div><div class="bronze"><i>B</i><strong>${stats.medals.b}</strong><span>Olympic Bronze</span></div><div><i>W</i><strong>${stats.worldMedals}</strong><span>World Medals</span></div></div></section>`}

function olympicRecordHTML(){const games=olympicHistory(),best=[...games].sort((a,b)=>b.total-a.total||b.g-a.g)[0];return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>OLYMPIC RECORD</small><h2>${games.length?`${games.length} Games managed`:'First Games ahead'}</h2></div></div>${games.length?`<div class="am-mgr-olympic-summary">${statBox('Gold',games.reduce((n,x)=>n+x.g,0))}${statBox('Silver',games.reduce((n,x)=>n+x.s,0))}${statBox('Bronze',games.reduce((n,x)=>n+x.b,0))}${statBox('Best Games',best?best.season:'—',best?`${best.total} medals`:'' )}</div><div class="am-mgr-olympic-cycles">${games.map(g=>`<article><strong>${g.season} · ${esc(g.event)}</strong><span>${g.g}G · ${g.s}S · ${g.b}B</span></article>`).join('')}</div>`:emptyState('No Olympic Games managed yet',`Your Olympic record will begin when the programme reaches its first Games.`)}</section>`}

function honoursHTML(){const items=honours().slice(0,80);return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>MAJOR HONOURS</small><h2>${items.length} recorded titles</h2></div></div>${items.length?`<div class="am-mgr-honours">${items.map(r=>`<article><span>${r.olympic?'OLYMPIC':isWorldEvent(r.event)?'WORLD':r.national?'NATIONAL':'MAJOR'}</span><div>${athleteButton(r.id,r.name,disciplineLabel(r.disc))}<p>${esc(r.event)} · ${r.season} · ${performanceText(r.disc,r.perf)}</p></div></article>`).join('')}</div>`:emptyState('The trophy cabinet is waiting','Major titles will appear here with the athlete, event, year and performance.')}</section>`}

function recordHistoryHTML(){const items=recordMoments().slice(0,80);return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>RECORDS UNDER MANAGEMENT</small><h2>${careerStats('career').records} record achievements</h2></div></div>${items.length?`<div class="am-mgr-records">${items.map(r=>`<article><strong>${esc(recordCodes(r).join(' · '))}</strong><div>${athleteButton(r.id,r.name,disciplineLabel(r.disc))}<p>${r.season} · ${esc(r.event)} · ${performanceText(r.disc,r.perf)}</p></div></article>`).join('')}</div>`:emptyState('No records yet','National, championship and world records achieved under your programme will appear here.')}</section>`}

function managerRecordsHTML(){const r=managerRecords(),cards=[['Most wins in one season',r.wins,'wins'],['Most podiums in one season',r.podiums,'podiums'],['Most major medals in one season',r.majorMedals,'majorMedals'],['Most records in one season',r.records,'records']];return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>MANAGER RECORDS</small><h2>Personal career bests</h2></div></div><div class="am-mgr-record-grid">${cards.map(([label,x,key])=>x&&x[key]>0?statBox(label,x[key],String(x.season)):statBox(label,'—','Not established yet')).join('')}</div></section>`}

function achievementsHTML(){return `${medalCabinetHTML()}<div class="am-mgr-two">${olympicRecordHTML()}${managerRecordsHTML()}</div>${honoursHTML()}${recordHistoryHTML()}<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>CAREER MILESTONES</small><h2>${Object.keys(careerStore().milestones).length} unlocked</h2></div></div><div class="am-mgr-milestones">${Object.values(careerStore().milestones).sort((a,b)=>b.season-a.season||b.week-a.week).map(m=>`<article><span>${m.season}</span><div><strong>${esc(m.title)}</strong><p>${esc(m.detail)}</p></div></article>`).join('')||emptyState('Milestones will build naturally','Only meaningful career thresholds are recorded; routine actions do not create achievement spam.')}</div></section>`}

function scopeButton(id,label){return `<button type="button" class="${statsScope===id?'on':''}" data-manager-scope="${id}">${label}</button>`}
function statisticsHTML(){
 const stats=careerStats(statsScope),rows=stats.rows,groups=['Sprints','Distance','Jumps','Throws'];
 return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>CAREER ANALYSIS</small><h2>Statistics</h2></div><div class="am-mgr-segment">${scopeButton('career','CAREER')}${scopeButton('job','CURRENT JOB')}${scopeButton('season','CURRENT SEASON')}</div></div><div class="am-mgr-stat-grid">${statBox('Competitions',stats.competitions)}${statBox('Athlete Entries',stats.entries)}${statBox('Event Wins',stats.wins)}${statBox('Podiums',stats.podiums)}${statBox('Major Medals',stats.majorMedals)}${statBox('Olympic Medals',stats.olympicMedals)}${statBox('National Titles',stats.nationalTitles)}${statBox('Records',stats.records)}${statBox('Athletes Used',stats.athletesManaged)}${statBox('Scouting Discoveries',stats.athletesDiscovered)}</div></section>
 <div class="am-mgr-two"><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>EVENT GROUP PERFORMANCE</small><h2>Entries by discipline family</h2></div></div><div class="am-mgr-bars">${groups.map(g=>{const count=stats.groups[g]||0,max=Math.max(1,...Object.values(stats.groups));return `<div><span>${g}</span><i><b style="width:${Math.round(count/max*100)}%"></b></i><strong>${count}</strong></div>`}).join('')}</div></section><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>PROGRAMME BALANCE</small><h2>Men / Women</h2></div></div><div class="am-mgr-stat-grid compact">${statBox("Men's Entries",stats.gender.Men)}${statBox("Women's Entries",stats.gender.Women)}${statBox('World Records',stats.worldRecords)}${statBox('National Records',stats.nationalRecords)}</div></section></div>
 ${statsScope==='career'?developmentStatsHTML():''}${rows.length?'':emptyState('No results in this scope','Statistics will appear when athletes from this period compete.')}`;
}

function developmentStatsHTML(){const mc=careerStore(),d=developmentSummary(mc),disc=discoveryIds(mc),scoutedMedalists=new Set(managerResults().filter(r=>disc.has(r.id)&&isMajorEventRecord(r)&&r.place<=3).map(r=>r.id));return `<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>DEVELOPMENT & TALENT LEGACY</small><h2>Pathway outcomes</h2></div></div><div class="am-mgr-stat-grid">${statBox('Tracked Baselines',d.tracked)}${statBox('Athletes +5 Ability',d.developed)}${statBox('Developed to World Class',d.elite)}${statBox('Scouted Major Medalists',scoutedMedalists.size)}${statBox('Prospects Discovered',disc.size)}</div><p class="am-mgr-caption">For older Alpha careers, development totals begin only where a reliable saved baseline exists. Missing historic starting values are never invented.</p></section>`}

function reputationHTML(){
 const mc=careerStore(),rep=mc.reputation,f=federationConfidence(),good=f.reasonsGood,concern=f.reasonsConcern;
 return `<div class="am-mgr-two"><section class="am-mgr-card am-mgr-reputation"><div class="am-mgr-card-head"><div><small>MANAGER REPUTATION</small><h2>${esc(rep.current)}</h2></div><span>Peak · ${esc(rep.peak||rep.current)}</span></div><p>Reputation is earned from real wins, major medals, records, programme development and long-term results. It is not an automatic season counter.</p><div class="am-mgr-rep-track"><i style="width:${clampValue(rep.score,0,100)}%"></i></div><div class="am-mgr-rep-tiers">${REPUTATION_TIERS.slice().reverse().map(([,name])=>`<span class="${name===rep.current?'on':''}">${esc(name)}</span>`).join('')}</div></section><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>FEDERATION STANDING</small><h2>${esc(f.label)}</h2></div><span>${esc(nationLabel(currentNation()))}</span></div><div class="am-mgr-reasons">${good.map(x=>`<p class="positive">${esc(x)}</p>`).join('')}${concern.map(x=>`<p class="concern">${esc(x)}</p>`).join('')}</div></section></div><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>REPUTATION HISTORY</small><h2>Major standing changes</h2></div></div><div class="am-mgr-rep-history">${rep.history.slice().reverse().map(x=>`<article><span>${x.season} · W${x.week}</span><strong>${esc(x.tier)}</strong><p>${x.baseline?'Historical tracking baseline established from the career data available at migration.':'Reputation tier changed after new career evidence.'}</p></article>`).join('')}</div></section>`;
}

function philosophyHTML(){
 const p=philosophy(),g=greatestDiscovery(),d=developmentSummary(careerStore());return `<section class="am-mgr-card am-mgr-philosophy"><div class="am-mgr-card-head"><div><small>MANAGEMENT PHILOSOPHY</small><h2>${esc(p.primary.name)}</h2></div><span>Derived from your decisions</span></div><p>${esc(p.primary.detail)}</p>${p.secondary?`<div class="am-mgr-secondary-style"><small>SECONDARY TENDENCY</small><strong>${esc(p.secondary.name)}</strong><p>${esc(p.secondary.detail)}</p></div>`:''}<div class="am-mgr-behaviour-grid">${statBox('Squad Call-Ups',p.metrics.callups)}${statBox('Young Call-Ups',p.metrics.youngCallups)}${statBox('Scouted Promotions',p.metrics.scoutedCallups)}${statBox('Squad Drops',p.metrics.drops)}${statBox('Completed Camps',p.metrics.camps)}${statBox('Facility Investments',p.metrics.facilities)}</div><p class="am-mgr-caption">These labels describe what you have actually done. They do not lock future decisions or alter hidden gameplay outcomes.</p></section><div class="am-mgr-two"><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>DEVELOPMENT LEGACY</small><h2>${d.developed} confirmed development success${d.developed===1?'':'es'}</h2></div></div><div class="am-mgr-stat-grid compact">${statBox('Tracked',d.tracked)}${statBox('+5 Ability',d.developed)}${statBox('World-Class Development',d.elite)}</div></section><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>SCOUTING LEGACY</small><h2>${g?esc(g.name):'Still being built'}</h2></div></div>${g?athleteButton(g.id,g.name,`${g.wins} wins · ${g.majorMedals} major medals · ${g.records} records`):emptyState('No defining scouting success yet','A prospect discovered by your network can grow into this career-defining slot.')}</section></div>`;
}

function seasonDetailHTML(year){
 const mc=careerStore(),snap=mc.seasons[String(year)],summary=(career().seasonHistory||[]).find(x=>safeNumber(x.season)===safeNumber(year)),rows=managerResults().filter(r=>r.season===safeNumber(year)),stats=aggregateRows(rows);if(!snap&&!summary&&year!==nowSeason())return emptyState('Season data unavailable','No reliable archive exists for this season.');
 const nation=snap?.nation||summary?.nation||currentNation(),available=snap?.available;
 return `<section class="am-mgr-season-detail"><button type="button" class="am-button am-button--ghost" data-manager-season-back>← BACK TO CAREER</button><div class="am-mgr-season-hero"><div><small>SEASON ARCHIVE</small><h2>${year}</h2><p>${esc(nationFlag(nation))} ${esc(nationLabel(nation))}${available?` · Career Year ${snap.careerYear}`:''}</p></div><span class="am-mgr-state ${available?'good':'warn'}">${available?'FULL SNAPSHOT':'PARTIAL ARCHIVE'}</span></div>${!available?`<div class="am-mgr-migration-note">${esc(snap?.reason||'This season predates the full snapshot system. Only reliable archived fields are shown.')}</div>`:''}<div class="am-mgr-stat-grid">${statBox('Final Rank',(snap?.rank||summary?.rank)?`#${snap?.rank||summary?.rank}`:'—')}${statBox('Wins',available?snap.wins:stats.wins)}${statBox('Podiums',available?snap.podiums:stats.podiums)}${statBox('Major Medals',available?snap.majorMedals:stats.majorMedals)}${statBox('Records',available?snap.records:safeNumber(summary?.records)||stats.records)}${available?statBox('Federation',snap.federation):''}</div>${available?`<div class="am-mgr-two"><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>SEASON-END PROGRAMME</small><h2>Saved snapshot</h2></div></div><div class="am-mgr-stat-grid compact">${statBox('Squad',snap.squadSize)}${statBox('Staff Assessment',snap.squadStrength)}${statBox('Elite Athletes',snap.eliteCount)}${statBox('Facilities',`L${snap.facilityAverage}`)}${statBox('Funding',moneyText(snap.funding))}</div></section><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>TOP ATHLETE</small><h2>${snap.topAthlete?esc(snap.topAthlete.name):'No season leader'}</h2></div></div>${snap.topAthlete?athleteButton(snap.topAthlete.id,snap.topAthlete.name,`${snap.topAthlete.wins} wins · ${snap.topAthlete.podiums} podiums`):emptyState('No competition data','No athlete result was available for the snapshot.')}</section></div><section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>HISTORIC SQUAD</small><h2>${snap.squad.length} athletes</h2></div></div><div class="am-mgr-historic-squad">${snap.squad.map(a=>`<article><strong>${esc(a.name)}</strong><span>${esc(disciplineLabel(a.disc))} · Age ${a.age}</span><em>Staff ability ${esc(a.abilityText)} · PB ${performanceText(a.disc,a.pb)}</em></article>`).join('')}</div></section>`:''}<section class="am-mgr-card"><div class="am-mgr-card-head"><div><small>SEASON RESULTS</small><h2>${rows.length} athlete results</h2></div></div>${rows.length?`<div class="am-mgr-season-results">${rows.slice().reverse().slice(0,100).map(r=>`<article><span>#${r.place}</span><div>${athleteButton(r.id,r.name,disciplineLabel(r.disc))}<p>${esc(r.event)} · ${performanceText(r.disc,r.perf)} ${recordCodes(r).length?'· '+esc(recordCodes(r).join(' / ')):''}</p></div></article>`).join('')}</div>`:emptyState('No archived competition results','This season has no manager result rows available.')}</section></section>`;
}

function tabContent(){if(activeTab==='career')return seasonFocus?seasonDetailHTML(seasonFocus):careerHTML();if(activeTab==='achievements')return achievementsHTML();if(activeTab==='statistics')return statisticsHTML();if(activeTab==='reputation')return reputationHTML();if(activeTab==='philosophy')return philosophyHTML();return overviewHTML()}

function profileHTML(){
 return `<div class="am-manager-profile-shell"><header class="am-mgr-top"><div><small>ATHLETICS MANAGER</small><strong>My Profile · Career Headquarters</strong></div><button type="button" class="am-button am-button--ghost" data-manager-close>← BACK</button></header><div class="am-manager-profile-scroll">${heroHTML()}<nav class="am-mgr-tabs" role="tablist" aria-label="Manager profile sections">${tabButton('overview','OVERVIEW')}${tabButton('career','CAREER')}${tabButton('achievements','ACHIEVEMENTS')}${tabButton('statistics','STATISTICS')}${tabButton('reputation','REPUTATION')}${tabButton('philosophy','PHILOSOPHY')}</nav><main class="am-mgr-content" role="tabpanel">${tabContent()}</main><footer class="am-mgr-footer"><span>Manager ID · ${MANAGER_ID}</span><span>${esc(typeof careerLabel==='function'?careerLabel():`Career Year ${careerYear()}`)}</span></footer></div></div>`;
}

function bindProfile(dialog){
 dialog.querySelector('[data-manager-close]')?.addEventListener('click',()=>dialog.close());
 dialog.querySelectorAll('[data-manager-tab]').forEach(button=>button.addEventListener('click',()=>{activeTab=button.dataset.managerTab;seasonFocus=null;timelinePage=0;restoreScroll=0;renderProfile(false);requestAnimationFrame(()=>dialog.querySelector(`[data-manager-tab="${activeTab}"]`)?.focus())}));
 dialog.querySelectorAll('[data-manager-scope]').forEach(button=>button.addEventListener('click',()=>{statsScope=button.dataset.managerScope;renderProfile(true)}));
 dialog.querySelectorAll('[data-manager-season]').forEach(button=>button.addEventListener('click',()=>{activeTab='career';seasonFocus=safeNumber(button.dataset.managerSeason);restoreScroll=0;renderProfile(false)}));
 dialog.querySelector('[data-manager-season-back]')?.addEventListener('click',()=>{seasonFocus=null;restoreScroll=0;renderProfile(false)});
 dialog.querySelectorAll('[data-manager-timeline]').forEach(button=>button.addEventListener('click',()=>{const pages=Math.max(1,Math.ceil(careerStore().events.length/60));timelinePage=clampValue(timelinePage+(button.dataset.managerTimeline==='older'?1:-1),0,pages-1);renderProfile(false)}));
 dialog.querySelectorAll('[data-manager-athlete]').forEach(button=>button.addEventListener('click',()=>openAthleteFromManager(button.dataset.managerAthlete)));
 dialog.querySelector('[data-manager-save-name]')?.addEventListener('click',()=>{const input=byId('managerCareerName'),next=input?.value.trim().slice(0,60);if(!next)return;management().name=next;s.managerName=next;persist();renderProfile(true);if(typeof toast==='function')toast('Manager name updated')});
}

function renderProfile(preserve=true){
 const dialog=byId('managementProfile');if(!dialog)return;const oldScroll=dialog.querySelector('.am-manager-profile-scroll')?.scrollTop||0;if(preserve)restoreScroll=oldScroll;dialog.classList.add('am-manager-profile-dialog');dialog.innerHTML=profileHTML();bindProfile(dialog);if(!dialog.open)dialog.showModal();requestAnimationFrame(()=>{const scroller=dialog.querySelector('.am-manager-profile-scroll');if(scroller)scroller.scrollTop=restoreScroll||0});
}

function openAthleteFromManager(id){
 if(!id||typeof openAthleteProfile!=='function')return;const dialog=byId('managementProfile'),scroller=dialog?.querySelector('.am-manager-profile-scroll');const state={tab:activeTab,season:seasonFocus,scroll:scroller?.scrollTop||0,scope:statsScope,page:timelinePage};
 if(dialog?.open)dialog.close();const athleteDialog=byId('athleteProfile');let handled=false;const onClose=()=>{if(handled)return;handled=true;activeTab=state.tab;seasonFocus=state.season;statsScope=state.scope;timelinePage=state.page;restoreScroll=state.scroll;setTimeout(()=>window.openManagerProfile(),0)};athleteDialog?.addEventListener('close',onClose,{once:true});openAthleteProfile(id);
}

function openManagerProfileV1(){
 try{syncAll();persist()}catch(err){console.warn('Manager Career V1 sync warning',err)}
 const dialog=byId('managementProfile');if(!dialog)return;if(dialog.open)dialog.close();dialog.classList.add('am-manager-profile-dialog');const cleanup=()=>dialog.classList.remove('am-manager-profile-dialog');dialog.addEventListener('close',cleanup,{once:true});renderProfile(false);
}

function hook(name,after){
 const original=window[name];if(typeof original!=='function'||original.__managerCareerHook)return;
 const wrapped=function(...args){const before={nation:currentNation(),season:nowSeason(),week:nowWeek()};const result=original.apply(this,args);try{after({args,result,before})}catch(err){console.warn(`Manager Career V1 hook ${name} failed`,err)}return result};wrapped.__managerCareerHook=true;wrapped.__managerCareerOriginal=original;window[name]=wrapped;
}

function installHooks(){
 hook('recordManagementResults',()=>{syncAll();persist()});
 hook('generateProspects',ctx=>{const mc=careerStore();recordFreshDiscoveries(mc,ctx.result,ctx.args?.[1]);syncAll();persist()});
 hook('finaliseSquadAgreementCallUp',ctx=>{if(!ctx.result)return;const a=athleteById(ctx.args?.[0]);if(a){const mc=careerStore();addEvent(mc,`callup:${a.id}:${nowSeason()}:${nowWeek()}`,'athlete',`${a.name} called into the national squad`,`${ctx.args?.[1]}-week National Squad Agreement.`,{athleteId:a.id});syncAll();persist()}});
 hook('upgradeFacility',ctx=>{const mc=careerStore();syncFacilityEvents(mc);syncAll();persist()});
 hook('signAppointmentContract',ctx=>{const mc=careerStore();captureArrival(mc,currentNation(),true);addEvent(mc,`initial-contract:${currentNation()}:${nowSeason()}`,'appointment',`Accepted ${nationLabel(currentNation())} appointment`,`Four-year national Performance Director contract accepted.`,{nation:currentNation()});syncAll();persist()});
 hook('acceptCareerJob',ctx=>{const moved=ctx.before.nation!==currentNation(),mc=careerStore();captureArrival(mc,currentNation(),true);addEvent(mc,`career-job:${currentNation()}:${nowSeason()}:${safeNumber(career().cycleNumber)}`,'appointment',moved?`Joined ${nationLabel(currentNation())}`:`Renewed with ${nationLabel(currentNation())}`,moved?'A new national programme role began at the start of the Olympic cycle.':'A new four-year Olympic-cycle contract was accepted.',{nation:currentNation()});syncAll({captureArrival:true});persist()});
 hook('recordCareerSeason',ctx=>{const mc=careerStore(),summary=ctx.result,year=String(summary?.season||nowSeason());mc.seasons[year]=buildSeasonSnapshot(summary);addEvent(mc,`season:${year}:${currentNation()}`,'season',`${year} season archived`,`Season snapshot saved with programme rank, results, squad, federation standing and resources.`,{season:year},{season:safeNumber(year),week:52,nation:currentNation()});syncAll();persist()});
 hook('openCareerLegacy',()=>{syncAll();persist()});
}

function publicSnapshot(){const mc=syncAll(),stats=careerStats('career'),f=federationConfidence();return {version:VERSION,managerId:mc.managerId,name:management().name||'Performance Director',nation:currentNation(),careerYear:careerYear(),eventCount:mc.events.length,milestones:Object.keys(mc.milestones).length,seasons:Object.keys(mc.seasons).length,contracts:mc.contracts.length,reputation:{...mc.reputation},federation:{label:f.label,score:f.score},stats:{wins:stats.wins,podiums:stats.podiums,majorMedals:stats.majorMedals,records:stats.records,athletesManaged:stats.athletesManaged,athletesDeveloped:stats.athletesDeveloped},migration:{...mc.migration}}}

function initialise(){
 try{installHooks();syncAll();const shortcut=byId('myProfileShortcut');if(shortcut)shortcut.onclick=()=>window.openManagerProfile();const mobile=byId('mobileMyProfile');if(mobile)mobile.onclick=()=>{byId('mobileNavDrawer')?.setAttribute('hidden','');window.openManagerProfile()};window.openManagerProfile=openManagerProfileV1;if(s?.appointment?.contractSigned||localStorage.getItem('rto_full_game_v1'))persist()}catch(err){console.error('Manager Career V1 failed to initialise',err)}
}

window.__athleticsManagerCareerV1={version:VERSION,ensure:()=>careerStore(),sync:()=>syncAll(),stats:scope=>careerStats(scope||'career'),snapshot:publicSnapshot,events:()=>[...careerStore().events],open:()=>window.openManagerProfile(),debug:()=>({store:careerStore(),philosophy:philosophy(),impact:programmeImpact(),confidence:federationConfidence()})};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialise,{once:true});else initialise();
})();
