from pathlib import Path

ft=Path('scripts/first-time-experience-v2.js')
text=ft.read_text(encoding='utf-8')
text=text.replace("const VERSION='2.0.1';","const VERSION='2.0.2';",1)
needle="""function scoutingV2Signature(){
 let primary=null;
 try{primary=typeof scoutingState==='function'?scoutingState():(s?.scouting||null)}catch(_){primary=s?.scouting||null}
 try{return JSON.stringify(scoutingV2Comparable({scouting:primary,scoutingV2:s?.scoutingV2||null,assignments:s?.scoutAssignments||null,scoutingAssignments:s?.scoutingAssignments||null}))}catch(_){return''}
}
"""
insert=needle+"""function scoutingV2HasAssignment(){
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
"""
if needle not in text: raise SystemExit('Scouting signature insertion point not found')
text=text.replace(needle,insert,1)
text=text.replace("""function armScoutingV2Assignment(){
 if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
 if(scoutingV2Baseline===null)scoutingV2Baseline=scoutingV2Signature();
}
""","""function armScoutingV2Assignment(){
 if(syncScoutingV2Assignment('scouting-v2-existing'))return;
 if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
 if(scoutingV2Baseline===null)scoutingV2Baseline=scoutingV2Signature();
}
""",1)
text=text.replace(""" setTimeout(()=>{
  if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
  const after=scoutingV2Signature();
""",""" setTimeout(()=>{
  if(syncScoutingV2Assignment(source))return;
  if(!active()||currentPhase()!=='scouting'||ensureState().steps.scoutAssignment)return;
  const after=scoutingV2Signature();
""",1)
text=text.replace("""function decorateCurrent(){
 try{
  const st=ensureState();if(!st)return;
  if(active()){ensureOpeningSchedule();retireLegacyOpeningTasks();weekMessages()}
""","""function decorateCurrent(){
 try{
  const st=ensureState();if(!st)return;
  if(active()){ensureOpeningSchedule();retireLegacyOpeningTasks();weekMessages();syncScoutingV2Assignment('scouting-v2-saved-state')}
""",1)
ft.write_text(text,encoding='utf-8')

smoke=Path('tools/runtime-smoke.mjs')
s=smoke.read_text(encoding='utf-8')
s=s.replace("ftx.version!=='2.0.1'","ftx.version!=='2.0.2'",1)
smoke.write_text(s,encoding='utf-8')

reg=Path('tools/static-regression.mjs')
r=reg.read_text(encoding='utf-8')
old="""  ['function scoutingV2Signature()','FTUE must observe authoritative Scouting V2 assignment state'],
  ['function maybeCompleteScoutingV2Assignment','FTUE must complete Week 3 from a real Scouting V2 assignment'],
"""
new="""  ['function scoutingV2Signature()','FTUE must observe authoritative Scouting V2 assignment state'],
  ['function scoutingV2HasAssignment()','FTUE must read the production Scouting V2 active-assignment authority'],
  ['function syncScoutingV2Assignment','FTUE must reconcile a saved or newly-created Scouting V2 assignment'],
  ['function maybeCompleteScoutingV2Assignment','FTUE must complete Week 3 from a real Scouting V2 assignment'],
"""
if old not in r: raise SystemExit('Static regression FTUE contract point not found')
r=r.replace(old,new,1)
reg.write_text(r,encoding='utf-8')

html=Path('game.html')
h=html.read_text(encoding='utf-8')
h=h.replace('scripts/first-time-experience-v2.js?v=20260911-ftx22','scripts/first-time-experience-v2.js?v=20260911-ftx23',1)
html.write_text(h,encoding='utf-8')

Path('scouting-v2-runtime-snippets.txt').unlink(missing_ok=True)
print('FTUE Scouting V2 assignment authority patched to 2.0.2')
