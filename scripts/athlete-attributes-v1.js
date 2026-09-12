/* Athletics Manager — Athlete Attributes V1 Preview
   Player-facing event-specific attribute assessments on a 1–20 scale.
   This preview deliberately does not expose or calculate a player-facing Overall rating.
   Ratings are calibrated primarily from objective event performance, with the legacy simulation
   strength used only as a small transition signal until attributes become the simulation model. */
(function(){
'use strict';
if(window.AMAthleteAttributes)return;

const VERSION='0.3-preview';
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
function eventMeta(a){const d=String(a?.disc||'');return typeof DISCIPLINES!=='undefined'?DISCIPLINES[d]||{}:{}}
function lowerIsBetter(a){return eventMeta(a)?.type==='time'}
function isBetterValue(a,x,y){return lowerIsBetter(a)?Number(x)<=Number(y):Number(x)>=Number(y)}
function validMark(v){return Number.isFinite(Number(v))&&Number(v)>0}
function standardFor(a,key){
 try{
  if(typeof SELECTION_STANDARDS==='undefined')return null;
  const row=SELECTION_STANDARDS?.[a?.disc];
  const value=row?.[key];
  return validMark(value)?Number(value):null;
 }catch(_){return null}
}
function worldRecordFor(a){
 try{
  if(typeof WORLD_RECORDS==='undefined')return null;
  const value=WORLD_RECORDS?.[a?.disc];
  return validMark(value)?Number(value):null;
 }catch(_){return null}
}
function interpolateMark(a,mark,aMark,aScore,bMark,bScore){
 if(!validMark(mark)||!validMark(aMark)||!validMark(bMark)||Number(aMark)===Number(bMark))return aScore;
 const lower=lowerIsBetter(a);
 const span=lower?Number(aMark)-Number(bMark):Number(bMark)-Number(aMark);
 const progress=span===0?0:(lower?(Number(aMark)-Number(mark))/span:(Number(mark)-Number(aMark))/span);
 return aScore+clamp(progress,0,1)*(bScore-aScore);
}
function fallbackPerformanceRating(a){
 const mark=Number(a?.pb),wr=worldRecordFor(a);if(!validMark(mark)||!validMark(wr))return null;
 const quality=lowerIsBetter(a)?wr/mark:mark/wr;
 const anchors=[[.995,20],[.975,19],[.950,18],[.920,17],[.890,16],[.860,15],[.830,14],[.800,13],[.770,12],[.740,11],[.710,10],[.680,9],[.650,8],[.620,7],[.590,6],[0,5]];
 for(const [q,r] of anchors)if(quality>=q)return r;
 return 5;
}
function performanceRating(a){
 const mark=Number(a?.pb);if(!validMark(mark))return fallbackPerformanceRating(a);
 const national=standardFor(a,'National'),international=standardFor(a,'International'),world=standardFor(a,'World'),olympic=standardFor(a,'Olympic'),wr=worldRecordFor(a);
 if(!validMark(national)||!validMark(international)||!validMark(world))return fallbackPerformanceRating(a);
 const eliteMark=validMark(wr)?(lowerIsBetter(a)?wr*1.015:wr*.985):olympic;
 const top=validMark(olympic)?olympic:world;
 if(validMark(eliteMark)&&isBetterValue(a,mark,eliteMark))return 20;
 if(validMark(top)&&isBetterValue(a,mark,top))return Math.round(interpolateMark(a,mark,top,18,eliteMark||top,20));
 if(isBetterValue(a,mark,world))return Math.round(interpolateMark(a,mark,world,16,top||world,18));
 if(isBetterValue(a,mark,international))return Math.round(interpolateMark(a,mark,international,14,world,16));
 if(isBetterValue(a,mark,national))return Math.round(interpolateMark(a,mark,national,12,international,14));
 const development=lowerIsBetter(a)?national*1.18:national*.82;
 if(isBetterValue(a,mark,development))return Math.round(interpolateMark(a,mark,development,6,national,12));
 const raw=lowerIsBetter(a)?national*1.35:national*.68;
 if(isBetterValue(a,mark,raw))return Math.round(interpolateMark(a,mark,raw,3,development,6));
 return 3;
}
function legacyBridgeRating(a){
 const old=clamp(Number(a?.overall)||60,35,100);
 return clamp(Math.round(9+(old-50)/5),5,19);
}
function calibratedBase(a){
 const performance=performanceRating(a);
 /* Objective performance owns the visible scale. The old hidden rating is fallback data only when
    an athlete genuinely has no usable PB/standard evidence. */
 return Number.isFinite(performance)?clamp(Math.round(performance),3,20):legacyBridgeRating(a);
}
function ageAdjustment(a,key){
 const age=Number(a?.age)||24;
 if((key==='composure'||key==='consistency')&&age>=30)return 1;
 if((key==='composure'||key==='consistency')&&age<=20)return-1;
 return 0;
}
function shapeOffsets(a,defs){
 const shape=[-2,-1,-1,0,0,1,1,2];
 const order=defs.map(([,label],index)=>({index,h:hash(`${a?.id||a?.name}|${a?.disc}|${label}|shape-v2`)})).sort((x,y)=>x.h-y.h||x.index-y.index);
 const out=Array(defs.length).fill(0);order.forEach((entry,rank)=>{out[entry.index]=shape[rank%shape.length]});return out;
}
function eliteCaps(performanceLevel){
 const level=Number(performanceLevel)||0;
 if(level>=20)return{max:20,twenties:1,nineteenPlus:3};
 if(level>=19)return{max:19,twenties:0,nineteenPlus:2};
 if(level>=18)return{max:19,twenties:0,nineteenPlus:1};
 if(level>=17)return{max:18,twenties:0,nineteenPlus:0};
 if(level>=16)return{max:17,twenties:0,nineteenPlus:0};
 if(level>=14)return{max:16,twenties:0,nineteenPlus:0};
 if(level>=12)return{max:15,twenties:0,nineteenPlus:0};
 if(level>=9)return{max:13,twenties:0,nineteenPlus:0};
 return{max:11,twenties:0,nineteenPlus:0};
}
function enforceEliteRarity(a,rows,performanceLevel){
 const caps=eliteCaps(performanceLevel);rows.forEach(row=>{row.score=clamp(row.score,1,caps.max)});
 const priority=rows.slice().sort((x,y)=>y.score-x.score||hash(`${a?.id||a?.name}|${x.key}|elite-priority`)-hash(`${a?.id||a?.name}|${y.key}|elite-priority`));
 let twenties=0;for(const row of priority)if(row.score>=20){twenties++;if(twenties>caps.twenties)row.score=19}
 let nineteenPlus=0;for(const row of priority.sort((x,y)=>y.score-x.score||x.label.localeCompare(y.label)))if(row.score>=19){nineteenPlus++;if(nineteenPlus>caps.nineteenPlus)row.score=18}
 return rows;
}
function get(a){
 const family=familyFor(a),defs=SETS[family]||SETS.general,performanceLevel=performanceRating(a),base=calibratedBase(a),offsets=shapeOffsets(a,defs);
 const rows=defs.map(([key,label,abbr],index)=>({key,label,abbr,score:clamp(Math.round(base+offsets[index]+ageAdjustment(a,key)),1,SCALE)}));
 enforceEliteRarity(a,rows,performanceLevel);
 rows.forEach(row=>{row.band=band(row.score)});
 return{version:VERSION,scale:SCALE,family,familyLabel:familyLabel(family),performanceLevel,base,attributes:rows};
}
function managedNationSafe(){try{return typeof managedNation==='function'?managedNation():s?.managedNation}catch(_){return null}}
function isManagedSquad(a){return !!a&&a.nation===managedNationSafe()&&a.inSquad!==false&&!a.retired}
function directIntel(a){try{return window.AMAttributeScouting?.knowledge?.(a)||{reports:0,bestScoutLevel:0,confidenceBonus:0,exact:false}}catch(_){return{reports:0,bestScoutLevel:0,confidenceBonus:0,exact:false}}}
function attributeKnowledge(a){
 if(isManagedSquad(a))return 100;
 const own=a?.nation===managedNationSafe();let base;
 try{base=typeof assessmentConfidence==='function'?Number(assessmentConfidence(a,'overall')):NaN}catch(_){base=NaN}
 if(!Number.isFinite(base))base=own?58:42;
 /* Programme access gives a better starting picture than public opposition analysis, but neither
    may silently become exact without the athlete joining the squad or direct scouting resolving it. */
 base=own?Math.min(base,84):Math.min(base,64);
 const intel=directIntel(a);return clamp(Math.round(base+Number(intel.confidenceBonus||0)),25,96);
}
function assessmentSpread(confidence){const c=Number(confidence)||0;if(c>=92)return 1;if(c>=82)return 2;if(c>=70)return 3;if(c>=55)return 4;if(c>=40)return 5;return 6}
function rangeWindow(truth,spread,seed){
 const value=clamp(Math.round(truth),1,SCALE),width=Math.max(1,Math.round(spread));let low=value-(seed%(width+1)),high=low+width;
 if(low<1){high+=1-low;low=1}if(high>SCALE){low-=high-SCALE;high=SCALE}low=clamp(low,1,SCALE);high=clamp(high,1,SCALE);
 if(low===high){if(high<SCALE)high++;else if(low>1)low--}return{low,high,mid:(low+high)/2};
}
function knowledgeLabel(exact,squad,confidence){if(exact)return squad?'Exact · squad knowledge':'Exact · fully scouted';if(confidence>=90)return'Very strong evidence';if(confidence>=75)return'Strong evidence';if(confidence>=55)return'Developing picture';return'Limited evidence'}
function assess(a){
 const truth=get(a),intel=directIntel(a),squad=isManagedSquad(a),exact=squad||intel.exact===true,confidence=exact?100:attributeKnowledge(a),spread=exact?0:assessmentSpread(confidence);
 const rows=truth.attributes.map(row=>{if(exact)return{key:row.key,label:row.label,abbr:row.abbr,low:row.score,high:row.score,mid:row.score,display:String(row.score),exact:true,band:band(row.score)};const win=rangeWindow(row.score,spread,hash(`${a?.id||a?.name}|${row.key}|attribute-uncertainty-v1`));return{key:row.key,label:row.label,abbr:row.abbr,low:win.low,high:win.high,mid:win.mid,display:`${win.low}–${win.high}`,exact:false,band:band(win.mid)}});
 return{version:VERSION,scale:SCALE,family:truth.family,familyLabel:truth.familyLabel,exact,confidence,knowledgeLabel:knowledgeLabel(exact,squad,confidence),reports:Number(intel.reports)||0,attributes:rows};
}
function topAssessed(a,count=3){return assess(a).attributes.slice().sort((x,y)=>y.mid-x.mid||x.label.localeCompare(y.label)).slice(0,Math.max(1,Number(count)||3))}
function weakestAssessed(a,count=2){return assess(a).attributes.slice().sort((x,y)=>x.mid-y.mid||x.label.localeCompare(y.label)).slice(0,Math.max(1,Number(count)||2))}
function band(score){const n=Number(score)||0;if(n>=20)return'elite';if(n>=18)return'excellent';if(n>=15)return'strong';if(n>=12)return'solid';if(n>=9)return'developing';return'limited'}
function bandLabel(score){const n=Number(score)||0;if(n>=20)return'Exceptional';if(n>=18)return'Elite International';if(n>=15)return'International';if(n>=12)return'National';if(n>=9)return'Domestic';if(n>=6)return'Developing';return'Raw'}
function top(a,count=3){return get(a).attributes.slice().sort((x,y)=>y.score-x.score||x.label.localeCompare(y.label)).slice(0,Math.max(1,Number(count)||3))}
function weakest(a,count=2){return get(a).attributes.slice().sort((x,y)=>x.score-y.score||x.label.localeCompare(y.label)).slice(0,Math.max(1,Number(count)||2))}
function audit(athletes){
 const list=Array.isArray(athletes)?athletes.filter(Boolean):[];
 const counts=Object.fromEntries(Array.from({length:20},(_,i)=>[i+1,0]));let totalScores=0,sum=0,twenties=0,multipleTwenties=0,maxTwenties=0;
 const leaders=[];
 for(const athlete of list){const profile=get(athlete),scores=profile.attributes.map(x=>x.score),n20=scores.filter(x=>x===20).length;twenties+=n20;if(n20>1)multipleTwenties++;maxTwenties=Math.max(maxTwenties,n20);for(const score of scores){counts[score]=(counts[score]||0)+1;totalScores++;sum+=score}leaders.push({id:athlete.id,name:athlete.name,event:athlete.disc,pb:athlete.pb,performanceLevel:profile.performanceLevel,max:Math.max(...scores),average:Number((scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)),twenties:n20})}
 leaders.sort((a,b)=>b.average-a.average||b.max-a.max||String(a.name).localeCompare(String(b.name)));
 return{version:VERSION,athletes:list.length,totalScores,average:totalScores?Number((sum/totalScores).toFixed(2)):0,twenties,multipleTwenties,maxTwenties,ratingCounts:counts,leaders:leaders.slice(0,20)};
}
function diagnostics(){return{version:VERSION,scale:SCALE,families:Object.keys(SETS),playerFacingOverall:false,calibration:'PB + event standards',eliteRule:'20 requires exceptional event performance and is capped at one attribute per athlete',bands:{20:'Exceptional','18-19':'Elite International','15-17':'International','12-14':'National','9-11':'Domestic','6-8':'Developing','1-5':'Raw'}}}

window.AMAthleteAttributes=Object.freeze({version:VERSION,scale:SCALE,get,assess,top,weakest,topAssessed,weakestAssessed,audit,performanceRating,attributeKnowledge,familyFor,familyLabel,band,bandLabel,diagnostics});
})();
