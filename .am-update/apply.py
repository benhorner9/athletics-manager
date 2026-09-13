from pathlib import Path
import re


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing anchor: {label}')
    return text.replace(old, new, 1)

# Programme Economy contract history + profile refresh hooks
p = Path('scripts/programme-economy-v2.js')
text = p.read_text(encoding='utf-8')
text = rep(text,
"function base(n){return{version:V,nation:n,boardTrust:65,health:'healthy',restrictionUntil:0,lastWeekly:0,lastIncident:0,athleteContracts:{},staffContracts:{},facilities:{},staffMarket:{season:0,candidates:[]},bonusPaid:{},migration:{done:false}}}",
"function base(n){return{version:V,nation:n,boardTrust:65,health:'healthy',restrictionUntil:0,lastWeekly:0,lastIncident:0,athleteContracts:{},athleteContractHistory:[],staffContracts:{},facilities:{},staffMarket:{season:0,candidates:[]},bonusPaid:{},migration:{done:false}}}",
'base contract history')
text = rep(text,
"p.athleteContracts??={};p.staffContracts??={};",
"p.athleteContracts??={};p.athleteContractHistory??=[];p.staffContracts??={};",
'programme history ensure')
text = rep(text,
"function acon(id,p=prog()){id=typeof id==='object'?id.id:id;const c=p.athleteContracts[id];return c&&c.state==='active'?c:null}function scon(r,p=prog())",
"function acon(id,p=prog()){id=typeof id==='object'?id.id:id;const c=p.athleteContracts[id];return c&&c.state==='active'?c:null}function archiveAthleteContract(p,c,outcome){if(!p||!c)return;p.athleteContractHistory??=[];if(c.archived)return;c.archived=true;c.outcome=outcome||c.state||'ended';c.endedCareerWeek=Number(c.endedCareerWeek||cw());p.athleteContractHistory.push({...c});p.athleteContractHistory=p.athleteContractHistory.slice(-300)}function athleteContractHistory(id,p=prog()){id=typeof id==='object'?id.id:id;return (p.athleteContractHistory||[]).filter(c=>String(c.athleteId)===String(id)).sort((a,b)=>Number(b.endedCareerWeek||0)-Number(a.endedCareerWeek||0))}function scon(r,p=prog())",
'contract history helpers')
text = rep(text,
"if(l<=0){c.state='expired';a.inSquad=false;",
"if(l<=0){c.state='expired';archiveAthleteContract(p,c,'expired');a.inSquad=false;",
'archive expired agreement')
text = rep(text,
"function signAthlete(a,o,renew){const p=prog(),old=acon(a,p),n=cw();if(old){old.state='replaced';old.endedCareerWeek=n}p.athleteContracts[a.id]",
"function signAthlete(a,o,renew){const p=prog(),old=acon(a,p),n=cw();if(old){old.state='replaced';old.endedCareerWeek=n;archiveAthleteContract(p,old,renew?'renewed':'replaced')}p.athleteContracts[a.id]",
'archive renewed agreement')
text = rep(text,
"saveNow();toastNow('Programme agreement signed');safe(()=>drawSquad(),null)}",
"saveNow();toastNow('Programme agreement signed');safe(()=>drawSquad(),null);safe(()=>drawAthleteProfile(),null)}",
'profile refresh after signing')
text = rep(text,
"if(c)c.state='terminated';a.inSquad=false;",
"if(c){c.state='terminated';c.endedCareerWeek=cw();archiveAthleteContract(p,c,'released')}a.inSquad=false;",
'archive released agreement')
text = rep(text,
"saveNow();toastNow(`${a.name} returned to the National Pool`);safe(()=>drawSquad(),null)}",
"saveNow();toastNow(`${a.name} returned to the National Pool`);safe(()=>drawSquad(),null);safe(()=>drawAthleteProfile(),null)}",
'profile refresh after release')
text = rep(text,
"activeAthleteContract:acon,activeStaffContract:scon,facility:",
"activeAthleteContract:acon,athleteContractHistory,activeStaffContract:scon,facility:",
'export contract history')
p.write_text(text, encoding='utf-8')

# Athlete profile: dedicated Programme tab, agreement overview, history and actions
p = Path('scripts/squad-athlete-v2.js')
text = p.read_text(encoding='utf-8')
anchor = "function devText(a){return safe(()=>developmentGradeText(a),safe(()=>developmentGrade(a),'—'))}"
helpers = r'''function devText(a){return safe(()=>developmentGradeText(a),safe(()=>developmentGrade(a),'—'))}
function programmeContract(a){return safe(()=>window.AMProgrammeEconomy?.activeAthleteContract?.(a),null)}
function programmeContractHistory(a){return safe(()=>window.AMProgrammeEconomy?.athleteContractHistory?.(a.id),[])}
function programmeWeek(){return safe(()=>careerNow(),(Number(s?.game?.season||1)-1)*52+week())}
function programmeWeeks(c){return c?Math.max(0,Number(c.endCareerWeek||0)-programmeWeek()):0}
function programmeMoney(v){return safe(()=>money(Number(v)||0),new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(Number(v)||0))}
function programmeTab(a,own,squad){if(!own)return`<section class="apv2-card"><div class="apv2-card-head"><strong>Programme Status</strong><span>International athlete</span></div><div class="apv2-card-body"><p class="apv2-action-note">National programme contracts are managed by ${esc(safe(()=>nationName(a.nation),a.nation))}.</p></div></section>`;const c=programmeContract(a),hist=programmeContractHistory(a),club=esc(a.athleticsClub||'Athletics club'),left=programmeWeeks(c);return`<div class="apv2-grid"><div class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>National Programme Agreement</strong><span>${c?`${left} weeks remaining`:'Club-led athlete'}</span></div><div class="apv2-card-body">${c?`<div class="apv2-contract-hero"><div><small>STATUS</small><strong>${esc(c.status)}</strong><span>Funded national programme athlete</span></div><div><small>GUARANTEED FUNDING</small><strong>${programmeMoney(c.annualFunding)}</strong><span>${programmeMoney(Number(c.annualFunding||0)/52)} per week</span></div><div><small>TERM REMAINING</small><strong>${left}W</strong><span>Ends career week ${Number(c.endCareerWeek)||'—'}</span></div><div><small>MEDAL BONUS</small><strong>${Math.round(Number(c.bonusRate||0)*100)}%</strong><span>Championship incentive</span></div></div><div class="apv2-contract-actions"><button class="btn secondary" data-apv2-contract-renew>REVIEW / RENEW TERMS</button><button class="btn ghost" data-apv2-contract-release>RELEASE TO CLUB</button></div><p class="apv2-action-note">The agreement funds this athlete weekly. Releasing them early may require a termination settlement; the confirmation screen shows the cost before anything is committed.</p>`:`<div class="apv2-contract-club"><small>CURRENT STATUS</small><strong>${club}</strong><span>Club-led competition · National Pool</span></div><button class="btn secondary" data-apv2-contract-offer ${team().length>=cap()?'disabled':''}>${team().length>=cap()?'NATIONAL SQUAD FULL':'OFFER PROGRAMME CONTRACT'}</button><p class="apv2-action-note">A call-up now requires a funded programme agreement. The athlete keeps their club affiliation while the national programme controls training and competition planning.</p>`}</div></section><section class="apv2-card"><div class="apv2-card-head"><strong>Programme & Club Relationship</strong><span>Career structure</span></div><div class="apv2-card-body"><div class="apv2-contract-club"><small>ATHLETICS CLUB</small><strong>${club}</strong><span>${squad?'Affiliation retained while nationally funded':'Controls normal training and competition activity'}</span></div></div></section></div><aside class="apv2-stack"><section class="apv2-card"><div class="apv2-card-head"><strong>Agreement History</strong><span>${hist.length+(c?1:0)} recorded</span></div>${hist.length||c?`<div class="apv2-list apv2-contract-history">${c?`<div><b>ACTIVE</b><span><strong>${esc(c.status)} · ${programmeMoney(c.annualFunding)}/yr</strong><small>${Number(c.startCareerWeek)||'—'} → ${Number(c.endCareerWeek)||'—'} · ${left}W remaining</small></span><em>PROGRAMME</em></div>`:''}${hist.map(x=>`<div><b>${esc(String(x.outcome||x.state||'ended').toUpperCase())}</b><span><strong>${esc(x.status||'National')} · ${programmeMoney(x.annualFunding)}/yr</strong><small>${Number(x.startCareerWeek)||'—'} → ${Number(x.endedCareerWeek||x.endCareerWeek)||'—'}</small></span><em>${esc(x.outcome==='expired'?'CLUB':x.outcome==='released'?'CLUB':'HISTORY')}</em></div>`).join('')}</div>`:'<div class="apv2-empty">No previous national programme agreement is recorded.</div>'}</section><section class="apv2-card"><div class="apv2-card-head"><strong>What This Means</strong><span>${squad?'National control':'Club control'}</span></div><div class="apv2-card-body"><p class="apv2-action-note">${squad?'Your performance team controls this athlete’s training load and national competition plan while the agreement is active. Their club remains part of their identity.':'The athlete continues their career through club competition. They remain in the national database and can be offered a new programme agreement later.'}</p></div></section></aside></div>`}
'''
text = rep(text, anchor, helpers, 'programme profile helpers')
text = rep(text,
"if(ui.profileTab==='training')return trainingTab(a,own,squad);if(ui.profileTab==='development')return developmentTab(a);",
"if(ui.profileTab==='training')return trainingTab(a,own,squad);if(ui.profileTab==='programme')return programmeTab(a,own,squad);if(ui.profileTab==='development')return developmentTab(a);",
'programme tab routing')
text = rep(text,
"[['overview','Overview'],['attributes','Attributes'],['results','Results & Form'],['training','Training'],['development','Development'],['medical','Medical'],['records','Records']]",
"[['overview','Overview'],['attributes','Attributes'],['results','Results & Form'],['training','Training'],['programme','Programme'],['development','Development'],['medical','Medical'],['records','Records']]",
'programme tab nav')
old_action = "const actionDisabled=(squad&&commit>0)||(!squad&&full),actionLabel=squad?(commit?`SQUAD · ${commit}W`:'MOVE TO NATIONAL POOL'):'CALL UP TO SQUAD',actionTitle=squad?(commit?safe(()=>squadCommitText(a),'Minimum squad commitment active'):`Move ${a.name} to the National Pool`):(full?'National squad is full':`Call ${a.name} into the national squad`);"
new_action = "const contract=programmeContract(a),contractWeeks=programmeWeeks(contract),actionDisabled=!squad&&full,actionLabel=squad&&contract?`PROGRAMME · ${contract.status} · ${contractWeeks}W`:squad?'MOVE TO NATIONAL POOL':'OFFER PROGRAMME CONTRACT',actionTitle=squad&&contract?`Open ${a.name}'s programme agreement`:squad?`Move ${a.name} to the National Pool`:(full?'National squad is full':`Offer ${a.name} a national programme agreement`);"
text = rep(text, old_action, new_action, 'profile programme action')
text = rep(text,
"dialog.querySelector('#profileSquadAction')?.addEventListener('click',()=>{if(!own||a.retired)return;const wasSquad=a.inSquad!==false;try{if(wasSquad){dropFromSquad(a.id);safe(()=>renderView(currentView),null);renderProfile();return}callUpToSquad(a.id);return}catch(err){console.error('[Athletics Manager] squad action recovered',err);return}});",
"dialog.querySelector('#profileSquadAction')?.addEventListener('click',()=>{if(!own||a.retired)return;const wasSquad=a.inSquad!==false;try{if(wasSquad&&programmeContract(a)){ui.profileTab='programme';profileTab='programme';renderProfile();return}if(wasSquad){dropFromSquad(a.id);safe(()=>renderView(currentView),null);renderProfile();return}callUpToSquad(a.id);return}catch(err){console.error('[Athletics Manager] squad action recovered',err);return}});dialog.querySelector('[data-apv2-contract-renew]')?.addEventListener('click',()=>window.AMProgrammeEconomy?.openAthleteContract?.(a.id,true));dialog.querySelector('[data-apv2-contract-release]')?.addEventListener('click',()=>{dropFromSquad(a.id);safe(()=>renderView(currentView),null);renderProfile()});dialog.querySelector('[data-apv2-contract-offer]')?.addEventListener('click',()=>callUpToSquad(a.id));",
'profile contract actions')
p.write_text(text, encoding='utf-8')

# Profile styles
p = Path('styles/squad-athlete-v2.css')
css = p.read_text(encoding='utf-8')
if '/* Athlete Programme Agreements */' not in css:
    css += r'''

/* Athlete Programme Agreements */
.apv2-contract-hero{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.apv2-contract-hero>div,.apv2-contract-club{padding:10px;border:1px solid #203d51;border-radius:8px;background:#081823}.apv2-contract-hero small,.apv2-contract-club small{display:block;color:#738fa2;font-size:7px;font-weight:950;letter-spacing:.08em}.apv2-contract-hero strong,.apv2-contract-club strong{display:block;margin:4px 0 2px;color:#edf5f8;font-size:13px}.apv2-contract-hero span,.apv2-contract-club span{display:block;color:#7892a3;font-size:7px;line-height:1.4}.apv2-contract-actions{display:flex;gap:7px;margin-top:10px}.apv2-contract-actions .btn{min-height:38px}.apv2-contract-history>div>b{min-width:62px;color:#79bfe7}.apv2-contract-history>div>em{color:#7490a3}@media(max-width:820px){.apv2-contract-hero{grid-template-columns:1fr 1fr}.apv2-contract-actions{display:grid;grid-template-columns:1fr}.apv2-contract-actions .btn{width:100%}}@media(max-width:520px){.apv2-contract-hero{grid-template-columns:1fr}}
'''
p.write_text(css, encoding='utf-8')

# Cache bust both dynamic economy and athlete profile assets
p = Path('scripts/ui-cutover-v1.js')
cut = p.read_text(encoding='utf-8')
cut = cut.replace("const BUILD='2026.09.13-programme-economy3';", "const BUILD='2026.09.13-programme-contracts1';")
cut = cut.replace('styles/programme-economy-v1.css?v=20260913-pe3','styles/programme-economy-v1.css?v=20260913-contracts1')
cut = cut.replace('scripts/programme-economy-v2.js?v=20260913-pe3','scripts/programme-economy-v2.js?v=20260913-contracts1')
p.write_text(cut, encoding='utf-8')

p = Path('game.html')
game = p.read_text(encoding='utf-8')
game = game.replace('styles/squad-athlete-v2.css?v=20260913-devgradebox2','styles/squad-athlete-v2.css?v=20260913-contracts1')
game = game.replace('scripts/squad-athlete-v2.js?v=20260913-devgradeprofile1','scripts/squad-athlete-v2.js?v=20260913-contracts1')
game = game.replace('scripts/ui-cutover-v1.js?v=20260913-pe3','scripts/ui-cutover-v1.js?v=20260913-contracts1')
p.write_text(game, encoding='utf-8')

print('Athlete programme contract integration applied.')
