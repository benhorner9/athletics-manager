/* ===== Athletics Manager Live Event Engine V2 ===== */
(function(){
'use strict';
if(window.__amLiveEventEngineV2)return;
window.__amLiveEventEngineV2=1;

const $=id=>document.getElementById(id);
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const athlete=id=>(s?.athletes||[]).find(a=>String(a.id)===String(id))||null;
const managed=()=>typeof managedNation==='function'?managedNation():'';
const eventName=d=>typeof discLabel==='function'?discLabel(d):String(d||'Event');
const eventType=d=>DISCIPLINES?.[d]?.type||'';
const eventDistance=d=>Number(DISCIPLINES?.[d]?.distance)||0;
const performanceText=(d,v)=>typeof fmtPerf==='function'?fmtPerf(d,v):(Number.isFinite(+v)?String(+v):'â€”');
const colour=n=>{try{return nationDotColour(n)||'#7ea7bf'}catch(_){return'#7ea7bf'}};
const hash=value=>{try{return hashString(String(value))>>>0}catch(_){let h=2166136261;for(const ch of String(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}};
const rand=(key,a=0,b=1)=>a+(hash(key)%10000)/10000*(b-a);
const clone=value=>{try{return structuredClone(value)}catch(_){try{return JSON.parse(JSON.stringify(value))}catch(__){return value}}};
const SPEEDS=[1,2,4];
const TRACK={left:190,right:570,cy:225,inner:76,lane:11};
const PREFERRED_LANES=[4,5,3,6,2,7,1,8];

function config(d){
 const code=String(d||'').toUpperCase(),type=eventType(d),dist=eventDistance(d);
 let family='generic';
 if(type==='time')family=dist<=800?'lane':'distance';
 else if(/^(HJ|PV)$/.test(code)||type==='height')family='vertical';
 else if(/^(LJ|TJ)$/.test(code))family='horizontal';
 else if(/^(SP|DT|HT|JT)$/.test(code)||type==='distance')family='throw';
 return {code,type,distance:dist,family,lanes:family==='lane'?8:0,maxAthletes:8,attempts:['throw','horizontal'].includes(family)?6:0,laps:dist?Math.max(1,Math.ceil(dist/400)):0};
}
window.AMLiveEventConfig={config};

function statusOf(r){
 const status=String(r?.status||r?.resultStatus||'').toUpperCase();
 if(status.includes('DNS')||r?.dns)return'DNS';
 if(status.includes('DNF')||r?.dnf)return'DNF';
 if(status.includes('DQ')||r?.dq||r?.disqualified)return'DQ';
 return'';
}
function valueOf(r){const n=Number(r?.mark??r?.perf);return Number.isFinite(n)?n:null}
function rowOf(r,i){
 const a=athlete(r?.id||r?.athleteId);
 return {id:r?.id||r?.athleteId||`row-${i}`,name:r?.name||a?.name||`Athlete ${i+1}`,nation:r?.nation||a?.nation||'',perf:valueOf(r),lane:Number(r?.lane)||null,place:Number(r?.place)||i+1,status:statusOf(r),source:r};
}
function discs(e){return(e?.disc||[]).filter(d=>d&&d!=='ALL')}
function meetingDone(e){const list=discs(e);return list.length>0&&list.every(d=>Array.isArray(e.results?.[d]))}
function safeSave(){try{save()}catch(err){console.warn('Live event save recovered',err)}}
function pendingResults(e,d){
 e.livePending??={};
 const old=e.livePending[d];
 if(old?.version===2&&Array.isArray(old.results)){
  if(old.engine){e.engine??={};e.engine[d]=clone(old.engine)}
  return clone(old.results);
 }
 const results=simulateDiscipline(e,d);
 e.livePending[d]={version:2,results:clone(results),engine:clone(e.engine?.[d]||{}),createdAt:new Date().toISOString()};
 safeSave();
 return results;
}
function commitOnce(e,d,results){
 e.results??={};
 if(Array.isArray(e.results[d]))return false;
 commitDisciplineResults(e,d,results);
 if(e.livePending?.[d])delete e.livePending[d];
 if(e.livePending&&!Object.keys(e.livePending).length)delete e.livePending;
 safeSave();
 return true;
}

function checkpoints(dist){
 if(dist<=100)return[0,20,40,60,80,100];
 if(dist<=200)return[0,50,100,150,200];
 if(dist<=400)return[0,100,200,300,400];
 if(dist<=800)return[0,200,400,600,800];
 if(dist<=1500)return[0,300,700,1100,1500];
 if(dist<=3000)return[0,600,1200,1800,2400,3000];
 if(dist<=5000)return[0,1000,2000,3000,4000,5000];
 if(dist<=10000)return[0,2000,4000,6000,8000,10000];
 return[0,dist*.2,dist*.4,dist*.6,dist*.8,dist];
}
function splitPlan(row,d,key){
 const cps=checkpoints(eventDistance(d)),total=Math.max(.01,row.perf||1),weights=[];
 for(let i=1;i<cps.length;i++){
  const metres=cps[i]-cps[i-1],noise=rand(`${key}|${row.id}|${i}`,-1,1);
  let factor=1+noise*(config(d).family==='distance'?.055:.022);
  if(config(d).family==='lane'&&i===1)factor+=eventDistance(d)<=200?.16:.08;
  if(i===cps.length-1)factor+=rand(`${key}|${row.id}|finish`,-.07,.05);
  weights.push(metres*Math.max(.72,factor));
 }
 const sum=weights.reduce((a,b)=>a+b,0),times=[0];let totalTime=0;
 weights.forEach(w=>{totalTime+=total*w/sum;times.push(totalTime)});
 return{cps,times,total};
}
function metresFromPlan(plan,clock){
 if(clock<=0)return 0;
 if(clock>=plan.total)return plan.cps.at(-1);
 for(let i=1;i<plan.times.length;i++){
  if(clock<=plan.times[i]){
   const t=(clock-plan.times[i-1])/(plan.times[i]-plan.times[i-1]||1);
   return plan.cps[i-1]+(plan.cps[i]-plan.cps[i-1])*clamp(t);
  }
 }
 return plan.cps.at(-1);
}
function buildTrack(e,d,results){
 const engineStages=Array.isArray(e.engine?.[d]?.stages)?e.engine[d].stages:[];
 const raw=engineStages.length?engineStages:[{name:'Final',rows:results}];
 const stages=raw.map((stage,si)=>{
  let rows=(stage.rows||[]).map(rowOf).filter(r=>r.perf!=null||r.status);
  if(config(d).family==='lane')rows=rows.slice(0,8);
  const used=new Set(),stored=e.engine?.[d]?.race?.startLanes||{};
  if(config(d).family==='lane')rows.forEach((r,i)=>{let lane=Number(r.lane)||Number(stored[r.id]);if(!lane||lane>8||used.has(lane))lane=PREFERRED_LANES.find(x=>!used.has(x))||i+1;used.add(lane);r.lane=lane});
  const key=`${e.id}|${d}|${stage.name||si}|${si}`,slowest=Math.max(.01,...rows.map(r=>r.perf||0));
  let presentation=eventDistance(d)<=100?10:eventDistance(d)<=200?13:eventDistance(d)<=400?17:eventDistance(d)<=800?23:eventDistance(d)<=1500?29:eventDistance(d)<=5000?38:47;
  if(raw.length>1&&si<raw.length-1)presentation*=.72;
  return{name:stage.name||`Round ${si+1}`,rows,key,slowest,presentation,plans:new Map(rows.map(r=>[String(r.id),splitPlan(r,d,key)]))};
 }).filter(x=>x.rows.length);
 return{stages,index:0,elapsed:0,gap:0,state:null,lastLeader:null,lastLeadTime:-99,checkpoint:1,finalSection:false,finishLine:false,announcedStops:new Set()};
}
function trackState(v){
 const t=v.track,stage=t.stages[t.index],dist=eventDistance(v.disc),progress=clamp(t.elapsed/stage.presentation),clock=progress*stage.slowest,injuryPlans=v.event.engine?.[v.disc]?.aiRealism?.plans||{};
 const items=stage.rows.map(row=>{
  let metres=row.status==='DNS'?0:metresFromPlan(stage.plans.get(String(row.id)),clock),stopped=false;
  const injury=Number(injuryPlans?.[row.id]?.injuryProgress);
  if(row.status==='DNF'||injuryPlans?.[row.id]?.dnf){const stop=dist*(Number.isFinite(injury)?clamp(injury,.15,.95):rand(`${stage.key}|${row.id}|dnf`,.52,.85));if(metres>=stop){metres=stop;stopped=true}}
  return{row,metres,stopped,finished:!row.status&&!stopped&&metres>=dist};
 });
 let order=[...items].sort((a,b)=>{
  if(!!a.row.status!==!!b.row.status)return a.row.status?1:-1;
  if(a.finished&&b.finished)return(a.row.perf??Infinity)-(b.row.perf??Infinity);
  if(a.finished!==b.finished)return a.finished?-1:1;
  if(Math.abs(b.metres-a.metres)>.05)return b.metres-a.metres;
  return(a.row.perf??Infinity)-(b.row.perf??Infinity);
 });
 if(progress>=1)order=[...items].sort((a,b)=>{if(!!a.row.status!==!!b.row.statuq¶¬{®(š+my×è­ºÞ¾+rŠzÞÂ¸­