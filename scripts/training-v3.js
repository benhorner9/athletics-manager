/* Athletics Manager — Training Centre V3
   Unified high-performance presentation built on the authoritative Training V2 engine.
   No legacy Training UI or gameplay logic is deleted during this staged migration. */
(function(){
'use strict';
if(window.__amTrainingV3)return;window.__amTrainingV3=1;

const byId=id=>document.getElementById(id);
const safe=(fn,fallback)=>{try{const v=fn();return v==null?fallback:v}catch(_){return fallback}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let trainingQueued=false,calendarQueued=false;

function squad(){return safe(()=>managedTeam(),[])}
function attention(){return safe(()=>window.__athleticsTrainingAttentionDecisions?.queue?.()||[],[])}
function plans(){return safe(()=>planList(),s?.plans||[])}
function week(){return Number(s?.game?.week||1)}
function season(){return Number(s?.game?.season||1)}
function nextMajor(){return (s?.events||[]).filter(e=>!e.completed&&Number(e.week)>=week()&&['championship','olympics'].includes(e.kind)).sort((a,b)=>Number(a.week)-Number(b.week))[0]||null}
function avg(list,key){return list.length?Math.round(list.reduce((n,a)=>n+Number(a?.[key]||0),0)/list.length):0}
function focus(){return String(s?.trainingFocus||s?.trainingSystem?.focus||'Balanced')}
function currentTab(tabs){return [...(tabs?.querySelectorAll('button')||[])].find(b=>b.classList.contains('on'))||null}
function tabName(button){return String(button?.dataset?.tr2Tab||button?.dataset?.amAttentionTab||button?.textContent||'').trim().toLowerCase()}
function tabRank(button){const t=tabName(button);if(/overview/.test(t))return 0;if(/attention/.test(t))return 1;if(/athlete/.test(t))return 2;if(/camp/.test(t))return 3;if(/testing/.test(t))return 4;if(/history|review/.test(t))return 5;return 10}
function findTab(regex){const tabs=byId('training')?.querySelector('.tr2-tabs');return [...(tabs?.querySelectorAll('button')||[])].find(b=>regex.test(tabName(b)))||null}

function reorderTabs(tabs){
 const current=[...(tabs?.querySelectorAll(':scope > button')||[])],wanted=[...current].sort((a,b)=>tabRank(a)-tabRank(b));
 if(current.length!==wanted.length||current.some((b,i)=>b!==wanted[i]))wanted.forEach(b=>tabs.appendChild(b));
 tabs?.setAttribute('aria-label','Training Centre sections');
}
function coachAdvice(team,q,major){
 if(q.length){const first=q[0]?.a;return {title:'Performance team',copy:`${first?.name||'An athlete'} has the highest-priority training decision. Review that load first, then assess the rest of the squad.`}}
 const fatigue=avg(team,'fatigue');
 if(fatigue>=60)return {title:'Performance team',copy:'Squad fatigue is elevated. Keep recovery work prominent and avoid stacking camps onto already heavy competition weeks.'};
 if(major&&Number(major.week)-week()<=4){const gap=Number(major.week)-week();return {title:'Performance team',copy:`${major.name} is ${gap===0?'this week':`in ${gap} week${gap===1?'':'s'}`}. Individual load and competition preparation should now take priority over unnecessary programme changes.`}}
 return {title:'Performance team',copy:'No urgent load issue is being flagged. Keep the current block consistent unless athlete evidence gives you a reason to change it.'};
}
function headerHTML(team,q,major){
 const injured=team.filter(a=>Number(a.injury||0)>0).length,available=Math.max(0,team.length-injured),fatigue=avg(team,'fatigue'),advice=coachAdvice(team,q,major),gap=major?Number(major.week)-week():null;
 return `<section class="tr3-command" aria-labelledby="tr3Title"><div class="tr3-title"><small>${esc(safe(()=>nationName(managedNation()).toUpperCase(),'NATIONAL PROGRAMME'))} · HIGH PERFORMANCE</small><h1 id="tr3Title">Training Centre</h1><p>Manage the weekly programme, individual athlete load, camps and squad testing without leaving the performance workflow.</p></div><div class="tr3-actions"><button type="button" class="btn secondary" data-tr3-camps>TRAINING CAMPS</button><button type="button" class="btn ghost" data-tr3-calendar>CALENDAR</button></div><div class="tr3-context"><div><small>Needs Attention</small><strong class="${q.length?'bad':'good'}">${q.length}</strong></div><div><small>Average Fatigue</small><strong class="${fatigue>=70?'bad':fatigue>=55?'warn':'good'}">${fatigue}</strong></div><div><small>Available Athletes</small><strong>${available} / ${team.length}</strong></div><div><small>Next Major</small><strong title="${esc(major?.name||'No major championship listed')}">${major?`W${major.week} · ${esc(major.name)}`:'None scheduled'}</strong></div></div></section><section class="tr3-advice"><span class="tr3-advice-mark">PT</span><div><small>COACH ADVICE${major&&gap!=null?` · ${gap<=0?'NOW':`W${major.week}`}`:''}</small><strong>${esc(advice.title)}</strong><p>${esc(advice.copy)}</p></div></section>`;
}
function bindHeader(root){
 root.querySelector('[data-tr3-camps]')?.addEventListener('click',()=>{const tab=findTab(/camp/);if(tab)tab.click();else safe(()=>toast('Training Camps are still loading. Try again in a moment.'),null)});
 root.querySelector('[data-tr3-calendar]')?.addEventListener('click',()=>safe(()=>view('calendar'),null));
}
function addAthleteLinks(shell){
 shell.querySelectorAll('[data-tr2-athlete-card]').forEach(card=>{
  if(card.dataset.tr3Profile==='1'||card.tagName==='BUTTON')return;
  const name=String(card.dataset.tr2AthleteCard||card.querySelector('strong')?.textContent||'').trim(),a=(s?.athletes||[]).find(x=>String(x.name).trim()===name);
  if(!a)return;card.dataset.tr3Profile='1';const b=document.createElement('button');b.type='button';b.className='tr3-profile-chip';b.dataset.profile=a.id;b.textContent='OPEN ATHLETE';b.setAttribute('aria-label',`Open ${a.name} athlete profile`);card.appendChild(b);
 });
}
function enhanceActiveSection(shell,tabs){
 const tab=currentTab(tabs),name=tabName(tab);
 shell.dataset.tr3Section=name||'overview';
 if(/camp/.test(name)){
  const candidates=[...shell.querySelectorAll('.panel,[class*="camp"]')].filter(x=>/camp/i.test(String(x.querySelector?.('h2,h3,.panel-h strong')?.textContent||x.className||'')));
  const panel=candidates[0];
  if(panel&&!panel.querySelector('.tr3-owner-note')){const n=document.createElement('div');n.className='tr3-owner-note';n.innerHTML='<span>Training owns camp booking. Calendar shows the resulting commitment and competition conflicts.</span><button type="button" class="btn ghost" data-tr3-view-calendar>VIEW CALENDAR</button>';panel.appendChild(n);n.querySelector('[data-tr3-view-calendar]').onclick=()=>safe(()=>view('calendar'),null)}
 }
}
function enhanceTraining(){
 trainingQueued=false;const root=byId('training');if(!root)return;const shell=root.querySelector('.tr2-shell');if(!shell)return;
 root.classList.add('training-v3');root.dataset.amUiScreen='training-v3';shell.classList.add('tr3-authoritative');shell.dataset.amUiScreen='training-v3';
 root.querySelectorAll(':scope > .tr3-frame').forEach(el=>el.remove());const shells=[...root.querySelectorAll(':scope > .tr2-shell')];shells.slice(1).forEach(el=>el.remove());
 const tabs=shell.querySelector('.tr2-tabs');if(tabs)reorderTabs(tabs);addAthleteLinks(shell);enhanceActiveSection(shell,tabs);
 try{window.AthleticsUI?.registerScreen?.('training',{status:'active',replacement:'training-v2 + training-v3-enhancements',critical:true})}catch(_){ }
}
function scheduleTraining(){if(trainingQueued)return;trainingQueued=true;requestAnimationFrame(enhanceTraining)}

function calendarHandoffHTML(selectedWeek){return `<div class="tr3-calendar-handoff"><div><small>TRAINING OWNERSHIP</small><strong>Plan camps and squad testing from Training</strong><p>Calendar remains the season schedule. Training owns the actual booking workflow so there is one place to create, change and review performance activities.${selectedWeek?` You are currently reviewing Week ${selectedWeek}.`:''}</p></div><button type="button" class="btn secondary" data-tr3-open-training>OPEN TRAINING</button></div>`}
function syncCalendarOwnership(){
 calendarQueued=false;const root=byId('calendar');if(!root?.querySelector('.calv2'))return;
 const cards=[...root.querySelectorAll('.calv2-card')],planner=cards.find(card=>/^plan activity$/i.test(String(card.querySelector('.calv2-card-head strong')?.textContent||'').trim()));
 if(!planner||planner.dataset.tr3Owner==='training')return;
 const selected=Number(s?.uiCalendarV2?.selectedWeek||0)||null;planner.dataset.tr3Owner='training';planner.classList.add('tr3-training-owner');planner.innerHTML=calendarHandoffHTML(selected);planner.querySelector('[data-tr3-open-training]')?.addEventListener('click',()=>safe(()=>view('training'),null));
}
function scheduleCalendar(){if(calendarQueued)return;calendarQueued=true;requestAnimationFrame(syncCalendarOwnership)}

const trainingRoot=byId('training');if(trainingRoot)new MutationObserver(scheduleTraining).observe(trainingRoot,{childList:true,subtree:true});
const calendarRoot=byId('calendar');if(calendarRoot)new MutationObserver(scheduleCalendar).observe(calendarRoot,{childList:true,subtree:true});
document.addEventListener('click',event=>{if(event.target?.closest?.('#training'))setTimeout(scheduleTraining,0);if(event.target?.closest?.('#calendar'))setTimeout(scheduleCalendar,0)},true);
document.addEventListener('change',event=>{if(event.target?.closest?.('#training'))setTimeout(scheduleTraining,0)},true);

/* Training V2 is loaded asynchronously by the existing runtime. Give it several chances to appear without replacing the fallback. */
let tries=0;const waiter=setInterval(()=>{tries++;scheduleTraining();if(byId('training')?.querySelector('.tr2-shell')||tries>=80)clearInterval(waiter)},100);
scheduleTraining();scheduleCalendar();
window.__athleticsTrainingV3={version:3,enhance:enhanceTraining,syncCalendar:syncCalendarOwnership,debug:()=>({authoritativeV2:!!byId('training')?.querySelector('.tr2-shell'),attention:attention().length,squad:squad().length,calendarOwnedByTraining:!!byId('calendar')?.querySelector('.tr3-training-owner')})};
})();
