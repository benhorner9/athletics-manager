/* ===== First 15 Minutes refinement — 9 September 2026 ===== */
(function(){
  function first15OpeningDisciplines(){
    const test=typeof openingArcTest==='function'?openingArcTest():null;
    return new Set((test?.disc&&test.disc.length?test.disc:['M100','W100']).filter(Boolean));
  }

  // Keep the opening prospect tied to the event that actually delivers the first proof.
  openingProspect=function(){
    const eligible=first15OpeningDisciplines();
    const pool=nationalPool().filter(a=>!a.retired&&eligible.has(a.disc));
    return [...pool].sort((a,b)=>(developmentProjectionEstimate(b)-assessmentMid(b,'overall'))-(developmentProjectionEstimate(a)-assessmentMid(a,'overall'))||developmentProjectionEstimate(b)-developmentProjectionEstimate(a)||assessmentMid(b,'overall')-assessmentMid(a,'overall'))[0]||null;
  };

  // The opening chapter should use the information staff actually know, never hidden ratings.
  openingSquadBenchmark=function(prospect=openingProspect()){
    if(!prospect)return null;
    return [...managedTeam()].filter(a=>a.disc===prospect.disc&&!a.retired).sort((a,b)=>assessmentMid(b,'overall')-assessmentMid(a,'overall')||b.form-a.form)[0]||null;
  };

  firstDayPeople=function(){
    const squad=managedTeam();
    const star=[...squad].sort((a,b)=>assessmentMid(b,'overall')-assessmentMid(a,'overall')||b.form-a.form)[0]||null;
    const talent=openingProspect()||[...squad,...nationalPool()].filter(a=>a.id!==star?.id&&a.age<=23).sort((a,b)=>(developmentProjectionEstimate(b)-assessmentMid(b,'overall'))-(developmentProjectionEstimate(a)-assessmentMid(a,'overall'))||developmentProjectionEstimate(b)-developmentProjectionEstimate(a))[0]||null;
    const rival=openingInternationalBenchmark(star?.disc);
    return {star,talent,rival};
  };

  // Route the first genuine squad decision to the National Pool, not the scouting screen.
  openingArcStage=function(){
    const cw=s.game.careerWeek||s.game.week,e=openingArcTest(),callups=openingArcCallups(),pending=callups.find(x=>x.athlete.inSquad===false);
    if(e?.completed&&pending)return {n:4,label:'CALL-UP REVIEW',text:`${pending.athlete.name} has put pressure on the current squad after indoor testing.`,route:'pool'};
    if(e?.completed)return {n:4,label:'INDOOR TEST COMPLETE',text:'Review the sprint results and decide whether the squad needs changing.',route:'inbox'};
    if(cw>=3)return {n:3,label:'INDOOR TEST NEXT',text:`${openingProspect()?.name||'A pool sprinter'} gets a direct comparison with the senior squad.`,route:'calendar'};
    if(cw>=2)return {n:2,label:'WEEK 1 REPORT',text:'Review the squad response before setting the next week.',route:'inbox'};
    return {n:1,label:'WEEK 1',text:'Your opening plan is set. Advance the week when you are ready.',route:'home'};
  };

  openingArcReportHTML=function(){
    const stage=openingArcStage(),prospect=openingProspect(),bench=openingSquadBenchmark(prospect),e=openingArcTest(),callups=openingArcCallups(),cw=s.game.careerWeek||s.game.week;
    const steps=[
      {done:true,title:'Take the job',sub:'Meet the programme and set the opening plan.'},
      {done:cw>=2,title:'Review Week 1',sub:'See how the squad responded before changing the load.'},
      {done:!!e?.completed,current:!e?.completed&&cw>=3,title:'Indoor testing',sub:`Week ${e?.week||4} puts senior and National Pool sprinters on the same clock.`},
      {done:e?.completed&&!callups.some(x=>x.athlete.inSquad===false),current:!!e?.completed&&callups.some(x=>x.athlete.inSquad===false),title:'Make the squad call',sub:'Use the test as evidence, not an automatic promotion.'}
    ];
    return `<p class="muted" style="line-height:1.65">The opening chapter follows the first decisions that matter. You can leave it at any time and manage the programme normally.</p><div class="first15-timeline">${steps.map((x,i)=>`<div class="first15-step ${x.done?'done':''} ${x.current?'current':''}"><b>${x.done?'✓':i+1}</b><div><strong>${x.title}</strong><small>${x.sub}</small></div><span>${x.done?'Complete':x.current?'Now':'Ahead'}</span></div>`).join('')}</div>${prospect?`<div class="first15-story-card"><small>POOL ATHLETE TO WATCH</small><h3>${athleteLink(prospect)}</h3><p>${discLabel(prospect.disc)} • National Pool • Ability ${assessmentText(prospect,'overall')} • Development ${developmentGradeText(prospect)}. ${bench?`${bench.name} is the current senior-squad benchmark in the same event.`:'There is no senior-squad benchmark in this event.'} ${e?.completed?'Testing is complete. The evidence is now in.':`Their first direct comparison comes in Week ${e?.week||4}.`}</p><button class="btn secondary" id="openingArcAction">${stage.route==='pool'?'OPEN NATIONAL POOL':stage.route==='inbox'?'OPEN INBOX':stage.route==='calendar'?'VIEW TEST WEEK':'BACK TO HOME'} →</button></div>`:''}`;
  };

  // Tighten the tone without adding another tutorial layer.
  const previousDrawFirstDay=drawFirstDay;
  drawFirstDay=function(){
    previousDrawFirstDay();
    const root=$('firstDay'),step=s.induction?.step;
    if(!root)return;
    if(step==='arrival'){
      const h1=root.querySelector('.firstday-opening h1');
      const lead=root.querySelector('.firstday-opening .firstday-lead');
      const callout=root.querySelector('.firstday-opening .firstday-callout');
      if(h1)h1.innerHTML='The programme is yours.<br><em>The first decisions are waiting.</em>';
      if(lead)lead.textContent=`The federation has handed you ${nationName(managedNation())}'s senior programme. Your job is to decide who gets backed, who gets protected and who earns the next opportunity.`;
      if(callout){const b=callout.querySelector('b'),span=callout.querySelector('span');if(b)b.textContent='What matters from here';if(span)span.textContent='Preparation creates evidence. Evidence shapes selection. Selection becomes results, careers and eventually your legacy.';}
    }else if(step==='people'){
      const lead=root.querySelector('.firstday-lead');
      if(lead)lead.textContent='Start with three people, not the whole database: an established athlete, a National Pool athlete with something to prove, and an international benchmark. You will have a reason to remember them.';
    }else if(step==='decision'){
      const lead=root.querySelector('.firstday-lead');
      if(lead)lead.textContent='Set the tone for Week 1. Choose the training instruction and give the scouting team an initial focus; both can be changed once you have evidence.';
    }
  };

  UPDATES.unshift({date:'9 September 2026',title:'First 15 Minutes Refinement',items:['Tightened the opening appointment so it reads more like taking charge of a national programme and less like a tutorial or trailer, without adding any extra pop-ups.','Fixed the opening story after the sprint expansion: the featured National Pool athlete now always belongs to an event actually tested at the Week 4 Indoor Speed Test, so the promised early storyline cannot disappear.','Opening squad benchmarks now use staff assessment ranges rather than hidden athlete ratings, keeping the first decisions consistent with the Unknown Athlete system.','The first post-testing call-up prompt now opens the National Pool directly, and the Opening Chapter wording makes clear that testing is evidence for a squad decision rather than an automatic promotion.']});
  if(typeof renderMenu==='function')renderMenu();
})();
