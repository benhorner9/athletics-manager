from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')

def write(path, text):
    Path(path).write_text(text, encoding='utf-8')

def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

# Event AI: make attributes the live-event outcome authority.
p='scripts/event-ai-realism.js'
s=read(p)
s=replace_once(s,"const EVENT_AI_VERSION=1;","const EVENT_AI_VERSION=2;",'event AI version')
anchor="function athlete(id){return (s?.athletes||[]).find(a=>a.id===id)||null}\n"
helpers=r'''function athlete(id){return (s?.athletes||[]).find(a=>a.id===id)||null}
function attributeModel(a){try{return window.AMAthleteAttributes?.get?.(a)||null}catch(_){return null}}
function attributeProfile(a,d){
 const model=attributeModel(a);if(!model?.attributes?.length)return null;
 const values=Object.fromEntries(model.attributes.map(x=>[x.key,Number(x.score)||10]));
 const get=(key,fallback=10)=>Number.isFinite(values[key])?values[key]:fallback;
 const family=model.family||window.AMAthleteAttributes?.familyFor?.(a)||'general',n=distance(d);let weights;
 if(family==='sprint')weights=n<=100?{acceleration:.18,maxVelocity:.24,speedEndurance:.12,start:.14,power:.12,technique:.08,consistency:.06,composure:.06}:n<=200?{acceleration:.12,maxVelocity:.20,speedEndurance:.22,start:.08,power:.10,technique:.10,consistency:.09,composure:.09}:{acceleration:.06,maxVelocity:.12,speedEndurance:.28,start:.05,power:.09,technique:.12,consistency:.14,composure:.14};
 else if(family==='endurance')weights=n<=800?{aerobicCapacity:.14,threshold:.14,runningEconomy:.10,endurance:.12,kickSpeed:.16,tacticalJudgement:.14,consistency:.10,composure:.10}:n<=1500?{aerobicCapacity:.18,threshold:.18,runningEconomy:.14,endurance:.15,kickSpeed:.10,tacticalJudgement:.10,consistency:.08,composure:.07}:{aerobicCapacity:.24,threshold:.20,runningEconomy:.18,endurance:.18,kickSpeed:.04,tacticalJudgement:.06,consistency:.06,composure:.04};
 else if(family==='jump')weights={approachSpeed:.15,takeOff:.24,elasticity:.13,technique:.20,coordination:.10,power:.08,consistency:.05,composure:.05};
 else if(family==='throw')weights={strength:.14,explosivePower:.24,releaseSpeed:.24,technique:.18,coordination:.08,mobility:.04,consistency:.04,composure:.04};
 else weights=Object.fromEntries(model.attributes.map(x=>[x.key,1/model.attributes.length]));
 let sum=0,total=0;for(const [key,w] of Object.entries(weights)){sum+=get(key)*w;total+=w}const score=total?sum/total:10;
 let attributeRace=null;
 if(family==='sprint')attributeRace={start:get('acceleration')*.45+get('start')*.35+get('power')*.20,middle:get('maxVelocity')*.55+get('technique')*.20+get('power')*.15+get('consistency')*.10,finish:get('speedEndurance')*.55+get('maxVelocity')*.15+get('technique')*.10+get('consistency')*.10+get('composure')*.10};
 else if(family==='endurance')attributeRace={start:get('tacticalJudgement')*.35+get('runningEconomy')*.30+get('threshold')*.20+get('composure')*.15,middle:get('aerobicCapacity')*.28+get('threshold')*.24+get('runningEconomy')*.20+get('endurance')*.20+get('consistency')*.08,finish:get('kickSpeed')*.35+get('endurance')*.20+get('threshold')*.15+get('tacticalJudgement')*.10+get('consistency')*.10+get('composure')*.10};
 return{family,score:+score.toFixed(2),consistency:get('consistency'),composure:get('composure'),technique:get('technique'),power:family==='throw'?(get('explosivePower')+get('releaseSpeed'))/2:get('power'),attributeRace};
}
function programmeSupport(a,d){try{if(!a||a.nation!==managedNation()||a.inSquad===false)return 0;const staff=isTrack(d)?(distance(d)<=400?s.staff.sprint:Math.max(s.staff.sprint||1,s.staff.science||1)):String(d).includes('HJ')?s.staff.jumps:s.staff.throws;const facility=typeof athleteFacility==='function'?athleteFacility(a):1;return Math.max(0,(Number(staff)||1)-1+(Number(facility||1)-1)*.5)}catch(_){return 0}}
function attributeTrackBase(a,d,fallback){const profile=attributeProfile(a,d),pb=Number(a?.pb);if(!profile||!Number.isFinite(pb)||pb<=0)return Number(fallback)||pb||1;const quality=(profile.score-1)/19,repeat=(profile.consistency-1)/19;let gap=.0145-quality*.0065-repeat*.0025-programmeSupport(a,d)*.00045;gap=Math.max(.0025,Math.min(.016,gap));return pb*(1+gap)}
function attributeFieldAnchor(a,d,fallback){const profile=attributeProfile(a,d),pb=Number(a?.pb);if(!profile||!Number.isFinite(pb)||pb<=0)return Number(fallback)||pb||1;const quality=(profile.score-1)/19,repeat=(profile.consistency-1)/19,ratio=Math.max(.90,Math.min(.985,.905+quality*.045+repeat*.015+programmeSupport(a,d)*.0011));return pb*ratio}
function attributeHeightCap(a,d,fallback){const profile=attributeProfile(a,d),pb=Number(a?.pb);if(!profile||!Number.isFinite(pb)||pb<=0)return Number(fallback)||pb||2;const quality=(profile.score-1)/19,repeat=(profile.consistency-1)/19;let gap=.095-quality*.045-repeat*.015-programmeSupport(a,d)*.0025;return pb-Math.max(.015,Math.min(.10,gap))}
'''
s=replace_once(s,anchor,helpers,'attribute helper insertion')

track_fn=r'''function trackPlan(e,d,row){
 const a=athlete(row.id),n=distance(d),key=eventKey(e,d,row.id),cond=condition(a),importance=eventWeight(e),style=athleteStyle(a,key,n),ap=attributeProfile(a,d),race=ap?.attributeRace||null;
 const consistency=ap?.consistency??10,varianceScale=Math.max(.72,Math.min(1.22,1.18-(consistency-10)*.025));
 let scenario='Normal race',raceStyle=style,delta=normal(key+'|day')*trackVariance(d)*importance*varianceScale;
 const roll=u(key+'|scenario'),startFactor=race?Math.max(.65,Math.min(1.35,1.08-(race.start-10)*.035)):1,finishFactor=race?Math.max(.65,Math.min(1.35,1.08-(race.finish-10)*.035)):1,executionFactor=ap?Math.max(.72,Math.min(1.28,.92+(ap.score-10)*.025)):1;
 if(n<=400){
  if(roll<.055){scenario='Poor start';delta+=(n<=100?.006:n<=200?.0045:.0035)*startFactor}
  else if(roll<.075){scenario='Stumble';delta+=(n<=100?.014:n<=200?.010:.008)*startFactor}
  else if(roll<.15){scenario='Perfect execution';delta-=(.0035+u(key+'|perfect')*.0045)*executionFactor}
  else if(n===400&&roll<.27){scenario='Went out too hard';delta+=(.006+u(key+'|fade')*.010)*finishFactor;raceStyle='Front Runner'}
 }else{
  if(roll<.14){scenario='Went out too hard';delta+=(.006+u(key+'|fade')*(n<=1500?.014:.010))*finishFactor;raceStyle='Front Runner'}
  else if(roll<.25){scenario='Late kick';delta-=(.001+u(key+'|kick')*.004)*Math.max(.65,Math.min(1.4,.80+(race?.finish??10)*.035));raceStyle='Kicker'}
  else if((n===800||n===1500)&&roll<.33){scenario='Boxed in';delta+=(.004+u(key+'|boxed')*.008)*Math.max(.7,Math.min(1.3,1.08-(race?.start??10)*.025));raceStyle='Kicker'}
  else if(roll<.42){scenario='Evenly paced';delta-=u(key+'|even')*.0025*executionFactor;raceStyle='Even Pacer'}
  else if(roll<.50){scenario='Strong second half';delta-=(.001+u(key+'|strength')*.003)*Math.max(.7,Math.min(1.35,.8+(race?.middle??10)*.03));raceStyle='Strength Runner'}
  else if(roll<.56){scenario='Bad day';delta+=(.006+u(key+'|bad')*.012)*Math.max(.75,Math.min(1.35,1.12-(consistency-10)*.025))}
  else if(roll<.63){scenario='Race of their life';delta-=(.004+u(key+'|great')*.007)*executionFactor}
 }
 if(cond<74)delta+=((74-cond)/100)*(n<=400?.012:.022);
 if(cond>90)delta-=((cond-90)/100)*(n<=400?.006:.010);
 const fatigue=Math.max(0,(Number(a?.fatigue)||0)-45),lowFit=Math.max(0,82-(Number(a?.fitness)||90));
 let dnfChance=.0015+(n>=800?.0015:0)+(n>=5000?.0015:0)+fatigue*.00016+lowFit*.00012;
 dnfChance=Math.min(.018,dnfChance*importance);
 const dnf=u(key+'|dnf')<dnfChance;
 const injuryProgress=.28+u(key+'|injury-point')*.58;
 const injuryWeeks=1+Math.floor(u(key+'|injury-weeks')*5);
 const injuryType=TRACK_INJURIES[Math.floor(u(key+'|injury-type')*TRACK_INJURIES.length)]||'muscle strain';
 if(dnf){scenario='Pulled up injured';delta=Math.max(delta,.10+u(key+'|dnfslow')*.08)}
 return {scenario,raceStyle,delta,dnf,injuryProgress,injuryWeeks,injuryType,seed:key,attributeScore:ap?.score??null,attributeRace:race};
}'''
s,n=re.subn(r"function trackPlan\(e,d,row\)\{.*?\n\}\n\nfunction applyTrackRealism",track_fn+"\n\nfunction applyTrackRealism",s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'trackPlan replacement: {n}')
s=replace_once(s,"const base=Math.max(.01,Number(row.perf)||Number(a?.pb)||1),wr=Number(WORLD_RECORDS?.[d]);","const base=Math.max(.01,attributeTrackBase(a,d,Number(row.perf)||Number(a?.pb)||1)),wr=Number(WORLD_RECORDS?.[d]);",'track attribute anchor')

throw_fn=r'''function throwPlan(e,d,row){
 const a=athlete(row.id),key=eventKey(e,d,row.id),cond=condition(a),roll=u(key+'|throws'),ap=attributeProfile(a,d);
 let label='Normal series',foulBase=.09,breakthrough=0,spread=.62;
 if(roll<.08){label='Pressure series';foulBase=.19;spread=.92}
 else if(roll<.16){label='Found one late';breakthrough=.22+u(key+'|late')*.42;spread=.75}
 else if(roll<.24){label='Big opening mark';breakthrough=.18+u(key+'|early')*.38;spread=.70}
 else if(roll<.30){label='Technical struggle';foulBase=.24;spread=1.05}
 else if(roll<.38){label='Excellent rhythm';breakthrough=.10+u(key+'|rhythm')*.30;foulBase=.05;spread=.45}
 foulBase+=Math.max(0,78-cond)*.0022;
 if(ap){foulBase+=(12-ap.technique)*.006+(12-ap.composure)*.002;spread*=Math.max(.52,Math.min(1.38,1.16-(ap.consistency-10)*.025-(ap.technique-10)*.012));breakthrough*=Math.max(.72,Math.min(1.32,.88+(ap.power-10)*.025+(ap.composure-10)*.01))}
 return {label,foulBase:Math.max(.025,Math.min(.36,foulBase)),breakthrough,spread,key,attributeScore:ap?.score??null};
}'''
s,n=re.subn(r"function throwPlan\(e,d,row\)\{.*?\n\}\nfunction applyThrowRealism",throw_fn+"\nfunction applyThrowRealism",s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'throwPlan replacement: {n}')
s=replace_once(s,"const a=athlete(source.id),p=throwPlan(e,d,source),anchor=Math.max(.1,Number(source.perf)||Number(a?.pb)||1),attempts=[];","const a=athlete(source.id),p=throwPlan(e,d,source),anchor=Math.max(.1,attributeFieldAnchor(a,d,Number(source.perf)||Number(a?.pb)||1)),attempts=[];",'throw attribute anchor')

height_fn=r'''function heightPlan(e,d,row){
 const a=athlete(row.id),key=eventKey(e,d,row.id),roll=u(key+'|height'),cond=condition(a),ap=attributeProfile(a,d);let label='Normal competition',shift=normal(key+'|heightday')*.025*Math.max(.72,Math.min(1.22,1.18-((ap?.consistency??10)-10)*.025)),pressure=0;
 if(roll<.08){label='Nervy competition';shift-=.025+u(key+'|nervy')*.035;pressure=.10}
 else if(roll<.16){label='Clutch jumper';shift+=.02+u(key+'|clutch')*.035;pressure=-.06}
 else if(roll<.23){label='Aggressive passing';pressure=.05}
 else if(roll<.29){label='Excellent rhythm';shift+=.015+u(key+'|rhythm')*.025;pressure=-.08}
 if(cond<75)shift-=(75-cond)*.0015;if(cond>90)shift+=(cond-90)*.001;
 const executionEdge=ap?Math.max(-.10,Math.min(.10,(ap.technique-10)*.007+(ap.composure-10)*.004)):0;
 if(ap)pressure=Math.max(-.16,Math.min(.20,pressure-(ap.composure-10)*.006-(ap.consistency-10)*.003));
 return {label,shift,pressure,key,executionEdge,attributeScore:ap?.score??null};
}'''
s,n=re.subn(r"function heightPlan\(e,d,row\)\{.*?\n\}\nfunction applyHeightRealism",height_fn+"\nfunction applyHeightRealism",s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'heightPlan replacement: {n}')
s=replace_once(s,"const plans=new Map(rows.map(r=>[r.id,heightPlan(e,d,r)])),caps=rows.map(r=>{const a=athlete(r.id),p=plans.get(r.id),pb=Number(a?.pb)||Number(r.perf)||2;return {row:r,plan:p,cap:pb+p.shift}}),minCap=Math.min(...caps.map(x=>x.cap)),maxCap=Math.max(...caps.map(x=>x.cap));","const plans=new Map(rows.map(r=>[r.id,heightPlan(e,d,r)])),caps=rows.map(r=>{const a=athlete(r.id),p=plans.get(r.id),pb=Number(a?.pb)||Number(r.perf)||2;return {row:r,plan:p,cap:attributeHeightCap(a,d,Number(r.perf)||pb)+p.shift}}),minCap=Math.min(...caps.map(x=>x.cap)),maxCap=Math.max(...caps.map(x=>x.cap));",'height attribute cap')
s=replace_once(s,"chance=Math.max(.01,Math.min(.98,chance-plan.pressure));","chance=Math.max(.01,Math.min(.98,chance-plan.pressure+(plan.executionEdge||0)));",'height execution chance')

wrap="""const _eventAIBaseSimulate=simulateDiscipline;\nsimulateDiscipline=function(e,d){\n const rows=_eventAIBaseSimulate(e,d),meta=e?.engine?.[d];if(!Array.isArray(rows)||!rows.length)return rows;\n if(isTrack(d))return applyTrackRealism(e,d,rows,meta);\n if(DISCIPLINES?.[d]?.type==='height')return applyHeightRealism(e,d,rows,meta);\n return applyThrowRealism(e,d,rows,meta);\n};\n"""
wrap_new=wrap+"""\nwindow.AMEventAIRealism=Object.freeze({version:EVENT_AI_VERSION,attributesDriveOutcomes:true,hiddenOverallAffectsLiveOutcome:false,raceShapeFromAttributes:true,attributeProfile,trackAnchor:(a,d,fallback)=>attributeTrackBase(a,d,fallback),fieldAnchor:(a,d,fallback)=>attributeFieldAnchor(a,d,fallback),heightCap:(a,d,fallback)=>attributeHeightCap(a,d,fallback),diagnostics:()=>({version:EVENT_AI_VERSION,attributesDriveOutcomes:true,hiddenOverallAffectsLiveOutcome:false,raceShapeFromAttributes:true})});\n"""
s=replace_once(s,wrap,wrap_new,'event AI public diagnostics')
write(p,s)

# Broadcast: make track animation phases reflect the athlete attribute race shape.
p='scripts/live-event-broadcast-v4.js'
s=read(p)
old_race=re.search(r"function racePlan\(r,d,key\)\{.*?\nfunction metres",s,flags=re.S)
if not old_race: raise SystemExit('racePlan anchor missing')
race_new=r'''function racePlan(r,d,key){const cp=checkpoints(dist(d)),weights=[],ai=r.raw?.eventAI||{},shape=ai.attributeRace||{},shapeNorm=v=>Number.isFinite(Number(v))?Math.max(-1,Math.min(1,(Number(v)-10.5)/9.5)):0;for(let i=1;i<cp.length;i++){let f=1+rnd(`${key}|${r.id}|${i}`,-.035,.035),start=shapeNorm(shape.start),middle=shapeNorm(shape.middle),finish=shapeNorm(shape.finish),last=i===cp.length-1;if(dist(d)<=400&&i===1)f+=(dist(d)<=100?.10:dist(d)<=200?.06:.035)-start*.028;else if(i===1)f-=start*.008;if(last)f-=finish*.024;else if(i>1)f-=middle*.012;if(r.raw?.eventAI?.raceStyle==='Kicker'&&last)f-=.05;if(r.raw?.eventAI?.scenario==='Went out too hard'&&last)f+=.07;weights.push((cp[i]-cp[i-1])*Math.max(.78,f))}const sum=weights.reduce((a,b)=>a+b,0)||1,t=[0];let q=0;weights.forEach(x=>{q+=(r.perf||1)*x/sum;t.push(q)});return{c:cp,t,total:r.perf||1}}
function metres'''
s=s[:old_race.start()]+race_new+s[old_race.end():]
s=replace_once(s,"legacyOvalPresent:!!root?.querySelector('ellipse')","legacyOvalPresent:!!root?.querySelector('ellipse'),attributeRaceShape:true",'broadcast diagnostics')
write(p,s)

# Loader cache keys.
p='game.html';s=read(p)
s=replace_once(s,'scripts/event-ai-realism.js?v=20260909-event-ai1','scripts/event-ai-realism.js?v=20260912-attribute-live1','event AI cache key')
s=replace_once(s,'scripts/live-event-broadcast-v4.js?v=20260911-broadcast4654','scripts/live-event-broadcast-v4.js?v=20260912-attribute-live1','broadcast cache key')
write(p,s)

# Runtime contracts: attribute engine must be authoritative for live outcomes and independent of hidden Overall.
p='tools/runtime-smoke.mjs';s=read(p)
s=replace_once(s,"'__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMPeopleBiography','AMAthleteAttributes','AMAttributeScouting','AMClubWorld'","'__athleticsCalendarV2','__athleticsCompetitionJourneyV2','__athleticsScoutingV3','__athleticsStaffFinanceV2','__athleticsWorldSeasonV2','__athleticsManagerCareerV1','AMFirstTimeExperienceV2','AMRelease','__athleticsRegression','AMLiveBroadcastV4','AMEventAIRealism','AMPeopleBiography','AMAthleteAttributes','AMAttributeScouting','AMClubWorld'",'required event AI global')
s=replace_once(s,"if(!diag||diag.loaded!==true||diag.renderer!=='Broadcast V4.6 Optimised')fail('Broadcast V4.6 diagnostics are not authoritative.');","if(!diag||diag.loaded!==true||diag.renderer!=='Broadcast V4.6 Optimised')fail('Broadcast V4.6 diagnostics are not authoritative.');\n   if(diag.attributeRaceShape!==true)fail('Broadcast V4.6 must shape track phases from athlete attributes.');",'broadcast attribute diagnostic')
insert=""" if(w.AMEventAIRealism){\n  try{\n   const diag=w.AMEventAIRealism.diagnostics();\n   if(!diag||diag.version<2||diag.attributesDriveOutcomes!==true||diag.hiddenOverallAffectsLiveOutcome!==false||diag.raceShapeFromAttributes!==true)fail('Event AI attribute-performance authority is invalid.');\n   const state=typeof w.fresh==='function'?w.fresh('GREAT BRITAIN'):null,track=(state?.athletes||[]).find(a=>w.DISCIPLINES?.[a.disc]?.type==='time');\n   if(track){\n    const profile=w.AMEventAIRealism.attributeProfile(track,track.disc);\n    if(!profile||profile.score<1||profile.score>20||!profile.attributeRace)fail('Event AI did not build a valid track attribute profile.');\n    const low={...track,overall:40},high={...track,overall:99},a=w.AMEventAIRealism.trackAnchor(low,track.disc,track.pb),b=w.AMEventAIRealism.trackAnchor(high,track.disc,track.pb);\n    if(Math.abs(a-b)>.000001)fail('Hidden Overall still changes the live-event attribute anchor.');\n   }\n  }catch(err){fail(`Event AI attribute diagnostics threw: ${err?.stack||err}`)}\n }\n"""
needle=" if(w.__athleticsManagerCareerV1){\n"
if needle not in s: raise SystemExit('runtime insert anchor missing')
s=s.replace(needle,insert+needle,1)
write(p,s)

# Document the design contract.
p='docs/ATTRIBUTE-RATING-SCALE.md';s=read(p)
addition="""\n## Live-event authority\n\nLive competition outcomes use the 1–20 attribute model directly. PB remains the factual career benchmark, while event-specific weighted attributes determine how closely an athlete can reproduce or exceed that benchmark on the day. Form, fitness, fatigue, morale and programme support remain contextual modifiers. Hidden legacy Overall does not alter a live-event result.\n\nTrack athletes also carry an attribute-derived race shape into the live broadcast: starts, middle phases and finishes are weighted separately. Throws use technique and consistency to influence foul risk and series spread; high jump uses the event profile to influence the competition cap, pressure and clearance execution.\n"""
if '## Live-event authority' not in s:s=s.rstrip()+addition+'\n'
write(p,s)

print('Attribute-driven live event engine applied.')
