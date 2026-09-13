from pathlib import Path
import re

ROOT=Path('.')

def read(path):
    return (ROOT/path).read_text(encoding='utf-8')

def write(path,text):
    (ROOT/path).write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    if old not in text:
        raise SystemExit(f'Missing patch target: {label}')
    if text.count(old)!=1:
        raise SystemExit(f'Ambiguous patch target {label}: {text.count(old)} matches')
    return text.replace(old,new,1)

def replace_line(text,prefix,newline,label):
    pat=re.compile(r'^'+re.escape(prefix)+r'.*$',re.M)
    m=pat.search(text)
    if not m:
        raise SystemExit(f'Missing line target: {label}')
    return text[:m.start()]+newline+text[m.end():]

# ---------------------------------------------------------------------------
# Programme Economy V4: planning clarity, contract impact, nation ownership,
# and programme decision integration.
# ---------------------------------------------------------------------------
p='scripts/programme-economy-v2.js'
t=read(p)
t=replace_once(t,"const V=3,UI=","const V=4,UI=",'economy state version')
t=replace_once(t,"bonusPaid:{},commercial:","bonusPaid:{},staffContractHistory:[],commercial:",'staff contract history base')
t=replace_once(t,"p.bonusPaid??={};p.commercial", "p.bonusPaid??={};p.staffContractHistory??=[];p.commercial",'staff contract history migration')

old_mail="function mail(k,sub,body,type='info'){safe(()=>newMail(sender(k),sub,body,type),null)}"
new_mail="""function mail(k,sub,body,type='info'){const before=new Set((s?.emails||[]).map(m=>String(m.id)));safe(()=>newMail(sender(k),sub,body,type),null);return (s?.emails||[]).find(m=>!before.has(String(m.id)))||null}
function actionMail(k,sub,body,action,type='review'){const m=mail(k,sub,body,type);if(m&&action){m.programmeAction={...action,actionId:String(action.actionId||`economy:${Date.now()}`),tab:action.tab||'overview'};saveNow()}return m}"""
t=replace_once(t,old_mail,new_mail,'mail action metadata')

snap_prefix='function snap(p=prog())'
snap_match=re.search(r'^function snap\(p=prog\(\)\).*$',t,re.M)
if not snap_match: raise SystemExit('Missing snap function')
helpers="""
function liabilities(p=prog()){const athlete=Object.values(p.athleteContracts||{}).filter(c=>c.state==='active'&&weeks(c)>0).reduce((n,c)=>n+Number(c.annualFunding||0)*weeks(c)/52,0),staff=Object.values(p.staffContracts||{}).filter(c=>c.state==='active'&&weeks(c)>0).reduce((n,c)=>n+Number(c.annualSalary||0)*weeks(c)/52,0),contingent=Object.values(p.athleteContracts||{}).filter(c=>c.state==='active').reduce((n,c)=>n+Number(c.annualFunding||0)*Number(c.bonusRate||0),0);return{athlete,staff,guaranteed:athlete+staff,contingent}}
function offerImpact(annual,currentAnnual=0,upfront=0,p=prog()){const x=snap(p),deltaAnnual=Number(annual||0)-Number(currentAnnual||0),deltaWeekly=deltaAnnual/52,seasonImpact=Number(upfront||0)+deltaWeekly*x.left,projected=x.projected-seasonImpact,nextWeekly=Math.max(0,x.weekly.total+deltaWeekly),reserve=nextWeekly*13,availableAfter=Number(s.funding||0)-Number(upfront||0),headroom=Math.max(0,Math.min(availableAfter-reserve,projected)),status=projected<0?'critical':headroom<Math.max(50000,nextWeekly*4)?'tight':'comfortable';return{deltaAnnual,deltaWeekly,seasonImpact,projected,nextWeekly,reserve,availableAfter,headroom,status}}
function safeToCommit(p=prog()){return offerImpact(0,0,0,p).headroom}
function impactHTML(impact,label='Budget after decision'){const delta=Number(impact.deltaWeekly||0);return`<div class=\"pe-impact ${impact.status}\"><small>${esc(label).toUpperCase()}</small><div><span>Weekly change</span><strong>${delta===0?'No change':`${delta>0?'+':'−'}${cash(Math.abs(delta))}`}</strong></div><div><span>Season-end forecast</span><strong>${cash(impact.projected)}</strong></div><div><span>Safe to commit afterwards</span><strong>${cash(impact.headroom)}</strong></div></div>`}
"""
t=t[:snap_match.end()]+helpers+t[snap_match.end():]

new_kpis="""function kpis(){const p=prog(),x=snap(p),l=liabilities(p),safeSpend=safeToCommit(p);return`<div class=\"pe-kpis\"><div><small>AVAILABLE FUNDS</small><strong>${cash(s.funding)}</strong><span>Cash available now</span></div><div><small>WEEKLY OPERATING COST</small><strong>${cash(x.weekly.total)}</strong><span>Payroll, upkeep & operations</span></div><div><small>GUARANTEED LIABILITIES</small><strong>${cash(l.guaranteed)}</strong><span>Remaining athlete & staff contracts</span></div><div><small>SAFE TO COMMIT</small><strong class=\"${safeSpend<=0?'bad':''}\">${cash(safeSpend)}</strong><span>After reserve and current season costs</span></div><div><small>PROJECTED SEASON END</small><strong class=\"${x.projected<0?'bad':''}\">${cash(x.projected)}</strong><span>Before next federation allocation</span></div></div>`}"""
t=replace_line(t,'function kpis()',new_kpis,'finance KPIs')

new_overview="""function overview(){const p=prog(),x=snap(p),w=x.weekly,l=liabilities(p),safeSpend=safeToCommit(p),rows=[['Athlete funding',w.athlete],['Staff salaries',w.staff],['Facility upkeep',w.facilities],['Operations',w.operations]],mx=Math.max(1,...rows.map(x=>x[1])),hl=x.health==='healthy'?'Healthy':x.health==='watch'?'Watch':x.health==='restricted'?'Restricted':'Critical';return`<div class=\"pe-grid\"><section class=\"pe-card\"><div class=\"pe-card-head\"><strong>Programme Position</strong><span>${esc(nlabel())}</span></div><div class=\"pe-card-body\"><div class=\"pe-position\"><div><small>FINANCIAL HEALTH</small><strong class=\"pe-health ${x.health}\">${hl}</strong><p>${x.health==='healthy'?'The programme can make strategic decisions without putting current commitments at risk.':x.health==='watch'?'The budget is workable, but new commitments need to earn their place.':x.health==='restricted'?'Protect current athlete, staff and facility commitments before expanding.':'Major new commitments are restricted while the programme stabilises.'}</p></div><div class=\"pe-trust\"><small>BOARD FINANCIAL CONFIDENCE</small><b>${Math.round(p.boardTrust)}/100</b><i><span style=\"width:${p.boardTrust}%\"></span></i></div></div><div class=\"pe-mini\"><div><small>Safe to commit</small><strong>${cash(safeSpend)}</strong></div><div><small>13-week reserve</small><strong>${cash(w.total*13)}</strong></div><div><small>Guaranteed liabilities</small><strong>${cash(l.guaranteed)}</strong></div><div><small>Contingent athlete bonuses</small><strong>${cash(l.contingent)}</strong></div></div></div></section><aside class=\"pe-card\"><div class=\"pe-card-head\"><strong>Weekly Cost Split</strong><span>${cash(w.total)}</span></div><div class=\"pe-card-body\"><div class=\"pe-cost-bars\">${rows.map(([q,v])=>`<div><span>${q}</span><i><b style=\"width:${v/mx*100}%\"></b></i><strong>${cash(v)}</strong></div>`).join('')}</div><p class=\"pe-note\">Safe to commit is intentionally conservative: it protects a 13-week operating reserve and keeps the current season forecast above zero.</p></div></aside></div><div class=\"pe-grid\"><section class=\"pe-card\"><div class=\"pe-card-head\"><strong>Upcoming Decisions</strong><span>Next 12 weeks</span></div><div class=\"pe-card-body\">${decisions()}</div></section><aside class=\"pe-card\"><div class=\"pe-card-head\"><strong>Recent Movements</strong><span>Ledger</span></div>${hist(7)}</aside></div>`}"""
t=replace_line(t,'function overview()',new_overview,'finance overview')

old_summary="sum=()=>{const o=read();d.querySelector('[data-summary]').innerHTML=`<small>YOUR OFFER</small><strong>${cash(o.annual)} / year</strong><span>${o.status} · ${o.term} weeks</span><div><b>${cash(o.annual*o.term/52)}</b><em>guaranteed value</em></div>`}"
new_summary="sum=()=>{const o=read(),impact=offerImpact(o.annual,Number(old?.annualFunding||0),0,p);d.querySelector('[data-summary]').innerHTML=`<small>YOUR OFFER</small><strong>${cash(o.annual)} / year</strong><span>${o.status} · ${o.term} weeks</span><div><b>${cash(o.annual*o.term/52)}</b><em>guaranteed value</em></div>${impactHTML(impact,'Programme impact')}`}"
t=replace_once(t,old_summary,new_summary,'athlete contract budget impact')

old_signath="function signAthlete(a,o,renew){const p=prog(),old=acon(a,p),n=cw();"
new_signath="function signAthlete(a,o,renew){const p=prog(),old=acon(a,p),impact=offerImpact(o.annual,Number(old?.annualFunding||0),0,p),n=cw();if(impact.projected<0&&!safe(()=>window.confirm(`This agreement would move the current season forecast to ${cash(impact.projected)}. Continue anyway?`),false))return;"
t=replace_once(t,old_signath,new_signath,'athlete contract forecast confirmation')

# Staff: make early replacement a real financial decision and show its impact.
old_fee="fee=renew?0:Number(c.appointmentFee||0)+(c.employedNation?Math.round(expected*.2/5000)*5000:0),d=dialog(),w=weak(c);"
new_fee="exitFee=!renew&&old&&cur&&String(cur.id)!==String(c.id)?Math.round((weeks(old)*Number(old.annualSalary||0)/52)*.25/5000)*5000:0,recruitmentFee=renew?0:Number(c.appointmentFee||0)+(c.employedNation?Math.round(expected*.2/5000)*5000:0),fee=recruitmentFee+exitFee,d=dialog(),w=weak(c);"
t=replace_once(t,old_fee,new_fee,'staff replacement settlement')
old_staffaside="${counter?`<div class=\"pe-counter\"><strong>Counter-offer</strong><p>${c.name} will sign at ${cash(counter.salary)} per year.</p></div>`:''}<button class=\"btn primary pe-wide\" data-submit>${counter?'ACCEPT COUNTER':'SUBMIT OFFER'}</button><p class=\"pe-note\">Salary is charged weekly. One-off recruitment costs are paid on appointment.</p>"
new_staffaside="<div class=\"pe-contract-summary\" data-staff-impact></div>${counter?`<div class=\"pe-counter\"><strong>Counter-offer</strong><p>${c.name} will sign at ${cash(counter.salary)} per year.</p></div>`:''}<button class=\"btn primary pe-wide\" data-submit>${counter?'ACCEPT COUNTER':'SUBMIT OFFER'}</button><p class=\"pe-note\">Salary is charged weekly.${fee?` One-off transition cost: ${cash(fee)}${exitFee?` including ${cash(exitFee)} early-contract settlement`:''}.`:''}</p>"
t=replace_once(t,old_staffaside,new_staffaside,'staff contract impact container')
old_staffbind="d.querySelector('[data-close]').onclick=closeD;d.querySelector('[data-submit]').onclick=()=>{const o={salary:Number(d.querySelector('[data-money]').value),term:Number(d.querySelector('[data-term]').value)};"
new_staffbind="const staffImpact=()=>{const salary=Number(d.querySelector('[data-money]').value),impact=offerImpact(salary,Number(old?.annualSalary||0),fee,p);d.querySelector('[data-staff-impact]').innerHTML=`<small>PROGRAMME IMPACT</small><strong>${cash(salary)} / year</strong><span>${fee?`${cash(fee)} transition cost · `:''}${impact.status==='comfortable'?'Within current headroom':impact.status==='tight'?'Tightens financial headroom':'Pushes forecast below zero'}</span>${impactHTML(impact,'After appointment')}`};d.querySelectorAll('select').forEach(x=>x.addEventListener('change',staffImpact));staffImpact();d.querySelector('[data-close]').onclick=closeD;d.querySelector('[data-submit]').onclick=()=>{const o={salary:Number(d.querySelector('[data-money]').value),term:Number(d.querySelector('[data-term]').value)};"
t=replace_once(t,old_staffbind,new_staffbind,'staff impact binding')
old_signstaff="function signStaff(r,c,o,renew,fee){const p=prog(),prev=s.coaches?.[r],prevContract=scon(r,p);"
new_signstaff="function signStaff(r,c,o,renew,fee){const p=prog(),prev=s.coaches?.[r],prevContract=scon(r,p),impact=offerImpact(o.salary,Number(prevContract?.annualSalary||0),fee,p);if(impact.projected<0&&!safe(()=>window.confirm(`This appointment would move the current season forecast to ${cash(impact.projected)}. Continue anyway?`),false))return;"
t=replace_once(t,old_signstaff,new_signstaff,'staff forecast confirmation')
old_staff_overwrite="if(prev&&!renew&&prev.id!==c.id){safe(()=>recordCoachMove(prev,`Left ${nlabel()} after replacement.`),null);freeAgentAdd({...prev,role:r,expectedSalary:Number(prevContract?.annualSalary||coachSalary(r,prev)),annualSalary:Number(prevContract?.annualSalary||0)},nation(),'replaced')}const n=cw(),coach="
new_staff_overwrite="if(prevContract){prevContract.state=renew?'renewed':'terminated';prevContract.endedCareerWeek=cw();p.staffContractHistory??=[];p.staffContractHistory.push({...prevContract,outcome:renew?'renewed':'replaced'});p.staffContractHistory=p.staffContractHistory.slice(-200)}if(prev&&!renew&&prev.id!==c.id){safe(()=>recordCoachMove(prev,`Left ${nlabel()} after replacement.`),null);freeAgentAdd({...prev,role:r,expectedSalary:Number(prevContract?.annualSalary||coachSalary(r,prev)),annualSalary:Number(prevContract?.annualSalary||0)},nation(),'replaced')}const n=cw(),coach="
t=replace_once(t,old_staff_overwrite,new_staff_overwrite,'staff contract history')

# Actionable programme communications use the canonical Inbox decision model.
old_facmail="mail('performance',`${FAC[k].name}: ${spec[0]}`,`${spec[1]} Finance → Facilities now has three options: complete repair ${cash(full)}, temporary repair ${cash(temporary)}, or defer the work. The centre is currently at ${Math.round(f.condition)}% condition.`,'review');"
new_facmail="actionMail('performance',`${FAC[k].name}: ${spec[0]}`,`${spec[1]} Finance → Facilities now has three options: complete repair ${cash(full)}, temporary repair ${cash(temporary)}, or defer the work. The centre is currently at ${Math.round(f.condition)}% condition.`,{actionId:`economy:facility:${f.incident.id}`,tab:'facilities',priority:'important',deadlineCareerWeek:cw()+4},'review');"
t=replace_once(t,old_facmail,new_facmail,'facility action email')
old_mandmail="mail('board','Annual funding mandate available',`The federation is prepared to discuss a performance-linked advance of ${cash(advance)}. Accepting it would set a season target of nation rank #${targetRank} or better and ${targetPodiums} international podiums. The advance is never clawed back, but missing the mandate will reduce board confidence and trigger temporary spending controls.`,'review');"
new_mandmail="actionMail('board','Annual funding mandate available',`The federation is prepared to discuss a performance-linked advance of ${cash(advance)}. Accepting it would set a season target of nation rank #${targetRank} or better and ${targetPodiums} international podiums. The advance is never clawed back, but missing the mandate will reduce board confidence and trigger temporary spending controls.`,{actionId:`economy:mandate:${yr()}`,tab:'board',priority:'normal',deadlineWeek:10},'review');"
t=replace_once(t,old_mandmail,new_mandmail,'mandate action email')
old_boardmail="mail('board',level==='critical'?'Board intervention: programme stabilisation required':'Board intervention: recovery plan required',`The programme is under ${level==='critical'?'critical':'material'} financial pressure. A response is required in Finance → Board within three weeks. You can accept a recovery plan, ring-fence current athlete support, or request federation stabilisation funding. Ignoring the request will result in imposed controls.`,'review');"
new_boardmail="actionMail('board',level==='critical'?'Board intervention: programme stabilisation required':'Board intervention: recovery plan required',`The programme is under ${level==='critical'?'critical':'material'} financial pressure. A response is required in Finance → Board within three weeks. You can accept a recovery plan, ring-fence current athlete support, or request federation stabilisation funding. Ignoring the request will result in imposed controls.`,{actionId:`economy:board:${g.intervention.id}`,tab:'board',priority:'important',deadlineCareerWeek:g.intervention.deadlineCareerWeek},'review');"
t=replace_once(t,old_boardmail,new_boardmail,'board action email')

# Insert nation ownership + Inbox decision APIs before world season processing.
marker='function worldSeason(p)'
pos=t.find(marker)
if pos<0: raise SystemExit('Missing worldSeason marker')
integration="""
function programmeEmailFor(actionId){return (s?.emails||[]).find(m=>String(m?.programmeAction?.actionId||'')===String(actionId))||null}
function decisionActions(){const p=prog(),g=p.governance||{},out=[],push=(actionId,title,reason,tab,priority='normal',deadlineWeek=wk()+4,blocks=false)=>{const m=programmeEmailFor(actionId);out.push({actionId,emailId:m?.id||null,title,reason,source:'programme-economy',entityId:actionId,deadline:Math.max(wk(),Math.min(52,Number(deadlineWeek)||wk())),priority,blocks,destination:'finance',tab})};if(g.intervention?.status==='pending'){const i=g.intervention,left=Math.max(0,Number(i.deadlineCareerWeek||cw())-cw());push(`economy:board:${i.id}`,'Federation financial response','The board is waiting for your programme recovery decision.','board','important',wk()+left,false)}if(g.mandate?.status==='open'){push(`economy:mandate:${yr()}`,'Annual performance-funding decision','Choose whether to accept the performance-linked advance or stay on the baseline allocation.','board','normal',Number(g.mandate.deadlineWeek||10),false)}for(const [k,f] of Object.entries(p.facilities||{})){if(!f?.incident)continue;const id=`economy:facility:${f.incident.id}`,left=Number(f.incident.deferredUntil||0)>cw()?Number(f.incident.deferredUntil)-cw():4;push(id,`${FAC[k]?.name||'Facility'} operational decision`,f.incident.title||'A facility issue needs a management decision.','facilities','important',wk()+left,false)}return out}
function rawProgramme(n){s.programmeEconomies??={};let p=s.programmeEconomies[n];if(!p||Number(p.version||0)<V){p={...base(n),...(p||{}),version:V};s.programmeEconomies[n]=p}p.athleteContracts??={};p.athleteContractHistory??=[];p.staffContracts??={};p.staffContractHistory??=[];p.facilities??={};p.staffMarket??={season:0,candidates:[]};p.bonusPaid??={};p.commercial??={reputation:50,history:[]};p.commercial.history??=[];p.governance??={lastHealth:p.health||'healthy',lastNotice:0,lastControl:0,control:null,intervention:null,history:[],mandate:null,mandateHistory:[]};p.governance.history??=[];p.governance.mandateHistory??=[];p.migration??={done:false};return p}
function handleNationChange(from){const to=nation();if(!from||from===to){prog();return false}const old=rawProgramme(from),oldAsset=safe(()=>careerState().nationAssets?.[from],null);old.ai??={};old.ai.cash=Number(oldAsset?.funding??old.ai.cash??indexedGrant(from));old.ai.staff={};for(const [r,c] of Object.entries(s.coaches||{})){if(!c)continue;const ct=old.staffContracts?.[r],salary=Number(ct?.annualSalary||c.annualSalary||worldSalary(c,from));old.ai.staff[r]={...c,role:r,employedNation:from,annualSalary:salary,expectedSalary:salary,startCareerWeek:Number(ct?.startCareerWeek||c.joined||cw()),endCareerWeek:Math.max(cw()+26,Number(ct?.endCareerWeek||c.until||cw()+52))}}old.ai.athleteContracts={};for(const [id,c] of Object.entries(old.athleteContracts||{}))if(c?.state==='active'&&weeks(c)>0)old.ai.athleteContracts[id]={...c,nation:from};old.ai.lastPlayerExitCareerWeek=cw();
 const p=rawProgramme(to);seedAI(p,to);ensureAIStaff(p,to);const aiCash=Number(p.ai?.cash);if(Number.isFinite(aiCash)&&aiCash>=0)s.funding=aiCash;s.facilityLevels??={};for(const k of Object.keys(FAC)){if(!p.facilities[k])p.facilities[k]=fseed(k,1);s.facilityLevels[k]=fact(k,p)}const incomingStaff={...(p.ai?.staff||{})};s.coaches={};s.staff={};p.staffContracts={};for(const r of staffRoles()){let c=incomingStaff[r]||worldCoach(to,r,Number(p.ai?.staffGeneration?.[r]||0));c=enrich(r,{...c,employedNation:to,nationality:c.nationality||to,joined:cw(),until:Math.max(cw()+52,Number(c.endCareerWeek||cw()+104))});const salary=Number(c.annualSalary||c.expectedSalary||worldSalary(c,to));s.coaches[r]=c;s.staff[r]=Number(c.level)||1;p.staffContracts[r]={id:`staff-${c.id}-${cw()}`,role:r,coachId:c.id,startCareerWeek:cw(),endCareerWeek:Number(c.until),annualSalary:salary,state:'active',warned:false,transitioned:true}}
 const aiContracts={...(p.ai?.athleteContracts||{})},fundedIds=Object.keys(aiContracts).filter(id=>aiContracts[id]?.state==='active');if(fundedIds.length){const set=new Set(fundedIds);(s.athletes||[]).filter(a=>a.nation===to&&!a.retired).forEach(a=>a.inSquad=set.has(String(a.id)))}p.athleteContracts={};for(const a of team()){const src=aiContracts[a.id],st=src?.status||astatus(a),annual=Number(src?.annualFunding||statusPay(st,to)),term=Math.max(26,Number(src?.endCareerWeek||0)-cw()||52);p.athleteContracts[a.id]={id:`ath-${a.id}-${cw()}`,athleteId:a.id,status:st,startCareerWeek:cw(),endCareerWeek:cw()+term,annualFunding:annual,bonusRate:Number(src?.bonusRate??.08),state:'active',warned:false,transitioned:true};a.squadJoinedCareerWeek=cw();a.squadCommitUntil=cw()+term}p.migration={done:true,careerWeek:cw(),nationTransition:true};p.ai.cash=Number(s.funding||0);p.ai.staff={};const cs=safe(()=>careerState(),null);if(cs){cs.nationBudgets??={};cs.nationAssets??={};cs.nationBudgets[to]=Number(s.funding||0);cs.nationAssets[to]={...(cs.nationAssets[to]||{}),funding:Number(s.funding||0),facilityLevels:{...s.facilityLevels},facilities:s.facilities||1,facilityHistory:[...(s.facilityHistory||[])],annualSpend:s.annualSpend||0}}mail('board',`Programme handover complete: ${nlabel(to)}`,`You have inherited ${nlabel(to)}'s current programme position: ${cash(s.funding)} available, ${team().length} funded athletes and the existing performance staff structure. The previous programme remains active under AI management.`,'review');saveNow();return true}
"""
t=t[:pos]+integration+t[pos:]

# Extend public API.
old_api="inflationIndex,indexedGrant,homeSummary,openFinanceView,renderFinance:drawFinance2,renderStaff:drawStaff2,debug:"
new_api="inflationIndex,indexedGrant,homeSummary,openFinanceView,decisionActions,handleNationChange,liabilities,safeToCommit,offerImpact,renderFinance:drawFinance2,renderStaff:drawStaff2,debug:"
t=replace_once(t,old_api,new_api,'economy V4 public API')
write(p,t)

# ---------------------------------------------------------------------------
# Canonical Inbox Decision Core: consume Programme Economy decisions.
# ---------------------------------------------------------------------------
p='scripts/inbox-decision-core-v1.js'
t=read(p)
old_aid="function aid(m){if(!m)return null;if(m.id==='appointment-contract')return'appointment:contract';if(m.summitRegistration)return`selection:summit:${s.game.season||1}`;return m.type==='selection'&&m.eventId?`selection:event:${s.game.season||1}:${m.eventId}`:null}"
new_aid="function aid(m){if(!m)return null;if(m?.programmeAction?.actionId)return String(m.programmeAction.actionId);if(m.id==='appointment-contract')return'appointment:contract';if(m.summitRegistration)return`selection:summit:${s.game.season||1}`;return m.type==='selection'&&m.eventId?`selection:event:${s.game.season||1}:${m.eventId}`:null}"
t=replace_once(t,old_aid,new_aid,'programme inbox action id')
needle=" const live=new Set(out.map(a=>a.actionId));"
insert=""" try{const economy=window.AMProgrammeEconomy?.decisionActions?.()||[];for(const a of economy)if(a?.actionId&&!out.some(x=>x.actionId===a.actionId))out.push(a)}catch(err){console.warn('[Inbox Decision Core] Programme Economy actions unavailable',err)}
 const live=new Set(out.map(a=>a.actionId));"""
t=replace_once(t,needle,insert,'programme decision merge')
old_open="function openAction(a){if(a.emailId){openMail=a.emailId;view('inbox');return}if(a.destination==='competition'&&window.openCompetitionSelectionCentre){window.openCompetitionSelectionCentre(a.entityId);return}if(a.destination==='summit'&&window.openSummitSelectionCentre){window.openSummitSelectionCentre();return}view('inbox')}"
new_open="function openAction(a){if(a.emailId){openMail=a.emailId;view('inbox');return}if(a.destination==='finance'&&window.AMProgrammeEconomy?.openFinanceView){window.AMProgrammeEconomy.openFinanceView(a.tab||'overview');return}if(a.destination==='competition'&&window.openCompetitionSelectionCentre){window.openCompetitionSelectionCentre(a.entityId);return}if(a.destination==='summit'&&window.openSummitSelectionCentre){window.openSummitSelectionCentre();return}view('inbox')}"
t=replace_once(t,old_open,new_open,'finance action routing')
write(p,t)

# ---------------------------------------------------------------------------
# Canonical Single-Pass Reader: action button for programme communications.
# ---------------------------------------------------------------------------
p='scripts/inbox-single-render-v1.js'
t=read(p)
old_render="const z=meta(m),a=actionFor(m),c=m.type==='selection'?selectionContext(m):null,staff=staffAction(m);let body=c?selectionBody(m,c):genericBody(m);"
new_render="const z=meta(m),a=actionFor(m),c=m.type==='selection'?selectionContext(m):null,staff=staffAction(m),programme=m.programmeAction&&a?m.programmeAction:null;let body=c?selectionBody(m,c):genericBody(m);"
t=replace_once(t,old_render,new_render,'reader programme context')
old_actions=" else if(staff){actions=`<button class=\"btn ghost\" type=\"button\" data-staff-expire>LET CONTRACT EXPIRE</button><button class=\"btn secondary\" type=\"button\" data-open-staff>OPEN STAFF</button><button class=\"btn primary\" type=\"button\" data-staff-renew>RENEW CONTRACT</button>`}\n else if(m.type==='contract'"
new_actions=" else if(staff){actions=`<button class=\"btn ghost\" type=\"button\" data-staff-expire>LET CONTRACT EXPIRE</button><button class=\"btn secondary\" type=\"button\" data-open-staff>OPEN STAFF</button><button class=\"btn primary\" type=\"button\" data-staff-renew>RENEW CONTRACT</button>`}\n else if(programme){actions=`<button class=\"btn primary\" type=\"button\" data-open-programme>OPEN ${String(programme.tab||'finance').toUpperCase()}</button>`}\n else if(m.type==='contract'"
t=replace_once(t,old_actions,new_actions,'reader programme action')
old_listener=" if(staff){reader.querySelector('[data-open-staff]').onclick=()=>view('staff');reader.querySelector('[data-staff-renew]').onclick=()=>confirmStaff(staff,'renew');reader.querySelector('[data-staff-expire]').onclick=()=>confirmStaff(staff,'release_at_expiry')}\n const sign="
new_listener=" if(staff){reader.querySelector('[data-open-staff]').onclick=()=>view('staff');reader.querySelector('[data-staff-renew]').onclick=()=>confirmStaff(staff,'renew');reader.querySelector('[data-staff-expire]').onclick=()=>confirmStaff(staff,'release_at_expiry')}\n if(programme){reader.querySelector('[data-open-programme]')?.addEventListener('click',()=>window.AMProgrammeEconomy?.openFinanceView?.(programme.tab||'overview'))}\n const sign="
t=replace_once(t,old_listener,new_listener,'reader programme listener')
write(p,t)

# ---------------------------------------------------------------------------
# Manager career handover: activate the destination nation's own economy.
# ---------------------------------------------------------------------------
p='scripts/manager-career-v1.js'
t=read(p)
old_hook="hook('acceptCareerJob',ctx=>{const moved=ctx.before.nation!==currentNation(),mc=careerStore();captureArrival(mc,currentNation(),true);"
new_hook="hook('acceptCareerJob',ctx=>{const moved=ctx.before.nation!==currentNation(),mc=careerStore();if(moved){try{window.AMProgrammeEconomy?.handleNationChange?.(ctx.before.nation)}catch(err){console.warn('Programme Economy nation handover failed',err)}}captureArrival(mc,currentNation(),true);"
t=replace_once(t,old_hook,new_hook,'nation economy handover hook')
write(p,t)

# ---------------------------------------------------------------------------
# V4 presentation polish.
# ---------------------------------------------------------------------------
p='styles/programme-economy-v1.css'
t=read(p)
css="""

/* Programme Economy V4 — management integration */
.pe-impact{display:grid;gap:6px;margin-top:9px;padding:9px;border:1px solid #294a60;border-radius:8px;background:#071722}.pe-impact>small{color:#7595aa;font-size:7px;font-weight:950;letter-spacing:.08em}.pe-impact>div{display:flex;align-items:center;justify-content:space-between;gap:12px}.pe-impact span{color:#7e98a9;font-size:7px}.pe-impact strong{margin:0!important;font-size:9px!important}.pe-impact.tight{border-color:#725f35;background:#211b0d}.pe-impact.critical{border-color:#6f3943;background:#241116}.pe-impact.critical strong{color:#f0a0aa}.pe-contract-summary .pe-impact{margin-left:-2px;margin-right:-2px}.pe-kpis>div:nth-child(4) strong.bad{color:#ef9aa3}
@media(max-width:700px){.pe-impact>div{align-items:flex-start}.pe-impact span{max-width:55%}}
"""
if 'Programme Economy V4 — management integration' not in t:t+=css
write(p,t)

# ---------------------------------------------------------------------------
# Runtime regression contract for integration/exploit safeguards.
# ---------------------------------------------------------------------------
soak="""import fs from 'node:fs';\n\nconst economy=fs.readFileSync('scripts/programme-economy-v2.js','utf8');\nconst core=fs.readFileSync('scripts/inbox-decision-core-v1.js','utf8');\nconst reader=fs.readFileSync('scripts/inbox-single-render-v1.js','utf8');\nconst career=fs.readFileSync('scripts/manager-career-v1.js','utf8');\n\nconst need=(ok,msg)=>{if(!ok)throw new Error('Programme Economy V4 regression: '+msg)};\nneed(/const V=4,UI=/.test(economy),'economy schema must be V4');\nneed(economy.includes('function liabilities(')&&economy.includes('function safeToCommit(')&&economy.includes('function offerImpact('),'planning authority missing');\nneed(economy.includes('exitFee=!renew&&old&&cur'),'staff early-exit settlement missing');\nneed(economy.includes('staffContractHistory'),'staff contract history missing');\nneed(economy.includes('function decisionActions(')&&economy.includes('programmeAction'),'programme decisions are not exposed to Inbox');\nneed(core.includes('AMProgrammeEconomy?.decisionActions')&&core.includes("a.destination==='finance'"),'Inbox core does not own programme action routing');\nneed(reader.includes('data-open-programme')&&reader.includes('openFinanceView'),'canonical reader lacks programme decision action');\nneed(economy.includes('function handleNationChange(')&&career.includes('handleNationChange?.(ctx.before.nation)'),'national-job economy handover missing');\n\nconst impact=(cash,weekly,left,newAnnual,currentAnnual=0,upfront=0)=>{const delta=(newAnnual-currentAnnual)/52,projected=cash-weekly*left-upfront-delta*left,nextWeekly=Math.max(0,weekly+delta),reserve=nextWeekly*13,headroom=Math.max(0,Math.min(cash-upfront-reserve,projected));return{projected,headroom}};\nlet a=impact(3_000_000,60_000,30,120_000,0,0);need(a.headroom>=0&&a.headroom<=a.projected,'safe-to-commit exceeds forecast');\nlet b=impact(300_000,60_000,30,250_000,0,0);need(b.projected<0&&b.headroom===0,'dangerous contract must expose zero safe headroom');\nlet c=impact(3_000_000,60_000,30,180_000,220_000,0);need(c.projected>a.projected-100_000,'cheaper renewal should improve forecast relative to a large new commitment');\nconsole.log('Programme Economy V4 integration soak passed');\n"""
Path('tools/programme-management-integration-soak.mjs').write_text(soak,encoding='utf-8')

p='tools/runtime-smoke.mjs'
t=read(p)
needle=" await import('./programme-board-commercial-soak.mjs');"
repl=needle+"\n await import('./programme-management-integration-soak.mjs');"
t=replace_once(t,needle,repl,'runtime V4 soak import')
write(p,t)

# ---------------------------------------------------------------------------
# Cache-bust all directly changed client assets.
# ---------------------------------------------------------------------------
p='scripts/ui-cutover-v1.js'
t=read(p)
t=re.sub(r"const BUILD='[^']+';","const BUILD='2026.09.13-economyv4integration1';",t,count=1)
t=re.sub(r"styles/programme-economy-v1\.css\?v=[^']+","styles/programme-economy-v1.css?v=20260913-economyv4integration1",t)
t=re.sub(r"scripts/programme-economy-v2\.js\?v=[^']+","scripts/programme-economy-v2.js?v=20260913-economyv4integration1",t)
write(p,t)

p='game.html'
t=read(p)
for name in ['inbox-decision-core-v1.js','inbox-single-render-v1.js','manager-career-v1.js','ui-cutover-v1.js']:
    t=re.sub(rf'{re.escape(name)}\?v=[^\"\']+',f'{name}?v=20260913-economyv4integration1',t)
write(p,t)

print('Programme Economy V4 Management Integration & Polish applied')
