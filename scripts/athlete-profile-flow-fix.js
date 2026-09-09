/* ===== Athlete Profile Tab Audit ===== */
(function(){
'use strict';

const ATHLETE_PROFILE_FLOW_VERSION=4;
let athleteSectionMode='overview';
let refocusSection=false;

function athleteDialog(){return typeof $==='function'?$('athleteProfile'):document.getElementById('athleteProfile')}
function currentAthlete(){return s?.athletes?.find(x=>x.id===profileId)||null}
function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function sectionTitle(panel){return String(panel?.querySelector('h2')?.textContent||'').trim().toLowerCase()}
function addUnique(list,node){if(node&&!list.includes(node))list.push(node);return node}
function matchingPanels(body,regex){const out=[];body.querySelectorAll('.profile-panel').forEach(panel=>{if(regex.test(sectionTitle(panel)))addUnique(out,panel)});return out}
function hideOriginalBody(body){[...body.children].forEach(el=>el.classList.add('athlete-flow-hidden'));body.classList.add('athlete-focused-mode')}
function makeStage(body,mode,intro=true){
  hideOriginalBody(body);
  const stage=document.createElement('div');
  stage.className=mode==='overview'?'athlete-overview-stage premium-profile-grid':'athlete-focused-view';
  stage.dataset.athleteView=mode;
  if(intro&&mode!=='overview'){
    const copy={
      results:['RESULTS & FORM','Results & form','Official performances, current form and staff performance reviews.'],
      training:['TRAINING','Training & programme management','Current individual load and the programme decisions that affect this athlete.'],
      development:['DEVELOPMENT','Development','Staff assessment, Development Grade and the evidence behind the athlete’s longer-term direction.'],
      injuries:['MEDICAL','Injuries & availability','Current medical status, recovery history and competition availability.'],
      records:['RECORDS','Records & milestones','Record ownership, medals and official performance milestones.']
    }[mode];
    if(copy){const [kicker,title,note]=copy;stage.insertAdjacentHTML('beforeend',`<section class="athlete-focused-intro"><small>${kicker}</small><h2>${title}</h2><p>${note}</p></section>`)}
  }
  body.prepend(stage);
  return stage;
}
function metricGrid(items){
  const el=document.createElement('div');el.className='profile-headline-stats premium-key-metrics premium-span-12';
  el.innerHTML=items.map(([label,value,note])=>`<div class="profile-metric premium-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`).join('');
  return el;
}
function move(stage,node,wide=false){if(!node)return null;node.classList.remove('athlete-flow-hidden');if(wide)node.classList.add('flow-focus-wide');stage.appendChild(node);return node}
function ensureQualification(body,a){
  if(body.querySelector('.qualification-profile')||typeof qualificationProfileHTML!=='function')return;
  const html=qualificationProfileHTML(a);if(html)body.insertAdjacentHTML('afterbegin',html)
}
function ensurePremiumCard(panel){if(panel){panel.classList.add('premium-card');return panel}return null}

function buildOverview(body,a){
  ensureQualification(body,a);
  const metrics=body.querySelector('.profile-headline-stats');
  const qualification=body.querySelector('.qualification-profile');
  const assessment=body.querySelector('.profile-report')||matchingPanels(body,/coach.?s assessment|athlete assessment/)[0];
  const upcoming=matchingPanels(body,/^(upcoming entries|career status)$/)[0];
  const careerWatch=body.querySelector('.story-now');
  const relationship=matchingPanels(body,/relationship.*career story|^career story$/)[0];
  const preferences=body.querySelector('.independence-panel')||matchingPanels(body,/^career preferences$/)[0];
  const traits=matchingPanels(body,/trait|morale/)[0];
  const rivalry=matchingPanels(body,/rivalr/)[0];
  const stage=makeStage(body,'overview',false);
  if(metrics){metrics.classList.add('premium-span-12');move(stage,metrics)}
  move(stage,qualification,true);
  move(stage,ensurePremiumCard(assessment));
  move(stage,ensurePremiumCard(upcoming));
  move(stage,ensurePremiumCard(careerWatch));
  move(stage,ensurePremiumCard(relationship));
  move(stage,ensurePremiumCard(preferences));
  move(stage,ensurePremiumCard(traits));
  move(stage,ensurePremiumCard(rivalry));
  if(stage.children.length===0)stage.innerHTML='<section class="profile-panel premium-card premium-span-12"><h2>Overview</h2><p>Profile information will populate as the career develops.</p></section>';
}

function buildResults(body,a){
  const results=matchingPanels(body,/^results\s*&\s*form$/)[0];
  const reviews=matchingPanels(body,/^recent performance reviews$/)[0];
  const history=typeof profileHistory==='function'?profileHistory(a):[];
  const season=history.filter(p=>p.season===s.game.season);
  const seasonBest=season.length?season.map(p=>p.perf).reduce((x,y)=>better(a.disc,y,x)?y:x):null;
  const stage=makeStage(body,'results');
  move(stage,metricGrid([
    ['Season best',seasonBest==null?'—':fmtPerf(a.disc,seasonBest),'Recorded this season'],
    ['Form',a.form+'/100','Current sharpness'],
    ['Fitness',a.fitness+'/100','Physical readiness'],
    ['Fatigue',a.fatigue+'/100',a.fatigue>=60?'High':a.fatigue>=40?'Moderate':'Low']
  ]));
  const trajectory=document.createElement('section');trajectory.className='profile-panel premium-card flow-focus-wide';trajectory.innerHTML=`<h2>Performance trajectory</h2>${profileChart(a,history)}`;stage.appendChild(trajectory);
  move(stage,ensurePremiumCard(results),true);
  move(stage,ensurePremiumCard(reviews),true);
}

function buildTraining(body,a){
  const panels=matchingPanels(body,/programme management|programme status|^training$/);
  const stage=makeStage(body,'training');
  move(stage,metricGrid([
    ['Individual load',a.training||'Balanced','Athlete-specific setting'],
    ['National focus',s.trainingFocus||'Balanced','Programme-wide setting'],
    ['Fitness',a.fitness+'/100','Current readiness'],
    ['Fatigue',a.fatigue+'/100',a.fatigue>=60?'Recovery may be useful':'Manageable']
  ]));
  panels.forEach((panel,i)=>move(stage,ensurePremiumCard(panel),panels.length===1));
  if(!panels.length){const empty=document.createElement('section');empty.className='profile-panel premium-card flow-focus-wide';empty.innerHTML='<h2>Training</h2><p>No editable programme training information is available for this athlete.</p>';stage.appendChild(empty)}
}

function buildDevelopment(body,a){
  const panels=matchingPanels(body,/readiness\s*&\s*development|^development$/);
  const confidence=typeof assessmentConfidenceLabel==='function'?assessmentConfidenceLabel(a,'overall')?.[0]:'—';
  const grade=typeof developmentGradeText==='function'?developmentGradeText(a):(typeof developmentGrade==='function'?developmentGrade(a):'—');
  const stage=makeStage(body,'development');
  move(stage,metricGrid([
    ['Staff ability',assessmentText(a,'overall'),'Working assessment range'],
    ['Development grade',grade,'Staff projection'],
    ['Assessment confidence',confidence||'—','Improves with evidence'],
    ['Age',a.age,'Career stage']
  ]));
  panels.forEach((panel,i)=>move(stage,ensurePremiumCard(panel),panels.length===1));
  if(!panels.length){const empty=document.createElement('section');empty.className='profile-panel premium-card flow-focus-wide';empty.innerHTML='<h2>Development</h2><p>No development assessment is available yet.</p>';stage.appendChild(empty)}
}

function buildInjuries(body,a){
  const panels=matchingPanels(body,/injur|medical|availability|rehab|recovery/).filter(panel=>!/^upcoming entries$/.test(sectionTitle(panel)));
  const stage=makeStage(body,'injuries');
  move(stage,metricGrid([
    ['Status',health(a)[0],'Current availability'],
    ['Injury time',a.injury>0?`${a.injury} week${a.injury===1?'':'s'}`:'None','Current expected absence'],
    ['Fitness',a.fitness+'/100','Physical readiness'],
    ['Fatigue',a.fatigue+'/100','Workload signal']
  ]));
  panels.forEach(panel=>move(stage,ensurePremiumCard(panel),panels.length===1));
  if(!panels.length){const empty=document.createElement('section');empty.className='profile-panel premium-card flow-focus-wide';empty.innerHTML='<h2>Availability</h2><p>No active injury or recorded recovery case.</p>';stage.appendChild(empty)}
}

function buildRecords(body,a){
  const metrics=body.querySelector('.profile-headline-stats');
  const recordBook=matchingPanels(body,/^record book$/)[0];
  const milestones=matchingPanels(body,/^recorded milestones$/)[0];
  const stage=makeStage(body,'records');
  if(metrics){metrics.classList.add('premium-span-12');move(stage,metrics)}
  move(stage,ensurePremiumCard(recordBook));
  move(stage,ensurePremiumCard(milestones));
}

function orderedButtons(nav){
  return [
    ['overview',nav.querySelector('[data-profile-tab="overview"]')],
    ['results',nav.querySelector('[data-profile-tab="results"]')],
    ['training',nav.querySelector('[data-premium-jump="training"]')],
    ['development',nav.querySelector('[data-premium-jump="development"]')],
    ['injuries',nav.querySelector('[data-premium-jump="injuries"]')],
    ['records',nav.querySelector('[data-profile-tab="records"]')]
  ].filter(([,btn])=>btn);
}
function setAthleteSection(mode){
  athleteSectionMode=mode;
  profileTab=(mode==='results'||mode==='records')?mode:'overview';
  refocusSection=true;
  drawAthleteProfile();
}
function wireTabs(shell){
  const nav=shell.querySelector('.profile-tabs');if(!nav)return;
  const buttons=orderedButtons(nav);
  buttons.forEach(([,btn])=>nav.appendChild(btn));
  buttons.forEach(([mode,btn])=>{
    btn.dataset.athleteSection=mode;
    btn.classList.toggle('on',mode===athleteSectionMode);
    btn.setAttribute('aria-pressed',mode===athleteSectionMode?'true':'false');
    btn.onclick=e=>{e.preventDefault();setAthleteSection(mode)};
  });
  if(refocusSection){
    const selected=buttons.find(([mode])=>mode===athleteSectionMode)?.[1];
    try{selected?.focus({preventScroll:true})}catch{selected?.focus()}
    refocusSection=false;
  }
}
function applyAthleteFlow(){
  const dialog=athleteDialog(),a=currentAthlete();if(!dialog?.open||!a)return;
  const shell=dialog.querySelector('.profile-shell.premium-athlete-profile');if(!shell)return;
  const body=shell.querySelector('.profile-body');if(!body)return;
  wireTabs(shell);
  if(athleteSectionMode==='overview')buildOverview(body,a);
  else if(athleteSectionMode==='results')buildResults(body,a);
  else if(athleteSectionMode==='training')buildTraining(body,a);
  else if(athleteSectionMode==='development')buildDevelopment(body,a);
  else if(athleteSectionMode==='injuries')buildInjuries(body,a);
  else buildRecords(body,a);
  body.scrollTop=0;
}

const previousDrawAthleteProfile=drawAthleteProfile;
drawAthleteProfile=function(){previousDrawAthleteProfile();queueMicrotask(applyAthleteFlow)};
const previousOpenAthleteProfile=openAthleteProfile;
openAthleteProfile=function(id){athleteSectionMode='overview';previousOpenAthleteProfile(id);queueMicrotask(applyAthleteFlow)};

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Athlete Profile Tab Audit'))UPDATES.unshift({date:'9 September 2026',title:'Athlete Profile Tab Audit',items:[
  'Rebuilt athlete-profile tab ownership so Career Watch, relationship history and career preferences stay in Overview instead of leaking into Results or Records.',
  'Results & Form now contains only performance information: season form metrics, the performance trajectory, official results and recent staff performance reviews.',
  'Training, Development and Injuries now each contain only the information relevant to that decision area, while Records & Milestones is limited to records, medals and official milestones.',
  'Overview now acts as the true athlete summary: key metrics, qualification, coach assessment, upcoming entries, career context, programme relationship, traits and rivalries.'
]});
if(typeof renderMenu==='function')renderMenu();
window.__athleticsAthleteProfileFlow={version:ATHLETE_PROFILE_FLOW_VERSION,apply:applyAthleteFlow};
})();
/* ===== End Athlete Profile Tab Audit ===== */
