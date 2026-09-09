/* ===== Universal Live Event Day Scoreboard V3 ===== */
(function(){
'use strict';

const SCOREBOARD_VERSION=3;
const POLL_MS=70;
let raceStageKey='';
let raceSplits=new Map();
let previousRaceSample=new Map();
let lastPositions=new Map();

function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function managed(){return typeof managedNation==='function'?managedNation():''}
function dotColour(row){return typeof nationDotColour==='function'?nationDotColour(row?.nation):'#9fb3bd'}
function nation(row){return typeof nationName==='function'?nationName(row?.nation):String(row?.nation||'')}
function label(d){return typeof discLabel==='function'?discLabel(d):String(d||'')}
function typeOf(d){return DISCIPLINES?.[d]?.type||''}
function distanceOf(d){return Number(DISCIPLINES?.[d]?.distance)||0}
function formatPerf(d,v){return Number.isFinite(Number(v))&&typeof fmtPerf==='function'?fmtPerf(d,Number(v)):Number.isFinite(Number(v))?String(Number(v).toFixed(2)):'—'}
function formatSplit(seconds){const n=Math.max(0,Number(seconds)||0);if(n<60)return `${n.toFixed(n<20?2:1)}s`;const m=Math.floor(n/60),s=(n-m*60).toFixed(1).padStart(4,'0');return `${m}:${s}`}
function currentEvent(){return liveEventView?.event||null}
function currentDisc(){return liveEventView?.disc||activeEventDisc||null}
function currentCue(){const e=currentEvent(),d=currentDisc(),i=liveEventView?.index??-1,line=i>=0?liveEventView?.lines?.[i]:null;return line?e?.engine?.[d]?.broadcastCues?.[line]||null:null}
function rows(){return Array.isArray(liveEventView?.results)?liveEventView.results:[]}
function seedOf(e,d,row){return typeof hashString==='function'?(hashString(`${e?.id||'event'}|${d}|${row?.id||row?.name}|scoreboard-seed`)>>>0):String(row?.id||row?.name||'').split('').reduce((n,c)=>n+c.charCodeAt(0),0)}
function aiPlan(e,d,id){return e?.engine?.[d]?.aiRealism?.plans?.[id]||null}

function installStyles(){
  if(document.getElementById('universalLiveScoreboardStylesV3'))return;
  const s=document.createElement('style');s.id='universalLiveScoreboardStylesV3';s.textContent=`
    .universal-live-board{height:100%;display:flex;flex-direction:column;min-height:0}
    .universal-live-board .uls-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:12px 12px 10px;border-bottom:1px solid rgba(255,255,255,.08)}
    .universal-live-board .uls-head small{display:block;font-size:8px;font-weight:900;letter-spacing:.11em;color:var(--muted,#8fa5b2);text-transform:uppercase}.universal-live-board .uls-head strong{display:block;margin-top:2px;font-size:15px;color:var(--text,#eef5f8)}.universal-live-board .uls-head span{font-size:10px;font-weight:850;color:#a9bcc5;text-align:right;white-space:nowrap}
    .universal-live-board .uls-cols{display:grid;grid-template-columns:30px minmax(0,1fr) 88px;gap:7px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.06);font-size:8px;font-weight:900;letter-spacing:.08em;color:#738d99;text-transform:uppercase}.universal-live-board .uls-cols span:last-child{text-align:right}
    .universal-live-board .uls-list{overflow:auto;min-height:0;flex:1;overflow-anchor:none}.universal-live-board .uls-row{display:grid;grid-template-columns:30px 8px minmax(0,1fr) 88px;gap:7px;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.045);transition:background .14s ease,transform .14s ease}.universal-live-board .uls-row.changed{background:rgba(255,255,255,.085)}.universal-live-board .uls-row.current{background:rgba(255,255,255,.07)}.universal-live-board .uls-row.managed{box-shadow:inset 2px 0 rgba(255,255,255,.45)}.universal-live-board .uls-row.dnf{opacity:.62}
    .universal-live-board .uls-pos{font-size:13px;font-weight:950;color:#f0f6f8;text-align:center;font-variant-numeric:tabular-nums}.universal-live-board .uls-dot{width:7px;height:7px;border-radius:50%}.universal-live-board .uls-name{min-width:0}.universal-live-board .uls-name strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:#eaf2f5}.universal-live-board .uls-name small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;font-size:8px;color:#829ba7}.universal-live-board .uls-value{text-align:right;min-width:0}.universal-live-board .uls-value strong{display:block;font-size:10px;color:#f0f6f8;font-variant-numeric:tabular-nums}.universal-live-board .uls-value small{display:block;margin-top:2px;font-size:7px;color:#8199a5;white-space:nowrap}
    .universal-live-board .uls-foot{padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);font-size:8px;color:#7f96a1;line-height:1.35}
    .track-v4-board{display:none!important}
    @media(max-width:700px){.universal-live-board .uls-cols{grid-template-columns:28px minmax(0,1fr) 78px}.universal-live-board .uls-row{grid-template-columns:28px 7px minmax(0,1fr) 78px;padding:7px 8px}.universal-live-board .uls-name strong{font-size:9px}.universal-live-board .uls-value strong{font-size:9px}}
  `;document.head.appendChild(s);
}
function boardShell(kicker,title,status,rightHead,note){return `<div class="universal-live-board" data-scoreboard-version="${SCOREBOARD_VERSION}"><header class="uls-head"><div><small>${esc(kicker)}</small><strong>${esc(title)}</strong></div><span>${esc(status)}</span></header><div class="uls-cols"><span>POS</span><span>ATHLETE</span><span>${esc(rightHead)}</span></div><div class="uls-list"></div><footer class="uls-foot">${esc(note)}</footer></div>`}
function commitPositions(order){lastPositions=new Map(order.map((r,i)=>[r.id,i+1]))}
function ensureBoard(board,kicker,title,status,rightHead,note){
  let root=board.querySelector('.universal-live-board');
  if(!root){board.innerHTML=boardShell(kicker,title,status,rightHead,note);root=board.querySelector('.universal-live-board')}
  const small=root?.querySelector('.uls-head small'),strong=root?.querySelector('.uls-head strong'),statusEl=root?.querySelector('.uls-head>span'),right=root?.querySelector('.uls-cols span:last-child'),foot=root?.querySelector('.uls-foot');
  if(small&&small.textContent!==kicker)small.textContent=kicker;if(strong&&strong.textContent!==title)strong.textContent=title;if(statusEl&&statusEl.textContent!==status)statusEl.textContent=status;if(right&&right.textContent!==rightHead)right.textContent=rightHead;if(foot&&foot.textContent!==note)foot.textContent=note;
  return root?.querySelector('.uls-list')||null
}
function upsertRows(list,data){
  if(!list)return;const scrollTop=list.scrollTop,existing=new Map([...list.children].filter(el=>el.dataset?.athleteId).map(el=>[el.dataset.athleteId,el])),keep=new Set();
  for(const row of data){const id=String(row.id),oldPos=lastPositions.get(row.id);let el=existing.get(id);if(!el){el=document.createElement('div');el.className='uls-row';el.dataset.athleteId=id;el.innerHTML='<b class="uls-pos"></b><i class="uls-dot"></i><div class="uls-name"><strong></strong><small></small></div><div class="uls-value"><strong></strong><small></small></div>'}keep.add(id);el.classList.toggle('managed',!!row.managed);el.classList.toggle('current',!!row.current);el.classList.toggle('dnf',!!row.dnf);const moved=Number.isFinite(Number(oldPos))&&Number.isFinite(Number(row.pos))&&Number(oldPos)!==Number(row.pos);el.classList.toggle('changed',moved);const pos=el.querySelector('.uls-pos'),dot=el.querySelector('.uls-dot'),name=el.querySelector('.uls-name strong'),sub=el.querySelector('.uls-name small'),primary=el.querySelector('.uls-value strong'),secondary=el.querySelector('.uls-value small'),posText=String(row.pos??'—'),nameText=String(row.name??''),subText=String(row.sub??''),primaryText=String(row.primary??'—'),secondaryText=String(row.secondary??'');if(pos&&pos.textContent!==posText)pos.textContent=posText;if(dot&&dot.style.background!==row.dot)dot.style.background=row.dot;if(name&&name.textContent!==nameText)name.textContent=nameText;if(sub&&sub.textContent!==subText)sub.textContent=subText;if(primary&&primary.textContent!==primaryText)primary.textContent=primaryText;if(secondary&&secondary.textContent!==secondaryText)secondary.textContent=secondaryText;list.appendChild(el);if(moved)window.setTimeout(()=>el?.classList.remove('changed'),180)}
  for(const [id,el] of existing)if(!keep.has(id))el.remove();list.scrollTop=scrollTop
}

function resetRaceSplits(stageKey){raceStageKey=stageKey;raceSplits=new Map();previousRaceSample=new Map();lastPositions=new Map()}
function splitStore(id){if(!raceSplits.has(id))raceSplits.set(id,new Map());return raceSplits.get(id)}
function recordRaceSplits(stage,state){if(!stage||!state?.items?.length)return;if(stage.key!==raceStageKey)resetRaceSplits(stage.key);const checkpoints=(stage.checkpoints||[]).filter(x=>Number(x)>0).map(Number).sort((a,b)=>a-b);for(const item of state.items){const id=item.row.id,metres=Number(item.metres)||0,time=Number(state.elapsed)||0,prev=previousRaceSample.get(id),store=splitStore(id);for(const cp of checkpoints){if(store.has(cp)||metres<cp)continue;let crossing=time;if(prev&&prev.metres<cp&&metres>prev.metres&&time>=prev.time){const ratio=(cp-prev.metres)/(metres-prev.metres);crossing=prev.time+(time-prev.time)*Math.max(0,Math.min(1,ratio))}if(cp>=distanceOf(currentDisc())&&Number.isFinite(Number(item.row.perf)))crossing=Number(item.row.perf);store.set(cp,crossing)}previousRaceSample.set(id,{metres,time})}}
function latestSplitFor(id){const store=raceSplits.get(id);if(!store?.size)return null;const metres=Math.max(...store.keys());return {metres,time:store.get(metres)}}
function renderTrack(board,e,d,track){
  const stage=track.stages?.[track.stageIndex]||track.stages?.[0],state=track.state;if(!stage||!state?.order?.length)return;recordRaceSplits(stage,state);const distance=distanceOf(d),leaderMetres=Math.max(0,...state.items.map(x=>Math.min(distance,Number(x.metres)||0))),pulled=new Set(state.order.filter(row=>{const p=aiPlan(e,d,row.id);return !!(p?.dnf&&Number(track.local)>=Number(p.injuryProgress))}).map(r=>r.id)),active=state.order.filter(r=>!pulled.has(r.id)),dnfs=state.order.filter(r=>pulled.has(r.id));
  const list=ensureBoard(board,`LIVE • ${stage.name||'Race'}`,`${label(d)} Scoreboard`,state.allFinished?'FINISH':`${Math.round(leaderMetres)}m / ${distance}m`,'SPLIT','Live positions come directly from the on-track race state. Each athlete receives their own checkpoint split; a pulled-up athlete is removed from the running order immediately.');
  const data=[...active.map((row,i)=>{const item=state.items.find(x=>x.row.id===row.id),split=latestSplitFor(row.id),finished=Number(item?.metres)>=distance,primary=finished&&Number.isFinite(Number(row.perf))?formatPerf(d,row.perf):split?formatSplit(split.time):'—',secondary=finished?'FINISH':split?`${split.metres}m split`:`${Math.round(Number(item?.metres)||0)}m`;return {id:row.id,pos:i+1,name:row.name,sub:`${nation(row)}${row.lane?` • Lane ${row.lane}`:''}`,primary,secondary,dot:dotColour(row),managed:row.nation===managed()}}),...dnfs.map(row=>{const split=latestSplitFor(row.id);return {id:row.id,pos:'—',name:row.name,sub:`${nation(row)} • Pulled up`,primary:'DNF',secondary:split?`${split.metres}m • ${formatSplit(split.time)}`:'DNF',dot:dotColour(row),managed:row.nation===managed(),dnf:true}})];
  upsertRows(list,data);commitPositions(active)
}

function validMarks(attempts){return attempts.filter(Number.isFinite).sort((a,b)=>b-a)}
function compareMarks(a,b){const av=validMarks(a.attempts),bv=validMarks(b.attempts),n=Math.max(av.length,bv.length);for(let i=0;i<n;i++){const aa=av[i]??-Infinity,bb=bv[i]??-Infinity;if(bb!==aa)return bb-aa}return a.seed-b.seed}
function attemptState(e,d){const list=rows(),states=new Map(list.map(r=>[r.id,{row:r,seed:seedOf(e,d,r),attempts:[],best:null,current:false}])),idx=liveEventView?.index??-1,lines=liveEventView?.lines||[],cues=e?.engine?.[d]?.broadcastCues||{};for(let i=0;i<=idx;i++){const cue=cues[lines[i]];if(!cue?.athleteId||!states.has(cue.athleteId)||!Number.isFinite(Number(cue.attempt))||cue.family==='height'||!('mark' in cue))continue;const st=states.get(cue.athleteId),a=Math.max(0,Number(cue.attempt)-1);st.attempts[a]=Number.isFinite(cue.mark)?Number(cue.mark):null}const cue=currentCue();if(cue?.athleteId&&states.has(cue.athleteId)&&cue.family!=='height')states.get(cue.athleteId).current=true;for(const st of states.values())st.best=validMarks(st.attempts)[0]??null;return [...states.values()].sort((a,b)=>{if(a.best===null&&b.best!==null)return 1;if(a.best!==null&&b.best===null)return -1;if(a.best===null&&b.best===null)return a.seed-b.seed;return compareMarks(a,b)})}
function renderAttempts(board,e,d){const states=attemptState(e,d),cue=currentCue(),ranked=states.filter(x=>x.best!==null),rankMap=new Map(ranked.map((x,i)=>[x.row.id,i+1])),status=cue?.athleteId?`Attempt ${cue.attempt||''}`:'Waiting',list=ensureBoard(board,'LIVE STANDINGS',`${label(d)} Scoreboard`,status,'BEST','Every completed attempt updates the live order. Fouls are X; ties compare the next-best valid marks rather than leaking the eventual result order.');const data=states.map(st=>{const pos=rankMap.get(st.row.id)||'—',series=st.attempts.length?st.attempts.map((v,i)=>`${i+1}:${v===undefined?'—':v===null?'X':Number(v).toFixed(2)}`).join('  '):'Waiting';return {id:st.row.id,pos,name:st.row.name,sub:series,primary:st.best!==null?formatPerf(d,st.best):'—',secondary:st.current?'CURRENT':'BEST',dot:dotColour(st.row),managed:st.row.nation===managed(),current:st.current}});upsertRows(list,data);commitPositions(ranked.map(x=>x.row))}

function heightState(e,d){
  const list=rows(),states=new Map(list.map(r=>[r.id,{row:r,seed:seedOf(e,d,r),best:null,missesAtBest:0,totalFails:0,out:false,current:false,last:'Waiting',heightFails:new Map()}])),idx=liveEventView?.index??-1,lines=liveEventView?.lines||[],cues=e?.engine?.[d]?.broadcastCues||{};
  for(let i=0;i<=idx;i++){const cue=cues[lines[i]];if(cue?.family!=='height'||!cue.athleteId||!states.has(cue.athleteId))continue;const st=states.get(cue.athleteId),height=Number(cue.height),attempt=Number(cue.attempt)||0;if(cue.outcome==='O'){const fails=Number.isFinite(height)?(st.heightFails.get(height)||0):Math.max(0,attempt-1);if(Number.isFinite(height)){st.best=Math.max(st.best??0,height);if(st.best===height)st.missesAtBest=fails}st.last=`${Number.isFinite(height)?height.toFixed(2)+'m ':''}${'X'.repeat(fails)}O`.trim()}else if(cue.outcome==='X'){st.totalFails+=1;if(Number.isFinite(height))st.heightFails.set(height,(st.heightFails.get(height)||0)+1);st.last=`${Number.isFinite(height)?height.toFixed(2)+'m ':''}X${attempt}/3`;if(attempt>=3)st.out=true}else{st.last=`${Number.isFinite(height)?height.toFixed(2)+'m ':''}PASS`}}
  const cue=currentCue();if(cue?.family==='height'&&states.has(cue.athleteId))states.get(cue.athleteId).current=true;
  return [...states.values()].sort((a,b)=>{if(a.best===null&&b.best!==null)return 1;if(a.best!==null&&b.best===null)return -1;if(a.best!==null&&b.best!==null){if(b.best!==a.best)return b.best-a.best;if(a.missesAtBest!==b.missesAtBest)return a.missesAtBest-b.missesAtBest;if(a.totalFails!==b.totalFails)return a.totalFails-b.totalFails;if(a.out!==b.out)return Number(a.out)-Number(b.out)}else if(a.out!==b.out)return Number(a.out)-Number(b.out);return a.seed-b.seed})
}
function renderHeight(board,e,d){const states=heightState(e,d),cue=currentCue(),rankable=states.filter(x=>x.best!==null),rankMap=new Map(rankable.map((x,i)=>[x.row.id,i+1])),status=cue?.height?`Bar ${Number(cue.height).toFixed(2)}m`:'Waiting',list=ensureBoard(board,'LIVE STANDINGS',`${label(d)} Scoreboard`,status,'BEST','High Jump order uses real countback: best height, misses at that height, then total failures. Being eliminated does not incorrectly move an athlete below a lower clearance.');const data=states.map(st=>({id:st.row.id,pos:rankMap.get(st.row.id)||'—',name:st.row.name,sub:`${st.last}${st.out?' • OUT':''}`,primary:st.best!==null?formatPerf(d,st.best):'—',secondary:st.out?'OUT':st.best!==null?`${st.missesAtBest} miss${st.missesAtBest===1?'':'es'} at best`:'WAITING',dot:dotColour(st.row),managed:st.row.nation===managed(),current:st.current}));upsertRows(list,data);commitPositions(rankable.map(x=>x.row))}

function sync(){if(typeof disciplineRunning==='undefined'||!disciplineRunning||!liveEventView?.event||!liveEventView?.disc)return;const board=document.getElementById('liveScoreboard');if(!board)return;const e=currentEvent(),d=currentDisc(),track=liveEventView?.trackOverhaulV4;if(track?.state?.order?.length){renderTrack(board,e,d,track);return}if(typeOf(d)==='height'){renderHeight(board,e,d);return}if(typeOf(d)!=='time'){renderAttempts(board,e,d)}}

installStyles();
window.__athleticsLiveScoreboardSync=sync;
window.setInterval(sync,POLL_MS);
})();
/* ===== End Universal Live Event Day Scoreboard V3 ===== */
