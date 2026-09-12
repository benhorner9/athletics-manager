from pathlib import Path

root=Path('.')

def read(path):
    return (root/path).read_text(encoding='utf-8')

def write(path,text):
    (root/path).write_text(text,encoding='utf-8')

def replace(path,old,new,count=1):
    text=read(path)
    if old not in text:
        raise SystemExit(f'Anchor not found in {path}: {old[:140]!r}')
    write(path,text.replace(old,new,count))

def replace_between(path,start_marker,end_marker,replacement):
    text=read(path)
    start=text.find(start_marker)
    if start<0:
        raise SystemExit(f'Start marker not found in {path}: {start_marker!r}')
    end=text.find(end_marker,start)
    if end<0:
        raise SystemExit(f'End marker not found in {path}: {end_marker!r}')
    write(path,text[:start]+replacement+text[end:])

# Load the attribute data service before the canonical Squad/Athlete Profile renderer.
replace('game.html',
 '<link rel="stylesheet" href="styles/squad-athlete-v2.css?v=20260911-squadalign2">',
 '<link rel="stylesheet" href="styles/squad-athlete-v2.css?v=20260911-squadalign2">\n<link rel="stylesheet" href="styles/athlete-attributes-v1.css?v=20260912-attributes20-preview1">')
replace('game.html',
 '<script src="scripts/inbox-v3.js?v=20260910-inbox3"></script>\n<script src="scripts/squad-athlete-v2.js?v=20260912-clubworld1"></script>',
 '<script src="scripts/inbox-v3.js?v=20260910-inbox3"></script>\n<script src="scripts/athlete-attributes-v1.js?v=20260912-attributes20-preview1"></script>\n<script src="scripts/squad-athlete-v2.js?v=20260912-attributes20-preview1"></script>')

# Canonical Squad/Athlete Profile: remove player-facing aggregate ability and introduce 1–20 attributes.
path='scripts/squad-athlete-v2.js'
replace(path,
 "function abilityMid(a){return safe(()=>assessmentMid(a,'overall'),Number(a.overall)||0)}\n",
 "function abilityMid(a){return safe(()=>assessmentMid(a,'overall'),Number(a.overall)||0)}\nfunction attributeModel(a){return safe(()=>window.AMAthleteAttributes?.get?.(a),{scale:20,familyLabel:'Performance profile',attributes:[]})}\nfunction attributeTop(a,count=3){return safe(()=>window.AMAthleteAttributes?.top?.(a,count),attributeModel(a).attributes.slice(0,count))}\nfunction squadKeyAttributes(a){const rows=attributeTop(a,3);return `<div class=\"sav2-keyattrs\">${rows.map(x=>`<span title=\"${esc(x.label)}\">${esc(x.abbr)} <b>${Number(x.score)||'—'}</b></span>`).join('')}</div>`}\nfunction attributeGridHTML(a){const model=attributeModel(a);return `<div class=\"apv2-attribute-grid\">${model.attributes.map(x=>`<div class=\"apv2-attribute ${esc(x.band)}\" style=\"--attr:${Number(x.score)||0}\"><span>${esc(x.label)}</span><strong>${Number(x.score)||'—'}</strong><i></i></div>`).join('')}</div>`}\nfunction attributeSnapshotHTML(a,count=4){const model=attributeModel(a),rows=attributeTop(a,count);return `<div class=\"apv2-keyattrs\">${rows.map(x=>`<div class=\"apv2-keyattr\"><small>${esc(x.abbr)}</small><strong>${Number(x.score)||'—'}</strong><span>${esc(x.label)}</span></div>`).join('')}</div><p class=\"apv2-action-note\">${esc(model.familyLabel)} · 1–${Number(model.scale)||20} staff scale · no combined rating.</p>`}\n")
replace(path,"if(key==='ability')return abilityMid(a);","")
replace(path,
 "if(key==='event'&&c===0)c=abilityMid(b)-abilityMid(a);",
 "if(key==='event'&&c===0){const ab=safe(()=>better(a.disc,a.pb,b.pb),Number(a.pb)>Number(b.pb)),ba=safe(()=>better(a.disc,b.pb,a.pb),Number(b.pb)>Number(a.pb));c=ab?-1:ba?1:String(a.name||'').localeCompare(String(b.name||''))}")
replace_between(path,'function row(a){','\nfunction sortHead',"""function row(a){const h=healthTone(a);return `<tr tabindex="0" data-sav2-athlete="${esc(a.id)}" aria-label="Open ${esc(a.name)} profile">
 <td><div class="sav2-person"><span class="sav2-face">${portrait(a)}</span><span><strong title="${esc(a.name)}">${esc(a.name)}</strong><small>${esc(a.tier||'Athlete')} · Age ${Number(a.age)||'—'}</small></span></div></td>
 <td>${esc(disc(a))}</td><td>${squadKeyAttributes(a)}</td><td class="num"><span class="sav2-dev">${devHTML(a)}</span></td><td><span class="sav2-score">${esc(perf(a,a.pb))}</span></td>
 <td>${metricBar(a.fitness)}</td><td>${metricBar(a.form)}</td><td>${metricBar(a.fatigue,true)}</td><td><span class="sav2-state ${h}">${esc(healthLabel(a))}</span></td></tr>`}
""")
replace(path,
 "'Your active high-performance squad. Compare readiness, form and staff assessment without opening multiple screens.'",
 "'Your active high-performance squad. Compare PBs, readiness, form and key performance attributes from one consistent view.'")
replace(path,
 "<option value=\"ability\" ${st.sort==='ability'?'selected':''}>Sort: Ability</option>",
 "")
replace(path,
 "${sortHead('athlete','Athlete',st)}${sortHead('event','Event',st)}${sortHead('ability','Ability',st)}${sortHead('development','Dev',st)}",
 "${sortHead('athlete','Athlete',st)}${sortHead('event','Event',st)}<th>Key Attributes</th>${sortHead('development','Dev',st)}")

replace_between(path,'function overviewTab(a,h,own,squad){','\nfunction trainingTab',"""function overviewTab(a,h,own,squad){const up=upcoming(a);return `<div class="apv2-grid"><div class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>Performance Snapshot</strong><span>Current season</span></div><div class="apv2-card-body">${profileMetrics(a,h)}</div></section><section class="apv2-card"><div class="apv2-card-head"><strong>Key Attributes</strong><span>1–20 staff scale</span></div><div class="apv2-card-body">${attributeSnapshotHTML(a,4)}</div></section><section class="apv2-card"><div class="apv2-card-head"><strong>Readiness</strong><span>${esc(healthLabel(a))}</span></div><div class="apv2-card-body"><div class="apv2-readiness">${readinessRow('Fitness',a.fitness)}${readinessRow('Form',a.form)}${readinessRow('Fatigue',a.fatigue,true)}</div></div></section><section class="apv2-card"><div class="apv2-card-head"><strong>Career Context</strong><span>Recent programme history</span></div><div class="apv2-card-body">${storyHTML(a)}</div></section></div><aside class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>${own?'Coach Advice':'Opposition Analysis'}</strong><span>${esc(disc(a))}</span></div><div class="apv2-card-body"><div class="apv2-advice"><span class="apv2-advice-mark">${own?'CO':'OA'}</span><div><strong>${own?'Performance Team':'International Analysis'}</strong><p>${esc(coachAdvice(a))}</p></div></div></div></section><section class="apv2-card"><div class="apv2-card-head"><strong>Upcoming Entries</strong><span>${up.length}</span></div>${up.length?`<div class="apv2-list">${up.map(e=>`<div><b>W${Number(e.week)||'—'}</b><span><strong>${esc(e.name||'Competition')}</strong><small>${esc(e.location||e.venue||'Venue TBC')}</small></span><em>${Number(e.week)===week()?'THIS WEEK':'UPCOMING'}</em></div>`).join('')}</div>`:'<div class="apv2-empty">No confirmed upcoming entries.</div>'}</section><section class="apv2-card"><div class="apv2-card-head"><strong>Traits</strong><span>Current</span></div><div class="apv2-card-body">${traitsHTML(a)}</div></section><section class="apv2-card"><div class="apv2-card-head"><strong>Rivalries</strong><span>Head-to-head</span></div>${rivalriesHTML(a)}</section></aside></div>`}
""")
replace_between(path,'function developmentTab(a){','\nfunction recordsTab',"""function attributesTab(a){const model=attributeModel(a),strengths=attributeTop(a,3),weak=safe(()=>window.AMAthleteAttributes?.weakest?.(a,2),model.attributes.slice(-2));return `<div class="apv2-grid"><div class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>Performance Attributes</strong><span>1–${Number(model.scale)||20}</span></div><div class="apv2-card-body"><div class="apv2-attribute-intro"><div><strong>${esc(model.familyLabel)}</strong><p>These ratings describe the qualities behind the athlete's performances. There is deliberately no combined Overall score.</p></div><span class="apv2-scale-chip">1–20 scale</span></div>${attributeGridHTML(a)}</div></section></div><aside class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>Staff Read</strong><span>Current assessment</span></div><div class="apv2-card-body"><p class="apv2-action-note" style="margin-top:0"><strong style="color:#dce9f0">Strongest qualities</strong><br>${strengths.map(x=>`${esc(x.label)} ${Number(x.score)}`).join(' · ')||'Assessment pending'}</p><p class="apv2-action-note"><strong style="color:#dce9f0">Development areas</strong><br>${weak.map(x=>`${esc(x.label)} ${Number(x.score)}`).join(' · ')||'Assessment pending'}</p></div></section><section class="apv2-card"><div class="apv2-card-head"><strong>How To Read It</strong><span>No aggregate rating</span></div><div class="apv2-card-body"><p class="apv2-action-note" style="margin-top:0">18–20 is elite, 15–17 excellent, 12–14 strong, 9–11 solid and lower ratings identify areas that may limit performance. PBs, results, rankings and current condition remain separate factual evidence.</p></div></section></aside></div>`}
function developmentTab(a){const confidence=safe(()=>assessmentConfidenceLabel(a,'overall')?.[0],'—'),note=safe(()=>assessmentExplanation(a),'Staff confidence improves as more evidence is collected.');return `<div class="apv2-grid"><div class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>Development Outlook</strong><span>${esc(confidence)} staff confidence</span></div><div class="apv2-card-body"><div class="apv2-metrics"><div class="apv2-metric"><small>Development</small><strong>${esc(devText(a))}</strong><span>Staff projection</span></div><div class="apv2-metric"><small>Age</small><strong>${Number(a.age)||'—'}</strong><span>Career stage</span></div><div class="apv2-metric"><small>Tier</small><strong>${esc(a.tier||'Athlete')}</strong><span>Programme level</span></div><div class="apv2-metric"><small>Knowledge</small><strong>${esc(confidence)}</strong><span>Assessment confidence</span></div></div><p class="apv2-action-note">${esc(note)}</p></div></section></div><aside class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>Development Principle</strong><span>Staff judgement</span></div><div class="apv2-card-body"><p class="apv2-action-note">Development remains a staff projection rather than a hidden truth. Use the attribute profile alongside PBs, results and competition evidence when deciding who is ready for the next level.</p></div></section></aside></div>`}
""")
replace_between(path,'function profileTabHTML(a,h,own,squad){','\nfunction renderProfile',"""function profileTabHTML(a,h,own,squad){if(ui.profileTab==='attributes')return attributesTab(a);if(ui.profileTab==='results')return`<section class="apv2-card"><div class="apv2-card-head"><strong>Results & Form</strong><span>${h.length} recorded performances</span></div>${resultRows(a,h)}</section>`;if(ui.profileTab==='training')return trainingTab(a,own,squad);if(ui.profileTab==='development')return developmentTab(a);if(ui.profileTab==='medical')return`<div class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>Medical & Availability</strong><span>${esc(healthLabel(a))}</span></div><div class="apv2-card-body">${medicalHTML(a)}</div></section></div>`;if(ui.profileTab==='records')return recordsTab(a,h);return overviewTab(a,h,own,squad)}
""")
replace(path,
 " const own=a.nation===managedNation(),squad=own&&!a.retired&&a.inSquad!==false,h=history(a),commit=squad?safe(()=>squadCommitRemaining(a),0):0,full=team().length>=cap();",
 " const own=a.nation===managedNation(),squad=own&&!a.retired&&a.inSquad!==false,h=history(a),st=stats(a),sb=seasonBest(a,h),commit=squad?safe(()=>squadCommitRemaining(a),0):0,full=team().length>=cap();")
replace(path,
 '<div class="apv2-rating"><div><small>Staff Ability</small><strong>${esc(ability(a))}</strong><span>${esc(safe(()=>assessmentConfidenceLabel(a,\'overall\')?.[0],\'Assessment\'))}</span></div><div><small>Development</small><strong>${esc(devText(a))}</strong><span>Staff projection</span></div><div><small>PB</small><strong>${esc(perf(a,a.pb))}</strong><span>${esc(disc(a))}</span></div><div><small>Status</small><strong>${esc(healthLabel(a))}</strong><span>${squad?\'National squad\':own?\'National pool\':\'International\'}</span></div></div>',
 '<div class="apv2-rating attributes-preview"><div><small>Personal Best</small><strong>${esc(perf(a,a.pb))}</strong><span>Career benchmark</span></div><div><small>Season Best</small><strong>${esc(sb==null?\'—\':perf(a,sb))}</strong><span>Current season</span></div><div><small>World Rank</small><strong>${st.rank?\'#\'+st.rank:\'—\'}</strong><span>${Number(a.points)||0} ranking points</span></div><div><small>Development</small><strong>${esc(devText(a))}</strong><span>Staff projection</span></div></div>')
replace(path,
 "[['overview','Overview'],['results','Results & Form'],['training','Training'],['development','Development'],['medical','Medical'],['records','Records']]",
 "[['overview','Overview'],['attributes','Attributes'],['results','Results & Form'],['training','Training'],['development','Development'],['medical','Medical'],['records','Records']]")

# Release manifest: one data authority for the preview scale.
replace('scripts/release-baseline.js',
 " athleteProfile:system('scripts/squad-athlete-v2.js',{label:'Athlete Profile'}),",
 " athleteProfile:system('scripts/squad-athlete-v2.js',{label:'Athlete Profile'}),\n athleteAttributes:system('scripts/athlete-attributes-v1.js',{label:'Athlete Attributes',scale:'1–20',rule:'no player-facing overall rating'}),")

# Static contracts and asset graph.
replace('tools/static-regression.mjs',
 " 'scripts/people-biography-v1.js',\n 'scripts/inbox-decision-core-v1.js',",
 " 'scripts/people-biography-v1.js',\n 'scripts/athlete-attributes-v1.js',\n 'scripts/inbox-decision-core-v1.js',")
replace('tools/static-regression.mjs',
 "before('scripts/people-biography-v1.js','scripts/squad-athlete-v2.js');",
 "before('scripts/people-biography-v1.js','scripts/athlete-attributes-v1.js');\nbefore('scripts/athlete-attributes-v1.js','scripts/squad-athlete-v2.js');")
replace('tools/static-regression.mjs',
 "'styles/ui-platform-v1.css','styles/home-v2.css','styles/inbox-v3.css','styles/squad-athlete-v2.css','styles/calendar-v2.css',",
 "'styles/ui-platform-v1.css','styles/home-v2.css','styles/inbox-v3.css','styles/squad-athlete-v2.css','styles/athlete-attributes-v1.css','styles/calendar-v2.css',")
replace('tools/static-regression.mjs',
 " 'scripts/nation-world-v1.js':[",
 " 'scripts/athlete-attributes-v1.js':[\n  ['window.AMAthleteAttributes','Athlete Attributes public service is missing'],\n  [\"const SCALE=20\",'Athlete Attributes must use the 1–20 preview scale'],\n  ['playerFacingOverall:false','Athlete Attributes must explicitly reject a player-facing Overall rating'],\n  ['acceleration','Sprint attribute model is missing'],\n  ['aerobicCapacity','Endurance attribute model is missing'],\n  ['takeOff','Jump attribute model is missing'],\n  ['explosivePower','Throws attribute model is missing']\n ],\n 'scripts/nation-world-v1.js':[")
replace('tools/static-regression.mjs',
 "  ['AMPeopleBiography','Athlete profile must use persistent biography data']",
 "  ['AMPeopleBiography','Athlete profile must use persistent biography data'],\n  ['AMAthleteAttributes','Athlete profile must use the 1–20 attribute service'],\n  ['Key Attributes','Squad and athlete overview must expose key attributes'],\n  [\"['attributes','Attributes']\",'Athlete profile Attributes tab is missing']")
replace('tools/static-regression.mjs',
 "const selectionDecisionSource=read('scripts/selection-decision-v3.js');",
 "const squadSource=read('scripts/squad-athlete-v2.js');\nif(squadSource.includes('<small>Staff Ability</small>'))fail('Athlete profile must not expose a combined Staff Ability / Overall score.');\nif(squadSource.includes(\"sortHead('ability','Ability'\"))fail('Squad table must not expose or sort by a combined Ability / Overall rating.');\n\nconst selectionDecisionSource=read('scripts/selection-decision-v3.js');")

# Runtime smoke ensures the preview authority is loaded and the public contract is 1–20/no Overall.
replace('tools/runtime-smoke.mjs',
 "'AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography','AMClubWorld'",
 "'AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography','AMAthleteAttributes','AMClubWorld'")
replace('tools/runtime-smoke.mjs',
 " if(w.AMNationWorld){",
 " if(w.AMAthleteAttributes){\n  try{\n   const attrs=w.AMAthleteAttributes.diagnostics();\n   if(!attrs||attrs.scale!==20||attrs.playerFacingOverall!==false)fail('Athlete Attributes preview must expose a 1–20 scale with no player-facing Overall.');\n   const sample=(w.s?.athletes||[])[0];\n   if(sample){const model=w.AMAthleteAttributes.get(sample);if(!model||model.attributes?.length!==8)fail('Athlete Attributes preview must produce exactly eight event-specific attributes.');if(model.attributes?.some(x=>x.score<1||x.score>20))fail('Athlete Attributes produced a rating outside the 1–20 scale.');}\n  }catch(err){fail(`Athlete Attributes diagnostics threw: ${err?.stack||err}`)}\n }\n if(w.AMNationWorld){")

# Architecture note for the preview authority.
replace('docs/ARCHITECTURE.md',
 "- Squad / Pool / Athlete Profile — `scripts/squad-athlete-v2.js`",
 "- Squad / Pool / Athlete Profile — `scripts/squad-athlete-v2.js`\n- Athlete Attributes (1–20 preview) — `scripts/athlete-attributes-v1.js`; no player-facing Overall rating")
