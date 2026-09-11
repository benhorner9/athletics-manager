/* Athletics Manager — First-Time Player Experience V2 */
(function(){
'use strict';
if(window.AMFirstTimeExperienceV2)return;

const VERSION='2.0.2';
const STATE_VERSION=2;
const OPENING_EVENT_ID='opening-meet-v2';
const OPENING_WEEK=5;
const SCOUT_GROUPS={
 Sprints:['M100','W100','M200','W200','M400','W400'],
 Distance:['M800','W800','M1500','W1500','M5000','W5000'],
 Jumps:['MHJ','WHJ','MLJ','WLJ','MTJ','WTJ','MPV','WPV'],
 Throws:['MSP','WSP','MDT','WDT','MHT','WHT','MJT','WJT']
};
const GUIDANCE_KEY='am_guidance_preference_v2';
const MODES=new Set(['recommended','minimal','off']);
const $=id=>document.getElementById(id);
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const careerWeek=()=>n(s?.game?.careerWeek)||n(s?.game?.week)||1;
const isYearOne=()=>n(s?.game?.cycleYear)===1;
const saveSafe=()=>{try{if(typeof save==='function')save()}catch(_){}};
const toastSafe=msg=>{try{if(typeof toast==='function')toast(msg)}catch(_){}};
const managed=()=>typeof managedTeam==='function'?managedTeam():[];
const nation=()=>typeof managedNation==='function'?managedNation():(s?.managedNation||'GREAT BRITAIN');
const nationText=()=>typeof nationName==='function'?nationName(nation()):String(nation());
const eventText=d=>typeof discLabel==='function'?discLabel(d):String(d||'Event');

function defaultState(){
 let pref='recommended';
 try{const p=localStorage.getItem(GUIDANCE_KEY);if(MODES.has(p))pref=p}catch(_){ }
 return {
  version:STATE_VERSION,
  guidance:pref,
  createdCareerWeek:careerWeek(),
  active:false,
  legacy:false,
  completed:false,
  completionShown:false,
  scheduleApplied:false,
  openingEventId:OPENING_EVENT_ID,
  steps:{squadReviewed:false,athleteOpened:false,trainingDecision:false,inboxSeen:false,scoutAssignment:false,competitionPreview:false,selectionSubmitted:false,firstEventCompleted:false},
  seen:{home:false,inbox:false,squad:false,training:false,scouting:false,competition:false,live:false,track:false,throw:false,horizontalJump:false,highJump:false},
  entrySource:{},
  analytics:[]
 };
}

function meaningfulCompetitionExists(){
 return (s?.events||[]).some(e=>e?.completed&&['competition','championship','olympics'].includes(e.kind));
}
function looksLikeExistingCareer(){
 return careerWeek()>1||n(s?.game?.careerYear)>1||meaningfulCompetitionExists()||((s?.history||[]).length>0)||!!(s?.appointment?.contractSigned&&s?.induction?.completed);
}
function ensureState(){
 if(!s)return null;
 let st=s.firstTimeExperienceV2;
 if(!st||typeof st!=='object'){
  st=s.firstTimeExperienceV2=defaultState();
  if(looksLikeExistingCareer()){
   st.legacy=true;st.completed=true;st.active=false;st.guidance='off';
  }
 }
 st.version=STATE_VERSION;
 st.steps={...defaultState().steps,...(st.steps||{})};
 st.seen={...defaultState().seen,...(st.seen||{})};
 st.entrySource=st.entrySource&&typeof st.entrySource==='object'?st.entrySource:{};
 st.analytics=Array.isArray(st.analytics)?st.analytics:[];
 if(!st.legacy&&!st.completed&&s?.appointment?.contractSigned&&isYearOne())st.active=true;
 if(st.guidance==='off')st.active=st.active&&!st.completed;
 return st;
}
function active(){const st=ensureState();return !!(st&&!st.legacy&&!st.completed&&st.active&&s?.appointment?.contractSigned&&isYearOne())}
function guided(){const st=ensureState();return active()&&st.guidance!=='off'}
function recommended(){const st=ensureState();return active()&&st.guidance==='recommended'}

function log(type,data={}){
 const st=ensureState();if(!st)return;
 const key=`${type}:${careerWeek()}:${JSON.stringify(data)}`;
 if(st.analytics.some(x=>x.key===key))return;
 st.analytics.push({key,type,careerWeek:careerWeek(),season:n(s?.game?.season),week:n(s?.game?.week),at:Date.now(),...data});
 st.analytics=st.analytics.slice(-120);
 saveSafe();
}
function markStep(key,value=true){const st=ensureState();if(!st||!Object.prototype.hasOwnProperty.call(st.steps,key))return;st.steps[key]=value;log(`step_${key}`,{value});saveSafe();scheduleDecorate()}
function markSeen(key){const st=ensureState();if(!st||!Object.prototype.hasOwnProperty.call(st.seen,key)||st.seen[key])return;st.seen[key]=true;log(`seen_${key}`);saveSafe()}
function setGuidance(mode){
 const st=ensureState();if(!st||!MODES.has(mode))return false;
 st.guidance=mode;try{localStorage.setItem(GUIDANCE_KEY,mode)}catch(_){ }
 log('guidance_changed',{mode});saveSafe();scheduleDecorate();return true;
}

function openingDisciplines(){
 const team=managed(),available=new Set(team.filter(a=>!a.retired).map(a=>a.disc));
 const preferred=['M100','W100','M200','W200'].filter(d=>available.has(d));
 if(preferred.length>=2)return preferred.slice(0,2);
 if(preferred.length)return preferred;
 return [...available].slice(0,2);
}
function openingLocation(){
 try{return NATIONS?.[nation()]?.venues?.indoor||NATIONS?.[nation()]?.venues?.nationals||'National Stadium'}catch(_){return 'National Stadium'}
}
function ensureOpeningSchedule(){
 const st=ensureState();
 if(!st||st.legacy||st.scheduleApplied||!s?.appointment?.contractSigned||!isYearOne()||careerWeek()>1)return false;
 const discs=openingDisciplines();
 if(!discs.length)return false;
 const events=s.events||(s.events=[]);
 let opener=events.find(e=>e.id===OPENING_EVENT_ID);
 if(!opener){
  opener={id:OPENING_EVENT_ID,week:OPENING_WEEK,name:'National Season Opener',kind:'competition',level:'National',disc:discs,ranked:true,star:2,location:openingLocation(),entries:{},results:{},decision:false,firstTimeExperience:true};
  for(const d of discs)opener.entries[d]=[];
  events.push(opener);
 }
 const camp=events.find(e=>e.id==='camp');
 if(camp&&!camp.completed){camp.completed=true;camp.onboardingSuppressed=true}
 const indoor=events.find(e=>e.id==='indoor');if(indoor&&!indoor.completed&&n(indoor.week)<=6)indoor.week=8;
 const winter=events.find(e=>e.id==='winter');if(winter&&!winter.completed&&n(winter.week)<=8)winter.week=10;
 const spring=events.find(e=>e.id==='spring');if(spring&&!spring.completed&&n(spring.week)<=12)spring.week=14;
 events.sort((a,b)=>n(a.week)-n(b.week)||String(a.id).localeCompare(String(b.id)));
 st.scheduleApplied=true;st.openingEventId=OPENING_EVENT_ID;
 log('opening_schedule_applied',{event:OPENING_EVENT_ID,week:OPENING_WEEK});saveSafe();return true;
}
function openingEvent(){return (s?.events||[]).find(e=>e.id===(ensureState()?.openingEventId||OPENING_EVENT_ID))||null}
function selectionMail(e=openingEvent()){return e?(s?.emails||[]).find(m=>m.type==='selection'&&m.eventId===e.id):null}

function retireLegacyOpeningTasks(){
 if(!active())return;
 if(s?.appointment){
  s.appointment.tasks??={};
  for(const key of ['systems','squad','pool','calendar','training'])s.appointment.tasks[key]=true;
  s.appointment.completed=true;
 }
 if(Array.isArray(s?.emails)){
  s.emails=s.emails.filter(m=>!(m.type==='systems'&&n(m.week)<=2));
  const welcome=s.emails.find(m=>m.type==='welcome');
  if(welcome&&!welcome.ftxRewritten){
   welcome.ftxRewritten=true;
   welcome.subject=`Welcome to ${nationText()}`;
   welcome.body='Your staff will help you settle in. Start with the squad, then move the week forward when you are ready.';
   welcome.html=`<div class="mail-section"><h3>Welcome to ${esc(nationText())}</h3><p>You do not need to learn everything today. Start by meeting the athletes you have inherited. Your staff will introduce the rest when it becomes relevant.</p><button class="btn primary" data-ftx-route="squad">MEET THE SQUAD</button></div>`;
  }
 }
 saveSafe();
}

function headCoach(){
 try{if(typeof ensureCoaches==='function')ensureCoaches()}catch(_){ }
 const c=s?.coaches?.sprint||s?.coaches?.science||s?.coaches?.jumps||null;
 return {name:c?.name||'Head Coach',role:'Head Coach'};
}
function headScout(){
 try{if(typeof ensureCoaches==='function')ensureCoaches()}catch(_){ }
 const c=s?.coaches?.scout||null;return {name:c?.name||'Head Scout',role:'Head Scout'};
}
function starAthlete(){
 const team=managed();
 return [...team].filter(a=>!a.retired).sort((a,b)=>{
  const aa=typeof assessmentMid==='function'?assessmentMid(a,'overall'):n(a.overall),bb=typeof assessmentMid==='function'?assessmentMid(b,'overall'):n(b.overall);
  return bb-aa||n(b.form)-n(a.form);
 })[0]||null;
}
function trainingRecommendation(){
 const star=starAthlete(),avg=managed().length?managed().reduce((t,a)=>t+n(a.fatigue),0)/managed().length:0;
 if(avg>=52||n(star?.fatigue)>=65)return{focus:'Recovery',athlete:star,reason:'The squad is carrying enough fatigue that freshness matters more than extra load this week.'};
 const d=String(star?.disc||'');
 if(/100|200|400/.test(d))return{focus:'Speed',athlete:star,reason:`${star?.name||'Your leading sprinter'} is ready for a sharper speed-focused week.`};
 if(/SP|DT|HT|JT/.test(d))return{focus:'Strength',athlete:star,reason:`${star?.name||'Your leading thrower'} would benefit from a power-focused block.`};
 if(/HJ|LJ|TJ|PV/.test(d))return{focus:'Technique',athlete:star,reason:`${star?.name||'Your leading jumper'} can use a technical emphasis before the competitive block.`};
 return{focus:'Balanced',athlete:star,reason:'A balanced week is the safest starting point while the staff build more evidence.'};
}
function currentPhase(){
 const st=ensureState(),cw=careerWeek(),e=openingEvent(),mail=selectionMail(e);
 if(!st||st.completed)return'complete';
 if(!st.steps.squadReviewed)return'squad';
 if(!st.steps.athleteOpened)return'athlete';
 if(cw<=1)return'advance';
 if(cw>=2&&!st.steps.trainingDecision)return'training';
 if(cw>=3&&!st.steps.scoutAssignment)return'scouting';
 if(cw>=3&&!st.steps.competitionPreview)return'preview';
 if(mail&&!st.steps.selectionSubmitted)return'selection';
 if(e&&n(e.week)===n(s?.game?.week)&&!e.completed)return'competition';
 if(st.steps.firstEventCompleted&&!st.completed)return'complete';
 return'advance';
}
function requiredPhase(){
 if(!recommended())return null;
 const phase=currentPhase();
 if(['squad','athlete','training','scouting','selection'].includes(phase))return phase;
 return null;
}
function phaseCopy(){
 const st=ensureState(),phase=currentPhase(),e=openingEvent(),coach=headCoach(),scout=headScout(),rec=trainingRecommendation();
 if(phase==='squad')return{eyebrow:'WEEK 1 • ARRIVAL',title:'Meet your programme',body:`${coach.name}: “Start with the athletes you have inherited. You only need to know the key names today.”`,action:'MEET THE SQUAD',route:'squad',required:true};
 if(phase==='athlete')return{eyebrow:'WEEK 1 • YOUR SQUAD',title:`Take a closer look at ${starAthlete()?.name||'one athlete'}`,body:`Open ${starAthlete()?.name||'the athlete'}'s profile, check Event, Form and Fitness, then close the profile to return to Squad. That completes this step.`,action:'VIEW ATHLETE',athlete:starAthlete()?.id,required:true};
 if(phase==='training')return{eyebrow:'WEEK 2 • TRAINING',title:'Make one training decision',body:`${coach.name}: “${rec.reason} I recommend ${rec.focus}.” Training continues automatically after this.`,action:'REVIEW TRAINING',route:'training',required:true};
 if(phase==='scouting')return{eyebrow:'WEEK 3 • SCOUTING',title:'Set your first scouting assignment',body:`${scout.name}: “Open Scouting and use any one of the five assignment slots. Choose where you want me to look and confirm the brief.”`,action:'OPEN SCOUTING',route:'scouting',required:true};
 if(phase==='preview')return{eyebrow:'WEEK 3 • FIRST COMPETITION',title:e?.name||'Your first competition is approaching',body:`${e?`Week ${e.week}. `:''}Selection opens before the meeting. You decide who competes — or explicitly choose No Entry.`,action:'VIEW COMPETITION',route:'competition'};
 if(phase==='selection')return{eyebrow:'ACTION REQUIRED • TEAM SELECTION',title:`Choose the team for ${e?.name||'your first competition'}`,body:'Use the coach recommendation, choose the team yourself, or deliberately enter nobody. Nothing is submitted until you confirm it.',action:'OPEN SELECTION',route:'inbox',mail:selectionMail(e)?.id,required:true};
 if(phase==='competition')return{eyebrow:'COMPETITION WEEK',title:e?.name||'Competition day',body:'Start from the schedule. You will deliberately choose which event to watch — the game will not drop you into a random discipline.',action:'OPEN COMPETITION',route:'competition'};
 if(phase==='complete')return{eyebrow:'OPENING MONTH COMPLETE',title:'You know the core loop',body:'Manage the squad. Train and scout. Select the team. Compete. Review the result. Advance the season.',action:'CONTINUE CAREER',complete:true};
 return{eyebrow:'NEXT',title:'All caught up',body:`No guided decision is waiting. ${e&&!e.completed?`${e.name} is in Week ${e.week}. `:''}Advance the week when you are ready.`,action:'ADVANCE WEEK',advance:true};
}

function guidanceControls(){const mode=ensureState()?.guidance||'recommended';return `<div class="ftx-guidance-controls" aria-label="Guidance level"><span>Guidance</span>${['recommended','minimal','off'].map(x=>`<button data-ftx-guidance="${x}" class="${mode===x?'on':''}">${x==='recommended'?'Recommended':x==='minimal'?'Minimal':'Off'}</button>`).join('')}</div>`}
function agendaHTML(){
 const copy=phaseCopy(),st=ensureState();if(!guided()&&st?.guidance==='off')return'';
 return `<section class="ftx-agenda" data-ftx-phase="${currentPhase()}"><div class="ftx-agenda-copy"><small>${esc(copy.eyebrow)}</small><h2>${esc(copy.title)}</h2><p>${esc(copy.body)}</p></div><div class="ftx-agenda-actions">${copy.athlete?`<button class="am-button primary" data-ftx-athlete="${esc(copy.athlete)}">${esc(copy.action)}</button>`:copy.mail?`<button class="am-button primary" data-ftx-mail="${esc(copy.mail)}">${esc(copy.action)}</button>`:copy.route?`<button class="am-button primary" data-ftx-route="${esc(copy.route)}">${esc(copy.action)}</button>`:copy.advance?`<button class="am-button primary" data-ftx-advance>${esc(copy.action)}</button>`:copy.complete?`<button class="am-button primary" data-ftx-complete>${esc(copy.action)}</button>`:''}${copy.required?'<span class="ftx-required">Required before advancing</span>':'<span class="ftx-optional">Recommended</span>'}${guidanceControls()}</div></section>`;
}
function decorateHome(){
 const root=$('home');if(!root||!s?.appointment?.contractSigned)return;
 const st=ensureState();root.classList.toggle('ftx-onboarding-home',active());
 if(st?.completionShown&&st.completed)return;
 let card=root.querySelector('.ftx-agenda');
 if(active()||(!st.completed&&st.guidance!=='off')){
  if(!card)root.insertAdjacentHTML('afterbegin',agendaHTML());else card.outerHTML=agendaHTML();
  markSeen('home');
 }else card?.remove();
}
function clearSquadGuidance(root=$('squad')){if(!root)return;root.querySelectorAll('.ftx-mentor').forEach(el=>el.remove());root.querySelectorAll('.ftx-spotlight').forEach(el=>el.classList.remove('ftx-spotlight'))}
function decorateSquad(){
 const root=$('squad');if(!root)return;const phase=currentPhase();
 if(!active()||!['squad','athlete'].includes(phase)){clearSquadGuidance(root);return}
 markSeen('squad');if(!ensureState().steps.squadReviewed)markStep('squadReviewed');
 const star=starAthlete();if(!star){clearSquadGuidance(root);return}clearSquadGuidance(root);if(currentPhase()!=='athlete')return;
 root.insertAdjacentHTML('afterbegin',`<section class="ftx-mentor"><div><small>${esc(headCoach().name.toUpperCase())} • HEAD COACH</small><strong>Start with ${esc(star.name)}</strong><p>Open ${esc(star.name)} and check three things: Event, Form and Fitness. Then close the profile and return here — that completes the task.</p></div><button class="am-button primary" data-ftx-athlete="${esc(star.id)}">VIEW ATHLETE</button></section>`);
 const row=root.querySelector(`[data-ath="${CSS.escape(String(star.id))}"]`)||root.querySelector(`[data-profile="${CSS.escape(String(star.id))}"]`)?.closest('tr,article,button');row?.classList.add('ftx-spotlight');
}
function decorateTraining(){
 if(!active()||careerWeek()<2||ensureState().steps.trainingDecision)return;
 const root=$('training');if(!root)return;markSeen('training');const rec=trainingRecommendation();
 if(root.querySelector('.ftx-training-card'))return;
 root.insertAdjacentHTML('afterbegin',`<section class="ftx-mentor ftx-training-card"><div><small>${esc(headCoach().name.toUpperCase())} • COACH RECOMMENDATION</small><strong>${esc(rec.athlete?.name||'The squad')} — ${esc(rec.focus)}</strong><p>${esc(rec.reason)} You can change training later; this is not a permanent decision.</p></div><div class="ftx-inline-actions"><button class="am-button primary" data-ftx-accept-training="${esc(rec.focus)}">ACCEPT RECOMMENDATION</button><button class="am-button ghost" data-ftx-choose-training>CHOOSE MYSELF</button></div></section>`);
}
function scoutingChoices(){return [['All','Best Available Talent'],['Sprints','Sprints'],['Distance','Distance'],['Jumps','Jumps'],['Throws','Throws']]}
function groupDisciplines(group){return (SCOUT_GROUPS[group]||[]).filter(d=>typeof DISCIPLINES==='undefined'||DISCIPLINES[d])}
function decorateNativeScoutFocus(){
 const select=$('scoutFocus'),focus=typeof scoutingState==='function'?scoutingState().focus:null;if(!select)return;
 for(const [key,label] of scoutingChoices().slice(1))if(!select.querySelector(`option[value="${key}"]`)){const option=document.createElement('option');option.value=key;option.textContent=label+' • Event group';select.appendChild(option)}
 if(focus&&[...select.options].some(o=>o.value===focus))select.value=focus;
}
let scoutingV2Baseline=null;
const SCOUTING_V2_VOLATILE=/^(?:reports?|reportReviewed|watchlist(?:Ids)?|ui|tab|filter|search|selectedReport|lastViewed|unread)$/i;
function scoutingV2Comparable(value,depth=0){
 if(depth>6)return null;
 if(Array.isArray(value))return value.map(v=>scoutingV2Comparable(v,depth+1));
 if(value&&typeof value==='object'){
  const out={};
  for(const key of Object.keys(value).sort()){
   if(SCOUTING_V2_VOLATILE.test(key))continue;
   const v=value[key];if(typeof v==='function')continue;
   out[key]=scoutingV2Comparable(v,depth+1);
  }
  return out;
 }
 return value;
}
function scoutingV2Signature(){
 let primary=null;
 try{primary=typeof scoutingState==='function'?scoutingState():(s?.scouting||null)}catch(_){primary=s?.scouting||null}
 try{return JSON.stringify(scoutingV2Comparable({scouting:primary,scoutingV2:s?.scoutingV2||null,assignments:s?.scoutAssignments||null,scoutingAssignments:s?.scoutingAssignments||null}))}catch(_){return''}
}
function scoutingV2HasAssignment(){
 try{
  const org=s?.scoutingV2?.nations?.[nation()];
  return Array.isArray(org?.assignments)&&org.assignments.some(a=>a&&a.status==='active');
 }catch(_){return false}
}
function syncScoutingV2Assignment(source='scouting-v2-state'){
 const st=ensureState();
 if(!st||!active()||st.steps.scoutAssignment||currentPhase()!=='scouting'||!scoutingV2HasAssignment())return false;
 markStep('scoutAssignment');
 toastSafe('Scouting assignment started');
 try{window.dispatchEvent(new CustomEvent('am:ftx-step-complete',{detail:{step:'scoutAssignment',source}}))}catch(_){ }
 return true;
}
function armScoutingV2Assignment(){
 if(syncScoutingV2Assignment('scouting-v2-existing'))return;
 if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
 if(scoutingV2Baseline===null)scoutingV2Baseline=scoutingV2Signature();
}
function maybeCompleteScoutingV2Assignment(target,source='scouting-v2'){
 if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
 const root=$('scouting');if(!root||!target||!root.contains(target))return;
 const before=scoutingV2Baseline===null?scoutingV2Signature():scoutingV2Baseline;
 setTimeout(()=>{
  if(syncScoutingV2Assignment(source))return;
  if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
  const after=scoutingV2Signature();
  if(after&&after!==before){
   scoutingV2Baseline=after;
   markStep('scoutAssignment');
   toastSafe('Scouting assignment started');
   try{window.dispatchEvent(new CustomEvent('am:ftx-step-complete',{detail:{step:'scoutAssignment',source}}))}catch(_){ }
  }
 },120);
}
function focusScoutingV2Assignment(){
 const root=$('scouting');if(!root)return;
 const candidates=[...root.querySelectorAll('h1,h2,h3,strong,button,[role="button"],select,label')];
 const target=candidates.find(el=>/assignment|assign scout|search brief|scouting brief|search focus|discipline focus/i.test(`${el.textContent||''} ${el.getAttribute?.('aria-label')||''} ${el.id||''} ${el.getAttribute?.('name')||''}`));
 if(target)try{target.scrollIntoView({block:'center',behavior:'smooth'})}catch(_){ }
}
function decorateScouting(){
 if(!active()||careerWeek()<3||ensureState().steps.scoutAssignment)return;
 const root=$('scouting');if(!root)return;
 markSeen('scouting');root.querySelectorAll('.ftx-scout-card').forEach(el=>el.remove());
 root.dataset.ftxScoutingAuthority=window.AMScoutingV2?'scouting-v2':'scouting-route';
 try{window.AMScoutingV2?.refreshScoutingIntegration?.()}catch(_){ }
 armScoutingV2Assignment();
}
function competitionWhyHTML(e){
 const st=ensureState(),selected=Object.entries(e?.entries||{}).flatMap(([d,ids])=>(ids||[]).map(id=>({d,a:(s.athletes||[]).find(x=>x.id===id)}))).filter(x=>x.a);
 return `<section class="ftx-competition-context"><div><small>${n(e?.week)===n(s?.game?.week)?'COMPETITION WEEK':'YOUR FIRST COMPETITION'}</small><h2>${esc(e?.name||'Competition')}</h2><p>${n(e?.week)===n(s?.game?.week)?'You are here because this meeting reached its scheduled week. Start from the programme below and choose each event deliberately.':`Week ${e?.week}. Team selection ${e?.decision?'has been submitted':'opens before competition week'}.`}</p></div><div class="ftx-breadcrumb"><span class="done">Announced</span><span class="${e?.decision?'done':''}">Selection</span><span class="${n(e?.week)===n(s?.game?.week)?'on':''}">Competition</span></div>${selected.length?`<div class="ftx-your-athletes"><small>YOUR ATHLETES</small>${selected.map(x=>`<span><b>${esc(x.a.name)}</b> · ${esc(eventText(x.d))}<em>${esc(st.entrySource?.[x.d]||'Selected by you')}</em></span>`).join('')}</div>`:`<div class="ftx-your-athletes empty"><small>YOUR STATUS</small><span>${e?.decision?'No entries were submitted.':'Selection is not final yet.'}</span></div>`}</section>`;
}
function decorateCompetition(){
 if(!active())return;const e=openingEvent(),root=$('competition');if(!e||!root)return;
 const isRelevant=(typeof currentEvent==='function'?currentEvent():null)?.id===e.id||n(e.week)>=n(s?.game?.week);
 if(!isRelevant)return;markSeen('competition');
 if(!root.querySelector('.ftx-competition-context'))root.insertAdjacentHTML('afterbegin',competitionWhyHTML(e));
}

function decisionState(e,d){
 if(!e)return'undecided';
 if((e.entries?.[d]||[]).length)return'athlete';
 if(e.firstTimeNoEntry?.[d])return'no-entry';
 return'undecided';
}
function firstSelectionComplete(e){return !!e&&e.disc.filter(d=>d!=='ALL').every(d=>decisionState(e,d)!=='undecided')}
function coachPick(e,d){
 const candidates=typeof eligibleFor==='function'?eligibleFor(e,d):managed().filter(a=>a.disc===d&&!a.retired&&!a.injury);
 if(!candidates.length)return null;
 return [...candidates].sort((a,b)=>{
  try{if(typeof selectionMerit==='function')return selectionMerit(b)-selectionMerit(a)}catch(_){ }
  return n(b.form)-n(a.form)||n(b.overall)-n(a.overall);
 })[0]||null;
}
function useCoachTeam(e){
 e.entries??={};e.firstTimeNoEntry??={};const st=ensureState();
 for(const d of e.disc.filter(x=>x!=='ALL')){
  const p=coachPick(e,d);e.entries[d]=p?[p.id]:[];e.firstTimeNoEntry[d]=!p;st.entrySource[d]=p?`${headCoach().name} recommendation`:'No eligible athlete — No Entry';
 }
 e.firstTimeSelectionMode='coach';saveSafe();log('coach_team_applied',{event:e.id});refreshInbox();
}
function noEntryCompetition(e){
 e.entries??={};e.firstTimeNoEntry??={};const st=ensureState();
 for(const d of e.disc.filter(x=>x!=='ALL')){e.entries[d]=[];e.firstTimeNoEntry[d]=true;st.entrySource[d]='No Entry — chosen by you'}
 e.firstTimeSelectionMode='no-entry';saveSafe();log('competition_no_entry',{event:e.id});refreshInbox();
}
function noEntryDiscipline(e,d){e.entries??={};e.firstTimeNoEntry??={};e.entries[d]=[];e.firstTimeNoEntry[d]=true;ensureState().entrySource[d]='No Entry — chosen by you';saveSafe();refreshInbox()}
function firstSelectionPanel(e){
 const rows=e.disc.filter(d=>d!=='ALL').map(d=>{const state=decisionState(e,d),ids=e.entries?.[d]||[],names=ids.map(id=>(s.athletes||[]).find(a=>a.id===id)?.name).filter(Boolean);return `<div class="ftx-selection-row ${state}"><div><strong>${esc(eventText(d))}</strong><span>${state==='athlete'?esc(names.join(', ')):state==='no-entry'?'No Entry':'Needs decision'}</span></div><button class="am-button compact ghost" data-ftx-no-entry="${esc(d)}">NO ENTRY</button></div>`}).join('');
 return `<section class="ftx-selection-guide"><div class="ftx-selection-head"><div><small>YOUR FIRST TEAM SELECTION</small><h3>${esc(e.name)}</h3><p>Every event needs a deliberate decision. Empty means undecided. No Entry means you have chosen not to compete.</p></div><span class="am-status ${firstSelectionComplete(e)?'success':'important'}">${e.disc.filter(d=>d!=='ALL').filter(d=>decisionState(e,d)!=='undecided').length}/${e.disc.filter(d=>d!=='ALL').length} decided</span></div><div class="ftx-selection-actions"><button class="am-button primary" data-ftx-coach-team>USE COACH TEAM</button><button class="am-button secondary" data-ftx-choose-team>CHOOSE TEAM</button><button class="am-button ghost" data-ftx-no-entry-all>DO NOT ENTER COMPETITION</button></div><div class="ftx-selection-decisions">${rows}</div></section>`;
}
function currentOpenSelection(){
 const e=openingEvent(),m=selectionMail(e);if(!e||!m)return null;
 const open=(typeof openMail!=='undefined'?openMail:null);return open===m.id?{e,m}:null;
}
function decorateInbox(){
 if(!active())return;markSeen('inbox');const open=currentOpenSelection();if(!open)return;const root=$('inbox');if(!root||root.querySelector('.ftx-selection-guide'))return;
 const reader=root.querySelector('#reader,.am-inbox-reader,.inbox-reader,.reader')||root;
 reader.insertAdjacentHTML('afterbegin',firstSelectionPanel(open.e));
 const confirm=reader.querySelector('#confirmSelection,[data-confirm-selection],button[data-decision-action="submit"]');
 if(confirm){confirm.disabled=!firstSelectionComplete(open.e);confirm.setAttribute('aria-disabled',String(confirm.disabled));}
}
function refreshInbox(){try{if(typeof drawInbox==='function'&&typeof currentView!=='undefined'&&currentView==='inbox')drawInbox();else if(typeof render==='function')render()}catch(_){ }scheduleDecorate()}

function eventFamily(d){
 const label=eventText(d).toLowerCase();
 if(/shot|discus|hammer|javelin|throw/.test(label))return'throw';
 if(/high jump|pole vault/.test(label))return'highJump';
 if(/long jump|triple jump/.test(label))return'horizontalJump';
 return'track';
}
function familyHelp(d){
 const family=eventFamily(d),label=eventText(d);
 if(family==='throw')return{title:label,rule:'Each athlete receives multiple attempts. The best valid mark determines the final position.'};
 if(family==='highJump')return{title:label,rule:'Athletes attempt each height in turn. Three misses at a height ends their competition.'};
 if(family==='horizontalJump')return{title:label,rule:'The best valid jump decides the placing. A foul is recorded as an X.'};
 return{title:label,rule:'Watch the athletes in the 2D viewer and the live order on the standings panel.'};
}
function ensureDialog(){
 let dlg=$('ftxDialog');if(dlg)return dlg;
 dlg=document.createElement('dialog');dlg.id='ftxDialog';dlg.className='ftx-dialog';document.body.appendChild(dlg);return dlg;
}
function showLiveIntro(e,d,start){
 const st=ensureState(),family=eventFamily(d),first=!st.seen.live,info=familyHelp(d),dlg=ensureDialog();
 dlg.innerHTML=`<div class="ftx-dialog-shell"><small>${first?'YOUR FIRST LIVE EVENT':'FIRST '+family.replace(/([A-Z])/g,' $1').toUpperCase()}</small><h2>${esc(info.title)}</h2><p>${esc(info.rule)}</p>${first?'<div class="ftx-live-points"><span><b>2D viewer</b> shows what is happening.</span><span><b>Live standings</b> show who is leading.</span><span><b>Gavin Potts</b> explains why the moment matters.</span><span><b>Complete Event</b> returns you to the competition schedule.</span></div>':''}<div class="ftx-dialog-actions"><button class="am-button ghost" data-ftx-cancel>BACK</button><button class="am-button primary" data-ftx-start>START EVENT</button></div></div>`;
 dlg.querySelector('[data-ftx-cancel]').onclick=()=>dlg.close();
 dlg.querySelector('[data-ftx-start]').onclick=()=>{st.seen.live=true;st.seen[family]=true;log('first_event_started',{event:e.id,disc:d,family});saveSafe();dlg.close();start()};
 dlg.showModal();
}

function showCompletion(){
 const st=ensureState();if(!st||st.completionShown)return;st.completionShown=true;const e=openingEvent(),dlg=ensureDialog();
 const own=[];for(const d of e?.disc||[])for(const row of e?.results?.[d]||[])if(row.nation===nation())own.push({d,row});const wins=own.filter(x=>n(x.row.place)===1).length,podiums=own.filter(x=>n(x.row.place)<=3).length,points=own.reduce((t,x)=>t+n(x.row.points),0);dlg.innerHTML=`<div class="ftx-dialog-shell complete"><small>YOU'RE READY</small><h2>Your first meeting is complete.</h2><p>${esc(nationText())}: ${wins} event win${wins===1?'':'s'} · ${podiums} podium${podiums===1?'':'s'} · ${points} ranking point${points===1?'':'s'}. You have used the core Athletics Manager loop in the real career.</p><div class="ftx-live-points"><span>Manage your athletes.</span><span>Train and scout when needed.</span><span>Select the team deliberately.</span><span>Compete, review, then advance.</span></div><button class="am-button primary" data-ftx-finish>CONTINUE CAREER</button></div>`;
 dlg.querySelector('[data-ftx-finish]').onclick=()=>{dlg.close();if(typeof view==='function')view('home')};
 if(!dlg.open)dlg.showModal();log('onboarding_completed',{event:e?.id});saveSafe();
}

function rewriteSelectionMail(){
 if(!active())return;const e=openingEvent(),m=selectionMail(e);if(!e||!m||m.ftxRewritten)return;
 m.ftxRewritten=true;m.subject=`${e.name} — team selection`;m.body='Selection closes before competition week. Use the coach recommendation or make every event decision yourself.';
 m.html=`<div class="mail-section"><h3>${esc(e.name)} — team selection</h3><p>${esc(headCoach().name)} has prepared a recommended team. You can use it, change it or choose No Entry. Every event needs a deliberate decision before submission.</p><p class="muted">Draft choices can be changed until you submit the team.</p></div>`;saveSafe();
}
function weekMessages(){
 if(!active()||ensureState().guidance==='off')return;const st=ensureState(),cw=careerWeek(),e=openingEvent();
 const send=(id,senderName,subject,body,type='review',eventId=null,html=null)=>{if((s.emails||[]).some(m=>m.id===id))return;try{const mid=typeof pushMail==='function'?pushMail(s,senderName,subject,body,type,eventId,html,id):null;if(mid)log('tutorial_mail',{id})}catch(_){ }};
 if(cw===1)send('ftx-week1',headCoach().name,'First day: start with the squad','You do not need to learn everything today. Review the athletes you inherited, open one profile, then move the week forward when you are ready.','review',null,`<div class="mail-section"><h3>Start with the squad</h3><p>You do not need to learn everything today. Review the athletes you inherited and open one profile.</p><button class="btn primary" data-ftx-route="squad">MEET THE SQUAD</button></div>`);
 if(cw===2){const r=trainingRecommendation();send('ftx-week2',headCoach().name,'Coach recommendation: one training change',`${r.reason} I recommend ${r.focus}. Training continues automatically each week after you set the focus.`,'review',null,`<div class="mail-section"><h3>${esc(r.athlete?.name||'Training')} — ${esc(r.focus)}</h3><p>${esc(r.reason)}</p><p>Training continues automatically. You only need to intervene when you want to change direction.</p><button class="btn primary" data-ftx-route="training">REVIEW TRAINING</button></div>`)}
 if(cw===3){send('ftx-week3-scout',headScout().name,'Scouting: set your first assignment','The senior squad is only part of the national programme. Open Scouting, use one of the five assignment slots and choose where you want the network to look.','scouting',null,`<div class="mail-section"><h3>Set your first scouting assignment</h3><p>Open Scouting, use any one of the five assignment slots and choose where you want the network to look. Confirming that brief completes this step.</p><button class="btn primary" data-ftx-route="scouting">OPEN SCOUTING</button></div>`);if(e)send('ftx-week3-comp',headCoach().name,`Your first competition: ${e.name}`,`${e.name} is in Week ${e.week}. Team selection will open before the meeting. No athlete competes unless you select them, accept the coach team or explicitly delegate.`,`competition`,e.id,`<div class="mail-section"><h3>${esc(e.name)}</h3><p>Week ${e.week}. Before the meeting you will choose who competes — or choose No Entry.</p><button class="btn secondary" data-ftx-route="competition">VIEW COMPETITION</button></div>`)}
 rewriteSelectionMail();saveSafe();
}

function decorateCurrent(){
 try{
  const st=ensureState();if(!st)return;
  if(active()){ensureOpeningSchedule();retireLegacyOpeningTasks();weekMessages();syncScoutingV2Assignment('scouting-v2-saved-state')}
  const cv=typeof currentView!=='undefined'?currentView:null;
  if(cv==='home')decorateHome();
  else if(cv==='squad')decorateSquad();
  else if(cv==='training')decorateTraining();
  else if(cv==='scouting')decorateScouting();
  else if(cv==='inbox')decorateInbox();
  else if(cv==='competition')decorateCompetition();
  if(st.completed&&!st.completionShown&&st.steps.firstEventCompleted)setTimeout(showCompletion,60);
 }catch(err){console.warn('First-Time Experience V2 decorate recovered',err)}
}
let decorateTimer=0;
function scheduleDecorate(){clearTimeout(decorateTimer);decorateTimer=setTimeout(decorateCurrent,30)}

function compactFirstDay(){
 if(!s?.induction||s.induction.completed)return false;
 const intro=s.induction,dlg=$('firstDay'),step=intro.step,p=typeof nationProfile==='function'?nationProfile():{name:nationText(),flag:''};if(!dlg)return false;
 if(step==='arrival'){
  dlg.innerHTML=`<div class="ftx-firstday"><header><span>ATHLETICS MANAGER</span><button data-ftx-firstday-pause>READ OFFER IN INBOX</button></header><main><small>YOUR APPOINTMENT</small><h1>Take charge of ${esc(p.name||nationText())}.</h1><p>Four-year national programme. Build the squad, prepare athletes and deliver when the competitions matter.</p><div class="ftx-offer-grid"><div><small>ROLE</small><strong>Performance Director</strong></div><div><small>TERM</small><strong>4 years</strong></div><div><small>FIRST COMPETITION</small><strong>Week ${OPENING_WEEK}</strong></div></div><div class="ftx-firstday-guidance"><small>GUIDANCE</small>${guidanceControls()}</div><button class="am-button primary" data-ftx-review-offer>REVIEW JOB OFFER</button></main></div>`;
  dlg.querySelector('[data-ftx-review-offer]').onclick=()=>{intro.step='contract';saveSafe();drawFirstDay()};dlg.querySelectorAll('[data-ftx-guidance]').forEach(b=>b.onclick=()=>{setGuidance(b.dataset.ftxGuidance);drawFirstDay()});dlg.querySelector('[data-ftx-firstday-pause]').onclick=()=>{dlg.close();if(typeof view==='function')view('inbox')};return true;
 }
 if(step==='contract'){
  let expectation='High';try{expectation=NATIONS?.[nation()]?.expectation||expectation}catch(_){ }
  dlg.innerHTML=`<div class="ftx-firstday"><header><span>${esc(p.flag||'')} ${esc(p.name||nationText())}</span><button data-ftx-firstday-pause>BACK TO INBOX</button></header><main><small>OFFICIAL APPOINTMENT</small><h1>Put your name on the programme.</h1><label class="ftx-name">Manager name<input id="ftxFirstDayName" maxlength="40" value="${esc(s.managerName||'')}" placeholder="Director"></label><div class="ftx-offer-grid"><div><small>CONTRACT</small><strong>4-year cycle</strong></div><div><small>EXPECTATION</small><strong>${esc(expectation)}</strong></div><div><small>SQUAD</small><strong>${managed().length} athletes</strong></div></div><p class="ftx-short">Detailed objectives remain available in My Profile. You do not need to memorise them now.</p><button class="am-button primary" data-ftx-sign>ACCEPT APPOINTMENT</button></main></div>`;
  dlg.querySelector('[data-ftx-sign]').onclick=()=>{s.managerName=(dlg.querySelector('#ftxFirstDayName')?.value||'').trim().slice(0,40);dlg.close();if(typeof signAppointmentContract==='function')signAppointmentContract()};dlg.querySelector('[data-ftx-firstday-pause]').onclick=()=>{dlg.close();if(typeof view==='function')view('inbox')};return true;
 }
 if(s?.appointment?.contractSigned){
  ensureState().active=true;ensureOpeningSchedule();retireLegacyOpeningTasks();const coach=headCoach(),star=starAthlete(),e=openingEvent();
  dlg.innerHTML=`<div class="ftx-firstday"><header><span>${esc(p.flag||'')} ${esc(p.name||nationText())}</span><button data-ftx-guidance-skip>SKIP GUIDANCE</button></header><main><small>FIRST MORNING</small><h1>Welcome. Start with the people.</h1><div class="ftx-coach-intro"><div class="ftx-person-mark">${esc(coach.name.split(/\s+/).map(x=>x[0]||'').slice(0,2).join('').toUpperCase())}</div><div><small>${esc(coach.role.toUpperCase())}</small><strong>${esc(coach.name)}</strong><p>“You do not need to learn everything today. I’ll help you through the first few weeks. Start by looking at the squad.”</p></div></div><div class="ftx-offer-grid"><div><small>YOUR SQUAD</small><strong>${managed().length} athletes</strong></div><div><small>ONE TO WATCH</small><strong>${esc(star?.name||'Your leading athlete')}</strong></div><div><small>FIRST COMPETITION</small><strong>Week ${e?.week||OPENING_WEEK}</strong></div></div><button class="am-button primary" data-ftx-enter>ENTER PERFORMANCE CENTRE</button><p class="ftx-short">One required task at a time. You can still explore anything you want.</p></main></div>`;
  dlg.querySelector('[data-ftx-enter]').onclick=()=>{intro.completed=true;intro.paused=false;intro.completedCareerWeek=careerWeek();intro.firstWeekPending=false;saveSafe();dlg.close();log('onboarding_started');if(typeof view==='function')view('home');scheduleDecorate()};dlg.querySelector('[data-ftx-guidance-skip]').onclick=()=>{setGuidance('off');intro.completed=true;intro.paused=false;saveSafe();dlg.close();if(typeof view==='function')view('home')};return true;
 }
 return false;
}

function installHooks(){
 if(typeof openingArcActive==='function'&&!openingArcActive.__ftxV2){const base=openingArcActive;openingArcActive=function(){if(active())return false;return base.apply(this,arguments)};openingArcActive.__ftxV2=true;openingArcActive.__base=base}
 if(typeof newProspect==='function'&&!newProspect.__ftxV2){const base=newProspect;newProspect=function(nationCode,focus='All',level=1){if(SCOUT_GROUPS[focus]){const pool=groupDisciplines(focus);if(pool.length)focus=pool[Math.floor(Math.random()*pool.length)]}return base.call(this,nationCode,focus,level)};newProspect.__ftxV2=true;newProspect.__base=base}
 if(typeof drawFirstDay==='function'&&!drawFirstDay.__ftxV2){const base=drawFirstDay;drawFirstDay=function(){if(compactFirstDay())return;return base.apply(this,arguments)};drawFirstDay.__ftxV2=true;drawFirstDay.__base=base}
 if(typeof signAppointmentContract==='function'&&!signAppointmentContract.__ftxV2){const base=signAppointmentContract;signAppointmentContract=function(){const out=base.apply(this,arguments);try{const st=ensureState();if(st&&!st.legacy){st.active=true;ensureOpeningSchedule();retireLegacyOpeningTasks();weekMessages()}}catch(_){ }scheduleDecorate();return out};signAppointmentContract.__ftxV2=true}
 if(typeof view==='function'&&!view.__ftxV2){const base=view;view=function(target){const e=openingEvent();if(target==='competition'&&active()&&e&&!e.completed){try{competitionMode='overview';activeEventDisc=null}catch(_){ }}const out=base.apply(this,arguments);if(target==='squad'&&active())markSeen('squad');if(target==='training'&&active())markSeen('training');if(target==='scouting'&&active())markSeen('scouting');if(target==='inbox'&&active()){markSeen('inbox');ensureState().steps.inboxSeen=true}if(target==='competition'&&active()&&e){ensureState().steps.competitionPreview=true;markStep('competitionPreview')}scheduleDecorate();return out};view.__ftxV2=true}
 if(typeof openAthleteProfile==='function'&&!openAthleteProfile.__ftxV2){const base=openAthleteProfile;openAthleteProfile=function(id){const out=base.apply(this,arguments);if(active()&&managed().some(a=>String(a.id)===String(id))&&!ensureState().steps.athleteOpened)markStep('athleteOpened');return out};openAthleteProfile.__ftxV2=true}
 if(typeof toggleSelection==='function'&&!toggleSelection.__ftxV2){const base=toggleSelection;toggleSelection=function(e,d,id){if(e?.id===OPENING_EVENT_ID){e.firstTimeNoEntry??={};e.firstTimeNoEntry[d]=false}const out=base.apply(this,arguments);if(e?.id===OPENING_EVENT_ID){if((e.entries?.[d]||[]).length)ensureState().entrySource[d]='Selected by you';saveSafe();scheduleDecorate()}return out};toggleSelection.__ftxV2=true}
 if(typeof confirmEventSelection==='function'&&!confirmEventSelection.__ftxV2){const base=confirmEventSelection;confirmEventSelection=function(e){if(e?.id===OPENING_EVENT_ID&&active()&&!firstSelectionComplete(e)){toastSafe('Every event needs a selection or No Entry.');refreshInbox();return false}const out=base.apply(this,arguments);if(e?.id===OPENING_EVENT_ID&&out!==false){markStep('selectionSubmitted');log('first_selection_submitted',{event:e.id,mode:e.firstTimeSelectionMode||'manual'})}return out};confirmEventSelection.__ftxV2=true}
 if(typeof startDiscipline==='function'&&!startDiscipline.__ftxV2){const base=startDiscipline;startDiscipline=function(e,d){if(guided()&&e?.id===OPENING_EVENT_ID){const st=ensureState(),family=eventFamily(d);if(!st.seen.live||!st.seen[family]){showLiveIntro(e,d,()=>base.call(this,e,d));return}}return base.apply(this,arguments)};startDiscipline.__ftxV2=true}
 if(typeof commitDisciplineResults==='function'&&!commitDisciplineResults.__ftxV2){const base=commitDisciplineResults;commitDisciplineResults=function(e,d,r){const out=base.apply(this,arguments);if(e?.id===OPENING_EVENT_ID&&active()&&!ensureState().steps.firstEventCompleted){markStep('firstEventCompleted');log('first_event_completed',{event:e.id,disc:d})}return out};commitDisciplineResults.__ftxV2=true}
 if(typeof finaliseEvent==='function'&&!finaliseEvent.__ftxV2){const base=finaliseEvent;finaliseEvent=function(e){const out=base.apply(this,arguments);if(e?.id===OPENING_EVENT_ID&&e.completed){const st=ensureState();st.completed=true;st.active=false;st.steps.firstEventCompleted=true;if(st.guidance==='off')st.completionShown=true;saveSafe();if(st.guidance!=='off')setTimeout(showCompletion,80)}return out};finaliseEvent.__ftxV2=true}
 if(typeof onWeekStart==='function'&&!onWeekStart.__ftxV2){const base=onWeekStart;onWeekStart=function(){const e=openingEvent(),delay=active()&&e&&!e.decision&&n(s?.game?.week)===3&&n(e.week)===OPENING_WEEK,realWeek=e?.week;if(delay)e.week=OPENING_WEEK+1;let out;try{out=base.apply(this,arguments)}finally{if(delay)e.week=realWeek}if(active()){if(n(s?.game?.week)===4&&e&&!e.completed&&!selectionMail(e)){try{newMail(sender('selection'),`Selection required: ${e.name}`,`${e.name} takes place next week. Select your athletes, accept the coach team or choose No Entry for every event.`,'selection',e.id)}catch(_){}}weekMessages();rewriteSelectionMail();scheduleDecorate()}return out};onWeekStart.__ftxV2=true}
}

function routeTo(target){
 if(target==='scouting'){try{window.AMScoutingV2?.refreshScoutingIntegration?.()}catch(_){ }if(typeof view==='function')view('scouting');setTimeout(()=>{armScoutingV2Assignment();focusScoutingV2Assignment()},180);setTimeout(focusScoutingV2Assignment,650);return}
 if(target==='competition'){const e=openingEvent();if(e){try{competitionMode='overview';activeEventDisc=null}catch(_){ }}if(typeof view==='function')view('competition');return}
 if(typeof view==='function')view(target);
}
function handleClick(ev){
 const b=ev.target.closest?.('button,[data-ftx-route]');if(!b)return;
 if(b.dataset.ftxGuidance){setGuidance(b.dataset.ftxGuidance);return}
 if(b.dataset.ftxRoute){routeTo(b.dataset.ftxRoute);return}
 if(b.dataset.ftxMail){try{openMail=b.dataset.ftxMail}catch(_){ }routeTo('inbox');return}
 if(b.dataset.ftxAthlete){if(active()&&currentPhase()==='athlete')markStep('athleteOpened');if(typeof openAthleteProfile==='function')openAthleteProfile(b.dataset.ftxAthlete);return}
 if(b.hasAttribute('data-ftx-advance')){if(typeof advanceWeek==='function')advanceWeek();return}
 if(b.hasAttribute('data-ftx-complete')){const st=ensureState();st.completed=true;st.active=false;saveSafe();decorateCurrent();return}
 if(b.dataset.ftxAcceptTraining){s.trainingFocus=b.dataset.ftxAcceptTraining;markStep('trainingDecision');saveSafe();toastSafe(`Training focus: ${s.trainingFocus}`);try{if(typeof drawTraining==='function')drawTraining()}catch(_){ }scheduleDecorate();return}
 if(b.hasAttribute('data-ftx-choose-training')){rootFocus('[data-focus]');return}
 if(b.dataset.ftxScout){const state=typeof scoutingState==='function'?scoutingState():(s.scouting??={});state.focus=b.dataset.ftxScout;markStep('scoutAssignment');saveSafe();toastSafe('Scouting assignment started');try{if(typeof drawScouting==='function')drawScouting()}catch(_){ }scheduleDecorate();return}
 const open=currentOpenSelection();
 if(open&&b.hasAttribute('data-ftx-coach-team')){useCoachTeam(open.e);return}
 if(open&&b.hasAttribute('data-ftx-no-entry-all')){noEntryCompetition(open.e);return}
 if(open&&b.dataset.ftxNoEntry){noEntryDiscipline(open.e,b.dataset.ftxNoEntry);return}
 if(open&&b.hasAttribute('data-ftx-choose-team')){rootFocus('[data-sel],.select-toggle');return}
 if(active()&&typeof currentView!=='undefined'&&currentView==='training'&&b.matches('[data-focus]')){setTimeout(()=>markStep('trainingDecision'),0)}
}
function rootFocus(sel){const el=document.querySelector(sel);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.focus?.()}}
function captureAdvance(ev){
 const b=ev.target.closest?.('#advanceTop,[data-advance-week],button');if(!b||!(b.id==='advanceTop'||/advance week/i.test(b.textContent||'')))return;
 const phase=requiredPhase();if(!phase)return;
 ev.preventDefault();ev.stopImmediatePropagation();const copy=phaseCopy();toastSafe('Complete the current guided task first.');if(copy.route)routeTo(copy.route);else if(copy.athlete)openAthleteProfile(copy.athlete);else if(copy.mail){try{openMail=copy.mail}catch(_){ }routeTo('inbox')}
}

function initialise(){
 try{
  const st=ensureState();installHooks();
  if(st&&!st.legacy&&s?.appointment?.contractSigned){st.active=!st.completed;ensureOpeningSchedule();retireLegacyOpeningTasks();weekMessages()}
  document.addEventListener('click',handleClick);
  document.addEventListener('click',event=>{if(!active()||currentPhase()!=='scouting')return;const target=event.target.closest?.('#scouting button,#scouting [role="button"],#scouting label');if(target)maybeCompleteScoutingV2Assignment(target,'scouting-v2-click')});
  document.addEventListener('change',event=>{if(!active())return;const el=event.target;if(currentPhase()==='scouting'&&$('scouting')?.contains(el))maybeCompleteScoutingV2Assignment(el,'scouting-v2-change');if(typeof currentView!=='undefined'&&currentView==='training'&&el?.dataset?.focus&&!ensureState().steps.trainingDecision)markStep('trainingDecision')});
  document.addEventListener('click',captureAdvance,true);
  const observer=new MutationObserver(()=>scheduleDecorate());observer.observe(document.body,{subtree:true,childList:true});
  const athleteDialog=$('athleteProfile');if(athleteDialog&&!athleteDialog.dataset.ftxCloseBound){athleteDialog.dataset.ftxCloseBound='1';athleteDialog.addEventListener('close',()=>{clearSquadGuidance();scheduleDecorate()})}
  window.addEventListener('pageshow',scheduleDecorate);window.addEventListener('orientationchange',scheduleDecorate);
  scheduleDecorate();
 }catch(err){console.error('First-Time Experience V2 failed to initialise',err)}
}

window.AMFirstTimeExperienceV2={
 version:VERSION,
 ensure:()=>ensureState(),
 snapshot:()=>{const st=ensureState();return{version:VERSION,stateVersion:STATE_VERSION,active:active(),phase:currentPhase(),guidance:st?.guidance,steps:{...(st?.steps||{})},seen:{...(st?.seen||{})},openingEvent:openingEvent()?.id||null,openingWeek:openingEvent()?.week||null,legacy:!!st?.legacy,completed:!!st?.completed}},
 setGuidance,
 ensureSchedule:ensureOpeningSchedule,
 reset(){if(!s)return false;delete s.firstTimeExperienceV2;const st=ensureState();st.legacy=false;st.completed=false;st.active=!!s?.appointment?.contractSigned;st.guidance='recommended';ensureOpeningSchedule();saveSafe();scheduleDecorate();return true},
 debug:()=>({state:ensureState(),phase:currentPhase(),required:requiredPhase(),event:openingEvent(),mail:selectionMail()})
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(initialise,0),{once:true});else setTimeout(initialise,0);
})();
