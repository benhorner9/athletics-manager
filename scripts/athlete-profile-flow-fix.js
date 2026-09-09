/* ===== Athlete Profile Flow & Clipping Fix ===== */
(function(){
'use strict';

const ATHLETE_PROFILE_FLOW_VERSION=2;
let athleteSectionMode='overview';
let refocusSection=false;

function athleteDialog(){return typeof $==='function'?$('athleteProfile'):document.getElementById('athleteProfile')}
function sectionTitle(panel){return String(panel?.querySelector('h2')?.textContent||'').trim().toLowerCase()}
function addUnique(list,panel){if(panel&&!list.includes(panel))list.push(panel)}
function allMatching(body,selector,regex){
  const out=[];
  body.querySelectorAll(selector).forEach(panel=>{if(!regex||regex.test(sectionTitle(panel)))addUnique(out,panel)});
  return out;
}
function panelsForMode(body,mode){
  const out=[];
  if(mode==='training'){
    body.querySelectorAll('.premium-training-panel').forEach(p=>addUnique(out,p));
    allMatching(body,'.profile-panel',/programme management|training/).forEach(p=>addUnique(out,p));
  }else if(mode==='development'){
    body.querySelectorAll('.premium-development-panel').forEach(p=>addUnique(out,p));
    allMatching(body,'.profile-panel',/readiness|development|career preferences|trait/).forEach(p=>addUnique(out,p));
  }else if(mode==='injuries'){
    body.querySelectorAll('.premium-injury-panel').forEach(p=>addUnique(out,p));
    allMatching(body,'.profile-panel',/injur|medical|availability|rehab|recovery/).forEach(p=>addUnique(out,p));
  }
  return out;
}
function focusedCopy(mode){
  if(mode==='training')return ['TRAINING','Training & programme management','Manage the athlete’s current workload and programme role without leaving the profile.'];
  if(mode==='development')return ['DEVELOPMENT','Development & readiness','Staff assessment, development direction and the athlete’s longer-term programme picture.'];
  return ['MEDICAL','Injuries & availability','Current medical status, recovery information and competition availability in one place.'];
}
function buildFocusedSection(body,mode){
  if(!['training','development','injuries'].includes(mode))return;
  const panels=panelsForMode(body,mode);
  [...body.children].forEach(el=>el.classList.add('athlete-flow-hidden'));
  const stage=document.createElement('div');stage.className='athlete-focused-view';
  const [kicker,title,note]=focusedCopy(mode);
  stage.innerHTML=`<section class="athlete-focused-intro"><small>${kicker}</small><h2>${title}</h2><p>${note}</p></section>`;
  if(panels.length){
    panels.forEach(panel=>{panel.classList.remove('athlete-flow-hidden');panel.classList.add('premium-card');stage.appendChild(panel)});
    if(panels.length===1)panels[0].classList.add('flow-focus-wide');
  }else{
    const empty=document.createElement('section');empty.className='profile-panel premium-card flow-focus-wide';empty.innerHTML='<h2>Information unavailable</h2><p>This section will populate as more programme information becomes available.</p>';stage.appendChild(empty);
  }
  body.prepend(stage);body.classList.add('athlete-focused-mode');
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
  buttons.forEach(([mode,btn])=>nav.appendChild(btn));
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
  const dialog=athleteDialog();if(!dialog?.open)return;
  const shell=dialog.querySelector('.profile-shell.premium-athlete-profile');if(!shell)return;
  const body=shell.querySelector('.profile-body');if(!body)return;
  wireTabs(shell);
  if(['training','development','injuries'].includes(athleteSectionMode))buildFocusedSection(body,athleteSectionMode);
  body.scrollTop=0;
}

const previousDrawAthleteProfile=drawAthleteProfile;
drawAthleteProfile=function(){previousDrawAthleteProfile();queueMicrotask(applyAthleteFlow)};
const previousOpenAthleteProfile=openAthleteProfile;
openAthleteProfile=function(id){athleteSectionMode='overview';previousOpenAthleteProfile(id);queueMicrotask(applyAthleteFlow)};

if(typeof UPDATES!=='undefined'&&!UPDATES.some(u=>u.title==='Athlete Profile Flow Polish'))UPDATES.unshift({date:'9 September 2026',title:'Athlete Profile Flow Polish',items:[
  'Athlete profile hero spacing has been tightened so status, metadata and rating content cannot collide with the portrait at iPad or mobile widths.',
  'Profile metadata now wraps cleanly instead of clipping or ellipsising important status, coach and performance information.',
  'Overview, Results & Form, Training, Development, Injuries and Records & Milestones now behave as one consistent tab sequence instead of mixing page tabs with scroll-jump links.',
  'Training, Development and Injuries open as focused profile sections at the top of the content area, eliminating the previous up-and-down scrolling between tabs.'
]});
if(typeof renderMenu==='function')renderMenu();
window.__athleticsAthleteProfileFlow={version:ATHLETE_PROFILE_FLOW_VERSION,apply:applyAthleteFlow};
})();
/* ===== End Athlete Profile Flow & Clipping Fix ===== */
