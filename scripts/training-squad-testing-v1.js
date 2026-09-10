/* Athletics Manager — Squad Testing in Training V1 */
(function(){
'use strict';
if(window.__amTrainingSquadTestingV1)return;
window.__amTrainingSquadTestingV1=1;

let selectedWeek=null;

function esc(value){
  return String(value==null?'':value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function byId(id){return document.getElementById(id)}
function plans(){try{return typeof planList==='function'?planList():[];}catch(_){return []}}
function team(){try{return typeof managedTeam==='function'?managedTeam():[];}catch(_){return []}}
function state(){try{return typeof s!=='undefined'?s:null}catch(_){return null}}
function currentSeason(){return Number(state()?.game?.season||0)}
function currentWeek(){return Number(state()?.game?.week||1)}
function labelWeek(week){
  try{return typeof dateLabel==='function'?dateLabel(week):'Week '+week}catch(_){return 'Week '+week}
}
function athleteById(id){return state()?.athletes?.find(a=>String(a.id)===String(id))||null}
function unavailableReason(a,week){
  if(!a)return 'Unavailable';
  if(a.retired)return 'Retired';
  if(a.inSquad===false)return 'National Pool';
  if((a.injury||0)>0)return 'Injured';
  try{if(typeof activityBusy==='function'&&activityBusy(a,week))return 'Committed elsewhere';}catch(_){ }
  return '';
}
function testingPlans(){
  return plans().filter(p=>p&&p.kind==='testing'&&p.season===currentSeason()&&p.status!=='cancelled');
}
function fmtResult(row){
  if(!row)return '';
  if(row.perf==null)return esc(row.reason||'Did not test');
  try{return typeof fmtPerf==='function'?esc(fmtPerf(row.disc,row.perf)):esc(row.perf)}catch(_){return esc(row.perf)}
}
function ensureStyles(){
  if(byId('amSquadTestingTrainingStyles'))return;
  const style=document.createElement('style');
  style.id='amSquadTestingTrainingStyles';
  style.textContent=`
    .tr2-testing-shell{display:grid;gap:14px}.tr2-testing-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:14px}.tr2-testing-weeks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.tr2-testing-week{appearance:none;border:1px solid rgba(122,166,199,.22);background:rgba(7,25,38,.72);color:inherit;border-radius:8px;padding:10px;text-align:left;cursor:pointer}.tr2-testing-week strong,.tr2-testing-week small{display:block}.tr2-testing-week small{opacity:.62;margin-top:3px}.tr2-testing-week.on{border-color:rgba(238,77,104,.8);box-shadow:inset 3px 0 0 #ee4d68;background:rgba(30,55,73,.82)}.tr2-testing-week.booked:after{content:'BOOKED';display:inline-block;margin-top:7px;font-size:9px;font-weight:800;letter-spacing:.12em;color:#7ee2bc}.tr2-testing-athletes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tr2-testing-athlete{display:flex;gap:10px;align-items:center;border:1px solid rgba(122,166,199,.18);background:rgba(7,25,38,.54);padding:10px 11px;border-radius:8px}.tr2-testing-athlete input{width:17px;height:17px}.tr2-testing-athlete span{min-width:0}.tr2-testing-athlete strong,.tr2-testing-athlete small{display:block}.tr2-testing-athlete small{opacity:.6;margin-top:2px}.tr2-testing-athlete.is-off{opacity:.48}.tr2-testing-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}.tr2-testing-rule{font-size:12px;line-height:1.55;opacity:.7}.tr2-test-list{display:grid;gap:9px}.tr2-test-item{border:1px solid rgba(122,166,199,.18);border-radius:8px;padding:11px;background:rgba(7,25,38,.5)}.tr2-test-item-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.tr2-test-item p{margin:6px 0 0;opacity:.72;font-size:12px;line-height:1.5}.tr2-test-status{font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.72}.tr2-test-status.completed{color:#7ee2bc}.tr2-test-status.scheduled{color:#f2c86b}.tr2-testing-empty{opacity:.58;padding:6px 0}.tr2-testing-titleline{display:flex;justify-content:space-between;gap:12px;align-items:center}.tr2-testing-titleline span{font-size:11px;opacity:.62}.tr2-tabs [data-tr2-tab="testing"]{white-space:nowrap}@media(max-width:1000px){.tr2-testing-grid{grid-template-columns:1fr}.tr2-testing-weeks{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:720px){.tr2-testing-weeks{grid-template-columns:repeat(2,minmax(0,1fr))}.tr2-testing-athletes{grid-template-columns:1fr}.tr2-testing-actions{align-items:stretch;flex-direction:column}.tr2-testing-actions .btn{width:100%}}
  `;
  document.head.appendChild(style);
}

function renderTesting(){
  const root=byId('training');
  const shell=root?.querySelector('.tr2-shell');
  const tabs=shell?.querySelector('.tr2-tabs');
  if(!shell||!tabs)return;
  const now=currentWeek();
  selectedWeek=Math.max(now,Math.min(52,Number(selectedWeek)||now));
  tabs.querySelectorAll('[data-tr2-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tr2Tab==='testing'));
  [...shell.children].forEach(node=>{if(node!==shell.firstElementChild&&node!==tabs)node.remove()});

  const bookedWeeks=new Set(testingPlans().filter(p=>p.status==='scheduled').map(p=>Number(p.week)));
  const weeks=[];
  for(let w=now;w<=Math.min(52,now+11);w++)weeks.push(w);
  const athletes=team();
  const history=testingPlans().slice().sort((a,b)=>(b.week||0)-(a.week||0));

  const content=document.createElement('div');
  content.className='tr2-testing-shell';
  content.innerHTML=`
    <section class="panel">
      <div class="panel-h"><div class="tr2-testing-titleline"><strong>Squad Testing</strong><span>Practice marks · no ranking points</span></div></div>
      <div class="panel-body tr2-testing-grid">
        <div>
          <strong>1 · Choose week</strong>
          <p class="tr2-testing-rule">Schedule a controlled squad test in any upcoming week. Tests run when that week is advanced.</p>
          <div class="tr2-testing-weeks">${weeks.map(w=>`<button type="button" class="tr2-testing-week ${w===selectedWeek?'on':''} ${bookedWeeks.has(w)?'booked':''}" data-test-week="${w}"><strong>Week ${w}</strong><small>${esc(labelWeek(w))}</small></button>`).join('')}</div>
        </div>
        <div>
          <strong>2 · Select athletes</strong>
          <p class="tr2-testing-rule">Completed tests add 4 fatigue. Injured or otherwise committed athletes cannot test.</p>
          <div class="tr2-testing-athletes">${athletes.map(a=>{const reason=unavailableReason(a,selectedWeek);return `<label class="tr2-testing-athlete ${reason?'is-off':''}"><input type="checkbox" data-test-athlete="${esc(a.id)}" ${reason?'disabled':''}><span><strong>${esc(a.name)}</strong><small>${esc(reason||a.disc||'Available')}</small></span></label>`}).join('')||'<p class="tr2-testing-empty">No squad athletes available.</p>'}</div>
          <div class="tr2-testing-actions"><span class="tr2-testing-rule">Marks are practice-only and do not alter official records.</span><button type="button" class="btn primary" id="tr2BookTest" disabled>BOOK TESTING DAY</button></div>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-h"><strong>Testing schedule & reports</strong><span>${history.length} ${history.length===1?'entry':'entries'}</span></div>
      <div class="panel-body tr2-test-list">${history.length?history.map(p=>`<article class="tr2-test-item"><div class="tr2-test-item-head"><div><strong>${esc(labelWeek(p.week))} · Week ${p.week}</strong><p>${(p.ids||[]).map(id=>esc(athleteById(id)?.name||'Former athlete')).join(', ')||'No athletes'}</p></div><span class="tr2-test-status ${esc(p.status)}">${esc(p.status)}</span></div>${p.results?.length?`<p>${p.results.map(r=>`${esc(r.name)}: ${fmtResult(r)}`).join(' · ')}</p>`:''}${p.status==='scheduled'?`<button type="button" class="btn ghost" data-cancel-test="${esc(p.id)}" style="margin-top:9px">CANCEL TEST</button>`:''}</article>`).join(''):'<p class="tr2-testing-empty">No squad testing days booked yet.</p>'}</div>
    </section>`;
  shell.appendChild(content);

  content.querySelectorAll('[data-test-week]').forEach(button=>button.addEventListener('click',()=>{selectedWeek=Number(button.dataset.testWeek);renderTesting()}));
  const book=byId('tr2BookTest');
  const updateBook=()=>{const ids=[...content.querySelectorAll('[data-test-athlete]:checked')];if(book)book.disabled=!ids.length||bookedWeeks.has(selectedWeek)};
  content.querySelectorAll('[data-test-athlete]').forEach(input=>input.addEventListener('change',updateBook));
  updateBook();
  book?.addEventListener('click',()=>{
    const ids=[...content.querySelectorAll('[data-test-athlete]:checked')].map(x=>x.dataset.testAthlete);
    if(!ids.length)return;
    try{
      if(typeof bookPlan==='function')bookPlan('testing','development',ids,selectedWeek);
      selectedWeek=Math.max(currentWeek(),selectedWeek);
      if(typeof drawTraining==='function')drawTraining();
      setTimeout(()=>{const tab=byId('training')?.querySelector('[data-tr2-tab="testing"]');tab?.click()},0);
    }catch(err){console.error('[Athletics Manager] Squad testing booking failed',err)}
  });
  content.querySelectorAll('[data-cancel-test]').forEach(button=>button.addEventListener('click',()=>{
    const p=plans().find(x=>String(x.id)===String(button.dataset.cancelTest));
    if(!p||p.kind!=='testing'||p.status!=='scheduled')return;
    p.status='cancelled';
    try{if(typeof save==='function')save()}catch(_){ }
    renderTesting();
  }));
}

function enhanceTraining(){
  ensureStyles();
  const root=byId('training');
  const tabs=root?.querySelector('.tr2-tabs');
  if(!tabs||tabs.querySelector('[data-tr2-tab="testing"]'))return;
  const button=document.createElement('button');
  button.type='button';
  button.dataset.tr2Tab='testing';
  button.textContent='SQUAD TESTING';
  const athletes=tabs.querySelector('[data-tr2-tab="athletes"]');
  if(athletes?.nextSibling)tabs.insertBefore(button,athletes.nextSibling);else tabs.appendChild(button);
  button.addEventListener('click',renderTesting);
}

function enhanceCalendar(){
  const root=byId('calendar');
  if(!root)return;
  const layout=root.querySelector('.planner-layout');
  const calendarPanel=layout?.querySelector('section.panel');
  const planner=layout?.querySelector('aside.panel');
  if(planner)planner.remove();
  if(layout){
    layout.style.setProperty('grid-template-columns','minmax(0,1fr)','important');
    layout.style.setProperty('display','grid','important');
  }
  if(calendarPanel){
    calendarPanel.style.setProperty('width','100%','important');
    calendarPanel.style.setProperty('max-width','none','important');
  }
  root.querySelectorAll('.calendar-legend .calendar-green').forEach(el=>{
    if(/training\s*camp/i.test(el.textContent||''))el.remove();
  });
  root.querySelectorAll('button,a').forEach(el=>{
    if(/open\s+training\s+camps/i.test((el.textContent||'').trim()))el.remove();
  });
  const note=calendarPanel?.querySelector('.planner-note');
  if(note)note.textContent='Select a date to review its week. Competitions, training camps and squad testing commitments are shown here; testing is managed from Training → Squad Testing.';
}

if(typeof drawCalendar==='function'){
  const previousDrawCalendar=drawCalendar;
  drawCalendar=function(){
    const result=previousDrawCalendar.apply(this,arguments);
    enhanceCalendar();
    return result;
  };
}
try{if(typeof currentView!=='undefined'&&currentView==='calendar')enhanceCalendar()}catch(_){ }

if(typeof drawTraining==='function'){
  const previousDrawTraining=drawTraining;
  drawTraining=function(){
    const result=previousDrawTraining.apply(this,arguments);
    enhanceTraining();
    return result;
  };
}
try{if(typeof currentView!=='undefined'&&currentView==='training')enhanceTraining()}catch(_){ }
window.__athleticsSquadTestingTraining={version:1,enhance:enhanceTraining,render:renderTesting,calendar:enhanceCalendar};
})();
