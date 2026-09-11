/* Athletics Manager — Manager Career & My Profile V1
   Authoritative career presentation built from existing gameplay systems.
   Historical snapshots are persisted; the profile never fabricates unavailable legacy data. */
(function(){
'use strict';

const VERSION='1.0.0';
const MODEL_VERSION=1;
const PROFILE_TABS=['overview','career','achievements','statistics','reputation','philosophy'];
const REPUTATION_TIERS=[
 {min:0,name:'Unknown'},
 {min:18,name:'Emerging'},
 {min:30,name:'National'},
 {min:43,name:'Established'},
 {min:56,name:'Continental'},
 {min:68,name:'Elite'},
 {min:82,name:'World Class'},
 {min:94,name:'Legendary'}
];

let activeTab='overview';
let statsScope='career';
let profileReturn=null;
let syncing=false;

const safe=(fn,fallback=null)=>{try{return fn()}catch(_){return fallback}};
const esc=value=>safe(()=>profileEscape(String(value??'')),String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])));
const nowSeason=()=>Number(s?.game?.season)||0;
const nowWeek=()=>Number(s?.game?.week)||1;
const currentNation=()=>safe(()=>managedNation(),s?.managedNation||'GREAT BRITAIN');
const nationLabel=n=>safe(()=>nationName(n),n||'National Programme');
const nationFlag=n=>safe(()=>flag(n),'');
const formatMoney=v=>safe(()=>money(Number(v)||0),'£'+Math.round(Number(v)||0).toLocaleString());
const discName=d=>safe(()=>discLabel(d),d||'Event');
const fmtPerformance=(d,v)=>safe(()=>fmtPerf(d,Number(v)),Number(v).toFixed(2));
const resultKey=r=>`${r.season}:${r.week}:${r.event}:${r.disc}`;
const rowAthleteId=r=>r.id||r.athleteId||null;
const resultNation=r=>r.rows?.find(Boolean)?.nation||null;

function model(){
 const m=managementState();
 if(!m.careerProfile||Number(m.careerProfile.version)!==MODEL_VERSION){
  const prior=m.careerProfile||{};
  m.careerProfile={
   version:MODEL_VERSION,
   managerId:prior.managerId||'player-manager',
   events:Array.isArray(prior.events)?prior.events:[],
   milestones:prior.milestones&&typeof prior.milestones==='object'?prior.milestones:{},
   snapshots:Array.isArray(prior.snapshots)?prior.snapshots:[],
   arrivals:prior.arrivals&&typeof prior.arrivals==='object'?prior.arrivals:{},
   reputation:prior.reputation&&typeof prior.reputation==='object'?prior.reputation:{current:0,peak:0,history:[]},
   decisions:prior.decisions&&typeof prior.decisions==='object'?prior.decisions:{callups:0,youthCallups:0,longAgreements:0,shortAgreements:0,poolReturns:0,scoutedCallups:0,staffAppointments:0,facilityUpgrades:0},
   migration:{createdSeason:nowSeason(),createdWeek:nowWeek(),legacyBackfill:true}
  };
 }
 const cp=m.careerProfile;
 cp.events??=[];cp.milestones??={};cp.snapshots??=[];cp.arrivals??={};cp.reputation??={current:0,peak:0,history:[]};cp.reputation.history??=[];
 cp.decisions??={callups:0,youthCallups:0,longAgreements:0,shortAgreements:0,poolReturns:0,scoutedCallups:0,staffAppointments:0,facilityUpgrades:0};
 cp.migration??={createdSeason:nowSeason(),createdWeek:nowWeek(),legacyBackfill:true};
 return cp;
}

function rawResults(){
 const values=safe(()=>importManagerResults(),[])||[];
 return [...values].filter(x=>x&&Array.isArray(x.rows)).sort((a,b)=>(a.season-b.season)||(a.week-b.week)||String(a.event).localeCompare(String(b.event)));
}

function flattenRows(results=rawResults()){
 const out=[];
 for(const res of results){
  for(const row of res.rows||[])out.push({...row,_result:res,_season:res.season,_week:res.week,_event:res.event,_disc:res.disc,_nation:row.nation||resultNation(res)});
 }
 return out;
}

function eventGroup(d){
 const code=String(d||'').toUpperCase();
 if(/SP|DT|HT|JT|THROW/.test(code))return 'Throws';
 if(/HJ|LJ|TJ|PV|JUMP/.test(code))return 'Jumps';
 if(/800|1500|3000|5000|10000|XC|DIST/.test(code))return 'Distance';
 return 'Sprints';
}

function isWorldLevel(res){return !res.national&&!res.olympic&&/world|global/i.test(String(res.event||''));}
function isMajorResult(res){return !!(res.olympic||isWorldLevel(res));}
function medalsForRows(rows){return {g:rows.filter(x=>x.place===1).length,s:rows.filter(x=>x.place===2).length,b:rows.filter(x=>x.place===3).length};}
function medalTotal(m){return (m?.g||0)+(m?.s||0)+(m?.b||0)}

function stats(scope=statsScope){
 const results=rawResults();
 const career=careerState();
 let scoped=results;
 if(scope==='job')scoped=results.filter(r=>resultNation(r)===currentNation());
 if(scope==='season')scoped=results.filter(r=>Number(r.season)===nowSeason()&&resultNation(r)===currentNation());
 const rows=flattenRows(scoped);
 const wins=rows.filter(r=>r.place===1);
 const podiums=rows.filter(r=>r.place<=3);
 const finals=rows.filter(r=>r.place<=8);
 const olympicRows=rows.filter(r=>r._result.olympic);
 const worldRows=rows.filter(r=>isWorldLevel(r._result));
 const majorRows=rows.filter(r=>isMajorResult(r._result));
 const nationalRows=rows.filter(r=>r._result.national);
 const records=rows.filter(r=>(r.achievements||[]).some(a=>a==='WR'||a==='NR'||a==='CR'));
 const wr=rows.filter(r=>(r.achievements||[]).includes('WR'));
 const nr=rows.filter(r=>(r.achievements||[]).includes('NR'));
 const athletes=new Set(rows.map(r=>rowAthleteId(r)||r.name).filter(Boolean));
 const comps=new Set(scoped.map(r=>`${r.season}:${r.week}:${r.event}`));
 const discoveries=(s?.athletes||[]).filter(a=>a?.source==='Scouted'&&career.nationsManaged?.includes(a.nation));
 const developed=(s?.athletes||[]).filter(a=>career.nationsManaged?.includes(a.nation)&&Number(a?.story?.development||0)>=5);
 const debuts=(s?.athletes||[]).filter(a=>career.nationsManaged?.includes(a.nation)&&(a?.story?.memories||[]).some(m=>/debut/i.test(`${m.type||''} ${m.text||''}`)));
 const seasons=scope==='career'?Math.max(1,Number(career.careerYear)||1):scope==='job'?currentTenureYears():1;
 const byGroup={Sprints:{entries:0,wins:0,podiums:0},Distance:{entries:0,wins:0,podiums:0},Jumps:{entries:0,wins:0,podiums:0},Throws:{entries:0,wins:0,podiums:0}};
 const byGender={Men:{entries:0,wins:0,podiums:0},Women:{entries:0,wins:0,podiums:0}};
 for(const r of rows){
  const group=eventGroup(r._disc),gender=String(r._disc||'').startsWith('W')?'Women':'Men';
  byGroup[group].entries++;byGender[gender].entries++;
  if(r.place===1){byGroup[group].wins++;byGender[gender].wins++}
  if(r.place<=3){byGroup[group].podiums++;byGender[gender].podiums++}
 }
 const olympicMedals=medalsForRows(olympicRows.filter(r=>r.place<=3));
 const worldMedals=medalsForRows(worldRows.filter(r=>r.place<=3));
 const majorMedals=medalsForRows(majorRows.filter(r=>r.place<=3));
 return {
  scope,seasons,results:scoped,rows,competitions:comps.size,entries:rows.length,wins:wins.length,podiums:podiums.length,finals:finals.length,
  winPct:rows.length?Math.round(wins.length/rows.length*100):0,podiumPct:rows.length?Math.round(podiums.length/rows.length*100):0,
  olympicMedals,worldMedals,majorMedals,olympicGolds:olympicMedals.g,worldGolds:worldMedals.g,nationalTitles:nationalRows.filter(r=>r.place===1).length,
  records:records.length,worldRecords:wr.length,nationalRecords:nr.length,athletesManaged:athletes.size,athletesDeveloped:developed.length,athletesDiscovered:discoveries.length,debuts:debuts.length,
  byGroup,byGender,careerYears:Number(career.careerYear)||1,nationsManaged:(career.nationsManaged||[]).length
 };
}

function reputationFor(st=stats('career')){
 const cp=model();
 const completed=careerState().completedCycles||[];
 const strongCycles=completed.filter(x=>Number(x.score)>=62).length;
 const careerBase=12+
  Math.min(24,st.wins*.72)+
  Math.min(18,st.podiums*.26)+
  Math.min(18,st.olympicMedals.g*5+st.olympicMedals.s*3+st.olympicMedals.b*2)+
  Math.min(12,st.worldMedals.g*3+st.worldMedals.s*2+st.worldMedals.b)+
  Math.min(12,st.worldRecords*4+st.nationalRecords*.7)+
  Math.min(7,strongCycles*2)+
  Math.min(5,Math.max(0,st.careerYears-1)*.22);
 const recent=(careerState().seasonHistory||[]).slice(-2);
 let penalty=0;
 if(recent.length===2){
  const avg=recent.reduce((t,x)=>t+(Number(x.rank)||10),0)/recent.length;
  if(avg>=10)penalty=8;else if(avg>=7)penalty=4;
 }
 const current=Math.max(0,Math.min(100,Math.round(careerBase-penalty)));
 const peak=Math.max(Number(cp.reputation.peak)||0,current);
 cp.reputation.current=current;cp.reputation.peak=peak;
 const tier=tierFor(current),peakTier=tierFor(peak);
 const last=cp.reputation.history.at(-1);
 if(!last||last.tier!==tier.name){cp.reputation.history.push({season:nowSeason(),week:nowWeek(),score:current,tier:tier.name});cp.reputation.history=cp.reputation.history.slice(-40)}
 return {score:current,tier:tier.name,peakScore:peak,peakTier:peakTier.name,next:nextTier(current)};
}
function tierFor(score){let tier=REPUTATION_TIERS[0];for(const x of REPUTATION_TIERS)if(score>=x.min)tier=x;return tier}
function nextTier(score){return REPUTATION_TIERS.find(x=>x.min>score)||null}

function currentTenure(){const list=careerState().tenures||[];return list.at(-1)||{nation:currentNation(),startSeason:nowSeason(),startCareerYear:careerState().careerYear||1};}
function currentTenureYears(){const t=currentTenure();return Math.max(1,(Number(careerState().careerYear)||1)-(Number(t.startCareerYear)||1)+1);}
function currentContract(){
 const c=careerState(),start=nowSeason()-Math.max(0,(Number(s?.game?.cycleYear)||1)-1),end=start+3;
 let status='Secure';
 if(c.pendingReview)status='Under Review';
 else if(Number(s?.game?.cycleYear)===4&&nowWeek()>=40)status='Expiring Soon';
 return {start,end,status,yearsRemaining:Math.max(0,end-nowSeason()),cycle:Number(c.cycleNumber)||1};
}

function federationState(){
 const b=safe(()=>immersionState().board,null)||{};
 const ranks=safe(()=>nationRanks(),[])||[];
 const rank=Math.max(1,ranks.findIndex(x=>x[0]===currentNation())+1||1);
 const targetRank=Number(b.targetRank)||4;
 const prospects=Array.isArray(b.prospects)?b.prospects.length:0;
 const targetProspects=Math.max(1,Number(b.targetProspects)||2);
 const current=stats('season');
 let score=50;
 score+=rank<=targetRank?18:Math.max(-18,(targetRank-rank)*5);
 score+=prospects>=targetProspects?12:Math.round((prospects/targetProspects)*12)-5;
 score+=Math.min(16,current.podiums*2+current.wins);
 if(Number(s?.game?.week)>=42&&rank>targetRank+3)score-=10;
 score=Math.max(0,Math.min(100,score));
 const label=score>=86?'Excellent':score>=72?'Very Good':score>=60?'Good':score>=47?'Stable':score>=30?'Under Pressure':'Critical';
 const positives=[],concerns=[];
 if(rank<=targetRank)positives.push(`Nation ranking target is being met at #${rank}.`);else concerns.push(`The programme is #${rank}; the federation target is top ${targetRank}.`);
 if(prospects>=targetProspects)positives.push(`${prospects} young athletes have received international opportunities against a target of ${targetProspects}.`);else concerns.push(`Youth opportunity progress is ${prospects}/${targetProspects}.`);
 if(current.podiums>=3)positives.push(`${current.podiums} podium performances have been recorded this season.`);
 else if(nowWeek()>26&&current.podiums===0)concerns.push('No podium performances have been recorded this season yet.');
 const week=nowWeek();
 const objectives=[
  {id:'rank',name:'Nation ranking',value:`#${rank} / Top ${targetRank}`,status:rank<=targetRank?'Completed':rank<=targetRank+2?'On Track':week<36?'At Risk':'Failed'},
  {id:'pathway',name:'Young athlete opportunities',value:`${prospects} / ${targetProspects}`,status:prospects>=targetProspects?'Completed':week<40?'On Track':'At Risk'}
 ];
 return {score,label,rank,targetRank,prospects,targetProspects,positives,concerns,objectives,priority:b.priority||safe(()=>nationalIdentityBlueprint().board.priority,'Deliver competitive progress across the programme.')};
}

function assessmentAverage(list){
 if(!list?.length)return null;
 const vals=list.map(a=>safe(()=>assessmentMid(a,'overall'),null)).filter(Number.isFinite);
 if(!vals.length)return null;
 return Math.round(vals.reduce((t,v)=>t+v,0)/vals.length);
}

function captureArrivalSnapshot(nation=currentNation(),force=false){
 const cp=model();if(cp.arrivals[nation]&&!force)return cp.arrivals[nation];
 const c=careerState(),t=(c.tenures||[]).filter(x=>x.nation===nation).at(-1);
 const currentStart=t&&Number(t.startCareerYear)===Number(c.careerYear);
 if(!force&&!currentStart&&Number(c.careerYear)>1)return null;
 const athletes=(s?.athletes||[]).filter(a=>!a.retired&&a.nation===nation&&a.inSquad!==false);
 const ranks=safe(()=>nationRanks(),[])||[];
 const rank=Math.max(1,ranks.findIndex(x=>x[0]===nation)+1||1);
 cp.arrivals[nation]={nation,season:nowSeason(),careerYear:Number(c.careerYear)||1,rank,squadSize:athletes.length,squadAssessment:assessmentAverage(athletes),eliteAthletes:athletes.filter(a=>a.tier==='Elite').length,budget:Number(s?.funding)||0,facilities:safe(()=>({sprint:facilityLevel('sprint'),field:facilityLevel('field'),recovery:facilityLevel('recovery')}),null),captured:true};
 return cp.arrivals[nation];
}

function currentProgrammeSnapshot(){
 const athletes=safe(()=>managedTeam(),[])||[],fed=federationState();
 return {nation:currentNation(),season:nowSeason(),rank:fed.rank,squadSize:athletes.length,squadAssessment:assessmentAverage(athletes),eliteAthletes:athletes.filter(a=>a.tier==='Elite').length,budget:Number(s?.funding)||0,facilities:safe(()=>({sprint:facilityLevel('sprint'),field:facilityLevel('field'),recovery:facilityLevel('recovery')}),null)};
}

function captureSeasonSnapshot(summary){
 if(!summary)return null;
 const cp=model(),existing=cp.snapshots.find(x=>x.season===summary.season&&x.nation===summary.nation);if(existing)return existing;
 const results=rawResults().filter(r=>Number(r.season)===Number(summary.season)&&resultNation(r)===summary.nation);
 const rows=flattenRows(results),squad=(s?.athletes||[]).filter(a=>!a.retired&&a.nation===summary.nation&&a.inSquad!==false);
 const snap={
  season:summary.season,careerYear:summary.careerYear,cycleNumber:summary.cycleNumber,cycleYear:summary.cycleYear,nation:summary.nation,rank:summary.rank,bonus:summary.bonus||0,records:summary.records||0,
  wins:rows.filter(r=>r.place===1).length,podiums:rows.filter(r=>r.place<=3).length,entries:rows.length,
  olympicMedals:medalsForRows(rows.filter(r=>r._result.olympic&&r.place<=3)),worldMedals:medalsForRows(rows.filter(r=>isWorldLevel(r._result)&&r.place<=3)),
  squad:{size:squad.length,assessment:assessmentAverage(squad),elite:squad.filter(a=>a.tier==='Elite').length,athletes:squad.map(a=>({id:a.id,name:a.name,age:a.age,disc:a.disc,pb:a.pb,tier:a.tier,assessment:safe(()=>assessmentText(a,'overall'),null)}))},
  budget:Number(s?.funding)||0,federation:federationState().label,partial:false
 };
 cp.snapshots.push(snap);cp.snapshots.sort((a,b)=>a.season-b.season);return snap;
}

function backfillSeasonSnapshots(){
 const cp=model(),history=careerState().seasonHistory||[];
 for(const h of history){if(cp.snapshots.some(x=>x.season===h.season&&x.nation===h.nation))continue;const results=rawResults().filter(r=>Number(r.season)===Number(h.season)&&resultNation(r)===h.nation),rows=flattenRows(results);cp.snapshots.push({season:h.season,careerYear:h.careerYear,cycleNumber:h.cycleNumber,cycleYear:h.cycleYear,nation:h.nation,rank:h.rank,bonus:h.bonus||0,records:h.records||0,wins:rows.filter(r=>r.place===1).length,podiums:rows.filter(r=>r.place<=3).length,entries:rows.length,olympicMedals:medalsForRows(rows.filter(r=>r._result.olympic&&r.place<=3)),worldMedals:medalsForRows(rows.filter(r=>isWorldLevel(r._result)&&r.place<=3)),squad:null,budget:null,federation:null,partial:true})}
 cp.snapshots.sort((a,b)=>a.season-b.season);
}

function upsertEvent(event){
 if(!event?.id)return false;const cp=model();if(cp.events.some(x=>x.id===event.id))return false;
 cp.events.push({...event,season:Number(event.season)||nowSeason(),week:Number(event.week)||1});
 cp.events.sort((a,b)=>(a.season-b.season)||(a.week-b.week));
 if(cp.events.length>1200)cp.events=cp.events.slice(-1200);
 return true;
}

function syncAppointments(){
 const c=careerState();
 for(const [i,t] of (c.tenures||[]).entries())upsertEvent({id:`job:${i}:${t.nation}:${t.startSeason}`,type:'appointment',season:t.startSeason,week:1,nation:t.nation,title:`Appointed ${nationLabel(t.nation)} Performance Director`,detail:`Career Year ${t.startCareerYear||1} began with ${nationLabel(t.nation)}.`});
 for(const x of c.completedCycles||[])upsertEvent({id:`review:${x.cycle}:${x.nation}:${x.endSeason}`,type:'review',season:x.endSeason,week:52,nation:x.nation,title:`Olympic Cycle ${x.cycle} review — ${x.verdict||'Completed'}`,detail:`Board score ${x.score}/100 · Olympic medals ${(x.medals?.g||0)}G ${(x.medals?.s||0)}S ${(x.medals?.b||0)}B · best nation rank #${x.bestRank||'—'}.`});
}

function syncResults(){
 for(const res of rawResults()){
  for(const row of res.rows||[]){
   const ach=row.achievements||[],ath=row.name||'Athlete',id=rowAthleteId(row)||ath.replace(/\W+/g,'-');
   if(res.olympic&&row.place<=3)upsertEvent({id:`olympic:${resultKey(res)}:${id}:${row.place}`,type:'medal',season:res.season,week:res.week,nation:row.nation,athleteId:rowAthleteId(row),title:`Olympic ${row.place===1?'gold':row.place===2?'silver':'bronze'} — ${ath}`,detail:`${discName(res.disc)} · ${fmtPerformance(res.disc,row.perf)} · ${res.event}.`});
   if(row.place===1&&(res.national||isMajorResult(res)))upsertEvent({id:`title:${resultKey(res)}:${id}`,type:'title',season:res.season,week:res.week,nation:row.nation,athleteId:rowAthleteId(row),title:`${ath} wins ${discName(res.disc)}`,detail:`${res.event} · ${fmtPerformance(res.disc,row.perf)}.`});
   for(const code of ach.filter(x=>['WR','NR','CR'].includes(x)))upsertEvent({id:`record:${code}:${resultKey(res)}:${id}`,type:'record',season:res.season,week:res.week,nation:row.nation,athleteId:rowAthleteId(row),title:`${code} — ${ath}`,detail:`${discName(res.disc)} · ${fmtPerformance(res.disc,row.perf)} at ${res.event}.`,code});
  }
 }
}

function syncScoutingAndRetirements(){
 const careerNations=new Set(careerState().nationsManaged||[currentNation()]);
 for(const report of s?.scouting?.reports||[]){
  const a=(s?.athletes||[]).find(x=>x.id===report.athleteId);if(!a||!careerNations.has(a.nation))continue;
  upsertEvent({id:`scout:${report.athleteId}:${report.season}:${report.week}`,type:'discovery',season:report.season,week:report.week,nation:a.nation,athleteId:a.id,title:`Discovered ${a.name}`,detail:`${discName(a.disc)} prospect identified by the national scouting network${Number.isFinite(a.discoveredAge)?` at age ${a.discoveredAge}`:''}.`});
 }
 for(const a of s?.athletes||[]){
  if(!a?.retired||!a.retirement||!careerNations.has(a.nation))continue;
  upsertEvent({id:`retire:${a.id}:${a.retirement.season}:${a.retirement.week}`,type:'retirement',season:a.retirement.season,week:a.retirement.week,nation:a.nation,athleteId:a.id,title:`${a.name} retires`,detail:`${discName(a.disc)} · ${a.retirement.reason||'Career completed'}.`});
 }
}

function syncFacilities(){
 const histories=[];
 if(Array.isArray(s?.facilityHistory))histories.push(...s.facilityHistory.map(x=>({...x,nation:currentNation()})));
 for(const [nation,asset] of Object.entries(careerState().nationAssets||{}))for(const h of asset?.facilityHistory||[])histories.push({...h,nation});
 for(const h of histories){
  const key=h.key||'programme',label=key==='sprint'?'Sprint Centre':key==='field'?'Jumps & Throws Centre':key==='recovery'?'Recovery Suite':'Performance Facility';
  upsertEvent({id:`facility:${h.nation}:${h.season}:${h.week}:${key}:${h.level}`,type:'facility',season:h.season,week:h.week,nation:h.nation,title:`${label} reaches Level ${h.level}`,detail:`Programme investment ${formatMoney(h.cost||0)}.`});
 }
}

function thresholdDate(rows,predicate,count){let n=0;for(const row of rows){if(predicate(row)&&++n>=count)return {season:row._season,week:row._week,row}}return null}
function addMilestone(id,title,date,detail){const cp=model();if(cp.milestones[id])return cp.milestones[id];cp.milestones[id]={id,title,season:date?.season||nowSeason(),week:date?.week||nowWeek(),detail};return cp.milestones[id]}
function syncMilestones(){
 const rows=flattenRows(rawResults()).sort((a,b)=>(a._season-b._season)||(a._week-b._week)),st=stats('career');
 const firstWin=thresholdDate(rows,r=>r.place===1,1);if(firstWin)addMilestone('first-win','First event win',firstWin,`${firstWin.row.name} won ${discName(firstWin.row._disc)} at ${firstWin.row._event}.`);
 for(const target of [10,50,100,250,500]){const hit=thresholdDate(rows,r=>r.place===1,target);if(hit)addMilestone(`wins-${target}`,`${target} event wins`,hit,`Career event win number ${target} was recorded.`)}
 const firstOlympic=thresholdDate(rows,r=>r._result.olympic&&r.place<=3,1);if(firstOlympic)addMilestone('first-olympic-medal','First Olympic medal',firstOlympic,`${firstOlympic.row.name} earned an Olympic medal in ${discName(firstOlympic.row._disc)}.`);
 const firstOlympicGold=thresholdDate(rows,r=>r._result.olympic&&r.place===1,1);if(firstOlympicGold)addMilestone('first-olympic-gold','First Olympic gold',firstOlympicGold,`${firstOlympicGold.row.name} became an Olympic champion in ${discName(firstOlympicGold.row._disc)}.`);
 const firstWR=thresholdDate(rows,r=>(r.achievements||[]).includes('WR'),1);if(firstWR)addMilestone('first-wr','First world record',firstWR,`${firstWR.row.name} set a world record in ${discName(firstWR.row._disc)}.`);
 const firstNR=thresholdDate(rows,r=>(r.achievements||[]).includes('NR'),1);if(firstNR)addMilestone('first-nr','First national record',firstNR,`${firstNR.row.name} set a national record in ${discName(firstNR.row._disc)}.`);
 const firstDiscovery=[...model().events].find(e=>e.type==='discovery');if(firstDiscovery)addMilestone('first-discovery','First scouting discovery',firstDiscovery,firstDiscovery.title.replace(/^Discovered /,'')+' entered the national pathway.');
 for(const years of [10,20,30,40])if(st.careerYears>=years)addMilestone(`years-${years}`,`${years} seasons in management`,{season:2026+years,week:1},`Reached ${years} seasons as a Performance Director.`);
 const topSnapshot=model().snapshots.find(x=>Number(x.rank)===1);if(topSnapshot)addMilestone('world-rank-1','Programme reaches world #1',{season:topSnapshot.season,week:52},`${nationLabel(topSnapshot.nation)} finished the season ranked #1.`);
}

function reconcileDecisionBackfill(){
 const cp=model();if(cp.migration.decisionBackfill)return;
 const careerNations=new Set(careerState().nationsManaged||[currentNation()]);
 let callups=0,poolReturns=0,scouted=0;
 for(const a of s?.athletes||[]){if(!careerNations.has(a.nation))continue;for(const mem of a?.story?.memories||[]){if(mem.type==='Call-up'||/^Call-up$/i.test(mem.type||'')){callups++;if(a.source==='Scouted')scouted++}if(mem.type==='Squad decision'||/National Pool/i.test(mem.text||''))poolReturns++}}
 cp.decisions.callups=Math.max(cp.decisions.callups||0,callups);cp.decisions.scoutedCallups=Math.max(cp.decisions.scoutedCallups||0,scouted);cp.decisions.poolReturns=Math.max(cp.decisions.poolReturns||0,poolReturns);cp.migration.decisionBackfill=true;
}

function syncCareerData({persist=false}={}){
 if(syncing||!s)return model();syncing=true;
 try{
  model();backfillSeasonSnapshots();syncAppointments();syncResults();syncScoutingAndRetirements();syncFacilities();reconcileDecisionBackfill();
  if(Number(careerState().careerYear)===1&&!model().arrivals[currentNation()])captureArrivalSnapshot(currentNation(),true);
  syncMilestones();reputationFor(stats('career'));
  if(persist)safe(()=>save());
  return model();
 }finally{syncing=false}
}

function greatestAthletes(){
 const map=new Map();
 for(const row of flattenRows(rawResults())){
  const id=rowAthleteId(row)||row.name,key=String(id);if(!map.has(key))map.set(key,{id:rowAthleteId(row),name:row.name,nation:row.nation,wins:0,podiums:0,olympicMedals:0,majorMedals:0,records:0,score:0});
  const a=map.get(key);if(row.place===1)a.wins++;if(row.place<=3)a.podiums++;if(row._result.olympic&&row.place<=3)a.olympicMedals++;if(isMajorResult(row._result)&&row.place<=3)a.majorMedals++;a.records+=(row.achievements||[]).filter(x=>['WR','NR','CR'].includes(x)).length;a.score=a.wins*3+a.podiums+a.olympicMedals*6+a.majorMedals*3+a.records*5;
 }
 return [...map.values()].sort((a,b)=>b.score-a.score||b.olympicMedals-a.olympicMedals||a.name.localeCompare(b.name));
}

function greatestDiscovery(){
 const scouted=new Set((s?.athletes||[]).filter(a=>a.source==='Scouted'&&(careerState().nationsManaged||[]).includes(a.nation)).map(a=>a.id));
 const list=greatestAthletes().filter(x=>x.id&&scouted.has(x.id));return list[0]||null;
}

function philosophy(){
 const cp=model(),st=stats('career'),current=currentProgrammeSnapshot(),traits=[];
 const discovery=greatestDiscovery();
 const youth=cp.decisions.youthCallups||0,callups=cp.decisions.callups||0,long=cp.decisions.longAgreements||0,short=cp.decisions.shortAgreements||0;
 if(st.athletesDeveloped>=3||youth>=5)traits.push({name:'Talent Developer',why:`${st.athletesDeveloped} athletes have reached the tracked development threshold${youth?` and ${youth} recorded call-ups were made at age 21 or younger`:''}.`,score:st.athletesDeveloped*3+youth});
 if(discovery&&discovery.podiums>=1)traits.push({name:'Talent Identifier',why:`Scouted athlete ${discovery.name} has produced ${discovery.podiums} podium${discovery.podiums===1?'':'s'} under your management.`,score:10+discovery.score});
 if(st.olympicMedals.g+st.worldMedals.g>=3||st.worldRecords>=1)traits.push({name:'Performance Specialist',why:`Your programme has ${st.olympicMedals.g+st.worldMedals.g} Olympic/world gold performances and ${st.worldRecords} world record${st.worldRecords===1?'':'s'}.`,score:st.olympicMedals.g*5+st.worldMedals.g*3+st.worldRecords*6});
 if(long>=Math.max(2,short+1))traits.push({name:'Long-Term Planner',why:`You have chosen ${long} long national-squad agreements compared with ${short} short assessment terms.`,score:long*2});
 if((cp.decisions.poolReturns||0)>=8&&callups>0)traits.push({name:'Ruthless Selector',why:`You have made ${cp.decisions.poolReturns} recorded returns to the National Pool while continuing to refresh the senior squad.`,score:cp.decisions.poolReturns});
 const arrival=cp.arrivals[currentNation()];if(arrival&&Number.isFinite(arrival.rank)&&current.rank<arrival.rank)traits.push({name:'Programme Builder',why:`${nationLabel(currentNation())} has moved from #${arrival.rank} at your recorded arrival snapshot to #${current.rank}.`,score:(arrival.rank-current.rank)*5});
 traits.sort((a,b)=>b.score-a.score);
 if(!traits.length)return {primary:{name:'Still Forming',why:'Your management identity will become clearer as selections, athlete development, scouting and championship results accumulate.'},secondary:null};
 return {primary:traits[0],secondary:traits[1]||null};
}

function legacyTier(){
 const st=stats('career'),score=Math.min(100,Math.round(st.olympicMedals.g*7+st.worldMedals.g*4+st.worldRecords*6+st.nationalRecords*.6+st.wins*.22+Math.max(0,st.careerYears-5)*.5));
 return {score,label:score>=90?'Legendary':score>=72?'Historic':score>=50?'Elite':score>=28?'Successful':'Developing'};
}

function careerBio(){
 const st=stats('career'),c=careerState(),first=(c.tenures||[])[0],current=currentNation();
 let text=`${managementState().name||'The Performance Director'} began their management career with ${nationLabel(first?.nation||current)} in ${first?.startSeason||nowSeason()}.`;
 if(st.olympicMedals.g)text+=` The career has produced ${st.olympicMedals.g} Olympic gold medal${st.olympicMedals.g===1?'':'s'}.`;
 else if(st.olympicMedals.g+st.olympicMedals.s+st.olympicMedals.b)text+=` The career has already produced ${medalTotal(st.olympicMedals)} Olympic medal${medalTotal(st.olympicMedals)===1?'':'s'}.`;
 if(st.worldRecords)text+=` Athletes under the programme have set ${st.worldRecords} world record${st.worldRecords===1?'':'s'}.`;
 if((c.nationsManaged||[]).length>1)text+=` The career has included appointments with ${(c.nationsManaged||[]).map(n=>nationLabel(n)).join(' and ')}.`;
 return text;
}

function contractHistory(){
 const c=careerState(),rows=[];
 for(const x of c.completedCycles||[])rows.push({start:x.startSeason,end:x.endSeason,nation:x.nation,status:x.renewed?'Renewal offered':'Cycle completed',verdict:x.verdict,score:x.score});
 const cur=currentContract();rows.push({start:cur.start,end:cur.end,nation:currentNation(),status:cur.status,current:true});return rows.sort((a,b)=>b.start-a.start);
}

function jobHistory(){
 const c=careerState(),results=rawResults();
 return (c.tenures||[]).map((t,i)=>{
  const end=t.endSeason||nowSeason(),jobResults=results.filter(r=>resultNation(r)===t.nation&&r.season>=t.startSeason&&r.season<=end),rows=flattenRows(jobResults),olympic=rows.filter(r=>r._result.olympic&&r.place<=3),bestRank=Math.min(...model().snapshots.filter(x=>x.nation===t.nation&&Number.isFinite(Number(x.rank))).map(x=>Number(x.rank)),999);
  return {nation:t.nation,start:t.startSeason,end:t.endSeason||null,seasons:Math.max(1,end-t.startSeason+1),wins:rows.filter(r=>r.place===1).length,olympic:medalsForRows(olympic),bestRank:bestRank===999?null:bestRank,current:i===(c.tenures||[]).length-1&&!t.endSeason};
 }).reverse();
}

function seasonArchive(){return [...model().snapshots].sort((a,b)=>b.season-a.season)}
function milestones(){return Object.values(model().milestones||{}).sort((a,b)=>(b.season-a.season)||(b.week-a.week));}
function timeline(){
 const events=[...model().events,...milestones().map(m=>({...m,type:'milestone',id:'milestone:'+m.id,title:m.title,detail:m.detail}))];
 const seen=new Set();return events.sort((a,b)=>(b.season-a.season)||(b.week-a.week)).filter(e=>{const k=`${e.type}:${e.title}:${e.season}:${e.week}`;if(seen.has(k))return false;seen.add(k);return true});
}

function athleteButton(a){
 if(!a)return '';const athlete=(s?.athletes||[]).find(x=>x.id===a.id);return athlete?`<button class="mp-link" data-mp-athlete="${esc(a.id)}">${esc(a.name)}</button>`:esc(a.name);
}

function medalStrip(m){return `<div class="mp-medals"><div class="gold"><i>G</i><strong>${m.g||0}</strong></div><div class="silver"><i>S</i><strong>${m.s||0}</strong></div><div class="bronze"><i>B</i><strong>${m.b||0}</strong></div></div>`}
function statusClass(status){return /completed|excellent|very good|secure|on track/i.test(status)?'good':/risk|pressure|expir/i.test(status)?'warn':/failed|critical|leaving/i.test(status)?'bad':''}
function empty(title,body){return `<div class="mp-empty"><strong>${esc(title)}</strong><span>${esc(body)}</span></div>`}

function heroHTML(){
 const m=managementState(),rep=reputationFor(stats('career')),contract=currentContract(),c=careerState(),name=m.name||'Performance Director',initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'PD';
 return `<section class="mp-hero">
  <div class="mp-avatar" aria-label="Manager initials ${esc(initials)}"><span>${esc(initials)}</span><b>${nationFlag(currentNation())}</b></div>
  <div class="mp-identity"><div class="mp-kicker">${nationFlag(currentNation())} ${esc(nationLabel(currentNation()))} · PERFORMANCE DIRECTOR</div><h1 id="managementName">${esc(name)}</h1><p>${esc(careerBio())}</p><div class="mp-identity-meta"><span>${esc(rep.tier)} reputation</span><span>Career Year ${c.careerYear}</span><span>Olympic Cycle ${c.cycleNumber}</span></div></div>
  <div class="mp-job-badge"><small>CURRENT APPOINTMENT</small><strong>${contract.start}–${contract.end}</strong><span class="${statusClass(contract.status)}">${esc(contract.status)}</span><em>${currentTenureYears()} season${currentTenureYears()===1?'':'s'} in role</em></div>
 </section>`;
}

function headlineStatsHTML(){const st=stats('career');return `<div class="mp-stat-strip">${[
 ['Years Managed',st.careerYears],['Olympic Golds',st.olympicGolds],['Major Medals',medalTotal(st.majorMedals)],['Event Wins',st.wins],['Records',st.records],['Athletes Developed',st.athletesDeveloped]
 ].map(([k,v])=>`<div><small>${k}</small><strong>${v}</strong></div>`).join('')}</div>`}

function jobCardHTML(){
 const contract=currentContract(),fed=federationState(),t=currentTenure();
 return `<section class="mp-card mp-current-job"><div class="mp-card-head"><div><small>CURRENT CAREER</small><h2>Current Job</h2></div><span class="mp-chip ${statusClass(contract.status)}">${esc(contract.status)}</span></div><div class="mp-job-grid">
  <div><small>Nation</small><strong>${nationFlag(currentNation())} ${esc(nationLabel(currentNation()))}</strong></div><div><small>Role</small><strong>Performance Director</strong></div><div><small>Appointed</small><strong>${t.startSeason}</strong></div><div><small>Contract</small><strong>${contract.start}–${contract.end}</strong></div><div><small>Federation confidence</small><strong>${esc(fed.label)}</strong></div><div><small>Nation rank</small><strong>#${fed.rank}</strong></div>
 </div><div class="mp-name-edit"><label>Manager name<input id="mpManagerName" maxlength="60" value="${esc(managementState().name||'Performance Director')}"></label><button class="am-button secondary compact" id="mpSaveName">SAVE NAME</button></div></section>`;
}

function objectivesHTML(){
 const fed=federationState();return `<section class="mp-card"><div class="mp-card-head"><div><small>FEDERATION</small><h2>Confidence & Objectives</h2></div><span class="mp-chip ${statusClass(fed.label)}">${esc(fed.label)}</span></div><div class="mp-objectives">${fed.objectives.map(o=>`<div><span><strong>${esc(o.name)}</strong><small>${esc(o.value)}</small></span><b class="${statusClass(o.status)}">${esc(o.status)}</b></div>`).join('')}</div><div class="mp-priority"><small>Federation priority</small><p>${esc(fed.priority)}</p></div>${fed.positives.length?`<div class="mp-reasons good"><small>What is going well</small>${fed.positives.slice(0,3).map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}${fed.concerns.length?`<div class="mp-reasons warn"><small>Current concerns</small>${fed.concerns.slice(0,3).map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}</section>`;
}

function highlightsHTML(){
 const st=stats('career'),great=greatestAthletes()[0],discovery=greatestDiscovery(),legacy=legacyTier(),items=[];
 if(st.olympicGolds)items.push({k:'Olympic record',v:`${st.olympicGolds} gold · ${medalTotal(st.olympicMedals)} medals`});
 if(st.worldRecords)items.push({k:'World records',v:String(st.worldRecords)});
 if(great)items.push({k:'Greatest athlete',v:athleteButton(great),html:true});
 if(discovery)items.push({k:'Greatest discovery',v:athleteButton(discovery),html:true});
 if(!items.length)items.push({k:'Career building',v:'Your first major career highlight is still ahead.'});
 return `<section class="mp-card"><div class="mp-card-head"><div><small>CAREER</small><h2>Highlights</h2></div><span class="mp-chip">${esc(legacy.label)} legacy</span></div><div class="mp-highlight-list">${items.slice(0,5).map(x=>`<div><small>${esc(x.k)}</small><strong>${x.html?x.v:esc(x.v)}</strong></div>`).join('')}</div></section>`;
}

function impactHTML(){
 const arrival=model().arrivals[currentNation()],current=currentProgrammeSnapshot();
 if(!arrival)return `<section class="mp-card"><div class="mp-card-head"><div><small>PROGRAMME</small><h2>Your Impact</h2></div></div>${empty('Arrival snapshot unavailable','This Alpha career began before full manager snapshots were introduced. Future appointments and seasons will be preserved in full.')}</section>`;
 const cells=[
  ['Nation rank',`#${arrival.rank}`,`#${current.rank}`],
  ['Squad assessment',arrival.squadAssessment==null?'Unavailable':String(arrival.squadAssessment),current.squadAssessment==null?'Unavailable':String(current.squadAssessment)],
  ['Elite squad athletes',arrival.eliteAthletes,current.eliteAthletes],
  ['Squad size',arrival.squadSize,current.squadSize]
 ];
 return `<section class="mp-card"><div class="mp-card-head"><div><small>PROGRAMME</small><h2>Your Impact</h2></div><span class="mp-chip">Since ${arrival.season}</span></div><div class="mp-impact"><div class="head"><span></span><small>ARRIVAL</small><small>CURRENT</small></div>${cells.map(c=>`<div><strong>${esc(c[0])}</strong><span>${esc(c[1])}</span><b>${esc(c[2])}</b></div>`).join('')}</div></section>`;
}

function recentMilestonesHTML(){const list=milestones().slice(0,5);return `<section class="mp-card"><div class="mp-card-head"><div><small>CAREER MEMORY</small><h2>Recent Milestones</h2></div><button class="mp-text-button" data-mp-tab="career">VIEW CAREER</button></div>${list.length?`<div class="mp-timeline compact">${list.map(x=>`<div><i></i><span><small>${x.season} · W${x.week}</small><strong>${esc(x.title)}</strong><p>${esc(x.detail||'')}</p></span></div>`).join('')}</div>`:empty('The first milestone is ahead','Wins, records, major medals, discoveries and long-service moments will build your career history.')}</section>`}

function overviewHTML(){
 return `<div class="mp-overview-grid"><div class="mp-main-stack">${jobCardHTML()}${impactHTML()}${recentMilestonesHTML()}</div><div class="mp-side-stack">${objectivesHTML()}${highlightsHTML()}${greatestAthletesHTML(4)}</div></div>`;
}

function greatestAthletesHTML(limit=6){const list=greatestAthletes().slice(0,limit);return `<section class="mp-card"><div class="mp-card-head"><div><small>CAREER CONNECTIONS</small><h2>Greatest Athletes</h2></div></div>${list.length?`<div class="mp-athlete-list">${list.map((a,i)=>`<div><b>${i+1}</b><span><strong>${athleteButton(a)}</strong><small>${a.wins} wins · ${a.podiums} podiums${a.olympicMedals?` · ${a.olympicMedals} Olympic medals`:''}${a.records?` · ${a.records} records`:''}</small></span></div>`).join('')}</div>`:empty('Career connections will grow','Athletes will appear here once they have built meaningful results under your management.')}</section>`}

function careerHTML(){
 const jobs=jobHistory(),contracts=contractHistory(),seasons=seasonArchive(),events=timeline().slice(0,120);
 return `<div class="mp-career-layout"><div class="mp-main-stack"><section class="mp-card"><div class="mp-card-head"><div><small>CAREER STORY</small><h2>Timeline</h2></div><span>${events.length} recorded moments</span></div>${events.length?`<div class="mp-timeline">${events.map(e=>`<div class="${esc(e.type)}"><i></i><span><small>${e.season} · Week ${e.week}</small><strong>${esc(e.title)}</strong><p>${esc(e.detail||'')}</p></span></div>`).join('')}</div>`:empty('Your timeline starts here','Major results, appointments, records, discoveries and career milestones will appear as they happen.')}</section></div><aside class="mp-side-stack"><section class="mp-card"><div class="mp-card-head"><div><small>EMPLOYMENT</small><h2>Job History</h2></div></div><div class="mp-job-history">${jobs.map(j=>`<div><small>${nationFlag(j.nation)} ${esc(nationLabel(j.nation))}</small><strong>${j.start}–${j.end||'Present'}</strong><span>${j.seasons} season${j.seasons===1?'':'s'} · ${j.wins} event wins${j.bestRank?` · best rank #${j.bestRank}`:''}</span>${medalTotal(j.olympic)?medalStrip(j.olympic):''}</div>`).join('')}</div></section><section class="mp-card"><div class="mp-card-head"><div><small>CONTRACTS</small><h2>Contract History</h2></div></div><div class="mp-contract-list">${contracts.map(c=>`<div><span><strong>${c.start}–${c.end}</strong><small>${nationFlag(c.nation)} ${esc(nationLabel(c.nation))}</small></span><b class="${statusClass(c.status)}">${esc(c.status)}</b></div>`).join('')}</div></section></aside><section class="mp-card mp-season-archive"><div class="mp-card-head"><div><small>HISTORICAL SNAPSHOTS</small><h2>Season Archive</h2></div><span>${seasons.length} season${seasons.length===1?'':'s'} stored</span></div>${seasons.length?`<div class="mp-season-grid">${seasons.map(x=>`<details><summary><span><small>${nationFlag(x.nation)} ${esc(nationLabel(x.nation))}</small><strong>${x.season}</strong></span><b>#${x.rank||'—'}</b></summary><div class="mp-season-detail"><div><small>Entries</small><strong>${x.entries??'—'}</strong></div><div><small>Wins</small><strong>${x.wins??'—'}</strong></div><div><small>Podiums</small><strong>${x.podiums??'—'}</strong></div><div><small>Records</small><strong>${x.records??0}</strong></div>${medalTotal(x.olympicMedals)?`<div class="wide"><small>Olympic medals</small>${medalStrip(x.olympicMedals)}</div>`:''}${x.squad?`<div class="wide"><small>End-of-season squad snapshot</small><strong>${x.squad.size} athletes · assessment ${x.squad.assessment??'Unavailable'} · ${x.squad.elite} elite-tier</strong></div>`:`<div class="wide muted">Detailed squad snapshot unavailable for this legacy season.</div>`}</div></details>`).join('')}</div>`:empty('No completed seasons yet','Your first full season snapshot will be stored at the end of the year.')}</section></div>`;
}

function achievementsHTML(){
 const st=stats('career'),cycles=(careerState().completedCycles||[]).slice().reverse(),recordRows=flattenRows(rawResults()).filter(r=>(r.achievements||[]).some(a=>['WR','NR','CR'].includes(a))).sort((a,b)=>(b._season-a._season)||(b._week-a._week)),firsts=milestones().filter(x=>/^first-/i.test(x.id)||['world-rank-1'].includes(x.id)),seasonStats=new Map();
 for(const r of flattenRows(rawResults())){const x=seasonStats.get(r._season)||{wins:0,podiums:0,records:0};if(r.place===1)x.wins++;if(r.place<=3)x.podiums++;x.records+=(r.achievements||[]).filter(a=>['WR','NR','CR'].includes(a)).length;seasonStats.set(r._season,x)}
 const bestWins=[...seasonStats].sort((a,b)=>b[1].wins-a[1].wins)[0],bestPodiums=[...seasonStats].sort((a,b)=>b[1].podiums-a[1].podiums)[0],bestRecords=[...seasonStats].sort((a,b)=>b[1].records-a[1].records)[0];
 return `<div class="mp-achievements"><section class="mp-card mp-trophy"><div class="mp-card-head"><div><small>MAJOR HONOURS</small><h2>Trophy Cabinet</h2></div></div><div class="mp-honour-grid"><div><span class="mp-trophy-mark gold">OLY</span><small>Olympic Gold</small><strong>${st.olympicMedals.g}</strong></div><div><span class="mp-trophy-mark world">WR</span><small>World Records</small><strong>${st.worldRecords}</strong></div><div><span class="mp-trophy-mark national">NAT</span><small>National Titles</small><strong>${st.nationalTitles}</strong></div><div><span class="mp-trophy-mark podium">POD</span><small>Career Podiums</small><strong>${st.podiums}</strong></div></div><div class="mp-medal-block"><span><small>Olympic medal record</small><strong>${medalTotal(st.olympicMedals)} total</strong></span>${medalStrip(st.olympicMedals)}</div></section><div class="mp-achievement-grid"><section class="mp-card"><div class="mp-card-head"><div><small>OLYMPIC CYCLES</small><h2>Games Record</h2></div></div>${cycles.length?`<div class="mp-cycle-list">${cycles.map(c=>`<div><span><small>Cycle ${c.cycle} · ${c.startSeason}–${c.endSeason}</small><strong>${nationFlag(c.nation)} ${esc(nationLabel(c.nation))}</strong><em>${esc(c.verdict||'Cycle complete')} · board score ${c.score}</em></span>${medalStrip(c.medals||{g:0,s:0,b:0})}</div>`).join('')}</div>`:empty('No Olympic Games managed yet',`The first Games in this career will become a permanent part of your honours record.`)}</section><section class="mp-card"><div class="mp-card-head"><div><small>CAREER FIRSTS</small><h2>Milestones</h2></div></div>${firsts.length?`<div class="mp-firsts">${firsts.map(x=>`<div><small>${x.season}</small><span><strong>${esc(x.title)}</strong><p>${esc(x.detail||'')}</p></span></div>`).join('')}</div>`:empty('Firsts still to come','Your first win, major medal and record will be retained here once achieved.')}</section></div><section class="mp-card"><div class="mp-card-head"><div><small>RECORDS UNDER MANAGEMENT</small><h2>Record Performances</h2></div><span>${recordRows.length}</span></div>${recordRows.length?`<div class="mp-record-table"><div class="head"><span>Year</span><span>Athlete</span><span>Event</span><span>Mark</span><span>Record</span></div>${recordRows.slice(0,80).map(r=>`<div><span>${r._season}</span><span>${athleteButton({id:rowAthleteId(r),name:r.name})}</span><span>${esc(discName(r._disc))}</span><span>${esc(fmtPerformance(r._disc,r.perf))}</span><span>${esc((r.achievements||[]).filter(a=>['WR','NR','CR'].includes(a)).join(' · '))}</span></div>`).join('')}</div>`:empty('No records yet','World and national records achieved while you are manager will appear here.')}</section><section class="mp-card"><div class="mp-card-head"><div><small>PERSONAL MANAGEMENT RECORDS</small><h2>Career Bests</h2></div></div><div class="mp-record-bests"><div><small>Most wins in a season</small><strong>${bestWins?bestWins[1].wins:0}</strong><span>${bestWins?bestWins[0]:'—'}</span></div><div><small>Most podiums in a season</small><strong>${bestPodiums?bestPodiums[1].podiums:0}</strong><span>${bestPodiums?bestPodiums[0]:'—'}</span></div><div><small>Most records in a season</small><strong>${bestRecords?bestRecords[1].records:0}</strong><span>${bestRecords?bestRecords[0]:'—'}</span></div><div><small>Best programme rank</small><strong>${model().snapshots.length?'#'+Math.min(...model().snapshots.map(x=>Number(x.rank)||999)):'—'}</strong><span>Season-end snapshot</span></div></div></section></div>`;
}

function statsHTML(){
 const st=stats(statsScope),scopeLabel=statsScope==='career'?'Entire Career':statsScope==='job'?`Current Job · ${nationLabel(currentNation())}`:`${nowSeason()} Season`;
 return `<div class="mp-statistics"><section class="mp-card"><div class="mp-card-head"><div><small>CAREER ANALYSIS</small><h2>Statistics</h2></div><label class="mp-scope">Scope<select id="mpStatsScope"><option value="career" ${statsScope==='career'?'selected':''}>Entire Career</option><option value="job" ${statsScope==='job'?'selected':''}>Current Job</option><option value="season" ${statsScope==='season'?'selected':''}>Current Season</option></select></label></div><div class="mp-scope-label">${esc(scopeLabel)}</div><div class="mp-stat-grid">${[
  ['Competitions',st.competitions],['Event Entries',st.entries],['Event Wins',st.wins],['Podiums',st.podiums],['Top-8 Finishes',st.finals],['Win Rate',st.winPct+'%'],['Podium Rate',st.podiumPct+'%'],['National Titles',st.nationalTitles],['Olympic Medals',medalTotal(st.olympicMedals)],['World-Level Medals',medalTotal(st.worldMedals)],['Records',st.records],['Athletes Represented',st.athletesManaged]
 ].map(([k,v])=>`<div><small>${k}</small><strong>${v}</strong></div>`).join('')}</div></section><div class="mp-achievement-grid"><section class="mp-card"><div class="mp-card-head"><div><small>EVENT GROUPS</small><h2>Performance by Discipline</h2></div></div><div class="mp-breakdown">${Object.entries(st.byGroup).map(([k,v])=>`<div><strong>${k}</strong><span>${v.entries} entries</span><b>${v.wins} wins · ${v.podiums} podiums</b></div>`).join('')}</div></section><section class="mp-card"><div class="mp-card-head"><div><small>PROGRAMME BALANCE</small><h2>Men / Women</h2></div></div><div class="mp-breakdown">${Object.entries(st.byGender).map(([k,v])=>`<div><strong>${k}</strong><span>${v.entries} entries</span><b>${v.wins} wins · ${v.podiums} podiums</b></div>`).join('')}</div></section></div><section class="mp-card"><div class="mp-card-head"><div><small>DEVELOPMENT & PATHWAY</small><h2>Career Contributions</h2></div></div><div class="mp-stat-grid"><div><small>Athletes Discovered</small><strong>${st.athletesDiscovered}</strong></div><div><small>Athletes Developed</small><strong>${st.athletesDeveloped}</strong></div><div><small>Recorded Debuts</small><strong>${st.debuts}</strong></div><div><small>Nations Managed</small><strong>${st.nationsManaged}</strong></div></div></section></div>`;
}

function reputationHTML(){
 const st=stats('career'),rep=reputationFor(st),fed=federationState(),history=[...model().reputation.history].reverse();
 const evidence=[`${st.wins} career event wins`,`${medalTotal(st.majorMedals)} Olympic/world-level medals`,`${st.worldRecords} world records`,`${st.athletesDeveloped} athletes meeting the tracked development threshold`];
 return `<div class="mp-reputation"><section class="mp-reputation-hero mp-card"><div><small>CURRENT REPUTATION</small><strong>${esc(rep.tier)}</strong><span>Career peak: ${esc(rep.peakTier)}</span></div><div class="mp-rep-track"><i style="width:${rep.score}%"></i></div><p>${rep.next?`Your next reputation tier is earned through stronger championship results, records and sustained programme progress.`:'You have reached the highest career reputation tier.'}</p></section><div class="mp-achievement-grid"><section class="mp-card"><div class="mp-card-head"><div><small>WHY YOUR STANDING HAS CHANGED</small><h2>Reputation Evidence</h2></div></div><div class="mp-evidence">${evidence.map(x=>`<div><i></i><span>${esc(x)}</span></div>`).join('')}</div></section><section class="mp-card"><div class="mp-card-head"><div><small>CURRENT JOB</small><h2>Federation Standing</h2></div><span class="mp-chip ${statusClass(fed.label)}">${esc(fed.label)}</span></div>${fed.positives.map(x=>`<div class="mp-fed-line good"><b>+</b><span>${esc(x)}</span></div>`).join('')}${fed.concerns.map(x=>`<div class="mp-fed-line warn"><b>!</b><span>${esc(x)}</span></div>`).join('')||'<div class="mp-fed-line"><b>•</b><span>No material federation concerns are currently recorded.</span></div>'}</section></div><section class="mp-card"><div class="mp-card-head"><div><small>CAREER PROGRESSION</small><h2>Reputation Milestones</h2></div></div>${history.length?`<div class="mp-rep-history">${history.map(x=>`<div><small>${x.season} · W${x.week}</small><strong>${esc(x.tier)}</strong></div>`).join('')}</div>`:empty('Reputation history starts here','Meaningful tier changes will be preserved rather than logging every small numerical movement.')}</section></div>`;
}

function philosophyHTML(){
 const ph=philosophy(),cp=model(),st=stats('career'),discovery=greatestDiscovery(),great=greatestAthletes()[0];
 return `<div class="mp-philosophy"><section class="mp-style-hero mp-card"><div><small>YOUR MANAGEMENT STYLE</small><strong>${esc(ph.primary.name)}</strong><p>${esc(ph.primary.why)}</p></div>${ph.secondary?`<aside><small>SECONDARY TENDENCY</small><strong>${esc(ph.secondary.name)}</strong><p>${esc(ph.secondary.why)}</p></aside>`:''}</section><div class="mp-achievement-grid"><section class="mp-card"><div class="mp-card-head"><div><small>BEHAVIOUR</small><h2>What Shapes It</h2></div></div><div class="mp-breakdown"><div><strong>Squad call-ups</strong><span>${cp.decisions.callups||0} recorded</span><b>${cp.decisions.scoutedCallups||0} from scouted athletes</b></div><div><strong>Agreement preference</strong><span>${cp.decisions.longAgreements||0} long-term</span><b>${cp.decisions.shortAgreements||0} short assessment</b></div><div><strong>Squad turnover</strong><span>${cp.decisions.poolReturns||0} returns to National Pool</span><b>Career decisions, not a personality slider</b></div><div><strong>Development</strong><span>${st.athletesDeveloped} athletes developed</span><b>${st.athletesDiscovered} scouting discoveries</b></div></div></section><section class="mp-card"><div class="mp-card-head"><div><small>LEGACY CONNECTIONS</small><h2>People Who Define the Career</h2></div></div>${great?`<div class="mp-person-feature"><small>Greatest athlete</small><strong>${athleteButton(great)}</strong><span>${great.wins} wins · ${great.podiums} podiums · ${great.olympicMedals} Olympic medals</span></div>`:''}${discovery?`<div class="mp-person-feature"><small>Greatest discovery</small><strong>${athleteButton(discovery)}</strong><span>${discovery.wins} wins · ${discovery.podiums} podiums since entering the pathway</span></div>`:empty('A defining discovery is still ahead','Scouted athletes who go on to meaningful senior success will be recognised here.')}</section></div><section class="mp-card"><div class="mp-card-head"><div><small>DESIGN PRINCIPLE</small><h2>Identity From Decisions</h2></div></div><p class="mp-copy">Your management style is derived from selections, squad agreements, athlete development, scouting outcomes and championship performance. It is descriptive rather than restrictive, and it can change as your career changes.</p></section></div>`;
}

function bodyForTab(tab){if(tab==='career')return careerHTML();if(tab==='achievements')return achievementsHTML();if(tab==='statistics')return statsHTML();if(tab==='reputation')return reputationHTML();if(tab==='philosophy')return philosophyHTML();return overviewHTML()}

function tabsHTML(){return `<nav class="mp-tabs" aria-label="Manager profile sections">${PROFILE_TABS.map(t=>`<button data-mp-tab="${t}" class="${activeTab===t?'on':''}">${t==='overview'?'Overview':t==='career'?'Career':t==='achievements'?'Achievements':t==='statistics'?'Statistics':t==='reputation'?'Reputation':'Philosophy'}</button>`).join('')}</nav>`}

function renderProfile(tab=activeTab){
 activeTab=PROFILE_TABS.includes(tab)?tab:'overview';syncCareerData();
 const el=document.getElementById('managementProfile');if(!el)return;
 const scroll=el.querySelector('.mp-body')?.scrollTop||0;
 el.innerHTML=`<div class="mp-shell"><header class="mp-top"><div><small>ATHLETICS MANAGER</small><strong>MY PROFILE</strong></div><div><span>${nationFlag(currentNation())} ${esc(nationLabel(currentNation()))}</span><button class="am-button ghost compact" data-mp-close>← BACK</button></div></header>${heroHTML()}${headlineStatsHTML()}${tabsHTML()}<main class="mp-body">${bodyForTab(activeTab)}</main></div>`;
 bindProfile(el);
 if(!el.open)el.showModal();
 requestAnimationFrame(()=>{const body=el.querySelector('.mp-body');if(body&&scroll&&activeTab===tab)body.scrollTop=scroll});
}

function bindProfile(el){
 el.querySelectorAll('[data-mp-close]').forEach(b=>b.onclick=()=>el.close());
 el.querySelectorAll('[data-mp-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.mpTab;renderProfile(activeTab)});
 el.querySelectorAll('[data-mp-athlete]').forEach(b=>b.onclick=()=>openCareerAthlete(b.dataset.mpAthlete));
 const name=el.querySelector('#mpManagerName'),saveName=el.querySelector('#mpSaveName');
 if(saveName&&name)saveName.onclick=()=>{managementState().name=name.value.trim().slice(0,60)||'Performance Director';safe(()=>save());renderProfile(activeTab)};
 const scope=el.querySelector('#mpStatsScope');if(scope)scope.onchange=()=>{statsScope=scope.value;renderProfile('statistics')};
}

function openCareerAthlete(id){
 const athlete=(s?.athletes||[]).find(a=>a.id===id);if(!athlete)return;
 const dialog=document.getElementById('managementProfile'),body=dialog?.querySelector('.mp-body');profileReturn={tab:activeTab,scroll:body?.scrollTop||0};
 if(dialog?.open)dialog.close();
 safe(()=>openAthleteProfile(id));
}

function openManagerProfileV2(tab='overview'){
 activeTab=PROFILE_TABS.includes(tab)?tab:activeTab||'overview';syncCareerData({persist:true});renderProfile(activeTab);
 const drawer=document.getElementById('mobileNavDrawer');if(drawer)drawer.hidden=true;
}

function wrap(name,after,before){
 const original=window[name];if(typeof original!=='function'||original.__managerCareerWrapped)return;
 const wrapped=function(...args){if(before)safe(()=>before(args));const out=original.apply(this,args);safe(()=>after(args,out));return out};
 wrapped.__managerCareerWrapped=true;wrapped.__managerCareerOriginal=original;window[name]=wrapped;
}

function installHooks(){
 wrap('recordManagementResults',()=>syncCareerData());
 wrap('recordCareerSeason',(args,out)=>{captureSeasonSnapshot(out);syncCareerData()});
 wrap('generateProspects',(args,out)=>{for(const a of out||[]){if(a&&!a.managerDiscoverySnapshot)a.managerDiscoverySnapshot={season:nowSeason(),week:nowWeek(),age:a.age,overall:a.overall,pb:a.pb,nation:a.nation}}syncCareerData()});
 wrap('finaliseSquadAgreementCallUp',(args,out)=>{if(!out)return;const [id,term]=args,a=(s?.athletes||[]).find(x=>x.id===id),cp=model();cp.decisions.callups++;if(a?.age<=21)cp.decisions.youthCallups++;if(a?.source==='Scouted')cp.decisions.scoutedCallups++;if(Number(term)>=40)cp.decisions.longAgreements++;if(Number(term)<=20)cp.decisions.shortAgreements++;upsertEvent({id:`callup:${id}:${safe(()=>careerNow(),Date.now())}`,type:'callup',season:nowSeason(),week:nowWeek(),nation:a?.nation||currentNation(),athleteId:id,title:`${a?.name||'Athlete'} called into the senior squad`,detail:`${term}-week National Squad Agreement${a?.age?` · age ${a.age}`:''}.`});syncCareerData()});
 wrap('returnAgreementToPool',(args)=>{const [a]=args;if(a){model().decisions.poolReturns++;upsertEvent({id:`pool-return:${a.id}:${safe(()=>careerNow(),Date.now())}`,type:'selection',season:nowSeason(),week:nowWeek(),nation:a.nation,title:`${a.name} returns to the National Pool`,detail:'Senior squad spell completed.'})}});
 wrap('acceptCareerJob',(args)=>{const nation=args[0];captureArrivalSnapshot(nation,true);syncCareerData({persist:true})});
 wrap('signAppointmentContract',()=>{captureArrivalSnapshot(currentNation(),true);syncCareerData({persist:true})});
 wrap('upgradeFacility',()=>{model().decisions.facilityUpgrades++;syncCareerData()});
 wrap('appointCoach',()=>{model().decisions.staffAppointments++;syncCareerData()});
 wrap('renewCoach',()=>syncCareerData());
}

function bindLaunchers(){
 document.addEventListener('click',event=>{
  const target=event.target.closest?.('#myProfileShortcut,#mobileMyProfile,#managerProfileButton');if(!target)return;
  event.preventDefault();event.stopImmediatePropagation();openManagerProfileV2(activeTab||'overview');
 },true);
 const athleteDialog=document.getElementById('athleteProfile');if(athleteDialog)athleteDialog.addEventListener('close',()=>{if(!profileReturn)return;const back=profileReturn;profileReturn=null;setTimeout(()=>{openManagerProfileV2(back.tab);requestAnimationFrame(()=>{const body=document.querySelector('#managementProfile .mp-body');if(body)body.scrollTop=back.scroll})},0)});
}

function diagnostics(){
 const st=stats('career'),rep=reputationFor(st),fed=federationState(),legacy=legacyTier(),cp=model();
 return {version:VERSION,managerId:cp.managerId,currentJob:currentNation(),careerYear:careerState().careerYear,reputation:rep,legacy,federationConfidence:{label:fed.label,score:fed.score},careerEventCount:cp.events.length,milestoneCount:Object.keys(cp.milestones).length,seasonSnapshots:cp.snapshots.length,stats:st,modelVersion:cp.version};
}

installHooks();bindLaunchers();
window.openManagerProfile=openManagerProfileV2;
window.AMManagerCareerV1={version:VERSION,open:openManagerProfileV2,state:()=>syncCareerData(),stats,diagnostics,sync:syncCareerData,captureSeasonSnapshot};
setTimeout(()=>safe(()=>syncCareerData({persist:true})),0);
})();
