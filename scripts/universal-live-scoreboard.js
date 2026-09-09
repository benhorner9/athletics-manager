/* ===== Universal Live Event Day Scoreboard ===== */
(function(){
'use strict';

const SCOREBOARD_VERSION=1;
const POLL_MS=70;
let raceStageKey='';
let raceSplits=new Map();
let previousRaceSample=new Map();
let lastRenderKey='';
let lastPositions=new Map();

function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function managed(){return typeof managedNation==='function'?managedNation():''}
function dotColour(row){return typeof nationDotColour==='function'?nationDotColour(row?.nation):'#9fb3bd'}
function nation(row){return typeof nationName==='function'?nationName(row?.nation):String(row?.nation||'')}
function label(d){return typeof discLabel==='function'?discLabel(d):String(d||'')}
function typeOf(d){return DISCIPLINES?.[d]?.type||''}
function distanceOf(d){return Number(DISCIPLINES?.[d]?.distance)||0}
function formatPerf(d,v){return Number.isFinite(Number(v))&&typeof fmtPerf==='function'?fmtPerf(d,Number(v)):Number.isFinite(Number(v))?String(Number(v).toFixed(2)):'—'}
function formatSplit(seconds){
  const n=Math.max(0,Number(seconds)||0);
  if(n<60)return `${n.toFixed(n<20?2:1)}s`;
  const m=Math.floor(n/60),s=(n-m*60).toFixed(1).padStart(4,'0');
  return `${m}:${s}`;
}
function currentEvent(){return liveEventView?.event||null}
function currentDisc(){return liveEventView?.disc||activeEventDisc||null}
function currentCue(){
  const e=currentEvent(),d=currentDisc(),i=liveEventView?.index??-1,line=i>=0?liveEventView?.lines?.[i]:null;
  return line?e?.engine?.[d]?.broadcastCues?.[line]||null:null;
}
function rows(){return Array.isArray(liveEventView?.results)?liveEventView.results:[]}
function installStyles(){
  if(document.getElementById('universalLiveScoreboardStyles'))return;
  const s=document.createElement('style');s.id='universalLiveScoreboardStyles';s.textContent=`
    .universal-live-board{height:100%;display:flex;flex-direction:column;min-height:0}
    .universal-live-board .uls-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 12px 10px;border-bottom:1px solid rgba(255,255,255,.08)}
    .universal-live-board .uls-head small{display:block;font-size:8px;font-weight:900;letter-spacing:.11em;color:var(--muted,#8fa5b2);text-transform:uppercase}.universal-live-board .uls-head strong{display:block;margin-top:2px;font-size:15px;color:var(--text,#eef5f8)}.universal-live-board .uls-head span{font-size:10px;font-weight:850;color:#a9bcc5;text-align:right;white-space:nowrap}
    .universal-live-board .uls-cols{display:grid;grid-template-columns:30px minmax(0,1fr) 82px;gap:7px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.06);font-size:8px;font-weight:900;letter-spacing:.08em;color:#738d99;text-transform:uppercase}
    .universal-live-board .uls-cols span:last-child{text-align:right}.universal-live-board .uls-list{overflow:auto;min-height:0;flex:1}.universal-live-board .uls-row{display:grid;grid-template-columns:30px 8px minmax(0,1fr) 82px;gap:7px;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.045);transition:background .14s ease}.universal-live-board .uls-row.changed{background:rgba(255,255,255,.085)}.universal-live-board .uls-row.current{background:rgba(255,255,255,.07)}.universal-live-board .uls-row.managed{box-shadow:inset 2px 0 rgba(255,255,255,.45)}
    .universal-live-board .uls-pos{font-size:13px;font-weight:950;color:#f0f6f8;text-align:center;font-variant-numeric:tabular-nums}.universal-live-board .uls-dot{width:7px;height:7px;border-radius:50%}.universal-live-board .uls-name{min-width:0}.universal-live-board .uls-name strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:#eaf2f5}.universal-live-board .uls-name small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;font-size:8px;color:#829ba7}.universal-live-board .uls-value{text-align:right;min-width:0}.universal-live-board .uls-value strong{display:block;font-size:10px;color:#f0f6f8;font-variant-numeric:tabular-nums}.universal-live-board .uls-value small{display:block;margin-top:2px;font-size:7px;color:#8199a5;white-space:nowrap}
    .universal-live-board .uls-foot{padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);font-size:8px;color:#7f96a1;line-height:1.35}
    .track-v4-board{display:none!important}
    @media(max-width:700px){.universal-live-board .uls-cols{grid-template-columns:28px minmax(0,1fr) 72px}.universal-live-board .uls-row{grid-template-columns:28px 7px minmax(0,1fr) 72px;padding:7px 8px}.universal-live-board .uls-name strong{font-size:9px}.universal-live-board .uls-value strong{font-size:9px}}
  `;document.head.appendChild(s);
}

function boardShell(kicker,title,status,rightHead,body,note){
  return `<div class="universal-live-board"><header class="uls-head"><div><small>${esc(kicker)}</small><strong>${esc(title)}</strong></div><span>${esc(status)}</span></header><div class="uls-cols"><span>POS</span><span>ATHLETE</span><span>${esc(rightHead)}</span></div><div class="uls-list">${body}</div><footer class="uls-foot">${esc(note)}</footer></div>`;
}
function changedClass(id,pos){const old=lastPositions.get(id);return Number.isFinite(old)&&old!==pos?' changed':''}
function commitPositions(order){lastPositions=new Map(order.map((r,i)=>[r.id,i+1]))}

function resetRaceSplits(stageKey){raceStageKey=stageKey;raceSplits=new Map();previousRaceSample=new Map();lastPositions=new Map();lastRenderKey=''}
function splitStore(id){if(!raceSplits.has(id))raceSplits.set(id,new Map());return raceSplits.get(id)}
function recordRaceSplits(stage,state){
  if(!stage||!state?.items?.length)return;
  if(stage.key!==raceStageKey)resetRaceSplits(stage.key);
  const checkpoints=(stage.checkpoints||[]).filter(x=>Number(x)>0).map(Number).sort((a,b)=>a-b);
  for(const item of state.items){
    const id=item.row.id,metres=Number(item.metres)||0,time=Number(state.elapsed)||0,prev=previousRaceSample.get(id),store=splitStore(id);
    for(const cp of checkpoints){
      if(store.has(cp)||metres<cp)continue;
      let crossing=time;
      if(prev&&prev.metres<cp&&metres>prev.metres&&time>=prev.time){const ratio=(cp-prev.metres)/(metres-prev.metres);crossing=prev.time+(time-prev.time)*Math.max(0,Math.min(1,ratio))}
      if(cp>=distanceOf(currentDisc())&&Number.isFinite(Number(item.row.perf)))crossing=Number(item.row.perf);
      store.set(cp,crossing);
    }
    previousRaceSample.set(id,{metres,time});
  }
}
function latestSplitFor(id){
  const store=raceSplits.get(id);if(!store?.size)return null;
  const metres=Math.max(...store.keys());return {metres,time:store.get(metres)};
}
function renderTrack(board,e,d,track){
  const stage=track.stages?.[track.stageIndex]||track.stages?.[0],state=track.state;if(!stage||!state?.order?.length)return;
  recordRaceSplits(stage,state);
  const distance=distanceOf(d),leaderMetres=Math.max(0,...state.items.map(x=>Math.min(distance,Number(x.metres)||0))),order=state.order;
  const body=order.map((row,i)=>{
    const pos=i+1,item=state.items.find(x=>x.row.id===row.id),split=latestSplitFor(row.id),finished=Number(item?.metres)>=distance;
    const primary=finished&&Number.isFinite(Number(row.perf))?formatPerf(d,row.perf):split?formatSplit(split.time):'—';
    const secondary=finished?'FINISH':split?`${split.metres}m split`:`${Math.round(Number(item?.metres)||0)}m`;
    return `<div class="uls-row ${row.nation===managed()?'managed':''}${changedClass(row.id,pos)}"><b class="uls-pos">${pos}</b><i class="uls-dot" style="background:${dotColour(row)}"></i><div class="uls-name"><strong>${esc(row.name)}</strong><small>${esc(nation(row))}${row.lane?` • Lane ${row.lane}`:''}</small></div><div class="uls-value"><strong>${esc(primary)}</strong><small>${esc(secondary)}</small></div></div>`;
  }).join('');
  const key=`track|${stage.key}|${order.map(x=>x.id).join(',')}|${order.map(x=>{const s=latestSplitFor(x.id);return s?`${s.metres}:${s.time.toFixed(2)}`:'-'}).join(',')}|${Math.floor(leaderMetres/5)}`;
  if(board.dataset.ulsKey!==key){board.innerHTML=boardShell(`LIVE • ${stage.name||'Race'}`,`${label(d)} Scoreboard`,state.allFinished?'FINISH':`${Math.round(leaderMetres)}m / ${distance}m`,'SPLIT',body,'Positions update continuously from the same live race state as the athletes. Split times are captured when each athlete crosses the checkpoint.');board.dataset.ulsKey=key;commitPositions(order)}
}

function attemptState(e,d){
  const list=rows(),states=new Map(list.map((r,i)=>[r.id,{row:r,seed:i,attempts:[],best:null,current:false}])),idx=liveEventView?.index??-1,lines=liveEventView?.lines||[],cues=e?.engine?.[d]?.broadcastCues||{};
  for(let i=0;i<=idx;i++){
    const cue=cues[lines[i]];if(!cue?.athleteId||!states.has(cue.athleteId)||!Number.isFinite(Number(cue.attempt)))continue;
    if(cue.family==='height')continue;
    if(!('mark' in cue)&&!Number.isFinite(Number(cue.mark)))continue;
    const st=states.get(cue.athleteId),a=Math.max(0,Number(cue.attempt)-1);st.attempts[a]=Number.isFinite(Number(cue.mark))?Number(cue.mark):null;
  }
  const cue=currentCue();if(cue?.athleteId&&states.has(cue.athleteId)&&cue.family!=='height')states.get(cue.athleteId).current=true;
  for(const st of states.values()){const valid=st.attempts.filter(Number.isFinite).sort((a,b)=>b-a);st.best=valid[0]??null;st.second=valid[1]??null}
  return [...states.values()].sort((a,b)=>(b.best??-Infinity)-(a.best??-Infinity)||(b.second??-Infinity)-(a.second??-Infinity)||a.seed-b.seed);
}
function renderAttempts(board,e,d){
  const states=attemptState(e,d),cue=currentCue(),ranked=states.filter(x=>x.best!==null),rankMap=new Map(ranked.map((x,i)=>[x.row.id,i+1]));
  const body=states.map(st=>{
    const pos=rankMap.get(st.row.id)||'—',series=st.attempts.length?st.attempts.map((v,i)=>`${i+1}:${v===undefined?'—':v===null?'X':Number(v).toFixed(2)}`).join('  '):'Waiting';
    return `<div class="uls-row ${st.row.nation===managed()?'managed':''}${st.current?' current':''}${Number.isFinite(pos)?changedClass(st.row.id,pos):''}"><b class="uls-pos">${pos}</b><i class="uls-dot" style="background:${dotColour(st.row)}"></i><div class="uls-name"><strong>${esc(st.row.name)}</strong><small>${esc(series)}</small></div><div class="uls-value"><strong>${st.best!==null?esc(formatPerf(d,st.best)):'—'}</strong><small>${st.current?'CURRENT':'BEST'}</small></div></div>`;
  }).join('');
  const key=`attempt|${d}|${liveEventView?.index}|${states.map(x=>`${x.row.id}:${x.best}:${x.attempts.join('/')}`).join('|')}`;
  if(board.dataset.ulsKey!==key){const status=cue?.athleteId?`Attempt ${cue.attempt||''}`:'Waiting';board.innerHTML=boardShell('LIVE STANDINGS',`${label(d)} Scoreboard`,status,'BEST',body,'Standings recalculate immediately after every attempt. Fouls are shown as X and only completed attempts affect position.');board.dataset.ulsKey=key;commitPositions(ranked.map(x=>x.row))}
}

function heightState(e,d){
  const list=rows(),states=new Map(list.map((r,i)=>[r.id,{row:r,seed:i,best:null,fails:0,out:false,current:false,last:'Waiting'}])),idx=liveEventView?.index??-1,lines=liveEventView?.lines||[],cues=e?.engine?.[d]?.broadcastCues||{};
  for(let i=0;i<=idx;i++){
    const cue=cues[lines[i]];if(cue?.family!=='height'||!cue.athleteId||!states.has(cue.athleteId))continue;
    const st=states.get(cue.athleteId),height=Number(cue.height),attempt=Number(cue.attempt)||1;
    if(cue.outcome==='O'){if(Number.isFinite(height))st.best=Math.max(st.best??0,height);st.last=`${Number.isFinite(height)?height.toFixed(2)+'m':''} ${'X'.repeat(Math.max(0,attempt-1))}O`.trim()}
    else if(cue.outcome==='X'){st.fails+=1;st.last=`${Number.isFinite(height)?height.toFixed(2)+'m ':''}X${attempt}/3`;if(attempt>=3)st.out=true}
    else {st.last=`${Number.isFinite(height)?height.toFixed(2)+'m ':''}PASS`}
  }
  const cue=currentCue();if(cue?.family==='height'&&states.has(cue.athleteId))states.get(cue.athleteId).current=true;
  return [...states.values()].sort((a,b)=>Number(a.out)-Number(b.out)||(b.best??-Infinity)-(a.best??-Infinity)||a.fails-b.fails||a.seed-b.seed);
}
function renderHeight(board,e,d){
  const states=heightState(e,d),cue=currentCue(),rankable=states.filter(x=>x.best!==null),rankMap=new Map(rankable.map((x,i)=>[x.row.id,i+1]));
  const body=states.map(st=>{const pos=rankMap.get(st.row.id)||'—';return `<div class="uls-row ${st.row.nation===managed()?'managed':''}${st.current?' current':''}${Number.isFinite(pos)?changedClass(st.row.id,pos):''}"><b class="uls-pos">${pos}</b><i class="uls-dot" style="background:${dotColour(st.row)}"></i><div class="uls-name"><strong>${esc(st.row.name)}</strong><small>${esc(st.last)}${st.out?' • OUT':''}</small></div><div class="uls-value"><strong>${st.best!==null?esc(formatPerf(d,st.best)):'—'}</strong><small>${st.out?'OUT':'BEST'}</small></div></div>`}).join('');
  const key=`height|${d}|${liveEventView?.index}|${states.map(x=>`${x.row.id}:${x.best}:${x.fails}:${x.out}`).join('|')}`;
  if(board.dataset.ulsKey!==key){const status=cue?.height?`Bar ${Number(cue.height).toFixed(2)}m`:'Waiting';board.innerHTML=boardShell('LIVE STANDINGS',`${label(d)} Scoreboard`,status,'BEST',body,'Standings update after every clearance, miss or pass. Current best height and countback decide the live order.');board.dataset.ulsKey=key;commitPositions(rankable.map(x=>x.row))}
}

function sync(){
  if(!disciplineRunning||!liveEventView?.event||!liveEventView?.disc)return;
  const board=document.getElementById('liveScoreboard');if(!board)return;
  const e=currentEvent(),d=currentDisc(),track=liveEventView?.trackOverhaulV4;
  if(track?.state?.order?.length){renderTrack(board,e,d,track);return}
  if(typeOf(d)==='height'){renderHeight(board,e,d);return}
  if(typeOf(d)!=='time'){renderAttempts(board,e,d);return}
}

installStyles();
window.setInterval(sync,POLL_MS);

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Universal Live Event Scoreboard')){
  UPDATES.unshift({date:'9 September 2026',title:'Universal Live Event Scoreboard',items:[
    'The right-hand Event Day scoreboard is now the authoritative live standings panel across event types.',
    'Track races update position continuously from the same race state as the on-track athletes, with an individual split time recorded for every athlete at each checkpoint they cross.',
    'Throws and distance-attempt events recalculate the order immediately after every attempt, including fouls and the full completed attempt series.',
    'High Jump standings update after every clearance, miss or pass using current best height and countback, without revealing future attempts.',
    'The duplicate in-arena race leaderboard has been removed so Event Day has one clear live scoreboard on the right.'
  ]});
}
if(typeof renderMenu==='function')renderMenu();
})();
/* ===== End Universal Live Event Day Scoreboard ===== */