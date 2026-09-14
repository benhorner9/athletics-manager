/* Athletics Manager — Training Coach Recommendation V1
   Optional one-click delegation from Training Overview. The performance staff review
   current fatigue, block adaptation and championship proximity, then apply only the
   changes their current evidence supports. Manual training controls remain authoritative. */
(function(){
'use strict';
if(window.__amTrainingCoachRecommendationV1)return;window.__amTrainingCoachRecommendationV1=1;

const VERSION=1;
const $=id=>document.getElementById(id);
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let api=null,observer=null,queued=false;

function managed(){return safe(()=>managedTeam(),(s?.athletes||[]).filter(a=>!a.retired&&a.nation===s?.managedNation&&a.inSquad!==false))||[]}
function family(a){return safe(()=>window.AMAthleteAttributes?.familyFor?.(a),'general')||'general'}
function coachName(a){
 const f=family(a),role=f==='jump'?'jumps':f==='throw'?'throws':'sprint';
 return String(safe(()=>s?.coaches?.[role]?.name,'')||'Performance staff');
}
function nextMajorFor(a){
 const week=Number(s?.game?.week||1);
 return (s?.events||[]).filter(e=>{
  if(!e||e.completed||Number(e.week)<week||!['championship','olympics'].includes(e.kind))return false;
  const d=Array.isArray(e.disc)?e.disc:[e.disc];
  return !d.filter(Boolean).length||d.includes('ALL')||d.includes(a?.disc);
 }).sort((x,y)=>Number(x.week)-Number(y.week))[0]||null;
}
function profile(a){return safe(()=>window.AMAthleteAttributes?.get?.(a),{attributes:[]})||{attributes:[]}}
function developmentFocus(a,m,{excludeCurrent=false}={}){
 const rows=profile(a).attributes||[],byKey=Object.fromEntries(rows.map(r=>[r.key,r]));
 let options=(api?.programmesFor?.(a)||[]).filter(x=>x.id!=='recovery'&&x.id!=='prep');
 if(excludeCurrent)options=options.filter(x=>x.id!==m.focus);
 if(!options.length)return null;
 const scored=options.map(option=>{
  let score=0;
  for(const [key,weight] of Object.entries(option.weights||{})){
   const row=byKey[key];if(!row)continue;
   const current=Number(row.score||0),ceiling=Number(m?.ceilings?.[key]??current),room=Math.max(0,ceiling-current),xp=Math.max(0,Math.min(.99,Number(m?.xp?.[key])||0));
   score+=Number(weight||0)*(room*12+(1-xp)*.35+Math.max(0,15-current)*.08);
  }
  return{option,score};
 }).sort((a,b)=>b.score-a.score||String(a.option.label).localeCompare(String(b.option.label)));
 return scored[0]?.option||options[0];
}
function samePlan(m,focus,intensity){return String(m?.focus)===String(focus)&&String(m?.intensity)===String(intensity)}
function recommendationFor(a){
 if(!a||a.retired||Number(a.injury||0)>0||a.camp)return{a,kind:'hold',changed:false,reason:Number(a?.injury||0)>0?'Medical recovery takes priority.':a?.camp?'Current camp remains the priority.':'No change required.'};
 const m=api.ensureDevelopment(a),fatigue=Number(a.fatigue||0),status=String(a.trainingV2?.load?.status||'Normal'),major=nextMajorFor(a),gap=major?Number(major.week)-Number(s?.game?.week||1):99;
 let focus=m.focus,intensity=m.intensity,kind='hold',reason='Current plan remains appropriate.';

 if(status==='Critical'||fatigue>=82){
  focus='recovery';intensity='recovery';kind='recovery';reason=`${fatigue>=82?`Fatigue is ${Math.round(fatigue)}/100`:'Training load is critical'}, so the safest productive choice is Recovery.`;
 }else if(fatigue>=72&&m.focus!=='recovery'){
  intensity='low';kind='reduce';reason=`Fatigue is ${Math.round(fatigue)}/100. Keep the current focus but reduce the load until readiness improves.`;
 }else if(m.focus==='recovery'&&fatigue<=38){
  const next=gap>=0&&gap<=4?(api.programmesFor(a)||[]).find(x=>x.id==='prep'):developmentFocus(a,m);
  if(next){focus=next.id;intensity=fatigue>=30?'low':'standard';kind=next.id==='prep'?'prep':'resume';reason=next.id==='prep'?`${major?.name||'The next major'} is ${gap===0?'this week':`in ${gap} week${gap===1?'':'s'}`}; the athlete is fresh enough to begin Competition Preparation.`:'Recovery has done its job. Resume the strongest available development block.'}
 }else if(gap>=0&&gap<=4&&m.focus!=='prep'&&m.focus!=='recovery'&&fatigue<65){
  const prep=(api.programmesFor(a)||[]).find(x=>x.id==='prep');if(prep){focus=prep.id;intensity=fatigue>=55?'low':'standard';kind='prep';reason=`${major?.name||'A major championship'} is ${gap===0?'this week':`in ${gap} week${gap===1?'':'s'}`}; shift from development into Competition Preparation.`}
 }else if(Number(m.blockWeeks||0)>=9&&m.focus!=='recovery'){
  const next=developmentFocus(a,m,{excludeCurrent:true});if(next){focus=next.id;intensity=fatigue>=60?'low':'standard';kind='block';reason=`The current block has run for ${Number(m.blockWeeks||0)} weeks and its stimulus is fading. Rotate to ${next.label}.`}
 }else if(m.focus==='prep'&&(gap>5||!major)){
  const next=developmentFocus(a,m);if(next){focus=next.id;intensity=fatigue>=60?'low':'standard';kind='resume';reason='No major championship is close enough to justify staying in Competition Preparation. Return to development.'}
 }else if(m.intensity==='low'&&fatigue<=45&&m.focus!=='recovery'){
  intensity='standard';kind='restore';reason=`Fatigue is back to ${Math.round(fatigue)}/100. Standard load is appropriate again.`;
 }
 return{a,m,focus,intensity,kind,reason,changed:!samePlan(m,focus,intensity),coach:coachName(a),major,gap};
}
function recommendations(){return managed().map(recommendationFor)}
function actionable(){return recommendations().filter(r=>r.changed)}
function labelFor(kind){return({recovery:'Recovery',reduce:'Reduced load',prep:'Competition prep',block:'New block',resume:'Resume development',restore:'Standard load'}[kind]||'Plan change')}
function summary(rows){
 const counts={};rows.forEach(r=>counts[r.kind]=(counts[r.kind]||0)+1);
 return Object.entries(counts).map(([k,n])=>`${labelFor(k)} ${n}`).join(' · ');
}
function logDecision(r){
 const a=r.a,m=api.ensureDevelopment(a);a.trainingCoachHistory??=[];
 const entry={careerWeek:Number(safe(()=>careerNow(),s?.game?.careerWeek||s?.game?.week||1)),season:Number(s?.game?.season||0),week:Number(s?.game?.week||0),coach:r.coach,kind:r.kind,focus:r.focus,intensity:r.intensity,reason:r.reason};
 a.trainingCoachHistory.push(entry);a.trainingCoachHistory=a.trainingCoachHistory.slice(-40);m.lastCoachDecision=entry;
 safe(()=>rememberAthlete(a,'Coach training decision',`${r.coach}: ${r.reason}`),null);
}
function applyOne(r){
 if(!r?.changed||!r.a)return false;
 if(r.focus&&String(api.ensureDevelopment(r.a).focus)!==String(r.focus))api.setFocus(r.a,r.focus);
 if(r.intensity&&String(api.ensureDevelopment(r.a).intensity)!==String(r.intensity))api.setIntensity(r.a,r.intensity);
 logDecision(r);return true;
}
function applyAll(){
 const rows=actionable();if(!rows.length){safe(()=>toast('The coaching staff recommend keeping the current training plans'),null);return 0}
 let changed=0;rows.forEach(r=>{if(applyOne(r))changed++});
 safe(()=>appointmentTask('training'),null);safe(()=>save(),null);
 safe(()=>toast(`${changed} training plan${changed===1?'':'s'} updated by the coaching staff`),null);
 api.syncAttention?.();api.render?.();return changed;
}
function ensureStyles(){
 if($('amTrainingCoachRecommendationStyle'))return;const style=document.createElement('style');style.id='amTrainingCoachRecommendationStyle';style.textContent=`
 .am-coach-plan{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:13px 14px;border:1px solid rgba(105,183,225,.24);border-radius:11px;background:linear-gradient(100deg,rgba(25,76,104,.20),rgba(5,22,34,.72));box-shadow:inset 3px 0 rgba(105,183,225,.72)}.am-coach-plan small{display:block;color:#72b9dc;font-size:8px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.am-coach-plan strong{display:block;margin-top:3px;font-size:12px;color:#e7f3f8}.am-coach-plan p{margin:4px 0 0;color:#8faaba;font-size:9px;line-height:1.45}.am-coach-plan-meta{margin-top:5px!important;color:#6f91a4!important;font-size:8px!important}.am-coach-plan .btn{min-height:38px;white-space:nowrap}.am-coach-plan .btn[disabled]{opacity:.55}@media(max-width:760px){.am-coach-plan{grid-template-columns:1fr}.am-coach-plan .btn{width:100%}}
 `;document.head.appendChild(style)
}
function decorate(){
 const root=$('training'),shell=root?.querySelector('.tr4-shell');if(!shell||typeof currentView!=='undefined'&&currentView!=='training')return;
 const active=shell.querySelector('.tr4-tabs button.on');if(!active||String(active.dataset.tr4Tab)!=='overview'){shell.querySelector('.am-coach-plan')?.remove();return}
 const grid=shell.querySelector('.tr4-grid');if(!grid)return;ensureStyles();
 const rows=actionable(),team=managed(),unchanged=Math.max(0,team.length-rows.length);let panel=shell.querySelector('.am-coach-plan');if(!panel){panel=document.createElement('section');panel.className='am-coach-plan';grid.insertAdjacentElement('beforebegin',panel)}
 const detail=rows.length?summary(rows):'No training changes recommended';
 const html=`<div><small>PERFORMANCE STAFF</small><strong>${rows.length?`${rows.length} training change${rows.length===1?'':'s'} recommended`:'Keep the current plans'}</strong><p>${rows.length?'Let the coaching staff apply the best current response to fatigue, block adaptation and championship timing.':'The current squad plans match the coaching staff’s recommendation. No intervention is needed this week.'}</p><p class="am-coach-plan-meta">${esc(detail)}${rows.length?` · ${unchanged} plan${unchanged===1?'':'s'} unchanged`:''}</p></div><button type="button" class="btn ${rows.length?'secondary':'ghost'}" data-am-coach-apply ${rows.length?'':'disabled'}>${rows.length?'APPLY COACH RECOMMENDATIONS':'NO CHANGE NEEDED'}</button>`;
 if(panel.dataset.signature!==html){panel.innerHTML=html;panel.dataset.signature=html;panel.querySelector('[data-am-coach-apply]')?.addEventListener('click',applyAll)}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate()})}
function install(){
 api=window.AMTrainingSystem2;if(!api?.ensureDevelopment||!api?.setFocus||!api?.setIntensity){setTimeout(install,80);return}
 ensureStyles();schedule();const root=$('training');if(root&&!observer){observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true})}
 window.addEventListener('pageshow',schedule);document.addEventListener('click',e=>{if(e.target?.closest?.('#training'))setTimeout(schedule,0)},true);
}
install();
window.AMTrainingCoachRecommendation={version:VERSION,recommendationFor,recommendations,actionable,applyAll,refresh:schedule};
})();
