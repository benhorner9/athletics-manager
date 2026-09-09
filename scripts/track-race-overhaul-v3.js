/* ===== Continuous Track Race Overhaul V3 ===== */
(function(){
'use strict';

const TRACK_RACE_VERSION=3;
const SVG_W=760, SVG_H=455;
const OVAL={cx:380,cy:228,innerRx:220,innerRy:108,laneWidth:10.5};
const PREFERRED_LANES=[4,5,3,6,2,7,1,8];

function isTrackRace(d){return !!(DISCIPLINES?.[d]?.type==='time' && Number(DISCIPLINES?.[d]?.distance)>0)}
function raceDistance(d){return Number(DISCIPLINES?.[d]?.distance)||100}
function esc(v){return typeof profileEscape==='function' ? profileEscape(String(v??'')) : String(v??'')}
function stable01(key){return ((hashString(String(key))>>>0)%10000)/10000}
function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0))}
function athleteFor(id){return (s?.athletes||[]).find(a=>a.id===id)||null}
function shortName(name){const p=String(name||'').trim().split(/\s+/);return (p.at(-1)||p[0]||'').slice(0,10).toUpperCase()}
function playbackSeconds(distance){if(distance<=100)return 12;if(distance<=200)return 16;if(distance<=400)return 22;if(distance<=800)return 30;if(distance<=1500)return 36;if(distance<=5000)return 50;return 60}
function isLaneRace(distance){return distance<=400}

function stageRowsFromMeta(e,d,results){
  const meta=e?.engine?.[d], raw=Array.isArray(meta?.stages)?meta.stages:[];
  if(!raw.length)return [{name:'Final',rows:(results||[]).filter(r=>!r.eliminated).map(r=>({...r}))}];
  return raw.map((stage,si)=>{
    const rows=(stage.rows||[]).map((r,i)=>{
      const a=athleteFor(r.id), source=(results||[]).find(x=>x.id===r.id)||{};
      return {
        id:r.id,
        name:r.name||a?.name||source.name||'Athlete',
        nation:r.nation||a?.nation||source.nation,
        perf:Number(r.mark??r.perf??source.perf),
        lane:Number(r.lane)||null,
        place:Number(r.place)||i+1,
        stage:stage.name||`Race ${si+1}`
      };
    }).filter(r=>Number.isFinite(r.perf));
    return {name:stage.name||`Race ${si+1}`,rows};
  }).filter(stage=>stage.rows.length);
}

function normaliseLanes(e,d,stage){
  const distance=raceDistance(d);
  if(!(isLaneRace(distance)||distance===800))return;
  const used=new Set(), startLanes=e?.engine?.[d]?.race?.startLanes||{};
  const ordered=[...stage.rows].sort((a,b)=>a.place-b.place||a.perf-b.perf);
  ordered.forEach((r,i)=>{
    let lane=distance===800 ? Number(startLanes[r.id]) : Number(r.lane);
    if(!Number.isFinite(lane)||lane<1||lane>8||used.has(lane))lane=PREFERRED_LANES.find(x=>!used.has(x))||Math.min(8,i+1);
    used.add(lane);r.lane=lane;
  });
}

function highlightCheckpoints(distance,isFinal,multi){
  if(multi&&!isFinal)return [0,Math.round(distance*.5),distance];
  if(distance<=100)return [0,40,70,distance];
  if(distance<=200)return [0,60,120,170,distance];
  if(distance<=400)return [0,100,200,300,distance];
  if(distance<=800)return [0,200,400,600,distance];
  if(distance<=1500)return [0,300,700,1100,distance];
  if(distance<=5000)return [0,1000,2500,4000,distance];
  return [0,2000,5000,8000,distance];
}

function buildPlaybackStages(e,d,results){
  const stages=stageRowsFromMeta(e,d,results), distance=raceDistance(d), base=playbackSeconds(distance), multi=stages.length>1;
  stages.forEach((stage,i)=>{
    normaliseLanes(e,d,stage);
    const isFinal=/final/i.test(stage.name)||i===stages.length-1;
    stage.duration=multi ? base*(isFinal ? .62 : .22) : base;
    stage.isFinal=isFinal;
    stage.key=`${e.id}|${d}|${stage.name}|${i}`;
    stage.checkpoints=highlightCheckpoints(distance,isFinal,multi);
  });
  return stages;
}

function styleShift(row,stage,distance,t){
  const a=athleteFor(row.id), amp=Math.min(distance<=400?3:14,distance*(distance<=400 ? .008 : .0022)), fade=Math.sin(Math.PI*clamp01(t));
  const wave=((stable01(`${stage.key}|${row.id}|wave`)-.5)*2)*amp*fade;
  const wave2=Math.sin(t*Math.PI*2+stable01(`${stage.key}|${row.id}|phase`)*Math.PI*2)*amp*.36*fade;
  if(distance<=400)return wave+wave2;
  const style=a?.raceStyle||'Even Pacer';let tactical=0;
  if(style==='Front Runner')tactical=(1-t)*amp*.9-t*amp*.08;
  else if(style==='Kicker')tactical=t<.68 ? -amp*.34 : amp*(t-.68)*2.1;
  else if(style==='Strength Runner')tactical=t<.42 ? -amp*.12 : amp*.28;
  else tactical=amp*.05;
  return (wave+wave2+tactical)*fade;
}

/* The slowest official finisher defines the playback clock. Faster official times cross
   earlier in the compressed race. Tactical variation fades to zero at the finish, so
   lane number or an early-race surge can never decide the official finishing order. */
function stageRaceState(stage,d,local){
  const distance=raceDistance(d), rows=stage.rows, slowest=Math.max(...rows.map(r=>Math.max(.01,Number(r.perf)||.01)));
  const items=rows.map(row=>{
    const perf=Math.max(.01,Number(row.perf)||slowest), base=clamp01(local)*distance*(slowest/perf), t=clamp01(base/distance), shift=styleShift(row,stage,distance,t);
    const metres=Math.max(0,Math.min(distance+8,base+shift));
    return {row,metres,finished:metres>=distance};
  });
  items.sort((a,b)=>b.metres-a.metres||a.row.perf-b.row.perf||(Number(a.row.lane)||99)-(Number(b.row.lane)||99)||String(a.row.name).localeCompare(String(b.row.name)));
  items.forEach((x,i)=>x.position=i+1);
  return {distance,items,order:items.map(x=>x.row),allFinished:items.every(x=>x.finished)};
}

function laneGeom(lane){
  const rx=OVAL.innerRx+(lane-.5)*OVAL.laneWidth, ry=OVAL.innerRy+(lane-.5)*OVAL.laneWidth;
  const h=Math.pow(rx-ry,2)/Math.pow(rx+ry,2), circ=Math.PI*(rx+ry)*(1+(3*h)/(10+Math.sqrt(4-3*h)));
  return {rx,ry,circ};
}

function lanePoint(distance,lane,metres){
  const lane1=laneGeom(1), g=laneGeom(lane), ratio=g.circ/lane1.circ, courseEquivalent=400*ratio;
  const span=Math.min(Math.PI*2,(distance/courseEquivalent)*Math.PI*2), finish=-Math.PI/2, start=finish-span, p=Math.max(0,Math.min(1.04,metres/distance)), angle=start+span*p;
  return {x:OVAL.cx+Math.cos(angle)*g.rx,y:OVAL.cy+Math.sin(angle)*g.ry};
}

function packPoint(distance,row,metres,index){
  const startOffset=(400-(distance%400))%400, merge=distance===800?clamp01(metres/140):1, lane=Number(row.lane)||1;
  const stagger=distance===800?(lane-1)*3.7*(1-merge):0, course=startOffset+metres+stagger;
  const radial=distance===800?(lane-1)*OVAL.laneWidth*(1-merge)+(index%3-1)*3*merge:(index%3-1)*3.2;
  const angle=-Math.PI/2+Math.PI*2*(course/400), rx=OVAL.innerRx+7+radial, ry=OVAL.innerRy+7+radial*.48;
  return {x:OVAL.cx+Math.cos(angle)*rx,y:OVAL.cy+Math.sin(angle)*ry};
}

function straightPoint(distance,lane,metres){
  const left=60,right=700,top=48,laneH=42, y=top+(lane-1)*laneH, x=left+(right-left)*Math.max(0,Math.min(1.025,metres/distance));
  return {x,y};
}

function pointFor(d,row,metres,index){
  const distance=raceDistance(d);
  if(distance===100)return straightPoint(distance,Number(row.lane)||index+1,metres);
  if(isLaneRace(distance))return lanePoint(distance,Number(row.lane)||index+1,metres);
  return packPoint(distance,row,metres,index);
}

function ovalBackground(){
  const outer=laneGeom(8), lines=Array.from({length:9},(_,i)=>{
    const rx=OVAL.innerRx+i*OVAL.laneWidth, ry=OVAL.innerRy+i*OVAL.laneWidth;
    return `<ellipse cx="${OVAL.cx}" cy="${OVAL.cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#f5eadf" stroke-opacity="${(i===0||i===8) ? .52 : .24}" stroke-width="${(i===0||i===8) ? 2 : 1}"/>`;
  }).join('');
  return `<rect width="${SVG_W}" height="${SVG_H}" fill="#173f31"/><ellipse cx="${OVAL.cx}" cy="${OVAL.cy}" rx="${outer.rx+17}" ry="${outer.ry+17}" fill="#82484e" stroke="#b07074" stroke-width="2"/><ellipse cx="${OVAL.cx}" cy="${OVAL.cy}" rx="${OVAL.innerRx}" ry="${OVAL.innerRy}" fill="#246044"/>${lines}<line x1="350" y1="120" x2="416" y2="82" stroke="#fff" stroke-width="4"/><text x="427" y="79" fill="#e7f0f4" font-size="9" font-weight="900">FINISH</text>`;
}

function straightBackground(){
  const lanes=8, laneLines=Array.from({length:lanes+1},(_,i)=>`<line x1="42" y1="${27+i*42}" x2="724" y2="${27+i*42}" stroke="#f5eadf" stroke-opacity=".28"/>`).join('');
  return `<rect width="${SVG_W}" height="${SVG_H}" fill="#173f31"/><rect x="42" y="27" width="682" height="${lanes*42}" rx="8" fill="#82484e" stroke="#b07074" stroke-width="2"/>${laneLines}<line x1="60" y1="27" x2="60" y2="${27+lanes*42}" stroke="#f5eadf" stroke-width="3"/><line x1="700" y1="27" x2="700" y2="${27+lanes*42}" stroke="#fff" stroke-width="5"/>`;
}

function trackRaceVisualHTML(e,d){
  const track=liveEventView?.trackOverhaul;if(!track)return '';
  const stage=track.stages[track.stageIndex]||track.stages[0], distance=raceDistance(d), background=distance===100?straightBackground():ovalBackground();
  const runners=stage.rows.map(row=>{
    const managed=row.nation===managedNation(), colour=typeof nationDotColour==='function'?nationDotColour(row.nation):'#dbe5e9', label=distance<=800?String(row.lane||''):(managed?shortName(row.name):'');
    return `<g data-track-runner="${esc(row.id)}"><circle r="${managed?11:9}" fill="${colour}" stroke="${managed?'#fff':'#07131d'}" stroke-width="${managed?4:2}"/><circle r="${managed?15:13}" fill="none" stroke="#fff" stroke-opacity="${managed ? .28 : .07}"/><text data-track-label y="-14" text-anchor="middle" fill="#f5fbff" font-size="8" font-weight="900">${esc(label)}</text></g>`;
  }).join('');
  const mode=distance<=400?'LANE RACE':distance===800?'STAGGER → BREAK':distance<=1500?'PACK RACE':'ACCELERATED PACK RACE';
  return `<div class="fm2d-arena refined-arena track-overhaul-arena" data-track-race-key="${esc(stage.key)}"><div class="fm2d-arena-head refined-head"><span>${esc(stage.name)} • ${esc(discLabel(d))}</span><b data-track-distance>0m / ${distance}m</b></div><svg viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Continuous ${esc(discLabel(d))} race">${background}${runners}<text x="380" y="216" text-anchor="middle" fill="#e0ece5" font-size="21" font-weight="950">${distance>=10000?'10,000':distance}m</text><text x="380" y="238" text-anchor="middle" fill="#9ebcab" font-size="9" font-weight="850">${mode}</text><text data-track-order x="380" y="258" text-anchor="middle" fill="#d9e7df" font-size="8.5" font-weight="800">Race ready</text></svg><div class="fm2d-caption refined-caption"><span>Continuous race coverage • commentary appears only at key moments.</span><span data-track-clock>0%</span></div></div>`;
}

const _trackBaseVisual=eventVisualHTML;
eventVisualHTML=function(e,d){
  return isTrackRace(d)&&liveEventView?.trackOverhaul&&liveEventView?.event===e&&liveEventView?.disc===d ? trackRaceVisualHTML(e,d) : _trackBaseVisual(e,d);
};

function ensureTrackVisual(e,d,stage){
  const arena=$('liveEventVisual');if(!arena)return null;
  const key=arena.querySelector('[data-track-race-key]')?.getAttribute('data-track-race-key');
  if(key!==stage.key)arena.innerHTML=trackRaceVisualHTML(e,d);
  return arena.querySelector('[data-track-race-key]');
}

function updateTrackVisual(e,d,stage,state,local){
  if(currentView!=='competition'||competitionMode!=='discipline'||activeEventDisc!==d)return;
  const root=ensureTrackVisual(e,d,stage);if(!root)return;
  const distance=raceDistance(d), byId=new Map(state.items.map((x,i)=>[x.row.id,{...x,index:i}]));
  root.querySelectorAll('[data-track-runner]').forEach(g=>{
    const id=g.getAttribute('data-track-runner'), x=byId.get(id);if(!x)return;
    const p=pointFor(d,x.row,x.metres,x.index);g.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    const label=g.querySelector('[data-track-label]');if(label&&distance>800)label.textContent=x.row.nation===managedNation()?shortName(x.row.name):(x.position<=3?String(x.position):'');
  });
  const leaderMetres=Math.max(0,Math.min(distance,Math.max(...state.items.map(x=>x.metres)))), distanceEl=root.querySelector('[data-track-distance]'), orderEl=root.querySelector('[data-track-order]'), clockEl=root.querySelector('[data-track-clock]');
  if(distanceEl){
    if(state.allFinished)distanceEl.textContent=`FINISH • ${distance}m`;
    else if(leaderMetres>=distance)distanceEl.textContent='FINISHING';
    else distanceEl.textContent=`${Math.round(leaderMetres)}m / ${distance}m`;
  }
  if(orderEl)orderEl.textContent=state.order.slice(0,3).map((r,i)=>`${i+1} ${shortName(r.name)}`).join(' • ');
  if(clockEl)clockEl.textContent=`${Math.round(clamp01(local)*100)}%`;
}

function highlightLine(e,d,stage,metres,state,previousLeader){
  const distance=raceDistance(d), order=state.order, leader=order[0], second=order[1], third=order[2], stageName=stage.name||'Final', isFinish=metres>=distance;
  if(metres<=0)return `${stageName.toUpperCase()} • THE GUN\nGavin Potts — Away in the ${discLabel(d)}. The race is moving now; we will pick it up again when the shape changes.`;
  if(isFinish){
    const prefix=stage.isFinal?'RESULT':`${stageName.toUpperCase()} • THE LINE`;
    return `${prefix}\nGavin Potts — ${leader?.name||'The leader'} gets there first${leader?` in ${fmtPerf(d,leader.perf)}`:''}${second?`, ${second.name} is second in ${fmtPerf(d,second.perf)}`:''}${third?`, with ${third.name} third`:''}.`;
  }
  const changed=previousLeader&&leader&&previousLeader!==leader.id, pack=order.slice(1,3).map(x=>x.name).filter(Boolean).join(' and '), remaining=distance-metres;
  let body=changed?`${leader.name} has moved to the front`:`${leader?.name||'The leader'} has the advantage`;
  if(pack)body+=`, with ${pack} closest`;
  if(distance<=400)body+=remaining<=100?'. This is the decisive part now.':'. The gaps are beginning to show.';
  else if(remaining<=Math.max(200,distance*.18))body+='. The final move is on.';
  else body+='. The pack is still changing behind.';
  return `${metres} METRES • ${stageName.toUpperCase()}\nGavin Potts — ${body}`;
}

function emitHighlight(e,d,stage,metres,state,track){
  const line=highlightLine(e,d,stage,metres,state,track.previousLeaderId);
  track.previousLeaderId=state.order[0]?.id||null;track.triggered.push(line);
  liveEventView.lines=[...track.triggered];liveEventView.index=liveEventView.lines.length-1;
  e.commentary??={};e.commentary[d]=[...track.triggered];
  const comm=$('commentary');if(comm&&typeof renderMatchdayCommentary==='function')renderMatchdayCommentary(comm,line);
}

function completeTrackDiscipline(e,d,results,career){
  if(s!==career)return;
  commitDisciplineResults(e,d,results);save();disciplineRunning=false;liveEventView=null;
  const discs=e.disc.filter(x=>x!=='ALL');activeEventDisc=d;competitionMode='discipline';
  if(discs.every(x=>Array.isArray(e.results[x])))finaliseEvent(e,false);
  else{drawCompetition();toast(discLabel(d)+' complete — final standings shown')}
}

function checkpointReached(stage,d,checkpoint,state,local){
  const distance=raceDistance(d);
  if(checkpoint>=distance)return local>=.999&&state.allFinished;
  const leaderMetres=Math.max(0,...state.items.map(x=>Math.min(distance,x.metres)));
  return leaderMetres>=checkpoint;
}

function runTrackPlayback(e,d,results,career){
  const track=liveEventView.trackOverhaul, stages=track.stages;let stageIndex=0, stageStart=null, intermissionUntil=0, raf=0;
  function frame(now){
    if(s!==career||!disciplineRunning||liveEventView?.trackOverhaul!==track)return;
    if(stageStart===null)stageStart=now;
    if(intermissionUntil&&now<intermissionUntil){raf=requestAnimationFrame(frame);return}
    if(intermissionUntil){
      intermissionUntil=0;stageStart=now;track.previousLeaderId=null;track.nextCheckpoint=0;track.stageIndex=stageIndex;
      if(currentView==='competition'&&competitionMode==='discipline'){const arena=$('liveEventVisual');if(arena)arena.innerHTML=trackRaceVisualHTML(e,d)}
    }
    const stage=stages[stageIndex], local=clamp01((now-stageStart)/(stage.duration*1000)), state=stageRaceState(stage,d,local);
    track.stageIndex=stageIndex;track.local=local;track.state=state;updateTrackVisual(e,d,stage,state,local);
    while(track.nextCheckpoint<stage.checkpoints.length&&checkpointReached(stage,d,stage.checkpoints[track.nextCheckpoint],state,local)){
      const metres=stage.checkpoints[track.nextCheckpoint++];emitHighlight(e,d,stage,metres,state,track);
    }
    if(local>=1){
      while(track.nextCheckpoint<stage.checkpoints.length){const metres=stage.checkpoints[track.nextCheckpoint++];emitHighlight(e,d,stage,metres,state,track)}
      if(stageIndex<stages.length-1){stageIndex++;track.stageIndex=stageIndex;track.nextCheckpoint=0;track.previousLeaderId=null;intermissionUntil=now+900;raf=requestAnimationFrame(frame);return}
      completeTrackDiscipline(e,d,results,career);return;
    }
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);track.cancel=()=>cancelAnimationFrame(raf);
}

const _trackBaseStartDiscipline=startDiscipline;
startDiscipline=function(e,d){
  if(!isTrackRace(d))return _trackBaseStartDiscipline(e,d);
  if(!e||e.completed||disciplineRunning)return;
  if(e.week!==s.game.week){toast('This event is not live yet');return}
  e.results??={};
  if(Array.isArray(e.results[d])){activeEventDisc=d;competitionMode='discipline';drawCompetition();return}
  const career=s, results=simulateDiscipline(e,d), stages=buildPlaybackStages(e,d,results);
  if(!stages.length)return _trackBaseStartDiscipline(e,d);
  disciplineRunning=true;activeEventDisc=d;competitionMode='discipline';
  liveEventView={event:e,disc:d,results,lines:[],index:-1,trackOverhaul:{version:TRACK_RACE_VERSION,stages,stageIndex:0,nextCheckpoint:0,previousLeaderId:null,triggered:[],local:0,state:null}};
  e.commentary??={};e.commentary[d]=[];drawCompetition();runTrackPlayback(e,d,results,career);
};

function trackReturnToEventDay(){competitionMode='overview';disciplineRunning=false;liveEventView=null;drawCompetition()}
const _trackBaseDrawDiscipline=drawDisciplineScreen;
drawDisciplineScreen=function(e,live,discs){
  _trackBaseDrawDiscipline(e,live,discs);
  const d=activeEventDisc, done=d&&Array.isArray(e?.results?.[d]);if(!done)return;
  const whole=!!e?.completed;
  for(const id of ['startDisciplineTop','startDiscipline']){
    const b=$(id);if(!b)continue;b.disabled=false;b.removeAttribute('disabled');b.classList.add('event-complete-return');
    if(whole){b.textContent='COMPLETE EVENT';b.onclick=typeof returnFromCompletedEvent==='function'?returnFromCompletedEvent:()=>view('home')}
    else{b.textContent=id==='startDisciplineTop'?'DONE':'RETURN TO EVENT DAY';b.onclick=trackReturnToEventDay}
  }
};

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Continuous Race Coverage')){
  UPDATES.unshift({date:'9 September 2026',title:'Continuous Race Coverage',items:[
    'Rebuilt every current track race around a continuous animation clock. Athletes now keep moving between highlights instead of stopping while commentary catches up.',
    'Commentary is highlight coverage triggered by meaningful race checkpoints. The race drives the commentary rather than commentary driving the race.',
    'Viewing time is compressed by distance: short sprints stay quick while the 5,000m and 10,000m play in about a minute without changing any official performance.',
    'Every runner crosses the line on the animation clock according to their official time. Tactical race-shape variation fades before the finish, so lane assignment cannot determine the result.',
    '800m starts use unique lanes before the break and then merge into the pack. Completed disciplines now use an active Done/Return control rather than a greyed-out Complete button.'
  ]});
}
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Continuous Track Race Overhaul V3 ===== */