from pathlib import Path
import re

ROOT = Path('.')

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def replace_exact(path, old, new, count=1):
    text = read(path)
    found = text.count(old)
    if found < count:
        raise SystemExit(f'{path}: expected at least {count} occurrence(s), found {found}: {old[:120]!r}')
    text = text.replace(old, new, count)
    write(path, text)

# 1) Keep the top-left brand to one identity: the AM mark, with nation context only.
replace_exact(
    'game.html',
    '<aside class="rail"><div class="rail-brand"><small id="railNation">National Programme</small><strong>ATHLETICS<br>MANAGER</strong></div><nav',
    '<aside class="rail"><div class="rail-brand rail-brand-single"><strong class="rail-brand-mark" aria-label="Athletics Manager">AM</strong><small id="railNation">National Programme</small></div><nav'
)

# Restore the proven V2 training/scouting runtimes explicitly, while keeping V3 as non-duplicating compatibility/enhancement layers.
replace_exact(
    'game.html',
    '<script src="scripts/training-v3.js?v=20260910-training3"></script>\n<script src="scripts/scouting-v3.js?v=20260910-scouting3"></script>',
    '<script src="scripts/training-v2-bootstrap.js?v=20260911-training2restore"></script>\n<script src="scripts/scouting-v2-bootstrap.js?v=20260911-scouting2restore"></script>\n<script src="scripts/training-v3.js?v=20260911-training31"></script>\n<script src="scripts/scouting-v3.js?v=20260911-scouting3compat"></script>'
)
for old, new in [
    ('styles/ui-platform-v1.css?v=20260911-cutover1','styles/ui-platform-v1.css?v=20260911-playtest1'),
    ('scripts/manager-profile-sidebar-v1.js?v=20260911-manager-sidebar1','scripts/manager-profile-sidebar-v1.js?v=20260911-manager-sidebar2'),
    ('scripts/first-time-experience-v2.js?v=20260911-ftx2','scripts/first-time-experience-v2.js?v=20260911-ftx21'),
    ('scripts/ui-cutover-v1.js?v=20260911-cutover1','scripts/ui-cutover-v1.js?v=20260911-cutover2')
]:
    replace_exact('game.html', old, new)

# 2) Sidebar brand styling: logo OR wordmark, never both.
css = read('styles/ui-platform-v1.css')
marker = '/* Playtest feedback — single rail identity */'
if marker not in css:
    css += '''\n\n/* Playtest feedback — single rail identity */\nbody.am-ui-platform .rail-brand.rail-brand-single{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;align-items:center;padding:8px 10px 14px}\nbody.am-ui-platform .rail-brand.rail-brand-single .rail-brand-mark{display:grid;place-items:center;width:44px;height:44px;margin:0;border-radius:10px;background:linear-gradient(135deg,#edf5f8 0 72%,#ef4057 72% 100%);color:#07131d;font-size:14px;font-weight:1000;letter-spacing:-.06em;line-height:1;box-shadow:0 8px 22px rgba(0,0,0,.22)}\nbody.am-ui-platform .rail-brand.rail-brand-single #railNation{min-width:0;margin:0;color:var(--am-muted);font-size:8px;line-height:1.35;letter-spacing:.12em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n'''
    write('styles/ui-platform-v1.css', css)

# 3) My Profile remains usable with the sidebar and now owns the highlighted nav state while open.
write('scripts/manager-profile-sidebar-v1.js', r'''/* Athletics Manager — My Profile sidebar interaction */
(function(){
'use strict';
if(window.__amManagerProfileSidebarV1)return;window.__amManagerProfileSidebarV1=1;

const dialog=document.getElementById('managementProfile');
if(!dialog)return;
const desktop=document.getElementById('myProfileShortcut');
const mobile=document.getElementById('mobileMyProfile');

function currentRoute(){try{return typeof currentView==='string'?currentView:'home'}catch(_){return'home'}}
function syncProfileNav(open=dialog.open){
 const route=currentRoute();
 document.querySelectorAll('.rail-nav [data-view]').forEach(button=>{
  const on=!open&&button.dataset.view===route;
  button.classList.toggle('on',on);
  if(on)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 });
 if(desktop){desktop.classList.toggle('on',!!open);if(open)desktop.setAttribute('aria-current','page');else desktop.removeAttribute('aria-current')}
 if(mobile){mobile.classList.toggle('on',!!open);if(open)mobile.setAttribute('aria-current','page');else mobile.removeAttribute('aria-current')}
}

const nativeShow=window.HTMLDialogElement?.prototype?.show;
if(typeof nativeShow==='function'){
 dialog.showModal=function(){
  if(!this.open)nativeShow.call(this);
  syncProfileNav(true);
 };
}

function closeProfileForNavigation(target){
 if(!dialog.open)return;
 if(target?.closest?.('#myProfileShortcut,#mobileMyProfile,[data-manager-tab],[data-manager-athlete],[data-manager-season],[data-manager-scope],[data-manager-timeline],[data-manager-save-name],[data-manager-close]'))return;
 if(target?.closest?.('.rail-nav [data-view],.bottom-nav [data-view],[data-mobile-view],#menuBtn,#mobileMainMenu')){
  dialog.close();syncProfileNav(false);
 }
}

dialog.addEventListener('close',()=>syncProfileNav(false));
document.addEventListener('click',event=>closeProfileForNavigation(event.target),true);

window.__athleticsManagerProfileSidebarV1={version:1.1,dialog,sync:syncProfileNav,close:()=>{if(dialog.open)dialog.close();syncProfileNav(false)}};
})();
''')

# 4) First-time athlete guidance: concrete action and guaranteed clean-up when the step is complete.
ftx = read('scripts/first-time-experience-v2.js')
ftx = ftx.replace("const VERSION='2.0.0';", "const VERSION='2.0.1';", 1)
old = "if(phase==='athlete')return{eyebrow:'WEEK 1 • YOUR SQUAD',title:`Take a closer look at ${starAthlete()?.name||'one athlete'}`,body:'Open one athlete profile. Focus on event, ability, form and fitness — the rest can wait.',action:'VIEW ATHLETE',athlete:starAthlete()?.id,required:true};"
new = "if(phase==='athlete')return{eyebrow:'WEEK 1 • YOUR SQUAD',title:`Take a closer look at ${starAthlete()?.name||'one athlete'}`,body:`Open ${starAthlete()?.name||'the athlete'}'s profile, check Event, Form and Fitness, then close the profile to return to Squad. That completes this step.`,action:'VIEW ATHLETE',athlete:starAthlete()?.id,required:true};"
if old not in ftx: raise SystemExit('FTUX athlete phase copy not found')
ftx = ftx.replace(old, new, 1)

pattern = re.compile(r"function decorateSquad\(\)\{.*?\n\}\nfunction decorateTraining\(\)\{", re.S)
replacement = r'''function clearSquadGuidance(root=$('squad')){
 if(!root)return;
 root.querySelectorAll('.ftx-mentor').forEach(el=>el.remove());
 root.querySelectorAll('.ftx-spotlight').forEach(el=>el.classList.remove('ftx-spotlight'));
}
function decorateSquad(){
 const root=$('squad');if(!root)return;
 const phase=currentPhase();
 if(!active()||!['squad','athlete'].includes(phase)){clearSquadGuidance(root);return}
 markSeen('squad');
 if(!ensureState().steps.squadReviewed)markStep('squadReviewed');
 const star=starAthlete();if(!star){clearSquadGuidance(root);return}
 clearSquadGuidance(root);
 if(currentPhase()!=='athlete')return;
 root.insertAdjacentHTML('afterbegin',`<section class="ftx-mentor"><div><small>${esc(headCoach().name.toUpperCase())} • HEAD COACH</small><strong>Start with ${esc(star.name)}</strong><p>Open ${esc(star.name)} and check three things: Event, Form and Fitness. Then close the profile and return here — that completes the task.</p></div><button class="am-button primary" data-ftx-athlete="${esc(star.id)}">VIEW ATHLETE</button></section>`);
 const row=root.querySelector(`[data-ath="${CSS.escape(String(star.id))}"]`)||root.querySelector(`[data-profile="${CSS.escape(String(star.id))}"]`)?.closest('tr,article,button');
 row?.classList.add('ftx-spotlight');
}
function decorateTraining(){'''
ftx2, nsub = pattern.subn(replacement, ftx, count=1)
if nsub != 1: raise SystemExit(f'FTUX decorateSquad replacement failed: {nsub}')
ftx = ftx2

# Do not redesign or cover the actual scouting screen during onboarding. Guidance lives in Home/Inbox.
pattern = re.compile(r"function decorateScouting\(\)\{.*?\n\}\nfunction competitionWhyHTML", re.S)
replacement = r'''function decorateScouting(){
 if(!active()||careerWeek()<3||ensureState().steps.scoutAssignment)return;
 const root=$('scouting');if(!root)return;markSeen('scouting');
 root.querySelectorAll('.ftx-scout-card').forEach(el=>el.remove());
}
function competitionWhyHTML'''
ftx2, nsub = pattern.subn(replacement, ftx, count=1)
if nsub != 1: raise SystemExit(f'FTUX decorateScouting replacement failed: {nsub}')
ftx = ftx2

# Make the guided athlete button complete the intended observation step reliably even if another profile wrapper changes later.
old = "if(b.dataset.ftxAthlete){if(typeof openAthleteProfile==='function')openAthleteProfile(b.dataset.ftxAthlete);return}"
new = "if(b.dataset.ftxAthlete){if(active()&&currentPhase()==='athlete')markStep('athleteOpened');if(typeof openAthleteProfile==='function')openAthleteProfile(b.dataset.ftxAthlete);return}"
if old not in ftx: raise SystemExit('FTUX guided athlete click hook not found')
ftx = ftx.replace(old, new, 1)

# Actual Scouting V2 interactions complete the Week 3 learning step; no replacement UI is injected.
needle = "document.addEventListener('click',handleClick,true);\n"
insert = "document.addEventListener('click',handleClick,true);\ndocument.addEventListener('click',event=>{if(!active()||currentPhase()!=='scouting')return;const b=event.target.closest?.('#scouting button');if(!b)return;if(/assign|start|confirm|save|focus|scout/i.test(String(b.textContent||'')))setTimeout(()=>markStep('scoutAssignment'),60)},true);\ndocument.addEventListener('change',event=>{if(active()&&currentPhase()==='scouting'&&event.target.closest?.('#scouting')&&event.target.matches('select'))setTimeout(()=>markStep('scoutAssignment'),60)},true);\n"
if needle not in ftx: raise SystemExit('FTUX click listener anchor not found')
ftx = ftx.replace(needle, insert, 1)

# When the athlete profile closes, immediately clear any stale squad spotlight/mentor and redraw the next agenda state.
needle = "window.addEventListener('pageshow',scheduleDecorate);window.addEventListener('orientationchange',scheduleDecorate);\n  scheduleDecorate();"
insert = "const athleteDialog=$('athleteProfile');if(athleteDialog&&!athleteDialog.dataset.ftxCloseBound){athleteDialog.dataset.ftxCloseBound='1';athleteDialog.addEventListener('close',()=>{clearSquadGuidance();scheduleDecorate()})}\n  window.addEventListener('pageshow',scheduleDecorate);window.addEventListener('orientationchange',scheduleDecorate);\n  scheduleDecorate();"
if needle not in ftx: raise SystemExit('FTUX init listener anchor not found')
ftx = ftx.replace(needle, insert, 1)
write('scripts/first-time-experience-v2.js', ftx)

# 5) Revert Scouting presentation to the retained V2 system (the multi-assignment screen).
scout_boot = read('scripts/scouting-v2-bootstrap.js')
old = "  /* V3 is presentation-only and intentionally installs after the proven V2 gameplay runtime.\n     If V3 is unavailable or errors, V2 remains the fallback renderer. */\n  if(typeof window.__athleticsScoutingV3?.install==='function')window.__athleticsScoutingV3.install();\n  if(typeof render==='function')render();"
new = "  const root=document.getElementById('scouting');if(root){root.classList.add('scouting-v2-active');root.dataset.amUiScreen='scouting-v2'}\n  try{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){ }\n  if(typeof render==='function')render();"
if old not in scout_boot: raise SystemExit('Scouting V2 bootstrap handoff block not found')
scout_boot = scout_boot.replace(old, new, 1)
write('scripts/scouting-v2-bootstrap.js', scout_boot)

scout3 = read('scripts/scouting-v3.js')
old = "window.__athleticsScoutingV3={version:3,install,render,state:ui,debug,legacy:()=>fallbackDraw};\ninstall();\n/* Scouting V2 is loaded asynchronously by Training V2. Re-check briefly so V3 remains the final renderer even if that runtime arrives after this file. */\nlet checks=0;const timer=setInterval(()=>{checks++;if(typeof drawScouting==='function'&&drawScouting!==drawScoutingV3)install();if(checks>=40||window.AMScoutingV2&&drawScouting===drawScoutingV3)clearInterval(timer)},250);\nconst dialog=$('athleteProfile');if(dialog)dialog.addEventListener('close',()=>{try{if(currentView==='scouting')requestAnimationFrame(drawScoutingV3)}catch(_){}},true);"
new = "window.__athleticsScoutingV3={version:3,install,render,state:ui,debug,legacy:()=>fallbackDraw,compatibilityOnly:true};\n/* Playtest feedback: the retained Scouting V2 multi-assignment interface is again the presentation authority. V3 stays loaded only for compatibility/debugging and must not replace drawScouting. */\ntry{window.AthleticsUI?.registerScreen?.('scouting',{status:'active',replacement:'scouting-v2'})}catch(_){ }"
if old not in scout3: raise SystemExit('Scouting V3 takeover block not found')
scout3 = scout3.replace(old, new, 1)
write('scripts/scouting-v3.js', scout3)

# 6) Training: one page only. Keep V2 gameplay/UI and V3 non-duplicating enhancements; remove the extra V3 command frame.
training = read('scripts/training-v3.js')
pattern = re.compile(r"function enhanceTraining\(\)\{.*?\n\}\nfunction scheduleTraining", re.S)
replacement = r'''function enhanceTraining(){
 trainingQueued=false;const root=byId('training');if(!root)return;const shell=root.querySelector('.tr2-shell');
 /* Training V2 is the single visible page. V3 now enhances that shell instead of stacking a second page above it. */
 if(!shell)return;
 root.classList.add('training-v3');root.dataset.amUiScreen='training-v3';shell.classList.add('tr3-authoritative');shell.dataset.amUiScreen='training-v3';
 root.querySelectorAll(':scope > .tr3-frame').forEach(el=>el.remove());
 const duplicates=[...root.querySelectorAll(':scope > .tr2-shell')];duplicates.slice(1).forEach(el=>el.remove());
 const tabs=shell.querySelector('.tr2-tabs');if(tabs)reorderTabs(tabs);
 addAthleteLinks(shell);enhanceActiveSection(shell,tabs);
 try{window.AthleticsUI?.registerScreen?.('training',{status:'active',replacement:'training-v2 + training-v3-enhancements',critical:true})}catch(_){ }
}
function scheduleTraining'''
training2, nsub = pattern.subn(replacement, training, count=1)
if nsub != 1: raise SystemExit(f'Training enhanceTraining replacement failed: {nsub}')
write('scripts/training-v3.js', training2)

# 7) Production cutover follows the now-authoritative single training shell and restored scouting V2 shell.
cut = read('scripts/ui-cutover-v1.js')
if "training:{selector:'.tr3-frame,[data-am-ui-screen=\"training-v3\"]',delay:1800}" not in cut:
    raise SystemExit('Training cutover selector not found')
cut = cut.replace("training:{selector:'.tr3-frame,[data-am-ui-screen=\"training-v3\"]',delay:1800}", "training:{selector:'.tr2-shell,[data-am-ui-screen=\"training-v3\"]',delay:1800}", 1)
if "scouting:{selector:'.scv3,[data-am-ui-screen=\"scouting-v3\"]',delay:1800}" not in cut:
    raise SystemExit('Scouting cutover selector not found')
cut = cut.replace("scouting:{selector:'.scv3,[data-am-ui-screen=\"scouting-v3\"]',delay:1800}", "scouting:{selector:'.scouting-v2-active,[data-am-ui-screen=\"scouting-v2\"]',delay:1800}", 1)
write('scripts/ui-cutover-v1.js', cut)

print('Applied playtest feedback patch: branding, FTUX athlete task, Scouting V2 restore, My Profile nav state, Training single-page consolidation.')
