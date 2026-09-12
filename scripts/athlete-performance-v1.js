/* Athletics Manager — Athlete Performance V1
   Canonical competition selection and non-live performance model.
   Uses event-specific 1–20 attributes, objective performance evidence and readiness.
   Hidden legacy Overall is deliberately excluded. */
(function(){
'use strict';
if(window.AMAthletePerformance)return;

const VERSION='1.0';
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
const type=d=>typeof DISCIPLINES!=='undefined'?DISCIPLINES?.[d]?.type||'':'';
const distance=d=>Number(typeof DISCIPLINES!=='undefined'?DISCIPLINES?.[d]?.distance||0:0);
const lowerIsBetter=d=>type(d)==='time';

function attrModel(a){try{return window.AMAthleteAttributes?.get?.(a)||null}catch(_){return null}}
function valueMap(model){return Object.fromEntries((model?.attributes||[]).map(x=>[x.key,Number(x.score)||10]))}
function profile(a,d=a?.disc){
 const model=attrModel(a);if(!model?.attributes?.length)return null;
 const values=valueMap(model),get=(key,fallback=10)=>Number.isFinite(values[key])?values[key]:fallback;
 const family=model.family||window.AMAthleteAttributes?.familyFor?.(a)||'general',n=distance(d);let weights;
 if(family==='sprint')weights=n<=100?{acceleration:.18,maxVelocity:.24,speedEndurance:.12,start:.14,power:.12,technique:.08,consistency:.06,composure:.06}:n<=200?{acceleration:.12,maxVelocity:.20,speedEndurance:.22,start:.08,power:.10,technique:.10,consistency:.09,composure:.09}:{acceleration:.06,maxVelocity:.12,speedEndurance:.28,start:.05,power:.09,technique:.12,consistency:.14,composure:.14};
 else if(family==='endurance')weights=n<=800?{aerobicCapacity:.14,threshold:.14,runningEconomy:.10,endurance:.12,kickSpeed:.16,tacticalJudgement:.14,consistency:.10,composure:.10}:n<=1500?{aerobicCapacity:.18,threshold:.18,runningEconomy:.14,endurance:.15,kickSpeed:.10,tacticalJudgement:.10,consistency:.08,composure:.07}:{aerobicCapacity:.24,threshold:.20,runningEconomy:.18,endurance:.18,kickSpeed:.04,tacticalJudgement:.06,consistency:.06,composure:.04};
 else if(family==='jump')weights={approachSpeed:.15,takeOff:.24,elasticity:.13,technique:.20,coordination:.10,power:.08,consistency:.05,composure:.05};
 else if(family==='throw')weights={strength:.14,explosivePower:.24,releaseSpeed:.24,technique:.18,coordination:.08,mobility:.04,consistency:.04,composure:.04};
 else weights=Object.fromEntries(model.attributes.map(x=>[x.key,1/model.attributes.length]));
 let weighted=0,total=0;for(const [key,w] of Object.entries(weights)){weighted+=get(key)*w;total+=w}
 const score=total?weighted/total:10;
 return {family,score:+score.toFixed(2),consistency:get('consistency'),composure:get('composure'),technique:get('technique'),attributes:model.attributes.map(x=>({...x}))};
}

function readiness(a){
 const morale=typeof athleteMorale==='function'?Number(athleteMorale(a))||65:65;
 return clamp((Number(a?.form)||80)*.36+(Number(a?.fitness)||85)*.34+(100-(Number(a?.fatigue)||15))*.24+(morale-65)*.06,0,100);
}
function evidenceLevel(a){
 try{const n=Number(window.AMAthleteAttributes?.performanceRating?.(a));if(Number.isFinite(n))return clamp(n,1,20)}catch(_){ }
 const pb=Number(a?.pb),wr=Number(typeof WORLD_RECORDS!=='undefined'?WORLD_RECORDS?.[a?.disc]:0);if(!(pb>0&&wr>0))return 10;
 const ratio=lowerIsBetter(a?.disc)?wr/pb:pb/wr;
 return clamp(1+(clamp((ratio-.62)/.38,0,1)*19),1,20);
}
function pointsEvidence(a){return clamp(Math.sqrt(Math.max(0,Number(a?.points)||0))*8,0,100)}
function selectionScore(a){
 if(!a)return 0;
 const p=profile(a,a.disc),attr100=p?((p.score-1)/19)*100:((evidenceLevel(a)-1)/19)*100,evidence100=((evidenceLevel(a)-1)/19)*100;
 return +clamp(evidence100*.50+attr100*.30+readiness(a)*.17+pointsEvidence(a)*.03,0,100).toFixed(3);
}

function supportFromBonus(staffBonus=0){return Math.max(0,Number(staffBonus)||0)}
function expectedMark(a,d=a?.disc,staffBonus=0){
 const pb=Number(a?.pb);if(!(pb>0))return 1;
 const p=profile(a,d),score=p?.score??evidenceLevel(a),consistency=p?.consistency??10,ready=readiness(a),quality=(score-1)/19,repeat=(consistency-1)/19,support=supportFromBonus(staffBonus),kind=type(d);
 if(kind==='time'){
  let gap=.0175-quality*.0072-repeat*.0028-(ready-80)*.00012-support*.00045;
  gap=clamp(gap,.0025,.020);
  return +(pb*(1+gap)).toFixed(3);
 }
 if(kind==='height'){
  let gap=.10-quality*.047-repeat*.015-(ready-80)*.0012-support*.0025;
  gap=clamp(gap,.015,.105);
  return +(pb-gap).toFixed(3);
 }
 let ratio=.905+quality*.047+repeat*.016+(ready-80)*.00045+support*.0011;
 ratio=clamp(ratio,.90,.988);
 return +(pb*ratio).toFixed(3);
}
function simulate(a,d=a?.disc,staffBonus=0){
 const anchor=expectedMark(a,d,staffBonus),p=profile(a,d),consistency=p?.consistency??10,composure=p?.composure??10,steadiness=clamp((consistency+composure)/40,0,1),kind=type(d);
 if(kind==='time'){
  const spread=clamp(.010-(steadiness*.0055),.0035,.010),noise=(Math.random()*2-1)*spread;
  return +(Math.max(.01,anchor*(1+noise))).toFixed(2);
 }
 if(kind==='height'){
  const spread=clamp(.055-steadiness*.032,.018,.055),noise=(Math.random()*2-1)*spread;
  return +Math.max(.1,anchor+noise).toFixed(2);
 }
 const spread=clamp(.030-steadiness*.016,.010,.030),noise=(Math.random()*2-1)*spread;
 return +Math.max(.1,anchor*(1+noise)).toFixed(2);
}
function diagnostics(){return{version:VERSION,authority:'attributes + objective evidence + readiness',usesOverall:false,scale:20}}

const api=Object.freeze({version:VERSION,profile,readiness,evidenceLevel,selectionScore,expectedMark,simulate,diagnostics});
window.AMAthletePerformance=api;
/* Replace legacy competition helpers once the attribute model is available. */
try{performanceScore=function(a){return api.selectionScore(a)}}catch(_){ }
try{rawPerformance=function(a,d,staffBonus=0){return api.simulate(a,d,staffBonus)}}catch(_){ }
})();
