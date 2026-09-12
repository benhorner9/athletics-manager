/* Athletics Manager — Athlete Attributes V1 Preview
   Player-facing event-specific attribute assessments on a 1–20 scale.
   This preview deliberately does not expose or calculate a player-facing Overall rating.
   The current simulation still uses the legacy performance model until the attribute model is approved. */
(function(){
'use strict';
if(window.AMAthleteAttributes)return;

const VERSION='0.1-preview';
const SCALE=20;
const SETS={
 sprint:[
  ['acceleration','Acceleration','ACC'],
  ['maxVelocity','Max Velocity','VEL'],
  ['speedEndurance','Speed Endurance','SEN'],
  ['start','Start','STA'],
  ['power','Power','POW'],
  ['technique','Technique','TEC'],
  ['consistency','Consistency','CON'],
  ['composure','Composure','COM']
 ],
 endurance:[
  ['aerobicCapacity','Aerobic Capacity','AER'],
  ['threshold','Threshold','THR'],
  ['runningEconomy','Running Economy','ECO'],
  ['endurance','Endurance','END'],
  ['kickSpeed','Kick Speed','KIC'],
  ['tacticalJudgement','Tactical Judgement','TAC'],
  ['consistency','Consistency','CON'],
  ['composure','Composure','COM']
 ],
 jump:[
  ['approachSpeed','Approach Speed','APP'],
  ['takeOff','Take-Off','T/O'],
  ['elasticity','Elasticity','ELA'],
  ['technique','Technique','TEC'],
  ['coordination','Coordination','CRD'],
  ['power','Power','POW'],
  ['consistency','Consistency','CON'],
  ['composure','Composure','COM']
 ],
 throw:[
  ['strength','Strength','STR'],
  ['explosivePower','Explosive Power','EXP'],
  ['releaseSpeed','Release Speed','REL'],
  ['technique','Technique','TEC'],
  ['coordination','Coordination','CRD'],
  ['mobility','Mobility','MOB'],
  ['consistency','Consistency','CON'],
  ['composure','Composure','COM']
 ],
 general:[
  ['speed','Speed','SPD'],
  ['power','Power','POW'],
  ['endurance','Endurance','END'],
  ['technique','Technique','TEC'],
  ['coordination','Coordination','CRD'],
  ['mobility','Mobility','MOB'],
  ['consistency','Consistency','CON'],
  ['composure','Composure','COM']
 ]
};

const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
function hash(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function familyFor(a){
 const d=String(a?.disc||''),meta=typeof DISCIPLINES!=='undefined'?DISCIPLINES[d]:null,distance=Number(meta?.distance||d.match(/(10000|5000|1500|800|400|200|100)/)?.[1]||0);
 if(meta?.family==='endurance'||distance>=800)return'endurance';
 if(/^(M|W)(100|200|400)$/.test(d))return'sprint';
 if(meta?.type==='height'||/HJ$/i.test(d))return'jump';
 if(meta?.type==='distance'||/SP$/i.test(d))return'throw';
 return'general';
}
function familyLabel(family){return({sprint:'Sprint profile',endurance:'Endurance profile',jump:'Jump profile',throw:'Throws profile',general:'Performance profile'})[family]||'Performance profile'}
function baseRating(a){
 /* Preview bridge only: converts the existing hidden simulation strength into the new scale.
    Once approved, the simulation will own these attributes directly and this bridge disappears. */
 return clamp(Math.round(clamp(Number(a?.overall)||60,1,100)/5),1,SCALE);
}
function ageAdjustment(a,key){
 const age=Number(a?.age)||24;
 if((key==='composure'||key==='consistency')&&age>=29)return 1;
 if((key==='composure'||key==='consistency')&&age<=20)return-1;
 return 0;
}
function get(a){
 const family=familyFor(a),defs=SETS[family]||SETS.general,base=baseRating(a);
 const offsets=defs.map(([key])=>(hash(`${a?.id||a?.name}|${a?.disc}|${key}|attributes-v1`)%9)-4);
 const mean=offsets.reduce((sum,n)=>sum+n,0)/Math.max(1,offsets.length);
 const rows=defs.map(([key,label,abbr],index)=>{
  const score=clamp(Math.round(base+(offsets[index]-mean)*.9+ageAdjustment(a,key)),1,SCALE);
  return{key,label,abbr,score,band:band(score)};
 });
 return{version:VERSION,scale:SCALE,family,familyLabel:familyLabel(family),attributes:rows};
}
function band(score){const n=Number(score)||0;if(n>=18)return'elite';if(n>=15)return'excellent';if(n>=12)return'strong';if(n>=9)return'solid';if(n>=6)return'developing';return'limited'}
function bandLabel(score){return({elite:'Elite',excellent:'Excellent',strong:'Strong',solid:'Solid',developing:'Developing',limited:'Limited'})[band(score)]}
function top(a,count=3){return get(a).attributes.slice().sort((x,y)=>y.score-x.score||x.label.localeCompare(y.label)).slice(0,Math.max(1,Number(count)||3))}
function weakest(a,count=2){return get(a).attributes.slice().sort((x,y)=>x.score-y.score||x.label.localeCompare(y.label)).slice(0,Math.max(1,Number(count)||2))}
function diagnostics(){return{version:VERSION,scale:SCALE,families:Object.keys(SETS),playerFacingOverall:false}}

window.AMAthleteAttributes=Object.freeze({version:VERSION,scale:SCALE,get,top,weakest,familyFor,familyLabel,band,bandLabel,diagnostics});
})();
