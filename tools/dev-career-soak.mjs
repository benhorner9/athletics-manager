import assert from 'node:assert/strict';

// Headless integration fixtures. This does not verify alpha access, onboarding UX,
// rendered layout, or browser animation. It exercises the shipped runtime graph.
export async function run(w){
 const read=code=>w.eval(code);
 if(process.env.AM_AUDIT_RESUME!=='1')read(`s=fresh('GREAT BRITAIN');ensureState();s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;s.induction.completed=true;s.managerName='Dev QA';save();`);
 const auditWeeks=Number(process.env.AM_AUDIT_WEEKS||16),selected=[];
 let expiryDecisions=0,staffDecisions=0,maxSaveSize=read('JSON.stringify(s).length');
 function select(event){
  w.__athleticsExplicitSelectionV3.openEvent(event);
  const dialog=w.document.getElementById('selectionDecisionV3');
  assert.equal(dialog.querySelectorAll('[data-disc]').length,event.disc.filter(d=>d!=='ALL').length);
  dialog.querySelector('[data-coach-all]').click();
  assert.equal(w.__athleticsExplicitSelectionV3.validate().length,0);
  const review=dialog.querySelector('[data-review]');assert.ok(review&&!review.disabled,'review must be enabled');review.click();
  const submit=dialog.querySelector('[data-submit]');assert.ok(submit);submit.click();
  assert.ok(event.decision,'submission must persist official decision');
  const entries=JSON.stringify(event.entries);submit.click();assert.equal(JSON.stringify(event.entries),entries,'repeat submission changed entries');
  const team=new Set(read('managedTeam().map(a=>a.id)'));
  for(const ids of Object.values(event.entries))for(const id of ids)assert.ok(team.has(id),'pool or foreign athlete selected');
  assert.ok(!w.__athleticsInboxDecisionCore.getUnresolvedActions().some(a=>a.entityId===event.id),'completed selection still actionable');
  selected.push(event.id);dialog.close();
 }
 function renewExpiryDecision(action){
  const id=String(action.entityId||'');
  const renewed=read(`(()=>{const id=${JSON.stringify(id)},p=window.AMProgrammeEconomy?.state?.(),c=p?.athleteContracts?.[id],a=s.athletes.find(x=>String(x.id)===id);if(!c)return false;const now=Number(s.game.careerWeek||s.game.week||1);c.endCareerWeek=Math.max(Number(c.endCareerWeek||0),now+52);c.warned=false;c.urgentWarned=false;delete c.expiryDecision;if(a)a.squadCommitUntil=c.endCareerWeek;save();return true})()`);
  assert.ok(renewed,`contract expiry decision could not be renewed for ${id}`);
  expiryDecisions++;
 }
 function resolveStaffDecision(action){
  const role=String(action.entityId||'');
  const resolved=w.__athleticsDecisionFinalizer?.resolveStaff?.(role,'release_at_expiry');
  assert.ok(resolved,`staff contract decision could not be resolved for ${role}`);
  staffDecisions++;
 }
 function stateBreakdown(state){
  const athleteKeys={};
  for(const athlete of state.athletes||[]){
   for(const [key,value] of Object.entries(athlete||{}))athleteKeys[key]=(athleteKeys[key]||0)+(JSON.stringify(value)?.length||0);
  }
  const emailTypes={},emailSubjects={};
  for(const mail of state.emails||[]){
   const type=String(mail.type||'info'),subject=String(mail.subject||'');
   emailTypes[type]=(emailTypes[type]||0)+1;
   emailSubjects[subject]=(emailSubjects[subject]||0)+1;
  }
  return{
   athleteKeys:Object.entries(athleteKeys).sort((a,b)=>b[1]-a[1]).slice(0,12),
   emailTypes:Object.entries(emailTypes).sort((a,b)=>b[1]-a[1]).slice(0,12),
   emailSubjects:Object.entries(emailSubjects).sort((a,b)=>b[1]-a[1]).slice(0,12)
  };
 }
 let completed=0;
 const weeks=[];
 for(let i=0;i<auditWeeks;i++){
  const before=read('s.game.week'),beforeSeason=read('s.game.season'),beforeCareer=read('s.game.careerWeek');
  const legacyHistory=read('s.athletes.reduce((n,a)=>n+(a.trainingV2?.history||[]).filter(h=>h.type==="training").length,0)');
  w.AMPersistencePerformance?.resetMetrics?.();
  const decisions=w.__athleticsInboxDecisionCore.getUnresolvedActions();
  const decisionMetrics=w.AMPersistencePerformance?.metrics?.();
  if(decisions.some(a=>String(a.actionId||'').startsWith('economy:athlete-expiry:'))&&decisionMetrics)assert.ok(decisionMetrics.physicalSaves<=1,`contract decision discovery used ${decisionMetrics.physicalSaves} physical saves`);
  for(const a of decisions){
   if(a.source==='competition')select(read(`s.events.find(e=>e.id===${JSON.stringify(a.entityId)})`));
   else if(a.source==='summit'){
    w.__athleticsExplicitSelectionV3.openSummit();
    const dialog=w.document.getElementById('selectionDecisionV3');
    dialog.querySelector('[data-coach-all]').click();dialog.querySelector('[data-review]').click();dialog.querySelector('[data-submit]').click();
    assert.ok(read('summitSeasonState().registrationLocked'));dialog.close();
   }else if(String(a.actionId||'').startsWith('economy:athlete-expiry:'))renewExpiryDecision(a);
   else if(a.source==='staff')resolveStaffDecision(a);
   else if(a.blocks)throw new Error('Unhandled blocking decision in soak: '+a.source+' '+a.actionId);
  }
  assert.equal(w.__athleticsInboxDecisionCore.getProgressionBlockers().length,0,'blocking decision remained after QA resolution');
  const e=read('currentBlocking()');
  if(e){
   w.AMPersistencePerformance?.resetMetrics?.();
   if(e.kind==='summit'){w.simulateSummitMeeting(e);}
   else{if(!e.decision)select(e);w.AMPersistencePerformance?.resetMetrics?.();w.simulateWholeEvent(e);}
   const eventMetrics=w.AMPersistencePerformance?.metrics?.();
   if(eventMetrics)assert.ok(eventMetrics.physicalSaves<=1,`${e.kind||'event'} simulation used ${eventMetrics.physicalSaves} physical saves`);
   assert.ok(e.completed,'simulation did not finish meeting');
   for(const [d,rows] of Object.entries(e.results||{})){
    assert.ok(Array.isArray(rows),'results must be arrays');
    assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'duplicate result athlete');
    for(const r of rows){
     assert.ok(r.perf==null||Number.isFinite(r.perf),'non-finite result');
     const attempts=r.throwAttempts||r.jumpAttempts;
     if(attempts?.length){const marks=attempts.filter(Number.isFinite);if(marks.length)assert.equal(r.perf,Math.max(...marks),'official mark differs from best attempt');}
    }
   }
   completed++;
  }
  const trainingEligible=read('managedTeam().filter(a=>!a.retired&&!a.camp&&Number(a.injury||0)<=0).map(a=>String(a.id))');
  w.view('inbox');
  w.AMPersistencePerformance?.resetMetrics?.();
  w.advanceWeek();
  const advanceMetrics=w.AMPersistencePerformance?.metrics?.();
  if(advanceMetrics)assert.ok(advanceMetrics.physicalSaves<=1,`week advance used ${advanceMetrics.physicalSaves} physical saves`);
  const after=read('s.game.week');assert.equal(after,before===52?1:before+1,`season ${beforeSeason} week ${before} failed to advance`);assert.equal(read('s.game.careerWeek'),beforeCareer+1);assert.equal(read('s.game.season'),beforeSeason+(before===52?1:0));weeks.push(read('s.game.season')+':'+after);if(read('careerState().pendingReview')){read('acceptCareerJob(managedNation())');assert.equal(read('careerState().pendingReview'),null)}
  if(before!==52)assert.equal(read('s.athletes.reduce((n,a)=>n+(a.trainingV2?.history||[]).filter(h=>h.type==="training").length,0)'),legacyHistory,'retired training engine still processes weeks');
  if(trainingEligible.length){
   const processed=read(`(()=>{const ids=${JSON.stringify(trainingEligible)},week=${beforeCareer};return ids.every(id=>{const a=s.athletes.find(x=>String(x.id)===id);return !a||a.retired||Number(a.attributeDevelopment?.lastWeek||0)===week})})()`);
   assert.ok(processed,`current attribute training did not process every eligible athlete for career week ${beforeCareer}`);
  }
  const ids=read('s.emails.map(m=>m.id)');assert.equal(new Set(ids).size,ids.length,'duplicate mail IDs');
  const eventIds=read('s.events.map(e=>e.id)');assert.equal(new Set(eventIds).size,eventIds.length,'duplicate events');
  const s=read('s');assert.ok(Number.isFinite(s.funding));assert.ok(s.athletes.every(a=>Number.isFinite(a.fatigue)));
  const saveSize=JSON.stringify(s).length;maxSaveSize=Math.max(maxSaveSize,saveSize);
  if(auditWeeks>=52)assert.ok(saveSize<12_000_000,`career save exceeded 12 MB long-save budget at ${s.game.season} W${after}: ${saveSize}`);
  console.log(`[audit-soak] week ${after}: ${ids.length} emails, ${completed} meetings completed; save ${saveSize} characters; physical saves ${advanceMetrics?.physicalSaves??'n/a'}; largest ${Object.entries(s).map(([k,v])=>[k,JSON.stringify(v)?.length||0]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x.join(':')).join(', ')}`);
  if(ids.length>100||saveSize>8_000_000){const breakdown=stateBreakdown(s);console.log(`[audit-soak] detail athlete keys ${breakdown.athleteKeys.map(x=>x.join(':')).join(', ')}; email types ${breakdown.emailTypes.map(x=>x.join(':')).join(', ')}; top subjects ${breakdown.emailSubjects.map(([subject,count])=>`${count}× ${subject}`).join(' | ')}`)}
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 if(auditWeeks>=52)assert.ok(expiryDecisions>0,'long soak crossed the expiry window without exercising an athlete contract decision');
 if(auditWeeks>=52)assert.ok(staffDecisions>0,'long soak crossed the staff expiry window without exercising a staff contract decision');
 w.save();const snapshot=read('JSON.stringify({week:s.game.week,events:s.events.map(e=>({id:e.id,entries:e.entries,completed:e.completed,results:e.results})),emails:s.emails.map(m=>({id:m.id,unread:m.unread,selectionSubmitted:m.selectionSubmitted}))})');
 w.load();assert.equal(read('JSON.stringify({week:s.game.week,events:s.events.map(e=>({id:e.id,entries:e.entries,completed:e.completed,results:e.results})),emails:s.emails.map(m=>({id:m.id,unread:m.unread,selectionSubmitted:m.selectionSubmitted}))})'),snapshot,'save/load changed decisions or results');
 console.log(`[audit-soak] PASS weeks ${weeks.join(',')}; ${selected.length} selections; ${completed} meetings; ${expiryDecisions} athlete expiry decisions; ${staffDecisions} staff decisions; max save ${maxSaveSize}; save/load`);
}
