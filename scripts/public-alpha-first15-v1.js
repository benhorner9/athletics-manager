/* ===== Public Alpha First 15 Pass ===== */
(function(){
'use strict';
if(window.__amPublicAlphaFirst15V1)return;window.__amPublicAlphaFirst15V1=1;

const INDOOR_ID='indoor';
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=id=>document.getElementById(id);

/* Keep the release note independent of the feature code below. */
try{
 const update={
  timestamp:'2026-09-10T14:05:00+01:00',
  date:'10 September 2026',
  title:'Public Alpha First 15 Pass',
  items:[
   'The Week 4 Indoor Speed Test is now a playable Event Day moment, letting you watch the senior squad and National Pool sprinters through Live 2D instead of receiving an automatic result.',
   'First-day guidance and National Pool explanations have been cut back so new players reach decisions faster without removing the underlying management depth.',
   'The opening training choice now includes a coach recommendation based on current squad fatigue, giving new players a sensible starting point without forcing the decision.',
   'Indoor testing reports now lead with the coaching decision: a call-up case, a close watch or no immediate squad change, with the detailed marks underneath.',
   'Event Day discipline cards are significantly tighter on phone and iPad, removing repeated status information while keeping entries, results and controls clear.'
  ]
 };
 if(Array.isArray(UPDATES)&&!UPDATES.some(x=>x?.timestamp===update.timestamp)){Array.prototype.unshift.call(UPDATES,update);if(UPDATES.length>5)UPDATES.splice(5);if(typeof renderMenu==='function')renderMenu()}
}catch(err){console.warn('First 15 release note recovered',err)}

function indoorEvent(){return (s?.events||[]).find(e=>e?.id===INDOOR_ID)||null}
function isLiveIndoor(e){return !!(e&&e.id===INDOOR_ID&&e.kind==='testing'&&e.publicAlphaLiveTesting)}
function prepareIndoor(e){
 if(!e||e.id!==INDOOR_ID||e.completed||Number(e.week)!==Number(s?.game?.week))return e;
 e.publicAlphaLiveTesting=true;
 e.eventDayMode='watch';
 e.results??={};e.entries??={};
 for(const d of (e.disc||[]).filter(Boolean)){
  e.entries[d]=(typeof managedTeam==='function'?managedTeam():[]).filter(a=>a&&!a.retired&&a.disc===d&&(a.injury||0)===0).map(a=>a.id);
 }
 return e;
}

/* Week 4 testing used to resolve inside onWeekStart. Keep it pending so Event Day owns it. */
if(typeof onWeekStart==='function'&&!onWeekStart.__publicAlphaFirst15){
 const baseWeek=onWeekStart;
 const wrapped=function(...args){
  const e=(s?.events||[]).find(x=>x?.id===INDOOR_ID&&!x.completed&&Number(x.week)===Number(s?.game?.week)&&x.kind==='testing');
  if(!e)return baseWeek.apply(this,args);
  prepareIndoor(e);
  const kind=e.kind;e.kind='testing-live';
  let out;
  try{out=baseWeek.apply(this,args)}finally{e.kind=kind;prepareIndoor(e);try{save()}catch(_){}}
  return out;
 };
 wrapped.__publicAlphaFirst15=true;wrapped.__base=baseWeek;onWeekStart=wrapped;
}

/* Treat the opening test like an event that must be resolved before the week can move on. */
if(typeof currentBlocking==='function'&&!currentBlocking.__publicAlphaFirst15){
 const baseBlocking=currentBlocking;
 const wrapped=function(){
  const block=baseBlocking.apply(this,arguments);if(block)return block;
  const e=indoorEvent();
  return e&&!e.completed&&Number(e.week)===Number(s?.game?.week)&&e.publicAlphaLiveTesting?e:null;
 };
 wrapped.__publicAlphaFirst15=true;wrapped.__base=baseBlocking;currentBlocking=wrapped;
}

/* Prevent the testing event from also producing the generic competition recap/news. */
if(typeof generateEventNews==='function'&&!generateEventNews.__publicAlphaFirst15){
 const base=generateEventNews;
 const wrapped=function(e){if(isLiveIndoor(e))return;return base.apply(this,arguments)};
 wrapped.__publicAlphaFirst15=true;wrapped.__base=base;generateEventNews=wrapped;
}
if(typeof publishEventStory==='function'&&!publishEventStory.__publicAlphaFirst15){
 const base=publishEventStory;
 const wrapped=function(e){if(isLiveIndoor(e))return;return base.apply(this,arguments)};
 wrapped.__publicAlphaFirst15=true;wrapped.__base=base;publishEventStory=wrapped;
}

function poolAdvice(e){
 const out=[];
 for(const d of e?.disc||[])for(const row of e?.results?.[d]||[]){
  try{const ad=indoorPoolAdvice(e,d,row);if(ad)out.push({...ad,disc:d,perf:Number(row.perf)})}catch(_){}
 }
 return out;
}
function squadResults(e,d){
 return (e?.results?.[d]||[]).filter(r=>{const a=(s?.athletes||[]).find(x=>x.id===r.id);return a&&a.nation===managedNation()&&a.inSquad!==false}).sort((a,b)=>typeof better==='function'?(better(d,a.perf,b.perf)?-1:better(d,b.perf,a.perf)?1:0):Number(a.perf)-Number(b.perf));
}
function managedResults(e,d){return (e?.results?.[d]||[]).filter(r=>(s?.athletes||[]).find(a=>a.id===r.id)?.nation===managedNation())}
function shortPoolReason(x,e){
 const squad=squadResults(e,x.disc),weak=squad.at(-1);
 if(x.level==='CALL-UP RECOMMENDED')return 'No senior-squad benchmark was recorded in this event.';
 if(x.level==='CALL-UP CASE')return weak?`${x.athlete.name} beat ${weak.name}'s squad mark in the same test.`:`${x.athlete.name} has made a strong case for promotion.`;
 if(x.level==='MONITOR CLOSELY')return weak?`${x.athlete.name} finished ${indoorTestingGapText(x.disc,x.perf,weak.perf)} from ${weak.name}'s squad mark.`:`${x.athlete.name} is close enough to keep under review.`;
 return weak?`${x.athlete.name} remains behind ${weak.name}'s current squad mark.`:'Keep the athlete in the National Pool for now.';
}
function indoorDecision(e){
 const pool=poolAdvice(e),cases=pool.filter(x=>x.level==='CALL-UP CASE'||x.level==='CALL-UP RECOMMENDED'),close=pool.filter(x=>x.level==='MONITOR CLOSELY');
 if(cases.length){const lead=cases[0];return{tone:'good',label:'CALL-UP CASE',headline:`${lead.athlete.name} has made a case for a squad place.`,detail:shortPoolReason(lead,e),lead,pool}}
 if(close.length){const lead=close[0];return{tone:'',label:'KEEP WATCHING',headline:`${lead.athlete.name} is close to the current squad level.`,detail:shortPoolReason(lead,e),lead,pool}}
 return{tone:'warn',label:'NO CHANGE',headline:'No immediate squad change recommended.',detail:pool.length?'The current squad benchmarks remain ahead after this test.':'No National Pool sprinter produced a usable comparison.',lead:pool[0]||null,pool};
}
function indoorReportHTML(e){
 const decision=indoorDecision(e);
 const results=(e.disc||[]).map(d=>{
  const rows=managedResults(e,d).slice(0,6);
  return `<div class="pa15-test-block"><div class="pa15-test-head"><strong>${esc(discLabel(d))}</strong><span>${rows.length} tested</span></div>${rows.map((r,i)=>{const a=(s?.athletes||[]).find(x=>x.id===r.id),pool=a?.inSquad===false;return `<div class="pa15-test-result"><b>${i+1}</b><span>${a?athleteLink(a):esc(r.name)}<small>${pool?'National Pool':'Senior squad'}</small></span><strong>${esc(fmtPerf(d,r.perf))}</strong></div>`}).join('')||'<p>No result recorded.</p>'}</div>`;
 }).join('');
 const reviews=decision.pool.map(x=>`<div class="pa15-pool-review"><div><strong>${athleteLink(x.athlete)}</strong><small>${esc(discLabel(x.disc))} • ${esc(fmtPerf(x.disc,x.perf))}</small></div><span class="status ${esc(x.cls||'')}">${esc(x.level)}</span><p>${esc(shortPoolReason(x,e))}</p></div>`).join('');
 return `<div class="mail-section pa15-decision-card"><small>HEAD COACH</small><span class="status ${esc(decision.tone)}">${esc(decision.label)}</span><h3>${esc(decision.headline)}</h3><p>${esc(decision.detail)}</p></div><div class="mail-section"><h3>Testing results</h3>${results}</div><div class="mail-section"><h3>National Pool review</h3>${reviews||'<p>No National Pool athlete took part.</p>'}</div>`;
}
function sendIndoorReview(e){
 if(!isLiveIndoor(e)||!e.completed||e.publicAlphaReviewSent)return;
 e.publicAlphaReviewSent=true;
 const decision=indoorDecision(e),subject=decision.label==='CALL-UP CASE'?`Indoor testing: ${decision.lead.athlete.name} makes a squad case`:'Indoor testing: coach review';
 try{
  const id=newMail(sender('performance'),subject,decision.headline+' '+decision.detail,'review',e.id),m=(s.emails||[]).find(x=>x.id===id);
  if(m){m.html=indoorReportHTML(e);m.publicAlphaIndoorReview=true}
  if(!e.publicAlphaNewsSent){e.publicAlphaNewsSent=true;addNews('Federation',decision.label==='CALL-UP CASE'?`${decision.lead.athlete.name} pushes for a national squad place`:`${nationName(managedNation())} complete indoor speed testing`,decision.headline,decision.detail,{nation:managedNation(),athleteId:decision.lead?.athlete?.id,event:e.name})}
 }catch(err){console.warn('Indoor testing review recovered',err)}
 try{save()}catch(_){}
}

if(typeof indoorTestingMailHTML==='function')indoorTestingMailHTML=indoorReportHTML;
if(typeof finaliseEvent==='function'&&!finaliseEvent.__publicAlphaFirst15){
 const baseFinal=finaliseEvent;
 const wrapped=function(e,skipped){
  const liveTest=isLiveIndoor(e),was=!!e?.completed;
  if(liveTest)e.eventRecapSent=true;
  const out=baseFinal.apply(this,arguments);
  if(liveTest&&!was&&e?.completed)sendIndoorReview(e);
  return out;
 };
 wrapped.__publicAlphaFirst15=true;wrapped.__base=baseFinal;finaliseEvent=wrapped;
}

/* New-player training choice: give a sensible staff lead without making the choice for them. */
function trainingRecommendation(){
 const squad=typeof managedTeam==='function'?managedTeam():[],high=squad.filter(a=>(Number(a.fatigue)||0)>=60).length,avg=squad.length?squad.reduce((n,a)=>n+(Number(a.fatigue)||0),0)/squad.length:0;
 if(high>=2||avg>=48)return{key:'Recovery',reason:high?`${high} squad athletes are already carrying high fatigue.`:'Squad fatigue is high enough to prioritise freshness.'};
 return{key:'Balanced',reason:'The squad is in reasonable shape. Start balanced and adjust after the first weekly report.'};
}
function trimFirstDay(){
 const root=get('firstDay'),step=s?.induction?.step;if(!root)return;
 if(step==='arrival'){
  const letter=root.querySelector('.firstday-letter p');
  try{if(letter)letter.textContent=`“${INTRO_DATA[managedNation()]?.mandate||'Build a competitive national programme.'}”`}catch(_){}
 }else if(step==='people'){
  const h1=root.querySelector('.firstday-body h1');if(h1)h1.textContent='Meet three names.';
  const cards=[...root.querySelectorAll('.firstday-athlete')];
  cards.forEach((card,i)=>{const ps=card.querySelectorAll('p');if(ps[1])ps[1].textContent=i===0?'Established squad option.':i===1?'A prospect who can put pressure on the squad.':'An international benchmark in the same event.'});
  const callout=root.querySelector('.firstday-callout');if(callout){const b=callout.querySelector('b'),span=callout.querySelector('span');if(b)b.textContent='What matters';if(span)span.textContent='Form, fitness and fatigue affect performance.'}
 }else if(step==='decision'){
  const h1=root.querySelector('.firstday-body h1');if(h1)h1.textContent='Set Week 1.';
  const lead=root.querySelector('.firstday-lead');if(lead)lead.textContent='Choose a training plan. Scouting can stay broad or focus on one event.';
  const rec=trainingRecommendation(),choice=root.querySelector(`[data-firstday-plan="${rec.key}"]`),choices=root.querySelector('.firstday-choices');
  if(choices&&!root.querySelector('.pa15-coach-recommendation'))choices.insertAdjacentHTML('beforebegin',`<div class="pa15-coach-recommendation"><small>HEAD COACH</small><strong>${esc(FIRST_DAY_PLANS?.[rec.key]?.tag||rec.key)} — recommended</strong><span>${esc(rec.reason)}</span></div>`);
  if(choice&&!choice.querySelector('.pa15-coach-pick'))choice.insertAdjacentHTML('afterbegin','<span class="pa15-coach-pick">COACH PICK</span>');
  const notes=[...root.querySelectorAll('.firstday-footnote')];if(notes[0])notes[0].textContent=rec.reason;
  const scout=root.querySelector('.firstday-name small');if(scout)scout.textContent='New discoveries go to the National Pool.';
  root.querySelector('.firstday-callout')?.remove();
  if(notes.at(-1)&&notes.at(-1)!==notes[0])notes.at(-1).textContent=s.induction?.draftPlan?'You can change the selection before confirming.':'Choose a training plan to continue.';
 }else if(step==='ready'){
  const h1=root.querySelector('.firstday-body h1');if(h1)h1.textContent='Ready for Week 1.';
  const lead=root.querySelector('.firstday-lead');if(lead)lead.innerHTML=`Training: <strong>${esc(s.trainingFocus)}</strong>. Scouting: <strong>${esc(scoutingState().focus==='All'?'All events':discLabel(scoutingState().focus))}</strong>.`;
  const callouts=[...root.querySelectorAll('.firstday-callout')];if(callouts[0])callouts[0].remove();
  for(const article of root.querySelectorAll('.firstday-roadmap article')){const title=article.querySelector('h3')?.textContent||'',p=article.querySelector('p');if(!p)continue;if(/Indoor Speed Test/i.test(title))p.textContent='Watch senior-squad and National Pool sprinters compete under the same conditions.';else if(/Winter Throws Meet/i.test(title))p.textContent='Your first ranked selection and competition.'}
  root.querySelector('.firstday-footnote')?.remove();
 }
}
if(typeof drawFirstDay==='function'&&!drawFirstDay.__publicAlphaFirst15){
 const baseDraw=drawFirstDay;
 const wrapped=function(){const out=baseDraw.apply(this,arguments);try{trimFirstDay()}catch(err){console.warn('First-day trim recovered',err)}return out};
 wrapped.__publicAlphaFirst15=true;wrapped.__base=baseDraw;drawFirstDay=wrapped;
}

/* Keep National Pool rules available without making the screen a wall of instructions. */
function trimPoolScreen(){
 if(currentView!=='pool')return;const root=get('pool');if(!root)return;
 const head=root.querySelector('.section-head p');if(head)head.textContent='Athletes outside your senior squad. Monitor them or call them up when a squad place is available.';
 const assessment=root.querySelector('.assessment-note');if(assessment)assessment.innerHTML='<strong>Staff knowledge:</strong> ability ranges narrow as your staff gather more evidence.';
 const note=root.querySelector('.pool-note');if(note)note.textContent='National Pool athletes can appear in domestic testing. A call-up needs an open squad place and begins a minimum squad agreement.';
}
if(typeof drawSquad==='function'&&!drawSquad.__publicAlphaFirst15){
 const baseSquad=drawSquad;
 const wrapped=function(){const out=baseSquad.apply(this,arguments);try{trimPoolScreen()}catch(_){}return out};
 wrapped.__publicAlphaFirst15=true;wrapped.__base=baseSquad;drawSquad=wrapped;
}

/* Testing Event Day should read as testing, not a ranked meeting. */
if(typeof drawEventOverview==='function'&&!drawEventOverview.__publicAlphaFirst15){
 const baseOverview=drawEventOverview;
 const wrapped=function(e,live,discs,done){
  const out=baseOverview.apply(this,arguments);
  if(e?.id===INDOOR_ID){
   const root=get('competition');
   root?.querySelectorAll('[data-event-disc]').forEach(b=>{if(!Array.isArray(e.results?.[b.dataset.eventDisc])&&live)b.textContent='WATCH '+discLabel(b.dataset.eventDisc).toUpperCase()});
   const brief=root?.querySelector('.event-programme-head p');if(brief)brief.textContent=live?'Watch each sprint test, then review the coaching report.':'Indoor testing complete.';
   const prod=[...root?.querySelectorAll('.event-side-card')||[]].find(x=>/Production note/i.test(x.textContent||''));if(prod)prod.remove();
  }
  return out;
 };
 wrapped.__publicAlphaFirst15=true;wrapped.__base=baseOverview;drawEventOverview=wrapped;
}

/* Existing save already sitting on Week 4: prepare it without touching completed tests. */
try{const e=indoorEvent();if(e&&!e.completed&&Number(e.week)===Number(s?.game?.week)&&e.kind==='testing'){prepareIndoor(e);save()}}catch(_){ }
})();
/* ===== End Public Alpha First 15 Pass ===== */
