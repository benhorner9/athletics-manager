/* ===== Continuous Track Race Overhaul V4 ===== */
(function(){
'use strict';

const TRACK_RACE_VERSION=4;
const SVG_W=760,SVG_H=455;
const OVAL={cx:380,cy:228,innerRx:220,innerRy:108,laneWidth:10.5};
const PREFERRED_LANES=[4,5,3,6,2,7,1,8];

function isTrackRace(d){return !!(DISCIPLINES?.[d]?.type==='time'&&Number(DISCIPLINES?.[d]?.distance)>0)}
function raceDistance(d){return Number(DISCIPLINES?.[d]?.distance)||100}
function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function stable01(key){return ((hashString(String(key))>>>0)%10000)/10000}
function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0))}
function athleteFor(id){return (s?.athletes||[]).find(a=>a.id===id)||null}
function shortName(name){const p=String(name||'').trim().split(/\s+/);return (p.at(-1)||p[0]||'').slice(0,11).toUpperCase()}
function playbackSeconds(distance){if(distance<=100)return 12;if(distance<=200)return 16;if(distance<=400)return 22;if(distance<=800)return 30;if(distance<=1500)return 36;if(distance<=5000)return 50;return 60}
function isLaneRace(distance){return distance<=400}
function splitText(seconds){const n=Math.max(0,Number(seconds)||0);if(n<60)return `${n.toFixed(n<20?2:1)}s`;const m=Math.floor(n/60),s=(n-m*60).toFixed(1).padStart(4,'0');return `${m}:${s}`}

function injectRaceStyles(){
  if(document.getElementById('trackRaceV4Styles'))return;
  const style=document.createElement('style');style.id='trackRaceV4Styles';style.textContent=`
  .track-v4-board{display:grid;grid-template-columns:145px minmax(0,1fr);gap:12px;padding:10px 14px;border-top:1px solid rgba(255,255,255,.08);background:rgba(5,18,27,.78)}
  .track-v4-split{display:flex;flex-direction:column;justify-content:center;border-right:1px solid rgba(255,255,255,.08);padding-right:12px}.track-v4-split small{font-size:10px;letter-spacing:.12em;color:#8da5b1;font-weight:850}.track-v4-split strong{font-size:21px;color:#f4f8fa;line-height:1.1}.track-v4-split span{font-size:11px;color:#91aab5;margin-top:3px}
  .track-v4-leaders{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.track-v4-leader{display:flex;align-items:center;gap:8px;min-width:0;padding:6px 8px;border-radius:7px;background:rgba(255,255,255,.04)}.track-v4-leader b{font-size:13px;color:#eaf2f5}.track-v4-leader div{min-width:0}.track-v4-leader strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#e9f2f6}.track-v4-leader small{display:block;color:#829ba7;font-size:9px;margin-top:1px}.track-v4-leader.managed{outline:1px solid rgba(255,255,255,.28)}
  @media(max-width:700px){.track-v4-board{grid-template-columns:110px minmax(0,1fr);padding:8px 10px;gap:8px}.track-v4-split strong{font-size:17px}.track-v4-leaders{gap:4px}.track-v4-leader{padding:5px;gap:5px}.track-v4-leader strong{font-size:9px}.track-v4-leader small{display:none}}
  `;document.head.appendChild(style);
}

function stageRowsFromMeta(e,d,results){
  const meta=e?.engine?.[d],raw=Array.isArray(meta?.stages)?meta.stages:[];
  if(!raw.length)return [{name:'Final',rows:(results||[]).filter(r=>!r.eliminated).map((r,i)=>({...r,place:i+1}))}];
  return raw.map((stage,si)=>{
    const rows=(stage.rows||[]).map((r,i)=>{
      const a=athleteFor(r.id),source=(results||[]).find(x=>x.id===r.id)||{};
      return {id:r.id,name:r.name||a?.name||source.name||'Athlete',nation:r.nation||a?.nation||source.nation,perf:Number(r.mark??r.perf??source.perf),lane:Number(r.lane)||null,place:Number(r.place)||i+1,stage:stage.name||`Race ${si+1}`};
    }).filter(r=>Number.isFinite(r.perf));
    return {name:stage.name||`Race ${si+1}`,rows};
  }).filter(stage=>stage.rows.length);
}

function normaliseLanes(e,d,stage){
  const distance=raceDistance(d);if(!(isLaneRace(distance)||distance===800))return;
  const used=new Set(),startLanes=e?.engine?.[d]?.race?.startLanes||{};
  [...stage.rows].sort((a,b)=>a.place-b.place||a.perf-b.perf).forEach((r,i)=>{
    let lane=distance===800?Number(startLanes[r.id]):Number(r.lane);
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

function deterministicStartOrder(stage){
  const rows=[...stage.rows].sort((a,b)=>stable01(`${stage.key}|${a.id}|startorder`)-stable01(`${stage.key}|${b.id}|startorder`)||String(a.name).localeCompare(String(b.name)));
  if(rows.length>1){const winner=[...stage.rows].sort((a,b)=>a.perf-b.perf)[0];if(rows[0]?.id===winner?.id)rows.push(rows.shift())}
  return rows;
}

function buildPlaybackStages(e,d,results){
  const stages=stageRowsFromMeta(e,d,results),distance=raceDistance(d),base=playbackSeconds(distance),multi=stages.length>1;
  stages.forEach((stage,i)=>{
    normaliseLanes(e,d,stage);const isFinal=/final/i.test(stage.name)||i===stages.length-1;
    stage.duration=multi?base*(isFinal?.62:.22):base;stage.isFinal=isFinal;stage.key=`${e.id}|${d}|${stage.name}|${i}`;stage.checkpoints=highlightCheckpoints(distance,isFinal,multi);
    stage.startOrder=deterministicStartOrder(stage);stage.startRank=new Map(stage.startOrder.map((r,j)=>[r.id,j]));
  });
  return stages;
}

function tacticalAmplitude(distance){if(distance<=100)return 2.4;if(distance<=200)return 4.5;if(distance<=400)return 7;if(distance<=800)return 19;if(distance<=1500)return 34;if(distance<=5000)return 82;return 145}
function tacticalShift(row,stage,distance,t){
  const n=stage.rows.length,rank=stage.startRank.get(row.id)??Math.floor(n/2),centre=(n-1)/2,amp=tacticalAmplitude(distance),fade=Math.pow(Math.max(0,1-t),1.35),startBias=(centre-rank)*amp/Math.max(2,n-1)*fade;
  const phase=stable01(`${stage.key}|${row.id}|phase`)*Math.PI*2,wave=Math.sin(t*Math.PI*2.25+phase)*amp*.32*Math.sin(Math.PI*t);
  const a=athleteFor(row.id),style=a?.raceStyle||'Even Pacer';let styleMove=0;
  if(distance>400){if(style==='Front Runner')styleMove=amp*.32*(1-t)*Math.sin(Math.PI*t);else if(style==='Kicker')styleMove=t>.58?amp*.36*(t-.58)*Math.sin(Math.PI*t):-amp*.08*Math.sin(Math.PI*t);else if(style==='Strength Runner')styleMove=t>.38?amp*.14*Math.sin(Math.PI*t):0}
  return startBias+wave+styleMove;
}

function stageRaceState(stage,d,local){
  const distance=raceDistance(d),rows=stage.rows,slowest=Math.max(...rows.map(r=>Math.max(.01,Number(r.perf)||.01))),elapsed=clamp01(local)*slowest;
  const items=rows.map(row=>{
    const perf=Math.max(.01,Number(row.perf)||slowest),base=elapsed/perf*distance,t=clamp01(base/distance),shift=tacticalShift(row,stage,distance,t),metres=Math.max(0,Math.min(distance+8,base+shift));
    return {row,metres,finished:metres>=distance};
  });
  items.sort((a,b)=>{
    if(Math.abs(b.metres-a.metres)>.04)return b.metres-a.metres;
    const ar=stage.startRank.get(a.row.id)??99,br=stage.startRank.get(b.row.id)??99;
    if(local<.12&&ar!==br)return ar-br;
    return a.row.perf-b.row.perf||ar-br||String(a.row.name).localeCompare(String(b.row.name));
  });
  items.forEach((x,i)=>x.position=i+1);
  return {distance,elapsed,items,order:items.map(x=>x.row),allFinished:items.every(x=>x.finished)};
}

function laneGeom(lane){const rx=OVAL.innerRx+(lane-.5)*OVAL.laneWidth,ry=OVAL.innerRy+(lane-.5)*OVAL.laneWidth,h=Math.pow(rx-ry,2)/Math.pow(rx+ry,2),circ=Math.PI*(rx+ry)*(1+(3*h)/(10+Math.sqrt(4-3*h)));return {rx,ry,circ}}
function lanePoint(distance,lane,metres){const lane1=laneGeom(1),g=laneGeom(lane),ratio=g.circ/lane1.circ,courseEquivalent=400*ratio,span=Math.min(Math.PI*2,(distance/courseEquivalent)*Math.PI*2),finish=-Math.PI/2,start=finish-span,p=Math.max(0,Math.min(1.04,metres/distance)),angle=start+span*p;return {x:OVAL.cx+Math.cos(angle)*g.rx,y:OVAL.cy+Math.sin(angle)*g.ry}}
function packPoint(distance,row,metres,index){const startOffset=(400-(distance%400))%400,merge=distance===800?clamp01(metres/140):1,lane=Number(row.lane)||1,stagger=distance===800?(lane-1)*3.7*(1-merge):0,course=startOffset+metres+stagger,radial=distance===800?(lane-1)*OVAL.laneWidth*(1-merge)+(index%3-1)*3*merge:(index%3-1)*3.2,angle=-Math.PI/2+Math.PI*2*(course/400),rx=OVAL.innerRx+7+radial,ry=OVAL.innerRy+7+radial*.48;return {x:OVAL.cx+Math.cos(angle)*rx,y:OVAL.cy+Math.sin(angle)*ry}}
function straightPoint(distance,lane,metres){const left=60,right=700,top=48,laneH=42,y=top+(lane-1)*laneH,x=left+(right-left)*Math.max(0,Math.min(1.025,metres/distance));return {x,y}}
function pointFor(d,row,metres,index){const distance=raceDistance(d);if(distance===100)return straightPoint(distance,Number(row.lane)||index+1,metres);if(isLaneRace(distance))return lanePoint(distance,Number(row.lane)||index+1,metres);return packPoint(distance,row,metres,index)}

function ovalBackground(){const outer=laneGeom(8),lines=Array.from({length:9},(_,i)=>{const rx=OVAL.innerRx+i*OVAL.laneWidth,ry=OVAL.innerRy+i*OVAL.laneWidth;return `<ellipse cx="${OVAL.cx}" cy="${OVAL.cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#f5eadf" stroke-opacity="${(i===0||i===8)?.52:.24}" stroke-width="${(i===0||i===8)?2:1}"/>`}).join('');return `<rect width="${SVG_W}" height="${SVG_H}" fill="#173f31"/><ellipse cx="${OVAL.cx}" cy="${OVAL.cy}" rx="${outer.rx+17}" ry="${outer.ry+17}" fill="#82484e" stroke="#b07074" stroke-width="2"/><ellipse cx="${OVAL.cx}" cy="${OVAL.cy}" rx="${OVAL.innerRx}" ry="${OVAL.innerRy}" fill="#246044"/>${lines}<line x1="350" y1="120" x2="416" y2="82" stroke="#fff" stroke-width="4"/><text x="427" y="79" fill="#e7f0f4" font-size="9" font-weight="900">FINISH</text>`}
function straightBackground(){const lanes=8,laneLines=Array.from({length:lanes+1},(_,i)=>`<line x1="42" y1="${27+i*42}" x2="724" y2="${27+i*42}" stroke="#f5eadf" stroke-opacity=".28"/>`).join('');return `<rect width="${SVG_W}" height="${SVG_H}" fill="#173f31"/><rect x="42" y="27" width="682" height="${lanes*42}" rx="8" fill="#82484e" stroke="#b07074" stroke-width="2"/>${laneLines}<line x1="60" y1="27" x2="60" y2="${27+lanes*42}" stroke="#f5eadf" stroke-width="3"/><line x1="700" y1="27" x2="700" y2="${27+lanes*42}" stroke="#fff" stroke-width="5"/>`}

function boardRowsHTML(rows){return rows.slice(0,3).map((r,i)=>`<div class="track-v4-leader ${r.nation===managedNation()?'managed':''}" data-track-board-row="${esc(r.id)}"><b>${i+1}</b><div><strong>${esc(r.name)}</strong><small>${esc(nationName(r.nation))}</small></div></div>`).join('')}
function trackRaceVisualHTML(e,d){
  const track=liveEventView?.trackOverhaulV4;if(!track)return '';
  const stage=track.stages[track.stageIndex]||track.stages[0],distance=raceDistance(d),background=distance===100?straightBackground():ovalBackground(),initial=stage.startOrder||stage.rows;
  const runners=stage.rows.map(row=>{const managed=row.nation===managedNation(),colour=typeof nationDotColour==='function'?nationDotColour(row.nation):'#dbe5e9',label=distance<=800?String(row.lane||''):(managed?shortName(row.name):'');return `<g data-track-runner="${esc(row.id)}"><circle r="${managed?11:9}" fill="${colour}" stroke="${managed?'#fff':'#07131d'}" stroke-width="${managed?4:2}"/><circle r="${managed?15:13}" fill="none" stroke="#fff" stroke-opacity="${managed?.28:.07}"/><text data-track-label y="-14" text-anchor="middle" fill="#f5fbff" font-size="8" font-weight="900">${esc(label)}</text></g>`}).join('');
  const mode=distance<=400?'LANE RACE':distance===800?'STAGGER → BREAK':distance<=1500?'PACK RACE':'ACCELERATED PACK RACE';
  return `<div class="fm2d-arena refined-arena track-overhaul-arena" data-track-race-v4="${esc(stage.key)}"><div class="fm2d-arena-head refined-head"><span>${esc(stage.name)} • ${esc(discLabel(d))}</span><b data-track-distance>0m / ${distance}m</b></div><svg viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Continuous ${esc(discLabel(d))} race">${background}${runners}<text x="380" y="216" text-anchor="middle" fill="#e0ece5" font-size="21" font-weight="950">${distance>=10000?'10,000':distance}m</text><text x="380" y="238" text-anchor="middle" fill="#9ebcab" font-size="9" font-weight="850">${mode}</text><text data-track-order x="380" y="258" text-anchor="middle" fill="#d9e7df" font-size="8.5" font-weight="800">${initial.slice(0,3).map((r,i)=>`${i+1} ${shortName(r.name)}`).join(' • ')}</text></svg><div class="track-v4-board"><div class="track-v4-split"><small data-track-split-label>START</small><strong data-track-split-time>—</strong><span data-track-split-note>Race clock</span></div><div class="track-v4-leaders" data-track-leaders>${boardRowsHTML(initial)}</div></div><div class="fm2d-caption refined-caption"><span>Continuous race coverage • commentary appears at key splits.</span><span data-track-clock>0%</span></div></div>`;
}

const _v4BaseVisual=eventVisualHTML;
eventVisualHTML=function(e,d){return isTrackRace(d)&&liveEventView?.trackOverhaulV4&&liveEventView?.event===e&&liveEventView?.disc===d?trackRaceVisualHTML(e,d):_v4BaseVisual(e,d)};

function ensureTrackVisual(e,d,stage){const arena=$('liveEventVisual');if(!arena)return null;const key=arena.querySelector('[data-track-race-v4]')?.getAttribute('data-track-race-v4');if(key!==stage.key)arena.innerHTML=trackRaceVisualHTML(e,d);return arena.querySelector('[data-track-race-v4]')}
function updateTrackVisual(e,d,stage,state,local,track){
  if(currentView!=='competition'||competitionMode!=='discipline'||activeEventDisc!==d)return;
  const root=ensureTrackVisual(e,d,stage);if(!root)return;const distance=raceDistance(d),byId=new Map(state.items.map((x,i)=>[x.row.id,{...x,index:i}]));
  root.querySelectorAll('[data-track-runner]').forEach(g=>{const id=g.getAttribute('data-track-runner'),x=byId.get(id);if(!x)return;const p=pointFor(d,x.row,x.metres,x.index);g.setAttribute('transform',`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);const label=g.querySelector('[data-track-label]');if(label&&distance>800)label.textContent=x.row.nation===managedNation()?shortName(x.row.name):(x.position<=3?String(x.position):'')});
  const leaderMetres=Math.max(0,Math.min(distance,Math.max(...state.items.map(x=>x.metres)))),distanceEl=root.querySelector('[data-track-distance]'),orderEl=root.querySelector('[data-track-order]'),clockEl=root.querySelector('[data-track-clock]');
  if(distanceEl)distanceEl.textContent=state.allFinished?`FINISH • ${distance}m`:leaderMetres>=distance?'FINISHING':`${Math.round(leaderMetres)}m / ${distance}m`;
  if(orderEl)orderEl.textContent=state.order.slice(0,3).map((r,i)=>`${i+1} ${shortName(r.name)}`).join(' • ');
  if(clockEl)clockEl.textContent=`${Math.round(clamp01(local)*100)}%`;
  const leaders=root.querySelector('[data-track-leaders]');if(leaders)leaders.innerHTML=boardRowsHTML(state.order);
  const label=root.querySelector('[data-track-split-label]'),time=root.querySelector('[data-track-split-time]'),note=root.querySelector('[data-track-split-note]');
  if(track.lastSplitMetres>0){if(label)label.textContent=`${track.lastSplitMetres}m SPLIT`;if(time)time.textContent=splitText(track.lastSplitTime);if(note)note.textContent=track.lastSplitMetres>=distance?'Official finish':'Leader race clock'}
  else{if(label)label.textContent='START';if(time)time.textContent='—';if(note)note.textContent='Race clock'}
}

function highlightLine(e,d,stage,metres,state,previousLeader){
  const distance=raceDistance(d),order=state.order,leader=order[0],second=order[1],third=order[2],stageName=stage.name||'Final',isFinish=metres>=distance;
  if(metres<=0)return `${stageName.toUpperCase()} • THE GUN\nGavin Potts — Away in the ${discLabel(d)}. We will pick up the important moves as the race develops.`;
  if(isFinish){const prefix=stage.isFinal?'RESULT':`${stageName.toUpperCase()} • THE LINE`;return `${prefix}\nGavin Potts — ${leader?.name||'The leader'} gets there first${leader?` in ${fmtPerf(d,leader.perf)}`:''}${second?`, ${second.name} is second in ${fmtPerf(d,second.perf)}`:''}${third?`, with ${third.name} third`:''}.`}
  const changed=previousLeader&&leader&&previousLeader!==leader.id,pack=order.slice(1,3).map(x=>x.name).filter(Boolean).join(' and '),remaining=distance-metres;let body=changed?`${leader.name} has come through to lead`:`${leader?.name||'The leader'} has the advantage`;if(pack)body+=`, with ${pack} closest`;if(distance<=400)body+=remaining<=100?'. This is the decisive part now.':'. The race is beginning to separate.';else if(remaining<=Math.max(200,distance*.18))body+='. The final move is on.';else body+='. Positions are still changing through the pack.';return `${metres} METRES • ${stageName.toUpperCase()}\nGavin Potts — ${body}`
}
function emitHighlight(e,d,stage,metres,state,track){
  track.lastSplitMetres=metres;track.lastSplitTime=metres<=0?0:metres>=raceDistance(d)?Math.min(...stage.rows.map(r=>r.perf)):state.elapsed;
  const line=highlightLine(e,d,stage,metres,state,track.previousLeaderId);track.previousLeaderId=state.order[0]?.id||null;track.triggered.push(line);liveEventView.lines=[...track.triggered];liveEventView.index=liveEventView.lines.length-1;e.commentary??={};e.commentary[d]=[...track.triggered];const comm=$('commentary');if(comm&&typeof renderMatchdayCommentary==='function')renderMatchdayCommentary(comm,line)
}
function completeTrackDiscipline(e,d,results,career){if(s!==career)return;commitDisciplineResults(e,d,results);save();disciplineRunning=false;liveEventView=null;const discs=e.disc.filter(x=>x!=='ALL');activeEventDisc=d;competitionMode='discipline';if(discs.every(x=>Array.isArray(e.results[x])))finaliseEvent(e,false);else{drawCompetition();toast(discLabel(d)+' complete — final standings shown')}}
function checkpointReached(stage,d,checkpoint,state,local){const distance=raceDistance(d);if(checkpoint>=distance)return local>=.999&&state.allFinished;const leaderMetres=Math.max(0,...state.items.map(x=>Math.min(distance,x.metres)));return leaderMetres>=checkpoint}
function runTrackPlayback(e,d,results,career){
  const track=liveEventView.trackOverhaulV4,stages=track.stages;let stageIndex=0,stageStart=null,intermissionUntil=0,raf=0;
  function frame(now){
    if(s!==career||!disciplineRunning||liveEventView?.trackOverhaulV4!==track)return;if(stageStart===null)stageStart=now;
    if(intermissionUntil&&now<intermissionUntil){raf=requestAnimationFrame(frame);return}
    if(intermissionUntil){intermissionUntil=0;stageStart=now;track.previousLeaderId=null;track.nextCheckpoint=0;track.lastSplitMetres=0;track.lastSplitTime=0;track.stageIndex=stageIndex;if(currentView==='competition'&&competitionMode==='discipline'){const arena=$('liveEventVisual');if(arena)arena.innerHTML=trackRaceVisualHTML(e,d)}}
    const stage=stages[stageIndex],local=clamp01((now-stageStart)/(stage.duration*1000)),state=stageRaceState(stage,d,local);track.stageIndex=stageIndex;track.local=local;track.state=state;
    while(track.nextCheckpoint<stage.checkpoints.length&&checkpointReached(stage,d,stage.checkpoints[track.nextCheckpoint],state,local)){const metres=stage.checkpoints[track.nextCheckpoint++];emitHighlight(e,d,stage,metres,state,track)}
    updateTrackVisual(e,d,stage,state,local,track);
    if(local>=1){while(track.nextCheckpoint<stage.checkpoints.length){const metres=stage.checkpoints[track.nextCheckpoint++];emitHighlight(e,d,stage,metres,state,track)}updateTrackVisual(e,d,stage,state,local,track);if(stageIndex<stages.length-1){stageIndex++;track.stageIndex=stageIndex;track.nextCheckpoint=0;track.previousLeaderId=null;track.lastSplitMetres=0;track.lastSplitTime=0;intermissionUntil=now+900;raf=requestAnimationFrame(frame);return}completeTrackDiscipline(e,d,results,career);return}
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);track.cancel=()=>cancelAnimationFrame(raf);
}

const _v4BaseStart=startDiscipline;
startDiscipline=function(e,d){
  if(!isTrackRace(d))return _v4BaseStart(e,d);if(!e||e.completed||disciplineRunning)return;if(e.week!==s.game.week){toast('This event is not live yet');return}e.results??={};if(Array.isArray(e.results[d])){activeEventDisc=d;competitionMode='discipline';drawCompetition();return}
  const career=s,results=simulateDiscipline(e,d),stages=buildPlaybackStages(e,d,results);if(!stages.length)return _v4BaseStart(e,d);injectRaceStyles();disciplineRunning=true;activeEventDisc=d;competitionMode='discipline';liveEventView={event:e,disc:d,results,lines:[],index:-1,trackOverhaulV4:{version:TRACK_RACE_VERSION,stages,stageIndex:0,nextCheckpoint:0,previousLeaderId:null,triggered:[],lastSplitMetres:0,lastSplitTime:0,local:0,state:null}};e.commentary??={};e.commentary[d]=[];drawCompetition();runTrackPlayback(e,d,results,career)
};

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Race Passing & Live Splits'))UPDATES.unshift({date:'9 September 2026',title:'Race Passing & Live Splits',items:['Track races now open from a deterministic tactical order that is independent of the eventual result, forcing the race to develop rather than displaying the finishing order from the gun.','Early position, race style and mid-race surges can move athletes through the field; those effects fade before the line so official times still determine the finish.','Every commentary checkpoint now updates a live split board with the checkpoint distance, realistic race-clock split and current top three while runners continue moving underneath.','The final split switches to the official winning time, keeping compressed viewing time separate from the recorded athletics performance.']});
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Continuous Track Race Overhaul V4 ===== */