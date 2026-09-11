from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'scripts/first-time-experience-v2.js',
    "const VERSION='2.0.2';",
    "const VERSION='2.0.3';"
)

old_block = r'''function clearSquadGuidance(root=$('squad')){if(!root)return;root.querySelectorAll('.ftx-mentor').forEach(el=>el.remove());root.querySelectorAll('.ftx-spotlight').forEach(el=>el.classList.remove('ftx-spotlight'))}
function decorateSquad(){
 const root=$('squad');if(!root)return;const phase=currentPhase();
 if(!active()||!['squad','athlete'].includes(phase)){clearSquadGuidance(root);return}
 markSeen('squad');if(!ensureState().steps.squadReviewed)markStep('squadReviewed');
 const star=starAthlete();if(!star){clearSquadGuidance(root);return}clearSquadGuidance(root);if(currentPhase()!=='athlete')return;
 root.insertAdjacentHTML('afterbegin',`<section class="ftx-mentor"><div><small>${esc(headCoach().name.toUpperCase())} • HEAD COACH</small><strong>Start with ${esc(star.name)}</strong><p>Open ${esc(star.name)} and check three things: Event, Form and Fitness. Then close the profile and return here — that completes the task.</p></div><button class="am-button primary" data-ftx-athlete="${esc(star.id)}">VIEW ATHLETE</button></section>`);
 const row=root.querySelector(`[data-ath="${CSS.escape(String(star.id))}"]`)||root.querySelector(`[data-profile="${CSS.escape(String(star.id))}"]`)?.closest('tr,article,button');row?.classList.add('ftx-spotlight');
}'''

new_block = r'''function athleteManagementRoot(){const cv=typeof currentView!=='undefined'?currentView:'squad';return $(cv==='pool'?'pool':'squad')}
function clearSquadGuidance(root=null){
 const roots=root?[root]:[$('squad'),$('pool')].filter(Boolean);
 roots.forEach(r=>{r.querySelectorAll('.ftx-mentor').forEach(el=>el.remove());r.querySelectorAll('.ftx-spotlight').forEach(el=>el.classList.remove('ftx-spotlight'))});
}
function athleteManagementMentorHTML(star){return `<section class="ftx-mentor ftx-athlete-management-mentor"><div><small>${esc(headCoach().name.toUpperCase())} • HEAD COACH</small><strong>Start with ${esc(star.name)}</strong><p>Open ${esc(star.name)} and check three things: Event, Form and Fitness. Then close the profile and return here — that completes the task.</p></div><button class="am-button primary" data-ftx-athlete="${esc(star.id)}">VIEW ATHLETE</button></section>`}
function decorateSquad(){
 const root=athleteManagementRoot();if(!root)return;const phase=currentPhase(),cv=typeof currentView!=='undefined'?currentView:'squad';
 if(!active()||!['squad','athlete'].includes(phase)){clearSquadGuidance();return}
 if(cv==='squad'){markSeen('squad');if(!ensureState().steps.squadReviewed)markStep('squadReviewed')}
 const star=starAthlete();if(!star){clearSquadGuidance();return}clearSquadGuidance();
 if(currentPhase()==='squad'){
  root.insertAdjacentHTML('afterbegin',`<section class="ftx-mentor ftx-athlete-management-mentor"><div><small>${esc(headCoach().name.toUpperCase())} • HEAD COACH</small><strong>Meet your national squad</strong><p>Your first task is in National Squad. Open the squad and take a closer look at one of the athletes you have inherited.</p></div><button class="am-button primary" data-ftx-route="squad">MEET THE SQUAD</button></section>`);
  return;
 }
 if(currentPhase()!=='athlete')return;
 root.insertAdjacentHTML('afterbegin',athleteManagementMentorHTML(star));
 const row=root.querySelector(`[data-ath="${CSS.escape(String(star.id))}"]`)||root.querySelector(`[data-profile="${CSS.escape(String(star.id))}"]`)?.closest('tr,article,button');row?.classList.add('ftx-spotlight');
}'''

replace_once('scripts/first-time-experience-v2.js', old_block, new_block)

replace_once(
    'scripts/first-time-experience-v2.js',
    "else if(cv==='squad')decorateSquad();",
    "else if(cv==='squad'||cv==='pool')decorateSquad();"
)

replace_once(
    'game.html',
    'scripts/first-time-experience-v2.js?v=20260911-ftx24-training',
    'scripts/first-time-experience-v2.js?v=20260911-ftx25-athlete-management'
)

js = Path('scripts/first-time-experience-v2.js').read_text(encoding='utf-8')
assert "cv==='squad'||cv==='pool'" in js
assert "ftx-athlete-management-mentor" in js
assert "const VERSION='2.0.3';" in js
