from pathlib import Path

root=Path('.')

def replace(path,old,new,count=1):
    p=root/path
    text=p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old,new,count),encoding='utf-8')

# game.html — explicit production route, navigation, CSS and runtime load.
replace('game.html',
 '<link rel="stylesheet" href="styles/world-season-v2.css?v=20260910-worldseason2">\n<link rel="stylesheet" href="styles/manager-profile-v1.css?v=20260911-managercareer1">',
 '<link rel="stylesheet" href="styles/world-season-v2.css?v=20260910-worldseason2">\n<link rel="stylesheet" href="styles/club-athletics-v1.css?v=20260912-clubs1">\n<link rel="stylesheet" href="styles/manager-profile-v1.css?v=20260911-managercareer1">')
replace('game.html',
 '<button data-view="pool">National Pool</button><button data-view="calendar">Calendar</button>',
 '<button data-view="pool">National Pool</button><button data-view="clubs">Club Athletics</button><button data-view="calendar">Calendar</button>')
replace('game.html',
 '<section id="pool" class="view"></section><section id="league" class="view"></section>',
 '<section id="pool" class="view"></section><section id="clubs" class="view"></section><section id="league" class="view"></section>')
replace('game.html',
 '<button data-mobile-view="pool">National Pool</button><button data-mobile-view="training">Training</button>',
 '<button data-mobile-view="pool">National Pool</button><button data-mobile-view="clubs">Club Athletics</button><button data-mobile-view="training">Training</button>')
replace('game.html',
 '<script src="scripts/first-time-experience-v2.js?v=20260911-ftx27-summit-schedule"></script>\n<script src="scripts/keyboard-shortcuts-v1.js?v=20260911-spaceadvance1"></script>',
 '<script src="scripts/first-time-experience-v2.js?v=20260911-ftx27-summit-schedule"></script>\n<script src="scripts/club-athletics-v1.js?v=20260912-clubs1"></script>\n<script src="scripts/keyboard-shortcuts-v1.js?v=20260911-spaceadvance1"></script>')

# Release manifest — one explicit authority for the club system.
replace('scripts/release-baseline.js',
 "  worldNews:system('scripts/world-season-v2.js',{label:'World News'}),\n  managerProfile:system('scripts/manager-career-v1.js',{label:'Manager Career / My Profile'}),",
 "  worldNews:system('scripts/world-season-v2.js',{label:'World News'}),\n  clubAthletics:system('scripts/club-athletics-v1.js',{label:'Club Athletics',identity:'scripts/people-biography-v1.js',rule:'club duty is subordinate to national programme commitments'}),\n  managerProfile:system('scripts/manager-career-v1.js',{label:'Manager Career / My Profile'}),")

# Static regression contracts.
replace('tools/static-regression.mjs',
 "const routes=['home','inbox','squad','pool','calendar','training','scouting','league','rankings','olympics','staff','finance','news','competition'];",
 "const routes=['home','inbox','squad','pool','clubs','calendar','training','scouting','league','rankings','olympics','staff','finance','news','competition'];")
replace('tools/static-regression.mjs',
 " 'scripts/first-time-experience-v2.js',\n 'scripts/keyboard-shortcuts-v1.js',",
 " 'scripts/first-time-experience-v2.js',\n 'scripts/club-athletics-v1.js',\n 'scripts/keyboard-shortcuts-v1.js',")
replace('tools/static-regression.mjs',
 "before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/release-baseline.js');",
 "before('scripts/manager-career-v1.js','scripts/first-time-experience-v2.js');\nbefore('scripts/first-time-experience-v2.js','scripts/club-athletics-v1.js');\nbefore('scripts/people-biography-v1.js','scripts/club-athletics-v1.js');\nbefore('scripts/world-season-v2.js','scripts/club-athletics-v1.js');\nbefore('scripts/club-athletics-v1.js','scripts/release-baseline.js');")
replace('tools/static-regression.mjs',
 " 'styles/competition-journey-v2.css','styles/live-event-broadcast-v4.css','styles/training-v3.css','styles/scouting-v3.css','styles/staff-finance-v2.css','styles/world-season-v2.css',",
 " 'styles/competition-journey-v2.css','styles/live-event-broadcast-v4.css','styles/training-v3.css','styles/scouting-v3.css','styles/staff-finance-v2.css','styles/world-season-v2.css','styles/club-athletics-v1.css',")
replace('tools/static-regression.mjs',
 " 'scripts/nation-world-v1.js':[",
 " 'scripts/club-athletics-v1.js':[\n  ['window.AMClubAthletics','Club Athletics public authority is missing'],\n  ['const MEETINGS=[','Club Athletics domestic calendar is missing'],\n  ['function simulateNationMeeting','Club Athletics meeting simulation is missing'],\n  ['function settleNationClubSeason','Club Athletics championship/season settlement is missing'],\n  ['function nationalDuty','Club Athletics national-duty precedence is missing'],\n  ['registerPerformance(a,d,row.perf,\'club\'','Club results must feed official athlete performance evidence'],\n  ['function drawClubAthletics','Club Athletics canonical screen renderer is missing'],\n  ['function enhanceCalendar','Club Athletics calendar integration is missing'],\n  ['function enhanceAthleteProfile','Club Athletics athlete-profile integration is missing']\n ],\n 'scripts/nation-world-v1.js':[")

# Runtime smoke: authority, diagnostics and route rendering.
replace('tools/runtime-smoke.mjs',
 "  '__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography'",
 "  '__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','AMFirstTimeExperienceV2','AMClubAthletics','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography'")
replace('tools/runtime-smoke.mjs',
 " console.log('[smoke] runtime globals and snapshot checked');",
 " if(w.AMClubAthletics){\n  try{\n   const clubs=w.AMClubAthletics.snapshot();\n   if(!clubs||clubs.version!=='1.0')fail('Club Athletics diagnostics are invalid.');\n   if(clubs.clubCount<1)fail('Club Athletics did not build a persistent club registry.');\n   if(clubs.domesticClubs<1)fail('Club Athletics managed nation has no domestic clubs.');\n   if(!Array.isArray(w.AMClubAthletics.meetings)||w.AMClubAthletics.meetings.length!==6)fail('Club Athletics must expose six domestic meetings.');\n   const route=w.document.getElementById('clubs');\n   if(!route)fail('Club Athletics route section is missing at runtime.');\n  }catch(err){fail(`Club Athletics diagnostics threw: ${err?.stack||err}`)}\n }\n console.log('[smoke] runtime globals and snapshot checked');")
replace('tools/runtime-smoke.mjs',
 " const smokeRoutes=['home','inbox','squad','pool','calendar','training','scouting','league','rankings','olympics','staff','finance','news'];",
 " const smokeRoutes=['home','inbox','squad','pool','clubs','calendar','training','scouting','league','rankings','olympics','staff','finance','news'];")

# Architecture docs.
replace('docs/ARCHITECTURE.md',
 "- World / Season — `scripts/world-season-v2.js`\n- Manager Career / My Profile — `scripts/manager-career-v1.js`",
 "- World / Season — `scripts/world-season-v2.js`\n- Club Athletics — `scripts/club-athletics-v1.js` with persistent athlete club identity from `scripts/people-biography-v1.js`\n- Manager Career / My Profile — `scripts/manager-career-v1.js`")

# Ensure update is represented in README structure.
replace('README.md',
 "- `scripts/` — simulation, UI, event, inbox, training, scouting and career systems.",
 "- `scripts/` — simulation, UI, event, inbox, training, scouting, club-athletics and career systems.")
