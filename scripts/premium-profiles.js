/* ===== Premium Athlete & Coach Profiles ===== */
(function(){
'use strict';

const PREMIUM_PROFILE_VERSION=1;
let premiumCoachTab='overview';

function esc(v){return typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'')}
function num(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback}
function roleForDiscipline(d){
  const key=String(d||'');
  if(/(100|200|400)$/.test(key))return 'sprint';
  if(/(800|1500|5000|10000)$/.test(key))return 'endurance';
  if(/HJ$/.test(key))return 'jumps';
  return 'throws';
}
function coachForAthlete(a){
  const role=roleForDiscipline(a?.disc),coach=s?.coaches?.[role];
  return coach?.name||STAFF_DEF?.[role]?.name||'Performance staff';
}
function portraitPosition(a){
  const n=typeof athletePortraitIndex==='function'?athletePortraitIndex(a):0;
  return `${(n%8)*100/7}% ${Math.floor(n/8)*100/7}%`;
}
function coachPortraitPosition(c){
  const n=typeof coachPortraitIndex==='function'?coachPortraitIndex(c):0;
  return `${(n%6)*20}% ${Math.floor(n/6)*25}%`;
}
function setText(el,value){if(el&&el.textContent!==String(value??''))el.textContent=String(value??'')}
function metric(label,value,note=''){return `<div class="profile-metric premium-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong>${note?`<span>${esc(note)}</span>`:''}</div>`}

function athleteMeta(a){
  const own=a.nation===managedNation(),squad=own&&!a.retired&&a.inSquad!==false;
  return [
    ['Age',a.age],
    ['Status',a.retired?'Retired':own?(squad?'National Squad':'National Pool'):'International'],
    ['Level',a.tier||'Athlete'],
    ['Coach',coachForAthlete(a)],
    ['Personal Best',fmtPerf(a.disc,a.pb)]
  ];
}
function addAthleteHeroDetails(shell,a){
  const hero=shell.querySelector('.profile-hero'),identity=hero?.querySelector('.profile-identity'),rating=hero?.querySelector('.profile-rating');
  if(!hero||!identity||!rating)return;
  hero.classList.add('premium-athlete-hero');
  if(!hero.querySelector('.premium-hero-watermark')){
    const wm=document.createElement('span');wm.className='premium-hero-watermark athlete-portrait';wm.setAttribute('aria-hidden','true');wm.style.backgroundPosition=portraitPosition(a);hero.insertBefore(wm,rating);
  }
  let meta=identity.querySelector('.premium-meta-strip');
  if(!meta){meta=document.createElement('div');meta.className='premium-meta-strip';identity.appendChild(meta)}
  meta.innerHTML=athleteMeta(a).map(([k,v])=>`<div><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('');
  rating.classList.add('premium-rating-card');
  if(!rating.querySelector('.premium-rating-facts')){
    const stats=selectionStats(a),dev=typeof developmentGrade==='function'?developmentGrade(a):'';
    rating.insertAdjacentHTML('beforeend',`<div class="premium-rating-facts"><div><small>World rank</small><strong>${stats.rank?'#'+stats.rank:'—'}</strong></div><div><small>Development</small><strong>${esc(dev||'—')}</strong></div><div><small>PB</small><strong>${esc(fmtPerf(a.disc,a.pb))}</strong></div></div>`);
  }
  const top=shell.querySelector('.profile-top span');if(top)setText(top,`Athlete profile • ${s.game.season} / Week ${s.game.week}`);
}
function panelTitle(panel){return String(panel?.querySelector('h2')?.textContent||'').trim().toLowerCase()}
function classifyAthletePanels(shell,a){
  const body=shell.querySelector('.profile-body');if(!body)return;
  body.classList.toggle('premium-overview',profileTab==='overview');
  const cols=body.querySelector('.profile-columns');if(cols)cols.classList.add('premium-profile-grid');
  body.querySelectorAll('.profile-stack').forEach(x=>x.classList.add('premium-profile-stack'));
  let hasMedical=false;
  body.querySelectorAll('.profile-panel').forEach(panel=>{
    panel.classList.add('premium-card');
    const t=panelTitle(panel);
    if(/readiness|development/.test(t)){panel.classList.add('premium-span-6','premium-development-panel')}
    else if(/performance trajectory|form/.test(t)){panel.classList.add('premium-span-6','premium-form-panel')}
    else if(/coach|assessment/.test(t)){panel.classList.add('premium-span-5','premium-assessment-panel')}
    else if(/programme management|training/.test(t)){panel.classList.add('premium-span-3','premium-training-panel')}
    else if(/upcoming|availability/.test(t)){panel.classList.add('premium-span-4','premium-upcoming-panel')}
    else if(/injur|medical|rehab|recovery/.test(t)){panel.classList.add('premium-span-4','premium-injury-panel');hasMedical=true}
    else if(/trait|rival|career preferences/.test(t)){panel.classList.add('premium-span-4')}
    else if(/qualification/.test(t)){panel.classList.add('premium-span-12')}
    else panel.classList.add('premium-span-4');
  });
  if(profileTab==='overview'&&!hasMedical&&cols){
    const target=cols.querySelector('.profile-stack:last-child')||cols;
    const medical=document.createElement('section');medical.className='profile-panel premium-card premium-span-4 premium-injury-panel';
    const status=a.retired?'Retired':a.injury>0?`Injured • ${a.injury} week${a.injury===1?'':'s'} remaining`:a.fitness<80?'Building fitness':'Available';
    medical.innerHTML=`<div class="profile-kicker">MEDICAL</div><h2>Availability</h2><div class="premium-health-line"><span class="premium-health-dot ${a.injury>0?'bad':a.fitness<80?'warn':'good'}"></span><strong>${esc(status)}</strong></div><p>${a.injury>0?'The athlete remains unavailable for competition while the medical team manages the current issue.':a.fitness<80?'No active injury, but physical readiness is below the preferred competition range.':'No current injury restrictions. Continue monitoring fitness and fatigue through the competition block.'}</p>`;
    target.appendChild(medical);
  }
}
function athleteJumpTarget(kind){
  const root=$('athleteProfile');
  if(kind==='training')return root.querySelector('.premium-training-panel');
  if(kind==='development')return root.querySelector('.premium-development-panel');
  return root.querySelector('.premium-injury-panel');
}
function jumpAthleteSection(kind){
  const go=()=>{const target=athleteJumpTarget(kind);target?.scrollIntoView({behavior:'smooth',block:'start'})};
  if(profileTab!=='overview'){profileTab='overview';drawAthleteProfile();queueMicrotask(go)}else go();
}
function enhanceAthleteTabs(shell){
  const nav=shell.querySelector('.profile-tabs');if(!nav)return;
  nav.classList.add('premium-tabs');
  const labels={overview:'Overview',results:'Results & Form',records:'Records & Milestones'};
  nav.querySelectorAll('[data-profile-tab]').forEach(btn=>{const k=btn.dataset.profileTab;if(labels[k])setText(btn,labels[k])});
  for(const [kind,label] of [['training','Training'],['development','Development'],['injuries','Injuries']]){
    if(nav.querySelector(`[data-premium-jump="${kind}"]`))continue;
    const b=document.createElement('button');b.type='button';b.dataset.premiumJump=kind;b.textContent=label;b.onclick=()=>jumpAthleteSection(kind);nav.insertBefore(b,nav.querySelector('[data-profile-tab="records"]'));
  }
}
function enhanceAthleteProfile(){
  const dialog=$('athleteProfile'),a=s?.athletes?.find(x=>x.id===profileId);if(!dialog?.open||!a)return;
  const shell=dialog.querySelector('.profile-shell');if(!shell)return;
  shell.classList.add('premium-profile','premium-athlete-profile');
  addAthleteHeroDetails(shell,a);enhanceAthleteTabs(shell);classifyAthletePanels(shell,a);
  const metrics=shell.querySelector('.profile-headline-stats');if(metrics)metrics.classList.add('premium-key-metrics');
}

const baseDrawAthleteProfile=drawAthleteProfile;
drawAthleteProfile=function(){baseDrawAthleteProfile();queueMicrotask(enhanceAthleteProfile)};
const baseOpenAthleteProfile=openAthleteProfile;
openAthleteProfile=function(id){baseOpenAthleteProfile(id);queueMicrotask(enhanceAthleteProfile)};

function resolveCoach(id){
  ensureCoaches();
  const current=Object.values(s.coaches||{}).find(c=>c?.id===id),candidate=Object.keys(STAFF_DEF).flatMap(coachCandidates).find(c=>c.id===id),archived=managementState().coachArchive[id];
  return {c:current||candidate||archived,current};
}
function coachMetrics(c,d,current){
  const results=Object.values(d.results||{}),rows=results.flatMap(r=>r.rows||[]),podiums=rows.filter(r=>r.place<=3).length,records=rows.filter(r=>(r.achievements||[]).some(a=>['WR','NR'].includes(a))).length,athletes=new Set(rows.map(r=>r.name)).size,left=current?Math.max(0,num(current.until)-coachWeek()):0;
  return {results,rows,podiums,records,athletes,left};
}
function enhanceCoachProfile(id){
  const dialog=$('managementProfile');if(!dialog?.open)return;
  const {c,current}=resolveCoach(id);if(!c)return;const d=coachDossier(c),m=coachMetrics(c,d,current),shell=dialog.querySelector('.profile-shell'),body=shell?.querySelector('.profile-body'),hero=body?.querySelector('.profile-hero');if(!shell||!body||!hero)return;
  shell.classList.add('premium-profile','premium-coach-profile');body.classList.add('premium-coach-body');hero.classList.add('premium-coach-hero');
  const title=body.querySelector(':scope > #managementName'),identity=hero.querySelector('.profile-identity'),rating=hero.querySelector('.profile-rating');
  if(title&&identity&&!identity.querySelector('#managementName')){title.classList.add('premium-coach-name');identity.insertBefore(title,identity.firstChild)}
  if(hero.parentElement===body){body.removeChild(hero);shell.insertBefore(hero,body)}
  if(!hero.querySelector('.premium-hero-watermark')){
    const wm=document.createElement('span');wm.className='premium-hero-watermark coach-portrait';wm.setAttribute('aria-hidden','true');wm.style.backgroundPosition=coachPortraitPosition(d);hero.insertBefore(wm,rating);
  }
  if(identity&&!identity.querySelector('.premium-meta-strip')){
    const status=current?'National programme':'Available / former staff',age=num(d.age)+s.game.season-num(d.originSeason),role=STAFF_DEF[d.role]?.name||'Coach';
    identity.insertAdjacentHTML('beforeend',`<div class="premium-meta-strip"><div><small>Age</small><strong>${age}</strong></div><div><small>Status</small><strong>${esc(status)}</strong></div><div><small>Role</small><strong>${esc(role)}</strong></div><div><small>Style</small><strong>${esc(d.style||'Balanced')}</strong></div><div><small>Contract</small><strong>${current?m.left+' weeks':'—'}</strong></div></div>`)
  }
  if(rating){rating.classList.add('premium-rating-card');if(!rating.querySelector('.premium-rating-facts'))rating.insertAdjacentHTML('beforeend',`<div class="premium-rating-facts"><div><small>Podiums</small><strong>${m.podiums}</strong></div><div><small>Records</small><strong>${m.records}</strong></div><div><small>Athletes</small><strong>${m.athletes||'—'}</strong></div></div>`)}
  let tabs=shell.querySelector('.premium-coach-tabs');if(!tabs){tabs=document.createElement('nav');tabs.className='profile-tabs premium-tabs premium-coach-tabs';tabs.setAttribute('aria-label','Coach profile sections');tabs.innerHTML='<button data-coach-tab="overview">Overview</button><button data-coach-tab="coaching">Coaching & Contract</button><button data-coach-tab="career">Career Record</button>';shell.insertBefore(tabs,body);tabs.querySelectorAll('[data-coach-tab]').forEach(b=>b.onclick=()=>{premiumCoachTab=b.dataset.coachTab;applyCoachTab(shell)})}
  if(!body.querySelector('.premium-coach-metrics')){
    const roleName=STAFF_DEF[d.role]?.name||'Coach';
    body.insertAdjacentHTML('afterbegin',`<div class="profile-headline-stats premium-key-metrics premium-coach-metrics">${metric('Role',roleName,d.style+' approach')}${metric('Athlete appearances',m.rows.length,'Supported in your programme')}${metric('Podiums',m.podiums,'Across recorded competitions')}${metric('Record performances',m.records,'WR / NR supported')}</div>`)
  }
  const cols=body.querySelector('.profile-columns');if(cols)cols.classList.add('premium-profile-grid','premium-coach-grid');
  body.querySelectorAll('.profile-panel').forEach(panel=>{panel.classList.add('premium-card','premium-span-6');const t=panelTitle(panel);panel.dataset.coachSection=/career|championship/.test(t)?'career':'coaching'});
  const top=shell.querySelector('.profile-top span');if(top)setText(top,'Coach profile • programme staff');
  applyCoachTab(shell);
}
function applyCoachTab(shell){
  shell.querySelectorAll('[data-coach-tab]').forEach(b=>b.classList.toggle('on',b.dataset.coachTab===premiumCoachTab));
  shell.querySelectorAll('[data-coach-section]').forEach(panel=>{panel.hidden=premiumCoachTab!=='overview'&&panel.dataset.coachSection!==premiumCoachTab});
  const metrics=shell.querySelector('.premium-coach-metrics');if(metrics)metrics.hidden=premiumCoachTab==='career';
}
const baseOpenCoachProfile=openCoachProfile;
openCoachProfile=function(id){premiumCoachTab='overview';baseOpenCoachProfile(id);queueMicrotask(()=>enhanceCoachProfile(id))};

window.__athleticsPremiumProfiles={version:PREMIUM_PROFILE_VERSION,enhanceAthleteProfile,enhanceCoachProfile};
})();
/* ===== End Premium Athlete & Coach Profiles ===== */
