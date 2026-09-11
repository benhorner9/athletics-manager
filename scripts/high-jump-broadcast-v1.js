/* ===== High Jump Broadcast Highlights V1 ===== */
(function(){
'use strict';
if(window.__amHighJumpBroadcastV1)return;window.__amHighJumpBroadcastV1=1;

const modes=new Map();
let monitorRaf=0,lastLive=null,lastIndex=-1;
const $=id=>document.getElementById(id);
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'');
const athlete=id=>(s?.athletes||[]).find(a=>String(a.id)===String(id));
const isHJ=d=>/high\s*jump/i.test(String(DISCIPLINES?.[d]?.label||''))||/HJ$/i.test(String(d||''));
const eventKey=(e,d)=>`${e?._v3Summit?'summit:'+String(e._v3Summit.number||''):'event:'+String(e?.id||e?.name||'')}|${d}`;
const fmt=(d,v)=>{try{return fmtPerf(d,v)}catch(_){return Number(v).toFixed(2)+'m'}};
const own=q=>{try{return q?.r?.nation===managedNation()}catch(_){return false}};

const css=`
#liveEventVisual[data-hj-mode="highlights"]{position:relative}
#liveEventVisual[data-hj-mode="highlights"]::before,
#liveEventVisual[data-hj-mode="highlights"]::after{position:absolute;left:14px;z-index:20;pointer-events:none;border-radius:7px;box-shadow:0 7px 20px #0006}
#liveEventVisual[data-hj-mode="highlights"]::before{content:attr(data-hj-label);top:62px;padding:8px 11px 3px;background:#071722e8;color:#f4fbff;font-size:12px;font-weight:950;letter-spacing:.01em;border:1px solid #31546a;border-bottom:0;border-radius:7px 7px 0 0}
#liveEventVisual[data-hj-mode="highlights"]::after{content:attr(data-hj-stakes);top:88px;padding:3px 11px 8px;background:#071722e8;color:#7edcff;font-size:8px;font-weight:950;letter-spacing:.08em;border:1px solid #31546a;border-top:0;border-radius:0 0 7px 7px;text-transform:uppercase}
.v3foot .am-hj-full{white-space:nowrap}
@media(max-width:650px){#liveEventVisual[data-hj-mode="highlights"]::before{top:56px;left:9px;font-size:10px;padding:7px 9px 2px}#liveEventVisual[data-hj-mode="highlights"]::after{top:79px;left:9px;font-size:7px;padding:3px 9px 7px}.v3foot .am-hj-full{white-space:normal}}
`;
if(!document.getElementById('amHJBroadcastStyles')){const st=document.createElement('style');st.id='amHJBroadcastStyles';st.textContent=css;document.head.appendChild(st)}

function recordHidden(c,q){
 const st=c?.state?.get(String(q?.r?.id));if(!st||!q)return;
 let marks=st.hm.get(q.H)||[];marks.push(q.o);st.hm.set(q.H,marks);
 if(q.o==='X')st.miss++;
 if(q.o==='O')st.H=Math.max(st.H,q.H);
}
function addLine(c,text){
 if(!c||c.comments?.some(x=>x.text===text))return;
 c.comments??=[];c.comments.push({text,big:false,time:'HIGHLIGHTS'});
 c.e.commentary??={};c.e.commentary[c.d]=c.comments.map(x=>x.text);
}
function buildPlan(c){
 const all=(c.seq||[]).slice(),actual=[];
 all.forEach((q,i)=>{if(q&&['O','X'].includes(q.o))actual.push(i)});
 if(actual.length<=8)return null;
 const heights=[...new Set(all.filter(q=>q&&Number.isFinite(+q.H)).map(q=>+q.H))].sort((a,b)=>a-b);
 const topHeights=new Set(heights.slice(-2));
 const halfway=heights[Math.max(0,Math.floor(heights.length*.55))]??-Infinity;
 const maxOverall=Math.max(0,...c.rr.map(r=>Number(athlete(r.id)?.overall)||0));
 const keep=new Set(),meta=new Map();let leader=0;
 const firstActual=actual[0];if(firstActual!=null)keep.add(firstActual);
 for(let i=0;i<all.length;i++){
  const q=all[i];if(!q||!['O','X'].includes(q.o))continue;
  const a=athlete(q.r.id),reasons=[];
  const finalAttempt=q.a===3;
  const elimination=finalAttempt&&q.o==='X';
  const pb=Number(a?.pb),pbAttempt=Number.isFinite(pb)&&q.H>pb+.001;
  const closing=topHeights.has(+q.H);
  const contender=(Number(a?.overall)||0)>=maxOverall-2&&q.H>=halfway;
  const leadChange=q.o==='O'&&q.H>leader+.001&&q.H>=halfway;
  if(elimination)reasons.push('MISS = ELIMINATED');
  else if(finalAttempt)reasons.push('FINAL ATTEMPT');
  if(pbAttempt)reasons.push('PB ATTEMPT');
  if(own(q))reasons.push('YOUR ATHLETE');
  if(leadChange)reasons.push('CLEAR = LEAD');
  if(closing)reasons.push('KEY HEIGHT');
  if(contender&&q.o==='X'&&!reasons.length)reasons.push('CONTENDER UNDER PRESSURE');
  if(own(q)||finalAttempt||pbAttempt||closing||leadChange||(contender&&q.o==='X'))keep.add(i);
  if(reasons.length)meta.set(i,reasons.slice(0,2));
  if(q.o==='O')leader=Math.max(leader,q.H);
 }
 const target=Math.min(actual.length,Math.max(7,Math.ceil(actual.length*.28)));
 if(keep.size<target){
  const candidates=actual.filter(i=>!keep.has(i));
  while(keep.size<target&&candidates.length){
   const pos=Math.floor((keep.size/target)*candidates.length);
   keep.add(candidates.splice(Math.min(pos,candidates.length-1),1)[0]);
  }
 }
 const indices=[...keep].filter(i=>actual.includes(i)).sort((a,b)=>a-b);
 if(indices.length>=actual.length)return null;
 const visible=indices.map(i=>all[i]),before=[],applied=new Set();let prev=-1;
 indices.forEach((idx,k)=>{before[k]=all.slice(prev+1,idx);prev=idx});
 const tail=all.slice(prev+1);
 return{all,indices,visible,before,tail,meta,applied,hidden:all.length-visible.length};
}
function applyGap(c,k){
 const p=c.__amHJ;if(!p||p.applied.has(k))return;
 (p.before[k]||[]).forEach(q=>recordHidden(c,q));p.applied.add(k);
}
function applyTail(c){const p=c.__amHJ;if(!p||p.tailApplied)return;(p.tail||[]).forEach(q=>recordHidden(c,q));p.tailApplied=true}
function reasonFor(c,q,k){
 const p=c.__amHJ,original=p?.indices?.[k],reasons=p?.meta?.get(original)||[];
 if(reasons.length)return reasons.join(' · ');
 return `ATTEMPT ${q?.a||1} · KEY JUMP`;
}
function decorateLive(c){
 const root=$('liveEventVisual');if(!root||!c?.__amHJ)return;
 const q=c.seq?.[Math.min(c.i,c.seq.length-1)];
 root.dataset.hjMode='highlights';
 root.dataset.hjLabel=q?`${q.r.name} · ${fmt(c.d,q.H)}`:'High Jump';
 root.dataset.hjStakes=q?reasonFor(c,q,Math.min(c.i,c.seq.length-1)):'Highlights';
 const top=root.querySelector('.v3top small');if(top)top.textContent='KEY ATTEMPT';
 const badge=root.querySelector('.v3top>b');if(badge)badge.textContent='HIGHLIGHTS';
 const counter=root.querySelector('.v3controls>span');if(counter)counter.textContent=`Highlight ${Math.min(c.i+1,c.seq.length)}/${c.seq.length}`;
}
function clearLiveDecor(){const root=$('liveEventVisual');if(!root)return;delete root.dataset.hjMode;delete root.dataset.hjLabel;delete root.dataset.hjStakes}
function monitor(){
 monitorRaf=0;const c=window.AMLiveEventV3?.active;
 if(!c?.__amHJ){lastLive=null;lastIndex=-1;clearLiveDecor();return}
 if(c!==lastLive){lastLive=c;lastIndex=-1}
 if(c.i!==lastIndex){if(c.i<c.seq.length)applyGap(c,c.i);else applyTail(c);lastIndex=c.i}
 decorateLive(c);
 monitorRaf=requestAnimationFrame(monitor);
}
function kickMonitor(){if(!monitorRaf)monitorRaf=requestAnimationFrame(monitor)}
function setupHighlights(e,d){
 const c=window.AMLiveEventV3?.active;if(!c||c.kind!=='field'||c.d!==d||!isHJ(d))return;
 const chosen=modes.get(eventKey(e,d))||'highlights';modes.delete(eventKey(e,d));
 if(chosen==='full'){c.__amHJFull=true;clearLiveDecor();return}
 const p=buildPlan(c);if(!p)return;
 c.__amHJ=p;c.seq=p.visible;c.i=0;c.phase='prep';c.t=0;c.intro=Math.min(c.intro,.7);applyGap(c,0);
 addLine(c,`Gavin Potts — We'll pick up the key attempts.`);
 kickMonitor();
}
function decorateReady(e,can,ds){
 const d=typeof activeEventDisc!=='undefined'?(activeEventDisc||ds?.[0]):ds?.[0];if(!d||!isHJ(d))return;
 const active=window.AMLiveEventV3?.active;if(active?.d===d){if(active.__amHJ)kickMonitor();return}
 if(Array.isArray(e?.results?.[d])||!can)return;
 const start=$('v3start');if(!start||start.disabled)return;
 start.textContent='WATCH HIGHLIGHTS';
 start.title='Watch key High Jump attempts';
 const host=start.parentElement;if(!host||host.querySelector('[data-hj-full]'))return;
 const full=document.createElement('button');full.type='button';full.className='btn ghost am-hj-full';full.dataset.hjFull='1';full.textContent='WATCH FULL EVENT';
 full.onclick=()=>{modes.set(eventKey(e,d),'full');if(e._v3Summit)startSummitDiscipline(e._v3Summit,d);else startDiscipline(e,d)};
 host.appendChild(full);
}

const baseStart=startDiscipline;
startDiscipline=function(e,d){const out=baseStart.apply(this,arguments);if(isHJ(d))setupHighlights(e,d);return out};
if(typeof startSummitDiscipline==='function'){
 const baseSummitStart=startSummitDiscipline;
 startSummitDiscipline=function(m,d){let e;try{e=summitProxy(m);e._v3Summit=m}catch(_){e={_v3Summit:m,id:'summit-'+(m?.number||'')}}const out=baseSummitStart.apply(this,arguments);if(isHJ(d))setupHighlights(e,d);return out};
}
if(typeof drawDisciplineScreen==='function'){
 const baseDraw=drawDisciplineScreen;
 drawDisciplineScreen=function(e,can,ds){const out=baseDraw.apply(this,arguments);queueMicrotask(()=>decorateReady(e,can,ds));return out};
}
const competition=$('competition');if(competition)new MutationObserver(()=>{const c=window.AMLiveEventV3?.active;if(c?.__amHJ)kickMonitor()}).observe(competition,{childList:true,subtree:true});

try{
 const update={timestamp:'2026-09-10T14:40:00+01:00',date:'10 September 2026',title:'High Jump Broadcast Highlights',items:[
  'High Jump now defaults to highlights coverage: every managed-athlete jump plus third attempts, eliminations, lead-changing clearances, PB attempts and the closing heights.',
  'Routine attempts are still simulated and count toward the official result, but they can pass off-camera so the event reaches the decisive heights much faster.',
  'Key attempts now carry a compact stakes graphic, including final-attempt, elimination, PB and lead-change pressure.',
  'Watch Full Event remains available for players who want every High Jump attempt shown.'
 ]};
 if(Array.isArray(UPDATES)&&!UPDATES.some(x=>x?.title===update.title)){UPDATES.unshift(update);if(UPDATES.length>5)UPDATES.splice(5);if(typeof renderMenu==='function')renderMenu()}
}catch(_){ }

window.__athleticsHighJumpBroadcast={version:1};
})();
/* ===== End High Jump Broadcast Highlights V1 ===== */
