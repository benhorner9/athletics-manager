from pathlib import Path
import re
R=Path('.')
def rd(p): return (R/p).read_text(encoding='utf-8')
def wr(p,s): (R/p).write_text(s,encoding='utf-8')
def rep(p,a,b,n=1):
 s=rd(p)
 if s.count(a)<n: raise SystemExit(f'{p}: missing anchor {a[:100]!r}')
 wr(p,s.replace(a,b,n))

# Shell brand and runtime ordering.
rep('game.html','<aside class="rail"><div class="rail-brand"><small id="railNation">National Programme</small><strong>ATHLETICS<br>MANAGER</strong></div><nav','<aside class="rail"><div class="rail-brand rail-brand-single"><strong class="rail-brand-mark" aria-label="Athletics Manager">AM</strong><small id="railNation">National Programme</small></div><nav')
rep('game.html','<script src="scripts/training-v3.js?v=20260910-training3"></script>\n<script src="scripts/scouting-v3.js?v=20260910-scouting3"></script>','<script src="scripts/training-v2-bootstrap.js?v=20260911-training2restore"></script>\n<script src="scripts/scouting-v2-bootstrap.js?v=20260911-scouting2restore"></script>\n<script src="scripts/training-v3.js?v=20260911-training31"></script>\n<script src="scripts/scouting-v3.js?v=20260911-scouting3compat"></script>')
for a,b in [('styles/ui-platform-v1.css?v=20260911-cutover1','styles/ui-platform-v1.css?v=20260911-playtest1'),('scripts/manager-profile-sidebar-v1.js?v=20260911-manager-sidebar1','scripts/manager-profile-sidebar-v1.js?v=20260911-manager-sidebar2'),('scripts/first-time-experience-v2.js?v=20260911-ftx2','scripts/first-time-experience-v2.js?v=20260911-ftx21'),('scripts/ui-cutover-v1.js?v=20260911-cutover1','scripts/ui-cutover-v1.js?v=20260911-cutover2')]: rep('game.html',a,b)

# Single brand identity in sidebar.
p='styles/ui-platform-v1.css';s=rd(p);mark='/* Playtest feedback — single rail identity */'
if mark not in s:
 s+='''\n\n/* Playtest feedback — single rail identity */\nbody.am-ui-platform .rail-brand.rail-brand-single{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;align-items:center;padding:8px 10px 14px}\nbody.am-ui-platform .rail-brand.rail-brand-single .rail-brand-mark{display:grid;place-items:center;width:44px;height:44px;margin:0;border-radius:10px;background:linear-gradient(135deg,#edf5f8 0 72%,#ef4057 72% 100%);color:#07131d;font-size:14px;font-weight:1000;letter-spacing:-.06em;line-height:1;box-shadow:0 8px 22px rgba(0,0,0,.22)}\nbody.am-ui-platform .rail-brand.rail-brand-single #railNation{min-width:0;margin:0;color:var(--am-muted);font-size:8px;line-height:1.35;letter-spacing:.12em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n'''
wr(p,s)

# My Profile sidebar highlight.
wr('scripts/manager-profile-sidebar-v1.js',r'''/* Athletics Manager — My Profile sidebar interaction */
(function(){
'use strict';
if(window.__amManagerProfileSidebarV1)return;window.__amManagerProfileSidebarV1=1;
const dialog=document.getElementById('managementProfile');if(!dialog)return;
const desktop=document.getElementById('myProfileShortcut'),mobile=document.getElementById('mobileMyProfile');
function route(){try{return typeof currentView==='string'?currentView:'home'}catch(_){return'home'}}
function sync(open=dialog.open){const r=route();document.querySelectorAll('.rail-nav [data-view]').forEach(b=>{const on=!open&&b.dataset.view===r;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});for(const b of [desktop,mobile])if(b){b.classList.toggle('on',!!open);if(open)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}
const nativeShow=window.HTMLDialogElement?.prototype?.show;if(typeof nativeShow==='function')dialog.showModal=function(){if(!this.open)nativeShow.call(this);sync(true)};
function closeForNav(target){if(!dialog.open)return;if(target?.closest?.('#myProfileShortcut,#mobileMyProfile,[data-manager-tab],[data-manager-athlete],[data-manager-season],[data-manager-scope],[data-manager-timeline],[data-manager-save-name],[data-manager-close]'))return;if(target?.closest?.('.rail-nav [data-view],.bottom-nav [data-view],[data-mobile-view],#menuBtn,#mobileMainMenu')){dialog.close();sync(false)}}
dialog.addEventListener('close',()=>sync(false));document.addEventListener('click',e=>closeForNav(e.target),true);
window.__athleticsManagerProfileSidebarV1={version:1.1,dialog,sync,close:()=>{if(dialog.open)dialog.close();sync(false)}};
})();
''')

# FTUX: concrete athlete task, no stale card, no replacement scouting UI.
p='scripts/first-time-experience-v2.js';s=rd(p);s=s.replace("const VERSION='2.0.0';","const VERSION='2.0.1';",1)
a="if(phase==='athlete')return{eyebrow:'WEEK 1 • YOUR SQUAD',title:`Take a closer look at ${starAthlete()?.name||'one athlete'}`,body:'Open one athlete profile. Focus on event, ability, form and fitness — the rest can wait.',action:'VIEW ATHLETE',athlete:starAthlete()?.id,required:true};"
b="if(phase==='athlete')return{eyebrow:'WEEK 1 • YOUR SQUAD',title:`Take a closer look at ${starAthlete()?.name||'one athlete'}`,body:`Open ${starAthlete()?.name||'the athlete'}'s profile, check Event, Form and Fitness, then close the profile to return to Squad. That completes this step.`,action:'VIEW ATHLETE',athlete:starAthlete()?.id,required:true};"
if a not in s: raise SystemExit('FTUX athlete copy anchor missing')
s=s.replace(a,b,1)
pat=re.compile(r"function decorateSquad\(\)\{.*?\n\}\nfunction decorateTraining\(\)\{",re.S)
new=r'''function clearSquadGuidance(root=$('squad')){if(!root)return;root.querySelectorAll('.ftx-mentor').forEach(el=>el.remove());root.querySelectorAll('.ftx-spotlight').forEach(el=>el.classList.remove('ftx-spotlight'))}
function decorateSquad(){
 const root=$('squad');if(!root)return;const phase=currentPhase();
 if(!active()||!['squad','athlete'].includes(phase)){clearSquadGuidance(root);return}
 markSeen('squad');if(!ensureState().steps.squadReviewed)markStep('squadReviewed');
 const star=starAthlete();if(!star){clearSquadGuidance(root);return}clearSquadGuidance(root);if(currentPhase()!=='athlete')return;
 root.insertAdjacentHTML('afterbegin',`<section class="ftx-mentor"><div><small>${esc(headCoach().name.toUpperCase())} • HEAD COACH</small><strong>Start with ${esc(star.name)}</strong><p>Open ${esc(star.name)} and check three things: Event, Form and Fitness. Then close the profile and return here — that completes the task.</p></div><button class="am-button primary" data-ftx-athlete="${esc(star.id)}">VIEW ATHLETE</button></section>`);
 const row=root.querySelector(`[data-ath="${CSS.escape(String(star.id))}"]`)||root.querySelector(`[data-profile="${CSS.escape(String(star.id))}"]`)?.closest('tr,article,button');row?.classList.add('ftx-spotlight');
}
function decorateTraining(){'''
s,n=pat.subn(new,s,count=1)
if n!=1: raise SystemExit(f'FTUX squad patch failed {n}')
pat=re.compile(r"function decorateScouting\(\)\{.*?\n\}\nfunction competitionWhyHTML",re.S)
new=r'''function decorateScouting(){if(!active()||careerWeek()<3||ensureState().steps.scoutAssignment)return;const root=$('scouting');if(!root)return;markSeen('scouting');root.querySelectorAll('.ftx-scout-card').forEach(el=>el.remove())}
function competitionWhyHTML'''
s,n=pat.subn(new,s,count=1)
if n!=1: raise SystemExit(f'FTUX scouting patch failed {n}')
a="if(b.dataset.ftxAthlete){if(typeof openAthleteProfile==='function')openAthleteProfile(b.dataset.ftxAthlete);return}"
b="if(b.dataset.ftxAthlete){if(active()&&currentPhase()==='athlete')markStep('athleteOpened');if(typeof openAthleteProfile==='function')openAthleteProfile(b.dataset.ftxAthlete);return}"
if a not in s: raise SystemExit('FTUX athlete click anchor missing')
s=s.replace(a,b,1)
a="  document.addEventListener('click',handleClick);\n"
b="  document.addEventListener('click',handleClick);\n  document.addEventListener('click',event=>{if(!active()||currentPhase()!=='scouting')return;const btn=event.target.closest?.('#scouting button');if(btn&&/assign|start|confirm|save|focus|scout/i.test(String(btn.textContent||'')))setTimeout(()=>markStep('scoutAssignment'),60)});\n"
if a not in s: raise SystemExit('FTUX initialise click anchor missing')
s=s.replace(a,b,1)
a="  window.addEventListener('pageshow',scheduleDecorate);window.addEventListener('orientationchange',scheduleDecorate);\n  scheduleDecorate();"
b="  const athleteDialog=$('athleteProfile');if(athleteDialog&&!athleteDialog.dataset.ftxCloseBound){athleteDialog.dataset.ftxCloseBound='1';athleteDialog.addEventListener('close',()=>{clearSquadGuidance();scheduleDecorate()})}\n  window.addEventListener('pageshow',scheduleDecorate);window.addEventListener('orientationchange',scheduleDecorate);\n  scheduleDecorate();"
if a not in s: raise SystemExit('FTUX close-listener anchor missing')
s=s.replace(a,b,1);wr(p,s)

# Restore Scouting V2 as visual authority.
p='scripts/scouting-v2-bootstrap.js';s=rd(p)
a="  /* V3 is presentation-only and intentionally installs after the proven V2 gameplay runtime.\n     If V3 is unavailable or errors, V2 remains the fallback renderer. */\n  if(typeof window.__athleticsScoutingV3?.install==='function')window.__athleticsScoutingV3.install();\n  if(typeof render==='function')render();"
b="  const root=document.getElementById('scouting');if(root){root.classList.add('scouting-v2-active');root.dataset.amUiScreen='scouting-v2'}\n  try{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){ }\n  if(typeof render==='function')render();"
if a not in s: raise SystemExit('Scouting V2 handoff anchor missing')
wr(p,s.replace(a,b,1))
p='scripts/scouting-v3.js';s=rd(p)
a="window.__athleticsScoutingV3={version:3,install,render,state:ui,debug,legacy:()=>fallbackDraw};\ninstall();\n/* Scouting V2 is loaded asynchronously by Training V2. Re-check briefly so V3 remains the final renderer even if that runtime arrives after this file. */\nlet checks=0;const timer=setInterval(()=>{checks++;if(typeof drawScouting==='function'&&drawScouting!==drawScoutingV3)install();if(checks>=40||window.AMScoutingV2&&drawScouting===drawScoutingV3)clearInterval(timer)},250);\nconst dialog=$('athleteProfile');if(dialog)dialog.addEventListener('close',()=>{try{if(currentView==='scouting')requestAnimationFrame(drawScoutingV3)}catch(_){}},true);"
b="window.__athleticsScoutingV3={version:3,install,render,state:ui,debug,legacy:()=>fallbackDraw,compatibilityOnly:true};\n/* Playtest feedback: Scouting V2 multi-assignment UI is the presentation authority again. */\ntry{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){ }"
if a not in s: raise SystemExit('Scouting V3 takeover anchor missing')
wr(p,s.replace(a,b,1))

# Training: V2 shell is the only visible page; V3 only enhances it.
p='scripts/training-v3.js';s=rd(p);pat=re.compile(r"function enhanceTraining\(\)\{.*?\n\}\nfunction scheduleTraining",re.S)
new=r'''function enhanceTraining(){
 trainingQueued=false;const root=byId('training');if(!root)return;const shell=root.querySelector('.tr2-shell');if(!shell)return;
 root.classList.add('training-v3');root.dataset.amUiScreen='training-v3';shell.classList.add('tr3-authoritative');shell.dataset.amUiScreen='training-v3';
 root.querySelectorAll(':scope > .tr3-frame').forEach(el=>el.remove());const shells=[...root.querySelectorAll(':scope > .tr2-shell')];shells.slice(1).forEach(el=>el.remove());
 const tabs=shell.querySelector('.tr2-tabs');if(tabs)reorderTabs(tabs);addAthleteLinks(shell);enhanceActiveSection(shell,tabs);
 try{window.AthleticsUI?.registerScreen?.('training',{status:'active',replacement:'training-v2 + training-v3-enhancements',critical:true})}catch(_){ }
}
function scheduleTraining'''
s,n=pat.subn(new,s,count=1)
if n!=1: raise SystemExit(f'Training patch failed {n}')
wr(p,s)

# Cutover selectors match restored/single-page authorities.
p='scripts/ui-cutover-v1.js';s=rd(p)
a="training:{selector:'.tr3-frame,[data-am-ui-screen=\"training-v3\"]',delay:1800}";b="training:{selector:'.tr2-shell,[data-am-ui-screen=\"training-v3\"]',delay:1800}"
if a not in s: raise SystemExit('Training cutover anchor missing')
s=s.replace(a,b,1)
a="scouting:{selector:'.scv3,[data-am-ui-screen=\"scouting-v3\"]',delay:1800}";b="scouting:{selector:'.scouting-v2-active,[data-am-ui-screen=\"scouting-v2\"]',delay:1800}"
if a not in s: raise SystemExit('Scouting cutover anchor missing')
s=s.replace(a,b,1);wr(p,s)
print('Playtest feedback fixes applied.')
