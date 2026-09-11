from pathlib import Path

# Canonical Athletics Manager 1.0 shipping baseline.
# Internal source filenames keep their historical generation labels; the public/system version
# tracked from this point forward is defined only by scripts/release-baseline.js.

release = r'''/* Athletics Manager — canonical shipping baseline
   Product/system versions reset here. Historical source filenames (V2/V3/V4 etc.) describe
   implementation lineage only and are not shipping version numbers after this baseline. */
(function(){
'use strict';
if(window.AMRelease)return;
const PRODUCT_VERSION='1.0';
const SYSTEM_VERSION='1.0';
const releasedAt='2026-09-11';
const system=(authority,extra={})=>Object.freeze({version:SYSTEM_VERSION,authority,...extra});
const systems=Object.freeze({
 core:system('scripts/game.js',{label:'Core Game Runtime'}),
 ui:system('scripts/ui-platform-v1.js',{label:'UI Platform / Shell'}),
 home:system('scripts/home-v2.js',{label:'Home / Performance Centre'}),
 inbox:system('scripts/inbox-v3.js',{label:'Inbox',logic:'scripts/inbox-decision-core-v1.js'}),
 squad:system('scripts/squad-athlete-v2.js',{label:'Squad'}),
 nationalPool:system('scripts/squad-athlete-v2.js',{label:'National Pool'}),
 athleteProfile:system('scripts/squad-athlete-v2.js',{label:'Athlete Profile'}),
 calendar:system('scripts/calendar-v2.js',{label:'Calendar'}),
 training:system('scripts/training-v2-bootstrap.js',{label:'Training',enhancement:'scripts/training-v3.js',rule:'one visible Training Centre'}),
 scouting:system('scripts/scouting-v2-bootstrap.js',{label:'Scouting',compatibility:'scripts/scouting-v3.js',rule:'Scouting V2 workflow remains presentation authority'}),
 competition:system('scripts/competition-journey-v2.js',{label:'Competition Journey'}),
 selection:system('scripts/selection-centre-v2.js',{label:'Selection Centre',logic:'scripts/selection-decision-v3.js'}),
 eventFlow:system('scripts/event-flow-v3.js',{label:'Event Flow'}),
 liveEvents:system('scripts/live-event-broadcast-v4.js',{label:'Live Events',simulation:'scripts/live-event-engine-v3.js'}),
 eventAI:system('scripts/event-ai-realism.js',{label:'Event AI',display:'scripts/event-ai-display.js'}),
 staff:system('scripts/staff-finance-v2.js',{label:'Staff'}),
 finance:system('scripts/staff-finance-v2.js',{label:'Finance'}),
 summitSeries:system('scripts/world-season-v2.js',{label:'Summit Series'}),
 rankings:system('scripts/world-season-v2.js',{label:'Rankings'}),
 qualification:system('scripts/world-season-v2.js',{label:'Qualification',support:'scripts/qualification-compact-v2.js'}),
 worldNews:system('scripts/world-season-v2.js',{label:'World News'}),
 managerProfile:system('scripts/manager-career-v1.js',{label:'Manager Career / My Profile'}),
 firstTimeExperience:system('scripts/first-time-experience-v2.js',{label:'First-Time Player Experience'}),
 alphaAccess:system('scripts/alpha-menu-gate.js',{label:'Alpha Access / Main Menu'}),
 sprintEvents:system('scripts/sprint-expansion.js',{label:'Sprint Event Expansion'}),
 enduranceEvents:system('scripts/endurance-expansion.js',{label:'Endurance Event Expansion'})
});
const release=Object.freeze({
 product:'Athletics Manager',
 version:PRODUCT_VERSION,
 systemVersion:SYSTEM_VERSION,
 releasedAt,
 baselineBranch:'release/1.0',
 systems,
 policy:Object.freeze({
  oneAuthorityPerSystem:true,
  implementationLabelsAreHistorical:true,
  futureChanges:'Increment the affected shipping system from 1.0; do not add a competing renderer over the current authority.',
  fallback:'release/1.0 is the immutable known-good shipping baseline.'
 })
});
window.AMRelease=release;
document.documentElement.dataset.amVersion=PRODUCT_VERSION;
})();
'''
Path('scripts/release-baseline.js').write_text(release, encoding='utf-8')
Path('VERSION').write_text('1.0\n', encoding='utf-8')

doc = '''# Athletics Manager 1.0 — Shipping Baseline\n\n**Release:** 1.0  \n**Baseline date:** 11 September 2026  \n**Failsafe branch:** `release/1.0`\n\nThis document is the canonical versioning baseline for the shippable game. From this point forward, every current production system starts at **1.0**. Historical filenames such as `home-v2.js`, `inbox-v3.js` or `live-event-broadcast-v4.js` are implementation lineage only; they no longer define the version Ben tracks for the game.\n\n## Locked 1.0 authorities\n\n| System | Shipping version | Production authority |\n| --- | --- | --- |\n| Core Game Runtime | 1.0 | `scripts/game.js` |\n| UI Platform / Shell | 1.0 | `scripts/ui-platform-v1.js` |\n| Home | 1.0 | `scripts/home-v2.js` |\n| Inbox | 1.0 | `scripts/inbox-v3.js` |\n| Squad / National Pool / Athlete Profile | 1.0 | `scripts/squad-athlete-v2.js` |\n| Calendar | 1.0 | `scripts/calendar-v2.js` |\n| Training | 1.0 | `scripts/training-v2-bootstrap.js` (with `training-v3.js` enhancement only) |\n| Scouting | 1.0 | `scripts/scouting-v2-bootstrap.js` (`scouting-v3.js` compatibility only) |\n| Competition Journey | 1.0 | `scripts/competition-journey-v2.js` |\n| Selection Centre | 1.0 | `scripts/selection-centre-v2.js` + `selection-decision-v3.js` logic |\n| Event Flow | 1.0 | `scripts/event-flow-v3.js` |\n| Live Events | 1.0 | `scripts/live-event-broadcast-v4.js` + `live-event-engine-v3.js` simulation |\n| Event AI | 1.0 | `scripts/event-ai-realism.js` + `event-ai-display.js` |\n| Staff / Finance | 1.0 | `scripts/staff-finance-v2.js` |\n| Summit Series / Rankings / Qualification / World News | 1.0 | `scripts/world-season-v2.js` |\n| Manager Career / My Profile | 1.0 | `scripts/manager-career-v1.js` |\n| First-Time Player Experience | 1.0 | `scripts/first-time-experience-v2.js` |\n| Alpha Access / Main Menu | 1.0 | `scripts/alpha-menu-gate.js` |\n| Sprint Expansion | 1.0 | `scripts/sprint-expansion.js` |\n| Endurance Expansion | 1.0 | `scripts/endurance-expansion.js` |\n\n## Versioning rules from 1.0 onward\n\n1. **One authority per system.** Future work edits or replaces the listed authority deliberately; it must not add a second competing screen or renderer over the top.\n2. **Small compatible upgrades:** 1.0 → 1.1 → 1.2.\n3. **Major redesign/replacement:** move that system to 2.0 only when the existing authority is deliberately superseded.\n4. **Product version:** the whole game is Athletics Manager 1.0 at this baseline. Future release numbers are separate from historical implementation-generation names.\n5. **Failsafe:** `release/1.0` is the known-good branch. If a later update breaks a system, this baseline is the comparison/rollback point.\n6. **No silent authority changes.** A future system upgrade must update `scripts/release-baseline.js` and the regression contract in the same change.\n\nThis is the build Ben has approved as shippable.\n'''
Path('RELEASE-1.0.md').write_text(doc, encoding='utf-8')

html_path=Path('game.html')
html=html_path.read_text(encoding='utf-8')
old='<script src="scripts/first-time-experience-v2.js?v=20260911-ftx23"></script>\n<script src="scripts/integration-regression-v1.js?v=20260910-integration1"></script>'
new='<script src="scripts/first-time-experience-v2.js?v=20260911-ftx23"></script>\n<script src="scripts/release-baseline.js?v=20260911-release10"></script>\n<script src="scripts/integration-regression-v1.js?v=20260910-integration1"></script>'
if old not in html: raise SystemExit('game.html FTUE/integration insertion point not found')
html=html.replace(old,new,1)
html_path.write_text(html,encoding='utf-8')

reg_path=Path('tools/static-regression.mjs')
reg=reg_path.read_text(encoding='utf-8')
old_req=" 'scripts/first-time-experience-v2.js',\n 'scripts/integration-regression-v1.js',"
new_req=" 'scripts/first-time-experience-v2.js',\n 'scripts/release-baseline.js',\n 'scripts/integration-regression-v1.js',"
if old_req not in reg: raise SystemExit('static regression requiredScripts insertion point not found')
reg=reg.replace(old_req,new_req,1)
old_order="before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/integration-regression-v1.js');"
new_order="before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/release-baseline.js');\nbefore('scripts/release-baseline.js','scripts/integration-regression-v1.js');"
if old_order not in reg: raise SystemExit('static regression order insertion point not found')
reg=reg.replace(old_order,new_order,1)
contract_anchor=" 'scripts/inbox-decision-core-v1.js':["
release_contract=""" 'scripts/release-baseline.js':[
  [\"const PRODUCT_VERSION='1.0'\",'Athletics Manager shipping release must remain anchored to 1.0 until deliberately upgraded'],
  [\"const SYSTEM_VERSION='1.0'\",'Canonical production systems must share the 1.0 baseline'],
  ['oneAuthorityPerSystem:true','Release baseline must enforce one production authority per system'],
  [\"baselineBranch:'release/1.0'\",'Release baseline must name the 1.0 failsafe branch'],
  ['window.AMRelease=release','Canonical release manifest global is missing']
 ],
"""+contract_anchor
if contract_anchor not in reg: raise SystemExit('static regression release contract insertion point not found')
reg=reg.replace(contract_anchor,release_contract,1)
reg_path.write_text(reg,encoding='utf-8')

smoke_path=Path('tools/runtime-smoke.mjs')
smoke=smoke_path.read_text(encoding='utf-8')
old_globals="'__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','AMFirstTimeExperienceV2','__athleticsRegression','AMLiveBroadcastV4'"
new_globals="'__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4'"
if old_globals not in smoke: raise SystemExit('runtime smoke globals insertion point not found')
smoke=smoke.replace(old_globals,new_globals,1)
anchor=" if(w.AMLiveBroadcastV4){\n"
release_check=""" if(w.AMRelease){
  try{
   const release=w.AMRelease;
   if(release.version!=='1.0'||release.systemVersion!=='1.0')fail('Athletics Manager canonical shipping baseline is not 1.0.');
   const entries=Object.entries(release.systems||{});
   if(entries.length<20)fail('Athletics Manager 1.0 release manifest is missing production systems.');
   const wrong=entries.filter(([,value])=>value?.version!=='1.0').map(([key])=>key);
   if(wrong.length)fail(`Release manifest systems not on 1.0: ${wrong.join(', ')}`);
   if(release.policy?.oneAuthorityPerSystem!==true)fail('Release manifest one-authority rule is missing.');
  }catch(err){fail(`Athletics Manager 1.0 release manifest threw: ${err?.stack||err}`)}
 }
"""+anchor
if anchor not in smoke: raise SystemExit('runtime smoke release check insertion point not found')
smoke=smoke.replace(anchor,release_check,1)
smoke_path.write_text(smoke,encoding='utf-8')

print('Athletics Manager 1.0 shipping baseline staged')
