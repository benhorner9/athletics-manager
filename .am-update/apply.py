from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path)
    text=p.read_text()
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly 1 match in {path}, found {count}')
    p.write_text(text.replace(old,new,1))

# Core competition helpers: remove hidden Overall from selection/performance fallback.
replace_once('scripts/game.js',
"function performanceScore(a){return a.overall*.55+a.form*.25+a.fitness*.12+(100-a.fatigue)*.08}",
"function performanceScore(a){if(window.AMAthletePerformance?.selectionScore)return window.AMAthletePerformance.selectionScore(a);const d=a?.disc,q=DISCIPLINES?.[d],pb=Number(a?.pb),wr=Number(WORLD_RECORDS?.[d]),ratio=pb>0&&wr>0?(q?.type==='time'?wr/pb:pb/wr):.75,evidence=clamp(((ratio-.62)/.38)*100,0,100),ready=clamp((Number(a?.form)||80)*.40+(Number(a?.fitness)||85)*.35+(100-(Number(a?.fatigue)||15))*.25,0,100);return evidence*.78+ready*.22}",
'performanceScore authority')
replace_once('scripts/game.js',
"function rawPerformance(a,d,staffBonus=0){let q=DISCIPLINES[d],cond=(a.form*.42+a.fitness*.30+(100-a.fatigue)*.28+(athleteMorale(a)-65)*.1),perf;if(q.type==='time'){perf=a.pb+rand(.015,.13)+(80-cond)*.0035+(90-a.overall)*.0015-staffBonus*.01+rand(-.035,.045);return +perf.toFixed(2)}if(q.type==='height'){perf=a.pb+rand(-.08,.06)+(cond-80)*.002+(a.overall-85)*.0015+staffBonus*.012;return +clamp(perf,a.pb-.14,a.pb+.09).toFixed(2)}perf=a.pb+rand(-.65,.45)+(cond-80)*.018+(a.overall-85)*.018+staffBonus*.06;return +clamp(perf,a.pb-1.2,a.pb+.65).toFixed(2)}",
"function rawPerformance(a,d,staffBonus=0){if(window.AMAthletePerformance?.simulate)return window.AMAthletePerformance.simulate(a,d,staffBonus);const q=DISCIPLINES[d],pb=Math.max(.01,Number(a?.pb)||1),cond=(Number(a?.form)||80)*.42+(Number(a?.fitness)||85)*.30+(100-(Number(a?.fatigue)||15))*.28,ready=(cond-80)/100;if(q.type==='time'){const gap=clamp(.014-ready*.012-(Number(staffBonus)||0)*.0005,.003,.024);return +(pb*(1+gap+rand(-.0035,.0045))).toFixed(2)}if(q.type==='height'){return +clamp(pb-.055+ready*.05+(Number(staffBonus)||0)*.004+rand(-.035,.035),pb-.14,pb+.04).toFixed(2)}return +clamp(pb*.95+ready*pb*.025+(Number(staffBonus)||0)*.025+rand(-pb*.018,pb*.014),pb*.88,pb*1.01).toFixed(2)}",
'rawPerformance authority')

# Initial and future national squad setup should use objective performance evidence, not Overall.
replace_once('scripts/game.js',
"chosen=[...own].sort((a,b)=>b.overall-a.overall||a.age-b.age).slice(0,4).map(a=>a.id)",
"chosen=[...own].sort((a,b)=>performanceScore(b)-performanceScore(a)||a.age-b.age).slice(0,4).map(a=>a.id)",
'fresh squad selection')
replace_once('scripts/game.js',
"const a=own.filter(a=>a.disc===d).sort((a,b)=>b.overall-a.overall)[0]",
"const a=own.filter(a=>a.disc===d).sort((a,b)=>performanceScore(b)-performanceScore(a))[0]",
'career nation event leader')
replace_once('scripts/game.js',
"for(const a of [...own].sort((a,b)=>b.overall-a.overall))if(chosen.length<7&&!chosen.includes(a.id))chosen.push(a.id)",
"for(const a of [...own].sort((a,b)=>performanceScore(b)-performanceScore(a)))if(chosen.length<7&&!chosen.includes(a.id))chosen.push(a.id)",
'career nation squad depth')

# Opening world story and onboarding benchmarks should use the same evidence model.
replace_once('scripts/game.js',
"let stars=[...st.athletes].filter(a=>a.nation!==mn).sort((a,b)=>b.overall-a.overall).slice(0,3)",
"let stars=[...st.athletes].filter(a=>a.nation!==mn).sort((a,b)=>performanceScore(b)-performanceScore(a)).slice(0,3)",
'opening world stars')
replace_once('scripts/game.js',
"const squad=managedTeam(),star=[...squad].sort((a,b)=>b.overall-a.overall)[0],talent=[...squad,...nationalPool()].filter(a=>a.id!==star?.id&&a.age<=23).sort((a,b)=>(developmentProjectionEstimate(b)-assessmentMid(b,'overall'))-(developmentProjectionEstimate(a)-assessmentMid(a,'overall')))[0],rival=s.athletes.filter(a=>!a.retired&&a.nation!==managedNation()&&a.disc===star?.disc).sort((a,b)=>b.overall-a.overall)[0]",
"const squad=managedTeam(),star=[...squad].sort((a,b)=>performanceScore(b)-performanceScore(a))[0],talent=[...squad,...nationalPool()].filter(a=>a.id!==star?.id&&a.age<=23).sort((a,b)=>(developmentProjectionEstimate(b)-assessmentMid(b,'overall'))-(developmentProjectionEstimate(a)-assessmentMid(a,'overall')))[0],rival=s.athletes.filter(a=>!a.retired&&a.nation!==managedNation()&&a.disc===star?.disc).sort((a,b)=>performanceScore(b)-performanceScore(a))[0]",
'legacy first day people')
replace_once('scripts/game.js',
"return [...managedTeam()].filter(a=>a.disc===prospect.disc&&!a.retired).sort((a,b)=>b.overall-a.overall||b.form-a.form)[0]||null;",
"return [...managedTeam()].filter(a=>a.disc===prospect.disc&&!a.retired).sort((a,b)=>performanceScore(b)-performanceScore(a)||b.form-a.form)[0]||null;",
'opening squad benchmark')
replace_once('scripts/game.js',
"function openingInternationalBenchmark(d){return [...s.athletes].filter(a=>!a.retired&&a.nation!==managedNation()&&a.disc===d).sort((a,b)=>b.overall-a.overall)[0]||null}",
"function openingInternationalBenchmark(d){return [...s.athletes].filter(a=>!a.retired&&a.nation!==managedNation()&&a.disc===d).sort((a,b)=>performanceScore(b)-performanceScore(a))[0]||null}",
'opening international benchmark')
replace_once('scripts/game.js',
"const squad=managedTeam(),star=[...squad].sort((a,b)=>b.overall-a.overall)[0],talent=openingProspect()",
"const squad=managedTeam(),star=[...squad].sort((a,b)=>performanceScore(b)-performanceScore(a))[0],talent=openingProspect()",
'first15 star benchmark')

# Autonomous competition fields and rival programme selection.
replace_once('scripts/game.js',
"rivals=s.athletes.filter(a=>!a.retired&&a.nation!==managedNation()&&a.disc===d&&!a.camp).sort((a,b)=>b.overall-a.overall||String(a.id).localeCompare(String(b.id))).slice(0,Math.max(0,8-own.length))",
"rivals=s.athletes.filter(a=>!a.retired&&a.nation!==managedNation()&&a.disc===d&&!a.camp).sort((a,b)=>performanceScore(b)-performanceScore(a)||String(a.id).localeCompare(String(b.id))).slice(0,Math.max(0,8-own.length))",
'league rival field')
replace_once('scripts/game.js',
"else if(p.strategy==='Pathway-led'){score+=(a.age<=23?(major?1:3):0)+(a.potential-a.overall)*.08}",
"else if(p.strategy==='Pathway-led'){score+=(a.age<=23?(major?1:3):0)+(a.form-80)*.04+(a.fitness-85)*.025}",
'pathway rival selection')
replace_once('scripts/game.js',
"if(e.elite&&a.overall<80)return false;if(e.qualified&&e.id!=='olympics'&&!(a.points>=6||a.overall>=80))return false;",
"if(e.elite&&performanceScore(a)<64)return false;if(e.qualified&&e.id!=='olympics'&&!(a.points>=6||performanceScore(a)>=64))return false;",
'event eligibility')

# World circuit star/injury logic should not use hidden Overall either.
replace_once('scripts/game.js',
"let stars=world.filter(a=>a.overall>=88&&a.injury===0);",
"let stars=world.filter(a=>performanceScore(a)>=78&&a.injury===0);",
'world injury star pool')
replace_once('scripts/game.js',
"priority:a.overall>=93?'major':'normal'",
"priority:performanceScore(a)>=88?'major':'normal'",
'world injury priority')

# Load canonical performance authority immediately after the 1-20 attribute model.
replace_once('game.html',
'<script src="scripts/athlete-attributes-v1.js?v=20260912-attributes20-intel1"></script>\n<script src="scripts/squad-athlete-v2.js?v=20260912-attributes20-intel1"></script>',
'<script src="scripts/athlete-attributes-v1.js?v=20260912-attributes20-intel1"></script>\n<script src="scripts/athlete-performance-v1.js?v=20260912-performance1"></script>\n<script src="scripts/squad-athlete-v2.js?v=20260912-attributes20-intel1"></script>',
'performance module load order')

# Declare one canonical authority in the release manifest.
replace_once('scripts/release-baseline.js',
" athleteAttributes:system('scripts/athlete-attributes-v1.js',{label:'Athlete Attributes',scale:'1–20',rule:'no player-facing overall rating'}),",
" athleteAttributes:system('scripts/athlete-attributes-v1.js',{label:'Athlete Attributes',scale:'1–20',rule:'no player-facing overall rating'}),\n athletePerformance:system('scripts/athlete-performance-v1.js',{label:'Athlete Competition Performance',rule:'attributes + objective evidence + readiness; hidden Overall excluded'}),",
'performance release authority')

# Runtime smoke: require the model and prove Overall cannot affect competition judgement.
replace_once('tools/runtime-smoke.mjs',
"'AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography','AMAthleteAttributes','AMAttributeScouting','AMClubWorld'",
"'AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography','AMAthleteAttributes','AMAthletePerformance','AMAttributeScouting','AMClubWorld'",
'performance runtime global')
marker=" if(w.AMNationWorld){\n"
block=""" if(w.AMAthletePerformance){
  try{
   const perf=w.AMAthletePerformance,diag=perf.diagnostics();
   if(!diag||diag.version!=='1.0'||diag.usesOverall!==false)fail('Athlete Performance V1 must exclude hidden Overall.');
   const state=typeof w.fresh==='function'?w.fresh('GREAT BRITAIN'):w.s,sample=(state?.athletes||[]).find(a=>!a.retired);
   if(!sample)fail('Athlete Performance V1 could not find a sample athlete.');
   else{
    const low={...sample,overall:40},high={...sample,overall:99};
    const lowScore=perf.selectionScore(low),highScore=perf.selectionScore(high),lowMark=perf.expectedMark(low,low.disc),highMark=perf.expectedMark(high,high.disc);
    if(Math.abs(lowScore-highScore)>.000001)fail(`Hidden Overall changed competition selection score: ${lowScore} vs ${highScore}.`);
    if(Math.abs(lowMark-highMark)>.000001)fail(`Hidden Overall changed expected competition performance: ${lowMark} vs ${highMark}.`);
    if(typeof w.performanceScore==='function'&&Math.abs(w.performanceScore(low)-w.performanceScore(high))>.000001)fail('Legacy performanceScore still responds to hidden Overall.');
   }
  }catch(err){fail(`Athlete Performance V1 diagnostics threw: ${err?.stack||err}`)}
 }
"""
p=Path('tools/runtime-smoke.mjs');text=p.read_text()
if marker not in text: raise SystemExit('runtime performance insertion marker missing')
p.write_text(text.replace(marker,block+marker,1))

# Documentation records the competition cutover boundary.
p=Path('docs/ATTRIBUTE-RATING-SCALE.md')
text=p.read_text()
append="""

## Competition authority

Competition selection and performance no longer use the legacy hidden Overall value. Athlete fields, World Tour invitations, Summit opposition, league opposition, qualification fallback ordering and non-live competition marks use the event-specific 1–20 attribute model, objective performance evidence and current readiness. Overall remains only as legacy development data until the separate training/progression migration removes it.
"""
if '## Competition authority' not in text:
    p.write_text(text.rstrip()+append+'\n')
