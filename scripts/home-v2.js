/* Athletics Manager — Home V2 candidate
   A management-first Home replacement built on authoritative game state.
   The previous Home renderer remains retained as an immediate fallback until parity QA is complete. */
(function(){
'use strict';
if(window.__amHomeV2)return;window.__amHomeV2=1;
if(typeof drawHome!=='function')return;

const legacyDrawHome=drawHome;
const $=id=>document.getElementById(id);
const esc=v=>{try{return profileEscape(String(v??''))}catch(_){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const week=()=>Number(s?.game?.week||1);
const cycleYear=()=>Number(s?.game?.cycleYear||1);
const core=()=>window.__athleticsInboxDecisionCore;
function safe(fn,fallback){try{const v=fn();return v==null?fallback:v}catch(_){return fallback}}
function actions(){return safe(()=>core()?.getUnresolvedActions?.()||[],[])}
function blockers(){return safe(()=>core()?.getProgressionBlockers?.()||[],[])}
function team(){return safe(()=>managedTeam(),[])}
function pool(){return safe(()=>nationalPool(),[])}
function next(){return safe(()=>nextEvent(),null)}
function moneyText(n){return safe(()=>window.AthleticsUI?.format?.money?.(n),safe(()=>money(n),`£${Math.round(Number(n)||0).toLocaleString('en-GB')}`))}
function eventLabel(e){if(!e)return'No scheduled competition';const n=Number(e.week)-week();if(e.completed)return'Completed';if(n<0)return'Awaiting review';if(n===0)return'This week';if(n===1)return'Next week';return`In ${n} weeks`}
function seasonStage(){const w=week();if(cycleYear()===4&&w>=32)return'Olympic phase';if(w<=8)return'Early season';if(w<=20)return'Foundation';if(w<=34)return'Competition phase';return'Championship phase'}
function trainingQueue(){return safe(()=>window.__athleticsTrainingAttentionDecisions?.queue?.()||[],[])}
function unreadBy(type){return (s?.emails||[]).filter(m=>m.unread&&safe(()=>mailCategory(m),String(m.type||''))===type)}
function recentScoutMail(){return [...(s?.emails||[])].reverse().find(m=>m.unread&&['scouting','scout'].includes(safe(()=>mailCategory(m),String(m.type||''))))||null}
function eventDiscs(e){return (e?.disc||[]).filter(d=>d&&d!=='ALL')}
function selectedCount(e){if(!e)return 0;const ids=new Set();for(const d of eventDiscs(e))for(const id of e.entries?.[d]||[])ids.add(id);return ids.size}
function validEventAction(e){return !!e&&Number(e.week)<=week()&&!e.completed}
function actionDue(a){const d=Number(a.deadline);if(!Number.isFinite(d))return'REQUIRES ACTION';const n=d-week();return n<=0?'DUE NOW':n===1?'1 WEEK':`${n} WEEKS`}
function actionDestination(a){if(!a)return;const c=core();if(c?.openAction){try{c.openAction(a);return}catch(_){}}if(a.destination)try{view(a.destination)}catch(_){}
}
function worldRows(mode){
 if(mode==='leads'){
  const rows=safe(()=>Object.keys(DISCIPLINES).map(d=>[d,seasonLead(d)]).filter(([,x])=>x).slice(0,8),[]);
  return rows.length?rows.map(([d,l])=>`<div class="home-v2-lead"><div><small>${esc(safe(()=>discLabel(d),d))}</small><strong>${esc(safe(()=>fmtPerf(d,l.value),l.value))}</strong></div><span>${esc(l.name||safe(()=>s.athletes.find(a=>a.id===l.athleteId)?.name,'—'))}</span></div>`).join(''):'<div class="home-v2-clear"><div><b>No performances yet</b>World leads appear after competitive results.</div></div>';
 }
 const rows=safe(()=>typeof latestNews==='function'?latestNews(6):[...(s.news||[])].reverse().slice(0,6),[]);
 return rows.length?rows.map(n=>`<button class="home-v2-headline" data-home-v2-news="${esc(n.id||'')}"><small>${esc(n.category||'World')} · W${Number(n.week)||week()}</small><strong>${esc(n.headline||n.title||'Athletics update')}</strong><span>${esc(String(n.summary||n.body||n.deck||'').replace(/\s+/g,' ').slice(0,92))}</span></button>`).join(''):'<div class="home-v2-clear"><div><b>No headlines yet</b>The athletics world will develop as the season progresses.</div></div>';
}
function buildAgenda(a,e,tq,scout){
 const rows=[];
 for(const x of a.slice(0,4))rows.push({kind:'action',id:x.actionId,time:actionDue(x),title:x.title,meta:x.blocks?'Required before progression':x.reason||'Decision pending'});
 if(e)rows.push({kind:'event',time:`W${e.week}`,title:e.name||'Competition',meta:eventLabel(e)});
 if(tq.length)rows.push({kind:'training',time:'NOW',title:`Training needs attention`,meta:`${tq.length} athlete${tq.length===1?'':'s'} require review`});
 if(scout)rows.push({kind:'mail',id:scout.id,time:`W${scout.week||week()}`,title:scout.subject||'Scouting report',meta:'New scouting information'});
 return rows.slice(0,7);
}
function renderHome(){
 const root=$('home');if(!root)return;
 const a=actions(),b=blockers(),squad=team(),np=pool(),e=next(),tq=trainingQueue(),scout=recentScoutMail();
 const injured=squad.filter(x=>Number(x.injury)>0).length;
 const avgFitness=squad.length?Math.round(squad.reduce((n,x)=>n+Number(x.fitness||0),0)/squad.length):0;
 const avgForm=squad.length?Math.round(squad.reduce((n,x)=>n+Number(x.form||0),0)/squad.length):0;
 const unread=(s.emails||[]).filter(m=>m.unread).length;
 const important=unreadBy('medical').length+unreadBy('selection').length;
 const agenda=buildAgenda(a,e,tq,scout);
 const selected=e?selectedCount(e):0,discCount=eventDiscs(e).length;
 const nation=safe(()=>nationName(managedNation()),'National Programme');
 root.innerHTML=`<div class="home-v2" data-am-ui-screen="home-v2">
   <header class="home-v2-top">
    <div class="home-v2-title"><small>${esc(nation.toUpperCase())} · PERFORMANCE HQ</small><h1>Week ${week()}</h1><p>${esc(seasonStage())} · Olympic Cycle Year ${cycleYear()} of 4</p></div>
    <div class="home-v2-context"><span><small>Actions</small><b>${a.length}</b></span><span><small>Unread</small><b>${unread}</b></span><span><small>Squad</small><b>${squad.length}</b></span><span><small>Funding</small><b>${esc(moneyText(s.funding))}</b></span></div>
   </header>
   <div class="home-v2-grid">
    <div class="home-v2-primary">
     <section class="home-v2-card home-v2-event">
      <div class="home-v2-event-main"><div class="home-v2-event-kicker"><i></i>${b.length?'MANAGEMENT PRIORITY':'NEXT COMPETITION'} · ${esc(eventLabel(e))}</div><h2>${esc(e?.name||'No competition scheduled')}</h2><div class="home-v2-event-meta">${e?`<span>Week ${Number(e.week)||week()}</span><span>${esc(e.location||e.venue||'Venue TBC')}</span><span>${esc(e.level||e.kind||'Competition')}</span>`:'<span>Use Calendar to review the season.</span>'}</div></div>
      <div class="home-v2-event-count">${e?`<div><small>Events</small><b>${discCount||'—'}</b></div><div><small>Selected</small><b>${selected}</b></div><div><small>Status</small><b>${e.completed?'Complete':e.decision?'Entered':Number(e.week)===week()?'Active':'Upcoming'}</b></div>`:`<div><small>Season</small><b>${esc(s.game.season||'Current')}</b></div>`}</div>
      <div class="home-v2-event-actions">${e?`<button class="btn ${validEventAction(e)?'primary':'secondary'}" data-home-v2-event>${validEventAction(e)?'OPEN COMPETITION':'VIEW IN CALENDAR'}</button>`:''}<button class="btn ghost" data-home-v2-calendar>OPEN CALENDAR</button></div>
     </section>
     <section class="home-v2-card home-v2-actions">
      <div class="home-v2-action-summary"><div class="home-v2-action-count">${a.length}</div><div><small>${b.length?'PROGRESSION BLOCKED':'ACTION REQUIRED'}</small><strong>${a.length?`${a.length} management decision${a.length===1?'':'s'}`:'You are clear to continue'}</strong><span>${b.length?`${b.length} must be resolved before Advance Week.`:a.length?'Upcoming decisions are not yet blocking progression.':'No unresolved manager decisions.'}</span></div></div>
      <div class="home-v2-action-list">${a.length?a.map(x=>`<button class="home-v2-action ${x.blocks?'block':''}" data-home-v2-action="${esc(x.actionId)}"><div><strong>${esc(x.title)}</strong><small>${esc(x.reason||'Management decision awaiting response.')}</small></div><span>${esc(actionDue(x))}</span></button>`).join(''):'<div class="home-v2-clear"><div><b>✓ No required decisions</b>Advance the week when you are ready.</div></div>'}</div>
     </section>
    </div>
    <div class="home-v2-lower">
     <section class="home-v2-card"><div class="home-v2-card-head"><strong>Programme Readiness</strong><span>${injured?'Review availability':'Squad snapshot'}</span></div><div class="home-v2-card-body"><div class="home-v2-metrics"><div class="home-v2-metric ${injured?'bad':'good'}"><small>Unavailable</small><strong>${injured}</strong><span>${injured?'Injury cases':'Full squad available'}</span></div><div class="home-v2-metric ${avgFitness<70?'warn':'good'}"><small>Avg Fitness</small><strong>${avgFitness || '—'}</strong><span>Squad readiness</span></div><div class="home-v2-metric"><small>Avg Form</small><strong>${avgForm || '—'}</strong><span>Current squad</span></div><div class="home-v2-metric ${tq.length?'warn':''}"><small>Training</small><strong>${tq.length}</strong><span>Needs attention</span></div><div class="home-v2-metric"><small>Squad</small><strong>${squad.length}</strong><span>Managed athletes</span></div><div class="home-v2-metric"><small>National Pool</small><strong>${np.length}</strong><span>Available pathway</span></div><div class="home-v2-metric"><small>Important Mail</small><strong>${important}</strong><span>Unread priority</span></div><div class="home-v2-metric"><small>Cycle</small><strong>Y${cycleYear()}/4</strong><span>${esc(seasonStage())}</span></div></div></div><button class="home-v2-footer-link" data-home-v2-squad>OPEN SQUAD</button></section>
     <section class="home-v2-card"><div class="home-v2-card-head"><strong>Manager Agenda</strong><span>This week and next</span></div><div class="home-v2-agenda">${agenda.length?agenda.map((x,i)=>`<button data-agenda-kind="${x.kind}" data-agenda-id="${esc(x.id||'')}" data-agenda-index="${i}"><time>${esc(x.time)}</time><strong>${esc(x.title)}</strong><small>${esc(x.meta)}</small></button>`).join(''):'<div class="home-v2-clear"><div><b>No immediate agenda</b>Your upcoming calendar is clear.</div></div>'}</div></section>
    </div>
    <aside class="home-v2-side">
     <section class="home-v2-card"><div class="home-v2-card-head"><strong>Communications</strong><span>${unread} unread</span></div><div class="home-v2-card-body"><div class="home-v2-metrics"><div class="home-v2-metric ${a.length?'bad':'good'}"><small>Required</small><strong>${a.length}</strong><span>Decisions</span></div><div class="home-v2-metric"><small>Unread</small><strong>${unread}</strong><span>Messages</span></div><div class="home-v2-metric"><small>Medical</small><strong>${unreadBy('medical').length}</strong><span>Unread</span></div><div class="home-v2-metric"><small>Scouting</small><strong>${unreadBy('scouting').length}</strong><span>Unread</span></div></div></div><button class="home-v2-footer-link" data-home-v2-inbox>OPEN INBOX</button></section>
     <section class="home-v2-card home-v2-world"><div><div class="home-v2-card-head"><strong>Athletics World</strong><span>Outside your programme</span></div><div class="home-v2-world-tabs"><button class="on" data-home-v2-world="news">HEADLINES</button><button data-home-v2-world="leads">WORLD LEADS</button></div></div><div class="home-v2-world-body" id="homeV2World">${worldRows('news')}</div><button class="home-v2-footer-link" data-home-v2-world-open>OPEN WORLD</button></section>
    </aside>
   </div>
  </div>`;
 bind(root,a,e,agenda);
}
function bind(root,a,e,agenda){
 root.querySelector('[data-home-v2-event]')?.addEventListener('click',()=>view(validEventAction(e)?'competition':'calendar'));
 root.querySelector('[data-home-v2-calendar]')?.addEventListener('click',()=>view('calendar'));
 root.querySelector('[data-home-v2-squad]')?.addEventListener('click',()=>view('squad'));
 root.querySelector('[data-home-v2-inbox]')?.addEventListener('click',()=>view('inbox'));
 root.querySelector('[data-home-v2-world-open]')?.addEventListener('click',()=>view('news'));
 root.querySelectorAll('[data-home-v2-action]').forEach(b=>b.addEventListener('click',()=>{const x=a.find(v=>String(v.actionId)===String(b.dataset.homeV2Action));if(x)actionDestination(x)}));
 root.querySelectorAll('[data-agenda-kind]').forEach(b=>b.addEventListener('click',()=>{const x=agenda[Number(b.dataset.agendaIndex)];if(!x)return;if(x.kind==='action'){const z=a.find(v=>String(v.actionId)===String(x.id));if(z)actionDestination(z)}else if(x.kind==='event')view(e&&validEventAction(e)?'competition':'calendar');else if(x.kind==='training')view('training');else if(x.kind==='mail'){try{openMail=x.id}catch(_){}view('inbox')}}));
 root.querySelectorAll('[data-home-v2-world]').forEach(b=>b.addEventListener('click',()=>{root.querySelectorAll('[data-home-v2-world]').forEach(x=>x.classList.toggle('on',x===b));const body=$('homeV2World');if(body)body.innerHTML=worldRows(b.dataset.homeV2World)}));
 root.addEventListener('click',ev=>{if(ev.target.closest('[data-home-v2-news]'))view('news')});
}
function drawCandidate(){
 try{renderHome();window.AthleticsUI?.registerScreen?.('home',{status:'candidate',replacement:'home-v2'})}
 catch(err){console.error('[Athletics Manager] Home V2 recovered to legacy Home',err);legacyDrawHome();window.AthleticsUI?.registerScreen?.('home',{status:'fallback',replacement:'home-v2'})}
}
drawHome=drawCandidate;
window.__athleticsHomeV2={version:2,render:renderHome,legacy:legacyDrawHome,debug:()=>({actions:actions(),blockers:blockers(),nextEvent:next(),trainingAttention:trainingQueue().length})};
if(typeof currentView!=='undefined'&&currentView==='home')requestAnimationFrame(drawCandidate);
})();
