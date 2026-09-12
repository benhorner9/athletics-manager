from pathlib import Path


def replace_once(path, old, new):
    p=Path(path); text=p.read_text()
    if old not in text:
        raise SystemExit(f'missing target in {path}: {old[:120]!r}')
    if text.count(old)!=1:
        raise SystemExit(f'expected one target in {path}, found {text.count(old)}')
    p.write_text(text.replace(old,new,1))

# Athlete attribute model: keep exact truth internal, add player-facing scouting ranges.
replace_once('scripts/athlete-attributes-v1.js', "const VERSION='0.2.1-preview';", "const VERSION='0.3-preview';")
replace_once('scripts/athlete-attributes-v1.js',
"function band(score){const n=Number(score)||0;if(n>=20)return'elite';if(n>=18)return'excellent';if(n>=15)return'strong';if(n>=12)return'solid';if(n>=9)return'developing';return'limited'}",
"""function managedNationSafe(){try{return typeof managedNation==='function'?managedNation():s?.managedNation}catch(_){return null}}
function isManagedSquad(a){return !!a&&a.nation===managedNationSafe()&&a.inSquad!==false&&!a.retired}
function directIntel(a){try{return window.AMAttributeScouting?.knowledge?.(a)||{reports:0,bestScoutLevel:0,confidenceBonus:0,exact:false}}catch(_){return{reports:0,bestScoutLevel:0,confidenceBonus:0,exact:false}}}
function attributeKnowledge(a){
 if(isManagedSquad(a))return 100;
 const own=a?.nation===managedNationSafe();let base;
 try{base=typeof assessmentConfidence==='function'?Number(assessmentConfidence(a,'overall')):NaN}catch(_){base=NaN}
 if(!Number.isFinite(base))base=own?58:42;
 /* Programme access gives a better starting picture than public opposition analysis, but neither
    may silently become exact without the athlete joining the squad or direct scouting resolving it. */
 base=own?Math.min(base,84):Math.min(base,64);
 const intel=directIntel(a);return clamp(Math.round(base+Number(intel.confidenceBonus||0)),25,96);
}
function assessmentSpread(confidence){const c=Number(confidence)||0;if(c>=92)return 1;if(c>=82)return 2;if(c>=70)return 3;if(c>=55)return 4;if(c>=40)return 5;return 6}
function rangeWindow(truth,spread,seed){
 const value=clamp(Math.round(truth),1,SCALE),width=Math.max(1,Math.round(spread));let low=value-(seed%(width+1)),high=low+width;
 if(low<1){high+=1-low;low=1}if(high>SCALE){low-=high-SCALE;high=SCALE}low=clamp(low,1,SCALE);high=clamp(high,1,SCALE);
 if(low===high){if(high<SCALE)high++;else if(low>1)low--}return{low,high,mid:(low+high)/2};
}
function knowledgeLabel(exact,squad,confidence){if(exact)return squad?'Exact · squad knowledge':'Exact · fully scouted';if(confidence>=90)return'Very strong evidence';if(confidence>=75)return'Strong evidence';if(confidence>=55)return'Developing picture';return'Limited evidence'}
function assess(a){
 const truth=get(a),intel=directIntel(a),squad=isManagedSquad(a),exact=squad||intel.exact===true,confidence=exact?100:attributeKnowledge(a),spread=exact?0:assessmentSpread(confidence);
 const rows=truth.attributes.map(row=>{if(exact)return{key:row.key,label:row.label,abbr:row.abbr,low:row.score,high:row.score,mid:row.score,display:String(row.score),exact:true,band:band(row.score)};const win=rangeWindow(row.score,spread,hash(`${a?.id||a?.name}|${row.key}|attribute-uncertainty-v1`));return{key:row.key,label:row.label,abbr:row.abbr,low:win.low,high:win.high,mid:win.mid,display:`${win.low}–${win.high}`,exact:false,band:band(win.mid)}});
 return{version:VERSION,scale:SCALE,family:truth.family,familyLabel:truth.familyLabel,exact,confidence,knowledgeLabel:knowledgeLabel(exact,squad,confidence),reports:Number(intel.reports)||0,attributes:rows};
}
function topAssessed(a,count=3){return assess(a).attributes.slice().sort((x,y)=>y.mid-x.mid||x.label.localeCompare(y.label)).slice(0,Math.max(1,Number(count)||3))}
function weakestAssessed(a,count=2){return assess(a).attributes.slice().sort((x,y)=>x.mid-y.mid||x.label.localeCompare(y.label)).slice(0,Math.max(1,Number(count)||2))}
function band(score){const n=Number(score)||0;if(n>=20)return'elite';if(n>=18)return'excellent';if(n>=15)return'strong';if(n>=12)return'solid';if(n>=9)return'developing';return'limited'}""")
replace_once('scripts/athlete-attributes-v1.js',
"window.AMAthleteAttributes=Object.freeze({version:VERSION,scale:SCALE,get,top,weakest,audit,performanceRating,familyFor,familyLabel,band,bandLabel,diagnostics});",
"window.AMAthleteAttributes=Object.freeze({version:VERSION,scale:SCALE,get,assess,top,weakest,topAssessed,weakestAssessed,audit,performanceRating,attributeKnowledge,familyFor,familyLabel,band,bandLabel,diagnostics});")

# Canonical athlete UI must consume assessed ranges, never exact truth outside the managed squad.
replace_once('scripts/squad-athlete-v2.js',
"""function attributeModel(a){return safe(()=>window.AMAthleteAttributes?.get?.(a),{scale:20,familyLabel:'Performance profile',attributes:[]})}
function attributeTop(a,count=3){return safe(()=>window.AMAthleteAttributes?.top?.(a,count),attributeModel(a).attributes.slice(0,count))}
function squadKeyAttributes(a){const rows=attributeTop(a,3);return `<div class=\"sav2-keyattrs\">${rows.map(x=>`<span title=\"${esc(x.label)}\">${esc(x.abbr)} <b>${Number(x.score)||'—'}</b></span>`).join('')}</div>`}
function attributeGridHTML(a){const model=attributeModel(a);return `<div class=\"apv2-attribute-grid\">${model.attributes.map(x=>`<div class=\"apv2-attribute ${esc(x.band)}\" style=\"--attr:${Number(x.score)||0}\"><span>${esc(x.label)}</span><strong>${Number(x.score)||'—'}</strong><i></i></div>`).join('')}</div>`}
function attributeSnapshotHTML(a,count=4){const model=attributeModel(a),rows=attributeTop(a,count);return `<div class=\"apv2-keyattrs\">${rows.map(x=>`<div class=\"apv2-keyattr\"><small>${esc(x.abbr)}</small><strong>${Number(x.score)||'—'}</strong><span>${esc(x.label)}</span></div>`).join('')}</div><p class=\"apv2-action-note\">${esc(model.familyLabel)} · 1–${Number(model.scale)||20} staff scale · no combined rating.</p>`}""",
"""function attributeModel(a){return safe(()=>window.AMAthleteAttributes?.assess?.(a),{scale:20,familyLabel:'Performance profile',exact:false,knowledgeLabel:'Assessment pending',attributes:[]})}
function attributeTop(a,count=3){return safe(()=>window.AMAthleteAttributes?.topAssessed?.(a,count),attributeModel(a).attributes.slice(0,count))}
function attributeWeak(a,count=2){return safe(()=>window.AMAthleteAttributes?.weakestAssessed?.(a,count),attributeModel(a).attributes.slice().reverse().slice(0,count))}
function attrDisplay(x){return String(x?.display??(Number.isFinite(Number(x?.mid))?Number(x.mid):'—'))}
function squadKeyAttributes(a){const rows=attributeTop(a,3);return `<div class=\"sav2-keyattrs\">${rows.map(x=>`<span title=\"${esc(x.label)} · ${esc(attributeModel(a).knowledgeLabel)}\">${esc(x.abbr)} <b>${esc(attrDisplay(x))}</b></span>`).join('')}</div>`}
function attributeGridHTML(a){const model=attributeModel(a);return `<div class=\"apv2-attribute-grid\">${model.attributes.map(x=>`<div class=\"apv2-attribute ${esc(x.band)}\" style=\"--attr:${Number(x.mid)||0}\"><span>${esc(x.label)}</span><strong>${esc(attrDisplay(x))}</strong><i></i></div>`).join('')}</div>`}
function attributeSnapshotHTML(a,count=4){const model=attributeModel(a),rows=attributeTop(a,count);return `<div class=\"apv2-keyattrs\">${rows.map(x=>`<div class=\"apv2-keyattr\"><small>${esc(x.abbr)}</small><strong>${esc(attrDisplay(x))}</strong><span>${esc(x.label)}</span></div>`).join('')}</div><p class=\"apv2-action-note\">${esc(model.familyLabel)} · ${esc(model.knowledgeLabel)} · ${model.exact?'exact ratings':'staff ranges'}.</p>`}""")
replace_once('scripts/squad-athlete-v2.js',
"function attributesTab(a){const model=attributeModel(a),strengths=attributeTop(a,3),weak=safe(()=>window.AMAthleteAttributes?.weakest?.(a,2),model.attributes.slice(-2));return `<div class=\"apv2-grid\"><div class=\"apv2-stack\"><section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>Performance Attributes</strong><span>1–${Number(model.scale)||20}</span></div><div class=\"apv2-card-body\"><div class=\"apv2-attribute-intro\"><div><strong>${esc(model.familyLabel)}</strong><p>These ratings describe the qualities behind the athlete's performances. There is deliberately no combined Overall score.</p></div><span class=\"apv2-scale-chip\">1–20 scale</span></div>${attributeGridHTML(a)}</div></section></div><aside class=\"apv2-stack\"><section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>Staff Read</strong><span>Current assessment</span></div><div class=\"apv2-card-body\"><p class=\"apv2-action-note\" style=\"margin-top:0\"><strong style=\"color:#dce9f0\">Strongest qualities</strong><br>${strengths.map(x=>`${esc(x.label)} ${Number(x.score)}`).join(' · ')||'Assessment pending'}</p><p class=\"apv2-action-note\"><strong style=\"color:#dce9f0\">Development areas</strong><br>${weak.map(x=>`${esc(x.label)} ${Number(x.score)}`).join(' · ')||'Assessment pending'}</p></div></section><section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>How To Read It</strong><span>No aggregate rating</span></div><div class=\"apv2-card-body\"><p class=\"apv2-action-note\" style=\"margin-top:0\">18–20 is elite, 15–17 excellent, 12–14 strong, 9–11 solid and lower ratings identify areas that may limit performance. PBs, results, rankings and current condition remain separate factual evidence.</p></div></section></aside></div>`}",
"""function attributeScoutPanel(a,model){const st=safe(()=>window.AMAttributeScouting?.status?.(a),null);if(!st||st.state==='squad')return'';const reports=Number(safe(()=>window.AMAttributeScouting?.knowledge?.(a)?.reports,0))||0;const body=st.state==='complete'?'Your scouting team has resolved this athlete’s attribute profile. Future changes will come from new performance evidence, not hidden uncertainty.':st.state==='pending'?`An individual report is in progress. ${Number(st.weeks)||0} week${Number(st.weeks)===1?'':'s'} remain before the next assessment update.`:`Commission an individual report to tighten this athlete’s 1–20 attribute ranges. Repeated high-quality reports can eventually resolve exact ratings.`;return `<section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>Individual Scouting</strong><span>${reports} report${reports===1?'':'s'}</span></div><div class=\"apv2-card-body\"><p class=\"apv2-action-note\" style=\"margin-top:0\">${esc(body)}</p>${st.state==='ready'?`<button class=\"btn secondary\" data-apv2-scout=\"${esc(a.id)}\">${reports?'SCOUT AGAIN':'SCOUT ATHLETE'}</button>`:`<button class=\"btn ghost\" disabled>${esc(st.label||'SCOUTING')}</button>`}</div></section>`}
function attributesTab(a){const model=attributeModel(a),strengths=attributeTop(a,3),weak=attributeWeak(a,2);return `<div class=\"apv2-grid\"><div class=\"apv2-stack\"><section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>Performance Attributes</strong><span>${esc(model.knowledgeLabel||'Staff assessment')}</span></div><div class=\"apv2-card-body\"><div class=\"apv2-attribute-intro\"><div><strong>${esc(model.familyLabel)}</strong><p>${model.exact?'These are your performance team’s current exact working ratings for this athlete.':'These are staff assessment ranges, not hidden exact values. Scouting and programme access improve what your staff know.'}</p></div><span class=\"apv2-scale-chip\">1–20 scale</span></div>${attributeGridHTML(a)}</div></section></div><aside class=\"apv2-stack\"><section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>Staff Read</strong><span>${model.exact?'Resolved':'Estimated'}</span></div><div class=\"apv2-card-body\"><p class=\"apv2-action-note\" style=\"margin-top:0\"><strong style=\"color:#dce9f0\">Strongest qualities</strong><br>${strengths.map(x=>`${esc(x.label)} ${esc(attrDisplay(x))}`).join(' · ')||'Assessment pending'}</p><p class=\"apv2-action-note\"><strong style=\"color:#dce9f0\">Development areas</strong><br>${weak.map(x=>`${esc(x.label)} ${esc(attrDisplay(x))}`).join(' · ')||'Assessment pending'}</p></div></section>${attributeScoutPanel(a,model)}<section class=\"apv2-card\"><div class=\"apv2-card-head\"><strong>How To Read It</strong><span>No aggregate rating</span></div><div class=\"apv2-card-body\"><p class=\"apv2-action-note\" style=\"margin-top:0\">20 is exceptional world-class quality; 18–19 elite international; 15–17 international; 12–14 national; 9–11 domestic. PBs, official results and rankings remain factual public evidence.</p></div></section></aside></div>`}""")
replace_once('scripts/squad-athlete-v2.js',
" dialog.querySelector('#apv2Training')?.addEventListener('change',e=>{if(!own||!squad||a.retired)return;a.training=e.target.value;safe(()=>save(),null);safe(()=>toast('Training load updated'),null);renderProfile()});",
" dialog.querySelector('#apv2Training')?.addEventListener('change',e=>{if(!own||!squad||a.retired)return;a.training=e.target.value;safe(()=>save(),null);safe(()=>toast('Training load updated'),null);renderProfile()});\n dialog.querySelector('[data-apv2-scout]')?.addEventListener('click',()=>{if(window.AMAttributeScouting?.request?.(a.id))renderProfile()});")
replace_once('scripts/squad-athlete-v2.js',
"const title=mode==='pool'?'National Pool':'National Squad',description=mode==='pool'?'Athletes available to your national programme. Scout, test and promote from one consistent pathway view.':'Your active high-performance squad. Compare PBs, readiness, form and key performance attributes from one consistent view.';",
"const title=mode==='pool'?'National Pool':'National Squad',description=mode==='pool'?'Athletes available to your national programme. Attribute ranges tighten through scouting before a squad call-up reveals your full working assessment.':'Your active high-performance squad. Compare PBs, readiness, form and exact programme attribute assessments from one consistent view.';")

# Scouting copy: individual reports may resolve attribute ranges, but legacy hidden Overall remains hidden.
replace_once('scripts/scouting-v3.js',
"<div class=\"scv3-assignment-note\">Improving the scout network raises discovery quality and makes early ability ranges and development grades more reliable. Scouting never exposes an athlete's exact hidden ability.</div>",
"<div class=\"scv3-assignment-note\">Improving the scout network raises discovery quality and makes early assessments more reliable. Individual athlete reports tighten the new 1–20 attribute ranges and repeated high-quality reports can resolve them exactly; the legacy hidden Overall is never exposed.</div>")

# Load the scouting workflow after the scouting centre so it can share its reports/watchlist state.
replace_once('game.html',
'<script src="scripts/scouting-v3.js?v=20260911-scouting3compat"></script>',
'<script src="scripts/scouting-v3.js?v=20260911-scouting3compat"></script>\n<script src="scripts/attribute-scouting-v1.js?v=20260912-attributeintel1"></script>')
replace_once('game.html','scripts/athlete-attributes-v1.js?v=20260912-attributes20-preview1','scripts/athlete-attributes-v1.js?v=20260912-attributes20-intel1')
replace_once('game.html','scripts/squad-athlete-v2.js?v=20260912-attributes20-preview1','scripts/squad-athlete-v2.js?v=20260912-attributes20-intel1')

# Regression contracts: ranges outside squad, exact inside squad, scouting runtime present.
replace_once('tools/runtime-smoke.mjs',
"  '__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography','AMAthleteAttributes','AMClubWorld'",
"  '__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography','AMAthleteAttributes','AMAttributeScouting','AMClubWorld'")
replace_once('tools/runtime-smoke.mjs',
"   console.log(`[smoke] attribute audit: ${audit.athletes} athletes · avg ${audit.average}/20 · ${audit.twenties} twenties · ${audit.multipleTwenties} athletes with multiple 20s`);",
"""   console.log(`[smoke] attribute audit: ${audit.athletes} athletes · avg ${audit.average}/20 · ${audit.twenties} twenties · ${audit.multipleTwenties} athletes with multiple 20s`);
   const managed=auditState?.managedNation||'GREAT BRITAIN',squadSample=(auditState?.athletes||[]).find(a=>a.nation===managed&&a.inSquad!==false&&!a.retired),poolSample=(auditState?.athletes||[]).find(a=>a.nation===managed&&a.inSquad===false&&!a.retired),foreignSample=(auditState?.athletes||[]).find(a=>a.nation!==managed&&!a.retired);
   if(squadSample){const view=w.AMAthleteAttributes.assess(squadSample);if(!view?.exact||view.attributes.some(x=>x.low!==x.high))fail('Managed squad athlete attributes must be exact.');}
   if(poolSample){const view=w.AMAthleteAttributes.assess(poolSample);if(view?.exact||view.attributes.every(x=>x.low===x.high))fail('National Pool athlete attributes must remain ranges before sufficient scouting.');}
   if(foreignSample){const view=w.AMAthleteAttributes.assess(foreignSample);if(view?.exact||view.attributes.every(x=>x.low===x.high))fail('Foreign athlete attributes must not leak exact ratings without scouting.');}""")

print('attribute scouting uncertainty integrated')
