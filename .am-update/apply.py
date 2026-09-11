from pathlib import Path

ftx = Path('scripts/first-time-experience-v2.js')
text = ftx.read_text(encoding='utf-8')

insert = r'''function trainingDecisionSignature(){
 const rows=managed().filter(a=>!a.retired).map(a=>{
  const t=a?.trainingV2;if(!t||typeof t!=='object')return null;
  const plan={
   programme:t.programme??'',programmeLabel:t.programmeLabel??'',focus:t.focus??'',secondaryFocus:t.secondaryFocus??'',
   intensity:t.intensity??'',volume:t.volume??'',sessionsPerWeek:t.sessionsPerWeek??t.frequency??''
  };
  return [String(a.id),plan];
 }).filter(Boolean).sort((a,b)=>a[0].localeCompare(b[0]));
 return rows.length?JSON.stringify(rows):'';
}
function ensureTrainingDecisionBaseline(){
 const st=ensureState();if(!st)return'';
 const sig=trainingDecisionSignature();if(!sig)return'';
 const cw=careerWeek();
 if(n(st.trainingDecisionBaselineWeek)!==cw||!st.trainingDecisionBaseline){st.trainingDecisionBaselineWeek=cw;st.trainingDecisionBaseline=sig;saveSafe()}
 return st.trainingDecisionBaseline;
}
function detectTrainingDecision(source='training-state'){
 const st=ensureState();if(!st||!active()||currentPhase()!=='training'||st.steps.trainingDecision)return false;
 const baseline=ensureTrainingDecisionBaseline(),sig=trainingDecisionSignature();if(!baseline||!sig||baseline===sig)return false;
 markStep('trainingDecision');log('training_decision_detected',{source});toastSafe('Training decision recorded');return true;
}
function queueTrainingDecisionDetection(source){
 setTimeout(()=>detectTrainingDecision(source),0);
 setTimeout(()=>detectTrainingDecision(`${source}-settled`),120);
}
'''
needle = 'function currentPhase(){'
if needle not in text:
    raise SystemExit('currentPhase anchor not found')
text = text.replace(needle, insert + needle, 1)

old = "markSeen('training');const rec=trainingRecommendation();"
new = "markSeen('training');ensureTrainingDecisionBaseline();const rec=trainingRecommendation();"
if old not in text:
    raise SystemExit('decorateTraining anchor not found')
text = text.replace(old, new, 1)

old = "if(b.dataset.ftxRoute){routeTo(b.dataset.ftxRoute);return}"
new = "if(b.dataset.ftxRoute){if(b.dataset.ftxRoute==='training')ensureTrainingDecisionBaseline();routeTo(b.dataset.ftxRoute);return}"
if old not in text:
    raise SystemExit('route click anchor not found')
text = text.replace(old, new, 1)

old = "if(active()&&typeof currentView!=='undefined'&&currentView==='training'&&b.matches('[data-focus]')){setTimeout(()=>markStep('trainingDecision'),0)}"
new = "if(active()&&currentPhase()==='training'&&$('training')?.contains(b))queueTrainingDecisionDetection('training-click')"
if old not in text:
    raise SystemExit('legacy training click completion anchor not found')
text = text.replace(old, new, 1)

old = "if(currentPhase()==='training'&&typeof currentView!=='undefined'&&currentView==='training'&&$('training')?.contains(el)&&!ensureState().steps.trainingDecision)markStep('trainingDecision')"
new = "if(currentPhase()==='training'&&$('training')?.contains(el)&&!ensureState().steps.trainingDecision)queueTrainingDecisionDetection('training-change')"
if old not in text:
    raise SystemExit('training change completion anchor not found')
text = text.replace(old, new, 1)

ftx.write_text(text, encoding='utf-8')

html = Path('game.html')
h = html.read_text(encoding='utf-8')
oldv = 'scripts/first-time-experience-v2.js?v=20260911-ftx25-athlete-management'
newv = 'scripts/first-time-experience-v2.js?v=20260911-ftx26-training-progression'
if oldv not in h:
    raise SystemExit('FTX cache key anchor not found')
h = h.replace(oldv, newv, 1)
html.write_text(h, encoding='utf-8')

print('Applied Training onboarding progression fix')
