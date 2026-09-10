/* ===== Competition Selection Centre V2 ===== */
(function(){
'use strict';
if(window.__amSelectionCentreV2)return;window.__amSelectionCentreV2=1;

const $=id=>document.getElementById(id);
const esc=v=>typeof profileEscape==='function'?profileEscape(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o||{}));
const MAX_EVENTS_PER_ATHLETE=3;
const FILTERS=['all','track','jumps','throws','men','women','unfilled','warnings'];
const SORTS=['recommended','ability','season','pb','form','fitness','fatigue'];
let activeContext=null;
let activeDisc=null;
let eventFilter='all';
let candidateSort='recommended';
let searchTerm='';
let confirmMode=false;

function discsForEvent(e){return (e?.disc||[]).filter(d=>d&&d!=='ALL')}
function family(d){const x=(String(d)+' '+String(typeof discLabel==='function'?discLabel(d):d)).toLowerCase();if(/shot|discus|javelin|hammer|throw/.test(x))return'throws';if(/high.?jump|long.?jump|triple.?jump|pole.?vault|\bjump\b|vault/.test(x))return'jumps';return'track'}
function formLabel(a,d){
 const rows=recentResults(a,d);if(!rows.length)return'No recent results';
 const q=rows.map(r=>{const perf=Number(r.perf),pb=Number(a.pb);if(!Number.isFinite(perf)||!Number.isFinite(pb)||!pb)return .97;return DISCIPLINES?.[d]?.type==='time'?pb/perf:perf/pb});
 const avg=q.reduce((n,x)=>n+x,0)/q.length;
 return avg>=.995?'Excellent':avg>=.985?'Good':avg>=.965?'Average':'Poor';
}
function formTone(label){return label==='Excellent'?'good':label==='Good'?'good':label==='Poor'?'bad':'warn'}
function recentResults(a,d){
 try{return (profileHistory(a)||[]).filter(p=>p.disc===d&&p.season===s.game.season).slice(-3).reverse()}catch(_){return (a.profileResults||[]).filter(p=>p.disc===d&&p.season===s.game.season).slice(-3).reverse()}
}
function seasonBest(a,d){
 const rows=recentResults(a,d);let values=rows.map(x=>Number(x.perf)).filter(Number.isFinite);
 try{const st=selectionStats(a);if(Number.isFinite(st?.best))values.push(Number(st.best))}catch(_){}
 if(!values.length)return null;return values.reduce((best,x)=>best===null||((DISCIPLINES?.[d]?.type==='time')?x<best:x>best)?x:best,null);
}
function abilityValue(a){
 try{const text=assessmentText(a,'overall'),nums=String(text).match(/\d+(?:\.\d+)?/g)?.map(Number)||[];if(nums.length)return nums.reduce((n,x)=>n+x,0)/nums.length}catch(_){}
 return Number(a.overall)||0;
}
function displayAbility(a){try{return assessmentText(a,'overall')}catch(_){return String(a.overall??'—')}}
function fmt(d,v){if(v==null||!Number.isFinite(Number(v)))return'—';try{return fmtPerf(d,Number(v))}catch(_){return String(v)}}
function managedCandidates(d){return (s?.athletes||[]).filter(a=>a&&a.nation===managedNation()&&a.disc===d&&!a.retired&&a.inSquad!==false).sort((a,b)=>abilityValue(b)-abilityValue(a)||String(a.name).localeCompare(String(b.name)))}
function selectableIds(e,d){try{return new Set((eligibleFor(e,d)||[]).map(a=>a.id))}catch(_){return new Set()}}
function normalAvailability(e,d,a){
 if(a.retired)return{ok:false,label:'RETIRED',detail:'The athlete has retired.'};
 if(a.inSquad===false)return{ok:false,label:'NOT IN SQUAD',detail:'Call the athlete into the senior national squad before selecting them.'};
 if((a.injury||0)>0)return{ok:false,label:'INJURED',detail:`Unavailable for approximately ${a.injury} more week${a.injury===1?'':'s'}.`};
 try{if(activityBusy(a,e.week)){const label=typeof activityLabel==='function'?activityLabel(a):'';return{ok:false,label:'UNAVAILABLE',detail:label||'Another scheduled commitment overlaps this competition.'}}}catch(_){}
 if(e.elite&&Number(a.overall)<80)return{ok:false,label:'NOT ELIGIBLE',detail:'This meeting has an elite-entry requirement.'};
 if(e.qualified&&e.id!=='olympics'&&!((a.points||0)>=6||Number(a.overall)>=80))return{ok:false,label:'NOT QUALIFIED',detail:'The athlete has not met the competition qualification requirement.'};
 if(!selectableIds(e,d).has(a.id))return{ok:false,label:'NOT ELIGIBLE',detail:'The athlete does not currently satisfy this event’s selection rules.'};
 return{ok:true,label:'AVAILABLE',detail:'Eligible and available for selection.'};
}
function summitAvailability(a){
 if(a.retired)return{ok:false,label:'RETIRED',detail:'The athlete has retired.'};
 if(a.inSquad===false)return{ok:false,label:'NOT IN SQUAD',detail:'Only senior-squad athletes can enter the Summit Series.'};
 try{const ss=summitSeasonState(),why=summitUnavailable(a,ss.meetings?.[1]);if(why)return{ok:false,label:'UNAVAILABLE',detail:why}}catch(_){}
 return{ok:true,label:'AVAILABLE',detail:'Available for the full Summit Series commitment.'};
}
function recommendationNormal(e,d){
 const eligible=[...selectableIds(e,d)].map(id=>s.athletes.find(a=>a.id===id)).filter(Boolean);
 try{const p=selectionRecommendationPlan(e,d,eligible);return{ids:(p.athletes||[]).map(a=>a.id),note:p.note||'',reason:p.reason||'performance'}}catch(_){return{ids:eligible.slice(0,1).map(a=>a.id),note:'Best current balance of performance and readiness.',reason:'performance'}}
}
function summitRecommendation(d){
 try{const rec=summitCoachRecommendations()?.[d];const ids=(rec?.recommended||[]).filter(x=>x?.ad?.decision==='RECOMMEND').map(x=>x.a?.id).filter(Boolean);return{ids,note:ids.length?'Performance staff support this Summit commitment.':'No strong automatic recommendation.'}}catch(_){return{ids:[],note:'No strong automatic recommendation.'}}
}
function coachRole(d){const f=family(d);return f==='throws'?'Throws Coach':f==='jumps'?'Jumps Coach':'Sprint & Endurance Coach'}
function recommendationConfidence(ctx,d){
 const candidates=getCandidates(ctx,d).filter(x=>x.av.ok);if(candidates.length<=1)return'High';
 const sorted=[...candidates].sort((a,b)=>recommendScore(ctx,d,b.a)-recommendScore(ctx,d,a.a));const gap=recommendScore(ctx,d,sorted[0].a)-recommendScore(ctx,d,sorted[1].a);
 return gap>=7?'High':gap>=3?'Medium':'Low';
}
function recommendScore(ctx,d,a){
 const sb=seasonBest(a,d),pb=Number(a.pb)||0,ability=abilityValue(a),form=formLabel(a,d),formN=form==='Excellent'?8:form==='Good'?5:form==='Average'?2:-3,ready=(Number(a.fitness)||0)*.08-(Number(a.fatigue)||0)*.05;
 let perf=0;if(Number.isFinite(sb)){if(DISCIPLINES?.[d]?.type==='time')perf=Math.max(-8,Math.min(8,(pb/sb-1)*500));else perf=Math.max(-8,Math.min(8,(sb/pb-1)*500))}
 return ability+formN+ready+perf;
}
function ensureNormalState(e){
 e.selectionCentreV2??={};const st=e.selectionCentreV2;
 if(!st.initial)st.initial=clone(e.entries||{});
 if(!st.draft)st.draft=clone(e.decision?e.entries||{}:st.initial);
 st.sourceByDisc??={};
 if(e.decision){st.status='submitted';st.submitted??=clone(e.entries||{});st.locked=true}
 else updateStatusNormal(e,st);
 return st;
}
function updateStatusNormal(e,st=ensureNormalState(e)){
 if(e.decision){st.status='submitted';return st.status}
 const ds=discsForEvent(e);const any=ds.some(d=>(st.draft?.[d]||[]).length);const v=validateNormal(e,st,false);st.status=v.errors.length?'draft':any?'ready':'not_started';st.updatedAt=Date.now();return st.status;
}
function ensureSummitState(){
 const ss=summitSeasonState();ss.selectionCentreV2??={};const st=ss.selectionCentreV2;
 if(!Array.isArray(st.initial))st.initial=[...(ss.seriesEntries||[])];
 if(!Array.isArray(st.draft))st.draft=[...(ss.registrationLocked?ss.seriesEntries||[]:st.initial)];
 st.sourceByDisc??={};
 if(ss.registrationLocked){st.status='submitted';st.submitted??=[...(ss.seriesEntries||[])];st.locked=true}else updateStatusSummit(st);
 return st;
}
function updateStatusSummit(st=ensureSummitState()){
 const v=validateSummit(st,false);st.status=v.errors.length?'draft':st.draft.length?'ready':'not_started';st.updatedAt=Date.now();return st.status;
}
function contextNormal(e){return{type:'normal',event:e,id:e.id,title:e.name,location:e.location||'',week:e.week,discs:discsForEvent(e),state:ensureNormalState(e),mail:selectionMailForEvent(e)}}
function contextSummit(){const ss=summitSeasonState();return{type:'summit',id:'summit-'+s.game.season,title:'Summit Series',location:'Six-meeting international circuit',week:SUMMIT_WEEKS?.[0]||s.game.week,discs:Object.keys(DISCIPLINES||{}),state:ensureSummitState(),ss,mail:summitMailV2()}}
function selectionMailForEvent(e){return [...(s?.emails||[])].reverse().find(m=>m?.type==='selection'&&m.eventId===e.id&&!m.summitRegistration)||null}
function summitMailV2(){return [...(s?.emails||[])].reverse().find(m=>m?.summitRegistration)||null}
function draftFor(ctx,d){if(ctx.type==='summit')return ctx.state.draft.filter(id=>s.athletes.find(a=>a.id===id)?.disc===d);return ctx.state.draft?.[d]||[]}
function setDraftFor(ctx,d,ids,source='player'){
 if(ctx.type==='summit'){
  const other=ctx.state.draft.filter(id=>s.athletes.find(a=>a.id===id)?.disc!==d);ctx.state.draft=[...other,...ids];
 }else ctx.state.draft[d]=[...ids];
 ctx.state.sourceByDisc[d]=source;
 ctx.type==='summit'?updateStatusSummit(ctx.state):updateStatusNormal(ctx.event,ctx.state);
 save();
}
function entryLimit(ctx,d){if(ctx.type==='summit')return 2;try{return selectionEntryLimit(ctx.event,d)}catch(_){return 2}}
function getCandidates(ctx,d){return managedCandidates(d).map(a=>({a,av:ctx.type==='summit'?summitAvailability(a):normalAvailability(ctx.event,d,a)}))}
function selectedAcross(ctx,id){return ctx.discs.filter(d=>draftFor(ctx,d).includes(id))}
function athleteEventLimit(ctx,a){return Number(ctx.type==='normal'?ctx.event?.athleteEventLimit:null)||MAX_EVENTS_PER_ATHLETE}
function scheduleConflict(ctx,a,d){
 if(ctx.type!=='normal')return null;const schedule=ctx.event?.schedule||ctx.event?.eventSchedule;if(!schedule)return null;const current=schedule[d];if(!current)return null;
 const currentMin=parseClock(current);if(currentMin==null)return null;
 for(const other of selectedAcross(ctx,a.id)){if(other===d)continue;const t=parseClock(schedule[other]);if(t!=null&&Math.abs(t-currentMin)<=30)return{other,minutes:Math.abs(t-currentMin),current:String(current),otherTime:String(schedule[other])}}
 return null;
}
function parseClock(v){const m=String(v||'').match(/(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null}
function validationIssue(d,type,text,severity='error',athleteId=null){return{d,type,text,severity,athleteId}}
function validateNormal(e,st=ensureNormalState(e),includeWarnings=true){
 const errors=[],warnings=[],ds=discsForEvent(e),counts={};
 for(const d of ds){
  const picked=st.draft?.[d]||[],available=getCandidates({type:'normal',event:e,discs:ds,state:st},d).filter(x=>x.av.ok);
  if(includeWarnings&&!picked.length&&available.length)warnings.push(validationIssue(d,'empty',`${discLabel(d)} has no athlete selected.`,'warn'));
  if(picked.length>entryLimit({type:'normal',event:e},d))errors.push(validationIssue(d,'limit',`${discLabel(d)} exceeds its entry limit.`));
  const elig=selectableIds(e,d);for(const id of picked){counts[id]=(counts[id]||0)+1;if(!elig.has(id)){const a=s.athletes.find(x=>x.id===id);errors.push(validationIssue(d,'eligibility',`${a?.name||'Selected athlete'} is no longer eligible for ${discLabel(d)}.`,'error',id))}}
 }
 for(const [id,n] of Object.entries(counts)){const a=s.athletes.find(x=>x.id===id);const limit=athleteEventLimit({type:'normal',event:e},a);if(n>limit)errors.push(validationIssue(ds.find(d=>(st.draft?.[d]||[]).includes(id)),'athlete-limit',`${a?.name||'Athlete'} is selected in ${n}/${limit} allowed events.`,'error',id));else if(includeWarnings&&n>=3)warnings.push(validationIssue(ds.find(d=>(st.draft?.[d]||[]).includes(id)),'workload',`${a?.name||'Athlete'} has a high ${n}-event workload.`,'warn',id))}
 if(includeWarnings)for(const d of ds)for(const id of st.draft?.[d]||[]){const a=s.athletes.find(x=>x.id===id);if(!a)continue;if((a.fatigue||0)>=60)warnings.push(validationIssue(d,'fatigue',`${a.name} is carrying high fatigue (${a.fatigue}).`,'warn',id));else if((a.fatigue||0)>=45)warnings.push(validationIssue(d,'fatigue',`${a.name} is carrying moderate fatigue (${a.fatigue}).`,'warn',id));if((a.fitness||100)<82)warnings.push(validationIssue(d,'fitness',`${a.name} has reduced fitness (${a.fitness}).`,'warn',id));const c=scheduleConflict({type:'normal',event:e,discs:ds,state:st},a,d);if(c)warnings.push(validationIssue(d,'schedule',`${a.name}: ${discLabel(c.other)} and ${discLabel(d)} are only ${c.minutes} minutes apart.`,'warn',id))}
 return{errors,warnings:dedupeIssues(warnings)};
}
function validateSummit(st=ensureSummitState(),includeWarnings=true){
 const errors=[],warnings=[],ctx={type:'summit',discs:Object.keys(DISCIPLINES||{}),state:st};
 for(const d of ctx.discs){const ids=draftFor(ctx,d),available=getCandidates(ctx,d).filter(x=>x.av.ok);if(includeWarnings&&!ids.length&&available.length)warnings.push(validationIssue(d,'empty',`${discLabel(d)} has no Summit athlete selected.`,'warn'));if(ids.length>2)errors.push(validationIssue(d,'limit',`${discLabel(d)} exceeds the two-athlete Summit limit.`));for(const id of ids){const a=s.athletes.find(x=>x.id===id),av=a?summitAvailability(a):{ok:false};if(!av.ok)errors.push(validationIssue(d,'eligibility',`${a?.name||'Selected athlete'} is unavailable for the Summit Series.`,'error',id));if(includeWarnings&&a){const ad=summitAdvice(a,summitSeasonState().meetings?.[1]);if(ad?.tone==='warn')warnings.push(validationIssue(d,'schedule',`${a.name}: ${ad.text}`,'warn',id));if((a.fatigue||0)>=55)warnings.push(validationIssue(d,'fatigue',`${a.name} is carrying high fatigue (${a.fatigue}).`,'warn',id))}}}
 return{errors,warnings:dedupeIssues(warnings)};
}
function dedupeIssues(rows){const seen=new Set();return rows.filter(x=>{const k=x.d+'|'+x.type+'|'+x.text;if(seen.has(k))return false;seen.add(k);return true})}
function validate(ctx,includeWarnings=true){return ctx.type==='summit'?validateSummit(ctx.state,includeWarnings):validateNormal(ctx.event,ctx.state,includeWarnings)}
function deadlineText(ctx){
 const close=ctx.type==='summit'?(SUMMIT_WEEKS?.[0]||ctx.week):ctx.week;const n=Number(close)-Number(s.game.week);
 if(n<=0)return'Selection closes this week';if(n===1)return'Selection closes next week';return`Selection closes in ${n} weeks`;
}
function coachPlan(ctx,d){return ctx.type==='summit'?summitRecommendation(d):recommendationNormal(ctx.event,d)}
function coachPicks(ctx,d){return coachPlan(ctx,d).ids||[]}
function applyCoach(ctx,emptyOnly=false){
 let changed=0;for(const d of ctx.discs){if(emptyOnly&&draftFor(ctx,d).length)continue;const limit=entryLimit(ctx,d),ids=coachPicks(ctx,d).filter(id=>getCandidates(ctx,d).some(x=>x.a.id===id&&x.av.ok)).slice(0,limit);if(ids.length){setDraftForNoSave(ctx,d,ids,emptyOnly?'autofill':'coach');changed++}}
 if(changed){ctx.type==='summit'?updateStatusSummit(ctx.state):updateStatusNormal(ctx.event,ctx.state);save();toast(emptyOnly?'Empty events filled with coach recommendations':'Coach recommendations applied as a draft')}else toast('No additional coach recommendations are available');
 openCentre(ctx,activeDisc||firstPriorityDisc(ctx));
}
function setDraftForNoSave(ctx,d,ids,source){if(ctx.type==='summit'){const other=ctx.state.draft.filter(id=>s.athletes.find(a=>a.id===id)?.disc!==d);ctx.state.draft=[...other,...ids]}else ctx.state.draft[d]=[...ids];ctx.state.sourceByDisc[d]=source}
function resetDraft(ctx){
 const current=JSON.stringify(ctx.type==='summit'?ctx.state.draft:ctx.state.draft),initial=JSON.stringify(ctx.state.initial||{});if(current===initial)return;
 const many=ctx.discs.reduce((n,d)=>n+draftFor(ctx,d).length,0)>2;if(many&&!window.confirm('Reset all draft selection changes?'))return;
 if(ctx.type==='summit')ctx.state.draft=[...(ctx.state.initial||[])];else ctx.state.draft=clone(ctx.state.initial||{});ctx.state.sourceByDisc={};ctx.type==='summit'?updateStatusSummit(ctx.state):updateStatusNormal(ctx.event,ctx.state);save();openCentre(ctx,firstPriorityDisc(ctx));
}
function firstPriorityDisc(ctx){const v=validate(ctx,true);return v.errors[0]?.d||v.warnings[0]?.d||ctx.discs.find(d=>!draftFor(ctx,d).length)||ctx.discs[0]}
function statusForDisc(ctx,d){const picked=draftFor(ctx,d),v=validate(ctx,true),hasError=v.errors.some(x=>x.d===d),hasWarn=v.warnings.some(x=>x.d===d);if(hasError)return'issue';if(hasWarn)return'warning';if(picked.length)return'ready';return'empty'}
function filteredDiscs(ctx){return ctx.discs.filter(d=>{const f=family(d);if(eventFilter==='track'&&f!=='track')return false;if(eventFilter==='jumps'&&f!=='jumps')return false;if(eventFilter==='throws'&&f!=='throws')return false;if(eventFilter==='men'&&!String(d).startsWith('M'))return false;if(eventFilter==='women'&&!String(d).startsWith('W'))return false;if(eventFilter==='unfilled'&&draftFor(ctx,d).length)return false;if(eventFilter==='warnings'&&!['issue','warning'].includes(statusForDisc(ctx,d)))return false;return true})}
function comparePerformance(d,a,b,key){
 if(key==='pb'){const av=Number(a.pb),bv=Number(b.pb);return DISCIPLINES?.[d]?.type==='time'?av-bv:bv-av}
 if(key==='season'){const av=seasonBest(a,d),bv=seasonBest(b,d);if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return-1;return DISCIPLINES?.[d]?.type==='time'?av-bv:bv-av}
 return 0;
}
function sortedCandidates(ctx,d){
 const rec=new Set(coachPicks(ctx,d));let rows=getCandidates(ctx,d);const q=searchTerm.trim().toLowerCase();if(q)rows=rows.filter(x=>String(x.a.name).toLowerCase().includes(q));
 rows.sort((x,y)=>{if(x.av.ok!==y.av.ok)return x.av.ok?-1:1;const a=x.a,b=y.a;if(candidateSort==='recommended'){const ra=rec.has(a.id),rb=rec.has(b.id);if(ra!==rb)return rb-ra;return recommendScore(ctx,d,b)-recommendScore(ctx,d,a)}if(candidateSort==='ability')return abilityValue(b)-abilityValue(a);if(candidateSort==='season'||candidateSort==='pb')return comparePerformance(d,a,b,candidateSort);if(candidateSort==='form')return formRank(formLabel(b,d))-formRank(formLabel(a,d));if(candidateSort==='fitness')return (b.fitness||0)-(a.fitness||0);if(candidateSort==='fatigue')return (a.fatigue||0)-(b.fatigue||0);return 0});return rows;
}
function formRank(v){return v==='Excellent'?4:v==='Good'?3:v==='Average'?2:v==='Poor'?1:0}
function narrativeTags(a,d){const tags=[];if((a.medals?.g||0)>0)tags.push('Major Champion');if((a.injuryHistory||[]).length&&a.injury===0)tags.push('Returned From Injury');if(a.age<=21)tags.push('Young Prospect');if(formLabel(a,d)==='Excellent')tags.push('In Excellent Form');try{const nr=s.records?.national?.[a.nation]?.[d];if(nr?.holder===a.name)tags.push('National Record Holder')}catch(_){}return tags.slice(0,2)}
function candidateCard(ctx,d,row){
 const {a,av}=row,picked=draftFor(ctx,d).includes(a.id),rec=new Set(coachPicks(ctx,d)),events=selectedAcross(ctx,a.id),limit=athleteEventLimit(ctx,a),form=formLabel(a,d),recent=recentResults(a,d),sb=seasonBest(a,d),tags=narrativeTags(a,d),conflict=scheduleConflict(ctx,a,d),wouldExceed=!picked&&events.length>=limit,disabled=!av.ok||wouldExceed||(draftFor(ctx,d).length>=entryLimit(ctx,d)&&!picked);
 const workload=events.length?`${events.map(x=>discLabel(x)).join(' · ')} · ${events.length}/${limit} events`:`0/${limit} events`;
 return `<article class="scv2-athlete ${picked?'selected':''} ${!av.ok?'unavailable':''}">
  <div class="scv2-athlete-top"><div><button class="scv2-athlete-name" type="button" data-scv2-profile="${esc(a.id)}">${esc(a.name)}</button><div class="scv2-tags">${rec.has(a.id)?'<span class="info">COACH PICK</span>':''}${tags.map(t=>`<span>${esc(t)}</span>`).join('')}${!av.ok?`<span class="bad">${esc(av.label)}</span>`:''}</div></div><div class="scv2-form ${formTone(form)}">${esc(form)}</div></div>
  <div class="scv2-metrics"><div><small>Staff ability</small><strong>${esc(displayAbility(a))}</strong></div><div><small>Season best</small><strong>${fmt(d,sb)}</strong></div><div><small>PB</small><strong>${fmt(d,Number(a.pb))}</strong></div><div><small>Fitness</small><strong>${a.fitness}%</strong></div><div><small>Fatigue</small><strong>${a.fatigue}</strong></div></div>
  <div class="scv2-recent"><small>Recent</small><span>${recent.length?recent.map(r=>fmt(d,Number(r.perf))).join(' · '):'No competitive results this season'}</span></div>
  <div class="scv2-workload ${events.length>=3?'warn':''}"><small>Workload</small><span>${esc(workload)}</span></div>
  ${!av.ok?`<div class="scv2-note bad">${esc(av.detail)}</div>`:''}${conflict?`<div class="scv2-note warn">Potential schedule conflict with ${esc(discLabel(conflict.other))} (${conflict.minutes} min gap).</div>`:''}${wouldExceed?`<div class="scv2-note bad">Event limit reached.</div>`:''}
  <button class="btn ${picked?'good':'secondary'} scv2-pick" type="button" data-scv2-pick="${esc(a.id)}" ${disabled?'disabled':''}>${picked?'SELECTED':'SELECT'}</button>
 </article>`;
}
function coachPanel(ctx,d){const plan=coachPlan(ctx,d),names=plan.ids.map(id=>s.athletes.find(a=>a.id===id)?.name).filter(Boolean),confidence=recommendationConfidence(ctx,d);return `<section class="scv2-coach"><div><small>${esc(coachRole(d))}</small><strong>${names.length?esc(names.join(', ')):'No automatic pick'}</strong></div><span>${confidence} confidence</span><p>${esc(plan.note||'The staff view balances performance evidence, form, fitness, fatigue and the wider calendar.')}</p></section>`}
function eventRow(ctx,d){const status=statusForDisc(ctx,d),ids=draftFor(ctx,d),names=ids.map(id=>s.athletes.find(a=>a.id===id)?.name).filter(Boolean),rec=coachPicks(ctx,d);return `<button class="scv2-event ${activeDisc===d?'on':''} ${status}" type="button" data-scv2-disc="${esc(d)}"><div><small>${esc(discLabel(d))}</small><strong>${names.length?esc(names.join(', ')):'NO ATHLETE SELECTED'}</strong></div><span>${status==='issue'?'ISSUE':status==='warning'?'WARNING':names.length?'READY':'EMPTY'}</span>${rec.length?'<i>COACH PICK</i>':''}</button>`}
function summaryHTML(ctx){
 const v=validate(ctx,true),filled=ctx.discs.filter(d=>draftFor(ctx,d).length).length,total=ctx.discs.length,athletes=new Set(ctx.discs.flatMap(d=>draftFor(ctx,d))),issues=[...v.errors,...v.warnings].slice(0,5);return `<div class="scv2-summary-head"><small>Your Team</small><strong>${filled}/${total} events selected</strong><span>${athletes.size} athlete${athletes.size===1?'':'s'}</span></div><div class="scv2-summary-events">${ctx.discs.map(d=>`<button type="button" data-scv2-summary-disc="${esc(d)}"><small>${esc(discLabel(d))}</small><strong>${draftFor(ctx,d).map(id=>esc(s.athletes.find(a=>a.id===id)?.name||'Unknown')).join(', ')||'EMPTY'}</strong></button>`).join('')}</div><div class="scv2-summary-alerts">${issues.length?issues.map(x=>`<button type="button" class="${x.severity==='error'?'bad':'warn'}" data-scv2-issue-disc="${esc(x.d)}">${x.severity==='error'?'!':'⚠'} ${esc(x.text)}</button>`).join(''):'<div class="good"><strong>TEAM READY</strong><span>No selection issues detected.</span></div>'}</div>`}
function assessmentHTML(ctx){const v=validate(ctx,true),filled=ctx.discs.filter(d=>draftFor(ctx,d).length).length,track=ctx.discs.filter(d=>family(d)==='track'&&draftFor(ctx,d).length).length,field=ctx.discs.filter(d=>family(d)!=='track'&&draftFor(ctx,d).length).length;return `<div class="scv2-assessment"><small>Coaching Assessment</small><strong>${v.errors.length?`${v.errors.length} issue${v.errors.length===1?'':'s'} need attention`:v.warnings.length?'Competitive team with notes':'Strong selection'}</strong><span>Track ${track} · Field ${field} · ${filled}/${ctx.discs.length} covered</span></div>`}
function centreHTML(ctx){
 const d=activeDisc&&ctx.discs.includes(activeDisc)?activeDisc:firstPriorityDisc(ctx);activeDisc=d;const v=validate(ctx,true),filled=ctx.discs.filter(x=>draftFor(ctx,x).length).length,total=ctx.discs.length,readonly=isLocked(ctx),filtered=filteredDiscs(ctx),rows=sortedCandidates(ctx,d);
 return `<div class="scv2-shell">
  <header class="scv2-head"><div><small>${ctx.type==='summit'?'SUMMIT SERIES SELECTION':'COMPETITION SELECTION'}</small><h2>${esc(ctx.title)}</h2><p>${esc(ctx.location)} · ${deadlineText(ctx)} · Draft selection saved automatically</p></div><div class="scv2-head-actions"><span class="scv2-status ${v.errors.length?'bad':v.warnings.length?'warn':'good'}">${readonly?'SELECTION LOCKED':v.errors.length?`${v.errors.length} ISSUE${v.errors.length===1?'':'S'}`:'TEAM READY'}</span><button id="scv2Close" class="scv2-close" type="button" aria-label="Close Selection Centre">×</button></div></header>
  <div class="scv2-toolbar"><div><strong>${filled}/${total} selected</strong><span>${v.errors.length?`${v.errors.length} need attention`:v.warnings.length?`${v.warnings.length} warning${v.warnings.length===1?'':'s'}`:'Ready to review'}</span></div><div class="scv2-toolbar-actions">${readonly?'':`<button class="btn ghost" id="scv2Auto">AUTO FILL EMPTY</button><button class="btn secondary" id="scv2Coach">APPLY COACH RECOMMENDATIONS</button><button class="btn ghost" id="scv2Reset">RESET</button>`}</div></div>
  <main class="scv2-grid">
   <aside class="scv2-events"><div class="scv2-filters">${FILTERS.map(f=>`<button type="button" data-scv2-filter="${f}" class="${eventFilter===f?'on':''}">${f==='all'?'ALL':f.toUpperCase()}</button>`).join('')}</div><div class="scv2-event-list">${filtered.length?filtered.map(x=>eventRow(ctx,x)).join(''):'<div class="scv2-empty">No events match this filter.</div>'}</div></aside>
   <section class="scv2-candidates"><div class="scv2-section-head"><div><small>${esc(discLabel(d))}</small><h3>Choose Athlete</h3></div><div><input id="scv2Search" type="search" value="${esc(searchTerm)}" placeholder="Search athlete" aria-label="Search athletes"><select id="scv2Sort" aria-label="Sort candidates">${SORTS.map(x=>`<option value="${x}" ${candidateSort===x?'selected':''}>${x==='ability'?'Staff ability':x==='season'?'Season best':x==='pb'?'Personal best':x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></div></div>${coachPanel(ctx,d)}<div class="scv2-candidate-list">${rows.length?rows.map(x=>candidateCard(ctx,d,x)).join(''):'<div class="scv2-empty">No squad athletes match this search.</div>'}</div></section>
   <aside class="scv2-summary">${summaryHTML(ctx)}${assessmentHTML(ctx)}</aside>
  </main>
  <footer class="scv2-foot"><div><strong>${filled}/${total} Selected</strong><span>${readonly?'Submitted team':v.errors.length?`${v.errors.length} issues need attention`:v.warnings.length?`${v.warnings.length} warnings to review`:'Team ready'}</span></div><div>${readonly?'<button class="btn primary" id="scv2Done">DONE</button>':'<button class="btn secondary" id="scv2Review">REVIEW TEAM</button><button class="btn primary" id="scv2Confirm">CONFIRM TEAM</button>'}</div></footer>
 </div>`;
}
function confirmationHTML(ctx){
 const v=validate(ctx,true),athletes=new Set(ctx.discs.flatMap(d=>draftFor(ctx,d))),filled=ctx.discs.filter(d=>draftFor(ctx,d).length).length;return `<div class="scv2-confirm"><div class="scv2-confirm-card"><small>CONFIRM ${ctx.type==='summit'?'SUMMIT SERIES':'COMPETITION'} TEAM</small><h2>${esc(ctx.title)}</h2><div class="scv2-confirm-stats"><div><small>Events</small><strong>${filled}/${ctx.discs.length}</strong></div><div><small>Athletes</small><strong>${athletes.size}</strong></div><div><small>Warnings</small><strong>${v.warnings.length}</strong></div></div><h3>Key notes</h3><div class="scv2-confirm-notes">${v.warnings.length?v.warnings.slice(0,5).map(x=>`<div>⚠ ${esc(x.text)}</div>`).join(''):'<div>✓ No eligibility, workload or availability problems detected.</div>'}</div><p>Submitting locks this selection. Empty events are allowed and Event Day will read directly from the submitted team.</p><div class="scv2-confirm-actions"><button class="btn ghost" id="scv2Return">RETURN TO SELECTION</button><button class="btn primary" id="scv2Submit">SUBMIT TEAM</button></div></div></div>`}
function ensureDialog(){let d=$('amSelectionCentreV2');if(d)return d;d=document.createElement('dialog');d.id='amSelectionCentreV2';d.className='scv2-dialog';document.body.appendChild(d);return d}
function openCentre(ctx,disc=null){activeContext=ctx;confirmMode=false;if(disc)activeDisc=disc;if(!activeDisc||!ctx.discs.includes(activeDisc))activeDisc=firstPriorityDisc(ctx);const d=ensureDialog();renderCentre();if(!d.open)d.showModal()}
function renderCentre(){const dlg=ensureDialog();if(!activeContext)return;dlg.innerHTML=confirmMode?confirmationHTML(activeContext):centreHTML(activeContext);bindCentre()}
function jumpToDisc(d){if(!activeContext?.discs.includes(d))return;activeDisc=d;eventFilter='all';confirmMode=false;renderCentre();requestAnimationFrame(()=>ensureDialog().querySelector('.scv2-candidates')?.scrollTo({top:0}))}
function togglePick(ctx,d,id){if(isLocked(ctx))return;const row=getCandidates(ctx,d).find(x=>x.a.id===id);if(!row?.av.ok){toast(row?.av.detail||'Athlete unavailable');return}const ids=draftFor(ctx,d),on=ids.includes(id),limit=entryLimit(ctx,d),a=row.a,eventLimit=athleteEventLimit(ctx,a),events=selectedAcross(ctx,id);if(!on&&ids.length>=limit){toast(`${discLabel(d)} has ${limit} entry place${limit===1?'':'s'}`);return}if(!on&&events.length>=eventLimit){toast(`${a.name} has reached the ${eventLimit}-event limit`);return}setDraftFor(ctx,d,on?ids.filter(x=>x!==id):[...ids,id],'player');activeDisc=d;renderCentre()}
function reviewTeam(ctx){eventFilter='warnings';if(!filteredDiscs(ctx).length)eventFilter='all';activeDisc=firstPriorityDisc(ctx);renderCentre()}
function requestConfirm(ctx){const v=validate(ctx,true);if(v.errors.length){toast(`${v.errors.length} selection issue${v.errors.length===1?'':'s'} need attention`);jumpToDisc(v.errors[0].d);return}confirmMode=true;renderCentre()}
function markMailSubmitted(mail,snapshot,label,source){if(!mail)return;mail.selectionSubmitted=true;mail.selectionSubmittedSeason=s.game.season;mail.selectionSubmittedWeek=s.game.week;mail.selectionSubmittedLabel=label;mail.selectionSubmittedSnapshot=snapshot;mail.selectionSubmittedSource=source;mail.unread=false}
function snapshotNormal(ctx){return ctx.discs.map(d=>({disc:d,names:draftFor(ctx,d).map(id=>s.athletes.find(a=>a.id===id)?.name).filter(Boolean)})).filter(x=>x.names.length)}
function snapshotSummit(ctx){return ctx.discs.map(d=>({disc:d,names:draftFor(ctx,d).map(id=>s.athletes.find(a=>a.id===id)?.name).filter(Boolean)})).filter(x=>x.names.length)}
function submitNormal(ctx){
 const e=ctx.event,st=ctx.state;if(e.decision||st.locked){toast('Selection is already locked');return}const v=validate(ctx,true);if(v.errors.length){confirmMode=false;jumpToDisc(v.errors[0].d);return}
 e.entries=clone(st.draft);e.selectionReasons??={};for(const d of ctx.discs)e.selectionReasons[d]??=st.sourceByDisc[d]==='coach'?'performance':'performance';
 let ok=false;try{ok=confirmEventSelection(e)!==false}catch(err){console.error('Selection submit failed',err);toast('Selection could not be submitted');return}if(!ok)return;
 st.status='submitted';st.submitted=clone(e.entries);st.submittedAt=Date.now();st.locked=true;markMailSubmitted(ctx.mail,snapshotNormal(ctx),'Team submitted',Object.values(st.sourceByDisc).every(x=>x==='coach')?'coach':'player');save();finishSubmission(ctx);
}
function submitSummitV2(ctx){
 const ss=ctx.ss,st=ctx.state;if(ss.registrationLocked||st.locked){toast('Summit selection is already locked');return}const v=validate(ctx,true);if(v.errors.length){confirmMode=false;jumpToDisc(v.errors[0].d);return}
 ss.seriesEntries=[...new Set(st.draft)];for(const m of summitMeetings())m.entries=[...ss.seriesEntries];ss.registrationLocked=true;
 for(const id of ss.seriesEntries){const a=s.athletes.find(x=>x.id===id);if(!a)continue;if(a.squadAgreement){const target=careerNow()+Math.max(0,SUMMIT_WEEKS.at(-1)-s.game.week)+1;if(a.squadAgreement.endCareerWeek<target)a.squadAgreement.endCareerWeek=target}try{rememberAthlete(a,'Summit Series',`Committed to all six Summit Series meetings from Week ${SUMMIT_WEEKS[0]} to Week ${SUMMIT_WEEKS.at(-1)}.`)}catch(_){}for(const e of s.events.filter(e=>!e.completed&&e.week>=SUMMIT_WEEKS[0]&&e.week<=SUMMIT_WEEKS.at(-1)))for(const d of Object.keys(e.entries||{}))e.entries[d]=(e.entries[d]||[]).filter(x=>x!==id)}
 st.status='submitted';st.submitted=[...ss.seriesEntries];st.submittedAt=Date.now();st.locked=true;markMailSubmitted(ctx.mail,snapshotSummit(ctx),'Summit Series team submitted',Object.values(st.sourceByDisc).every(x=>x==='coach')?'coach':'player');save();finishSubmission(ctx);
}
function finishSubmission(ctx){const dlg=ensureDialog();if(dlg.open)dlg.close();toast(`${ctx.title} team submitted and locked`);if(ctx.mail){openMail=ctx.mail.id;view('inbox');setTimeout(renderSelectionEmail,0)}else if(ctx.type==='summit')view('league');else view('home')}
function submit(ctx){ctx.type==='summit'?submitSummitV2(ctx):submitNormal(ctx)}
function isLocked(ctx){return ctx.type==='summit'?!!(ctx.ss.registrationLocked||ctx.state.locked):!!(ctx.event.decision||ctx.state.locked)}
function bindCentre(){const dlg=ensureDialog(),ctx=activeContext;if(!ctx)return;$('scv2Close')&&($('scv2Close').onclick=()=>dlg.close());$('scv2Done')&&($('scv2Done').onclick=()=>dlg.close());dlg.querySelectorAll('[data-scv2-disc],[data-scv2-summary-disc],[data-scv2-issue-disc]').forEach(b=>b.onclick=()=>jumpToDisc(b.dataset.scv2Disc||b.dataset.scv2SummaryDisc||b.dataset.scv2IssueDisc));dlg.querySelectorAll('[data-scv2-filter]').forEach(b=>b.onclick=()=>{eventFilter=b.dataset.scv2Filter;renderCentre()});dlg.querySelectorAll('[data-scv2-pick]').forEach(b=>b.onclick=()=>togglePick(ctx,activeDisc,b.dataset.scv2Pick));dlg.querySelectorAll('[data-scv2-profile]').forEach(b=>b.onclick=()=>{try{openAthleteProfile(b.dataset.scv2Profile)}catch(_){const a=s.athletes.find(x=>x.id===b.dataset.scv2Profile);if(a&&typeof showAthleteProfile==='function')showAthleteProfile(a)}});if($('scv2Search'))$('scv2Search').oninput=e=>{searchTerm=e.target.value;const pos=e.target.selectionStart;renderCentre();requestAnimationFrame(()=>{const x=$('scv2Search');if(x){x.focus();try{x.setSelectionRange(pos,pos)}catch(_){}}})};if($('scv2Sort'))$('scv2Sort').onchange=e=>{candidateSort=e.target.value;renderCentre()};$('scv2Auto')&&($('scv2Auto').onclick=()=>applyCoach(ctx,true));$('scv2Coach')&&($('scv2Coach').onclick=()=>applyCoach(ctx,false));$('scv2Reset')&&($('scv2Reset').onclick=()=>resetDraft(ctx));$('scv2Review')&&($('scv2Review').onclick=()=>reviewTeam(ctx));$('scv2Confirm')&&($('scv2Confirm').onclick=()=>requestConfirm(ctx));$('scv2Return')&&($('scv2Return').onclick=()=>{confirmMode=false;renderCentre()});$('scv2Submit')&&($('scv2Submit').onclick=()=>submit(ctx))}

function mailCoachPointers(ctx){
 const rows=[];for(const d of ctx.discs){const candidates=getCandidates(ctx,d).filter(x=>x.av.ok);if(!candidates.length)continue;const plan=coachPlan(ctx,d),ids=plan.ids,names=ids.map(id=>s.athletes.find(a=>a.id===id)).filter(Boolean),confidence=recommendationConfidence(ctx,d),top=names[0];if(!top)continue;const form=formLabel(top,d),risk=(top.fatigue||0)>=55||(top.fitness||100)<85,close=confidence==='Low';if(risk)rows.push({priority:3,d,text:`${discLabel(d)} — ${top.name} remains the staff pick, but ${top.fatigue>=55?'fatigue is high':'fitness needs monitoring'}.`});else if(close)rows.push({priority:2,d,text:`${discLabel(d)} — close decision. ${top.name} has the slight staff edge on current evidence.`});else if(form==='Excellent')rows.push({priority:1,d,text:`${discLabel(d)} — ${top.name} is the preferred choice and arrives in excellent recent form.`});}
 if(rows.length<3)for(const d of ctx.discs){if(rows.some(x=>x.d===d))continue;const top=coachPlan(ctx,d).ids.map(id=>s.athletes.find(a=>a.id===id)).find(Boolean);if(top)rows.push({priority:0,d,text:`${discLabel(d)} — staff recommend ${top.name}.`});if(rows.length>=4)break}
 return rows.sort((a,b)=>b.priority-a.priority).slice(0,5);
}
function submittedMailHTML(ctx){const snap=ctx.type==='summit'?snapshotSummit(ctx):snapshotNormal(ctx),filled=snap.length;return `<div class="scv2-mail-submitted"><small>TEAM SUBMITTED</small><strong>${filled}/${ctx.discs.length} events filled</strong><span>The submitted team is locked and will feed directly into Event Day.</span><div>${snap.slice(0,4).map(x=>`<p><b>${esc(discLabel(x.disc))}</b><em>${esc(x.names.join(', '))}</em></p>`).join('')}</div></div>`}
function renderSelectionEmail(){
 const reader=$('reader'),m=(s?.emails||[]).find(x=>x.id===openMail)||(s?.emails||[]).at?.(-1);if(!reader||!m||m.type!=='selection')return;let ctx=null;if(m.summitRegistration&&typeof summitSeasonState==='function')ctx=contextSummit();else{const e=m.eventId?(s.events||[]).find(x=>x.id===m.eventId):null;if(!e||e.id==='olympics'||e.completed||!['competition','championship'].includes(e.kind))return;ctx=contextNormal(e)}
 reader.querySelectorAll('.am-urgent-selection,.am-hotfix-confirmed,.selection-submitted-banner').forEach(x=>x.remove());const body=reader.querySelector('.reader-body'),actions=reader.querySelector('.reader-actions');if(!body||!actions)return;const locked=isLocked(ctx)||m.selectionSubmitted;if(locked){body.innerHTML=submittedMailHTML(ctx);actions.className='reader-actions scv2-mail-actions';actions.innerHTML='<button id="scv2MailView" class="btn primary">VIEW SELECTION</button>';$('scv2MailView').onclick=()=>openCentre(ctx,ctx.discs[0]);return}
 const pointers=mailCoachPointers(ctx);body.innerHTML=`<div class="scv2-mail"><div class="scv2-mail-intro"><small>SELECTION REQUIRED</small><strong>${esc(ctx.title)}</strong><span>${deadlineText(ctx)}</span></div><div class="scv2-mail-coach"><small>COACH'S VIEW</small>${pointers.length?pointers.map(x=>`<button type="button" data-scv2-mail-disc="${esc(x.d)}">${esc(x.text)}</button>`).join(''):'<p>The staff have no major concerns. Open the Selection Centre to review the team.</p>'}</div><p>Use the staff recommendation as a starting draft, or make the calls yourself. Empty events are allowed and nothing is submitted until you confirm the team.</p></div>`;actions.className='reader-actions scv2-mail-actions';actions.innerHTML='<button id="scv2MailCoach" class="btn secondary">APPLY COACH TEAM</button><button id="scv2MailChoose" class="btn primary">CHOOSE TEAM</button>';reader.querySelectorAll('[data-scv2-mail-disc]').forEach(b=>b.onclick=()=>openCentre(ctx,b.dataset.scv2MailDisc));$('scv2MailCoach').onclick=()=>applyCoach(ctx,false);$('scv2MailChoose').onclick=()=>openCentre(ctx,firstPriorityDisc(ctx));
}
function enhanceSummitLanding(){
 if(currentView!=='league'||typeof summitSeasonState!=='function')return;const root=$('league'),roster=root?.querySelector('.summit-series-roster');if(!roster)return;const ctx=contextSummit(),locked=isLocked(ctx),filled=ctx.discs.filter(d=>draftFor(ctx,d).length).length;roster.innerHTML=`<div class="summit-series-roster-head"><div><div class="summit-kicker">SEASON ROSTER</div><h3>${locked?'Summit Series team submitted':'Competition Selection Centre'}</h3><p>${locked?'The submitted roster is locked for the full six-meeting circuit.':'Build the Summit roster in the dedicated Selection Centre. Draft choices are saved automatically and coach recommendations never submit without review.'}</p></div><span class="status ${locked?'good':'live'}">${locked?'ROSTER LOCKED':'SELECTION REQUIRED'}</span></div><div class="scv2-summit-launch"><div><small>Selection progress</small><strong>${filled}/${ctx.discs.length} events covered</strong><span>${deadlineText(ctx)}</span></div><button id="scv2SummitLaunch" class="btn primary">${locked?'VIEW SELECTION':'OPEN SELECTION CENTRE'}</button></div>`;$('scv2SummitLaunch').onclick=()=>openCentre(ctx,firstPriorityDisc(ctx));
}

window.openCompetitionSelectionCentre=function(eventOrId){const e=typeof eventOrId==='string'?(s.events||[]).find(x=>x.id===eventOrId):eventOrId;if(e){const ctx=contextNormal(e);openCentre(ctx,firstPriorityDisc(ctx))}};
window.openCompactEventSelection=function(e){if(e){const ctx=contextNormal(e);openCentre(ctx,firstPriorityDisc(ctx))}};
window.openSummitSelectionCentre=function(){const ctx=contextSummit();openCentre(ctx,firstPriorityDisc(ctx))};

if(typeof drawReader==='function'){const base=drawReader;drawReader=function(){const out=base();setTimeout(renderSelectionEmail,0);return out}}
if(typeof drawSummitSeries==='function'){const base=drawSummitSeries;drawSummitSeries=function(){const out=base();setTimeout(enhanceSummitLanding,0);return out}}

if(typeof applyRecommendedEventSelection==='function'){
 applyRecommendedEventSelection=function(e){if(!e||e.completed||e.decision)return false;const ctx=contextNormal(e);applyCoach(ctx,false);return true}
}
if(typeof applyRecommendedSummitSelection==='function'){
 applyRecommendedSummitSelection=function(){if(typeof summitRegistrationOpen==='function'&&!summitRegistrationOpen())return false;const ctx=contextSummit();applyCoach(ctx,false);return true}
}

if(typeof window.addDevelopmentUpdate==='function')window.addDevelopmentUpdate({timestamp:'2026-09-10T12:20:00+01:00',date:'10 September 2026',title:'Competition Selection Centre V2',items:['Selection emails are now short decision briefings only: concise coach pointers plus routes into the dedicated Selection Centre.','Coach recommendations now populate a saved draft for review instead of immediately submitting the team. Auto Fill Empty Events leaves manual choices untouched.','The new iPad-first Selection Centre keeps events, athlete candidates and the overall team visible together, with search, sorting, recent results, form, staff ability, season best, PB, fitness, fatigue and availability reasons.','Draft selections persist when you leave. Validation catches eligibility changes, entry limits, athlete workload, fatigue and schedule warnings before submission, while empty events remain an allowed choice.','Confirm Team now opens one compact review step. Submission is single-use, locks the official team, updates the original email and becomes the source Event Day reads from. Summit Series registration now routes through the same Selection Centre.']});
setTimeout(()=>{renderSelectionEmail();enhanceSummitLanding()},0);
})();
/* ===== End Competition Selection Centre V2 ===== */
