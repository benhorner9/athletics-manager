import assert from 'node:assert/strict';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function run(w){
 const read=code=>w.eval(code);
 const reset=()=>read(`s=fresh('GREAT BRITAIN');ensureState();s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;s.induction.completed=true;s.managerName='Release QA';window.AMProgrammeEconomy?.state?.();`);
 const originalRandom=w.Math.random;
 w.Math.random=()=>0.42;
 try{
  console.log('[release] National Pool lifecycle');
  reset();
  const poolId=read(`nationalPool()[0]?.id`);
  assert.ok(poolId,'fresh career has no National Pool athlete');
  const beforeTeam=read(`managedTeam().length`);
  assert.ok(read(`finaliseSquadAgreementCallUp(${JSON.stringify(poolId)},10)`),'canonical call-up failed');
  assert.equal(read(`s.athletes.find(a=>a.id===${JSON.stringify(poolId)}).inSquad`),true,'call-up did not move athlete into squad');
  assert.equal(read(`managedTeam().length`),beforeTeam+1,'call-up did not consume one squad place');
  assert.equal(read(`s.athletes.find(a=>a.id===${JSON.stringify(poolId)}).squadAgreement.termWeeks`),10,'agreement term was not persisted');
  read(`s.athletes.find(a=>a.id===${JSON.stringify(poolId)}).squadAgreement.endCareerWeek=careerNow();processSquadAgreements()`);
  assert.equal(read(`s.athletes.find(a=>a.id===${JSON.stringify(poolId)}).inSquad`),false,'expired squad agreement did not return athlete to National Pool');
  assert.ok(read(`!!s.athletes.find(a=>a.id===${JSON.stringify(poolId)})`),'released athlete disappeared from database');

  console.log('[release] Scouting discovery lifecycle');
  reset();
  const apiSource={
   renderer:String(read(`drawScouting`)).slice(0,900),
   first:String(w.AMScoutingV2?.seedFirstAssignment||'').slice(0,1200),
   first2:String(w.AMScoutingV2?.seedFirstScoutingAssignment||'').slice(0,1200),
   refresh:String(w.AMScoutingV2?.refreshScoutingIntegration||'').slice(0,1600),
   search:String(w.AMScoutingV2?.createSearchAssignment||'').slice(0,1600),
   assignment:String(w.AMScoutingV2?.processAssignmentWeek||'').slice(0,1600),
   longTerm:String(w.AMScoutingV2?.processLongTermWeek||'').slice(0,1200)
  };
  console.log('[release] scouting integration sources',JSON.stringify(apiSource));
  const scoutBefore=read(`({athletes:s.athletes.length,reports:scoutingState().reports.length,pool:nationalPool().length,emails:s.emails.filter(m=>m.type==='scouting').length,v2Reports:(s.scoutingV2?.nations?.[managedNation()]?.reports||[]).length})`);
  read(`s.game.week=9;s.game.careerWeek=9;scoutingState().lastCareerWeek=1;delete scoutingState().processedWeek;onWeekStart()`);
  const scoutAfter=read(`({athletes:s.athletes.length,reports:scoutingState().reports.length,pool:nationalPool().length,emails:s.emails.filter(m=>m.type==='scouting').length,v2Reports:(s.scoutingV2?.nations?.[managedNation()]?.reports||[]).length,assignments:(s.scoutingV2?.nations?.[managedNation()]?.assignments||[]).length,hidden:(s.scoutingV2?.nations?.[managedNation()]?.hiddenTalent||[]).length})`);
  console.log('[release] scouting week-start',JSON.stringify({before:scoutBefore,after:scoutAfter,onWeekStartSource:String(read(`onWeekStart`)).slice(0,700)}));
  assert.ok(scoutAfter.athletes>scoutBefore.athletes,'scouting week-start did not advance the talent pool');
  let scoutPost=scoutAfter;
  if(!((scoutAfter.reports>scoutBefore.reports)||(scoutAfter.v2Reports>scoutBefore.v2Reports)||scoutAfter.emails>scoutBefore.emails)){
   const processorResult=read(`window.AMScoutingV2?.processScoutingWeek?.()`);
   scoutPost=read(`({athletes:s.athletes.length,reports:scoutingState().reports.length,pool:nationalPool().length,emails:s.emails.filter(m=>m.type==='scouting').length,v2Reports:(s.scoutingV2?.nations?.[managedNation()]?.reports||[]).length,assignments:(s.scoutingV2?.nations?.[managedNation()]?.assignments||[]).length,hidden:(s.scoutingV2?.nations?.[managedNation()]?.hiddenTalent||[]).length})`);
   console.log('[release] scouting V2 processor probe',JSON.stringify({result:processorResult,after:scoutPost,source:String(w.AMScoutingV2?.processScoutingWeek||'').slice(0,1000)}));
  }
  assert.ok((scoutPost.reports>scoutBefore.reports)||(scoutPost.v2Reports>scoutBefore.v2Reports)||scoutPost.emails>scoutBefore.emails,'scouting system produced no player-facing report or communication');

  console.log('[release] Staff and finance authority');
  reset();
  assert.equal(w.AMProgrammeEconomy?.version,4,'Programme Economy V4 is not authoritative');
  const debug=w.AMProgrammeEconomy.debug();
  const snapshot=w.AMProgrammeEconomy.snapshot();
  assert.ok(Number.isFinite(Number(debug.cash)),'finance cash is non-finite');
  assert.ok(Number.isFinite(Number(snapshot.weekly?.total))&&snapshot.weekly.total>=0,'weekly programme cost is invalid');
  assert.ok(Number.isFinite(Number(w.AMProgrammeEconomy.safeToCommit())),'safe-to-commit value is invalid');
  assert.ok(Object.keys(debug.staffContracts||{}).length>=1,'no active staff contracts were migrated');
  w.view('staff');w.AMProgrammeEconomy.renderStaff();await sleep(10);
  assert.ok(w.document.querySelector('#staff [data-stab="market"]'),'Staff Market tab is missing');
  w.AMProgrammeEconomy.openStaffMarket();await sleep(10);
  assert.ok(w.document.querySelector('#staff .pe-shell'),'Staff Market did not render through Programme Economy');
  w.view('finance');w.AMProgrammeEconomy.renderFinance();await sleep(10);
  assert.ok(w.document.querySelector('#finance .pe-shell'),'Finance did not render through Programme Economy');

  console.log('[release] Annual and Olympic-cycle rollover');
  reset();
  const season0=read(`s.game.season`);
  read(`s.events.forEach(e=>e.completed=true);endSeason()`);
  assert.equal(read(`s.game.season`),season0+1,'annual rollover did not advance season');
  assert.equal(read(`s.game.cycleYear`),2,'annual rollover did not advance Olympic cycle year');
  assert.equal(read(`careerState().careerYear`),2,'annual rollover did not advance career year');
  assert.equal(read(`s.game.week`),1,'annual rollover did not reset to Week 1');

  reset();
  read(`s.game.cycleYear=4;s.game.season=2030;careerState().careerYear=4;careerState().cycleNumber=1;s.events=makeEvents(4,managedNation(),1)`);
  assert.ok(read(`s.events.some(e=>e.id==='olympics'&&e.week===36)`),'Year 4 did not contain the Olympic Games');
  read(`s.events.forEach(e=>e.completed=true);endSeason()`);
  assert.ok(read(`!!careerState().pendingReview`),'Olympic-cycle rollover did not create a federation review');
  assert.equal(read(`careerState().careerYear`),5,'Olympic-cycle rollover did not advance career year');
  assert.equal(read(`careerState().cycleNumber`),2,'Olympic-cycle rollover did not advance cycle number');
  read(`acceptCareerJob(managedNation())`);
  assert.equal(read(`careerState().pendingReview`),null,'cycle review could not be resolved');
  assert.equal(read(`s.game.cycleYear`),1,'new Olympic cycle did not start at Year 1');

  console.log('[release] Forty-year career rollover');
  reset();
  const savedFns={render:w.render,view:w.view,save:w.save,toast:w.toast};
  w.render=()=>{};w.view=()=>{};w.save=()=>{};w.toast=()=>{};
  let seasons=0;
  while(!read(`careerState().finished`)&&seasons<42){
   read(`s.events.forEach(e=>e.completed=true);s.nationPoints[managedNation()]=1000;endSeason()`);
   seasons++;
   if(read(`!!careerState().pendingReview`))read(`acceptCareerJob(managedNation())`);
   assert.ok(Number.isFinite(read(`Number(s.funding)`)),`non-finite funding after career season ${seasons}`);
   assert.ok(read(`s.athletes.length`)<5000,`athlete population runaway after career season ${seasons}`);
  }
  w.render=savedFns.render;w.view=savedFns.view;w.save=savedFns.save;w.toast=savedFns.toast;
  assert.equal(seasons,40,'career did not finish after 40 seasons');
  assert.equal(read(`careerState().careerYear`),40,'career year did not finish at 40');
  assert.equal(read(`careerState().completedCycles.length`),10,'career did not record ten Olympic cycles');
  assert.equal(read(`careerState().finished`),true,'40-year career did not enter finished state');

  console.log('[release] Live event family coverage');
  const disciplines=read(`Object.entries(DISCIPLINES).map(([code,q])=>({code,type:q.type,distance:Number(q.distance||0),label:discLabel(code)}))`);
  const find=(fn)=>disciplines.find(fn)?.code;
  const families=[
   ['track-sprint',find(x=>x.type==='time'&&x.distance>0&&x.distance<=400&&!/relay|4x/i.test(x.label+x.code)),'track'],
   ['track-distance',find(x=>x.type==='time'&&x.distance>=800&&!/relay|4x/i.test(x.label+x.code)),'track'],
   ['height',find(x=>x.type==='height'),'field'],
   ['horizontal-jump',find(x=>/long jump|triple jump|\bLJ\b|\bTJ\b/i.test(`${x.label} ${x.code}`)),'field'],
   ['throw',find(x=>/shot|discus|hammer|javelin|throw|\bSP\b|\bDT\b|\bHT\b|\bJT\b/i.test(`${x.label} ${x.code}`)),'field'],
   ['relay',find(x=>/relay|4x/i.test(`${x.label} ${x.code}`)),'track']
  ];
  let tested=0;
  for(const [family,d,kind] of families){
   if(!d){console.log(`[release] ${family}: not present in current discipline set`);continue}
   reset();
   const ids=read(`s.athletes.filter(a=>!a.retired&&a.disc===${JSON.stringify(d)}).slice(0,8).map(a=>a.id)`);
   if(!ids.length){console.log(`[release] ${family}: no athletes in current world fixture`);continue}
   read(`s.events=[{id:${JSON.stringify('qa-')}+${JSON.stringify(family)},week:s.game.week,name:'Release QA ${family}',kind:'competition',level:'National',disc:[${JSON.stringify(d)}],ranked:false,star:1,location:'QA Venue',entries:{${JSON.stringify(d)}:${JSON.stringify(ids.slice(0,2))}},completed:false,results:{},decision:true}];activeEventDisc=${JSON.stringify(d)};competitionMode='discipline';disciplineRunning=false;drawCompetition()`);
   const e=read(`s.events[0]`);
   w.startDiscipline(e,d);await sleep(20);
   const active=w.AMLiveBroadcastV4?.active;
   assert.ok(active,`${family} did not start in Broadcast V4`);
   assert.equal(active.kind,kind,`${family} used the wrong live-event family`);
   assert.equal(w.AMLiveBroadcastV4.qa().ok,true,`${family} Broadcast V4 QA reported ${w.AMLiveBroadcastV4.qa().issues?.join(',')}`);
   const skip=w.document.getElementById('v4skip');assert.ok(skip,`${family} did not expose canonical skip-to-result`);skip.click();await sleep(20);
   assert.ok(Array.isArray(e.results?.[d]),`${family} did not commit official results`);
   assert.equal(read(`disciplineRunning`),false,`${family} remained locked as in-progress after result commit`);
   tested++;
  }
  assert.ok(tested>=3,`only ${tested} live-event families could be exercised`);

  console.log('[release] Responsive route structure');
  reset();
  for(const width of [390,768,1024]){
   Object.defineProperty(w,'innerWidth',{configurable:true,value:width});
   w.dispatchEvent(new w.Event('resize'));
   for(const route of ['home','inbox','squad','pool','training','scouting','staff','finance','league']){
    w.view(route);await sleep(5);
    assert.equal(w.document.querySelectorAll('.view.on').length,1,`${route} left multiple active views at ${width}px`);
   }
  }
  assert.ok(w.document.getElementById('mobileMoreBtn'),'mobile navigation control is missing');

  console.log('[release] PASS pool, scouting, staff/finance, annual/Olympic, 40-year, live families, responsive structure');
 } finally {
  w.Math.random=originalRandom;
 }
}
