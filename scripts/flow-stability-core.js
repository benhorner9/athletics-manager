/* ===== Flow Stability Core ===== */
(function(){
'use strict';
if(window.__amFlowStabilityCore)return;window.__amFlowStabilityCore=1;
const $=id=>document.getElementById(id),week=()=>Number(s?.game?.week)||1,season=()=>Number(s?.game?.season)||0;
function running(){return typeof disciplineRunning!=='undefined'&&!!disciplineRunning}
function activeDisc(){return liveEventView?.disc||activeEventDisc||null}
function eventForScreen(){const live=liveEventView?.event;if(live)return live;const d=activeDisc(),same=(s?.events||[]).filter(e=>Number(e.week)===week()&&['competition','championship','olympics','testing'].includes(e.kind));return same.find(e=>d&&Array.isArray(e.results?.[d]))||same.find(e=>!e.completed)||same.find(e=>e.completed)||null}
function resetScroll(){const el=$(currentView);if(el){el.scrollTop=0;el.scrollLeft=0}const c=document.querySelector('.content');if(c)c.scrollTop=0}
function button(label,fn,cls=''){const b=document.createElement('button');b.type='button';b.className=`btn ghost flow-event-exit ${cls}`.trim();b.textContent=label;b.onclick=fn;return b}
function ensureExit(){if(currentView!=='competition'||running())return;const root=$('competition');if(!root?.classList.contains('on'))return;const e=eventForScreen(),d=activeDisc(),right=root.querySelector('.matchday-scorebar-right');if(right&&!right.querySelector('[data-core-exit]')){const b=e?.completed?button('RETURN HOME →',()=>view('home'),'home-return'):button('EVENT DAY →',()=>{competitionMode='overview';drawCompetition()},'event-return');b.dataset.coreExit='1';right.appendChild(b)}const overview=root.querySelector('.event-programme-head,.event-day-brandline,.event-day-hero');if(overview&&e?.completed&&!overview.querySelector('[data-core-home]')){const b=button('RETURN HOME →',()=>view('home'),'home-return');b.dataset.coreHome='1';overview.appendChild(b)}}
function tidyCommentary(){const c=document.querySelector('#competition.on #commentary');if(!c)return;c.setAttribute('aria-live','polite');c.setAttribute('aria-atomic','false')}
function tidyAthlete(){const dialog=$('athleteProfile');if(!dialog?.open)return;const card=dialog.querySelector('.premium-athlete-profile .premium-rating-card');if(!card)return;card.classList.add('flow-rating-card');card.querySelectorAll('.premium-rating-facts>div').forEach(x=>{if(String(x.querySelector('small')?.textContent||'').trim().toLowerCase()==='development')x.remove()})}
function historyOkay(h){return /^(Appointed |Renewed with |Left |Moved with )/.test(String(h?.text||'').trim())}
if(typeof coachDossier==='function'){const base=coachDossier;coachDossier=function(c){const d=base(c);if(!d)return d;d.history=(d.history||[]).filter(h=>historyOkay(h)&&(Number(h?.season)||0)<=season()&&((Number(h?.season)||0)<season()||(Number(h?.week)||0)<=week()));return d}}
function audit(){ensureExit();tidyCommentary();tidyAthlete()}
if(typeof drawCompetition==='function'){const base=drawCompetition;drawCompetition=function(){const out=base();queueMicrotask(audit);return out}}
if(typeof drawAthleteProfile==='function'){const base=drawAthleteProfile;drawAthleteProfile=function(){const out=base.apply(this,arguments);queueMicrotask(tidyAthlete);return out}}
if(typeof view==='function'){const base=view;view=function(v){const out=base(v);queueMicrotask(()=>{resetScroll();audit()});return out}}
queueMicrotask(audit);
})();
/* ===== End Flow Stability Core ===== */