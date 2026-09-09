/* ===== Selection + Summit Reliability ===== */
(function(){
'use strict';
const $=x=>document.getElementById(x);
const managed=()=>typeof managedNation==='function'?managedNation():'';
const athlete=id=>(s?.athletes||[]).find(a=>a.id===id)||null;
function ensureWorldSummitRoster(d){
 if(typeof summitSeasonState!=='function'||typeof SUMMIT_WEEKS==='undefined')return [];
 const ss=summitSeasonState();ss.worldSeriesEntries??={};
 if(Array.isArray(ss.worldSeriesEntries[d])&&ss.worldSeriesEntries[d].length)return ss.worldSeriesEntries[d];
 const historic=(typeof summitMeetings==='function'?summitMeetings():[]).map(m=>m?.fields?.[d]).find(ids=>Array.isArray(ids)&&ids.some(id=>athlete(id)?.nation!==managed()));
 if(historic){ss.worldSeriesEntries[d]=historic.filter(id=>athlete(id)?.nation!==managed()).slice(0,8);save();return ss.worldSeriesEntries[d]}
 const own=(ss.seriesEntries||[]).map(athlete).filter(a=>a&&a.disc===d).length,need=Math.max(0,8-own);
 const pool=(s?.athletes||[]).filter(a=>!a.retired&&a.nation!==managed()&&a.disc===d).sort((a,b)=>performanceScore(b)-performanceScore(a)||String(a.name).localeCompare(String(b.name)));
 const picked=[],nationCount={};
 for(const a of pool){if((nationCount[a.nation]||0)>=2)continue;picked.push(a.id);nationCount[a.nation]=(nationCount[a.nation]||0)+1;if(picked.length>=need)break}
 ss.worldSeriesEntries[d]=picked;save();return picked
}
function ensureAllWorldSummitRosters(){if(typeof SUMMIT_WEEKS==='undefined'||s.game.week<+SUMMIT_WEEKS[0]||s.game.week>+SUMMIT_WEEKS.at(-1))return;for(const d of Object.keys(DISCIPLINES||{}))ensureWorldSummitRoster(d)}
function summitCommitted(a,week){
 if(!a||typeof summitSeasonState!=='function'||typeof SUMMIT_WEEKS==='undefined')return false;
 const ss=summitSeasonState(),first=+SUMMIT_WEEKS[0],last=+SUMMIT_WEEKS.at(-1),w=+week;
 if(w<first||w>last)return false;
 if(ss?.seriesEntries?.includes(a.id))return true;
 if(a.nation!==managed()&&!Array.isArray(ss?.worldSeriesEntries?.[a.disc]))ensureWorldSummitRoster(a.disc);
 return Object.values(ss?.worldSeriesEntries||{}).some(ids=>Array.isArray(ids)&&ids.includes(a.id))
}
if(typeof activityBusy==='function'){const base=activityBusy;activityBusy=function(a,w=s.game.week){return base(a,w)||summitCommitted(a,w)}}
if(typeof eligibleFor==='function'){const base=eligibleFor;eligibleFor=function(e,d){return base(e,d).filter(a=>!summitCommitted(a,e?.week??s.game.week))}}
if(typeof summitField==='function'){
 summitField=function(m,d){
  const ss=summitSeasonState(),own=summitEntriesForDisc(m,d).filter(a=>a.injury===0&&!a.camp),world=ensureWorldSummitRoster(d).map(athlete).filter(a=>a&&!a.retired&&a.disc===d&&a.injury===0&&!a.camp),field=[...own,...world].slice(0,8);
  m.fields[d]=field.map(a=>a.id);return field
 }
}
if(typeof summitRegistrationOpen==='function'){const base=summitRegistrationOpen;summitRegistrationOpen=function(){return !summitSeasonState()?.registrationLocked&&base()}}
function summitMail(){return [...(s?.emails||[])].reverse().find(m=>m?.summitRegistration)||null}
let explicit=false;
if(typeof lockSelectionMail==='function'){
 const base=lockSelectionMail;window.__amBaseLockSelectionMail=base;
 lockSelectionMail=function(m,snap,label){const e=m?.eventId?(s.events||[]).find(x=>x.id===m.eventId):null;if(!explicit&&m?.type==='selection'&&!m?.summitRegistration&&e&&!e.completed&&e.week>=s.game.week)return;base(m,snap,label);if(explicit&&m){m.selectionSubmittedSource='confirmed';save()}}
}
function withLock(fn){explicit=true;try{return fn()}finally{explicit=false}}
if(typeof confirmEventSelection==='function'){const base=confirmEventSelection;confirmEventSelection=function(e){return withLock(()=>{const ok=base(e);if(ok){const m=(s.emails||[]).find(x=>x.id===openMail)||[...(s.emails||[])].reverse().find(x=>x.type==='selection'&&x.eventId===e?.id);if(m){m.selectionSubmittedSource='confirmed';save()}}return ok})}}
function lockSummit(label,source='player'){const m=summitMail();if(!m)return;const snap=typeof summitSubmissionSnapshot==='function'?summitSubmissionSnapshot():[];const base=window.__amBaseLockSelectionMail||lockSelectionMail;withLock(()=>base(m,snap,label));m.selectionSubmittedSource=source;save()}
if(typeof applyRecommendedSummitSelection==='function'){
 const base=applyRecommendedSummitSelection;
 applyRecommendedSummitSelection=function(){return withLock(()=>{const ok=base();if(ok){const ss=summitSeasonState();ss.registrationLocked=true;lockSummit('Coach-recommended Summit roster submitted','coach');save();if(currentView==='league')drawSummitSeries();if(currentView==='inbox')drawReader()}return ok})}
}
function submitSummit(){const ss=summitSeasonState();if(ss.registrationLocked)return;if(!(ss.seriesEntries||[]).length){toast('Select at least one athlete before submitting the Summit roster');return}ss.registrationLocked=true;lockSummit('Summit Series roster submitted');save();toast('Summit roster submitted and locked');drawSummitSeries();if(currentView==='inbox')drawReader()}
function enhanceSummit(){if(currentView!=='league'||typeof summitSeasonState!=='function')return;const root=$('league'),ss=summitSeasonState(),roster=root?.querySelector('.summit-series-roster');if(!roster)return;if(ss.registrationLocked){if(!roster.querySelector('.am-summit-locked'))roster.querySelector('.summit-series-roster-head')?.insertAdjacentHTML('afterend','<div class="am-summit-locked"><strong>ROSTER SUBMITTED</strong><span>Locked through the final Series meeting.</span></div>');root.querySelectorAll('[data-summit-entry]').forEach(b=>b.disabled=true);return}if(summitRegistrationOpen()&&!$('summitSubmitRoster')){const box=document.createElement('div');box.className='am-summit-submit';box.innerHTML='<button id="summitSubmitRoster" class="btn primary">SUBMIT & LOCK ROSTER</button><span>Submitted athletes cannot enter another competition until the Series ends.</span>';roster.appendChild(box);$('summitSubmitRoster').onclick=submitSummit}}
if(typeof drawSummitSeries==='function'){const base=drawSummitSeries;drawSummitSeries=function(){base();queueMicrotask(enhanceSummit)}}
function ensureSummitMail(){if(typeof summitSeasonState!=='function'||typeof SUMMIT_WEEKS==='undefined'||typeof sendSummitRegistrationOpeningEmail!=='function')return;const ss=summitSeasonState(),first=+SUMMIT_WEEKS[0];if(ss.registrationLocked||s.game.week<8||s.game.week>=first)return;if(!ss.registrationOpeningMailSent)sendSummitRegistrationOpeningEmail();if(s.game.week>=Math.max(9,first-3)&&!ss.registrationReminderSent){ss.registrationReminderSent=true;const mid=newMail(sender('performance'),'Summit Series registration reminder',`Registration remains open until Week ${first}. A submitted roster is committed to all six meetings and cannot enter another competition during the Series.`,'selection'),m=s.emails.find(x=>x.id===mid);if(m){m.summitRegistration=true;if(typeof summitRegistrationMailHTML==='function')m.html=summitRegistrationMailHTML()}save()}}
if(typeof onWeekStart==='function'){const base=onWeekStart;onWeekStart=function(){ensureAllWorldSummitRosters();base();ensureAllWorldSummitRosters();ensureSummitMail()}}
function selectionActions(){const reader=$('reader'),m=(s?.emails||[]).find(x=>x.id===openMail)||s?.emails?.at?.(-1);if(!reader||!m)return;const e=m.eventId?(s.events||[]).find(x=>x.id===m.eventId):null;if(m.selectionSubmitted&&!m.selectionSubmittedSource&&e&&!e.completed&&!e.decision){delete m.selectionSubmitted;delete m.selectionSubmittedLabel;delete m.selectionSubmittedSnapshot;save();queueMicrotask(()=>drawReader());return}const actions=reader.querySelector('.reader-actions');if(!actions||m.selectionSubmitted)return;if(m.summitRegistration){let b=$('selectAllSummitRecommended');if(!b){b=document.createElement('button');b.id='selectAllSummitRecommended';b.className='btn recommended-picks';actions.prepend(b)}b.textContent='USE COACH RECOMMENDATION';b.disabled=!summitRegistrationOpen();b.onclick=()=>applyRecommendedSummitSelection();return}if(m.type!=='selection'||!e||e.completed||!['competition','championship'].includes(e.kind))return;let b=$('selectAllRecommended');if(!b){b=document.createElement('button');b.id='selectAllRecommended';b.className='btn recommended-picks';const c=$('confirmSelection');c?actions.insertBefore(b,c):actions.prepend(b)}b.textContent='USE COACH RECOMMENDATION';b.disabled=false;b.onclick=()=>applyRecommendedEventSelection(e)}
if(typeof drawReader==='function'){const base=drawReader;drawReader=function(){base();queueMicrotask(selectionActions)}}
function boot(){const ss=typeof summitSeasonState==='function'?summitSeasonState():null,m=summitMail();if(ss&&m?.selectionSubmitted&&(ss.seriesEntries||[]).length&&!ss.registrationLocked){ss.registrationLocked=true;save()}ensureAllWorldSummitRosters();ensureSummitMail();enhanceSummit();selectionActions()}
queueMicrotask(boot);setTimeout(boot,250);
})();
/* ===== End Selection + Summit Reliability ===== */
