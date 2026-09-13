from pathlib import Path
import re

broadcast_path=Path('scripts/live-event-broadcast-v4.js')
relay_path=Path('scripts/relay-v1.js')
selection_path=Path('scripts/selection-decision-v3.js')
economy_path=Path('scripts/programme-economy-v2.js')
css_path=Path('styles/programme-economy-v1.css')
reg_path=Path('tools/static-regression.mjs')
html_path=Path('game.html')

broadcast=broadcast_path.read_text(encoding='utf-8')
relay=relay_path.read_text(encoding='utf-8')
selection=selection_path.read_text(encoding='utf-8')
economy=economy_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
reg=reg_path.read_text(encoding='utf-8')
html=html_path.read_text(encoding='utf-8')

# 1) Relay: keep the whole oval visible for all four legs.
old="function cameraTarget(c,state){const n=dist(c.d),p=state?.p||0,lead=state?.lead?.m||0;if(n===100)"
new="function cameraTarget(c,state){const n=dist(c.d),p=state?.p||0,lead=state?.lead?.m||0;if(isRelay(c.d))return[20,18,720,419];if(n===100)"
if old not in broadcast: raise SystemExit('relay camera target contract missing')
broadcast=broadcast.replace(old,new,1)

# 2) Save the four submitted relay athlete IDs at selection lock.
old="const e=ctx.event;e.entries??={};for(const d of discs(ctx))e.entries[d]=chosenIds(ctx,d);e.selectionReasons??={};"
new="const e=ctx.event;e.entries??={};for(const d of discs(ctx))e.entries[d]=chosenIds(ctx,d);e.relaySelectionSnapshot??={};for(const d of discs(ctx))if(DISCIPLINES?.[d]?.relay&&e.entries[d]?.length===4)e.relaySelectionSnapshot[d]=[...e.entries[d]];e.selectionReasons??={};"
if old not in selection: raise SystemExit('selection submit contract missing')
selection=selection.replace(old,new,1)

# 3) Relay: recover locked selection, explain withdrawals, and keep the nation visible as DNS.
old="function selectedLineup(e,d){return (e?.entries?.[d]||[]).map(id=>s.athletes.find(a=>String(a.id)===String(id))).filter(Boolean).slice(0,4)}"
new="""function relaySelectedIds(e,d){
 const current=[...(e?.entries?.[d]||[])],locked=(e?.selectionDecisionV3?.slots?.[d]||[]).filter(x=>x?.mode==='athlete'&&x.id).map(x=>x.id),saved=[...(e?.relaySelectionSnapshot?.[d]||[])];
 const ids=(saved.length===4?saved:locked.length===4?locked:current).slice(0,4);if(ids.length===4){e.relaySelectionSnapshot??={};e.relaySelectionSnapshot[d]=[...ids]}return ids
}
function relayUnavailableReason(a,leg=0){if(!a)return`Leg ${leg+1} runner is no longer available`;if(a.retired)return`${a.name} retired after selection`;if(num(a.injury)>0)return`${a.name} is injured and cannot start (${Math.max(1,Math.round(num(a.injury)))} week${Math.round(num(a.injury))===1?'':'s'} remaining)`;if(a.inSquad===false)return`${a.name} is no longer in the national squad`;if(a.camp)return`${a.name} is away at a training camp`;return''}
function relayAvailability(e,d){const ids=relaySelectedIds(e,d),current=new Set((e?.entries?.[d]||[]).map(String)),line=ids.map(id=>s.athletes.find(a=>String(a.id)===String(id))),unavailable=[];ids.forEach((id,i)=>{const a=line[i];let reason=relayUnavailableReason(a,i);if(!reason&&!current.has(String(id)))reason=`${a?.name||`Leg ${i+1} runner`} became unavailable after selection`;if(reason)unavailable.push({id,a,leg:i+1,reason})});return{ids,line,unavailable}}
function selectedLineup(e,d){return relaySelectedIds(e,d).map(id=>s.athletes.find(a=>String(a.id)===String(id))).filter(Boolean).slice(0,4)}"""
if old not in relay: raise SystemExit('relay selectedLineup contract missing')
relay=relay.replace(old,new,1)

old="""function relayField(e,d){
 const mn=safe(()=>managedNation(),'GREAT BRITAIN'),teams=[];
 const line=selectedLineup(e,d);if(line.length===4)teams.push(teamObject(mn,d,line));
 const rivals=Object.keys(typeof COUNTRIES!=='undefined'?COUNTRIES:{}).filter(n=>n!==mn).map(n=>({n,t:virtualRelayTime(n,d)})).sort((a,b)=>a.t-b.t).slice(0,7);
 rivals.forEach(x=>teams.push(teamObject(x.n,d,null,nationCandidates(x.n,d).slice(0,4))));return teams.slice(0,8);
}"""
new="""function relayField(e,d){
 const mn=safe(()=>managedNation(),'GREAT BRITAIN'),teams=[],availability=relayAvailability(e,d);
 if(availability.ids.length===4){const existing=availability.line.filter(Boolean),team=teamObject(mn,d,existing,existing);team.relayRoster=[...availability.ids];if(availability.unavailable.length){const miss=availability.unavailable[0];team.relayDNS=true;team.relayWithdrawnRunner=miss.a?.name||`Leg ${miss.leg} runner`;team.relayWithdrawalReason=miss.reason;teams.push(team)}else if(existing.length===4)teams.push(team)}
 const rivals=Object.keys(typeof COUNTRIES!=='undefined'?COUNTRIES:{}).filter(n=>n!==mn).map(n=>({n,t:virtualRelayTime(n,d)})).sort((a,b)=>a.t-b.t).slice(0,7);
 rivals.forEach(x=>teams.push(teamObject(x.n,d,null,nationCandidates(x.n,d).slice(0,4))));return teams.slice(0,8);
}"""
if old not in relay: raise SystemExit('relay field contract missing')
relay=relay.replace(old,new,1)

old="function runRelay(team,d,e){\n const actual=team.relayLineup?.length===4,base=actual?estimateLineup(team.relayLineup):virtualRelayTime(team.nation,d),x=exchangeProfile(team,d);"
new="function runRelay(team,d,e){\n if(team.relayDNS)return {...team,perf:99.99,dns:true,dq:false,disqualified:false,withdrawalReason:team.relayWithdrawalReason||'Relay team withdrawn before the start',points:0,achievements:[]};\n const actual=team.relayLineup?.length===4,base=actual?estimateLineup(team.relayLineup):virtualRelayTime(team.nation,d),x=exchangeProfile(team,d);"
if old not in relay: raise SystemExit('relay run contract missing')
relay=relay.replace(old,new,1)
relay=relay.replace("rows.sort((a,b)=>a.dq!==b.dq?(a.dq?1:-1):a.perf-b.perf);","rows.sort((a,b)=>!!a.dns!==!!b.dns?(a.dns?1:-1):a.dq!==b.dq?(a.dq?1:-1):a.perf-b.perf);",1)
relay=relay.replace("if(row.dq||!Number.isFinite(row.perf))return [];","if(row.dq||row.dns||!Number.isFinite(row.perf))return [];",1)
relay=relay.replace("r.points=e.ranked&&!r.dq?Math.round((typeof PTS!=='undefined'?(PTS[i]||0):0)*safe(()=>rankingPointMultiplier(e),1)):0;","r.points=e.ranked&&!r.dq&&!r.dns?Math.round((typeof PTS!=='undefined'?(PTS[i]||0):0)*safe(()=>rankingPointMultiplier(e),1)):0;",1)
relay=relay.replace("if(mine&&line.length===4){line.forEach((a,i)=>{","if(mine&&!mine.dns&&line.length===4){line.forEach((a,i)=>{",1)
relay=relay.replace("results:rows.map(r=>({nation:r.nation,perf:r.perf,dq:r.dq,rank:r.rank,roster:r.relayRoster||[]}))","results:rows.map(r=>({nation:r.nation,perf:r.perf,dq:r.dq,dns:!!r.dns,withdrawalReason:r.withdrawalReason||'',rank:r.rank,roster:r.relayRoster||[]}))",1)

# 4) Broadcast: put the withdrawal reason on the board and announce it before the gun.
old="sub=relay?`${nation(x.r.nation)} · ${relayLegLabel(x.m)}${x.r.lane?` · Lane ${x.r.lane}`:''}`:`${nation(x.r.nation)}${x.r.lane?` · Lane ${x.r.lane}`:''}`;"
new="sub=relay?(x.status==='DNS'&&x.r.raw?.withdrawalReason?`${nation(x.r.nation)} · ${x.r.raw.withdrawalReason}`:`${nation(x.r.nation)} · ${relayLegLabel(x.m)}${x.r.lane?` · Lane ${x.r.lane}`:''}`):`${nation(x.r.nation)}${x.r.lane?` · Lane ${x.r.lane}`:''}`;"
if old not in broadcast: raise SystemExit('relay board subline contract missing')
broadcast=broadcast.replace(old,new,1)
old="drawCompetition();queueSpeech(c,c.kind==='track'?`${label(d)} field is in position. The start is moments away.`:`${label(d)} is ready to begin.`,45,true);flushSpeech(c,true);"
new="drawCompetition();if(c.kind==='track'&&isRelay(d)){for(const r of c.rr.filter(x=>x.status==='DNS'&&x.raw?.withdrawalReason))queueSpeech(c,`${nation(r.nation)} will not start the ${label(d)}: ${r.raw.withdrawalReason}.`,98,true,`relay-withdrawal-${r.id}`)}queueSpeech(c,c.kind==='track'?`${label(d)} field is in position. The start is moments away.`:`${label(d)} is ready to begin.`,45,true);flushSpeech(c,true);"
if old not in broadcast: raise SystemExit('broadcast begin commentary contract missing')
broadcast=broadcast.replace(old,new,1)

# 5) Finance: show before/after cash, weekly spend, and season-end funding clearly.
old="function offerImpact(annual,currentAnnual=0,upfront=0,p=prog()){const x=snap(p),deltaAnnual=Number(annual||0)-Number(currentAnnual||0),deltaWeekly=deltaAnnual/52,seasonImpact=Number(upfront||0)+deltaWeekly*x.left,projected=x.projected-seasonImpact,nextWeekly=Math.max(0,x.weekly.total+deltaWeekly),reserve=nextWeekly*13,availableAfter=Number(s.funding||0)-Number(upfront||0),headroom=Math.max(0,Math.min(availableAfter-reserve,projected)),status=projected<0?'critical':headroom<Math.max(50000,nextWeekly*4)?'tight':'comfortable';return{deltaAnnual,deltaWeekly,seasonImpact,projected,nextWeekly,reserve,availableAfter,headroom,status}}"
new="function offerImpact(annual,currentAnnual=0,upfront=0,p=prog()){const x=snap(p),currentFunding=Number(s.funding||0),currentWeekly=Number(x.weekly.total||0),currentProjected=Number(x.projected||0),deltaAnnual=Number(annual||0)-Number(currentAnnual||0),deltaWeekly=deltaAnnual/52,seasonImpact=Number(upfront||0)+deltaWeekly*x.left,projected=currentProjected-seasonImpact,nextWeekly=Math.max(0,currentWeekly+deltaWeekly),reserve=nextWeekly*13,availableAfter=currentFunding-Number(upfront||0),headroom=Math.max(0,Math.min(availableAfter-reserve,projected)),status=projected<0?'critical':headroom<Math.max(50000,nextWeekly*4)?'tight':'comfortable';return{currentFunding,currentWeekly,currentProjected,deltaAnnual,deltaWeekly,seasonImpact,projected,nextWeekly,reserve,availableAfter,headroom,status}}"
if old not in economy: raise SystemExit('offerImpact contract missing')
economy=economy.replace(old,new,1)

old="function impactHTML(i,label='Budget after decision'){const d=Number(i.deltaWeekly||0);return`<div class=\"pe-impact ${i.status}\"><small>${esc(label).toUpperCase()}</small><div><span>Weekly change</span><strong>${d===0?'No change':`${d>0?'+':'−'}${cash(Math.abs(d))}`}</strong></div><div><span>Season-end forecast</span><strong>${cash(i.projected)}</strong></div><div><span>Safe to commit afterwards</span><strong>${cash(i.headroom)}</strong></div></div>`}"
new="function impactHTML(i,label='Budget after decision'){const d=Number(i.deltaWeekly||0),upfront=Math.max(0,Number(i.currentFunding||0)-Number(i.availableAfter||0));return`<div class=\"pe-impact ${i.status}\"><small>${esc(label).toUpperCase()}</small><div><span>Funds available today</span><strong>${cash(i.currentFunding)} → ${cash(i.availableAfter)}</strong></div><div><span>Weekly programme spend</span><strong>${cash(i.currentWeekly)} → ${cash(i.nextWeekly)}</strong></div><div><span>Season-end funds</span><strong>${cash(i.currentProjected)} → ${cash(i.projected)}</strong></div><div><span>Safe to commit afterwards</span><strong>${cash(i.headroom)}</strong></div><p class=\"pe-impact-note\">${upfront?`${cash(upfront)} is charged immediately. `:''}${d===0?'Weekly payroll does not change.':`${d>0?'Adds':'Reduces'} ${cash(Math.abs(d))} per week to programme spending.`}</p></div>`}"
if old not in economy: raise SystemExit('impactHTML contract missing')
economy=economy.replace(old,new,1)

economy=economy.replace("<div><b>${cash(o.annual*o.term/52)}</b><em>guaranteed value</em></div>${impactHTML(impact,'Programme impact')}","<div class=\"pe-contract-value\"><b>${cash(o.annual*o.term/52)}</b><em>guaranteed contract value</em></div>${impactHTML(impact,'Programme impact')}",1)
economy=economy.replace("<p class=\"pe-note\">Funding is paid weekly. The full value is a commitment, not an upfront charge.</p>","<p class=\"pe-note\">Athlete funding is paid weekly, not upfront. Your cash balance today only changes where an immediate fee is shown; the forecast above shows the real cost of the commitment.</p>",1)

# 6) Contract layout: remove the selector collision that crushes the impact grid, and give tablet the room it needs.
old=".pe-contract-summary>div{display:flex;justify-content:space-between;gap:10px;margin-top:8px;padding-top:8px;border-top:1px solid #203d51}"
new=".pe-contract-summary>.pe-contract-value{display:flex;justify-content:space-between;gap:10px;margin-top:8px;padding-top:8px;border-top:1px solid #203d51}"
if old not in css: raise SystemExit('contract summary selector contract missing')
css=css.replace(old,new,1)
old=".pe-impact>div{display:flex;align-items:center;justify-content:space-between;gap:12px}"
new=".pe-impact>div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px}"
if old not in css: raise SystemExit('impact row contract missing')
css=css.replace(old,new,1)
old=".pe-impact strong{margin:0!important;font-size:9px!important}"
new=".pe-impact strong{margin:0!important;font-size:9px!important;text-align:right;white-space:nowrap}.pe-impact-note{margin:3px 0 0;padding-top:7px;border-top:1px solid #1d394c;color:#7894a5;font-size:7px;line-height:1.45}.pe-contract-summary>.pe-impact{display:grid!important;width:auto!important}"
if old not in css: raise SystemExit('impact strong contract missing')
css=css.replace(old,new,1)
css += "\n@media(min-width:701px){.pe-modal{width:min(960px,calc(100vw - 24px))}.pe-dialog-grid{grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr)}}\n"

# 7) Regression contracts for the three final fixes.
anchor="if(relayPresentation.includes('function renderRelayDiscipline'))fail('Relay V1 must use the canonical Broadcast V4 sprint presentation, not a bespoke Event Day renderer.');\n"
extra="""if(relayPresentation.includes('function renderRelayDiscipline'))fail('Relay V1 must use the canonical Broadcast V4 sprint presentation, not a bespoke Event Day renderer.');
if(!relayPresentation.includes('function relayAvailability(e,d)'))fail('Relay V1 must explain a locked-team withdrawal instead of silently dropping the nation.');
const selectionAuthority=read('scripts/selection-decision-v3.js');
if(!selectionAuthority.includes('relaySelectionSnapshot'))fail('Selection V3 must preserve the submitted relay lineup for withdrawal recovery.');
const economyAuthority=read('scripts/programme-economy-v2.js');
if(!economyAuthority.includes('Funds available today')||!economyAuthority.includes('currentProjected'))fail('Contract offers must show current-to-post-decision programme funding impact.');
const economyCss=read('styles/programme-economy-v1.css');
if(economyCss.includes('.pe-contract-summary>div{'))fail('Contract impact layout must not inherit the generic direct-child flex rule.');
"""
if anchor not in reg: raise SystemExit('regression relay anchor missing')
reg=reg.replace(anchor,extra,1)
old="['function cameraTarget(c,state)','Sprint camera director is missing'],"
new="['function cameraTarget(c,state)','Sprint camera director is missing'],\n  ['if(isRelay(c.d))return[20,18,720,419]','Relay camera must stay on the full oval for the complete baton race'],"
if old not in reg: raise SystemExit('regression camera contract missing')
reg=reg.replace(old,new,1)

# 8) Cache bust only the files changed in this patch.
repls={
 'scripts/live-event-broadcast-v4.js?v=20260913-broadcast-relay1':'scripts/live-event-broadcast-v4.js?v=20260913-relay-wide2',
 'scripts/relay-v1.js?v=20260913-relay4':'scripts/relay-v1.js?v=20260913-relay5',
 'scripts/selection-decision-v3.js?v=20260913-audit3':'scripts/selection-decision-v3.js?v=20260913-relaylock1',
 'scripts/programme-economy-v2.js?v=20260913-staffmarket2':'scripts/programme-economy-v2.js?v=20260913-contractimpact1',
 'styles/programme-economy-v1.css?v=20260913-staffmarket2':'styles/programme-economy-v1.css?v=20260913-contractimpact1'
}
for old,new in repls.items():
 if old not in html: raise SystemExit(f'cache tag missing: {old}')
 html=html.replace(old,new,1)

broadcast_path.write_text(broadcast,encoding='utf-8')
relay_path.write_text(relay,encoding='utf-8')
selection_path.write_text(selection,encoding='utf-8')
economy_path.write_text(economy,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
reg_path.write_text(reg,encoding='utf-8')
html_path.write_text(html,encoding='utf-8')
print('Applied relay wide-camera, explicit withdrawal messaging, and contract funding impact repair.')
