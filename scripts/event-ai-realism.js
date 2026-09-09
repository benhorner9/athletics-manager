/* ===== Event AI Realism ===== */
(function(){
'use strict';

const EVENT_AI_VERSION=1;
const TRACK_INJURIES=['hamstring strain','calf strain','ankle pain','hip flexor strain','sudden cramp'];
const originalStyles=new Map();

function u(key){return ((hashString(String(key))>>>0)%1000000)/1000000}
function normal(key){return (u(key+'|1')+u(key+'|2')+u(key+'|3')+u(key+'|4')+u(key+'|5')+u(key+'|6')-3)/1.225}
function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0))}
function athlete(id){return (s?.athletes||[]).find(a=>a.id===id)||null}
function eventKey(e,d,id){return `${s?.game?.season||1}|${e?.id||e?.name||'event'}|${e?.week||s?.game?.week||1}|${d}|${id}`}
function isTrack(d){return DISCIPLINES?.[d]?.type==='time'&&Number(DISCIPLINES?.[d]?.distance)>0}
function distance(d){return Number(DISCIPLINES?.[d]?.distance)||0}
function eventWeight(e){return e?.kind==='olympics'?1.35:e?.level==='World'||e?.kind==='championship'?1.18:e?.level==='International'?1.05:.92}
function condition(a){return (Number(a?.form)||80)*.35+(Number(a?.fitness)||85)*.33+(100-(Number(a?.fatigue)||15))*.24+(typeof athleteMorale==='function'?(athleteMorale(a)-65)*.08:0)}
function roundTime(d,v){return +(Number(v)||0).toFixed(distance(d)>=800?2:2)}
function trackVariance(d){const n=distance(d);if(n<=100)return .0055;if(n<=200)return .006;if(n<=400)return .008;if(n<=800)return .011;if(n<=1500)return .013;if(n<=5000)return .011;return .010}
function athleteStyle(a,key,n){
 const existing=a?.raceStyle;
 if(n<=400)return existing||'Even Pacer';
 const roll=u(key+'|style');
 if(existing&&roll<.58)return existing;
 return roll<.23?'Front Runner':roll<.48?'Kicker':roll<.73?'Strength Runner':'Even Pacer';
}

function trackPlan(e,d,row){
 const a=athlete(row.id),n=distance(d),key=eventKey(e,d,row.id),cond=condition(a),importance=eventWeight(e),style=athleteStyle(a,key,n);
 let scenario='Normal race',raceStyle=style,delta=normal(key+'|day')*trackVariance(d)*importance;
 const roll=u(key+'|scenario');
 if(n<=400){
  if(roll<.055){scenario='Poor start';delta+=n<=100?.006:n<=200?.0045:.0035}
  else if(roll<.075){scenario='Stumble';delta+=n<=100?.014:n<=200?.010:.008}
  else if(roll<.15){scenario='Perfect execution';delta-=.0035+u(key+'|perfect')*.0045}
  else if(n===400&&roll<.27){scenario='Went out too hard';delta+=.006+u(key+'|fade')*.010;raceStyle='Front Runner'}
 }else{
  if(roll<.14){scenario='Went out too hard';delta+=.006+u(key+'|fade')*(n<=1500?.014:.010);raceStyle='Front Runner'}
  else if(roll<.25){scenario='Late kick';delta-=.001+u(key+'|kick')*.004;raceStyle='Kicker'}
  else if((n===800||n===1500)&&roll<.33){scenario='Boxed in';delta+=.004+u(key+'|boxed')*.008;raceStyle='Kicker'}
  else if(roll<.42){scenario='Evenly paced';delta-=u(key+'|even')*.0025;raceStyle='Even Pacer'}
  else if(roll<.50){scenario='Strong second half';delta-=.001+u(key+'|strength')*.003;raceStyle='Strength Runner'}
  else if(roll<.56){scenario='Bad day';delta+=.006+u(key+'|bad')*.012}
  else if(roll<.63){scenario='Race of their life';delta-=.004+u(key+'|great')*.007}
 }
 if(cond<74)delta+=((74-cond)/100)*(n<=400?.012:.022);
 if(cond>90)delta-=((cond-90)/100)*(n<=400?.006:.010);
 const fatigue=Math.max(0,(Number(a?.fatigue)||0)-45),lowFit=Math.max(0,82-(Number(a?.fitness)||90));
 let dnfChance=.0015+(n>=800?.0015:0)+(n>=5000?.0015:0)+fatigue*.00016+lowFit*.00012;
 dnfChance=Math.min(.018,dnfChance*importance);
 const dnf=u(key+'|dnf')<dnfChance;
 const injuryProgress=.28+u(key+'|injury-point')*.58;
 const injuryWeeks=1+Math.floor(u(key+'|injury-weeks')*5);
 const injuryType=TRACK_INJURIES[Math.floor(u(key+'|injury-type')*TRACK_INJURIES.length)]||'muscle strain';
 if(dnf){scenario='Pulled up injured';delta=Math.max(delta,.10+u(key+'|dnfslow')*.08)}
 return {scenario,raceStyle,delta,dnf,injuryProgress,injuryWeeks,injuryType,seed:key};
}

function applyTrackRealism(e,d,rows,meta){
 const finals=rows.filter(r=>!r.eliminated),plans={};
 for(const row of finals){
  const a=athlete(row.id),plan=trackPlan(e,d,row);plans[row.id]=plan;row.eventAI=plan;row.dnf=!!plan.dnf;
  if(a){if(!originalStyles.has(`${e.id}|${d}|${a.id}`))originalStyles.set(`${e.id}|${d}|${a.id}`,a.raceStyle);a.raceStyle=plan.raceStyle}
  const base=Math.max(.01,Number(row.perf)||Number(a?.pb)||1),wr=Number(WORLD_RECORDS?.[d]);
  let perf=base*(1+plan.delta);
  if(Number.isFinite(wr)&&wr>0)perf=Math.max(wr*.997,perf);
  row.perf=roundTime(d,perf);
 }
 finals.sort((a,b)=>Number(a.dnf)-Number(b.dnf)||a.perf-b.perf||String(a.name).localeCompare(String(b.name)));
 finals.forEach((r,i)=>{r.finalPlace=i+1;r.place=i+1});
 if(meta){
  meta.aiRealism={version:EVENT_AI_VERSION,plans};
  const finalStage=(meta.stages||[]).find(x=>/final/i.test(x.name||''))||(meta.stages||[]).at(-1);
  if(finalStage){
   const map=new Map(finals.map(r=>[r.id,r]));
   finalStage.rows=(finalStage.rows||[]).filter(x=>map.has(x.id)).map(x=>{const r=map.get(x.id);return {...x,mark:r.perf,place:r.finalPlace,dnf:r.dnf,eventAI:r.eventAI}}).sort((a,b)=>a.place-b.place);
  }
  if(meta.race)meta.race.aiRealism=plans;
 }
 return [...finals,...rows.filter(r=>r.eliminated)];
}

function throwPlan(e,d,row){
 const a=athlete(row.id),key=eventKey(e,d,row.id),cond=condition(a),roll=u(key+'|throws');
 let label='Normal series',foulBase=.09,breakthrough=0,spread=.62;
 if(roll<.08){label='Pressure series';foulBase=.19;spread=.92}
 else if(roll<.16){label='Found one late';breakthrough=.22+u(key+'|late')*.42;spread=.75}
 else if(roll<.24){label='Big opening mark';breakthrough=.18+u(key+'|early')*.38;spread=.70}
 else if(roll<.30){label='Technical struggle';foulBase=.24;spread=1.05}
 else if(roll<.38){label='Excellent rhythm';breakthrough=.10+u(key+'|rhythm')*.30;foulBase=.05;spread=.45}
 foulBase+=Math.max(0,78-cond)*.0022;
 return {label,foulBase:Math.min(.36,foulBase),breakthrough,spread,key};
}
function applyThrowRealism(e,d,rows,meta){
 const generated=[];
 for(const source of rows){
  const a=athlete(source.id),p=throwPlan(e,d,source),anchor=Math.max(.1,Number(source.perf)||Number(a?.pb)||1),attempts=[];
  const peak=p.label==='Big opening mark'?0:p.label==='Found one late'?4+Math.floor(u(p.key+'|peaklate')*2):Math.floor(u(p.key+'|peak')*6);
  for(let i=0;i<6;i++){
   const foul=u(p.key+`|foul|${i}`)<p.foulBase*(i===2&&attempts.slice(0,2).every(x=>x===null)?.72:1);
   if(foul){attempts.push(null);continue}
   const jitter=Math.abs(normal(p.key+`|mark|${i}`))*p.spread,clutch=i===peak?p.breakthrough:0;
   attempts.push(+(Math.max(.1,anchor-jitter+clutch)).toFixed(2));
  }
  const openingValid=attempts.slice(0,3).filter(Number.isFinite),openingBest=openingValid.length?Math.max(...openingValid):null;
  generated.push({...source,eventAI:p,throwAttempts:attempts,openingBest,noMark:openingBest===null});
 }
 const openingOrder=[...generated].sort((a,b)=>(b.openingBest??-Infinity)-(a.openingBest??-Infinity)||String(a.name).localeCompare(String(b.name)));
 const cut=Math.min(8,openingOrder.filter(r=>r.openingBest!==null).length),finalists=openingOrder.filter(r=>r.openingBest!==null).slice(0,cut),finalIds=new Set(finalists.map(r=>r.id));
 for(const row of generated){if(!finalIds.has(row.id))row.throwAttempts=row.throwAttempts.slice(0,3);const valid=row.throwAttempts.filter(Number.isFinite).sort((a,b)=>b-a);row.perf=valid[0]??0;row.secondBest=valid[1]??0;row.noMark=!valid.length}
 generated.sort((a,b)=>Number(a.noMark)-Number(b.noMark)||b.perf-a.perf||b.secondBest-a.secondBest||String(a.name).localeCompare(String(b.name)));
 generated.forEach((r,i)=>r.place=i+1);
 if(meta){
  meta.aiRealism={version:EVENT_AI_VERSION,plans:Object.fromEntries(generated.map(r=>[r.id,r.eventAI]))};meta.cut=cut;meta.finalOrder=[...finalists].sort((a,b)=>(a.openingBest??0)-(b.openingBest??0)).map(r=>r.id);
  meta.stages=[
   {name:'Attempts 1–3',rows:openingOrder.map((r,i)=>({id:r.id,name:r.name,nation:r.nation,mark:r.openingBest??0,place:r.openingBest===null?null:i+1,attempts:r.throwAttempts.slice(0,3),noMark:r.openingBest===null,eventAI:r.eventAI}))},
   {name:'Final three attempts',rows:generated.filter(r=>finalIds.has(r.id)).map(r=>({id:r.id,name:r.name,nation:r.nation,mark:r.perf,place:r.place,attempts:r.throwAttempts,eventAI:r.eventAI}))}
  ];
 }
 return generated;
}

function heightPlan(e,d,row){
 const a=athlete(row.id),key=eventKey(e,d,row.id),roll=u(key+'|height'),cond=condition(a);let label='Normal competition',shift=normal(key+'|heightday')*.025,pressure=0;
 if(roll<.08){label='Nervy competition';shift-=.025+u(key+'|nervy')*.035;pressure=.10}
 else if(roll<.16){label='Clutch jumper';shift+=.02+u(key+'|clutch')*.035;pressure=-.06}
 else if(roll<.23){label='Aggressive passing';pressure=.05}
 else if(roll<.29){label='Excellent rhythm';shift+=.015+u(key+'|rhythm')*.025;pressure=-.08}
 if(cond<75)shift-=(75-cond)*.0015;if(cond>90)shift+=(cond-90)*.001;
 return {label,shift,pressure,key};
}
function applyHeightRealism(e,d,rows,meta){
 const plans=new Map(rows.map(r=>[r.id,heightPlan(e,d,r)])),caps=rows.map(r=>{const a=athlete(r.id),p=plans.get(r.id),pb=Number(a?.pb)||Number(r.perf)||2;return {row:r,plan:p,cap:pb+p.shift}}),minCap=Math.min(...caps.map(x=>x.cap)),maxCap=Math.max(...caps.map(x=>x.cap));
 let opener=Math.floor((minCap-.12)/.02)*.02;opener=Math.max(String(d).startsWith('W')?1.50:1.80,opener);const bars=[];for(let h=opener;h<=maxCap+.08+.001;h+=h<2.02&&String(d).startsWith('W')?.03:h<2.30&&!String(d).startsWith('W')?.03:.02)bars.push(+h.toFixed(2));
 const out=caps.map(({row,plan,cap})=>{let best=0,totalMisses=0,missesAtBest=0,outFlag=false,attempts=[];
  for(const h of bars){if(outFlag)break;const farBelow=cap-h>.13,aggressive=plan.label==='Aggressive passing',pass=farBelow&&u(plan.key+`|pass|${h}`)<(aggressive?.46:.20);if(pass){attempts.push({height:h,marks:['-']});continue}
   const marks=[];let cleared=false;for(let k=1;k<=3;k++){const margin=cap-h;let chance=margin>=.07?.94:margin>=.04?.84:margin>=.01?.64:margin>=-.01?.40:margin>=-.03?.16:.035;chance=Math.max(.01,Math.min(.98,chance-plan.pressure));if(u(plan.key+`|${h}|${k}`)<chance){marks.push('O');cleared=true;best=h;missesAtBest=marks.filter(x=>x==='X').length;break}else{marks.push('X');totalMisses++}}
   attempts.push({height:h,marks});if(!cleared&&marks.filter(x=>x==='X').length>=3)outFlag=true;
  }
  return {...row,eventAI:plan,perf:+best.toFixed(2),hjAttempts:attempts,hjMisses:totalMisses,hjMissesAtBest:missesAtBest,noHeight:best===0};
 });
 out.sort((a,b)=>Number(a.noHeight)-Number(b.noHeight)||b.perf-a.perf||a.hjMissesAtBest-b.hjMissesAtBest||a.hjMisses-b.hjMisses||String(a.name).localeCompare(String(b.name)));out.forEach((r,i)=>r.place=i+1);
 if(meta){meta.aiRealism={version:EVENT_AI_VERSION,plans:Object.fromEntries(out.map(r=>[r.id,r.eventAI]))};meta.openingHeight=opener;meta.bars=bars;meta.stages=[{name:'High Jump Final',rows:out.map(r=>({id:r.id,name:r.name,nation:r.nation,mark:r.perf,place:r.place,misses:r.hjMisses,attempts:r.hjAttempts,noHeight:r.noHeight,eventAI:r.eventAI}))}]}
 return out;
}

const _eventAIBaseSimulate=simulateDiscipline;
simulateDiscipline=function(e,d){
 const rows=_eventAIBaseSimulate(e,d),meta=e?.engine?.[d];if(!Array.isArray(rows)||!rows.length)return rows;
 if(isTrack(d))return applyTrackRealism(e,d,rows,meta);
 if(DISCIPLINES?.[d]?.type==='height')return applyHeightRealism(e,d,rows,meta);
 return applyThrowRealism(e,d,rows,meta);
};

function restoreRaceStyles(e,d){
 for(const row of e?.results?.[d]||[]){const a=athlete(row.id),key=`${e.id}|${d}|${row.id}`;if(!a||!originalStyles.has(key))continue;const old=originalStyles.get(key);if(old===undefined)delete a.raceStyle;else a.raceStyle=old;originalStyles.delete(key)}
}
function badResultIds(rows){return new Set((rows||[]).filter(r=>r.dnf||r.noMark||r.noHeight).map(r=>r.id))}
const _eventAIBaseCommit=commitDisciplineResults;
commitDisciplineResults=function(e,d,rows){
 const bad=badResultIds(rows),dnfs=(rows||[]).filter(r=>r.dnf);let oldRegister=registerPerformance,oldTrait=typeof recordTraitResult==='function'?recordTraitResult:null;
 if(bad.size){registerPerformance=function(a,disc,perf,source,eventName){if(bad.has(a?.id))return [];return oldRegister(a,disc,perf,source,eventName)};if(oldTrait)recordTraitResult=function(a,disc,perf,key){if(bad.has(a?.id))return;return oldTrait(a,disc,perf,key)}}
 try{_eventAIBaseCommit(e,d,rows)}finally{if(bad.size){registerPerformance=oldRegister;if(oldTrait)recordTraitResult=oldTrait}}
 for(const r of rows||[]){if(!bad.has(r.id))continue;const a=athlete(r.id);if(r.points){if(a)a.points=Math.max(0,(a.points||0)-r.points);s.nationPoints[r.nation]=Math.max(0,(s.nationPoints[r.nation]||0)-r.points);r.points=0}r.achievements=[]}
 for(const r of dnfs){const a=athlete(r.id),p=r.eventAI||e?.engine?.[d]?.aiRealism?.plans?.[r.id];if(!a||!p)continue;a.injury=Math.max(Number(a.injury)||0,p.injuryWeeks||1);a.lastCompetitionInjury={season:s.game.season,week:s.game.week,event:e.name,disc:d,type:p.injuryType,weeks:p.injuryWeeks};if(a.nation===managedNation()&&typeof newMail==='function')newMail(sender('medical'),`${a.name} pulled up during ${e.name}`,`${a.name} was unable to finish the ${discLabel(d)} after pulling up with ${p.injuryType}. The medical team expect approximately ${p.injuryWeeks} week${p.injuryWeeks===1?'':'s'} away from full competition. Their recovery will now be managed through the normal medical process.`,'medical',e.id)}
 restoreRaceStyles(e,d);
};

function planForLive(id){const e=liveEventView?.event,d=liveEventView?.disc;return e?.engine?.[d]?.aiRealism?.plans?.[id]||null}
function applyDNFVisuals(){
 const track=liveEventView?.trackOverhaulV4;if(!disciplineRunning||!track||!track.state)return;
 const local=Number(track.local)||0,root=document.querySelector('[data-track-race-v4]');if(!root)return;
 for(const item of track.state.items||[]){const p=planForLive(item.row.id);if(!p?.dnf||local<p.injuryProgress)continue;const g=[...root.querySelectorAll('[data-track-runner]')].find(el=>el.getAttribute('data-track-runner')===String(item.row.id));if(g){if(!g.dataset.aiStopped)g.dataset.aiStopped=g.getAttribute('transform')||'';if(g.dataset.aiStopped)g.setAttribute('transform',g.dataset.aiStopped);g.style.opacity='.58';const t=g.querySelector('[data-track-label]');if(t)t.textContent='DNF'}
  if(!p.announced){p.announced=true;const comm=document.getElementById('commentary');if(comm&&typeof renderMatchdayCommentary==='function')renderMatchdayCommentary(comm,`DRAMA • ${String(item.row.name||'').toUpperCase()} PULLS UP\nGavin Potts — ${item.row.name} has stopped with what looks like ${p.injuryType}. Their race is over.`)}
 }
 const board=document.getElementById('liveScoreboard');if(board){for(const item of track.state.items||[]){const p=planForLive(item.row.id);if(!p?.dnf||local<p.injuryProgress)continue;const name=String(item.row.name||'');const row=[...board.querySelectorAll('.uls-row')].find(el=>el.querySelector('.uls-name strong')?.textContent===name);if(!row)continue;const pos=row.querySelector('.uls-pos'),value=row.querySelector('.uls-value strong'),sub=row.querySelector('.uls-value small');if(pos)pos.textContent='DNF';if(value)value.textContent='DNF';if(sub)sub.textContent='PULLED UP';row.parentElement?.appendChild(row)}}
}
window.setInterval(applyDNFVisuals,60);

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Event AI Realism'))UPDATES.unshift({date:'9 September 2026',title:'Event AI Realism',items:[
 'Event results are no longer a simple best-athlete-plus-small-variance calculation. Ability sets the odds, while event-day execution can create genuine favourites, upsets and bad days.',
 'Track athletes now receive event-specific race behaviour such as aggressive front running, late kicking, even pacing, poor starts, getting boxed in, fading after going too hard and exceptional breakthrough races.',
 'A very small fatigue- and fitness-sensitive injury risk can produce an in-race DNF. The athlete visibly pulls up, receives no ranking points or recorded performance, and enters the medical system.',
 'Throws now build a complete attempt series with pressure, fouls, technical struggles, big opening throws and late clutch marks before recalculating the top-eight cut and final standings.',
 'High Jump now simulates event-day capacity, passing strategy, misses, clearances, pressure and countback so a favourite can struggle while another athlete finds a breakthrough competition.'
]});
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Event AI Realism ===== */
