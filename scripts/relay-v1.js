/* Athletics Manager — 4x100m Relay V1
   Dev-only first relay implementation.
   - Men's and Women's 4x100m at selected international meetings.
   - 100m/200m senior-squad athletes remain eligible for individual events at the same meeting.
   - Four ordered relay legs, staff recommendation, baton skill/experience, chemistry and exchanges.
   - Nation/team records with native Broadcast V4 sprint presentation and exchange handovers.
   Relay disciplines are intentionally non-enumerable so generic Summit/world loops remain unchanged
   until those systems receive their own relay-aware design pass. */
(function(){
'use strict';
if(window.__amRelayV1)return;window.__amRelayV1=1;
if(typeof DISCIPLINES==='undefined'||typeof s==='undefined')return;

const RELAYS={
 M4X100:{label:"Men's 4×100m Relay",gender:'M',standard:39.20,world:36.84,worldHolder:'Jamaica',worldNation:'JAMAICA',worldSeason:2012},
 W4X100:{label:"Women's 4×100m Relay",gender:'W',standard:43.80,world:40.82,worldHolder:'United States',worldNation:'USA',worldSeason:2012}
};
const RELAY_EVENT_IDS=new Set(['spring','euro','diamond','worldcup']);
const LEG_NAMES=['LEG 1 · LEAD-OFF','LEG 2 · BACK STRAIGHT','LEG 3 · BEND','LEG 4 · ANCHOR'];
const isRelay=d=>Object.prototype.hasOwnProperty.call(RELAYS,String(d||''));
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const esc=v=>safe(()=>profileEscape(String(v??'')),String(v??''));
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const clampLocal=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(v){let h=2166136261;for(const ch of String(v)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function noise(seed,scale=1){const h=hash(`${seed}:${Date.now()}:${Math.random()}`);return (((h%10001)/10000)-.5)*2*scale}

function installDisciplines(){
 for(const [d,q] of Object.entries(RELAYS)){
  if(DISCIPLINES[d])continue;
  Object.defineProperty(DISCIPLINES,d,{value:{label:q.label,type:'time',unit:'s',distance:400,relay:true,gender:q.gender},enumerable:false,configurable:true,writable:true});
 }
}
installDisciplines();

function syncCanonicalRelayRecords(st){
 if(!s?.records||!st?.records)return;
 s.records.world??={};s.records.national??={};
 for(const d of Object.keys(RELAYS)){
  if(st.records.world[d])s.records.world[d]=st.records.world[d];
 }
 for(const [nation,records] of Object.entries(st.records.national||{})){
  s.records.national[nation]??={};
  for(const d of Object.keys(RELAYS))if(records?.[d])s.records.national[nation][d]=records[d];
 }
}
function relayState(){
 const st=s.relayV1??={version:1,athletes:{},records:{world:{},national:{}},history:[]};
 st.version=1;st.athletes??={};st.records??={world:{},national:{}};st.records.world??={};st.records.national??={};st.history??=[];
 for(const [d,q] of Object.entries(RELAYS)){
  const wr=st.records.world[d];
  if(!wr||(wr.season==='Pre-career'&&Math.abs(num(wr.value)-q.world)<.001))st.records.world[d]={value:q.world,holder:q.worldHolder,nation:q.worldNation,season:q.worldSeason};
 }
 syncCanonicalRelayRecords(st);
 return st;
}
function athleteRelay(a){
 const st=relayState(),key=String(a.id),seed=hash(`${a.id}:${a.name}:relay`);
 return st.athletes[key]??={baton:62+(seed%33),experience:0,starts:0,lastRelayWeek:null};
}
function relaySkill(a){const r=athleteRelay(a);return clampLocal(Math.round(r.baton+Math.min(8,r.experience*.8)),1,99)}
function genderFor(a){return String(a?.disc||'').startsWith('W')?'W':'M'}
function relaySprintDisc(a,d){return genderFor(a)===RELAYS[d].gender&&new RegExp(`^${RELAYS[d].gender}(100|200)$`).test(String(a.disc||''))}
function relayEligible(e,d){
 if(!isRelay(d))return [];
 return safe(()=>managedTeam(),[]).filter(a=>a&&!a.retired&&a.inSquad!==false&&relaySprintDisc(a,d)&&num(a.injury)<=0)
  .filter(a=>!safe(()=>activityBusy(a,e?.week),false))
  .filter(a=>!safe(()=>typeof athleteIndependenceUnavailable==='function'&&athleteIndependenceUnavailable(a,e),false));
}
function addRelayToEvents(events,{futureOnly=false}={}){
 for(const e of events||[]){
  if(!RELAY_EVENT_IDS.has(e?.id)||e.completed)continue;
  if(futureOnly&&num(e.week)<num(s?.game?.week))continue;
  e.disc??=[];e.entries??={};e.results??={};let added=false;
  for(const d of Object.keys(RELAYS))if(!e.disc.includes(d)){e.disc.push(d);added=true}
  if(added&&futureOnly){e.decision=false;if(e.selectionDecisionV3?.locked)e.selectionDecisionV3.locked=false;if(e.selectionCentreV2?.locked)e.selectionCentreV2.locked=false}
 }
 return events;
}
function migrate(){installDisciplines();relayState();addRelayToEvents(s?.events,{futureOnly:true});saveSafe()}
function saveSafe(){try{save()}catch(_){}}

const baseMakeEvents=typeof makeEvents==='function'?makeEvents:null;
if(baseMakeEvents)makeEvents=function(...args){return addRelayToEvents(baseMakeEvents.apply(this,args))};
const baseFresh=typeof fresh==='function'?fresh:null;
if(baseFresh)fresh=function(...args){const st=baseFresh.apply(this,args);const live=s;s=st;try{addRelayToEvents(st.events);relayState()}finally{s=live}return st};
const baseLoad=typeof load==='function'?load:null;
if(baseLoad)load=function(...args){const out=baseLoad.apply(this,args);if(s)migrate();return out};

function equivalent100(a){
 const pb=num(a?.pb,0),disc=String(a?.disc||'');
 if(pb>0&&/100$/.test(disc))return pb;
 if(pb>0&&/200$/.test(disc))return pb/2.035;
 const o=num(a?.overall,72),female=genderFor(a)==='W';
 return (female?12.45:11.25)-(o-72)*(female?.022:.020);
}
function pairChem(a,b){
 if(!a||!b)return 60;
 const base=56+(hash([a.id,b.id].sort().join(':'))%31),exp=(athleteRelay(a).experience+athleteRelay(b).experience)*.45;
 return clampLocal(base+Math.min(10,exp),45,96);
}
function legAdjustment(a,index,lineup){
 let x=0,disc=String(a.disc||'');
 if(index===0){x+=(relaySkill(a)<70?.055:0);if(/100$/.test(disc))x-=.025}
 if(index===1){x+=(equivalent100(a)-Math.min(...lineup.map(equivalent100)))*.10}
 if(index===2){x+=/200$/.test(disc)?-.075:.035}
 if(index===3){x+=(90-num(a.form,85))*.0025;x+=(equivalent100(a)-Math.min(...lineup.map(equivalent100)))*.08}
 return x;
}
function estimateLineup(lineup){
 if(lineup.length!==4)return 99;
 const raw=lineup.reduce((n,a)=>n+equivalent100(a),0)-2.72;
 const baton=avg(lineup.map(relaySkill)),chem=avg([pairChem(lineup[0],lineup[1]),pairChem(lineup[1],lineup[2]),pairChem(lineup[2],lineup[3])]);
 const fit=avg(lineup.map(a=>num(a.fitness,90))),fat=avg(lineup.map(a=>num(a.fatigue,20))),form=avg(lineup.map(a=>num(a.form,85)));
 const leg=lineup.reduce((n,a,i)=>n+legAdjustment(a,i,lineup),0);
 return raw+Math.max(0,76-baton)*.006+Math.max(0,68-chem)*.005+Math.max(0,88-fit)*.008+Math.max(0,fat-35)*.004+Math.max(0,84-form)*.004+leg;
}
function bestLineup(candidates){
 const pool=[...candidates].sort((a,b)=>equivalent100(a)-equivalent100(b)).slice(0,8);if(pool.length<4)return [];
 let best=null,bestT=Infinity;
 for(let a=0;a<pool.length;a++)for(let b=0;b<pool.length;b++)for(let c=0;c<pool.length;c++)for(let d=0;d<pool.length;d++){
  if(new Set([a,b,c,d]).size<4)continue;const line=[pool[a],pool[b],pool[c],pool[d]],t=estimateLineup(line);if(t<bestT){bestT=t;best=line}
 }
 return best||[];
}

const baseEntryLimit=typeof selectionEntryLimit==='function'?selectionEntryLimit:null;
if(baseEntryLimit)selectionEntryLimit=function(e,d){return isRelay(d)?4:baseEntryLimit.apply(this,arguments)};
const baseEligible=typeof eligibleFor==='function'?eligibleFor:null;
if(baseEligible)eligibleFor=function(e,d){return isRelay(d)?relayEligible(e,d):baseEligible.apply(this,arguments)};
const baseStandard=typeof selectionStandard==='function'?selectionStandard:null;
if(baseStandard)selectionStandard=function(e,d){return isRelay(d)?RELAYS[d].standard:baseStandard.apply(this,arguments)};
const baseCase=typeof selectionCase==='function'?selectionCase:null;
if(baseCase)selectionCase=function(a,e,d){if(!isRelay(d))return baseCase.apply(this,arguments);const skill=relaySkill(a),fit=num(a.fitness,90),fat=num(a.fatigue);return {key:skill>=82?'met':'relay',label:skill>=82?'STRONG RELAY CASE':'RELAY ELIGIBLE',detail:`${a.name} is eligible from the ${safe(()=>discLabel(a.disc),a.disc)} squad. Relay skill ${skill}/99 · fitness ${fit} · fatigue ${fat}.`,strength:skill>=82?4:3}};
const baseRecommendation=typeof selectionRecommendationPlan==='function'?selectionRecommendationPlan:null;
if(baseRecommendation)selectionRecommendationPlan=function(e,d,candidates){
 if(!isRelay(d))return baseRecommendation.apply(this,arguments);
 const line=bestLineup(candidates||relayEligible(e,d));
 return {athletes:line,reason:'performance',note:line.length===4?`Recommended order: ${line.map((a,i)=>`L${i+1} ${a.name}`).join(' · ')}. Order balances speed, bend suitability, baton skill and current readiness.`:'Four eligible 100m/200m squad athletes are required for a relay team.'};
};

function relaySelectedIds(e,d){
 const current=[...(e?.entries?.[d]||[])],locked=(e?.selectionDecisionV3?.slots?.[d]||[]).filter(x=>x?.mode==='athlete'&&x.id).map(x=>x.id),saved=[...(e?.relaySelectionSnapshot?.[d]||[])];
 const ids=(saved.length===4?saved:locked.length===4?locked:current).slice(0,4);if(ids.length===4){e.relaySelectionSnapshot??={};e.relaySelectionSnapshot[d]=[...ids]}return ids
}
function relayUnavailableReason(a,leg=0){if(!a)return`Leg ${leg+1} runner is no longer available`;if(a.retired)return`${a.name} retired after selection`;if(num(a.injury)>0)return`${a.name} is injured and cannot start (${Math.max(1,Math.round(num(a.injury)))} week${Math.round(num(a.injury))===1?'':'s'} remaining)`;if(a.inSquad===false)return`${a.name} is no longer in the national squad`;if(a.camp)return`${a.name} is away at a training camp`;return''}
function relayAvailability(e,d){const ids=relaySelectedIds(e,d),current=new Set((e?.entries?.[d]||[]).map(String)),line=ids.map(id=>s.athletes.find(a=>String(a.id)===String(id))),unavailable=[];ids.forEach((id,i)=>{const a=line[i];let reason=relayUnavailableReason(a,i);if(!reason&&!current.has(String(id)))reason=`${a?.name||`Leg ${i+1} runner`} became unavailable after selection`;if(reason)unavailable.push({id,a,leg:i+1,reason})});return{ids,line,unavailable}}
function selectedLineup(e,d){return relaySelectedIds(e,d).map(id=>s.athletes.find(a=>String(a.id)===String(id))).filter(Boolean).slice(0,4)}
function nationCandidates(nation,d){return (s.athletes||[]).filter(a=>!a.retired&&a.nation===nation&&relaySprintDisc(a,d)&&num(a.injury)<=0).sort((a,b)=>equivalent100(a)-equivalent100(b))}
function virtualRelayTime(nation,d){
 const xs=nationCandidates(nation,d).slice(0,4),female=RELAYS[d].gender==='W';let eq=xs.map(equivalent100);
 const best=eq[0]||((female?11.75:10.55)+(hash(nation+d)%55)/100);
 while(eq.length<4)eq.push(best+.08+eq.length*.035);
 const strength=xs.length?avg(xs.map(a=>num(a.overall,78))):72+(hash(`${nation}:${d}`)%20);
 return eq.reduce((a,b)=>a+b,0)-2.62+Math.max(0,84-strength)*.012;
}
function teamObject(nation,d,lineup=null,visualLineup=null){
 const ids=(lineup||[]).map(a=>a.id),visual=(visualLineup||lineup||[]).filter(Boolean).slice(0,4);
 return {id:`relay:${s.game.season}:${d}:${nation}`,name:`${safe(()=>nationName(nation),nation)} 4×100m`,nation,relay:true,relayDisc:d,relayRoster:ids,relayLineup:lineup||[],relayVisualLineup:visual,overall:lineup?.length?avg(lineup.map(a=>num(a.overall,75))):80,fitness:lineup?.length?avg(lineup.map(a=>num(a.fitness,90))):92,form:lineup?.length?avg(lineup.map(a=>num(a.form,85))):86,fatigue:lineup?.length?avg(lineup.map(a=>num(a.fatigue,20))):18};
}
function relayField(e,d){
 const mn=safe(()=>managedNation(),'GREAT BRITAIN'),teams=[],availability=relayAvailability(e,d);
 if(availability.ids.length===4){const existing=availability.line.filter(Boolean),team=teamObject(mn,d,existing,existing);team.relayRoster=[...availability.ids];if(availability.unavailable.length){const miss=availability.unavailable[0];team.relayDNS=true;team.relayWithdrawnRunner=miss.a?.name||`Leg ${miss.leg} runner`;team.relayWithdrawalReason=miss.reason;teams.push(team)}else if(existing.length===4)teams.push(team)}
 const rivals=Object.keys(typeof COUNTRIES!=='undefined'?COUNTRIES:{}).filter(n=>n!==mn).map(n=>({n,t:virtualRelayTime(n,d)})).sort((a,b)=>a.t-b.t).slice(0,7);
 rivals.forEach(x=>teams.push(teamObject(x.n,d,null,nationCandidates(x.n,d).slice(0,4))));return teams.slice(0,8);
}
const baseBuildField=typeof buildEventField==='function'?buildEventField:null;
if(baseBuildField)buildEventField=function(e,d){return isRelay(d)?relayField(e,d):baseBuildField.apply(this,arguments)};

function exchangeProfile(team,d){
 const line=team.relayLineup||[];
 if(line.length===4){const baton=avg(line.map(relaySkill)),chem=avg([pairChem(line[0],line[1]),pairChem(line[1],line[2]),pairChem(line[2],line[3])]);return {baton,chem}}
 const seed=hash(`${team.nation}:${d}:exchange`);return {baton:72+(seed%21),chem:66+((seed>>>4)%24)};
}
function runRelay(team,d,e){
 if(team.relayDNS)return {...team,perf:99.99,dns:true,dq:false,disqualified:false,withdrawalReason:team.relayWithdrawalReason||'Relay team withdrawn before the start',points:0,achievements:[]};
 const actual=team.relayLineup?.length===4,base=actual?estimateLineup(team.relayLineup):virtualRelayTime(team.nation,d),x=exchangeProfile(team,d);
 const form=actual?avg(team.relayLineup.map(a=>num(a.form,85))):86,fat=actual?avg(team.relayLineup.map(a=>num(a.fatigue,20))):18;
 let perf=base+(84-form)*.004+Math.max(0,fat-35)*.004+noise(`${team.id}:${e.id}`,0.16),issue=null,dq=false;
 const risk=clampLocal(.018+Math.max(0,76-x.baton)*.0015+Math.max(0,68-x.chem)*.0012+Math.max(0,fat-55)*.001,0.01,.12);
 const roll=Math.random();if(roll<risk*.08){dq=true;issue='Dropped baton outside the exchange zone';perf=99.99}else if(roll<risk){const loss=.18+Math.random()*.62;perf+=loss;issue=`Slow exchange (+${loss.toFixed(2)}s)`}
 return {...team,perf:+perf.toFixed(2),dq,disqualified:dq,exchangeIssue:issue,points:0,achievements:[]};
}
const baseSim=typeof simulateDiscipline==='function'?simulateDiscipline:null;
if(baseSim)simulateDiscipline=function(e,d){if(!isRelay(d))return baseSim.apply(this,arguments);const rows=relayField(e,d).map(t=>runRelay(t,d,e));rows.sort((a,b)=>!!a.dns!==!!b.dns?(a.dns?1:-1):a.dq!==b.dq?(a.dq?1:-1):a.perf-b.perf);rows.forEach((r,i)=>r.rank=i+1);return rows};

function recordRelayMark(e,d,row){
 if(row.dq||row.dns||!Number.isFinite(row.perf))return [];
 const st=relayState(),ach=[];let wr=st.records.world[d];if(!wr||row.perf<wr.value-.0001){st.records.world[d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name};ach.push('WR')}
 st.records.national[row.nation]??={};const nr=st.records.national[row.nation][d];if(!nr){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name}}else if(row.perf<nr.value-.0001){st.records.national[row.nation][d]={value:row.perf,holder:row.name,nation:row.nation,season:s.game.season,week:s.game.week,event:e.name};if(!ach.includes('WR'))ach.push('NR')}
 syncCanonicalRelayRecords(st);
 return ach;
}
const baseCommit=typeof commitDisciplineResults==='function'?commitDisciplineResults:null;
if(baseCommit)commitDisciplineResults=function(e,d,rows){
 if(!isRelay(d))return baseCommit.apply(this,arguments);if(Array.isArray(e.results?.[d]))return;e.results??={};const mn=safe(()=>managedNation(),'GREAT BRITAIN');
 rows.forEach((r,i)=>{r.points=e.ranked&&!r.dq&&!r.dns?Math.round((typeof PTS!=='undefined'?(PTS[i]||0):0)*safe(()=>rankingPointMultiplier(e),1)):0;s.nationPoints[r.nation]=(s.nationPoints[r.nation]||0)+r.points;r.achievements=recordRelayMark(e,d,r)});
 const mine=rows.find(r=>r.nation===mn),line=selectedLineup(e,d);if(mine&&!mine.dns&&line.length===4){line.forEach((a,i)=>{const st=athleteRelay(a);st.starts++;st.experience+=1;st.lastRelayWeek=s.game.careerWeek||s.game.week;a.fatigue=clampLocal(num(a.fatigue)+3+Math.floor(Math.random()*4),0,100);a.form=clampLocal(num(a.form,80)+(mine.rank<=3?1:0),55,99);safe(()=>rememberAthlete(a,'Relay appearance',`${LEG_NAMES[i].replace(' · ',' — ')} for ${safe(()=>nationName(mn),mn)} at ${e.name}. Team result: ${mine.dq?'DQ':mine.perf.toFixed(2)+'s'}.`),null)})}
 e.results[d]=rows;relayState().history.push({season:s.game.season,week:s.game.week,event:e.name,eventId:e.id,disc:d,results:rows.map(r=>({nation:r.nation,perf:r.perf,points:num(r.points),dq:r.dq,dns:!!r.dns,withdrawalReason:r.withdrawalReason||'',rank:r.rank,roster:r.relayRoster||[]}))});relayState().history=relayState().history.slice(-80);saveSafe();
};

const baseCommentary=typeof commentaryLines==='function'?commentaryLines:null;
if(baseCommentary)commentaryLines=function(d,rows,e){
 if(!isRelay(d))return baseCommentary.apply(this,arguments);const valid=rows.filter(r=>!r.dq),lead=valid[0],second=valid[1],mine=rows.find(r=>r.nation===safe(()=>managedNation(),''));const gap=lead&&second?(second.perf-lead.perf).toFixed(2):null;
 const issue=rows.find(r=>r.exchangeIssue);
 return [
  `TEAMS TO THEIR MARKS\nGavin Potts — Four athletes, three exchanges, one lap of the track. ${rows.length} nations are set for ${RELAYS[d].label}.`,
  `LEG ONE\nGavin Potts — The opening runners are away. The lead-off leg is about the start, holding the lane and arriving at the first zone under control.`,
  `FIRST EXCHANGE\nGavin Potts — Batons are moving through the first changeover. Clean hands here can be worth far more than a fraction of raw speed.${issue?' There is hesitation for '+safe(()=>nationName(issue.nation),issue.nation)+'.':''}`,
  `BACK STRAIGHT\nGavin Potts — Leg two opens the race up down the back straight. The quickest teams are beginning to stretch the field.`,
  `SECOND EXCHANGE\nGavin Potts — Into the second zone. Timing matters: outgoing runners are accelerating blind and trusting the call behind them.`,
  `AROUND THE BEND\nGavin Potts — Leg three attacks the bend. This is where the 200-metre runners can make their curve running count.`,
  `FINAL CHANGEOVER\nGavin Potts — Last exchange. The anchors are released and now there is nowhere left to hide.`,
  `ANCHOR LEG\nGavin Potts — ${lead?safe(()=>nationName(lead.nation),lead.nation)+' are driving for the line':''}${mine&&!mine.dq?' — '+safe(()=>nationName(mine.nation),mine.nation)+' are in the fight.':''}`,
  `FINISH\nGavin Potts — ${lead?`${safe(()=>nationName(lead.nation),lead.nation)} take it in ${lead.perf.toFixed(2)} seconds${gap?`, ${gap} clear of second`:''}.`:'The relay is complete.'}${rows.some(r=>r.dq)?' One team will show DQ after an exchange infringement.':''}`
 ];
};

function relayPhase(){const i=Math.max(-1,num(liveEventView?.index,-1));return [0,.08,.22,.36,.49,.62,.76,.9,1][Math.min(8,i+1)]||0}
function relayVisual(e,d,rows,done){
 const ordered=[...rows].sort((a,b)=>String(a.nation).localeCompare(String(b.nation))),progress=done?1:relayPhase(),best=Math.min(...rows.filter(r=>!r.dq).map(r=>r.perf).concat([45]));
 const laneH=52,top=70,H=top+ordered.length*laneH+52,start=120,finish=1000,zoneX=[.25,.5,.75].map(p=>start+(finish-start)*p);
 const track=ordered.map((r,i)=>{const y=top+i*laneH,p=r.dq&&done?.82:Math.min(1,progress*Math.max(.88,1-Math.max(0,r.perf-best)*.055)),x=start+(finish-start)*p,c=safe(()=>nationDotColour(r.nation),'#7cc7ee');return `<g><rect x="58" y="${y}" width="965" height="${laneH}" fill="${i%2?'#7b2f3522':'#9d443c24'}"/><path d="M58 ${y+laneH}H1023" stroke="#f5ddd4" stroke-opacity=".32"/><text x="74" y="${y+31}" fill="#d7e5ec" opacity=".6" font-size="10">${i+1}</text><circle cx="${x}" cy="${y+26}" r="11" fill="${c}" stroke="#fff" stroke-opacity=".72" stroke-width="2"/><rect x="${x+8}" y="${y+21}" width="16" height="5" rx="2" fill="#f7d870"/><text x="${Math.min(x+30,925)}" y="${y+30}" fill="#eef7fb" font-size="9" font-weight="800">${esc(safe(()=>nationName(r.nation),r.nation))}</text></g>`}).join('');
 return `<div class="relay-live"><div class="relay-live-head"><span>${esc(RELAYS[d].label)}</span><b>${done?'OFFICIAL RESULT':progress<.25?'LEG 1':progress<.5?'LEG 2':progress<.75?'LEG 3':progress<1?'ANCHOR':'FINISH'}</b></div><svg viewBox="0 0 1080 ${H}" role="img" aria-label="${esc(RELAYS[d].label)} relay"><defs><linearGradient id="rv1bg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#061421"/><stop offset="1" stop-color="#102d3f"/></linearGradient></defs><rect width="1080" height="${H}" fill="url(#rv1bg)"/><rect x="58" y="${top}" width="965" height="${ordered.length*laneH}" rx="8" fill="#713039"/>${zoneX.map(x=>`<rect x="${x-26}" y="${top}" width="52" height="${ordered.length*laneH}" fill="#f4c95d" opacity=".09"/><path d="M${x} ${top}V${top+ordered.length*laneH}" stroke="#f4c95d" stroke-opacity=".38" stroke-dasharray="5 7"/>`).join('')}<path d="M${finish} ${top-8}V${top+ordered.length*laneH+8}" stroke="#fff" stroke-width="4"/>${track}</svg><div class="relay-live-legend">${ordered.map(r=>`<span>${safe(()=>flag(r.nation),'')} ${esc(safe(()=>nationName(r.nation),r.nation))}${done?' · '+(r.dq?'DQ':r.perf.toFixed(2)+'s'):''}</span>`).join('')}</div></div>`;
}
const baseVisual=typeof eventVisualHTML==='function'?eventVisualHTML:null;
if(baseVisual)eventVisualHTML=function(e,d){if(!isRelay(d))return baseVisual.apply(this,arguments);const active=liveEventView?.event===e&&liveEventView.disc===d?liveEventView:null,done=Array.isArray(e.results?.[d]),rows=active?.results||e.results?.[d]||relayField(e,d).map(t=>({...t,perf:45,dq:false}));return `<div class="live-arena"><div class="live-arena-stage">${relayVisual(e,d,rows,done)}</div></div>`};

function patchSelection(){
 const dlg=document.getElementById('selectionDecisionV3');if(!dlg?.open)return;const on=dlg.querySelector('.sdv3-events button.on');if(!on)return;const txt=on.textContent||'',d=txt.includes("Women's 4×100")?'W4X100':txt.includes("Men's 4×100")?'M4X100':null;if(!d)return;
 dlg.classList.add('relay-selection');dlg.querySelectorAll('.sdv3-slot small').forEach((n,i)=>{if(i<4)n.textContent=LEG_NAMES[i]});
 const choice=dlg.querySelector('.sdv3-choice');if(choice&&!choice.querySelector('.relay-selection-note')){const note=document.createElement('div');note.className='relay-selection-note';note.innerHTML='<strong>RUNNING ORDER MATTERS</strong><span>100m and 200m squad athletes can run here even if they are also selected individually at this meeting. Pick four runners in leg order; selecting a relay never uses an extra squad place.</span>';choice.insertBefore(note,choice.querySelector('.sdv3-slots'))}
 dlg.querySelectorAll('.sdv3-athlete[data-athlete]').forEach(card=>{if(card.querySelector('.relay-skill'))return;const a=s.athletes.find(x=>String(x.id)===String(card.dataset.athlete));if(!a)return;const tag=document.createElement('small');tag.className='relay-skill';tag.textContent=`Relay skill ${relaySkill(a)} · ${/200$/.test(a.disc)?'bend option':'sprint option'}`;card.querySelector('div')?.appendChild(tag)});
}
function patchAthleteProfile(){const dlg=document.getElementById('athleteProfile');if(!dlg?.open)return;const a=s.athletes.find(x=>String(x.id)===String(typeof profileId!=='undefined'?profileId:''));if(!a||!/^(M|W)(100|200)$/.test(String(a.disc||'')))return;const tags=dlg.querySelector('.profile-tags');if(tags&&!tags.querySelector('.relay-profile-tag')){const x=document.createElement('span');x.className='relay-profile-tag';x.textContent=`4×100 eligible · relay skill ${relaySkill(a)}`;tags.appendChild(x)}}
let patchQueued=false;function queuePatch(){if(patchQueued)return;patchQueued=true;requestAnimationFrame(()=>{patchQueued=false;patchSelection();patchAthleteProfile()})}
new MutationObserver(queuePatch).observe(document.body,{childList:true,subtree:true});document.addEventListener('click',()=>setTimeout(queuePatch,0),true);

function patchCompetitionRelay(){
 const root=document.getElementById('competition');if(!root)return;for(const d of Object.keys(RELAYS)){const result=safe(()=>{const e=typeof currentEvent==='function'?currentEvent():null;return e?.results?.[d]},null),row=[...root.querySelectorAll('.cj-disc-row')].find(r=>r.querySelector('.cj-disc-name strong')?.textContent?.includes('4×100')&&r.querySelector('.cj-disc-name strong')?.textContent?.includes(RELAYS[d].gender==='M'?"Men":"Women"));if(!row)continue;const count=row.querySelector('.cj-disc-entries');if(count)count.innerHTML='<small>ENTRY</small><strong>1 TEAM</strong>';if(result){const mine=result.find(x=>x.nation===safe(()=>managedNation(),'')),cell=row.querySelector('.cj-disc-player');if(mine&&cell)cell.innerHTML=`<small>YOUR PROGRAMME</small><strong>${esc(safe(()=>nationName(mine.nation),mine.nation))}</strong><span>${mine.dq?'DQ':mine.perf.toFixed(2)+'s'} · ${selectedLineup(typeof currentEvent==='function'?currentEvent():null,d).map(a=>esc(a.name)).join(' · ')}</span>`}}
}
const baseDrawCompetition=typeof drawCompetition==='function'?drawCompetition:null;if(baseDrawCompetition)drawCompetition=function(){const out=baseDrawCompetition.apply(this,arguments);requestAnimationFrame(patchCompetitionRelay);return out};

function allRankingDiscKeys(){return [...Object.keys(DISCIPLINES),...Object.keys(RELAYS).filter(d=>!Object.keys(DISCIPLINES).includes(d))]}
function relayRankingRows(d){
 const byNation=new Map();
 for(const e of s?.events||[]){
  const rows=e?.results?.[d];if(!Array.isArray(rows))continue;
  for(const r of rows){
   if(!r?.nation)continue;
   const row=byNation.get(r.nation)||{nation:r.nation,points:0,starts:0,best:null,wins:0,podiums:0};
   row.points+=num(r.points);
   if(!r.dns)row.starts++;
   if(!r.dq&&!r.dns&&Number.isFinite(Number(r.perf))){
    const mark=Number(r.perf);row.best=row.best==null?mark:Math.min(row.best,mark);
    if(num(r.rank)===1)row.wins++;if(num(r.rank)>=1&&num(r.rank)<=3)row.podiums++;
   }
   byNation.set(r.nation,row);
  }
 }
 return [...byNation.values()].filter(r=>r.starts>0||r.points>0).sort((a,b)=>b.points-a.points||(a.best??Infinity)-(b.best??Infinity)||b.wins-a.wins||safe(()=>nationName(a.nation),a.nation).localeCompare(safe(()=>nationName(b.nation),b.nation)));
}
function relaySeasonLead(d){
 let best=null;for(const e of s?.events||[])for(const r of e?.results?.[d]||[]){if(r?.dq||r?.dns||!Number.isFinite(Number(r?.perf)))continue;if(!best||Number(r.perf)<best.value)best={value:Number(r.perf),nation:r.nation,name:safe(()=>nationName(r.nation),r.nation),event:e.name,week:e.week}}return best;
}
function relayRecordRowHTML(d,active=false){
 const st=relayState(),rw=st.records.world[d],nn=st.records.national?.[safe(()=>managedNation(),'GREAT BRITAIN')]?.[d];
 return `<tr data-relay-record="${d}" ${active?'style="background:#ffffff05"':''}><td><strong>${esc(safe(()=>discLabel(d),RELAYS[d].label))}</strong></td><td class="score">${rw?fmtPerf(d,rw.value):'—'}</td><td>${rw?.holder||'—'}${rw?.nation?` • ${safe(()=>flag(rw.nation),'')}`:''}</td><td class="score">${nn?fmtPerf(d,nn.value):'—'}</td><td>${nn?.holder||'—'}</td></tr>`;
}
function relayRecordBookHTML(activeDisc){
 const normal=Object.keys(DISCIPLINES).map(d=>{const rw=s.records?.world?.[d],nn=s.records?.national?.[safe(()=>managedNation(),'GREAT BRITAIN')]?.[d];return `<tr ${d===activeDisc?'style="background:#ffffff05"':''}><td><strong>${discLabel(d)}</strong></td><td class="score">${rw?fmtPerf(d,rw.value):'—'}</td><td>${rw?.holder||'—'}${rw?.nation&&rw.nation!=='WORLD'?` • ${flag(rw.nation)}`:''}</td><td class="score">${nn?fmtPerf(d,nn.value):'—'}</td><td>${nn?.holder||'—'}</td></tr>`}).join('');
 return normal+Object.keys(RELAYS).map(d=>relayRecordRowHTML(d,d===activeDisc)).join('');
}
function rankingOptionsHTML(activeDisc){return allRankingDiscKeys().map(d=>`<option value="${d}" ${d===activeDisc?'selected':''}>${esc(safe(()=>discLabel(d),RELAYS[d]?.label||d))}</option>`).join('')}
function patchRankingsRelayNavigation(){
 const root=document.getElementById('rankings'),select=document.getElementById('rankingEventSelect');if(!root||!select)return;
 for(const d of Object.keys(RELAYS))if(!select.querySelector(`option[value="${d}"]`)){const opt=document.createElement('option');opt.value=d;opt.textContent=safe(()=>discLabel(d),RELAYS[d].label);select.appendChild(opt)}
 select.value=rankingDisc;select.onchange=()=>{rankingDisc=select.value;drawRankings()};
 const recordPanel=[...root.querySelectorAll('.panel')].find(p=>p.querySelector('.panel-h strong')?.textContent?.trim()==='Record Book'),tbody=recordPanel?.querySelector('tbody');
 if(tbody)for(const d of Object.keys(RELAYS))if(!tbody.querySelector(`[data-relay-record="${d}"]`))tbody.insertAdjacentHTML('beforeend',relayRecordRowHTML(d,false));
}
function drawRelayRankings(d){
 const ranked=relayRankingRows(d),lead=relaySeasonLead(d),st=relayState(),wr=st.records.world[d],nr=st.records.national?.[safe(()=>managedNation(),'GREAT BRITAIN')]?.[d],starts=ranked.reduce((n,r)=>n+r.starts,0);
 const shown=ranked.slice(0,8);if(ranked.length&&!shown.some(r=>r.nation===safe(()=>managedNation(),''))){const mine=ranked.find(r=>r.nation===safe(()=>managedNation(),''));if(mine)shown.push(mine)}
 const root=document.getElementById('rankings');if(!root)return;
 root.innerHTML=`<div class="section-head"><div><h2>World Rankings & Records</h2><p>${s.game.season} global season. Relay nations are ranked by points earned in ranked 4×100m meetings.</p></div><span class="status">${esc(safe(()=>discLabel(d),RELAYS[d].label))}</span></div>
 <section class="panel"><div class="panel-h"><strong>Choose Event</strong><span>Individual and relay world rankings</span></div><div class="ranking-selector"><label for="rankingEventSelect">Event<select id="rankingEventSelect" aria-label="World rankings event">${rankingOptionsHTML(d)}</select></label><p>Select an event to update the world ranking, season lead, records and nation standings below.</p></div></section>
 <div class="grid4" style="margin-top:10px">
  <div class="metric"><small>World Lead</small><strong>${lead?fmtPerf(d,lead.value):'—'}</strong><span class="muted" style="font-size:8px">${lead?`${safe(()=>flag(lead.nation),'')} ${esc(lead.name)}`:'No relay mark this season'}</span></div>
  <div class="metric"><small>World Record</small><strong>${wr?fmtPerf(d,wr.value):'—'}</strong><span class="muted" style="font-size:8px">${esc(wr?.holder||'—')}${wr?.nation?` • ${safe(()=>flag(wr.nation),'')}`:''}</span></div>
  <div class="metric"><small>${esc(safe(()=>nationName(managedNation()),managedNation()))} Record</small><strong>${nr?fmtPerf(d,nr.value):'—'}</strong><span class="muted" style="font-size:8px">${esc(nr?.holder||'No relay record yet')}</span></div>
  <div class="metric"><small>Ranked Teams</small><strong>${ranked.length}</strong><span class="muted" style="font-size:8px">${starts} team start${starts===1?'':'s'} logged</span></div>
 </div>
 <div class="rank-grid" style="margin-top:10px"><div class="stack">
  <section class="panel"><div class="panel-h"><strong>${esc(safe(()=>discLabel(d),RELAYS[d].label))} World Ranking</strong><span>Season points</span></div><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Nation</th><th>Season Best</th><th class="num">Starts</th><th class="num">Points</th></tr></thead><tbody>${ranked.length?ranked.slice(0,40).map((r,i)=>`<tr><td class="score">${i+1}</td><td><strong>${safe(()=>flag(r.nation),'')} ${esc(safe(()=>nationName(r.nation),r.nation))}</strong></td><td>${r.best==null?'—':fmtPerf(d,r.best)}</td><td class="num">${r.starts}</td><td class="num score">${r.points}</td></tr>`).join(''):`<tr><td colspan="5" class="muted">No relay teams have recorded a ranked start this season.</td></tr>`}</tbody></table></div></section>
  <section class="panel"><div class="panel-h"><strong>Record Book</strong><span>Individual and relay events</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Event</th><th>World Record</th><th>Holder</th><th>${esc(safe(()=>nationName(managedNation()),managedNation()))} Record</th><th>Holder</th></tr></thead><tbody>${relayRecordBookHTML(d)}</tbody></table></div></section>
 </div><aside class="panel"><div class="panel-h"><strong>${esc(safe(()=>discLabel(d),RELAYS[d].label))} Nation Standings</strong><span>Relay points</span></div>${shown.length?shown.map(r=>`<div class="nation-row ${r.nation===safe(()=>managedNation(),'')?'gb':''}"><strong>${ranked.findIndex(x=>x.nation===r.nation)+1}</strong><div><strong>${safe(()=>flag(r.nation),'')} ${esc(safe(()=>nationName(r.nation),r.nation))}</strong><div class="muted" style="font-size:8px">${r.best==null?'No valid mark':`SB ${fmtPerf(d,r.best)} · ${r.starts} start${r.starts===1?'':'s'}`}</div></div><strong>${r.points}</strong></div>`).join(''):'<div class="muted" style="padding:14px">Relay standings will populate after the first ranked 4×100m meeting.</div>'}</aside></div>`;
 const select=document.getElementById('rankingEventSelect');if(select)select.onchange=()=>{rankingDisc=select.value;drawRankings()};
}
const baseDrawRankings=typeof drawRankings==='function'?drawRankings:null;
if(baseDrawRankings)drawRankings=function(){
 if(isRelay(rankingDisc))return drawRelayRankings(rankingDisc);
 const out=baseDrawRankings.apply(this,arguments);patchRankingsRelayNavigation();return out;
};

migrate();queuePatch();
window.AMRelayV1={version:1,isRelay,eligible:relayEligible,bestLineup,estimateLineup,relaySkill,state:relayState,rankingRows:relayRankingRows,seasonLead:relaySeasonLead,events:[...RELAY_EVENT_IDS],disciplines:Object.keys(RELAYS),migrate};
})();
