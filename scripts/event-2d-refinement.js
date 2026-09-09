/* ===== 2D Broadcast Refinement ===== */
(function(){
'use strict';

const REFINE_VERSION=1;
const SVG_W=760, SVG_H=455;
const TRACK={cx:380,cy:228,innerRx:220,innerRy:108,laneWidth:11,lanes:8};

const esc=v=>profileEscape(String(v??''));
const isLive=(e,d)=>liveEventView?.event===e&&liveEventView?.disc===d;
const liveLine=(e,d,offset=0)=>{
  if(!isLive(e,d))return '';
  const i=(liveEventView?.index??-1)+offset;
  return i>=0?liveEventView.lines?.[i]||'':'';
};
const currentCue=(e,d)=>{const line=liveLine(e,d);return line&&e?.engine?.[d]?.broadcastCues?.[line]||null};
const isManaged=r=>r?.nation===managedNation();
const dotColour=r=>nationDotColour(r?.nation);
const safeNum=(v,fallback=null)=>Number.isFinite(Number(v))?Number(v):fallback;
const pct=(v)=>`${Math.round(v*100)}%`;

function commentaryHeading(line){return String(line||'').split('\n')[0].trim()}
function currentStageName(e,d){
  const meta=e?.engine?.[d];
  if(meta?.family!=='sprint'||!Array.isArray(meta.stages)||meta.stages.length<=1)return meta?.stages?.[0]?.name||'Final';
  if(!isLive(e,d))return 'Final';
  let stage='';
  for(let i=0;i<=liveEventView.index;i++){
    const h=commentaryHeading(liveEventView.lines[i]);
    const heat=h.match(/HEAT\s*(\d+)/i);if(heat)stage=`Heat ${heat[1]}`;
    if(/\bFINAL\b/i.test(h))stage='Final';
  }
  return stage||'Final';
}
function stageRows(e,d){
  const active=isLive(e,d),meta=e?.engine?.[d],stage=currentStageName(e,d);
  if(meta?.family==='sprint'&&Array.isArray(meta.stages)&&meta.stages.length){
    const found=meta.stages.find(x=>String(x.name).toLowerCase()===String(stage).toLowerCase())||meta.stages.find(x=>String(x.name).toLowerCase().includes(String(stage).toLowerCase()));
    if(found?.rows?.length)return found.rows;
  }
  if(active&&Array.isArray(liveEventView.results))return liveEventView.results;
  if(Array.isArray(e?.results?.[d]))return e.results[d];
  try{return buildEventField(e,d).map(a=>({id:a.id,name:a.name,nation:a.nation,lane:a.lane,perf:a.perf}))}catch(_){return []}
}
function rowLane(r,i){return Math.max(1,Math.min(8,Number(r?.lane)||i+1))}
function phaseFromLine(e,d,line=liveLine(e,d)){
  const distance=DISCIPLINES[d]?.distance||100,h=commentaryHeading(line);
  if(Array.isArray(e?.results?.[d])&&!isLive(e,d))return {progress:1,metres:distance,finished:true,label:'Official result',stage:'result'};
  if(/\b(RESULT|OFFICIAL RESULT|PERFORMANCE WATCH|YOUR TEAM|YOUR SQUAD)\b/i.test(h))return {progress:1,metres:distance,finished:true,label:'Official result',stage:'result'};
  const m=h.match(/(\d+)\s*METRES?/i);if(m){const metres=Math.min(distance,Number(m[1]));return {progress:metres/distance,metres,finished:metres>=distance,label:h,stage:metres>=distance?'finish':'race'}}
  if(/THE LINE|FINISH/i.test(h))return {progress:1,metres:distance,finished:true,label:h,stage:'finish'};
  if(/\bSET\b.*\bGO\b/i.test(h)||/SET…?\s*GO/i.test(h))return {progress:.035,metres:Math.max(3,Math.round(distance*.035)),finished:false,label:'Away',stage:'gun'};
  if(/ON YOUR MARKS/i.test(h))return {progress:0,metres:0,finished:false,label:'In the blocks',stage:'blocks'};
  return {progress:0,metres:0,finished:false,label:h||'Ready',stage:'build'};
}
function previousPhase(e,d){return phaseFromLine(e,d,liveLine(e,d,-1))}

/* One authoritative race snapshot drives both the dots and the scoreboard. */
function raceSnapshot(e,d,rows,phase=phaseFromLine(e,d)){
  const distance=DISCIPLINES[d]?.distance||100;
  const timed=rows.filter(r=>safeNum(r.perf)!==null);
  const best=timed.length?Math.min(...timed.map(r=>Number(r.perf))):null;
  const leaderSpeed=best?distance/best:0;
  const baseMetres=phase.finished?distance:phase.metres;
  const firstCheckpoint=distance>=400?100:distance>=200?50:20;
  const established=phase.finished||baseMetres>=firstCheckpoint;
  const spreadScale=established?(phase.finished?1:Math.pow(clamp(phase.progress||0,0,1),1.18)):0;
  const items=rows.map((r,i)=>{
    const perf=safeNum(r.perf,best||10),gapSeconds=best==null?0:Math.max(0,perf-best);
    const finishGap=best==null?0:gapSeconds*leaderSpeed;
    const liveGap=finishGap*spreadScale;
    const metres=clamp(baseMetres-liveGap,0,distance);
    return {row:r,lane:rowLane(r,i),perf,metres,progress:distance?metres/distance:0,gapMetres:Math.max(0,baseMetres-metres),gapSeconds};
  });
  items.sort((a,b)=>b.metres-a.metres||(established?(a.perf-b.perf):(a.lane-b.lane))||String(a.row.name).localeCompare(String(b.row.name)));
  items.forEach((x,i)=>x.position=i+1);
  return {distance,best,phase,items,stage:currentStageName(e,d)};
}
function snapshotForLine(e,d,rows,line){return raceSnapshot(e,d,rows,phaseFromLine(e,d,line))}

function runnerDot(r,radius=10,label=''){
  const managed=isManaged(r),stroke=managed?'#f5fbff':'#06131c',sw=managed?4:2;
  return `<circle r="${radius}" fill="${dotColour(r)}" stroke="${stroke}" stroke-width="${sw}"/><circle r="${radius+4}" fill="none" stroke="#ffffff" stroke-opacity="${managed?.34:.08}" stroke-width="1"/>${label?`<text y="${-radius-8}" text-anchor="middle" fill="#f3f8fa" font-size="9" font-weight="900">${esc(label)}</text>`:''}<title>${esc(r.name)} • ${esc(nationName(r.nation))}</title>`
}
function animatedGroup(from,to,inner,cls='fm-refined-dot'){
  const same=Math.abs(from.x-to.x)<.1&&Math.abs(from.y-to.y)<.1;
  return `<g class="${cls}" transform="translate(${to.x.toFixed(1)} ${to.y.toFixed(1)})">${!same?`<animateTransform attributeName="transform" type="translate" from="${from.x.toFixed(1)} ${from.y.toFixed(1)}" to="${to.x.toFixed(1)} ${to.y.toFixed(1)}" dur=".9s" fill="freeze" calcMode="spline" keySplines=".2 .75 .25 1"/>`:''}${inner}</g>`
}
function trackLaneGeom(lane){
  const rx=TRACK.innerRx+(lane-.5)*TRACK.laneWidth,ry=TRACK.innerRy+(lane-.5)*TRACK.laneWidth;
  const h=Math.pow(rx-ry,2)/Math.pow(rx+ry,2),circ=Math.PI*(rx+ry)*(1+(3*h)/(10+Math.sqrt(4-3*h)));
  return {rx,ry,circ};
}
function ovalRacePoint(distance,lane,metres){
  const lane1=trackLaneGeom(1),g=trackLaneGeom(lane),laneRatio=g.circ/lane1.circ;
  const courseEquivalent=400*laneRatio;
  const span=Math.min(Math.PI*2,(distance/courseEquivalent)*Math.PI*2);
  const start=Math.PI*2-span;
  const p=clamp(metres/distance,0,1),angle=start+span*p;
  return {x:TRACK.cx+Math.cos(angle)*g.rx,y:TRACK.cy+Math.sin(angle)*g.ry,start,span,angle};
}
function ovalStartPoint(distance,lane){return ovalRacePoint(distance,lane,0)}
function trackBackground(){
  const outer=trackLaneGeom(8),inner={rx:TRACK.innerRx,ry:TRACK.innerRy};
  const laneLines=Array.from({length:9},(_,i)=>{const rx=inner.rx+i*TRACK.laneWidth,ry=inner.ry+i*TRACK.laneWidth;return `<ellipse cx="${TRACK.cx}" cy="${TRACK.cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#f5eadf" stroke-opacity="${i===0||i===8?.55:.28}" stroke-width="${i===0||i===8?2.2:1.25}"/>`}).join('');
  return `<rect width="${SVG_W}" height="${SVG_H}" fill="#173f31"/><ellipse cx="${TRACK.cx}" cy="${TRACK.cy}" rx="${outer.rx+18}" ry="${outer.ry+18}" fill="#82484e" stroke="#b07074" stroke-width="2"/><ellipse cx="${TRACK.cx}" cy="${TRACK.cy}" rx="${inner.rx}" ry="${inner.ry}" fill="#246044"/>${laneLines}<line x1="${TRACK.cx+outer.rx+8}" y1="${TRACK.cy-outer.ry-5}" x2="${TRACK.cx+inner.rx-8}" y2="${TRACK.cy-inner.ry+5}" stroke="#fff" stroke-width="4"/><text x="${TRACK.cx+outer.rx+16}" y="${TRACK.cy-outer.ry-12}" fill="#e7f0f4" font-size="10" font-weight="900">FINISH</text>`;
}
function sprintScene(e,d,rows){
  const snap=raceSnapshot(e,d,rows),prev=snapshotForLine(e,d,rows,liveLine(e,d,-1)),distance=snap.distance;
  const subtitle=snap.stage&&snap.stage!=='Final'?`${snap.stage} • ${snap.phase.label}`:snap.phase.label;
  if(distance===100){
    const left=60,right=706,top=38,laneH=(SVG_H-76)/Math.max(8,rows.length),ordered=[...rows].sort((a,b)=>rowLane(a,rows.indexOf(a))-rowLane(b,rows.indexOf(b)));
    const distanceLines=[20,40,60,80].map(m=>{const x=left+(right-left)*(m/100);return `<line x1="${x}" y1="22" x2="${x}" y2="${SVG_H-22}" stroke="#fff" stroke-opacity=".13" stroke-width="1"/><text x="${x}" y="18" text-anchor="middle" fill="#9db3be" font-size="9">${m}m</text>`}).join('');
    const lanes=ordered.map((r,i)=>{const lane=rowLane(r,i),y=top+(lane-1)*laneH+laneH/2,item=snap.items.find(x=>x.row.id===r.id),old=prev.items.find(x=>x.row.id===r.id)||item,from={x:left+(right-left)*(old?.progress||0),y},to={x:left+(right-left)*(item?.progress||0),y};return `<line x1="${left}" y1="${y+laneH/2}" x2="${right}" y2="${y+laneH/2}" stroke="#f4eadf" stroke-opacity=".28"/><text x="30" y="${y+4}" fill="#cad9df" text-anchor="middle" font-size="11" font-weight="800">${lane}</text>${animatedGroup(from,to,runnerDot(r,10,lane))}`}).join('');
    return `<div class="fm2d-arena refined-arena"><div class="fm2d-arena-head refined-head"><span>${esc(subtitle)}</span><b>${snap.phase.finished?'FINISH':`${snap.phase.metres}m / 100m`}</b></div><svg viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Accurate top-down ${esc(discLabel(d))} race"><rect width="${SVG_W}" height="${SVG_H}" fill="#173f31"/><rect x="42" y="22" width="696" height="${SVG_H-44}" rx="10" fill="#82484e" stroke="#ad6c71" stroke-width="2"/>${distanceLines}<line x1="${left}" y1="22" x2="${left}" y2="${SVG_H-22}" stroke="#f5efe8" stroke-width="3"/><line x1="${right}" y1="22" x2="${right}" y2="${SVG_H-22}" stroke="#fff" stroke-width="5"/>${lanes}</svg><div class="fm2d-caption refined-caption"><span>Race position and scoreboard use the same live snapshot.</span><span>${snap.stage}</span></div></div>`;
  }
  const background=trackBackground(),ordered=[...rows].sort((a,b)=>rowLane(a,rows.indexOf(a))-rowLane(b,rows.indexOf(b)));
  const starts=ordered.map((r,i)=>{const lane=rowLane(r,i),p=ovalStartPoint(distance,lane),g=trackLaneGeom(lane),a=p.start,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux;return `<line x1="${p.x-nx*6}" y1="${p.y-ny*6}" x2="${p.x+nx*6}" y2="${p.y+ny*6}" stroke="#f7f1eb" stroke-width="2" stroke-opacity=".9"/><text x="${p.x+nx*14}" y="${p.y+ny*14+3}" text-anchor="middle" fill="#d7e5ea" font-size="8">${lane}</text>`}).join('');
  const dots=ordered.map((r,i)=>{const lane=rowLane(r,i),item=snap.items.find(x=>x.row.id===r.id),old=prev.items.find(x=>x.row.id===r.id)||item,from=ovalRacePoint(distance,lane,old?.metres||0),to=ovalRacePoint(distance,lane,item?.metres||0);return animatedGroup(from,to,runnerDot(r,10,lane))}).join('');
  const checkpoints=distance===400?['100','200','300']:['100'];
  return `<div class="fm2d-arena refined-arena"><div class="fm2d-arena-head refined-head"><span>${esc(subtitle)}</span><b>${snap.phase.finished?'FINISH':`${snap.phase.metres}m / ${distance}m`}</b></div><svg viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Accurate staggered top-down ${esc(discLabel(d))} race">${background}${starts}${dots}<g class="refined-infield-label"><text x="380" y="220" text-anchor="middle" fill="#e0ece5" font-size="21" font-weight="950">${distance}m</text><text x="380" y="240" text-anchor="middle" fill="#98b5a5" font-size="9" font-weight="800">STAGGERED START • COMMON FINISH</text><text x="380" y="259" text-anchor="middle" fill="#769786" font-size="8">${checkpoints.map(x=>x+'m').join(' • ')}</text></g></svg><div class="fm2d-caption refined-caption"><span>Lane staggers are drawn from each lane's path length.</span><span>${snap.stage}</span></div></div>`;
}

function throwState(e,d,rows){
  const states=new Map(rows.map(r=>[r.id,{row:r,attempts:[],best:null,current:false}]));
  if(!isLive(e,d))return states;
  const meta=e?.engine?.[d];
  for(let i=0;i<=liveEventView.index;i++){
    const cue=meta?.broadcastCues?.[liveEventView.lines[i]];if(cue?.family!=='throws')continue;
    const st=states.get(cue.athleteId);if(!st)continue;
    const idx=Math.max(0,(cue.attempt||1)-1);st.attempts[idx]=Number.isFinite(cue.mark)?Number(cue.mark):null;
  }
  const cue=currentCue(e,d);if(cue?.family==='throws'&&states.has(cue.athleteId))states.get(cue.athleteId).current=true;
  for(const st of states.values()){const valid=st.attempts.filter(Number.isFinite);st.best=valid.length?Math.max(...valid):null}
  return states;
}
function throwLanding(row,mark){
  const x0=118,y0=228,scale=22.4,seed=hashString(`${row?.id||row?.name}|throw-angle`),angle=((seed%1000)/1000-.5)*(34.92*Math.PI/180*.72),r=mark*scale;
  return {x:x0+r*Math.cos(angle),y:y0+r*Math.sin(angle),x0,y0,angle,r};
}
function shotScene(e,d,rows){
  const cue=currentCue(e,d),completed=Array.isArray(e?.results?.[d])&&!isLive(e,d),current=completed?(rows[0]||null):(rows.find(r=>r.id===cue?.athleteId)||rows.find(isManaged)||rows[0]),mark=completed?safeNum(current?.perf):Number.isFinite(cue?.mark)?Number(cue.mark):null,landing=mark!==null?throwLanding(current,mark):null;
  const x0=118,y0=228,sector=34.92*Math.PI/180/2,R=590,xA=x0+R*Math.cos(-sector),yA=y0+R*Math.sin(-sector),xB=x0+R*Math.cos(sector),yB=y0+R*Math.sin(sector);
  const arcs=[10,15,20,25].map(m=>{const r=m*22.4,a1={x:x0+r*Math.cos(-sector),y:y0+r*Math.sin(-sector)},a2={x:x0+r*Math.cos(sector),y:y0+r*Math.sin(sector)};return `<path d="M${a1.x} ${a1.y} A${r} ${r} 0 0 1 ${a2.x} ${a2.y}" fill="none" stroke="#e8f2e9" stroke-opacity=".22" stroke-width="1.4"/><text x="${x0+r-3}" y="${y0-7}" text-anchor="end" fill="#b7cabd" font-size="9">${m}m</text>`}).join('');
  const flight=landing?`<path d="M${x0+12} ${y0} Q${(x0+landing.x)/2} ${Math.min(y0,landing.y)-86} ${landing.x} ${landing.y}" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="2" stroke-dasharray="6 6"/><circle cx="${landing.x}" cy="${landing.y}" r="7" fill="#e0ded7" stroke="#26312c" stroke-width="2"><animate attributeName="r" values="3;9;7" dur=".65s" fill="freeze"/></circle><line x1="${x0}" y1="${y0}" x2="${landing.x}" y2="${landing.y}" stroke="#dce9df" stroke-opacity=".28" stroke-width="1.4"/><g transform="translate(${Math.min(landing.x+12,690)} ${landing.y-16})"><rect width="72" height="26" rx="6" fill="#07131dde" stroke="#ffffff2e"/><text x="36" y="17" text-anchor="middle" fill="#fff" font-size="12" font-weight="950">${mark.toFixed(2)}m</text></g>`:'';
  return `<div class="fm2d-arena refined-arena"><div class="fm2d-arena-head refined-head"><span>${completed?`Winning mark • ${esc(current?.name)}`:cue?`Attempt ${cue.attempt} • ${esc(current?.name)}`:'Shot Put • ready'}</span><b>${completed&&mark!==null?`${mark.toFixed(2)}m`:cue?(mark!==null?`${mark.toFixed(2)}m`:'FOUL'):'—'}</b></div><svg viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Measured top-down shot put"><rect width="${SVG_W}" height="${SVG_H}" fill="#1e593d"/><path d="M${x0} ${y0} L${xA} ${yA} A${R} ${R} 0 0 1 ${xB} ${yB} Z" fill="#2b724f" stroke="#e6f0e7" stroke-opacity=".62" stroke-width="2"/>${arcs}<circle cx="${x0}" cy="${y0}" r="48" fill="#a3aaa7" stroke="#eef3f0" stroke-width="4"/><path d="M${x0-48} ${y0}H${x0+48}" stroke="#fff" stroke-width="3"/>${current?`<g transform="translate(${x0} ${y0})">${runnerDot(current,12)}</g>`:''}${flight}${cue&&!Number.isFinite(cue.mark)?`<g transform="translate(548 92)"><rect x="-64" y="-22" width="128" height="44" rx="9" fill="#3b171d" stroke="#ff9ba7"/><text text-anchor="middle" y="7" fill="#ffd7dc" font-size="18" font-weight="950">FOUL</text></g>`:''}</svg><div class="fm2d-caption refined-caption"><span>Landing position is scaled directly from the announced distance.</span><span>${completed?'Official':cue?`Attempt ${cue.attempt}`:'Ready'}</span></div></div>`;
}

function barHeightFromLine(e,d){
  const cue=currentCue(e,d);if(cue?.height)return Number(cue.height);
  const h=commentaryHeading(liveLine(e,d)),m=h.match(/BAR TO\s+([0-9.]+)/i);if(m)return Number(m[1]);
  return e?.engine?.[d]?.openingHeight||null;
}
function knownHighJumpState(e,d,rows){
  const bar=barHeightFromLine(e,d),states=new Map(rows.map(r=>[r.id,{row:r,best:null,totalFails:0,last:'Waiting',out:false,current:false,marks:''}]));
  if(!isLive(e,d))return {bar,states};
  const meta=e?.engine?.[d];
  /* Once the broadcast moves to a higher bar, every result below it is known. */
  for(const r of rows){
    const st=states.get(r.id),all=r.hjAttempts||[];
    for(const a of all){if(bar!=null&&Number(a.height)>=bar)continue;const marks=a.marks||[];if(marks[0]==='-'){st.last=`${fmtPerf(d,a.height)} • PASS`;continue}const clear=marks.indexOf('O');st.totalFails+=marks.filter(x=>x==='X').length;if(clear>=0){st.best=Math.max(st.best||0,a.height);st.last=`${fmtPerf(d,a.height)} • ${'X'.repeat(clear)}O`}else if(marks.filter(x=>x==='X').length>=3){st.out=true;st.last=`${fmtPerf(d,a.height)} • XXX`}}
  }
  for(let i=0;i<=liveEventView.index;i++){
    const cue=meta?.broadcastCues?.[liveEventView.lines[i]];if(cue?.family!=='height')continue;const st=states.get(cue.athleteId);if(!st)continue;
    if(cue.outcome==='O'){st.best=Math.max(st.best||0,cue.height);st.totalFails+=Math.max(0,(cue.attempt||1)-1);st.marks=`${'X'.repeat(Math.max(0,(cue.attempt||1)-1))}O`;st.last=`${fmtPerf(d,cue.height)} • ${st.marks}`}
    else if(cue.outcome==='X'){st.totalFails+=1;st.marks='XXX';st.last=`${fmtPerf(d,cue.height)} • XXX`;if((cue.attempt||0)>=3)st.out=true}
    else {st.marks='–';st.last=`${fmtPerf(d,cue.height)} • PASS`}
  }
  const cue=currentCue(e,d);if(cue?.family==='height'&&states.has(cue.athleteId))states.get(cue.athleteId).current=true;
  return {bar,states};
}
function highJumpScene(e,d,rows){
  const cue=currentCue(e,d),completed=Array.isArray(e?.results?.[d])&&!isLive(e,d),current=completed?(rows[0]||null):(rows.find(r=>r.id===cue?.athleteId)||null),bar=completed?safeNum(current?.perf):barHeightFromLine(e,d),outcome=completed?'O':cue?.outcome,label=completed?'WINNER':cue?(outcome==='O'?'CLEAR':outcome==='X'?'MISS':'PASS'):(bar?`BAR ${fmtPerf(d,bar)}`:'READY');
  const approach={x:140,y:345},takeoff={x:510,y:235},clear={x:614,y:205},miss={x:545,y:230},wait={x:150,y:342},dest=outcome==='O'?clear:outcome==='X'?miss:outcome==='-'?wait:approach;
  const athlete=current?animatedGroup(approach,dest,runnerDot(current,13),'fm-hj-dot'):'';
  return `<div class="fm2d-arena refined-arena"><div class="fm2d-arena-head refined-head"><span>${bar?`${fmtPerf(d,bar)} • ${esc(current?.name||'Bar change')}`:'High Jump'}</span><b>${label}</b></div><svg viewBox="0 0 ${SVG_W} ${SVG_H}" role="img" aria-label="Accurate high jump highlight"><rect width="${SVG_W}" height="${SVG_H}" fill="#20583f"/><path d="M70 365 C245 380 385 335 500 240" fill="none" stroke="#9e5952" stroke-width="76"/><path d="M70 365 C245 380 385 335 500 240" fill="none" stroke="#f2ddd7" stroke-opacity=".42" stroke-width="2" stroke-dasharray="9 9"/><rect x="558" y="132" width="145" height="186" rx="11" fill="#3975b8" stroke="#acd5ff" stroke-width="3"/><line x1="535" y1="105" x2="535" y2="335" stroke="#e8eff4" stroke-width="4"/><line x1="710" y1="105" x2="710" y2="335" stroke="#e8eff4" stroke-width="4"/><line x1="535" y1="208" x2="710" y2="208" stroke="${outcome==='X'?'#ffadb6':'#f5de82'}" stroke-width="4" ${outcome==='X'?'transform="rotate(5 622 208)"':''}/>${athlete}<g transform="translate(604 75)"><rect x="-58" y="-21" width="116" height="42" rx="8" fill="#07131dde" stroke="#ffffff2d"/><text text-anchor="middle" y="6" fill="#fff" font-size="17" font-weight="950">${bar?fmtPerf(d,bar):'—'}</text></g><text x="630" y="347" text-anchor="middle" fill="#b9d1de" font-size="10">LANDING MAT</text></svg><div class="fm2d-caption refined-caption"><span>Highlights only • bar height and outcome match the current call.</span><span>${label}</span></div></div>`;
}

function refinedVisualHTML(e,d){
  const rows=stageRows(e,d);if(!rows.length)return '<div class="fm2d-empty">No starters for this discipline.</div>';
  const type=DISCIPLINES[d]?.type;
  if(type==='time')return sprintScene(e,d,rows);
  if(type==='height')return highJumpScene(e,d,rows);
  return shotScene(e,d,rows);
}

function officialRows(e,d){return Array.isArray(e?.results?.[d])?e.results[d]:stageRows(e,d)}
function officialBoard(e,d,rows){return rows.map((r,i)=>`<div class="fm-board-row refined-row ${isManaged(r)?'managed':''}"><b class="fm-pos">${i+1}</b><i class="fm-board-dot" style="background:${dotColour(r)}"></i><div class="fm-board-name"><strong>${esc(r.name)}</strong><small>${flag(r.nation)} ${esc(nationName(r.nation))}${r.lane?` • Lane ${r.lane}`:''}</small></div><span class="fm-board-value">${fmtPerf(d,r.perf)}</span></div>`).join('')}
function sprintBoard(e,d,rows){
  const snap=raceSnapshot(e,d,rows),firstCheckpoint=snap.distance>=400?100:snap.distance>=200?50:20,established=snap.phase.finished||snap.phase.metres>=firstCheckpoint;
  return snap.items.map(x=>`<div class="fm-board-row refined-row ${isManaged(x.row)?'managed':''} ${established&&x.position===1?'leader':''}"><b class="fm-pos">${established?x.position:'—'}</b><i class="fm-board-dot" style="background:${dotColour(x.row)}"></i><div class="fm-board-name"><strong>${esc(x.row.name)}</strong><small>Lane ${x.lane} • ${flag(x.row.nation)} ${esc(nationName(x.row.nation))}${established&&x.position===1?' • LEADER':''}</small></div><span class="fm-board-value">${snap.phase.finished&&Number.isFinite(x.perf)?fmtPerf(d,x.perf):!established?'START':x.position===1?`${x.metres.toFixed(x.metres<10?1:0)}m`:`+${x.gapMetres.toFixed(1)}m`}</span></div>`).join('')
}
function throwBoard(e,d,rows){
  const states=throwState(e,d,rows),arr=[...states.values()].sort((a,b)=>(b.best??-1)-(a.best??-1)||String(a.row.name).localeCompare(String(b.row.name)));
  return arr.map((st,i)=>{const series=st.attempts.length?st.attempts.map((x,n)=>x===undefined?'·':x===null?'X':x.toFixed(2)).join('  '):'Waiting';return `<div class="fm-board-row refined-row ${isManaged(st.row)?'managed':''} ${st.current?'current':''}"><b class="fm-pos">${st.best!==null?i+1:'—'}</b><i class="fm-board-dot" style="background:${dotColour(st.row)}"></i><div class="fm-board-name"><strong>${esc(st.row.name)}</strong><small>${st.current?'THROWING • ':''}${esc(series)}</small></div><span class="fm-board-value">${st.best!==null?fmtPerf(d,st.best):'—'}</span></div>`}).join('')
}
function highJumpBoard(e,d,rows){
  const {bar,states}=knownHighJumpState(e,d,rows),arr=[...states.values()].sort((a,b)=>Number(a.out)-Number(b.out)||(b.best??-1)-(a.best??-1)||a.totalFails-b.totalFails||String(a.row.name).localeCompare(String(b.row.name)));
  return arr.map((st,i)=>`<div class="fm-board-row refined-row ${isManaged(st.row)?'managed':''} ${st.current?'current':''} ${st.out?'out':''}"><b class="fm-pos">${st.best!==null?i+1:'—'}</b><i class="fm-board-dot" style="background:${dotColour(st.row)}"></i><div class="fm-board-name"><strong>${esc(st.row.name)}</strong><small>${st.current?'AT THE BAR • ':''}${st.out?'OUT • ':''}${esc(st.last)}</small></div><span class="fm-board-value">${st.best!==null?fmtPerf(d,st.best):bar?'—':'—'}</span></div>`).join('')
}
function refinedScoreboardHTML(e,d){
  const active=isLive(e,d),done=Array.isArray(e?.results?.[d])&&!active,rows=done?officialRows(e,d):stageRows(e,d),type=DISCIPLINES[d]?.type,phase=phaseFromLine(e,d),stage=currentStageName(e,d);
  let body;if(!rows.length)body='<div class="fm-board-empty">No starters.</div>';else if(done)body=officialBoard(e,d,rows);else if(type==='time')body=sprintBoard(e,d,rows);else if(type==='height')body=highJumpBoard(e,d,rows);else body=throwBoard(e,d,rows);
  const kicker=done?'OFFICIAL RESULT':active?`${stage}${phase.label?` • ${phase.label}`:''}`:'START LIST';
  const right=type==='time'?(done?'TIME':'GAP'):type==='height'?'BEST':'BEST';
  const note=done?'Result confirmed.':type==='time'?'Dot positions and scoreboard order are generated from the same race snapshot.':type==='height'?'High Jump updates at each broadcast highlight and completes previous bar heights when the bar moves.':'Every displayed landing point uses the exact announced distance.';
  return `<div class="fm-scoreboard-inner refined-scoreboard-inner"><header class="fm-scoreboard-head refined-scoreboard-head"><div><small>${esc(kicker)}</small><strong>${esc(discLabel(d))} Scoreboard</strong></div><span>${rows.length} athlete${rows.length===1?'':'s'}</span></header><div class="fm-board-columns refined-columns"><span>POS</span><span>ATHLETE</span><span>${right}</span></div><div class="fm-board-list">${body}</div><footer class="fm-scoreboard-foot refined-board-foot">${esc(note)}</footer></div>`;
}
function updateLivePanels(e,d){const arena=$('liveEventVisual'),board=$('liveScoreboard');if(arena)arena.innerHTML=refinedVisualHTML(e,d);if(board)board.innerHTML=refinedScoreboardHTML(e,d)}

function athleteChips(chosen,mn){return chosen.length?chosen.map(a=>`<div class="matchday-athlete-chip"><div><span>${athleteLink(a)}</span><small>PB ${fmtPerf(a.disc,a.pb)} • ${health(a)[0]}</small></div></div>`).join(''):`<span class="matchday-dash-sub">No ${esc(mn)} athlete entered.</span>`}

/* Rebuild the discipline screen so both halves are driven by the refined renderer. */
drawDisciplineScreen=function(e,live,discs){
 const d=activeEventDisc,chosen=(e.entries[d]||[]).map(id=>s.athletes.find(a=>a.id===id)).filter(Boolean),results=e.results[d]||null,mn=nationName(managedNation()),isRunning=disciplineRunning&&!results,format=e.engine?.[d]||athleticsFormat(e,d),completedCount=discs.filter(x=>Array.isArray(e.results[x])).length,statusLabel=results?'OFFICIAL':isRunning?'LIVE':live?'READY':'PREVIEW';
 const rawCall=results?matchdayStoredCall(e,d):isRunning?(liveEventView?.lines[liveEventView.index]||`BUILD-UP\nGavin Potts — The ${discLabel(d)} field is almost ready.`):live?`BUILD-UP\nGavin Potts — The ${discLabel(d)} field is ready.`:`PREVIEW\nGavin Potts — The ${discLabel(d)} is scheduled for Week ${e.week}.`;
 $('competition').innerHTML=`<div class="matchday-shell fm2d-matchday refined-matchday"><header class="matchday-scorebar"><div class="matchday-scorebar-left"><button id="eventOverview" class="matchday-back" aria-label="Back to Event Day">‹</button><div class="matchday-event-id"><small>${e.level} • ${e.kind.toUpperCase()}</small><strong>${esc(e.name)}</strong><span>${esc(e.location)} • Week ${e.week}</span></div></div><div class="matchday-centre"><div class="matchday-live-row">${isRunning?'<i class="matchday-live-dot"></i>':''}<small>${statusLabel} • 2D LIVE</small></div><h1>${discLabel(d)}</h1></div><div class="matchday-scorebar-right"><div class="matchday-stat"><small>Meeting</small><strong>${completedCount}/${discs.length}</strong></div><button id="startDisciplineTop" class="btn ${results?'good':'primary'} matchday-start" ${results||!live||disciplineRunning?'disabled':''}>${results?'COMPLETE':disciplineRunning?'IN PROGRESS':'START EVENT'}</button></div></header><div class="matchday-body"><section class="matchday-card fm2d-card refined-card"><div class="matchday-ribbon"><div><strong>${esc(e.location)} • ${discLabel(d)}</strong><span> • ${esc(format.format||format.label)}</span></div><span class="matchday-state">${statusLabel}</span></div><div class="fm-live-split refined-live-split"><div class="fm-live-left"><div class="matchday-arena"><div id="liveEventVisual">${refinedVisualHTML(e,d)}</div></div><div class="matchday-commentary fm2d-commentary refined-commentary"><div class="matchday-commentator"><div class="matchday-gp">GP</div><div><small>Live commentary</small><strong>Gavin Potts</strong></div></div><div id="commentary" class="matchday-call" role="region" aria-label="Event commentary">${matchdayCommentaryHTML(rawCall)}</div></div></div><aside id="liveScoreboard" class="fm-scoreboard refined-scoreboard" aria-label="Live scoreboard">${refinedScoreboardHTML(e,d)}</aside></div><footer class="matchday-dashboard fm2d-dashboard"><div class="matchday-dash-cell"><span class="matchday-dash-label">${esc(mn)} in this event</span><div class="matchday-athletes">${athleteChips(chosen,mn)}</div></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Competition format</span><strong class="matchday-dash-main">${esc(format.format||format.label)}</strong><span class="matchday-dash-sub">${e.ranked?'Ranking points available':'No ranking points'} • ${results?'Result confirmed':live?'Event ready':'Week '+e.week}</span></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Controls</span><div class="matchday-controls"><button id="startDiscipline" class="btn ${results?'good':'primary'}" ${results||!live||disciplineRunning?'disabled':''}>${results?'COMPLETE':disciplineRunning?'IN PROGRESS':'START'}</button><button id="backEvent" class="btn ghost">EVENT DAY</button></div></div></footer></section></div></div>`;
 const back=()=>{competitionMode='overview';drawCompetition()};$('eventOverview').onclick=back;$('backEvent').onclick=back;if($('startDiscipline'))$('startDiscipline').onclick=()=>startDiscipline(e,d);if($('startDisciplineTop'))$('startDisciplineTop').onclick=()=>startDiscipline(e,d)
};

startDiscipline=function(e,d){
 if(!e||e.completed||disciplineRunning)return;if(e.week!==s.game.week){toast('This event is not live yet');return}e.results??={};if(Array.isArray(e.results[d])){activeEventDisc=d;competitionMode='discipline';drawCompetition();return}
 const career=s,r=simulateDiscipline(e,d),lines=commentaryLines(d,r,e);disciplineRunning=true;activeEventDisc=d;competitionMode='discipline';liveEventView={event:e,disc:d,results:r,lines,index:-1};e.commentary??={};e.commentary[d]=lines;drawCompetition();let j=0;
 function step(){if(s!==career)return;if(j<lines.length){liveEventView.index=j;const visible=currentView==='competition'&&competitionMode==='discipline'&&activeEventDisc===d,comm=visible?$('commentary'):null;if(comm)renderMatchdayCommentary(comm,lines[j]);if(visible)updateLivePanels(e,d);j++;timers.push(setTimeout(step,commentaryDelay(lines[j-1])));return}commitDisciplineResults(e,d,r);save();disciplineRunning=false;liveEventView=null;const ds=e.disc.filter(x=>x!=='ALL');activeEventDisc=d;competitionMode='discipline';if(ds.every(x=>Array.isArray(e.results[x])))finaliseEvent(e,false);else{drawCompetition();toast(discLabel(d)+' complete — scoreboard confirmed')}}step()
};

/* Summit uses the same exact renderer and scoreboard. */
drawSummitDisciplineLive=function(m){
 const d=activeEventDisc||Object.keys(DISCIPLINES)[0],rows=m.results[d]||null,running=disciplineRunning&&!rows,proxy=summitProxy(m),own=summitEntriesForDisc(m,d),format=proxy.engine?.[d]||athleticsFormat(proxy,d),status=rows?'OFFICIAL':running?'LIVE':'READY',rawCall=rows?matchdayStoredCall(proxy,d):running?(liveEventView?.lines[liveEventView.index]||`BUILD-UP\nGavin Potts — ${discLabel(d)} is getting ready.`):`BUILD-UP\nGavin Potts — The Summit ${discLabel(d)} is ready.`;
 $('pageKicker').textContent='SUMMIT SERIES';$('pageTitle').textContent='Series '+m.number+' • '+discLabel(d);
 $('competition').innerHTML=`<div class="matchday-shell fm2d-matchday refined-matchday fm2d-summit"><header class="matchday-scorebar"><div class="matchday-scorebar-left"><button id="backSummitProgrammeTop" class="matchday-back">‹</button><div class="matchday-event-id"><small>SUMMIT SERIES • ROUND ${m.number}/6</small><strong>${esc(m.location)}</strong><span>Full-Series roster</span></div></div><div class="matchday-centre"><div class="matchday-live-row">${running?'<i class="matchday-live-dot"></i>':''}<small>${status} • 2D LIVE</small></div><h1>${discLabel(d)}</h1></div><div class="matchday-scorebar-right"><button id="startSummitDiscTop" class="btn ${rows?'good':'primary'} matchday-start" ${rows||disciplineRunning?'disabled':''}>${rows?'COMPLETE':running?'IN PROGRESS':'START EVENT'}</button></div></header><div class="matchday-body"><section class="matchday-card fm2d-card refined-card"><div class="matchday-ribbon"><div><strong>SUMMIT ${m.number} • ${esc(m.location)}</strong><span> • ${esc(format.format||format.label)}</span></div><span class="matchday-state">${status}</span></div><div class="fm-live-split refined-live-split"><div class="fm-live-left"><div class="matchday-arena"><div id="liveEventVisual">${refinedVisualHTML(proxy,d)}</div></div><div class="matchday-commentary fm2d-commentary refined-commentary"><div class="matchday-commentator"><div class="matchday-gp">GP</div><div><small>Live commentary</small><strong>Gavin Potts</strong></div></div><div id="commentary" class="matchday-call">${matchdayCommentaryHTML(rawCall)}</div></div></div><aside id="liveScoreboard" class="fm-scoreboard refined-scoreboard">${refinedScoreboardHTML(proxy,d)}</aside></div><footer class="matchday-dashboard fm2d-dashboard"><div class="matchday-dash-cell"><span class="matchday-dash-label">${esc(nationName(managedNation()))} entries</span><div class="matchday-athletes">${athleteChips(own,nationName(managedNation()))}</div></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Summit format</span><strong class="matchday-dash-main">${esc(format.format||format.label)}</strong><span class="matchday-dash-sub">Series points only • Round ${m.number}/6</span></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Controls</span><div class="matchday-controls"><button id="startSummitDisc" class="btn ${rows?'good':'primary'}" ${rows||disciplineRunning?'disabled':''}>${rows?'COMPLETE':running?'IN PROGRESS':'START'}</button><button id="backSummitProgramme" class="btn ghost">PROGRAMME</button></div></div></footer></section></div></div>`;
 const back=()=>{competitionMode='overview';drawCompetition()};$('backSummitProgrammeTop').onclick=back;$('backSummitProgramme').onclick=back;if($('startSummitDisc'))$('startSummitDisc').onclick=()=>startSummitDiscipline(m,d);if($('startSummitDiscTop'))$('startSummitDiscTop').onclick=()=>startSummitDiscipline(m,d)
};
startSummitDiscipline=function(m,d){
 if(!m||m.completed||disciplineRunning||m.week!==s.game.week||Array.isArray(m.results[d]))return;const career=s,rows=summitRows(m,d),proxy=summitProxy(m),lines=commentaryLines(d,rows,proxy);disciplineRunning=true;m.eventDayMode='watch';m.commentary??={};m.commentary[d]=lines;liveEventView={event:proxy,disc:d,results:rows,lines,index:-1};drawCompetition();let i=0;
 function step(){if(s!==career)return;if(i<lines.length){liveEventView.index=i;const comm=$('commentary');if(comm)renderMatchdayCommentary(comm,lines[i]);updateLivePanels(proxy,d);i++;timers.push(setTimeout(step,commentaryDelay(lines[i-1])));return}commitSummitRows(m,d,rows);disciplineRunning=false;liveEventView=null;if(Object.keys(DISCIPLINES).every(x=>Array.isArray(m.results[x])))finishSummitMeeting(m);save();if(m.completed){competitionMode='overview';render()}else drawCompetition()}step()
};

/* Leave the public visual hook pointing at the refined renderer too. */
eventVisualHTML=refinedVisualHTML;

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='2D Broadcast Refinement')){
 UPDATES.unshift({date:'9 September 2026',title:'2D Broadcast Refinement',items:[
  'Rebuilt the 2D Event Day presentation around one authoritative live snapshot, so athlete dots and the scoreboard now use exactly the same race position data at every commentary checkpoint.',
  'Sprint tracks now use proper lane geometry: 100m has accurate distance markers, while 200m and 400m use real stagger logic derived from each lane path and a common finish line. Heats and finals also display the correct active field instead of always showing the eventual final.',
  'Shot Put landing points are now scaled directly from the announced mark inside a correctly angled sector, with measurement arcs, exact distance labels and live attempt series on the scoreboard.',
  'High Jump visuals now follow the exact bar height and current outcome from Gavin Potts’ call. The scoreboard completes known results from previous heights without revealing future attempts, while keeping the highlights-only broadcast pace.',
  'Completed events now freeze in a result-accurate state instead of reverting athletes to their starting positions, and the live screen has been tightened for a cleaner Football Manager-style one-screen view.'
 ]});
}
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End 2D Broadcast Refinement ===== */
