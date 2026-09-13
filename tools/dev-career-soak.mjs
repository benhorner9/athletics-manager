import assert from 'node:assert/strict';

// Headless integration fixtures. This does not verify alpha access, onboarding UX,
// rendered layout, or browser animation. It exercises the shipped runtime graph.
export async function run(w){
 const read=code=>w.eval(code);
 if(process.env.AM_AUDIT_RESUME!=='1')read(`s=fresh('GREAT BRITAIN');ensureState();s.appointment.contractSigned=true;s.appointment.completed=true;s.appointment.introSeeded=true;s.induction.completed=true;s.managerName='Dev QA';save();`);
 const selected=[];
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
 let completed=0;
 const weeks=[];
 for(let i=0;i<Number(process.env.AM_AUDIT_WEEKS||16);i++){
  const before=read('s.game.week'),beforeSeason=read('s.game.season'),beforeCareer=read('s.game.careerWeek');
  const legacyHistory=read('s.athletes.reduce((n,a)=>n+(a.trainingV2?.history||[]).filter(h=>h.type==="training").length,0)');
  const decisions=w.__athleticsInboxDecisionCore.getUnresolvedActions();
  for(const a of decisions){
   if(a.source==='competition')select(read(`s.events.find(e=>e.id===${JSON.stringify(a.entityId)})`));
   else if(a.source==='summit'){
    w.__athleticsExplicitSelectionV3.openSummit();
    const dialog=w.document.getElementById('selectionDecisionV3');
    dialog.querySelector('[data-coach-all]').click();dialog.querySelector('[data-review]').click();dialog.querySelector('[data-submit]').click();
    assert.ok(read('summitSeasonState().registrationLocked'));dialog.close();
   }else if(a.blocks)throw new Error('Unhandled blocking decision in soak: '+a.source);
  }
  const e=read('currentBlocking()');
  if(e){
   if(e.kind==='summit'){w.simulateSummitMeeting(e);}
   else{if(!e.decision)select(e);w.simulateWholeEvent(e);}
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
  w.view('inbox');w.advanceWeek();
  const after=read('s.game.week');assert.equal(after,before===52?1:before+1,`season ${beforeSeason} week ${before} failed to advance`);assert.equal(read('s.game.careerWeek'),beforeCareer+1);assert.equal(read('s.game.season'),beforeSeason+(before===52?1:0));weeks.push(read('s.game.season')+':'+after);if(read('careerState().pendingReview')){read('acceptCareerJob(managedNation())');assert.equal(read('careerState().pendingReview'),null)}
  if(before!==52)assert.equal(read('s.athletes.reduce((n,a)=>n+(a.trainingV2?.history||[]).filter(h=>h.type==="training").length,0)'),legacyHistory,'retired training engine still processes weeks');
  assert.ok(read('managedTeam().some(a=>a.attributeDevelopment?.lastWeek>0)'),'current attribute training did not process the squad');
  const ids=read('s.emails.map(m=>m.id)');assert.equal(new Set(ids).size,ids.length,'duplicate mail IDs');
  const eventIds=read('s.events.map(e=>e.id)');assert.equal(new Set(eventIds).size,eventIds.length,'duplicate events');
  const s=read('s');assert.ok(Number.isFinite(s.funding));assert.ok(s.athletes.every(a=>Number.isFinite(a.fatigue)));
  console.log(`[audit-soak] week ${after}: ${ids.length} emails, ${completed} meetings completed; save ${JSON.stringify(s).length} characters; largest ${Object.entries(s).map(([k,v])=>[k,JSON.stringify(v)?.length||0]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x.join(':')).join(', ')}`);
  await new Promise(resolve=>setTimeout(resolve,25));
 }
 w.save();const snapshot=read('JSON.stringify({week:s.game.week,events:s.events.map(e=>({id:e.id,entries:e.entries,completed:e.completed,results:e.results})),emails:s.emails.map(m=>({id:m.id,unread:m.unread,selectionSubmitted:m.selectionSubmitted}))})');
 w.load();assert.equal(read('JSON.stringify({week:s.game.week,events:s.events.map(e=>({id:e.id,entries:e.entries,completed:e.completed,results:e.results})),emails:s.emails.map(m=>({id:m.id,unread:m.unread,selectionSubmitted:m.selectionSubmitted}))})'),snapshot,'save/load changed decisions or results');
 console.log(`[audit-soak] PASS weeks ${weeks.join(',')}; ${selected.length} selections; ${completed} meetings; save/load`);
}
