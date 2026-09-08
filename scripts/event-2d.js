/* ===== Football Manager-style 2D live event viewer ===== */
(function(){
'use strict';

function fmRows(e,d){
  const active=liveEventView?.event===e&&liveEventView?.disc===d?liveEventView:null;
  let rows=active?.results||e?.results?.[d]||null;
  if(!Array.isArray(rows)){
    if(String(e?.id||'').startsWith('summit-live-')&&typeof summitSeasonState==='function'&&typeof summitField==='function'){
      const m=summitSeasonState().meetings?.[e.number];
      if(m)rows=summitField(m,d).map(a=>({id:a.id,name:a.name,nation:a.nation,lane:a.lane}));
    }
    if(!Array.isArray(rows))rows=buildEventField(e,d).map(a=>({id:a.id,name:a.name,nation:a.nation,lane:a.lane}));
  }
  const meta=e?.engine?.[d];
  if(meta?.family==='sprint'){
    const finalStage=meta.stages?.find(x=>x.name==='Final'),ids=new Set((finalStage?.rows||[]).map(x=>x.id));
    if(ids.size)rows=rows.filter(x=>ids.has(x.id));
  }
  return rows||[];
}
function fmLine(e,d){const active=liveEventView?.event===e&&liveEventView?.disc===d?liveEventView:null;return active?.lines?.[active.index]||''}
function fmCue(e,d){const line=fmLine(e,d);return line&&e?.engine?.[d]?.broadcastCues?.[line]||null}
function fmPhase(e,d){
  if(DISCIPLINES[d].type!=='time')return fieldVisualPhase(fmLine(e,d),DISCIPLINES[d].type);
  const line=fmLine(e,d),h=String(line||'').split('\n')[0],distance=DISCIPLINES[d]?.distance||100;
  if(/^(RESULT|PERFORMANCE WATCH|YOUR TEAM|YOUR SQUAD)/.test(h))return {progress:1,finished:true,label:'Official result',stage:'result',metres:distance};
  const m=h.match(/(\d+) METRES/);if(m){const metres=Math.min(distance,Number(m[1]));return {progress:clamp(metres/distance,0,1),finished:metres>=distance,label:h,stage:metres>=distance?'finish':'race',metres}}
  if(h.startsWith('SET'))return {progress:.025,finished:false,label:'The gun',stage:'gun',metres:0};
  if(h.startsWith('ON YOUR MARKS'))return {progress:.004,finished:false,label:'On your marks',stage:'blocks',metres:0};
  return {progress:0,finished:false,label:h||'Waiting for the start',stage:'build',metres:0}
}
function fmManaged(row){return row?.nation===managedNation()}
function fmEsc(v){return profileEscape(String(v??''))}
function fmDot(row,r=10){const c=nationDotColour(row?.nation);return `<circle r="${r}" fill="${c}" stroke="${fmManaged(row)?'#fff':'#07131d'}" stroke-width="${fmManaged(row)?4:2}"><title>${fmEsc(row?.name)} • ${fmEsc(nationName(row?.nation))}</title></circle>`}
function fmRaceProgress(row,rows,phase){
  const valid=rows.filter(x=>Number.isFinite(Number(x.perf))),best=valid.length?Math.min(...valid.map(x=>Number(x.perf))):10;
  const perf=Number.isFinite(Number(row.perf))?Number(row.perf):best+.15;
  const penalty=Math.max(0,perf-best)*.07;
  if(phase.finished)return Math.max(.88,1-Math.max(0,perf-best)*.055);
  return clamp((phase.progress||0)*(1-penalty),0,1);
}
function fmOvalPoint(distance,lane,p){
  const cx=380,cy=235,rx=286-lane*9,ry=166-lane*7,start=distance===200?Math.PI:0,span=distance===200?Math.PI:Math.PI*2,angle=start+span*clamp(p,0,1);
  return {x:cx+Math.cos(angle)*rx,y:cy+Math.sin(angle)*ry}
}
function fmTrackScene(e,d,rows){
  const phase=fmPhase(e,d),distance=DISCIPLINES[d]?.distance||100,ordered=[...rows].sort((a,b)=>(a.lane||99)-(b.lane||99)||String(a.name).localeCompare(String(b.name)));
  const W=760,H=470;
  if(distance===100){
    const left=62,right=704,top=48,laneH=Math.min(46,(H-96)/Math.max(1,ordered.length));
    const lanes=ordered.map((r,i)=>{const y=top+i*laneH+laneH/2,p=fmRaceProgress(r,rows,phase),x=left+p*(right-left);return `<g><line x1="${left}" y1="${y+laneH/2}" x2="${right+20}" y2="${y+laneH/2}" stroke="#f4eadf" stroke-opacity=".3" stroke-width="1.5"/><text x="${left-28}" y="${y+4}" fill="#d9e4e9" font-size="11" text-anchor="middle">${r.lane||i+1}</text><g transform="translate(${x} ${y})" class="fm-runner-dot">${fmDot(r,10)}</g></g>`}).join('');
    return `<div class="fm2d-arena"><div class="fm2d-arena-head"><span>${fmEsc(phase.label||'Race')}</span><b>${phase.finished?'FINISH':Math.round((phase.progress||0)*distance)+'m'}</b></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Top-down ${fmEsc(discLabel(d))} race"><rect width="${W}" height="${H}" fill="#173f31"/><rect x="36" y="24" width="700" height="${H-48}" rx="18" fill="#884d52" stroke="#a96c70" stroke-width="2"/><line x1="${left}" y1="24" x2="${left}" y2="${H-24}" stroke="#f5f0e9" stroke-width="3"/><line x1="${right}" y1="24" x2="${right}" y2="${H-24}" stroke="#fff" stroke-width="5"/>${lanes}<text x="${left}" y="18" fill="#c8d6dc" font-size="10" text-anchor="middle">START</text><text x="${right}" y="18" fill="#c8d6dc" font-size="10" text-anchor="middle">FINISH</text></svg><div class="fm2d-caption">Simple 2D view • dots represent athletes • white ring = ${fmEsc(nationName(managedNation()))}</div></div>`;
  }
  const laneCount=Math.max(8,ordered.length),laneLines=Array.from({length:laneCount},(_,i)=>{const rx=286-i*9,ry=166-i*7;return `<ellipse cx="380" cy="235" rx="${rx}" ry="${ry}" fill="none" stroke="#f7eee4" stroke-opacity="${i===0?.55:.27}" stroke-width="${i===0?2.5:1.4}"/>`}).join('');
  const dots=ordered.map((r,i)=>{const lane=Math.max(0,(r.lane||i+1)-1),p=fmRaceProgress(r,rows,phase),pt=fmOvalPoint(distance,lane,p);return `<g transform="translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})" class="fm-runner-dot">${fmDot(r,10)}<text x="0" y="-15" text-anchor="middle" fill="#eaf3f6" font-size="9" font-weight="800">${r.lane||i+1}</text></g>`}).join('');
  const startAngle=distance===200?Math.PI:0,start={x:380+Math.cos(startAngle)*286,y:235+Math.sin(startAngle)*166},finish={x:666,y:235};
  return `<div class="fm2d-arena"><div class="fm2d-arena-head"><span>${fmEsc(phase.label||'Race')}</span><b>${phase.finished?'FINISH':Math.round((phase.progress||0)*distance)+'m / '+distance+'m'}</b></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Top-down ${fmEsc(discLabel(d))} oval race"><rect width="760" height="470" fill="#1a553d"/><ellipse cx="380" cy="235" rx="320" ry="198" fill="#864d52" stroke="#a86e72" stroke-width="2"/><ellipse cx="380" cy="235" rx="205" ry="103" fill="#246146"/>${laneLines}<line x1="${finish.x}" y1="64" x2="${finish.x}" y2="406" stroke="#fff" stroke-width="4"/><line x1="${start.x}" y1="${start.y-46}" x2="${start.x}" y2="${start.y+46}" stroke="#f5eee7" stroke-opacity=".8" stroke-width="3"/>${dots}<text x="380" y="230" text-anchor="middle" fill="#d8e7df" font-size="15" font-weight="900">${distance}m</text><text x="380" y="250" text-anchor="middle" fill="#91b3a2" font-size="10">STAGGERED LANES</text><text x="${finish.x+8}" y="58" fill="#d7e4e9" font-size="10">FINISH</text></svg><div class="fm2d-caption">Top-down oval • staggered lane race • dots represent athletes • white ring = ${fmEsc(nationName(managedNation()))}</div></div>`;
}
function fmShotState(e,d,rows){
  const active=liveEventView?.event===e&&liveEventView?.disc===d?liveEventView:null,meta=e?.engine?.[d],states=new Map(rows.map(r=>[r.id,{row:r,best:null,attempts:0,fouls:0,current:false}]));
  if(!active)return states;
  for(const line of active.lines.slice(0,active.index+1)){
    const cue=meta?.broadcastCues?.[line];if(cue?.family!=='throws')continue;
    const st=states.get(cue.athleteId);if(!st)continue;st.attempts=Math.max(st.attempts,cue.attempt||0);st.current=false;
    if(Number.isFinite(cue.mark))st.best=Math.max(st.best||0,cue.mark);else st.fouls++;
  }
  const current=fmCue(e,d);if(current?.family==='throws'&&states.get(current.athleteId))states.get(current.athleteId).current=true;
  return states;
}
function fmShotScene(e,d,rows){
  const cue=fmCue(e,d),current=rows.find(r=>r.id===cue?.athleteId)||rows.find(fmManaged)||rows[0],mark=Number.isFinite(cue?.mark)?cue.mark:null,max=25,ratio=mark!==null?clamp(mark/max,.04,1):.08;
  const x0=145,y0=270,x1=690,y1=270,shotX=x0+(x1-x0)*ratio,shotY=y0-(ratio*92)+(Math.sin(ratio*Math.PI)*-55);
  const ticks=[5,10,15,20,25].map(m=>{const x=x0+(x1-x0)*(m/max);return `<line x1="${x}" y1="118" x2="${x}" y2="405" stroke="#d7e9db" stroke-opacity=".16" stroke-dasharray="5 8"/><text x="${x}" y="426" text-anchor="middle" fill="#a8c1b0" font-size="10">${m}m</text>`}).join('');
  return `<div class="fm2d-arena"><div class="fm2d-arena-head"><span>${cue?`Throw ${cue.attempt} • ${fmEsc(current?.name)}`:'Shot Put • ready'}</span><b>${cue?(mark!==null?mark.toFixed(2)+'m':'FOUL'):'—'}</b></div><svg viewBox="0 0 760 455" role="img" aria-label="Top-down shot put"><rect width="760" height="455" fill="#1f5a3e"/><path d="M150 270 L720 72 L720 432 Z" fill="#2d7451" stroke="#e7f1e8" stroke-opacity=".55" stroke-width="2"/>${ticks}<circle cx="${x0}" cy="${y0}" r="55" fill="#a6adaa" stroke="#f0f4f1" stroke-width="4"/><line x1="${x0-55}" y1="${y0}" x2="${x0+55}" y2="${y0}" stroke="#fff" stroke-width="3"/>${current?`<g transform="translate(${x0} ${y0})">${fmDot(current,12)}</g>`:''}${cue&&mark!==null?`<path d="M${x0+18} ${y0-8} Q${(x0+shotX)/2} 86 ${shotX} ${shotY}" fill="none" stroke="#e7f0ec" stroke-opacity=".38" stroke-width="2" stroke-dasharray="6 7"/><circle cx="${shotX}" cy="${shotY}" r="7" fill="#d9d9d4" stroke="#313b35" stroke-width="2"/>`:''}${cue?.foul?`<g transform="translate(500 120)"><circle r="34" fill="#401a20" stroke="#ff9da8"/><text text-anchor="middle" y="7" fill="#ffd8dd" font-size="25" font-weight="900">×</text></g>`:''}</svg><div class="fm2d-caption">Top-down throwing sector • current athlete shown in the circle</div></div>`;
}
function fmHighJumpScene(e,d,rows){
  const cue=fmCue(e,d),current=rows.find(r=>r.id===cue?.athleteId)||rows.find(fmManaged)||rows[0],height=cue?.height||e?.engine?.[d]?.openingHeight||null;
  let x=155,y=325;if(cue){if(cue.outcome==='-'){x=145;y=330}else if(cue.outcome==='O'){x=565;y=210}else{x=520;y=245}}
  const label=cue?(cue.outcome==='O'?'CLEAR':cue.outcome==='X'?'MISS':'PASS'):'READY';
  return `<div class="fm2d-arena"><div class="fm2d-arena-head"><span>${height?fmtPerf(d,height):'High Jump'} • ${fmEsc(current?.name||'Field')}</span><b>${label}</b></div><svg viewBox="0 0 760 455" role="img" aria-label="Top-down high jump"><rect width="760" height="455" fill="#205940"/><path d="M80 362 C255 370 380 332 500 225" fill="none" stroke="#a55e55" stroke-width="78"/><path d="M80 362 C255 370 380 332 500 225" fill="none" stroke="#f0d9d4" stroke-opacity=".4" stroke-width="2" stroke-dasharray="9 9"/><rect x="550" y="128" width="150" height="188" rx="12" fill="#3b75b8" stroke="#a9d5ff" stroke-width="3"/><line x1="532" y1="102" x2="532" y2="330" stroke="#e6eef4" stroke-width="4"/><line x1="708" y1="102" x2="708" y2="330" stroke="#e6eef4" stroke-width="4"/><line x1="532" y1="206" x2="708" y2="206" stroke="#f5df83" stroke-width="4"/>${current?`<g transform="translate(${x} ${y})">${fmDot(current,13)}</g>`:''}${cue?.outcome==='X'?`<line x1="532" y1="206" x2="708" y2="222" stroke="#ffacb5" stroke-width="5"/>`:''}<text x="620" y="350" text-anchor="middle" fill="#b8d0dc" font-size="11">LANDING MAT</text></svg><div class="fm2d-caption">High Jump highlights only • key clearances, misses and eliminations</div></div>`;
}

eventVisualHTML=function(e,d){
  const rows=fmRows(e,d);if(!rows.length)return '<div class="fm2d-empty">No starters for this discipline.</div>';
  if(DISCIPLINES[d].type==='time')return fmTrackScene(e,d,rows);
  if(DISCIPLINES[d].type==='height')return fmHighJumpScene(e,d,rows);
  return fmShotScene(e,d,rows);
};

function fmOfficialBoard(e,d,rows){return rows.map((r,i)=>`<div class="fm-board-row ${fmManaged(r)?'managed':''}"><b class="fm-pos">${i+1}</b><i class="fm-board-dot" style="background:${nationDotColour(r.nation)}"></i><div class="fm-board-name"><strong>${fmEsc(r.name)}</strong><small>${flag(r.nation)} ${fmEsc(nationName(r.nation))}</small></div><span class="fm-board-value">${fmtPerf(d,r.perf)}</span></div>`).join('')}
function fmSprintBoard(e,d,rows){
  const phase=fmPhase(e,d),ranked=[...rows].map(r=>({r,p:fmRaceProgress(r,rows,phase)})).sort((a,b)=>b.p-a.p||Number(a.r.perf||99)-Number(b.r.perf||99));
  const distance=DISCIPLINES[d]?.distance||100;return ranked.map((x,i)=>`<div class="fm-board-row ${fmManaged(x.r)?'managed':''}"><b class="fm-pos">${i+1}</b><i class="fm-board-dot" style="background:${nationDotColour(x.r.nation)}"></i><div class="fm-board-name"><strong>${fmEsc(x.r.name)}</strong><small>Lane ${x.r.lane||rows.indexOf(x.r)+1} • ${flag(x.r.nation)} ${fmEsc(nationName(x.r.nation))}</small></div><span class="fm-board-value">${phase.finished&&Number.isFinite(Number(x.r.perf))?fmtPerf(d,x.r.perf):Math.round(x.p*distance)+'m'}</span></div>`).join('')
}
function fmThrowBoard(e,d,rows){
  const states=fmShotState(e,d,rows),arr=[...states.values()].sort((a,b)=>(b.best||-1)-(a.best||-1)||String(a.row.name).localeCompare(String(b.row.name)));
  return arr.map((st,i)=>`<div class="fm-board-row ${fmManaged(st.row)?'managed':''} ${st.current?'current':''}"><b class="fm-pos">${st.best!==null?i+1:'—'}</b><i class="fm-board-dot" style="background:${nationDotColour(st.row.nation)}"></i><div class="fm-board-name"><strong>${fmEsc(st.row.name)}</strong><small>${st.current?'CURRENT THROW • ':''}${st.attempts?`Attempt ${st.attempts}`:'Waiting'}${st.fouls?` • ${st.fouls} foul${st.fouls===1?'':'s'}`:''}</small></div><span class="fm-board-value">${st.best!==null?fmtPerf(d,st.best):'—'}</span></div>`).join('')
}
function fmHeightState(e,d,rows){
  const active=liveEventView?.event===e&&liveEventView?.disc===d?liveEventView:null,meta=e?.engine?.[d],states=new Map(rows.map(r=>[r.id,{row:r,best:null,last:'Waiting',out:false,current:false}]));
  if(!active)return states;
  for(const line of active.lines.slice(0,active.index+1)){
    const cue=meta?.broadcastCues?.[line];if(cue?.family!=='height')continue;const st=states.get(cue.athleteId);if(!st)continue;
    if(cue.outcome==='O'){st.best=Math.max(st.best||0,cue.height);st.last=`${fmtPerf(d,cue.height)} • O`}
    else if(cue.outcome==='X'){st.last=`${fmtPerf(d,cue.height)} • X${cue.attempt||''}`;if((cue.attempt||0)>=3)st.out=true}
    else st.last=`${fmtPerf(d,cue.height)} • PASS`;
  }
  const current=fmCue(e,d);if(current?.family==='height'&&states.get(current.athleteId))states.get(current.athleteId).current=true;
  return states;
}
function fmHeightBoard(e,d,rows){
  const states=fmHeightState(e,d,rows),arr=[...states.values()].sort((a,b)=>Number(a.out)-Number(b.out)||(b.best||-1)-(a.best||-1)||String(a.row.name).localeCompare(String(b.row.name)));
  return arr.map((st,i)=>`<div class="fm-board-row ${fmManaged(st.row)?'managed':''} ${st.current?'current':''} ${st.out?'out':''}"><b class="fm-pos">${st.best!==null?i+1:'—'}</b><i class="fm-board-dot" style="background:${nationDotColour(st.row.nation)}"></i><div class="fm-board-name"><strong>${fmEsc(st.row.name)}</strong><small>${st.current?'AT THE BAR • ':''}${st.out?'OUT • ':''}${fmEsc(st.last)}</small></div><span class="fm-board-value">${st.best!==null?fmtPerf(d,st.best):'—'}</span></div>`).join('')
}
function eventScoreboardHTML(e,d){
  const active=liveEventView?.event===e&&liveEventView?.disc===d,done=Array.isArray(e?.results?.[d])&&!active,rows=fmRows(e,d),line=fmLine(e,d),parts=matchdayCommentaryParts(line),type=DISCIPLINES[d].type;
  let body;if(!rows.length)body='<div class="fm-board-empty">No starters.</div>';else if(done)body=fmOfficialBoard(e,d,rows);else if(type==='time')body=fmSprintBoard(e,d,rows);else if(type==='height')body=fmHeightBoard(e,d,rows);else body=fmThrowBoard(e,d,rows);
  const subtitle=done?'OFFICIAL RESULT':active?fmEsc(parts.kicker||'LIVE'):'START LIST';
  const note=done?'Result confirmed':type==='time'?'Live order is unofficial until the finish':type==='height'?'Scoreboard updates with the broadcast highlights':'Best valid mark shown after each throw';
  return `<div class="fm-scoreboard-inner"><header class="fm-scoreboard-head"><div><small>${subtitle}</small><strong>${fmEsc(discLabel(d))} Scoreboard</strong></div><span>${rows.length} athlete${rows.length===1?'':'s'}</span></header><div class="fm-board-columns"><span>POS</span><span>ATHLETE</span><span>${type==='time'?'LIVE':type==='height'?'BEST':'BEST'}</span></div><div class="fm-board-list">${body}</div><footer class="fm-scoreboard-foot">${fmEsc(note)}</footer></div>`;
}
function fmUpdateLivePanels(e,d){
  const arena=$('liveEventVisual'),board=$('liveScoreboard');if(arena)arena.innerHTML=eventVisualHTML(e,d);if(board)board.innerHTML=eventScoreboardHTML(e,d)
}

/* High jump is intentionally highlights-led, not every attempt. */
buildHighJumpAttemptCommentary=function(d,rows,e,baseLines){
 const meta=e?.engine?.[d];if(!meta||meta.family!=='height'||!rows.some(r=>Array.isArray(r.hjAttempts)))return baseLines;
 meta.broadcastCues={};
 const remove=['AT THE APRON','THE APPROACH','AT THE BAR','PRESSURE BUILDING','THE FINAL MARKS'];
 const clean=baseLines.filter(line=>!remove.some(h=>String(line).startsWith(h))&&!String(line).startsWith('RESULT •')&&!String(line).startsWith('PERFORMANCE WATCH')&&!String(line).startsWith('YOUR TEAM'));
 const resultLines=baseLines.filter(line=>String(line).startsWith('RESULT •')||String(line).startsWith('PERFORMANCE WATCH')||String(line).startsWith('YOUR TEAM'));
 const sorted=[...rows].sort((a,b)=>Number(b.perf||0)-Number(a.perf||0)),managed=new Set(e.entries?.[d]||[]),focus=new Set(sorted.slice(0,3).map(r=>r.id));managed.forEach(id=>focus.add(id));
 const heights=[...new Set(rows.flatMap(r=>(r.hjAttempts||[]).map(a=>a.height)))].sort((a,b)=>a-b),lateHeights=new Set(heights.slice(-3)),sequence=[];
 for(const height of heights){
   const pack=rows.map(r=>({row:r,h:(r.hjAttempts||[]).find(x=>Number(x.height)===Number(height))})).filter(x=>x.h),featured=pack.some(x=>focus.has(x.row.id)||lateHeights.has(height));if(!featured)continue;
   sequence.push(`BAR TO ${fmtPerf(d,height)}\nGavin Potts — The bar moves to ${fmtPerf(d,height)}. We stay with the important moments rather than every jump.`);
   for(const {row,h} of pack.sort((a,b)=>String(a.row.name).localeCompare(String(b.row.name)))){
     const marks=h.marks||[],focusAth=focus.has(row.id),passed=marks[0]==='-',late=lateHeights.has(height),clearIndex=marks.findIndex(m=>m==='O'),fails=marks.filter(m=>m==='X').length,failedOut=clearIndex===-1&&fails>=3;
     if(passed){if(focusAth&&late){const line=attemptCallLine(`PASS • ${fmtPerf(d,height)}`,row.name,`${row.name} passes and waits for the bar to move.`);sequence.push(line);meta.broadcastCues[line]={family:'height',athleteId:row.id,height,outcome:'-',attempt:0}}continue}
     if(clearIndex>=0&& (late||focusAth)){const attempt=clearIndex+1,line=attemptCallLine(`${fmtPerf(d,height)} • HIGHLIGHT`,row.name,attempt===1?`${row.name} clears cleanly at ${fmtPerf(d,height)}.`:`${row.name} gets over at attempt ${attempt}. Countback could matter.`);sequence.push(line);meta.broadcastCues[line]={family:'height',athleteId:row.id,height,outcome:'O',attempt};continue}
     if(failedOut&&(late||focusAth)){const line=attemptCallLine(`${fmtPerf(d,height)} • OUT`,row.name,`${row.name} cannot clear ${fmtPerf(d,height)} and is out of the competition.`);sequence.push(line);meta.broadcastCues[line]={family:'height',athleteId:row.id,height,outcome:'X',attempt:3}}
   }
 }
 if(meta.jumpOff){const w=rows.find(r=>r.id===meta.jumpOff.winner);sequence.push(`JUMP-OFF • ${fmtPerf(d,meta.jumpOff.height)}\nGavin Potts — Countback cannot separate the leaders, so we go to a jump-off. ${w?.name||'The winner'} takes it.`)}
 return [...clean,...sequence,...resultLines]
};
const _fm2dDelay=commentaryDelay;
commentaryDelay=function(line){const t=String(line||'');if(/HIGHLIGHT|• OUT|^BAR TO/.test(t))return clamp(1250+t.split(/\s+/).length*38,1450,2200);return _fm2dDelay(line)};

function fmAthleteChips(chosen,mn){return chosen.length?chosen.map(a=>`<div class="matchday-athlete-chip"><div><span>${athleteLink(a)}</span><small>PB ${fmtPerf(a.disc,a.pb)} • ${health(a)[0]}</small></div></div>`).join(''):`<span class="matchday-dash-sub">No ${fmEsc(mn)} athlete entered.</span>`}

drawDisciplineScreen=function(e,live,discs){
 const d=activeEventDisc,chosen=(e.entries[d]||[]).map(id=>s.athletes.find(a=>a.id===id)).filter(Boolean),results=e.results[d]||null,mn=nationName(managedNation()),isRunning=disciplineRunning&&!results,format=e.engine?.[d]||athleticsFormat(e,d),completedCount=discs.filter(x=>Array.isArray(e.results[x])).length,statusLabel=results?'OFFICIAL':isRunning?'LIVE':live?'READY':'PREVIEW';
 const rawCall=results?matchdayStoredCall(e,d):isRunning?(liveEventView?.lines[liveEventView.index]||`BUILD-UP\nGavin Potts — The ${discLabel(d)} field is almost ready.`):live?`BUILD-UP\nGavin Potts — The ${discLabel(d)} field is ready.`:`PREVIEW\nGavin Potts — The ${discLabel(d)} is scheduled for Week ${e.week}.`;
 $('competition').innerHTML=`<div class="matchday-shell fm2d-matchday"><header class="matchday-scorebar"><div class="matchday-scorebar-left"><button id="eventOverview" class="matchday-back" aria-label="Back to Event Day">‹</button><div class="matchday-event-id"><small>${e.level} • ${e.kind.toUpperCase()}</small><strong>${fmEsc(e.name)}</strong><span>${fmEsc(e.location)} • Week ${e.week}</span></div></div><div class="matchday-centre"><div class="matchday-live-row">${isRunning?'<i class="matchday-live-dot"></i>':''}<small>${statusLabel} • 2D LIVE</small></div><h1>${discLabel(d)}</h1></div><div class="matchday-scorebar-right"><div class="matchday-stat"><small>Meeting</small><strong>${completedCount}/${discs.length}</strong></div><button id="startDisciplineTop" class="btn ${results?'good':'primary'} matchday-start" ${results||!live||disciplineRunning?'disabled':''}>${results?'COMPLETE':disciplineRunning?'IN PROGRESS':'START EVENT'}</button></div></header><div class="matchday-body"><section class="matchday-card fm2d-card"><div class="matchday-ribbon"><div><strong>${fmEsc(e.location)} • ${discLabel(d)}</strong><span> • ${fmEsc(format.format||format.label)}</span></div><span class="matchday-state">${statusLabel}</span></div><div class="fm-live-split"><div class="fm-live-left"><div class="matchday-arena"><div id="liveEventVisual">${eventVisualHTML(e,d)}</div></div><div class="matchday-commentary fm2d-commentary"><div class="matchday-commentator"><div class="matchday-gp">GP</div><div><small>Live commentary</small><strong>Gavin Potts</strong></div></div><div id="commentary" class="matchday-call" role="region" aria-label="Event commentary">${matchdayCommentaryHTML(rawCall)}</div></div></div><aside id="liveScoreboard" class="fm-scoreboard" aria-label="Live scoreboard">${eventScoreboardHTML(e,d)}</aside></div><footer class="matchday-dashboard fm2d-dashboard"><div class="matchday-dash-cell"><span class="matchday-dash-label">${fmEsc(mn)} in this event</span><div class="matchday-athletes">${fmAthleteChips(chosen,mn)}</div></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Competition format</span><strong class="matchday-dash-main">${fmEsc(format.format||format.label)}</strong><span class="matchday-dash-sub">${e.ranked?'Ranking points available':'No ranking points'} • ${results?'Result confirmed':live?'Event ready':'Week '+e.week}</span></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Controls</span><div class="matchday-controls"><button id="startDiscipline" class="btn ${results?'good':'primary'}" ${results||!live||disciplineRunning?'disabled':''}>${results?'COMPLETE':disciplineRunning?'IN PROGRESS':'START'}</button><button id="backEvent" class="btn ghost">EVENT DAY</button></div></div></footer></section></div></div>`;
 const back=()=>{competitionMode='overview';drawCompetition()};$('eventOverview').onclick=back;$('backEvent').onclick=back;if($('startDiscipline'))$('startDiscipline').onclick=()=>startDiscipline(e,d);if($('startDisciplineTop'))$('startDisciplineTop').onclick=()=>startDiscipline(e,d)
};

startDiscipline=function(e,d){
 if(!e||e.completed||disciplineRunning)return;if(e.week!==s.game.week){toast('This event is not live yet');return}e.results??={};if(Array.isArray(e.results[d])){activeEventDisc=d;competitionMode='discipline';drawCompetition();return}
 const career=s,r=simulateDiscipline(e,d),lines=commentaryLines(d,r,e);disciplineRunning=true;activeEventDisc=d;competitionMode='discipline';liveEventView={event:e,disc:d,results:r,lines,index:-1};e.commentary??={};e.commentary[d]=lines;drawCompetition();let j=0;
 function step(){if(s!==career)return;if(j<lines.length){liveEventView.index=j;const visible=currentView==='competition'&&competitionMode==='discipline'&&activeEventDisc===d,comm=visible?$('commentary'):null;if(comm)renderMatchdayCommentary(comm,lines[j]);if(visible)fmUpdateLivePanels(e,d);j++;timers.push(setTimeout(step,commentaryDelay(lines[j-1])));return}commitDisciplineResults(e,d,r);save();disciplineRunning=false;liveEventView=null;const ds=e.disc.filter(x=>x!=='ALL');activeEventDisc=d;competitionMode='discipline';if(ds.every(x=>Array.isArray(e.results[x])))finaliseEvent(e,false);else{drawCompetition();toast(discLabel(d)+' complete — scoreboard confirmed')}}step()
};

/* Summit meetings use the same split-screen 2D presentation. */
drawSummitDisciplineLive=function(m){
 const d=activeEventDisc||Object.keys(DISCIPLINES)[0],rows=m.results[d]||null,running=disciplineRunning&&!rows,proxy=summitProxy(m),own=summitEntriesForDisc(m,d),format=proxy.engine?.[d]||athleticsFormat(proxy,d),status=rows?'OFFICIAL':running?'LIVE':'READY',rawCall=rows?matchdayStoredCall(proxy,d):running?(liveEventView?.lines[liveEventView.index]||`BUILD-UP\nGavin Potts — ${discLabel(d)} is getting ready.`):`BUILD-UP\nGavin Potts — The Summit ${discLabel(d)} is ready.`;
 $('pageKicker').textContent='SUMMIT SERIES';$('pageTitle').textContent='Series '+m.number+' • '+discLabel(d);
 $('competition').innerHTML=`<div class="matchday-shell fm2d-matchday fm2d-summit"><header class="matchday-scorebar"><div class="matchday-scorebar-left"><button id="backSummitProgrammeTop" class="matchday-back">‹</button><div class="matchday-event-id"><small>SUMMIT SERIES • ROUND ${m.number}/6</small><strong>${fmEsc(m.location)}</strong><span>Full-Series roster</span></div></div><div class="matchday-centre"><div class="matchday-live-row">${running?'<i class="matchday-live-dot"></i>':''}<small>${status} • 2D LIVE</small></div><h1>${discLabel(d)}</h1></div><div class="matchday-scorebar-right"><button id="startSummitDiscTop" class="btn ${rows?'good':'primary'} matchday-start" ${rows||disciplineRunning?'disabled':''}>${rows?'COMPLETE':running?'IN PROGRESS':'START EVENT'}</button></div></header><div class="matchday-body"><section class="matchday-card fm2d-card"><div class="matchday-ribbon"><div><strong>SUMMIT ${m.number} • ${fmEsc(m.location)}</strong><span> • ${fmEsc(format.format||format.label)}</span></div><span class="matchday-state">${status}</span></div><div class="fm-live-split"><div class="fm-live-left"><div class="matchday-arena"><div id="liveEventVisual">${eventVisualHTML(proxy,d)}</div></div><div class="matchday-commentary fm2d-commentary"><div class="matchday-commentator"><div class="matchday-gp">GP</div><div><small>Live commentary</small><strong>Gavin Potts</strong></div></div><div id="commentary" class="matchday-call">${matchdayCommentaryHTML(rawCall)}</div></div></div><aside id="liveScoreboard" class="fm-scoreboard">${eventScoreboardHTML(proxy,d)}</aside></div><footer class="matchday-dashboard fm2d-dashboard"><div class="matchday-dash-cell"><span class="matchday-dash-label">${fmEsc(nationName(managedNation()))} entries</span><div class="matchday-athletes">${fmAthleteChips(own,nationName(managedNation()))}</div></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Summit format</span><strong class="matchday-dash-main">${fmEsc(format.format||format.label)}</strong><span class="matchday-dash-sub">Series points only • Round ${m.number}/6</span></div><div class="matchday-dash-cell"><span class="matchday-dash-label">Controls</span><div class="matchday-controls"><button id="startSummitDisc" class="btn ${rows?'good':'primary'}" ${rows||disciplineRunning?'disabled':''}>${rows?'COMPLETE':running?'IN PROGRESS':'START'}</button><button id="backSummitProgramme" class="btn ghost">PROGRAMME</button></div></div></footer></section></div></div>`;
 const back=()=>{competitionMode='overview';drawCompetition()};$('backSummitProgrammeTop').onclick=back;$('backSummitProgramme').onclick=back;if($('startSummitDisc'))$('startSummitDisc').onclick=()=>startSummitDiscipline(m,d);if($('startSummitDiscTop'))$('startSummitDiscTop').onclick=()=>startSummitDiscipline(m,d)
};
startSummitDiscipline=function(m,d){
 if(!m||m.completed||disciplineRunning||m.week!==s.game.week||Array.isArray(m.results[d]))return;const career=s,rows=summitRows(m,d),proxy=summitProxy(m),lines=commentaryLines(d,rows,proxy);disciplineRunning=true;m.eventDayMode='watch';m.commentary??={};m.commentary[d]=lines;liveEventView={event:proxy,disc:d,results:rows,lines,index:-1};drawCompetition();let i=0;
 function step(){if(s!==career)return;if(i<lines.length){liveEventView.index=i;const comm=$('commentary');if(comm)renderMatchdayCommentary(comm,lines[i]);fmUpdateLivePanels(proxy,d);i++;timers.push(setTimeout(step,commentaryDelay(lines[i-1])));return}commitSummitRows(m,d,rows);disciplineRunning=false;liveEventView=null;if(Object.keys(DISCIPLINES).every(x=>Array.isArray(m.results[x])))finishSummitMeeting(m);save();if(m.completed){competitionMode='overview';render()}else drawCompetition()}step()
};

/* Keep development history while placing the new viewer at the top. */
if(typeof UPDATES!=='undefined'){
 if(!UPDATES.some(u=>u.title==='3D Event Broadcast'))UPDATES.unshift({date:'8 September 2026',title:'3D Event Broadcast',items:['Introduced an experimental 3D-style event presentation across the original disciplines.','High Jump coverage was reduced into key moments rather than every single attempt.','The experiment helped define the direction for the dedicated event presentation layer.']});
 if(!UPDATES.some(u=>u.title==='Performance & Architecture Optimisation'))UPDATES.unshift({date:'8 September 2026',title:'Performance & Architecture Optimisation',items:['Rebuilt the game from one 12.7 MB HTML file into a lightweight HTML shell with separate game, event, stylesheet and asset files.','Removed more than 11.8 MB of base64 image data and converted the large sprite sheets to efficient WebP assets.','Interface code and image assets can now be cached independently, making future updates smaller and easier to maintain.','The dedicated event presentation lives in its own feature files so it can evolve without destabilising the career simulation.']});
 if(!UPDATES.some(u=>u.title==='2D Live Event & Scoreboard'))UPDATES.unshift({date:'8 September 2026',title:'2D Live Event & Scoreboard',items:['Replaced the experimental 3D presentation with a fast, deliberately simple top-down 2D event engine inspired by Football Manager match view, using nation-coloured dots instead of athlete models.','The live competition screen is now split 50/50: the event runs on the left while a discipline-aware scoreboard updates live on the right.','Sprint scoreboards follow the changing race order, Shot Put tracks valid best marks and attempts, and High Jump tracks key clearances, passes and eliminations.','High Jump remains highlights-led rather than showing every attempt, keeping field events moving quickly while the underlying Athletics Engine and official results remain unchanged.','Summit Series event viewing now uses the same 2D split-screen presentation for consistency across the entire game.']});
}
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End 2D live event viewer ===== */
