/* ===== Home + Live Event Template Refresh ===== */
(function(){
'use strict';

const TEMPLATE_SCENES_VERSION=1;

function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function safeEvent(){try{return typeof currentEvent==='function'?currentEvent():null}catch(_){return null}}
function safeNextEvent(){try{return typeof nextEvent==='function'?nextEvent():null}catch(_){return null}}
function safeTeam(){try{return typeof managedTeam==='function'?managedTeam():[]}catch(_){return []}}
function safeNation(){try{return typeof managedNation==='function'?managedNation():''}catch(_){return ''}}
function safeNationName(){try{return typeof nationName==='function'?nationName(safeNation()):safeNation()}catch(_){return safeNation()}}
function fmtEventKind(e){if(!e)return 'Programme';if(e.kind==='olympics')return 'Olympic Games';if(e.kind==='championship')return 'Championship';if(e.kind==='testing')return 'Testing';return e.level||'Competition'}
function healthLabel(a){try{return typeof health==='function'?health(a)[0]:'Available'}catch(_){return 'Available'}}
function readiness(a){return Math.round(((Number(a?.form)||0)*.45)+((Number(a?.fitness)||0)*.4)+((100-(Number(a?.fatigue)||0))*.15))}
function topHeroAthlete(){const team=safeTeam().filter(a=>!a.retired);return [...team].sort((a,b)=>readiness(b)-readiness(a)||(Number(b.overall)||0)-(Number(a.overall)||0))[0]||null}
function portrait(a){try{return a&&typeof athletePortraitHTML==='function'?athletePortraitHTML(a):''}catch(_){return ''}}

function homeMetricRow(label,value,note='',tone=''){
  return `<div class="template-mini-metric ${tone}"><small>${esc(label)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`
}
function upcomingRows(){
  const events=(s?.events||[]).filter(e=>!e.completed&&Number(e.week)>=Number(s?.game?.week||1)).sort((a,b)=>a.week-b.week).slice(0,3);
  if(!events.length)return '<p class="template-empty">No upcoming competitions are currently scheduled.</p>';
  return events.map(e=>`<button class="template-list-row" data-home-route="calendar"><b>W${e.week}</b><span><strong>${esc(e.name)}</strong><small>${esc(e.location||'Venue TBC')} • ${esc(fmtEventKind(e))}</small></span><em>${e.week===s.game.week?'LIVE':'VIEW'}</em></button>`).join('')
}
function briefingRows(){
  const mails=[...(s?.emails||[])].filter(m=>m.unread).reverse().slice(0,3);
  if(!mails.length)return '<p class="template-empty">No unread briefings. The programme is clear.</p>';
  return mails.map(m=>`<button class="template-list-row template-brief-row" data-home-mail="${esc(m.id)}"><b>${m.type==='medical'?'✚':m.type==='selection'?'●':'↗'}</b><span><strong>${esc(m.subject)}</strong><small>${esc(m.sender)} • Week ${m.week}</small></span><em>OPEN</em></button>`).join('')
}
function performanceSnapshot(){
  const team=safeTeam(),healthy=team.filter(a=>!a.retired&&a.injury===0),injured=team.filter(a=>a.injury>0).length;
  const avg=team.length?Math.round(team.reduce((n,a)=>n+readiness(a),0)/team.length):0;
  const fatigue=team.length?Math.round(team.reduce((n,a)=>n+(Number(a.fatigue)||0),0)/team.length):0;
  const form=team.length?Math.round(team.reduce((n,a)=>n+(Number(a.form)||0),0)/team.length):0;
  return `${homeMetricRow('Squad readiness',avg+'%',`${healthy.length}/${team.length} available`,avg>=80?'good':avg<60?'bad':'')}${homeMetricRow('Injured athletes',injured,injured?'Medical review required':'No current injuries',injured?'bad':'good')}${homeMetricRow('Average fatigue',fatigue+'/100',fatigue>=60?'High load':fatigue>=40?'Moderate load':'Controlled',fatigue>=60?'bad':fatigue<40?'good':'')}${homeMetricRow('Average form',form+'/100',form>=82?'Strong trend':form>=72?'Stable':'Needs attention',form>=82?'good':'')}`
}
function quickActions(){
  return `<button data-home-route="training">Adjust Training Load <span>→</span></button><button data-home-route="squad">Open Squad <span>→</span></button><button data-home-route="squad">View Medical Status <span>→</span></button><button data-home-route="scouting">Run Scouting Search <span>→</span></button>`
}
function addHomeUtilities(dashboard){
  let row=dashboard.querySelector('.template-home-utilities');
  if(!row){row=document.createElement('div');row.className='template-home-utilities';dashboard.appendChild(row)}
  row.innerHTML=`<section class="template-utility-card template-upcoming"><header><div><small>SEASON PLAN</small><h3>Upcoming Competitions</h3></div><button data-home-route="calendar">View calendar →</button></header><div class="template-list">${upcomingRows()}</div></section><section class="template-utility-card template-briefing"><header><div><small>COMMUNICATIONS</small><h3>Daily Briefing</h3></div><button data-home-route="inbox">View inbox →</button></header><div class="template-list">${briefingRows()}</div></section><section class="template-utility-card template-snapshot"><header><div><small>PERFORMANCE</small><h3>Performance Snapshot</h3></div><button data-home-report="programme:impact">Full report →</button></header><div class="template-snapshot-grid">${performanceSnapshot()}</div></section><section class="template-utility-card template-quick"><header><div><small>MANAGEMENT</small><h3>Quick Actions</h3></div></header><div class="template-quick-grid">${quickActions()}</div></section>`
}
function rebuildHomeHero(dashboard){
  const hero=dashboard.querySelector('.dashboard-event');if(!hero)return;
  const e=safeNextEvent(),block=typeof currentBlocking==='function'?currentBlocking():null,team=safeTeam(),ath=topHeroAthlete(),injured=team.filter(a=>a.injury>0).length;
  const selections=(s?.events||[]).filter(x=>!x.completed&&!x.decision&&x.week>=s.game.week&&(s?.emails||[]).some(m=>m.type==='selection'&&m.eventId===x.id)).length;
  const entries=e&&typeof eventEntries==='function'?eventEntries(e).length:0;
  hero.classList.add('template-home-hero');
  hero.innerHTML=`<div class="template-hero-copy"><small class="template-hero-kicker">${block?'ACTION REQUIRED':'NEXT MAJOR EVENT'} • ${esc(fmtEventKind(e))}</small><h1>${esc(e?.name||'Season programme')}</h1><div class="template-hero-meta"><span>⌖ ${esc(e?.location||'Venue TBC')}</span><span>▣ Week ${esc(e?.week||s.game.week)} • ${esc(s?.game?.season||'')}</span><span>◎ ${esc(e?.ranked?'Ranking event':'Programme event')}</span></div><p>${block?'Your current meeting needs to be completed before the season can move on.':'Review preparation, selection and readiness before the next major competition.'}</p><div class="template-hero-actions"><button id="heroEvent" class="btn primary">${block?'OPEN EVENT':'VIEW EVENT'} →</button><button id="homeMenu" class="btn ghost">MAIN MENU</button></div><div class="template-hero-chips"><button data-home-route="${block?'competition':'calendar'}"><b>${entries}</b><span>${safeNationName()} entries</span></button><button ${selections?'data-home-route="inbox"':''}><b>${selections}</b><span>selection decision${selections===1?'':'s'}</span></button><button data-home-route="squad"><b>${injured}</b><span>injured athlete${injured===1?'':'s'}</span></button></div></div><div class="template-hero-visual" aria-hidden="true"><div class="template-track-lines"></div>${ath?`<div class="template-hero-athlete">${portrait(ath)}<span>${esc(ath.name)}</span><small>${esc(typeof discLabel==='function'?discLabel(ath.disc):ath.disc)}</small></div>`:''}<div class="template-hero-slogan">ELITE ATHLETES<br>EXTRAORDINARY STORIES.</div></div>`;
  const heroBtn=hero.querySelector('#heroEvent');if(heroBtn)heroBtn.onclick=()=>view(block?'competition':'calendar');const menu=hero.querySelector('#homeMenu');if(menu)menu.onclick=showMenu
}
function enhanceHome(){
  const root=document.getElementById('home');if(!root?.classList.contains('on'))return;
  const dashboard=root.querySelector('.home-dashboard');if(!dashboard)return;
  root.classList.add('template-home-screen');dashboard.classList.add('template-home-dashboard');
  rebuildHomeHero(dashboard);
  dashboard.querySelector('.dashboard-alerts')?.classList.add('template-dashboard-alerts');
  dashboard.querySelector('.home-decks')?.classList.add('template-home-decks');
  dashboard.querySelectorAll('.home-deck').forEach((deck,i)=>deck.classList.add(i===0?'template-programme':'template-world'));
  addHomeUtilities(dashboard)
}

function commentaryParts(line){
  try{if(typeof matchdayCommentaryParts==='function')return matchdayCommentaryParts(line)}catch(_){}
  const parts=String(line||'').split('\n');return {kicker:parts.shift()||'LIVE',text:parts.join(' ')||String(line||'')}
}
function commentaryLinesForCurrent(){
  if(liveEventView?.lines?.length){const end=Math.max(0,Number(liveEventView.index));return liveEventView.lines.slice(0,end+1)}
  const e=safeEvent(),d=activeEventDisc;return e?.commentary?.[d]||[]
}
function renderCommentaryFeed(el,fallbackLine){
  if(!el)return;
  let lines=commentaryLinesForCurrent();if(!lines.length&&fallbackLine)lines=[fallbackLine];if(!lines.length)return;
  const shown=lines.slice(-8).reverse();
  el.classList.add('template-commentary-feed');
  el.innerHTML=shown.map((line,i)=>{const p=commentaryParts(line);return `<div class="template-commentary-line ${i===0?'latest':''}"><small>${esc(p.kicker||'LIVE')}</small><p>${esc(p.text||'')}</p></div>`}).join('')
}
function eventInfoHTML(e,d){
  if(!e)return '';
  let format='Standard format';try{const f=e.engine?.[d]||(typeof athleticsFormat==='function'?athleticsFormat(e,d):null);format=f?.format||f?.label||format}catch(_){}
  const running=typeof disciplineRunning!=='undefined'&&disciplineRunning&&!Array.isArray(e.results?.[d]),done=Array.isArray(e.results?.[d]);
  return `<section class="template-event-info"><header><small>EVENT INFO</small><strong>${esc(typeof discLabel==='function'?discLabel(d):d)}</strong></header><dl><div><dt>Competition</dt><dd>${esc(e.name||'Event')}</dd></div><div><dt>Venue</dt><dd>${esc(e.location||'—')}</dd></div><div><dt>Round / format</dt><dd>${esc(format)}</dd></div><div><dt>Status</dt><dd class="${running?'live':done?'done':''}">${running?'● Live':done?'Official':'Ready'}</dd></div><div><dt>Ranking points</dt><dd>${e.ranked?'Available':'Not awarded'}</dd></div><div><dt>Meeting</dt><dd>Week ${esc(e.week||s?.game?.week||'—')} • ${esc(s?.game?.season||'')}</dd></div></dl></section>`
}
function enhanceLiveEvent(){
  const root=document.getElementById('competition');if(!root?.classList.contains('on'))return;
  const shell=root.querySelector('.fm2d-matchday');
  if(!shell){root.querySelector('.event-day-shell')?.classList.add('template-event-overview');return}
  shell.classList.add('template-live-event');
  const split=shell.querySelector('.fm-live-split'),board=shell.querySelector('#liveScoreboard'),left=shell.querySelector('.fm-live-left');
  if(split)split.classList.add('template-live-grid');if(board)board.classList.add('template-live-leaderboard');if(left)left.classList.add('template-live-main');
  const e=liveEventView?.event||safeEvent(),d=liveEventView?.disc||activeEventDisc;
  if(split&&!split.querySelector('.template-event-info'))split.insertAdjacentHTML('beforeend',eventInfoHTML(e,d));
  const commentary=shell.querySelector('#commentary');if(commentary)renderCommentaryFeed(commentary,commentary.textContent);
  shell.querySelector('.matchday-commentary')?.classList.add('template-live-commentary');
  shell.querySelector('.matchday-arena')?.classList.add('template-live-arena');
  shell.querySelector('.matchday-dashboard')?.classList.add('template-live-footer')
}
function syncSceneClass(){document.body.classList.toggle('template-home-active',currentView==='home');document.body.classList.toggle('template-event-active',currentView==='competition')}

const previousDrawHome=drawHome;
drawHome=function(){previousDrawHome();queueMicrotask(enhanceHome)};
const previousDrawCompetition=drawCompetition;
drawCompetition=function(){previousDrawCompetition();queueMicrotask(enhanceLiveEvent)};
const previousRenderMatchdayCommentary=renderMatchdayCommentary;
renderMatchdayCommentary=function(el,line){
  if(el?.id==='commentary'&&document.querySelector('.template-live-event')){renderCommentaryFeed(el,line);return}
  previousRenderMatchdayCommentary(el,line)
};
const previousView=view;
view=function(v){previousView(v);syncSceneClass();if(currentView==='home')queueMicrotask(enhanceHome);if(currentView==='competition')queueMicrotask(enhanceLiveEvent)};

syncSceneClass();if(currentView==='home')queueMicrotask(enhanceHome);if(currentView==='competition')queueMicrotask(enhanceLiveEvent);

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Home & Live Event Presentation'))UPDATES.unshift({date:'9 September 2026',title:'Home & Live Event Presentation',items:[
  'Rebuilt the Home screen around a premium management-dashboard hierarchy with a major-event hero, action tiles, Programme and Athletics World panels, upcoming competitions, daily briefing, performance snapshot and quick actions.',
  'Live Event now uses a dedicated broadcast layout with the 2D viewer and live commentary on the left, live standings and event information on the right, and stronger event-state controls across the top.',
  'The redesign is presentation-only: existing athlete data, selection logic, Event Day simulation, live scoreboard ownership, field attempts, DNFs, Summit Series and completion controls remain authoritative underneath.',
  'The new layouts are iPad-first and collapse into clean stacked views on narrower screens without removing access to any existing management controls.'
]});
if(typeof renderMenu==='function')renderMenu();
window.__athleticsTemplateScenes={version:TEMPLATE_SCENES_VERSION,enhanceHome,enhanceLiveEvent};
})();
/* ===== End Home + Live Event Template Refresh ===== */
