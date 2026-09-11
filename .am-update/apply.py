from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing patch marker: {label}')
    return text.replace(old, new, 1)

ftx_path = Path('scripts/first-time-experience-v2.js')
ftx = ftx_path.read_text(encoding='utf-8')

ftx = replace_once(
    ftx,
    "const VERSION='2.0.0';",
    "const VERSION='2.0.1';",
    'FTUE version',
)

old_phase = "if(phase==='scouting')return{eyebrow:'WEEK 3 • SCOUTING',title:'Give the scout one clear assignment',body:`${scout.name}: “Tell me where to look first. I will report back when there is somebody worth your attention.”`,action:'OPEN SCOUTING',route:'scouting',required:true};"
new_phase = "if(phase==='scouting')return{eyebrow:'WEEK 3 • SCOUTING',title:'Set your first scouting assignment',body:`${scout.name}: “Open Scouting and use any one of the five assignment slots. Choose where you want me to look and confirm the brief.”`,action:'OPEN SCOUTING',route:'scouting',required:true};"
ftx = replace_once(ftx, old_phase, new_phase, 'Week 3 scouting copy')

ftx = replace_once(
    ftx,
    "send('ftx-week3-scout',headScout().name,'Scouting: choose our first focus','The senior squad is only part of the national programme. Give me one area to focus on and I will report back when there is somebody worth your attention.','scouting',null,`<div class=\"mail-section\"><h3>Choose our first scouting focus</h3><p>The senior squad is only part of the programme. Give me one area to focus on; I will report back when somebody is worth your attention.</p><button class=\"btn primary\" data-ftx-route=\"scouting\">OPEN SCOUTING</button></div>`)",
    "send('ftx-week3-scout',headScout().name,'Scouting: set your first assignment','The senior squad is only part of the national programme. Open Scouting, use one of the five assignment slots and choose where you want the network to look.','scouting',null,`<div class=\"mail-section\"><h3>Set your first scouting assignment</h3><p>Open Scouting, use any one of the five assignment slots and choose where you want the network to look. Confirming that brief completes this step.</p><button class=\"btn primary\" data-ftx-route=\"scouting\">OPEN SCOUTING</button></div>`)",
    'Week 3 scouting email',
)

old_decorate = "function decorateScouting(){if(!active()||careerWeek()<3||ensureState().steps.scoutAssignment)return;const root=$('scouting');if(!root)return;markSeen('scouting');root.querySelectorAll('.ftx-scout-card').forEach(el=>el.remove())}"
new_decorate = r"""let scoutingV2Baseline=null;
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
function armScoutingV2Assignment(){
 if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
 if(scoutingV2Baseline===null)scoutingV2Baseline=scoutingV2Signature();
}
function maybeCompleteScoutingV2Assignment(target,source='scouting-v2'){
 if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
 const root=$('scouting');if(!root||!target||!root.contains(target))return;
 const before=scoutingV2Baseline===null?scoutingV2Signature():scoutingV2Baseline;
 setTimeout(()=>{
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
}"""
ftx = replace_once(ftx, old_decorate, new_decorate, 'Scouting V2 FTUE bridge helpers')

ftx = replace_once(
    ftx,
    "function routeTo(target){\n",
    "function routeTo(target){\n if(target==='scouting'){try{window.AMScoutingV2?.refreshScoutingIntegration?.()}catch(_){ }if(typeof view==='function')view('scouting');setTimeout(()=>{armScoutingV2Assignment();focusScoutingV2Assignment()},180);setTimeout(focusScoutingV2Assignment,650);return}\n",
    'Scouting V2 FTUE route',
)

old_click = "document.addEventListener('click',event=>{if(!active()||currentPhase()!=='scouting')return;const btn=event.target.closest?.('#scouting button');if(btn&&/assign|start|confirm|save|focus|scout/i.test(String(btn.textContent||'')))setTimeout(()=>markStep('scoutAssignment'),60)});"
new_click = "document.addEventListener('click',event=>{if(!active()||currentPhase()!=='scouting')return;const target=event.target.closest?.('#scouting button,#scouting [role=\"button\"],#scouting label');if(target)maybeCompleteScoutingV2Assignment(target,'scouting-v2-click')});"
ftx = replace_once(ftx, old_click, new_click, 'Scouting V2 click completion')

old_change = "document.addEventListener('change',event=>{if(!active())return;const el=event.target;if(el?.id==='scoutFocus'&&!ensureState().steps.scoutAssignment){markStep('scoutAssignment');toastSafe('Scouting assignment started')}if(typeof currentView!=='undefined'&&currentView==='training'&&el?.dataset?.focus&&!ensureState().steps.trainingDecision)markStep('trainingDecision')});"
new_change = "document.addEventListener('change',event=>{if(!active())return;const el=event.target;if(currentPhase()==='scouting'&&$('scouting')?.contains(el))maybeCompleteScoutingV2Assignment(el,'scouting-v2-change');if(typeof currentView!=='undefined'&&currentView==='training'&&el?.dataset?.focus&&!ensureState().steps.trainingDecision)markStep('trainingDecision')});"
ftx = replace_once(ftx, old_change, new_change, 'Scouting V2 change completion')

ftx_path.write_text(ftx, encoding='utf-8')

html_path = Path('game.html')
html = html_path.read_text(encoding='utf-8')
html = replace_once(
    html,
    'scripts/first-time-experience-v2.js?v=20260911-ftx21',
    'scripts/first-time-experience-v2.js?v=20260911-ftx22',
    'FTUE cache bust',
)
html_path.write_text(html, encoding='utf-8')

reg_path = Path('tools/static-regression.mjs')
reg = reg_path.read_text(encoding='utf-8')
reg = replace_once(
    reg,
    "  ['function weekMessages()','Staff-led opening-month messages are missing'],",
    "  ['function weekMessages()','Staff-led opening-month messages are missing'],\n  ['function scoutingV2Signature()','FTUE must observe authoritative Scouting V2 assignment state'],\n  ['function maybeCompleteScoutingV2Assignment','FTUE must complete Week 3 from a real Scouting V2 assignment'],\n  ['window.AMScoutingV2?.refreshScoutingIntegration?.()','FTUE Scouting routing must target the production Scouting V2 integration'],",
    'FTUE Scouting V2 regression contracts',
)
reg_path.write_text(reg, encoding='utf-8')

print('Patched FTUE V2.0.1 to use the production Scouting V2 assignment workflow.')
