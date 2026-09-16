/* Athletics Manager — Universal Live Event Shell V5
   Presentation-only shell around the authoritative Broadcast V4 / simulation stack.
   The shell owns hierarchy, responsive composition and event-aware information.
   It deliberately does not generate results or replace discipline simulation. */
(function(){
'use strict';
if(window.__amLiveEventShellV5)return;
window.__amLiveEventShellV5=1;

const $=(id)=>document.getElementById(id);
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const num=(v)=>Number.isFinite(Number(v))?Number(v):null;
let context={event:null,disc:null,disciplines:[],appliedAt:0};
let syncTimer=0,competitionObserver=null,shellApplyQueued=false;

function disciplineDef(d){try{return typeof DISCIPLINES!=='undefined'?(DISCIPLINES?.[d]||{}):{}}catch(_){return{}}}
function disciplineLabel(d){try{return typeof discLabel==='function'?discLabel(d):String(d||'Event')}catch(_){return String(d||'Event')}}
function disciplineDistance(d){return Number(disciplineDef(d)?.distance||0)}
function disciplineType(d){return disciplineDef(d)?.type||''}
function formatPerformance(d,v){try{return typeof fmtPerf==='function'?fmtPerf(d,v):(v==null?'—':String(v))}catch(_){return v==null?'—':String(v)}}
function activeDisc(){try{return typeof activeEventDisc!=='undefined'&&activeEventDisc?activeEventDisc:null}catch(_){return null}}
function liveState(){return window.AMLiveBroadcastV4?.active||window.AMLiveEventV3?.active||null}
function resultRows(e,d){return Array.isArray(e?.results?.[d])?e.results[d]:[]}

function familyOf(d){
 const type=disciplineType(d),distance=disciplineDistance(d),text=`${d||''} ${disciplineLabel(d)}`.toLowerCase();
 if(/marathon|road\s*race|road\s*run/.test(text))return'ROAD_RACE';
 if(type==='height'||/high\s*jump|pole\s*vault|\bhj\b|\bpv\b/.test(text))return'VERTICAL_JUMP';
 if(/long\s*jump|triple\s*jump|\blj\b|\btj\b/.test(text))return'HORIZONTAL_JUMP';
 if(type==='time'&&distance>0)return distance>=800?'PACK_RACE':'LANE_RACE';
 if(/shot|discus|hammer|javelin|\bsp\b|\bdt\b|\bht\b|\bjt\b/.test(text))return'THROW';
 return type==='time'?'LANE_RACE':'FIELD';
}
function capabilityOf(d){const f=familyOf(d),text=`${d||''} ${disciplineLabel(d)}`.toLowerCase();return{family:f,relay:/relay|4x\d+/i.test(text)||!!disciplineDef(d)?.relay,hurdles:/hurd|steeple/i.test(text),wind:/100|200|hurd|long\s*jump|triple\s*jump|\blj\b|\btj\b/i.test(text)}}

function currentAttempt(c){return c?.seq?.[c?.i]||c?.seq?.at?.(-1)||null}
function currentFieldLeader(c){
 if(!c?.state)return null;
 try{
  const rows=[...c.state.values()];
  if(familyOf(c.d)==='VERTICAL_JUMP')return rows.sort((a,b)=>(b.H||0)-(a.H||0))[0]||null;
  return rows.filter(x=>num(x.best)!=null).sort((a,b)=>(b.best||0)-(a.best||0))[0]||null
 }catch(_){return null}
}
function finalLeader(e,d){return resultRows(e,d).find(r=>!(r?.dns||r?.dnf||r?.dq||r?.disqualified||r?.noHeight||r?.noMark))||resultRows(e,d)[0]||null}
function finalMark(row){return num(row?.mark??row?.perf??row?.result??row?.best)}

function primaryMetric(e,d,c){
 const family=familyOf(d),distance=disciplineDistance(d),final=finalLeader(e,d),finalValue=finalMark(final);
 if(c?.d===d){
  if(c.kind==='track'){
   const clock=num(c.state?.clock)??0,lead=num(c.state?.lead?.m)??0;
   if(family==='LANE_RACE'&&distance<=400)return{label:'RACE CLOCK',value:`${clock.toFixed(1)}s`};
   if(distance>0)return{label:'RACE PROGRESS',value:`${Math.max(0,Math.min(distance,Math.round(lead)))}m / ${distance}m`};
   return{label:'RACE CLOCK',value:`${clock.toFixed(1)}s`}
  }
  const q=currentAttempt(c),leader=currentFieldLeader(c);
  if(family==='VERTICAL_JUMP'){
   const h=num(q?.H)??num(leader?.H);
   return{label:'CURRENT HEIGHT',value:h!=null?formatPerformance(d,h):'READY'}
  }
  const liveMark=q&&!q.f&&c.phase==='res'?num(q.m):null,best=num(leader?.best),v=liveMark??best;
  return{label:family==='HORIZONTAL_JUMP'?'LEADING JUMP':'LEADING MARK',value:v!=null?formatPerformance(d,v):'READY'}
 }
 if(finalValue!=null)return{label:'OFFICIAL RESULT',value:formatPerformance(d,finalValue)};
 if(family==='PACK_RACE'||family==='ROAD_RACE')return{label:'DISTANCE',value:distance?`${distance}m`:'READY'};
 return{label:'EVENT STATUS',value:'READY'}
}

function readWind(e,d){
 const r=resultRows(e,d)[0]||{},candidates=[e?.wind,e?.conditions?.wind,e?.weather?.wind,e?.eventDayWind?.[d],e?.winds?.[d],r?.wind,r?.conditions?.wind];
 for(const v of candidates){const n=num(v);if(n!=null&&Math.abs(n)<20)return n}
 return null
}
function phaseText(c){const el=$('liveScoreboard')?.querySelector('[data-lv4-board-state]')||$('liveScoreboard')?.querySelector('header>span');return String(el?.textContent||'').trim()||(c?'LIVE':'READY')}
function roundText(e,d,c){
 const candidates=[e?.round?.[d],e?.round,e?.stage?.[d],e?.stage,e?.eventRound?.[d],e?.eventRound];
 for(const v of candidates)if(typeof v==='string'&&v.trim())return v.trim();
 const p=phaseText(c);return /final/i.test(p)?'Final':/semi/i.test(p)?'Semi-final':/heat/i.test(p)?'Heat':p||'Event'
}

function infoModel(e,d,c){
 const f=familyOf(d),phase=phaseText(c),wind=readWind(e,d),distance=disciplineDistance(d),q=currentAttempt(c);
 if(f==='LANE_RACE')return[['EVENT',disciplineLabel(d)],['ROUND',roundText(e,d,c)],[wind!=null?'WIND':'STATUS',wind!=null?`${wind>=0?'+':''}${wind.toFixed(1)} m/s`:phase]];
 if(f==='PACK_RACE'||f==='ROAD_RACE'){
  const lead=num(c?.state?.lead?.m)??0,remain=distance?Math.max(0,distance-lead):null;
  return[['EVENT',disciplineLabel(d)],['ROUND',roundText(e,d,c)],[remain!=null?'REMAINING':'STATUS',remain!=null?`${Math.round(remain)}m`:phase]]
 }
 if(f==='VERTICAL_JUMP')return[['EVENT',disciplineLabel(d)],['ROUND',roundText(e,d,c)],['CURRENT HEIGHT',q?.H!=null?formatPerformance(d,q.H):phase]];
 if(f==='HORIZONTAL_JUMP'||f==='THROW')return[['EVENT',disciplineLabel(d)],['ROUND',roundText(e,d,c)],['ATTEMPT',q?.a?`Round ${q.a}`:phase]];
 return[['EVENT',disciplineLabel(d)],['ROUND',roundText(e,d,c)],['STATUS',phase]]
}

function scoreHeadings(d){
 const f=familyOf(d);
 if(f==='LANE_RACE')return['POS','ATHLETE','LIVE / RESULT'];
 if(f==='PACK_RACE'||f==='ROAD_RACE')return['POS','ATHLETE','GAP / RESULT'];
 if(f==='VERTICAL_JUMP')return['POS','ATHLETE','BEST / HEIGHT'];
 if(f==='HORIZONTAL_JUMP')return['POS','ATHLETE','BEST JUMP'];
 if(f==='THROW')return['POS','ATHLETE','BEST MARK'];
 return['POS','ATHLETE','RESULT']
}
function syncScoreboard(d){
 const board=$('liveScoreboard');if(!board)return;
 const head=board.querySelector('.lv4-board-head');if(head){const labels=scoreHeadings(d),nodes=head.children;for(let i=0;i<Math.min(nodes.length,3);i++)nodes[i].textContent=labels[i]}
 board.dataset.lv5Family=familyOf(d)
}

function sourceAction(){
 const primary=$('v3start'),day=$('v3day'),dayText=String(day?.textContent||'').trim();
 if(day&&/RETURN HOME|RETURN TO GAME|COMPLETE EVENT/i.test(dayText))return day;
 if(primary&&!primary.disabled)return primary;
 return day||primary||null
}
function clickSource(source){if(!source||source.disabled)return;source.click()}
function playbackSource(value){return document.querySelector(`#liveEventVisual [data-speed="${value}"]`)}
function syncControls(){
 const c=liveState(),pauseProxy=document.querySelector('[data-lv5-pause]'),pauseSource=document.querySelector('#liveEventVisual [data-pause]');
 if(pauseProxy){pauseProxy.disabled=!c||!pauseSource;pauseProxy.textContent=c?.paused?'RESUME':'PAUSE'}
 document.querySelectorAll('[data-lv5-speed]').forEach(btn=>{const value=btn.dataset.lv5Speed,src=playbackSource(value);btn.disabled=!c||!src;btn.classList.toggle('on',!!src?.classList.contains('on'))});
 const skip=$('v4skip'),skipProxy=document.querySelector('[data-lv5-skip]');if(skipProxy){skipProxy.hidden=!skip;skipProxy.disabled=!skip||skip.disabled;skipProxy.textContent=skip?.textContent||'SKIP TO RESULT'}
}
function syncHeaderAction(){
 const proxy=document.querySelector('[data-lv5-action]'),src=sourceAction();if(!proxy)return;
 if(!src){proxy.hidden=true;return}
 proxy.hidden=false;proxy.disabled=!!src.disabled;
 const text=String(src.textContent||'CONTINUE').trim();
 proxy.innerHTML=`<span>${esc(text)}</span><b aria-hidden="true">→</b>`
}
function syncHeader(e,d,c){
 const metric=primaryMetric(e,d,c),metricLabel=document.querySelector('[data-lv5-metric-label]'),metricValue=document.querySelector('[data-lv5-metric-value]'),condition=document.querySelector('[data-lv5-condition]');
 if(metricLabel)metricLabel.textContent=metric.label;if(metricValue)metricValue.textContent=metric.value;
 if(condition){const w=readWind(e,d),cap=capabilityOf(d);condition.hidden=!(w!=null&&cap.wind);condition.textContent=w!=null?`Wind ${w>=0?'+':''}${w.toFixed(1)} m/s`:''}
 const eventName=document.querySelector('[data-lv5-event-name]'),round=document.querySelector('[data-lv5-round]');if(eventName)eventName.textContent=disciplineLabel(d);if(round)round.textContent=roundText(e,d,c)
}
function syncInfo(e,d,c){const root=document.querySelector('[data-lv5-event-info]');if(!root)return;const model=infoModel(e,d,c);root.innerHTML=model.map(([k,v])=>`<div><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('')}

function proxyControlsHTML(){return`<div class="lv5-side-controls" aria-label="Playback controls"><button type="button" data-lv5-pause>PAUSE</button><div class="lv5-speed-group"><button type="button" data-lv5-speed="1">1×</button><button type="button" data-lv5-speed="2">2×</button><button type="button" data-lv5-speed="4">4×</button></div></div><button class="lv5-skip" type="button" data-lv5-skip hidden>SKIP TO RESULT</button><div class="lv5-event-info" data-lv5-event-info></div>`}
function headerExtrasHTML(e,d){return`<div class="lv5-event-identity"><small>LIVE EVENT</small><strong data-lv5-event-name>${esc(disciplineLabel(d))}</strong><span data-lv5-round>${esc(roundText(e,d,liveState()))}</span></div><div class="lv5-primary-metric"><small data-lv5-metric-label>EVENT STATUS</small><strong data-lv5-metric-value>READY</strong></div><div class="lv5-condition" data-lv5-condition hidden></div><button class="lv5-primary-action" type="button" data-lv5-action><span>CONTINUE</span><b aria-hidden="true">→</b></button>`}

function wireShell(root){
 root.querySelector('[data-lv5-action]')?.addEventListener('click',()=>clickSource(sourceAction()));
 root.querySelector('[data-lv5-pause]')?.addEventListener('click',()=>document.querySelector('#liveEventVisual [data-pause]')?.click());
 root.querySelectorAll('[data-lv5-speed]').forEach(btn=>btn.addEventListener('click',()=>playbackSource(btn.dataset.lv5Speed)?.click()));
 root.querySelector('[data-lv5-skip]')?.addEventListener('click',()=>{const b=$('v4skip');if(b&&!b.disabled)b.click()})
}
function applyShell(e,d,ds){
 const competition=$('competition'),root=competition?.querySelector('.lv4event');if(!competition||!root)return false;
 const c=liveState();e=e||c?.e||context.event;d=d||c?.d||activeDisc()||context.disc;
 context={event:e||context.event,disc:d,disciplines:Array.isArray(ds)?ds:context.disciplines,appliedAt:Date.now()};
 if(!d)return false;
 document.body.classList.add('lv5-live-event-mode');root.classList.add('lv5event');root.dataset.lv5Family=familyOf(d);
 if(!root.dataset.lv5Shell){
  root.dataset.lv5Shell='1';
  const head=root.querySelector('.lv4-head'),grid=root.querySelector('.lv4-grid'),board=$('liveScoreboard');
  if(head){head.classList.add('lv5-head');head.insertAdjacentHTML('beforeend',headerExtrasHTML(context.event||{},d))}
  if(grid&&board){const sidebar=document.createElement('aside');sidebar.className='lv5-sidebar';sidebar.setAttribute('aria-label','Live event information');board.replaceWith(sidebar);sidebar.appendChild(board);sidebar.insertAdjacentHTML('beforeend',proxyControlsHTML());grid.appendChild(sidebar)}
  wireShell(root)
 }
 sync(context.event||{},d);
 return true
}
function sync(e=context.event||{},d=context.disc||activeDisc()){
 if(!d)return;
 const competition=$('competition'),raw=competition?.querySelector('.lv4event'),root=competition?.querySelector('.lv5event');
 if(raw&&!root){applyShell(liveState()?.e||e,liveState()?.d||d,context.disciplines);return}
 if(!root){document.body.classList.remove('lv5-live-event-mode');return}
 if(!competition.classList.contains('on')&&competition.offsetParent===null){document.body.classList.remove('lv5-live-event-mode');return}
 document.body.classList.add('lv5-live-event-mode');const c=liveState(),event=c?.e||e,disc=c?.d||d;root.dataset.lv5Family=familyOf(disc);syncHeader(event,disc,c);syncInfo(event,disc,c);syncScoreboard(disc);syncControls();syncHeaderAction()
}
function scheduleShell(e,d,ds){context={event:e||context.event,disc:d||activeDisc()||context.disc,disciplines:Array.isArray(ds)?ds:context.disciplines,appliedAt:context.appliedAt};requestAnimationFrame(()=>applyShell(context.event,context.disc,context.disciplines));setTimeout(()=>applyShell(context.event,context.disc,context.disciplines),0)}
function queueReapply(){
 if(shellApplyQueued)return;shellApplyQueued=true;
 const run=()=>{shellApplyQueued=false;const competition=$('competition'),raw=competition?.querySelector('.lv4event');if(!raw||raw.classList.contains('lv5event'))return;const c=liveState();applyShell(c?.e||context.event,c?.d||activeDisc()||context.disc,context.disciplines)};
 requestAnimationFrame(run);setTimeout(run,0)
}
function watchCompetition(){
 if(competitionObserver)return;const competition=$('competition');if(!competition||typeof MutationObserver==='undefined')return;
 competitionObserver=new MutationObserver(()=>queueReapply());competitionObserver.observe(competition,{childList:true});queueReapply()
}

function wrapGlobal(name,afterArgs){
 const original=window[name];if(typeof original!=='function'||original.__lv5Wrapped)return;
 const wrapped=function(...args){const out=original.apply(this,args);try{afterArgs(...args)}catch(err){console.warn('[Athletics Manager] Live Event Shell V5 presentation hook failed',err)}return out};
 wrapped.__lv5Wrapped=true;wrapped.__lv5Original=original;window[name]=wrapped;
 try{if(name==='drawDisciplineScreen')drawDisciplineScreen=wrapped;else if(name==='drawSummitDisciplineLive')drawSummitDisciplineLive=wrapped}catch(_){ }
}
wrapGlobal('drawDisciplineScreen',(e,_can,ds)=>scheduleShell(e,activeDisc()||ds?.[0],ds));
wrapGlobal('drawSummitDisciplineLive',()=>scheduleShell(liveState()?.e||context.event,activeDisc()||liveState()?.d,context.disciplines));
watchCompetition();

syncTimer=window.setInterval(()=>{try{sync()}catch(_){ }},120);
window.addEventListener('pagehide',()=>{window.clearInterval(syncTimer);try{competitionObserver?.disconnect()}catch(_){}},{once:true});

window.AMLiveEventShellV5={
 version:'5.0.1',
 get context(){return context},
 family:familyOf,
 capabilities:capabilityOf,
 apply(){return applyShell(context.event,context.disc,context.disciplines)},
 diagnostics(){const root=$('competition')?.querySelector('.lv5event'),d=liveState()?.d||context.disc||activeDisc();return{loaded:true,version:'5.0.1',active:!!root,discipline:d,family:d?familyOf(d):null,live:!!liveState(),simulationLayer:window.AMLiveBroadcastV4?.version||null,scoreboard:!!$('liveScoreboard'),commentary:!!$('commentary'),headerAction:!!document.querySelector('[data-lv5-action]'),sidebar:!!document.querySelector('.lv5-sidebar'),redrawObserver:!!competitionObserver}}
};
})();