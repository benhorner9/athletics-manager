/* ===== Development Update Ordering ===== */
(function(){
'use strict';
if(!Array.isArray(window.UPDATES)&&typeof UPDATES==='undefined')return;

const MAX_VISIBLE_UPDATES=5;
const SEEN_KEY='athletics_manager_seen_update_v2';

/*
 * New release notes should always include an ISO timestamp with timezone.
 * Ordering is derived from this value, never from file/load order.
 */
const RELEASES=[
  {
    timestamp:'2026-09-10T10:00:00+01:00',
    date:'10 September 2026',
    title:'Compact Event Selection',
    items:[
      'Competition selection emails now stay short instead of containing the full team-selection form.',
      'Make Selection opens a dedicated selection screen with events grouped into Sprints & Hurdles, Endurance, Relays, Jumps and Throws.',
      'Individual events stay collapsed until opened, so athlete readiness and coach detail only appear when you actually need them.',
      'Manual selections keep the same entry limits and submission rules, while the coach recommendation remains a one-touch option.'
    ]
  },
  {
    timestamp:'2026-09-10T09:39:40+01:00',
    date:'10 September 2026',
    title:'Compact Event & Selection Flow',
    items:[
      'Large Event Days now group disciplines into compact, collapsible event families instead of presenting every discipline as a full-size card.',
      'Summit Series selection now uses expandable event rows, a compact roster toolbar and optional coach-detail panels so large fields are much easier to work through.',
      'Summit selection emails now stay brief and send you to the dedicated selection screen instead of placing the full selection interface inside the inbox.',
      'Completed event groups collapse cleanly while the next unfinished group is prioritised, reducing scrolling as athletics programmes continue to expand.'
    ]
  },
  {
    timestamp:'2026-09-10T07:00:45+01:00',
    date:'10 September 2026',
    title:'Event Day Core Cleanup',
    items:[
      'Removed the old oval race renderer completely. Every live track race now uses one stadium-shaped track with two straights and curved ends, including the final moments of 800m, 1500m and longer races.',
      'Consolidated track presentation into one race core and one live track scoreboard, removing superseded race renderers, duplicate leaderboard scripts and legacy scoreboard overlays from the active build.',
      'Shot Put and High Jump retain their dedicated attempt-by-attempt field scoreboard while legacy scoreboard writes are blocked from replacing the live standings panel.',
      'Completed Summit Series meetings now always provide a clear Return Home action and cannot leave the player trapped on Event Day.',
      'Ran an Event Day integrity pass across normal meetings and Summit Series so live scenes, scoreboards, exit flow, lane limits and completion states have a single authoritative owner.'
    ]
  },
  {
    timestamp:'2026-09-09T22:01:47+01:00',
    date:'9 September 2026',
    title:'Field Events & Summit Event Day',
    items:[
      'Shot Put now plays at a clearer pace with a short landing pause, varied attempt commentary and a measured-distance display tied directly to the recorded throw.',
      'High Jump now shows a visible 2D-dot approach, take-off, clearance or miss and landing, with slower pacing so each featured attempt is easy to follow.',
      'Shot Put and High Jump live standings use completed attempts as their source of truth and update mounted rows instead of rebuilding the scoreboard.',
      'Summit Series meetings use the same modern Event Day presentation, discipline cards, live viewer, commentary, Watch / Skip controls and no-entry skip options as normal competitions.',
      'The Event Day progression safeguards remain active so a presentation problem cannot trap a career inside a running event.'
    ]
  },
  {
    timestamp:'2026-09-09T20:00:00+01:00',
    date:'9 September 2026',
    title:'Premium Athlete & Coach Profiles',
    items:[
      'Athlete and coach dossiers now use a full-screen premium presentation with a larger portrait, compact metadata and a stronger rating panel.',
      'Athlete profiles keep live squad agreements, training load, injuries, development grades, qualification, rivalries, career preferences and performance intelligence.',
      'Athlete navigation includes Training, Development and Injuries alongside Overview, Results & Form and Records & Milestones.',
      'Coach dossiers use the same visual language with role, contract, style, podium, record and athlete-support information.',
      'The layout is optimised for iPad and desktop while phones collapse to a clean single-column profile.'
    ]
  },
  {
    timestamp:'2026-09-09T19:00:00+01:00',
    date:'9 September 2026',
    title:'Full Event Day Audit',
    items:[
      'Audited all current disciplines across lane races, pack races, Shot Put and High Jump so animation, commentary, live standings and final results follow the same event state.',
      'High Jump live standings use proper countback: best height, misses at that height and then total failures.',
      'Track DNFs are removed from the active running order when an athlete pulls up while retaining their last split.',
      'Shot Put ties compare the next-best valid marks instead of falling back to pre-simulated finishing order.',
      'Summit Series uses the same event simulation and AI realism as normal Event Day.'
    ]
  }
];

function parseLegacyDate(value){
  if(!value)return 0;
  const n=Date.parse(value);
  return Number.isFinite(n)?n:0;
}
function stampValue(item){
  const exact=Date.parse(item?.timestamp||'');
  if(Number.isFinite(exact))return exact;
  return parseLegacyDate(item?.date);
}
function displayStamp(item){
  const exact=Date.parse(item?.timestamp||'');
  if(!Number.isFinite(exact))return item?.date||'';
  return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/London'}).format(new Date(exact)).replace(',',' ·');
}
function mergeAndSort(extra=[]){
  const merged=[...RELEASES,...extra];
  const seen=new Set(),deduped=[];
  for(const item of merged){
    if(!item)continue;
    const key=item.timestamp||`${item.date||''}|${item.title||''}`;
    if(seen.has(key))continue;
    seen.add(key);deduped.push({...item,items:Array.isArray(item.items)?[...item.items]:[]});
  }
  deduped.forEach((x,i)=>x.__updateOrder=i);
  deduped.sort((a,b)=>stampValue(b)-stampValue(a)||a.__updateOrder-b.__updateOrder);
  deduped.forEach(x=>delete x.__updateOrder);
  UPDATES.splice(0,UPDATES.length,...deduped.slice(0,MAX_VISIBLE_UPDATES));
}

const legacy=UPDATES.slice();
mergeAndSort(legacy);

/* Any later patch can add a timestamped release and it will still land in the right place. */
const nativeUnshift=Array.prototype.unshift;
const nativePush=Array.prototype.push;
UPDATES.unshift=function(...items){nativeUnshift.apply(this,items);mergeAndSort(this.slice());return this.length};
UPDATES.push=function(...items){nativePush.apply(this,items);mergeAndSort(this.slice());return this.length};
window.addDevelopmentUpdate=function(update){if(!update||!update.timestamp)throw new Error('Development updates require a timestamp');nativeUnshift.call(UPDATES,update);mergeAndSort(UPDATES.slice());if(typeof renderMenu==='function')renderMenu();return update};

function decoratePanel(){
  const panel=document.getElementById('latestUpdatePanel');
  if(!panel)return;
  const entries=[...panel.querySelectorAll('.update-entry')];
  let seenStamp=0;try{seenStamp=Number(localStorage.getItem(SEEN_KEY)||0)}catch(_){ }
  const latestStamp=stampValue(UPDATES[0]);
  entries.forEach((entry,i)=>{
    const u=UPDATES[i];if(!u)return;
    const dateEl=entry.querySelector('.latest-update-head span');
    if(dateEl)dateEl.textContent=displayStamp(u);
    if(i===0&&latestStamp>seenStamp){
      entry.classList.add('is-new-update');
      const label=entry.querySelector('.latest-update-head strong');
      if(label)label.textContent='NEW UPDATE';
    }
  });
  const title=panel.querySelector('.update-panel-title span');
  if(title&&UPDATES[0])title.textContent=`Latest ${displayStamp(UPDATES[0])}`;
  if(latestStamp>seenStamp){try{localStorage.setItem(SEEN_KEY,String(latestStamp))}catch(_){ }}
}

const style=document.createElement('style');
style.textContent='.update-entry.is-new-update{box-shadow:inset 3px 0 var(--accent,#64d393)}.update-entry.is-new-update .latest-update-head strong{color:var(--accent,#64d393)}';
document.head.appendChild(style);

if(typeof renderMenu==='function'){
  const baseRenderMenu=renderMenu;
  renderMenu=function(){mergeAndSort(UPDATES.slice());const out=baseRenderMenu();decoratePanel();return out};
  renderMenu();
}else decoratePanel();
})();
/* ===== End Development Update Ordering ===== */

/* ===== Standalone Compact Event Selection ===== */
(function(){
'use strict';
if(window.__amStandaloneEventSelection)return;window.__amStandaloneEventSelection=1;
const $=id=>document.getElementById(id);
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eventDiscs=e=>(e?.disc||[]).filter(d=>d&&d!=='ALL');
function family(d){const x=(String(d)+' '+String(typeof discLabel==='function'?discLabel(d):d)).toLowerCase();if(/relay/.test(x))return'Relays';if(/high.?jump|long.?jump|triple.?jump|pole.?vault|\bjump\b|vault/.test(x))return'Jumps';if(/shot|discus|javelin|hammer|throw/.test(x))return'Throws';if(/800|1500|3000|5000|10000|10,?000|steeple|marathon|walk|cross/.test(x))return'Endurance';if(/hurd|60m|100m|200m|400m|sprint/.test(x))return'Sprints & Hurdles';return'Other Events'}
const familyOrder=['Sprints & Hurdles','Endurance','Relays','Jumps','Throws','Other Events'];
function shortText(v,n=240){const t=String(v||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1).trimEnd()+'…':t}
function selectedCount(e){return eventDiscs(e).reduce((n,d)=>n+(e.entries?.[d]?.length||0),0)}
function selectedEvents(e){return eventDiscs(e).filter(d=>(e.entries?.[d]||[]).length).length}
function uniqueEligible(e){const ids=new Set();for(const d of eventDiscs(e))for(const a of eligibleFor(e,d)||[])ids.add(a.id);return ids.size}
function limitFor(e,d){try{return selectionEntryLimit(e,d)}catch(_){return 2}}
function ensureDialog(){let dlg=$('amEventSelectionDialog');if(dlg)return dlg;dlg=document.createElement('dialog');dlg.id='amEventSelectionDialog';dlg.className='am-event-selection-dialog';document.body.appendChild(dlg);return dlg}
const css=`
.am-selection-mail-card{display:grid;gap:12px}.am-selection-mail-card>p{margin:0;color:#9bb0bf;line-height:1.55;font-size:10px}.am-selection-mail-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.am-selection-mail-stats>div{padding:10px 11px;background:#091a27;border:1px solid #203d51;border-radius:8px}.am-selection-mail-stats small{display:block;color:#7894a7;font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.am-selection-mail-stats strong{display:block;margin-top:3px;color:#eff6f9;font-size:11px}.am-selection-mail-note{padding:10px 11px;border-left:2px solid #518fb8;background:#0a1b28;color:#9db0bc;font-size:9px;line-height:1.5}.reader-actions.am-selection-mail-actions{display:grid!important;grid-template-columns:minmax(180px,1fr) minmax(160px,.8fr) minmax(140px,.65fr);gap:8px}.reader-actions.am-selection-mail-actions .btn{width:100%;min-height:40px}
.am-event-selection-dialog{width:min(1100px,calc(100vw - 24px));max-width:none;height:min(860px,calc(100dvh - 24px));max-height:none;margin:auto;padding:0;border:1px solid #29475b;border-radius:14px;background:#07131e;color:#edf5f8;box-shadow:0 30px 90px #000b;overflow:hidden}.am-event-selection-dialog::backdrop{background:#02080dcc;backdrop-filter:blur(5px)}.am-es-shell{height:100%;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto}.am-es-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 18px 13px;border-bottom:1px solid #1b3547;background:#091923}.am-es-head small{display:block;font-size:8px;font-weight:950;letter-spacing:.11em;text-transform:uppercase;color:#7192a7}.am-es-head h2{margin:3px 0 4px;font-size:20px}.am-es-head p{margin:0;color:#89a0b0;font-size:9px}.am-es-close{border:0;background:#102434;color:#9db1bf;width:36px;height:36px;border-radius:8px;font-size:20px;cursor:pointer}.am-es-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 18px;border-bottom:1px solid #1a3344;background:#081622}.am-es-progress small{display:block;font-size:7px;color:#7892a4;font-weight:900;text-transform:uppercase;letter-spacing:.09em}.am-es-progress strong{display:block;margin-top:2px;font-size:12px}.am-es-toolbar .actions{display:flex;gap:7px}.am-es-toolbar .btn{min-height:35px;padding:7px 11px;font-size:8px}.am-es-scroll{overflow:auto;padding:12px 16px 18px}.am-es-groups{display:grid;gap:8px}.am-es-group{border:1px solid #1e394c;border-radius:10px;overflow:hidden;background:#081824}.am-es-group-head{width:100%;border:0;background:#0b1d2b;color:#eef6fa;padding:11px 13px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;text-align:left;cursor:pointer}.am-es-group-head strong{font-size:11px}.am-es-group-head span{font-size:8px;color:#819bab;font-weight:850}.am-es-group-head i{font-style:normal;font-size:15px;color:#8099aa;transition:transform .16s}.am-es-group.open .am-es-group-head i{transform:rotate(90deg)}.am-es-group-body{display:none;border-top:1px solid #1e394c}.am-es-group.open .am-es-group-body{display:block}.am-es-disc{border-bottom:1px solid #ffffff0d}.am-es-disc:last-child{border-bottom:0}.am-es-disc-head{width:100%;border:0;background:#091923;color:#eef6fa;padding:10px 12px;display:grid;grid-template-columns:minmax(140px,1fr) auto auto auto;gap:10px;align-items:center;text-align:left;cursor:pointer}.am-es-disc-head strong{font-size:10px}.am-es-disc-head span{font-size:8px;color:#7893a5}.am-es-disc-head b{font-size:8px;color:#abc0cc}.am-es-disc-head i{font-style:normal;font-size:15px;color:#7893a5;transition:transform .16s}.am-es-disc.open .am-es-disc-head{background:#0c2030}.am-es-disc.open .am-es-disc-head i{transform:rotate(90deg)}.am-es-disc-body{display:none;padding:10px 12px 12px;background:#071722}.am-es-disc.open .am-es-disc-body{display:block}.am-es-disc-tools{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.am-es-reason{display:flex;align-items:center;gap:8px;color:#7f98a9;font-size:8px}.am-es-reason select{background:#0b2030;color:#dbe7ed;border:1px solid #29475c;border-radius:7px;min-height:32px;padding:0 8px;font-size:8px}.am-es-coach{margin:0 0 9px;border:1px solid #1c394c;border-radius:8px;background:#091b28}.am-es-coach summary{cursor:pointer;padding:9px 10px;font-size:8px;font-weight:900;color:#9ab2c1}.am-es-coach .selection-brief{border:0!important;margin:0!important;padding:0 10px 10px!important;background:transparent!important}.am-es-candidates{display:grid;gap:5px}.am-es-athlete{display:grid;grid-template-columns:minmax(150px,1.15fr) minmax(95px,.65fr) minmax(95px,.65fr) 52px 135px 92px;gap:8px;align-items:center;padding:8px 9px;background:#091923;border:1px solid #1b3446;border-radius:8px}.am-es-athlete.selected{border-color:#42799b;background:#0b2030}.am-es-athlete .who{min-width:0}.am-es-athlete .who strong{display:block;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-es-athlete .who small,.am-es-athlete .metric small{display:block;font-size:7px;color:#728c9e}.am-es-athlete .metric strong{display:block;font-size:8px;margin-top:1px}.am-es-athlete .select-toggle{min-height:34px!important;font-size:8px!important;padding:6px 8px!important}.am-es-empty{padding:12px;color:#7892a4;font-size:9px}.am-es-foot{display:flex;justify-content:flex-end;gap:8px;padding:10px 18px;border-top:1px solid #1b3547;background:#091923}.am-es-foot .btn{min-height:38px}.am-es-group.complete .am-es-group-head{background:#091923}
@media(max-width:760px){.am-selection-mail-stats{grid-template-columns:1fr 1fr}.reader-actions.am-selection-mail-actions{grid-template-columns:1fr}.am-event-selection-dialog{width:100vw;height:100dvh;border:0;border-radius:0}.am-es-head,.am-es-toolbar,.am-es-foot{padding-left:12px;padding-right:12px}.am-es-toolbar{align-items:flex-start;flex-direction:column}.am-es-toolbar .actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.am-es-toolbar .btn{width:100%}.am-es-scroll{padding:9px}.am-es-disc-head{grid-template-columns:minmax(0,1fr) auto auto}.am-es-disc-head .eligible{display:none}.am-es-disc-tools{align-items:flex-start;flex-direction:column}.am-es-athlete{grid-template-columns:minmax(0,1fr) 84px}.am-es-athlete .metric{display:none}.am-es-athlete .metric.readiness{display:block;grid-column:1/2}.am-es-athlete .select-toggle{grid-column:2/3;grid-row:1/3}.am-es-foot{display:grid;grid-template-columns:1fr 1fr}.am-es-foot .btn{width:100%}}
`;
if(!$('amEventSelectionStyles')){const st=document.createElement('style');st.id='amEventSelectionStyles';st.textContent=css;document.head.appendChild(st)}
function mailSummary(e,m){const ds=eventDiscs(e),picked=selectedCount(e),eventsPicked=selectedEvents(e),eligible=uniqueEligible(e),text=shortText(m?.body||`Select your team for ${e.name}.`);return `<div class="am-selection-mail-card"><p>${esc(text)}</p><div class="am-selection-mail-stats"><div><small>Event</small><strong>${esc(e.name)}</strong></div><div><small>Competition week</small><strong>Week ${e.week}</strong></div><div><small>Events selected</small><strong>${eventsPicked} / ${ds.length}</strong></div><div><small>Eligible squad</small><strong>${eligible} athlete${eligible===1?'':'s'}</strong></div></div><div class="am-selection-mail-note">${picked?`${picked} athlete entr${picked===1?'y is':'ies are'} currently selected. Open the selection screen to review or change them before submitting.`:'No athletes selected yet. Open the selection screen to build the team.'}</div></div>`}
function compactReader(){const reader=$('reader'),m=(s?.emails||[]).find(x=>x.id===openMail)||(s?.emails||[]).at?.(-1),e=m?.eventId?(s.events||[]).find(x=>x.id===m.eventId):null;if(!reader||!m||!e||m.summitRegistration||m.selectionSubmitted||e.completed||e.decision||e.id==='olympics'||m.type!=='selection'||!['competition','championship'].includes(e.kind))return;const body=reader.querySelector('.reader-body'),actions=reader.querySelector('.reader-actions');if(!body||!actions)return;body.innerHTML=mailSummary(e,m);actions.className='reader-actions am-selection-mail-actions';actions.innerHTML='<button id="amMakeEventSelection" class="btn primary">MAKE SELECTION</button><button id="amUseCoachEventSelection" class="btn secondary">USE COACH RECOMMENDATION</button><button id="amEventPreviewFromMail" class="btn ghost">VIEW EVENT PREVIEW</button>';$('amMakeEventSelection').onclick=()=>openSelection(e);$('amUseCoachEventSelection').onclick=()=>{applyRecommendedEventSelection(e);setTimeout(compactReader,0)};$('amEventPreviewFromMail').onclick=()=>view('competition')}
function groupData(e){const map=new Map();for(const d of eventDiscs(e)){const f=family(d);if(!map.has(f))map.set(f,[]);map.get(f).push(d)}return [...map.entries()].sort((a,b)=>familyOrder.indexOf(a[0])-familyOrder.indexOf(b[0]))}
function athleteRow(e,d,a){const st=selectionStats(a),on=(e.entries?.[d]||[]).includes(a.id),ready=`F ${a.form} · Fit ${a.fitness} · Fat ${a.fatigue}`;return `<div class="am-es-athlete ${on?'selected':''}"><div class="who"><strong>${athleteLink(a)}</strong><small>Age ${a.age} · Ability ${esc(assessmentText(a,'overall'))}</small></div><div class="metric"><small>PB</small><strong>${esc(fmtPerf(d,a.pb))}</strong></div><div class="metric"><small>Season best</small><strong>${st.best===null?'—':esc(fmtPerf(d,st.best))}</strong></div><div class="metric"><small>Form</small><strong>${a.form}</strong></div><div class="metric readiness"><small>Readiness</small><strong>${ready}</strong></div><button class="select-toggle ${on?'on':''}" data-am-es-pick="${esc(d)}|${esc(a.id)}">${on?'SELECTED':'SELECT'}</button></div>`}
function disciplineHTML(e,d,open){const candidates=eligibleFor(e,d)||[],picked=e.entries?.[d]?.length||0,limit=limitFor(e,d),reason=e.selectionReasons?.[d]||'performance';return `<section class="am-es-disc ${open?'open':''}"><button class="am-es-disc-head" type="button" data-am-es-open="${esc(d)}"><strong>${esc(discLabel(d))}</strong><span>${picked}/${limit} selected</span><span class="eligible">${candidates.length} eligible</span><i>›</i></button><div class="am-es-disc-body"><div class="am-es-disc-tools"><label class="am-es-reason">Selection approach <select data-am-es-reason="${esc(d)}" ${e.selectionRecorded?.[d]?'disabled':''}><option value="performance" ${reason==='performance'?'selected':''}>Performance</option><option value="rest" ${reason==='rest'?'selected':''}>Rest / recovery</option><option value="development" ${reason==='development'?'selected':''}>Development opportunity</option></select></label><span class="status">${picked}/${limit} places used</span></div><details class="am-es-coach"><summary>COACH VIEW & RECOMMENDATION</summary>${selectionBriefing(e,d,candidates)}</details><div class="am-es-candidates">${candidates.length?candidates.map(a=>athleteRow(e,d,a)).join(''):'<div class="am-es-empty">No eligible squad athlete is available for this event.</div>'}</div></div></section>`}
function renderSelection(e,openDisc=null){const dlg=ensureDialog(),groups=groupData(e),defaultFamily=openDisc?family(openDisc):(groups.find(([,list])=>list.some(d=>!(e.entries?.[d]||[]).length))?.[0]||groups[0]?.[0]),picked=selectedCount(e),eventPicked=selectedEvents(e),total=eventDiscs(e).length;dlg.innerHTML=`<div class="am-es-shell"><header class="am-es-head"><div><small>${esc(nationName(managedNation()))} · Team selection</small><h2>${esc(e.name)}</h2><p>${esc(e.location||'')} · Week ${e.week} · ${total} events</p></div><button class="am-es-close" id="amEsClose" aria-label="Close">×</button></header><div class="am-es-toolbar"><div class="am-es-progress"><small>Selection progress</small><strong>${eventPicked}/${total} events · ${picked} athlete entr${picked===1?'y':'ies'}</strong></div><div class="actions"><button class="btn ghost" id="amEsCoach">USE & SUBMIT COACH PICKS</button><button class="btn primary" id="amEsSubmit">SUBMIT TEAM</button></div></div><main class="am-es-scroll"><div class="am-es-groups">${groups.map(([name,list])=>{const open=name===defaultFamily,filled=list.filter(d=>(e.entries?.[d]||[]).length).length;return `<section class="am-es-group ${open?'open':''} ${filled===list.length?'complete':''}"><button class="am-es-group-head" type="button"><strong>${esc(name)}</strong><span>${filled}/${list.length} selected</span><i>›</i></button><div class="am-es-group-body">${list.map(d=>disciplineHTML(e,d,d===openDisc)).join('')}</div></section>`}).join('')}</div></main><footer class="am-es-foot"><button class="btn ghost" id="amEsBack">BACK TO EMAIL</button><button class="btn primary" id="amEsSubmitBottom">SUBMIT TEAM</button></footer></div>`;
 dlg.querySelectorAll('.am-es-group-head').forEach(b=>b.onclick=()=>b.closest('.am-es-group').classList.toggle('open'));dlg.querySelectorAll('[data-am-es-open]').forEach(b=>b.onclick=()=>{const box=b.closest('.am-es-disc'),was=box.classList.contains('open');dlg.querySelectorAll('.am-es-disc.open').forEach(x=>x.classList.remove('open'));if(!was)box.classList.add('open')});dlg.querySelectorAll('[data-am-es-pick]').forEach(b=>b.onclick=()=>{const [d,id]=b.dataset.amEsPick.split('|'),list=e.entries[d]||[],on=list.includes(id),limit=limitFor(e,d);if(!on&&list.length>=limit){toast(`${discLabel(d)} has ${limit} entry place${limit===1?'':'s'}`);return}e.entries[d]=on?list.filter(x=>x!==id):[...list,id];save();renderSelection(e,d)});dlg.querySelectorAll('[data-am-es-reason]').forEach(sel=>sel.onchange=()=>{e.selectionReasons??={};e.selectionReasons[sel.dataset.amEsReason]=sel.value;save()});const close=()=>{if(dlg.open)dlg.close();if(currentView==='inbox')drawReader()};$('amEsClose').onclick=close;$('amEsBack').onclick=close;const submit=()=>{const ok=confirmEventSelection(e);if(ok&&dlg.open)dlg.close()};$('amEsSubmit').onclick=submit;$('amEsSubmitBottom').onclick=submit;$('amEsCoach').onclick=()=>{const ok=applyRecommendedEventSelection(e);if(ok!==false&&dlg.open)dlg.close()}}
function openSelection(e){const dlg=ensureDialog();renderSelection(e);if(!dlg.open)dlg.showModal()}
const baseDrawReader=drawReader;drawReader=function(){const out=baseDrawReader();setTimeout(compactReader,0);return out};
window.openCompactEventSelection=openSelection;
setTimeout(compactReader,0);
})();
/* ===== End Standalone Compact Event Selection ===== */
