from pathlib import Path


def rep(path, old, new, expected=1, all_matches=False):
    p=Path(path); text=p.read_text(); count=text.count(old)
    if expected is not None and count!=expected:
        raise SystemExit(f'{path}: expected {expected} matches for {old[:60]!r}, found {count}')
    p.write_text(text.replace(old,new,-1 if all_matches else 1))

# New engine cleanup before syntax validation.
rep('scripts/training-system-v4.js',"intensity.id==='high'?-1:intensity.id==='low'?.5:0","intensity.id==='high'?-1:intensity.id==='low' ? .5 : 0")
rep('scripts/training-system-v4.js',"base=.32*intensity.stimulus*adaptation(m)*relationship(a)*quality*Math.max(.1,Number(externalMultiplier)||1)","base=.32*intensity.stimulus*adaptation(m)*(managedAthlete?relationship(a):1)*quality*Math.max(.1,Number(externalMultiplier)||1)")

# Persist athlete attributes in save data.
p=Path('scripts/athlete-attributes-v1.js'); text=p.read_text().replace("const VERSION='0.3-preview';","const VERSION='1.0';",1)
start=text.index('function get(a){'); end=text.index('function managedNationSafe()',start)
old=text[start:end]; generated=old.replace('function get(a){','function generatedProfile(a){',1)
persistent=r'''function ensurePersistent(a){
 if(!a)return null;const seed=generatedProfile(a),stored=(a.attributeRatings&&typeof a.attributeRatings==='object')?a.attributeRatings:(a.attributeRatings={});
 for(const row of seed.attributes)stored[row.key]=Number.isFinite(Number(stored[row.key]))?clamp(Math.round(Number(stored[row.key])),1,SCALE):row.score;
 return stored
}
function setAttribute(a,key,value){if(!a)return null;const seed=generatedProfile(a);if(!seed.attributes.some(row=>row.key===key))return null;const stored=ensurePersistent(a);stored[key]=clamp(Math.round(Number(value)),1,SCALE);return stored[key]}
function get(a){const seed=generatedProfile(a);if(!a)return seed;const stored=ensurePersistent(a),rows=seed.attributes.map(row=>({...row,score:clamp(Math.round(Number(stored[row.key]??row.score)),1,SCALE)}));rows.forEach(row=>row.band=band(row.score));const base=rows.length?rows.reduce((n,row)=>n+row.score,0)/rows.length:seed.base;return{...seed,version:VERSION,base:+Number(base).toFixed(2),persistent:true,attributes:rows}}
'''
text=text[:start]+generated+persistent+text[end:]
old_diag="function diagnostics(){return{version:VERSION,scale:SCALE,families:Object.keys(SETS),playerFacingOverall:false,calibration:'PB + event standards',eliteRule:'20 requires exceptional event performance and is capped at one attribute per athlete',bands:{20:'Exceptional','18-19':'Elite International','15-17':'International','12-14':'National','9-11':'Domestic','6-8':'Developing','1-5':'Raw'}}}"
new_diag="function diagnostics(){return{version:VERSION,scale:SCALE,families:Object.keys(SETS),playerFacingOverall:false,persistent:true,calibration:'persistent attributes seeded from PB + event standards',developmentAuthority:'Training System 2.0',eliteRule:'20 is exceptional; Training System 2.0 uses hidden attribute-specific development ceilings',bands:{20:'Exceptional','18-19':'Elite International','15-17':'International','12-14':'National','9-11':'Domestic','6-8':'Developing','1-5':'Raw'}}}"
if old_diag not in text: raise SystemExit('attribute diagnostics anchor missing')
text=text.replace(old_diag,new_diag,1)
old_api="window.AMAthleteAttributes=Object.freeze({version:VERSION,scale:SCALE,get,assess,top,weakest,topAssessed,weakestAssessed,audit,performanceRating,attributeKnowledge,familyFor,familyLabel,band,bandLabel,diagnostics});"
new_api="window.AMAthleteAttributes=Object.freeze({version:VERSION,scale:SCALE,get,assess,top,weakest,topAssessed,weakestAssessed,audit,performanceRating,attributeKnowledge,familyFor,familyLabel,band,bandLabel,ensurePersistent,setAttribute,diagnostics});"
if old_api not in text: raise SystemExit('attribute API anchor missing')
text=text.replace(old_api,new_api,1); p.write_text(text)

# Loader and release authority.
rep('game.html','<script src="scripts/training-v3.js?v=20260911-training31"></script>\n<script src="scripts/scouting-v3.js?v=20260911-scouting3compat"></script>','<script src="scripts/training-v3.js?v=20260911-training31"></script>\n<script src="scripts/training-system-v4.js?v=20260912-training20-1"></script>\n<script src="scripts/scouting-v3.js?v=20260911-scouting3compat"></script>')
rep('scripts/release-baseline.js'," training:system('scripts/training-v2-bootstrap.js',{label:'Training',enhancement:'scripts/training-v3.js',rule:'one visible Training Centre'}),"," training:system('scripts/training-system-v4.js',{label:'Training System 2.0',compatibility:'scripts/training-v2-bootstrap.js + scripts/training-v3.js',rule:'individual 1–20 attributes are the development authority; hidden Overall/Potential excluded from weekly development'}),")

# Core training/camp integration.
rep('scripts/game.js',"const CAMP_OPTIONS={development:{name:'Development Camp',weeks:2,cost:200000,gain:2,form:5,fatigue:8,desc:'Two weeks of event-specific coaching with a strong development stimulus, +5 form and +8 fatigue. Staff assessments are reviewed on return.'},elite:{name:'Elite Technical Camp',weeks:4,cost:450000,gain:3,form:8,fatigue:15,desc:'Four weeks of intensive event-specific work with a very strong development stimulus, +8 form and +15 fatigue. Staff assessments are reviewed on return.'},recovery:{name:'Recovery Retreat',weeks:2,cost:150000,gain:0,form:3,fatigue:-35,desc:'Two weeks away: +3 form, +12 fitness and -35 fatigue. Healthy athletes only; not an injury treatment.'}};","const CAMP_OPTIONS={development:{name:'Development Camp',weeks:2,cost:200000,gain:0,form:5,fatigue:8,desc:'Two weeks of event-specific coaching that adds development progress to the athlete’s current attribute focus, +5 form and +8 fatigue.'},elite:{name:'Elite Technical Camp',weeks:4,cost:450000,gain:0,form:8,fatigue:15,desc:'Four weeks of intensive event-specific work with a strong attribute-development stimulus, +8 form and +15 fatigue.'},recovery:{name:'Recovery Retreat',weeks:2,cost:150000,gain:0,form:3,fatigue:-35,desc:'Two weeks away: +3 form, +12 fitness and -35 fatigue. No attribute-development stimulus; healthy athletes only.'}};")
rep('scripts/game.js','function updateCamps(){for(const a of s.athletes){','function updateCamps(){if(window.AMTrainingSystem2?.updateCamps)return window.AMTrainingSystem2.updateCamps();for(const a of s.athletes){')
p=Path('scripts/game.js'); text=p.read_text(); start=text.index('function processWeek(){'); end=text.index('\n\nfunction indoorTestingGapText',start)
new_process=r'''function processWeek(){runPlannedTesting();const weeklyBefore=beginWeeklyReview();let gb=managedTeam(),mn=managedNation();if(window.AMTrainingSystem2?.processManagedWeek){window.AMTrainingSystem2.processManagedWeek(gb,mn);window.AMTrainingSystem2.processWorldWeek?.()}else{gb.forEach(a=>{if(a.camp)return;if(a.injury>0){if(!seriousInjuryActive(a))progressStandardInjury(a);else{a.fitness=clamp(a.fitness+4+s.staff.physio+(facilityLevel('recovery')-1)*.5,50,75);a.fatigue=clamp(a.fatigue-8-s.staff.science-(facilityLevel('recovery')-1),0,100)}return}let focus=s.trainingFocus,discBonus=(isSprintDiscipline(a.disc)?s.staff.sprint:a.disc.includes('HJ')?s.staff.jumps:s.staff.throws),facility=athleteFacility(a);let gain=.15*(discBonus+facility);let fatigue=5;if(focus==='Recovery'){a.fatigue-=14+s.staff.science*2;a.fitness+=4+(facilityLevel('recovery')-1)*.5;a.form+=1}else{if(focus==='Speed'&&isSprintDiscipline(a.disc))gain+=.55;if(focus==='Strength'&&(a.disc.includes('SP')||a.disc.includes('HJ')))gain+=.45;if(focus==='Technique'&&(a.disc.includes('SP')||a.disc.includes('HJ')))gain+=.4;if(focus==='Balanced')gain+=.2;if(a.training==='Push'){gain+=.35;fatigue+=6}if(a.training==='Recovery'){gain*=.45;fatigue-=7}gain*=relationshipTraining(a);a.form+=rand(-1,1.5)+gain;a.fatigue+=fatigue-s.staff.science*1.1;a.fitness+=rand(-1,1)+.25*facilityLevel('recovery')}a.fatigue-=facilityLevel('recovery')-1;a.form=clamp(Math.round(a.form),55,99);a.fatigue=clamp(Math.round(a.fatigue),0,100);a.fitness=clamp(Math.round(a.fitness),55,100);let risk=Math.max(0,(a.fatigue-65)*.0015)+(6-s.staff.physio)*.002;if(Math.random()<risk)startTrainingInjury(a)})}simulateWorldWeek();updateWeeklyTraits();finishWeeklyReview(weeklyBefore)}'''
text=text[:start]+new_process+text[end:]; p.write_text(text)

rep('scripts/game.js',"function beginWeeklyReview(){immersionState();return managedTeam().map(a=>({id:a.id,name:a.name,form:a.form,fitness:a.fitness,fatigue:a.fatigue,overall:a.overall,injury:a.injury,training:s.trainingFocus==='Recovery'?'National recovery':a.training}))}","function beginWeeklyReview(){immersionState();return managedTeam().map(a=>({id:a.id,name:a.name,form:a.form,fitness:a.fitness,fatigue:a.fatigue,injury:a.injury,training:window.AMTrainingSystem2?.ensureDevelopment?window.AMTrainingSystem2.ensureDevelopment(a)?.focus:(s.trainingFocus==='Recovery'?'National recovery':a.training),attributes:window.AMTrainingSystem2?.snapshot?.(a)||null}))}")
rep('scripts/game.js',"function finishWeeklyReview(before){s.immersion.weekly={season:s.game.season,week:s.game.week,changes:before.map(old=>{const a=s.athletes.find(a=>a.id===old.id);if(!a.retired&&old.injury>0&&a.injury===0){athleteStory(a).awaitingComeback=true;rememberAthlete(a,'Recovery','Medically cleared and available to rebuild competition fitness.')}return {...old,fatigueChange:a.fatigue-old.fatigue,formChange:a.form-old.form,fitnessChange:a.fitness-old.fitness,abilityChange:a.overall-old.overall,newInjury:old.injury===0&&a.injury>0}})}}","function finishWeeklyReview(before){s.immersion.weekly={season:s.game.season,week:s.game.week,changes:before.map(old=>{const a=s.athletes.find(a=>a.id===old.id);if(!a.retired&&old.injury>0&&a.injury===0){athleteStory(a).awaitingComeback=true;rememberAthlete(a,'Recovery','Medically cleared and available to rebuild competition fitness.')}return {...old,fatigueChange:a.fatigue-old.fatigue,formChange:a.form-old.form,fitnessChange:a.fitness-old.fitness,attributeChanges:window.AMTrainingSystem2?.diffSnapshot?.(old.attributes,a)||[],newInjury:old.injury===0&&a.injury>0}})}}")

old_board="function boardAssessment(){const b=immersionState().board,rank=nationRanks().findIndex(x=>x[0]===managedNation())+1,improved=managedNationAthletes().filter(a=>b.baseline[a.id]!==undefined&&a.overall>b.baseline[a.id]).length;return `Board objectives: ${rank<=b.targetRank?'nation-ranking target met':'nation-ranking target not yet met'} (target top ${b.targetRank}); ${b.prospects.length}/${b.targetProspects} young athletes given international opportunities; ${improved} returning athletes improved their overall ability. Federation priority: ${b.priority||nationalIdentityBlueprint().board.priority} Current programme identity: ${nationalIdentityLabel()}.` }"
new_board="function boardAssessment(){const b=immersionState().board,rank=nationRanks().findIndex(x=>x[0]===managedNation())+1,improved=window.AMTrainingSystem2?.boardImprovedCount?.()??managedNationAthletes().filter(a=>b.baseline[a.id]!==undefined&&a.overall>b.baseline[a.id]).length;return `Board objectives: ${rank<=b.targetRank?'nation-ranking target met':'nation-ranking target not yet met'} (target top ${b.targetRank}); ${b.prospects.length}/${b.targetProspects} young athletes given international opportunities; ${improved} returning athletes show measurable attribute development. Federation priority: ${b.priority||nationalIdentityBlueprint().board.priority} Current programme identity: ${nationalIdentityLabel()}.` }"
rep('scripts/game.js',old_board,new_board)
p=Path('scripts/game.js'); text=p.read_text(); old="improved=known.filter(a=>a.overall>b.baseline[a.id]).length"; count=text.count(old)
if count<1: raise SystemExit('home development count anchor missing')
text=text.replace(old,"improved=window.AMTrainingSystem2?.boardImprovedCount?.()??known.filter(a=>a.overall>b.baseline[a.id]).length")
text=text.replace('show an improved staff ability assessment','show measurable attribute development')
text=text.replace("${c.abilityChange?' • Ability '+delta(c.abilityChange):''}","${c.attributeChanges?.length?' • '+c.attributeChanges.map(x=>x.label+' '+x.from+'→'+x.to).join(', '):''}")
start=text.index('const FIRST_DAY_PLANS='); end=text.index(';\nfunction firstDayPeople()',start)
text=text[:start]+"const FIRST_DAY_PLANS={Balanced:{title:'Set individual foundations',tag:'Individual foundations',text:'Your coaches start each athlete on an event-specific development block with standard load.',trade:'A measured opening. You can change every athlete’s focus and load in Training.'},Recovery:{title:'Fresh legs first',tag:'Recovery opening',text:'Begin the squad on recovery work before moving athletes into individual development blocks.',trade:'You give up early development stimulus to arrive fresher.'},Technique:{title:'Sharpen technical groups',tag:'Technical opening',text:'Jumpers and throwers begin with technical work while track athletes start their event-specific foundations.',trade:'A targeted opening that you can individualise after the first weekly report.'}}"+text[end:]
p.write_text(text)

# Runtime contracts.
p=Path('tools/runtime-smoke.mjs'); text=p.read_text()
old="'AMAthleteAttributes','AMAthletePerformance','AMAttributeScouting','AMClubWorld'"
if old not in text: raise SystemExit('runtime globals anchor missing')
text=text.replace(old,"'AMAthleteAttributes','AMAthletePerformance','AMTrainingSystem2','AMAttributeScouting','AMClubWorld'",1)
text=text.replace("if(attrs.calibration!=='PB + event standards')fail('Athlete Attributes must be calibrated from objective performance standards.');","if(attrs.calibration!=='persistent attributes seeded from PB + event standards'||attrs.persistent!==true)fail('Athlete Attributes must be persistent save data seeded from objective performance standards.');",1)
marker=' if(w.AMNationWorld){\n'
if marker not in text: raise SystemExit('runtime training insertion marker missing')
block=r''' if(w.AMTrainingSystem2){
  try{
   const training=w.AMTrainingSystem2,diag=training.diagnostics();
   if(!diag||diag.version!=='2.0'||diag.usesOverall!==false||diag.usesPotential!==false)fail('Training System 2.0 must use individual attributes without Overall/Potential.');
   const state=typeof w.fresh==='function'?w.fresh('GREAT BRITAIN'):null,sample=(state?.athletes||[]).find(a=>a.nation===state?.managedNation&&a.inSquad!==false&&!a.retired);
   if(!sample)fail('Training System 2.0 could not find a managed athlete.');
   else{
    const stored=w.AMAthleteAttributes.ensurePersistent(sample),model=w.AMAthleteAttributes.get(sample),row=model.attributes.find(x=>x.score<20)||model.attributes[0],old=row.score,next=Math.min(20,old+1);
    w.AMAthleteAttributes.setAttribute(sample,row.key,next);
    if(w.AMAthleteAttributes.get(sample).attributes.find(x=>x.key===row.key)?.score!==next)fail('Persistent athlete attribute mutation did not survive a profile read.');
    w.AMAthleteAttributes.setAttribute(sample,row.key,old);
    const low=JSON.parse(JSON.stringify(sample)),high=JSON.parse(JSON.stringify(sample));delete low.attributeDevelopment;delete high.attributeDevelopment;low.overall=40;low.potential=41;high.overall=99;high.potential=99;
    const lowDev=training.ensureDevelopment(low),highDev=training.ensureDevelopment(high);
    if(JSON.stringify(lowDev.ceilings)!==JSON.stringify(highDev.ceilings))fail('Hidden Overall/Potential still changes Training System 2.0 development ceilings.');
    if(!stored||Object.keys(stored).length!==8)fail('Training System 2.0 did not persist eight event-specific athlete ratings.');
   }
   training.render();if(!w.document.querySelector('#training .tr4-shell'))fail('Training System 2.0 did not render the canonical Training Centre.');
  }catch(err){fail(`Training System 2.0 diagnostics threw: ${err?.stack||err}`)}
 }
'''
text=text.replace(marker,block+marker,1); p.write_text(text)

Path('docs/TRAINING-SYSTEM-2.md').write_text('''# Training System 2.0\n\nTraining System 2.0 makes the athlete’s persistent 1–20 event attributes the development authority. Weekly training no longer improves a hidden Overall score and does not use legacy Potential to decide development ceilings.\n\n- Squad attributes are persistent save data.\n- Each attribute has hidden progress and an attribute-specific ceiling.\n- Ceilings use current rating, age and a deterministic athlete development profile — not Overall/Potential.\n- Higher ratings require more accumulated work; 18–20 are deliberately difficult to improve.\n- Physical qualities develop faster when young and decline earlier than technical/mental qualities.\n- Athlete-specific focus and Reduced / Standard / High / Recovery load control stimulus, fatigue and injury exposure.\n- Coaches, facilities, current level, age, remaining room, relationship and block adaptation modify progress.\n- PBs remain factual competition evidence and do not automatically rewrite attributes.\n- Camps add concentrated progress to the current focus; recovery camps add no attribute development.\n- Club/world athletes receive autonomous development so the player squad does not progress in isolation.\n\nExisting careers seed the persistent ratings from the calibrated profile already in the save. Old national training-focus settings are converted once into individual programmes. Legacy Overall/Potential may remain in older save objects for compatibility with systems still awaiting migration, but Training System 2.0 does not read them.\n''')
