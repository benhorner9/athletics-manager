from pathlib import Path

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def inject_after(text, anchor, addition, label):
    if addition in text:
        return text
    if anchor not in text:
        raise SystemExit(f'Anchor missing for {label}: {anchor}')
    return text.replace(anchor, anchor+'\n'+addition, 1)

def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'Anchor missing for {label}')
    return text.replace(old,new,1)

# Load the production My Profile assets in the canonical UI graph.
html=read('game.html')
html=inject_after(html,
    '<link rel="stylesheet" href="styles/world-season-v2.css?v=20260910-worldseason2">',
    '<link rel="stylesheet" href="styles/manager-profile-v1.css?v=20260911-manager1">',
    'manager profile stylesheet')
html=inject_after(html,
    '<script src="scripts/world-season-v2.js?v=20260910-worldseason2"></script>',
    '<script src="scripts/manager-career-v1.js?v=20260911-manager1"></script>',
    'manager career runtime')
write('game.html',html)

# Extend the production asset/source contracts.
static=read('tools/static-regression.mjs')
static=replace_once(static,
    " 'scripts/world-season-v2.js',\n 'scripts/integration-regression-v1.js',",
    " 'scripts/world-season-v2.js',\n 'scripts/manager-career-v1.js',\n 'scripts/integration-regression-v1.js',",
    'required manager runtime')
static=inject_after(static,
    "before('scripts/staff-finance-v2.js','scripts/world-season-v2.js');",
    "before('scripts/world-season-v2.js','scripts/manager-career-v1.js');\nbefore('scripts/manager-career-v1.js','scripts/integration-regression-v1.js');",
    'manager runtime order')
static=replace_once(static,
    " 'styles/competition-journey-v2.css','styles/live-event-broadcast-v4.css','styles/training-v3.css','styles/scouting-v3.css','styles/staff-finance-v2.css','styles/world-season-v2.css',\n 'styles/event-flow-stability.css'",
    " 'styles/competition-journey-v2.css','styles/live-event-broadcast-v4.css','styles/training-v3.css','styles/scouting-v3.css','styles/staff-finance-v2.css','styles/world-season-v2.css','styles/manager-profile-v1.css',\n 'styles/event-flow-stability.css'",
    'manager production stylesheet')
static=replace_once(static,
    " 'scripts/ui-cutover-v1.js':[\n",
    " 'scripts/manager-career-v1.js':[\n  ['window.AMManagerCareerV1','Manager career public handle is missing'],\n  ['function captureSeasonSnapshot(summary)','Manager season snapshot authority is missing'],\n  ['function syncMilestones()','Manager milestone engine is missing'],\n  ['function federationState()','Manager federation-confidence integration is missing'],\n  ['function philosophy()','Manager philosophy derivation is missing'],\n  [\"const PROFILE_TABS=['overview','career','achievements','statistics','reputation','philosophy']\",'Manager profile tab contract is incomplete']\n ],\n 'scripts/ui-cutover-v1.js':[\n",
    'manager source contracts')
write('tools/static-regression.mjs',static)

# Runtime smoke must prove the new career/profile layer actually boots and renders.
smoke=read('tools/runtime-smoke.mjs')
smoke=replace_once(smoke,
    "'AMLiveBroadcastV4'",
    "'AMLiveBroadcastV4','AMManagerCareerV1'",
    'manager runtime global')
manager_block=""" if(w.AMManagerCareerV1){
  try{
   const diag=w.AMManagerCareerV1.diagnostics();
   if(!diag||diag.version!=='1.0.0'||diag.modelVersion!==1)fail('Manager Career V1 diagnostics are invalid.');
   if(!diag.reputation?.tier||!diag.federationConfidence?.label)fail('Manager Career V1 is missing reputation/federation state.');
   w.AMManagerCareerV1.open('overview');
   await new Promise(resolve=>setTimeout(resolve,25));
   const managerDialog=w.document.getElementById('managementProfile');
   if(!managerDialog?.querySelector('.mp-shell'))fail('Manager Profile V1 did not render its production shell.');
   if(managerDialog?.querySelectorAll('.mp-tabs [data-mp-tab]').length!==6)fail('Manager Profile V1 tab set is incomplete.');
   managerDialog?.close?.();
  }catch(err){fail(`Manager Career V1 diagnostics threw: ${err?.stack||err}`)}
 }
"""
anchor=""" if(w.AMLiveBroadcastV4){
  try{
   const diag=w.AMLiveBroadcastV4.diagnostics();
   if(!diag||diag.loaded!==true||diag.renderer!=='Broadcast V4.6 Optimised')fail('Broadcast V4.6 diagnostics are not authoritative.');
   const qa=w.AMLiveBroadcastV4.qa();
   if(!qa||qa.ok!==true||!Array.isArray(qa.issues))fail('Broadcast V4.6 QA snapshot is invalid while idle.');
  }catch(err){fail(`Broadcast V4.6 diagnostics threw: ${err?.stack||err}`)}
 }
"""
smoke=inject_after(smoke,anchor,manager_block.rstrip('\n'),'manager runtime smoke')
write('tools/runtime-smoke.mjs',smoke)

print('Manager Career / My Profile production integration applied.')
