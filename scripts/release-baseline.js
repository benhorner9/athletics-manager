/* Athletics Manager — canonical shipping baseline
   Product/system versions reset here. Historical source filenames (V2/V3/V4 etc.) describe
   implementation lineage only and are not shipping version numbers after this baseline.
   Canonical shippable baseline: Athletics Manager 1.0. */
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
 inbox:system('scripts/inbox-v3.js',{label:'Inbox',logic:'scripts/inbox-decision-core-v1.js',voice:'scripts/inbox-character-voices-v1.js'}),
 squad:system('scripts/squad-athlete-v2.js',{label:'Squad'}),
 nationalPool:system('scripts/squad-athlete-v2.js',{label:'National Pool'}),
 athleteProfile:system('scripts/squad-athlete-v2.js',{label:'Athlete Profile'}),
 athleteAttributes:system('scripts/athlete-attributes-v1.js',{label:'Athlete Attributes',scale:'1–20',rule:'no player-facing overall rating'}),
 calendar:system('scripts/calendar-v2.js',{label:'Calendar'}),
 training:system('scripts/training-v2-bootstrap.js',{label:'Training',enhancement:'scripts/training-v3.js',rule:'one visible Training Centre'}),
 scouting:system('scripts/scouting-v2-bootstrap.js',{label:'Scouting',compatibility:'scripts/scouting-v3.js',rule:'Scouting V2 workflow remains presentation authority'}),
 competition:system('scripts/competition-journey-v2.js',{label:'Competition Journey'}),
 selection:system('scripts/selection-centre-v2.js',{label:'Selection Centre',logic:'scripts/selection-decision-v3.js'}),
 eventFlow:system('scripts/event-flow-v3.js',{label:'Event Flow'}),
 liveEvents:system('scripts/live-event-broadcast-v4.js',{label:'Live Events',simulation:'scripts/live-event-engine-v3.js',commentary:'Gavin Potts · priority-led broadcast language'}),
 eventAI:system('scripts/event-ai-realism.js',{label:'Event AI',display:'scripts/event-ai-display.js'}),
 staff:system('scripts/staff-finance-v2.js',{label:'Staff'}),
 finance:system('scripts/staff-finance-v2.js',{label:'Finance'}),
 summitSeries:system('scripts/world-season-v2.js',{label:'Summit Series'}),
 rankings:system('scripts/world-season-v2.js',{label:'Rankings'}),
 qualification:system('scripts/world-season-v2.js',{label:'Qualification',support:'scripts/qualification-compact-v2.js'}),
 worldNews:system('scripts/world-season-v2.js',{label:'World News'}),
 clubWorld:system('scripts/club-world-v1.js',{label:'Club Athletics'}),
 managerProfile:system('scripts/manager-career-v1.js',{label:'Manager Career / My Profile'}),
 firstTimeExperience:system('scripts/first-time-experience-v2.js',{label:'First-Time Player Experience'}),
 language:system('scripts/language-system-v1.js',{label:'Text, Language & Narrative Systems',baseLanguage:'en-GB',rule:'gameplay owns facts; language owns presentation'}),
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
