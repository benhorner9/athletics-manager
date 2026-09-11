from pathlib import Path

ftx_path = Path('scripts/first-time-experience-v2.js')
text = ftx_path.read_text(encoding='utf-8')

old = """function trainingRecommendation(){\n const star=starAthlete(),avg=managed().length?managed().reduce((t,a)=>t+n(a.fatigue),0)/managed().length:0;\n if(avg>=52||n(star?.fatigue)>=65)return{focus:'Recovery',athlete:star,reason:'The squad is carrying enough fatigue that freshness matters more than extra load this week.'};\n const d=String(star?.disc||'');\n if(/100|200|400/.test(d))return{focus:'Speed',athlete:star,reason:`${star?.name||'Your leading sprinter'} is ready for a sharper speed-focused week.`};\n if(/SP|DT|HT|JT/.test(d))return{focus:'Strength',athlete:star,reason:`${star?.name||'Your leading thrower'} would benefit from a power-focused block.`};\n if(/HJ|LJ|TJ|PV/.test(d))return{focus:'Technique',athlete:star,reason:`${star?.name||'Your leading jumper'} can use a technical emphasis before the competitive block.`};\n return{focus:'Balanced',athlete:star,reason:'A balanced week is the safest starting point while the staff build more evidence.'};\n}\n"""
new = """function trainingRecommendation(){\n const star=starAthlete(),team=managed(),avg=team.length?team.reduce((t,a)=>t+n(a.fatigue),0)/team.length:0;\n if(avg>=52||n(star?.fatigue)>=65)return{athlete:star,reason:`${star?.name||'One athlete'} is a useful first check because current fatigue makes load management worth reviewing.`};\n return{athlete:star,reason:`Start with ${star?.name||'one athlete'} and review the current programme, intensity and load before deciding whether anything actually needs to change.`};\n}\n"""
if old not in text:
    raise SystemExit('trainingRecommendation source block not found')
text = text.replace(old, new, 1)

old = """ if(phase==='training')return{eyebrow:'WEEK 2 • TRAINING',title:'Make one training decision',body:`${coach.name}: “${rec.reason} I recommend ${rec.focus}.” Training continues automatically after this.`,action:'REVIEW TRAINING',route:'training',required:true};\n"""
new = """ if(phase==='training')return{eyebrow:'WEEK 2 • TRAINING',title:'Review one athlete’s training',body:`${coach.name}: “${rec.reason}” Open Training and make one deliberate call: keep the current plan, or adjust it if the evidence gives you a reason.`,action:'REVIEW TRAINING',route:'training',required:true};\n"""
if old not in text:
    raise SystemExit('training phase copy not found')
text = text.replace(old, new, 1)

old = """function decorateTraining(){\n if(!active()||careerWeek()<2||ensureState().steps.trainingDecision)return;\n const root=$('training');if(!root)return;markSeen('training');const rec=trainingRecommendation();\n if(root.querySelector('.ftx-training-card'))return;\n root.insertAdjacentHTML('afterbegin',`<section class=\"ftx-mentor ftx-training-card\"><div><small>${esc(headCoach().name.toUpperCase())} • COACH RECOMMENDATION</small><strong>${esc(rec.athlete?.name||'The squad')} — ${esc(rec.focus)}</strong><p>${esc(rec.reason)} You can change training later; this is not a permanent decision.</p></div><div class=\"ftx-inline-actions\"><button class=\"am-button primary\" data-ftx-accept-training=\"${esc(rec.focus)}\">ACCEPT RECOMMENDATION</button><button class=\"am-button ghost\" data-ftx-choose-training>CHOOSE MYSELF</button></div></section>`);\n}\n"""
new = """function decorateTraining(){\n const root=$('training');if(!root)return;\n if(!active()||careerWeek()<2||ensureState().steps.trainingDecision){root.querySelector('.ftx-training-card')?.remove();return}\n markSeen('training');const rec=trainingRecommendation();\n if(root.querySelector('.ftx-training-card'))return;\n root.insertAdjacentHTML('afterbegin',`<section class=\"ftx-mentor ftx-training-card\"><div><small>${esc(headCoach().name.toUpperCase())} • TRAINING REVIEW</small><strong>${esc(rec.athlete?.name||'One athlete')} — review the current plan</strong><p>${esc(rec.reason)} Keeping a suitable plan is a valid decision; you do not need to change something just to complete this step.</p></div><div class=\"ftx-inline-actions\"><button class=\"am-button primary\" data-ftx-keep-training>KEEP CURRENT PLAN</button><button class=\"am-button ghost\" data-ftx-choose-training>REVIEW ATHLETE TRAINING</button></div></section>`);\n}\n"""
if old not in text:
    raise SystemExit('decorateTraining source block not found')
text = text.replace(old, new, 1)

old = """ if(b.dataset.ftxAcceptTraining){s.trainingFocus=b.dataset.ftxAcceptTraining;markStep('trainingDecision');saveSafe();toastSafe(`Training focus: ${s.trainingFocus}`);try{if(typeof drawTraining==='function')drawTraining()}catch(_){ }scheduleDecorate();return}\n if(b.hasAttribute('data-ftx-choose-training')){rootFocus('[data-focus]');return}\n"""
new = """ if(b.hasAttribute('data-ftx-keep-training')){markStep('trainingDecision');saveSafe();toastSafe('Training reviewed — current plan kept');try{if(typeof drawTraining==='function')drawTraining()}catch(_){ }scheduleDecorate();return}\n if(b.hasAttribute('data-ftx-choose-training')){const rec=trainingRecommendation(),name=String(rec.athlete?.name||''),buttons=[...document.querySelectorAll('#training [data-tr2-edit]')],edit=buttons.find(x=>String(x.dataset.tr2Edit||'')===name)||buttons[0];if(edit){edit.click();return}rootFocus('#training select,#training button');return}\n"""
if old not in text:
    raise SystemExit('training click handler source block not found')
text = text.replace(old, new, 1)

old = """  document.addEventListener('change',event=>{if(!active())return;const el=event.target;if(currentPhase()==='scouting'&&$('scouting')?.contains(el))maybeCompleteScoutingV2Assignment(el,'scouting-v2-change');if(typeof currentView!=='undefined'&&currentView==='training'&&el?.dataset?.focus&&!ensureState().steps.trainingDecision)markStep('trainingDecision')});\n"""
new = """  document.addEventListener('change',event=>{if(!active())return;const el=event.target;if(currentPhase()==='scouting'&&$('scouting')?.contains(el))maybeCompleteScoutingV2Assignment(el,'scouting-v2-change');if(currentPhase()==='training'&&typeof currentView!=='undefined'&&currentView==='training'&&$('training')?.contains(el)&&!ensureState().steps.trainingDecision)markStep('trainingDecision')});\n"""
if old not in text:
    raise SystemExit('training change listener source block not found')
text = text.replace(old, new, 1)

ftx_path.write_text(text, encoding='utf-8')

html_path = Path('game.html')
html = html_path.read_text(encoding='utf-8')
old_html = 'scripts/first-time-experience-v2.js?v=20260911-ftx23'
new_html = 'scripts/first-time-experience-v2.js?v=20260911-ftx24-training'
if old_html not in html:
    raise SystemExit('first-time experience cache key not found')
html_path.write_text(html.replace(old_html, new_html, 1), encoding='utf-8')

print('Updated Week 2 onboarding to use the current Training workflow.')
