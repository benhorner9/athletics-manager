/* ===== Flow & Event Stability Batch ===== */
(function(){
'use strict';

const FLOW_STABILITY_VERSION=1;

function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function currentWeek(){return Number(s?.game?.week)||1}
function currentSeason(){return Number(s?.game?.season)||0}
function isRunning(){return typeof disciplineRunning!=='undefined'&&!!disciplineRunning}
function activeDisc(){return liveEventView?.disc||activeEventDisc||null}

function realEventForScreen(){
  const live=liveEventView?.event;
  if(live){
    const exact=(s?.events||[]).find(e=>e===live||e.id===live.id);if(exact)return exact;
  }
  const d=activeDisc(),week=currentWeek(),events=s?.events||[];
  const sameWeek=[...events].filter(e=>Number(e.week)===week&&['competition','championship','olympics','testing'].includes(e.kind));
  const withDisc=sameWeek.find(e=>d&&Array.isArray(e.results?.[d]));if(withDisc)return withDisc;
  const due=sameWeek.find(e=>!e.completed);if(due)return due;
  const completed=sameWeek.find(e=>e.completed);if(completed)return completed;
  try{return typeof currentEvent==='function'?currentEvent():null}catch(_){return null}
}

/* ---------- Home flow / clipping ---------- */
function tidyHome(){
  const root=document.getElementById('home');if(!root?.classList.contains('on'))return;
  root.querySelectorAll('.template-hero-athlete').forEach(el=>el.remove());
  const visual=root.querySelector('.template-hero-visual');
  if(visual&&!visual.querySelector('.flow-hero-eventmark')){
    const e=typeof nextEvent==='function'?nextEvent():null;
    const mark=document.createElement('div');mark.className='flow-hero-eventmark';
    mark.innerHTML=`<small>ATHLETICS MANAGER</small><strong>${esc(e?.level||'National Programme')}</strong><span>${esc(e?.location||'Season planning')} • Week ${esc(e?.week||currentWeek())}</span>`;
    visual.appendChild(mark);
  }
  root.querySelectorAll('.template-hero-chips button').forEach(btn=>{
    const actionable=!!(btn.dataset.homeRoute||btn.dataset.homeMail||btn.dataset.homeSelection||btn.hasAttribute('data-home-onboarding'));
    if(!actionable){btn.disabled=true;btn.setAttribute('aria-disabled','true')}
  });
  const dashboard=root.querySelector('.template-home-dashboard');if(dashboard)dashboard.classList.add('flow-home-audited');
}

/* ---------- Stable live race position renderer ---------- */
const OVAL={cx:380,cy:228,innerRx:220,innerRy:108,laneWidth:10.5};
function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0))}
function distanceOf(d){return Number(DISCIPLINES?.[d]?.distance)||0}
function laneGeom(lane){const rx=OVAL.innerRx+(lane-.5)*OVAL.laneWidth,ry=OVAL.innerRy+(lane-.5)*OVAL.laneWidth,h=Math.pow(rx-ry,2)/Math.pow(rx+ry,2),circ=Math.PI*(rx+ry)*(1+(3*h)/(10+Math.sqrt(4-3*h)));return {rx,ry,circ}}
function lanePoint(distance,lane,metres){const lane1=laneGeom(1),g=laneGeom(lane),ratio=g.circ/lane1.circ,courseEquivalent=400*ratio,span=Math.min(Math.PI*2,(distance/courseEquivalent)*Math.PI*2),finish=-Math.PI/2,start=finish-span,p=Math.max(0,Math.min(1.04,(Number(metres)||0)/distance)),angle=start+span*p;return {x:OVAL.cx+Math.cos(angle)*g.rx,y:OVAL.cy+Math.sin(angle)*g.ry}}
function packPoint(distance,row,metres,index){const startOffset=(400-(distance%400))%400,merge=distance===800?clamp01((Number(metres)||0)/140):1,lane=Number(row?.lane)||1,stagger=distance===800?(lane-1)*3.7*(1-merge):0,course=startOffset+(Number(metres)||0)+stagger,radial=distance===800?(lane-1)*OVAL.laneWidth*(1-merge)+(index%3-1)*3*merge:(index%3-1)*3.2,angle=-Math.PI/2+Math.PI*2*(course/400),rx=OVAL.innerRx+7+radial,ry=OVAL.innerRy+7+radial*.48;return {x:OVAL.cx+Math.cos(angle)*rx,y:OVAL.cy+Math.sin(angle)*ry}}
function straightPoint(distance,lane,metres){const left=60,right=700,top=48,laneH=42,y=top+(lane-1)*laneH,x=left+(right-left)*Math.max(0,Math.min(1.025,(Number(metres)||0)/distance));return {x,y}}
function trackPoint(d,row,metres,index){const distance=distanceOf(d);if(distance===100)return straightPoint(distance,Number(row?.lane)||index+1,metres);if(distance<=400)return lanePoint(distance,Number(row?.lane)||index+1,metres);return packPoint(distance,row,metres,index)}
function syncTrackMotion(){
  if(currentView!=='competition'||!isRunning())return;
  const track=liveEventView?.trackOverhaulV4,d=liveEventView?.disc;if(!track||!d)return;
  const stage=track.stages?.[track.stageIndex]||track.stages?.[0],root=document.querySelector('#liveEventVisual [data-track-race-v4]');if(!stage||!root)return;
  let items=track.state?.items;
  if(!Array.isArray(items)||!items.length){const order=stage.startOrder||stage.rows||[];items=order.map((row,index)=>({row,metres:0,index,position:index+1}))}
  const byId=new Map(items.map((item,index)=>[String(item.row?.id),{...item,index}]));
  root.querySelectorAll('[data-track-runner]').forEach(g=>{
    const item=byId.get(String(g.getAttribute('data-track-runner')));if(!item)return;
    const pt=trackPoint(d,item.row,item.metres,item.index);g.setAttribute('transform',`translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`)
  });
  const distance=distanceOf(d),leader=Math.max(0,...items.map(x=>Math.min(distance,Number(x.metres)||0))),distanceEl=root.querySelector('[data-track-distance]');
  if(distanceEl)distanceEl.textContent=track.state?.allFinished?`FINISH • ${distance}m`:`${Math.round(leader)}m / ${distance}m`;
}
function animationGuard(){syncTrackMotion();document.querySelectorAll('#liveScoreboard .uls-row.changed').forEach(el=>el.classList.remove('changed'));requestAnimationFrame(animationGuard)}
requestAnimationFrame(animationGuard);

/* ---------- Event flow / exit controls ---------- */
function eventExitButton(label,handler,extra=''){
  const btn=document.createElement('button');btn.type='button';btn.className=`btn ghost flow-event-exit ${extra}`.trim();btn.textContent=label;btn.onclick=handler;return btn
}
function goEventOverview(){competitionMode='overview';drawCompetition()}
function ensureEventFlow(){
  if(currentView!=='competition')return;
  const root=document.getElementById('competition');if(!root?.classList.contains('on'))return;
  const running=isRunning(),e=realEventForScreen(),d=activeDisc(),match=root.querySelector('.fm2d-matchday');
  if(match){
    const right=match.querySelector('.matchday-scorebar-right');if(right){
      right.querySelectorAll('.flow-event-exit').forEach(x=>x.remove());
      if(!running){
        if(e?.completed)right.appendChild(eventExitButton('RETURN HOME →',()=>view('home'),'home-return'));
        else if(e&&d&&Array.isArray(e.results?.[d]))right.appendChild(eventExitButton('EVENT DAY →',goEventOverview,'event-return'));
        else right.appendChild(eventExitButton('HOME',()=>view('home'),'home-return'));
      }
    }
    const topBack=match.querySelector('.matchday-back');if(topBack&&!running){topBack.title=e?.completed?'Return to Home':'Back to Event Day';topBack.setAttribute('aria-label',e?.completed?'Return to Home':'Back to Event Day');if(e?.completed)topBack.onclick=()=>view('home')}
  }
  const overview=root.querySelector('.event-day-shell');
  if(overview){
    const hero=overview.querySelector('.event-day-brandline')||overview.querySelector('.event-day-hero');
    if(hero&&!hero.querySelector('.flow-overview-home'))hero.appendChild(eventExitButton(e?.completed?'RETURN HOME →':'HOME',()=>view('home'),'flow-overview-home'));
  }
  const intro=root.querySelector('.major-intro');
  if(intro&&!intro.querySelector('[data-flow-home]')){
    const actions=intro.querySelector('.major-intro-actions');if(actions){const btn=eventExitButton('HOME',()=>view('home'));btn.dataset.flowHome='1';actions.appendChild(btn)}
  }
}

/* ---------- Commentary ---------- */
function tidyCommentary(){
  const commentary=document.querySelector('#competition.on #commentary');if(!commentary)return;
  commentary.setAttribute('aria-live','polite');commentary.setAttribute('aria-atomic','false');
  commentary.querySelectorAll('.template-commentary-line p').forEach(p=>p.removeAttribute('title'));
}

/* ---------- Athlete rating overlap ---------- */
function tidyAthleteRating(){
  const dialog=document.getElementById('athleteProfile');if(!dialog?.open)return;
  const card=dialog.querySelector('.premium-athlete-profile .premium-rating-card');if(!card)return;
  card.classList.add('flow-rating-card');
  card.querySelectorAll('.premium-rating-facts>div').forEach(fact=>{if(String(fact.querySelector('small')?.textContent||'').trim().toLowerCase()==='development')fact.remove()});
}

/* ---------- Gameplay-only coaching history ---------- */
function historyIsGameplay(h){const t=String(h?.text||'').trim();return /^(Appointed |Renewed with |Left |Moved with )/.test(t)}
function cleanCoachDossier(d){
  if(!d)return d;
  if(d.gameplayHistoryVersion!==1){d.history=(d.history||[]).filter(historyIsGameplay);d.gameplayHistoryVersion=1}
  d.history=(d.history||[]).filter(h=>{const season=Number(h?.season)||0,week=Number(h?.week)||0;return season<currentSeason()||(season===currentSeason()&&week<=currentWeek())});
  const clean={};
  for(const [key,r] of Object.entries(d.results||{})){
    const season=Number(r?.season)||0,week=Number(r?.week)||0;if(season>currentSeason()||(season===currentSeason()&&week>currentWeek()))continue;
    if(season===currentSeason()){
      const disc=String(key).split(':').at(-1),event=(s?.events||[]).find(e=>e.name===r?.event&&Number(e.week)===week);
      if(!event||!Array.isArray(event.results?.[disc]))continue;
    }
    clean[key]=r;
  }
  d.results=clean;return d
}
if(typeof coachDossier==='function'){
  const previousCoachDossier=coachDossier;
  coachDossier=function(c){return cleanCoachDossier(previousCoachDossier(c))}
}
function cleanGlobalCoachHistory(){if(Array.isArray(s?.coachHistory))s.coachHistory=s.coachHistory.filter(x=>(Number(x?.week)||0)<=coachWeek())}
function tidyCoachProfile(id){
  cleanGlobalCoachHistory();let d=null;try{const c=Object.values(s?.coaches||{}).find(c=>c?.id===id)||managementState()?.coachArchive?.[id];if(c)d=coachDossier(c)}catch(_){}
  const dialog=document.getElementById('managementProfile');if(!dialog?.open||!d)return;
  const career=[...dialog.querySelectorAll('.profile-panel')].find(p=>/coaching career/i.test(p.querySelector('h2')?.textContent||''));if(!career)return;
  career.querySelectorAll('.flow-empty-coach-history').forEach(x=>x.remove());
  if(!(d.history||[]).length){const h2=career.querySelector('h2'),p=document.createElement('p');p.className='flow-empty-coach-history';p.textContent='No coaching history has been recorded in this career yet. Appointments, renewals, departures and results will appear here as they actually happen.';h2?.insertAdjacentElement('afterend',p)}
}

/* ---------- Screen-to-screen flow ---------- */
function resetActiveView(){
  const active=document.getElementById(currentView);if(active){try{active.scrollTo({top:0,left:0,behavior:'auto'})}catch(_){active.scrollTop=0}}
  try{document.querySelector('.content')?.scrollTo?.({top:0,left:0,behavior:'auto'})}catch(_){}
}
function auditCurrentScreen(){tidyHome();ensureEventFlow();tidyCommentary();tidyAthleteRating()}

const previousDrawHome=drawHome;
drawHome=function(){previousDrawHome();queueMicrotask(()=>{tidyHome();resetActiveView()})};
const previousDrawCompetition=drawCompetition;
drawCompetition=function(){previousDrawCompetition();queueMicrotask(()=>{ensureEventFlow();tidyCommentary()})};
const previousDrawAthleteProfile=drawAthleteProfile;
drawAthleteProfile=function(){previousDrawAthleteProfile();queueMicrotask(tidyAthleteRating)};
const previousOpenCoachProfile=openCoachProfile;
openCoachProfile=function(id){previousOpenCoachProfile(id);queueMicrotask(()=>tidyCoachProfile(id))};
const previousView=view;
view=function(v){previousView(v);queueMicrotask(()=>{resetActiveView();auditCurrentScreen()})};

cleanGlobalCoachHistory();queueMicrotask(auditCurrentScreen);

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Flow & Event Stability'))UPDATES.unshift({date:'9 September 2026',title:'Flow & Event Stability',items:[
  'Removed the athlete portrait from the Home hero and tightened dashboard card flow so long event, briefing and status text wraps instead of clipping.',
  'Stabilised the live event presentation: track athletes are kept in sync with the continuous race state, live standings no longer flash on position changes, and commentary is larger and easier to read.',
  'Completed events now provide a clear Return Home route, while completed disciplines return cleanly to Event Day and every full-screen competition state keeps an explicit exit path.',
  'Athlete rating cards no longer duplicate or overlap Development information, and coach histories now contain only appointments, renewals, departures and competition results that actually happened in the save.',
  'Audited screen transitions and reset behaviour so navigation starts at the top of the destination and the normal rail/mobile navigation resumes immediately outside Event Day.'
]});
if(typeof renderMenu==='function')renderMenu();
window.__athleticsFlowStability={version:FLOW_STABILITY_VERSION,audit:auditCurrentScreen,syncTrackMotion};
})();
/* ===== End Flow & Event Stability Batch ===== */
