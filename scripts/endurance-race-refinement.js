/* ===== Endurance Race & Event Flow Refinement ===== */
(function(){
'use strict';

const REFINEMENT_VERSION=1;
const TRACK={cx:380,cy:228,innerRx:222,innerRy:110,laneWidth:10};
const SVG_W=760,SVG_H=455;

function isEndurance(d){return DISCIPLINES?.[d]?.family==='endurance'}
function distanceOf(d){return Number(DISCIPLINES?.[d]?.distance)||0}
function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function athleteFor(id){return (s?.athletes||[]).find(a=>a.id===id)||null}
function stable01(key){return ((hashString(String(key))>>>0)%10000)/10000}
function shortName(name){const parts=String(name||'').trim().split(/\s+/);return (parts.at(-1)||parts[0]||'').slice(0,8).toUpperCase()}

/* An 800m final should never need two athletes occupying the same lane.
   If a circuit field is larger than eight, use heats just as championships do. */
const _enduranceRefineFormat=athleticsFormat;
athleticsFormat=function(e,d,fieldSize=null){
  const format=_enduranceRefineFormat(e,d,fieldSize);
  if(!isEndurance(d)||distanceOf(d)!==800)return format;
  const n=Number(fieldSize)||0;
  if(n<=8||format?.label==='HEATS → FINAL')return format;
  return {
    ...format,
    family:'endurance',
    label:'HEATS → FINAL',
    detail:'Staggered 800m starts use one athlete per lane. Two seeded heats advance the top three from each race plus the next two fastest into an eight-athlete final.',
    stages:['Heats','Final']
  };
};

function styleBias(style,p){
  if(style==='Front Runner')return (1-p)*2.2-p*.45;
  if(style==='Kicker')return p*2.5-(1-p)*1.15;
  if(style==='Strength Runner')return p>.42?1.15:.15;
  return .45;
}
function refinedCheckpointOrders(e,d,rows,checkpoints){
  const distance=distanceOf(d),finalRows=[...rows].sort((a,b)=>(a.finalPlace??999)-(b.finalPlace??999)||Number(a.perf)-Number(b.perf)),finalIndex=new Map(finalRows.map((r,i)=>[r.id,i]));
  const start=[...finalRows].sort((a,b)=>stable01(`${e.id}|${d}|${a.id}|start`)-stable01(`${e.id}|${d}|${b.id}|start`)||String(a.name).localeCompare(String(b.name)));
  let previous=[...start];
  return checkpoints.map(metres=>{
    if(metres<=0){previous=[...start];return {metres,order:previous.map(r=>r.id),leaderId:previous[0]?.id||null}}
    if(metres>=distance){previous=[...finalRows];return {metres,order:previous.map(r=>r.id),leaderId:previous[0]?.id||null}}
    const p=metres/distance,prevIndex=new Map(previous.map((r,i)=>[r.id,i]));
    const ordered=[...finalRows].sort((a,b)=>{
      const score=r=>{
        const athlete=athleteFor(r.id),phase=stable01(`${e.id}|${d}|${r.id}|phase`)*Math.PI*2,phase2=stable01(`${e.id}|${d}|${r.id}|phase2`)*Math.PI*2;
        const wave=Math.sin(p*Math.PI*2+phase)*1.45+Math.cos(p*Math.PI*3+phase2)*.65;
        const early=(stable01(`${e.id}|${d}|${r.id}|early`)-.5)*3.2*(1-p);
        const finishPull=-(finalIndex.get(r.id)||0)*Math.pow(p,2.25)*4.1;
        const inertia=-(prevIndex.get(r.id)||0)*.52;
        return wave+early+styleBias(athlete?.raceStyle||'Even Pacer',p)+finishPull+inertia;
      };
      return score(b)-score(a)||Number(a.perf)-Number(b.perf)||String(a.name).localeCompare(String(b.name));
    });
    previous=ordered;
    return {metres,order:ordered.map(r=>r.id),leaderId:ordered[0]?.id||null};
  });
}
function refineEnduranceMeta(e,d,out){
  const meta=out?.meta;if(meta?.family!=='endurance'||!meta.race)return out;
  const finalRows=(out.rows||[]).filter(r=>!r.eliminated).sort((a,b)=>(a.finalPlace??999)-(b.finalPlace??999)||Number(a.perf)-Number(b.perf));
  const checkpoints=(meta.race.checkpoints||[]).map(x=>Number(x.metres)).filter(Number.isFinite);
  meta.race.checkpoints=refinedCheckpointOrders(e,d,finalRows,checkpoints);
  if(distanceOf(d)===800){
    const startOrder=meta.race.checkpoints[0]?.order||finalRows.map(r=>r.id);
    meta.race.startLanes=Object.fromEntries(startOrder.slice(0,8).map((id,i)=>[id,i+1]));
  }else delete meta.race.startLanes;
  meta.race.refinementVersion=REFINEMENT_VERSION;
  return out;
}
const _enduranceRefineEngine=athleticsRunEngine;
athleticsRunEngine=function(e,d,base){
  const out=_enduranceRefineEngine(e,d,base);
  return isEndurance(d)?refineEnduranceMeta(e,d,out):out;
};

function liveRows(e,d){
  const rows=(liveEventView?.event===e&&liveEventView?.disc===d?liveEventView.results:e?.results?.[d])||[];
  return rows.filter(r=>!r.eliminated).sort((a,b)=>(a.finalPlace??999)-(b.finalPlace??999)||Number(a.perf)-Number(b.perf));
}
function cueMetresAt(e,d,index){
  const distance=distanceOf(d);
  if(!(liveEventView?.event===e&&liveEventView?.disc===d))return Array.isArray(e?.results?.[d])?distance:0;
  const line=index>=0?liveEventView.lines?.[index]||'':'';
  const cue=line&&e?.engine?.[d]?.broadcastCues?.[line];
  if(Number.isFinite(cue?.metres))return Math.max(0,Math.min(distance,Number(cue.metres)));
  const heading=String(line).split('\n')[0];
  if(/RESULT|OFFICIAL|YOUR SQUAD|YOUR TEAM|THE LINE|FINISH/i.test(heading))return distance;
  const m=heading.match(/(\d+)\s*METRES?/i);return m?Math.max(0,Math.min(distance,Number(m[1]))):0;
}
function orderAt(e,d,rows,metres){
  const cps=e?.engine?.[d]?.race?.checkpoints||[];
  if(!cps.length)return rows;
  const cp=[...cps].sort((a,b)=>Math.abs(Number(a.metres)-metres)-Math.abs(Number(b.metres)-metres))[0];
  const ids=cp?.order||[];
  const ordered=ids.map(id=>rows.find(r=>r.id===id)).filter(Boolean);
  return ordered.concat(rows.filter(r=>!ids.includes(r.id)));
}
function laneFor(e,d,row,index){
  if(distanceOf(d)!==800)return null;
  return Number(e?.engine?.[d]?.race?.startLanes?.[row.id])||Math.min(8,index+1);
}
function runnerMetres(e,d,row,rows,checkpointMetres){
  const distance=distanceOf(d),order=orderAt(e,d,rows,checkpointMetres),idx=Math.max(0,order.findIndex(r=>r.id===row.id));
  if(checkpointMetres<=0)return 0;
  if(checkpointMetres>=distance){
    const winner=rows[0],winnerPerf=Math.max(.01,Number(winner?.perf)||1),gapSeconds=Math.max(0,(Number(row.perf)||winnerPerf)-winnerPerf),gapMetres=gapSeconds*(distance/winnerPerf);
    return Math.max(0,distance-Math.max(idx*.65,gapMetres));
  }
  const p=checkpointMetres/distance,packGap=idx*(1.15+2.9*p)+stable01(`${e.id}|${d}|${row.id}|gap|${checkpointMetres}`)*1.35;
  return Math.max(0,checkpointMetres-packGap);
}
function trackPoint(d,metres,lane,packIndex=0){
  const distance=distanceOf(d),startOffset=(400-(distance%400))%400;
  let course=startOffset+metres,radial=(packIndex%3-1)*3.5;
  if(distance===800&&lane){
    const merge=Math.max(0,Math.min(1,metres/145)),stagger=(lane-1)*3.65*(1-merge);
    course+=stagger;
    radial=(lane-1)*TRACK.laneWidth*(1-merge)+(packIndex%3-1)*3.3*merge;
  }
  const angle=-Math.PI/2+Math.PI*2*(course/400),rx=TRACK.innerRx+5+radial,ry=TRACK.innerRy+5+radial*.48;
  return {x:TRACK.cx+Math.cos(angle)*rx,y:TRACK.cy+Math.sin(angle)*ry};
}
function motionPath(d,fromMetres,toMetres,lane,packIndex){
  const delta=Math.max(0,toMetres-fromMetres),samples=Math.max(12,Math.min(110,Math.ceil(delta/25)));
  const pts=[];
  for(let i=0;i<=samples;i++){
    const t=i/samples,m=fromMetres+(toMetres-fromMetres)*t,p=trackPoint(d,m,lane,packIndex);pts.push(`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return pts.join(' ');
}
function commentaryDuration(){
  const line=liveEventView?.lines?.[liveEventView?.index]||'';
  if(typeof commentaryDelay==='function')return Math.max(2.1,commentaryDelay(line)/1000*.93);
  return 3.2;
}
function trackBackground(){
  const laneLines=Array.from({length:9},(_,i)=>{const rx=TRACK.innerRx+i*TRACK.laneWidth,ry=TRACK.innerRy+i*TRACK.laneWidth*.48;return `<ellipse cx="${TRACK.cx}" cy="${TRACK.cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#f5eadf" stroke-opacity="${(i===0||i===8) ? .55 : .24}" stroke-width="${i===0||i===8?2:1}"/>`}).join('');
  return `<rect width="${SVG_W}" height="${SVG_H}" fill="#173f31"/><ellipse cx="${TRACK.cx}" cy="${TRACK.cy}" rx="${TRACK.innerRx+8*TRACK.laneWidth+18}" ry="${TRACK.innerRy+8*TRACK.laneWidth*.48+18}" fill="#82484e" stroke="#b07074" stroke-width="2"/><ellipse cx="${TRACK.cx}" cy="${TRACK.cy}" rx="${TRACK.innerRx}" ry="${TRACK.innerRy}" fill="#246044"/>${laneLines}<line x1="${TRACK.cx-16}" y1="${TRACK.cy-TRACK.innerRy-2}" x2="${TRACK.cx+69}" y2="${TRACK.cy-TRACK.innerRy-42}" stroke="#fff" stroke-width="4"/><text x="${TRACK.cx+81}" y="${TRACK.cy-TRACK.innerRy-45}" fill="#e7f0f4" font-size="9" font-weight="900">FINISH</text>`;
}
function runnerMarker(row,label,managed){
  const colour=typeof nationDotColour==='function'?nationDotColour(row.nation):'#d8e2e7';
  return `<circle r="${managed?11:9}" fill="${colour}" stroke="${managed?'#fff':'#07131d'}" stroke-width="${managed?4:2}"/><circle r="${managed?15:13}" fill="none" stroke="#fff" stroke-opacity="${managed ? .28 : .07}"/><text y="-14" text-anchor="middle" fill="#f5fbff" font-size="7.5" font-weight="900">${esc(label)}</text><title>${esc(row.name)} • ${esc(nationName(row.nation))}</title>`;
}
function enduranceRaceVisual(e,d){
  const rows=liveRows(e,d);if(!rows.length)return '<div class="fm2d-empty">No starters for this discipline.</div>';
  const distance=distanceOf(d),currentIndex=liveEventView?.event===e&&liveEventView?.disc===d?liveEventView.index:-1,current=cueMetresAt(e,d,currentIndex),previous=cueMetresAt(e,d,currentIndex-1),currentOrder=orderAt(e,d,rows,current),previousOrder=orderAt(e,d,rows,previous),duration=commentaryDuration();
  const dots=currentOrder.map((row,i)=>{
    const oldIndex=Math.max(0,previousOrder.findIndex(r=>r.id===row.id)),lane=laneFor(e,d,row,i),fromM=runnerMetres(e,d,row,rows,previous),toM=runnerMetres(e,d,row,rows,current),to=trackPoint(d,toM,lane,i),managed=row.nation===managedNation(),label=(i<3||managed)?shortName(row.name):'';
    if(current>previous&&toM>fromM){
      const path=motionPath(d,fromM,toM,lane,i);return `<g><animateMotion path="${path}" dur="${duration.toFixed(2)}s" fill="freeze" calcMode="linear"/>${runnerMarker(row,label,managed)}</g>`;
    }
    return `<g transform="translate(${to.x.toFixed(1)} ${to.y.toFixed(1)})">${runnerMarker(row,label,managed)}</g>`;
  }).join('');
  const leader=currentOrder[0],laps=Math.floor(current/400),lapText=current>=distance?'FINISH':current?`${current}m • Lap ${Math.min(Math.ceil((current+((400-(distance%400))%400))/400),Math.ceil(distance/400))}`:'Start';
  const startLabel=distance===800?'STAGGERED START • BREAK TO RAIL':distance===1500?'WATERFALL START • PACK RACE':'PACK RACE • MULTIPLE LAPS';
  return `<div class="fm2d-arena refined-arena endurance-arena"><div class="fm2d-arena-head refined-head"><span>${esc(discLabel(d))} • ${lapText}</span><b>${current>=distance?'FINISH':`${current}m / ${distance}m`}</b></div><svg viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Smooth top-down ${esc(discLabel(d))} pack race">${trackBackground()}${dots}<text x="380" y="217" text-anchor="middle" fill="#e0ece5" font-size="22" font-weight="950">${distance>=10000?'10,000':distance}m</text><text x="380" y="239" text-anchor="middle" fill="#9ebcab" font-size="9" font-weight="850">${startLabel}</text><text x="380" y="258" text-anchor="middle" fill="#7ea18e" font-size="8">${leader?`${esc(shortName(leader.name))} leads`:'Race building'}${laps?` • ${laps} lap${laps===1?'':'s'} completed`:''}</text></svg><div class="fm2d-caption refined-caption"><span>Runners move continuously between race calls; positions are provisional until the line.</span><span>${leader?esc(leader.name)+' leads':''}</span></div></div>`;
}
const _enduranceRefineVisual=eventVisualHTML;
eventVisualHTML=function(e,d){return isEndurance(d)?enduranceRaceVisual(e,d):_enduranceRefineVisual(e,d)};

/* A completed discipline should never leave a greyed-out button that looks actionable. */
function returnToEventDay(){competitionMode='overview';disciplineRunning=false;liveEventView=null;drawCompetition()}
const _enduranceRefineDrawDiscipline=drawDisciplineScreen;
drawDisciplineScreen=function(e,live,discs){
  _enduranceRefineDrawDiscipline(e,live,discs);
  const d=activeEventDisc,results=d&&Array.isArray(e?.results?.[d]);if(!results)return;
  const wholeMeeting=!!e?.completed;
  for(const id of ['startDisciplineTop','startDiscipline']){
    const b=$(id);if(!b)continue;b.disabled=false;b.removeAttribute('disabled');b.classList.add('event-complete-return');
    if(wholeMeeting){b.textContent='COMPLETE EVENT';b.onclick=typeof returnFromCompletedEvent==='function'?returnFromCompletedEvent:()=>{view('home')}}
    else {b.textContent=id==='startDisciplineTop'?'DONE':'RETURN TO EVENT DAY';b.onclick=returnToEventDay}
  }
};

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Endurance Race & Event Flow Refinement')){
  UPDATES.unshift({date:'9 September 2026',title:'Endurance Race & Event Flow Refinement',items:[
    '800m finals now use unique lane assignments; oversized 800m fields are split through heats so two athletes can no longer appear to occupy the same lane.',
    '800m, 1500m, 5000m and 10,000m race order now develops tactically through the checkpoints instead of visually tracking the eventual finishing order from the start.',
    'Distance runners now move smoothly around a true multi-lap oval between commentary calls, including the 800m stagger and break to the rail, rather than jumping between static checkpoint positions.',
    'After an individual discipline finishes, the top-right control is active: Done returns to Event Day, while the final discipline completes the meeting and returns to the main game.'
  ]});
}

if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Endurance Race & Event Flow Refinement ===== */
