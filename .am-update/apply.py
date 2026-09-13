from pathlib import Path
import re


def rep(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing anchor: {label}')
    return text.replace(old, new, 1)


def rx(text, pattern, replacement, label):
    out, n = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'Expected one match for {label}, got {n}')
    return out

p=Path('scripts/programme-economy-v2.js')
text=p.read_text(encoding='utf-8')
text=rep(text,
"const fbuild=k=>Math.round(FAC[k].build*Math.pow(Math.min(5,fact(k)+1),1.18)*costFactor()*inf()/10000)*10000,fweeks=k=>6+fact(k)*2,fservice=k=>Math.max(45000,Math.round((100-fcond(k))*1450*fact(k)*costFactor()*inf()/5000)*5000);",
"const fbuild=k=>Math.round(FAC[k].build*Math.pow(Math.min(5,fact(k)+1),1.18)*costFactor()*inf()/10000)*10000,fweeks=k=>6+fact(k)*2,fservice=k=>Math.max(45000,Math.round((100-fcond(k))*1450*fact(k)*costFactor()*inf()/5000)*5000);\nconst FACILITY_ISSUES={sprint:[['Indoor track surface deterioration','Sections of the indoor sprint surface have failed inspection. Full-speed work is being restricted until the surface is made safe.'],['Timing-system failure','The primary sprint timing and start-analysis equipment has failed calibration and cannot currently provide reliable testing data.']],field:[['Throws-sector equipment failure','Specialist field-event equipment has failed inspection. Technical work can continue, but the centre is operating below normal capability.'],['Runway and landing-area repairs','Wear has been identified across the jumps runway and landing infrastructure. The centre remains usable with restrictions.']],recovery:[['Recovery equipment failure','A key recovery system has failed and the medical team has reduced throughput until repairs are completed.'],['Ventilation and treatment-suite fault','An operational fault is affecting part of the recovery and treatment area. Capacity is reduced while the issue remains unresolved.']]};\nfunction makeFacilityIncident(k,p){const f=p.facilities[k];if(!f||f.incident)return null;const choices=FACILITY_ISSUES[k]||FACILITY_ISSUES.recovery,spec=choices[hash(`${k}-${cw()}-issue`)%choices.length],level=fact(k,p),full=Math.max(fservice(k),Math.round((80000+level*52000)*costFactor()*inf()/5000)*5000),temporary=Math.round(full*.32/5000)*5000,drop=5+(hash(`${cw()}-${k}-damage`)%8);f.condition=clamp(f.condition-drop,20,100);f.incident={id:`${k}-${cw()}`,title:spec[0],body:spec[1],createdCareerWeek:cw(),fullCost:full,temporaryCost:temporary,deferredUntil:0};p.lastIncident=cw();mail('performance',`${FAC[k].name}: ${spec[0]}`,`${spec[1]} Finance → Facilities now has three options: complete repair ${cash(full)}, temporary repair ${cash(temporary)}, or defer the work. The centre is currently at ${Math.round(f.condition)}% condition.`,'review');return f.incident}\nfunction resolveFacilityIncident(k,choice){const p=prog(),f=p.facilities[k],i=f?.incident;if(!i)return false;if(choice==='full'){if(Number(s.funding)<Number(i.fullCost)){toastNow('Not enough funding for the full repair');return false}post(-Number(i.fullCost),`${FAC[k].name}: ${i.title} — full repair`,'Facilities',{maintenance:true,facility:k,incident:i.id});f.condition=100;f.incident=null;f.temporaryRepairUntil=0;f.lastBand=null;p.boardTrust=clamp(Number(p.boardTrust||65)+.8,0,100);mail('performance',`${FAC[k].name}: full repair authorised`,`The ${i.title.toLowerCase()} has been fully resolved. The centre has returned to 100% condition.`)}else if(choice==='temporary'){if(Number(s.funding)<Number(i.temporaryCost)){toastNow('Not enough funding for the temporary repair');return false}post(-Number(i.temporaryCost),`${FAC[k].name}: ${i.title} — temporary repair`,'Facilities',{maintenance:true,temporary:true,facility:k,incident:i.id});f.condition=clamp(Math.max(f.condition+22,72),20,88);f.temporaryRepairUntil=cw()+26;f.incident=null;f.lastBand=f.condition<70?'watch':null;mail('performance',`${FAC[k].name}: temporary repair completed`,`The centre remains open after a temporary repair. Condition is ${Math.round(f.condition)}%; a small effectiveness penalty remains for the next 26 weeks.`)}else if(choice==='defer'){if(Number(i.deferredUntil||0)>cw()){toastNow(`Decision already deferred until career week ${i.deferredUntil}`);return false}i.deferredUntil=cw()+4;f.condition=clamp(f.condition-1.5,20,100);p.boardTrust=clamp(Number(p.boardTrust||65)-.6,0,100);mail('board',`${FAC[k].name}: repair deferred`,`You have deferred the ${i.title.toLowerCase()} for four weeks. No money has been spent, but the facility remains below full effectiveness and condition may deteriorate further.`,'review')}saveNow();drawFinance2();return true}",
'facility incident helpers')
text=rep(text,
"const l=fact(k,p),cf=.55+.45*fcond(k,p)/100,bf=f.construction?.weeksRemaining>0 ? .9 : 1;return clamp(1+(l-1)*cf*bf,1,l)",
"const l=fact(k,p),cf=.55+.45*fcond(k,p)/100,build=f.construction?.weeksRemaining>0?.9:1,temp=Number(f.temporaryRepairUntil||0)>cw()?.93:1;return clamp(1+(l-1)*cf*build*temp,1,l)",
'effective facility temporary repair penalty')
new_week = r'''function facilityWeek(p){for(const [k,f] of Object.entries(p.facilities)){if(f.construction){f.construction.weeksRemaining=Math.max(0,Number(f.construction.weeksRemaining)-1);if(!f.construction.weeksRemaining){f.level=f.construction.targetLevel;f.condition=100;s.facilityLevels??={};s.facilityLevels[k]=f.level;f.construction=null;f.lastBand=null;mail('performance',`${FAC[k].name} upgrade complete`,`${FAC[k].name} is now Level ${f.level}. Weekly upkeep is ${cash(fup(k,p))}; capacity is ${fcap(k,p)} athletes.`)}}if(Number(f.temporaryRepairUntil||0)&&cw()>=Number(f.temporaryRepairUntil)){f.temporaryRepairUntil=0;mail('performance',`${FAC[k].name}: temporary repair period ended`,`The temporary repair period has ended. Current condition is ${Math.round(f.condition)}%. Routine servicing can restore full condition, while future faults may require a new operational decision.`)}f.condition=clamp(Number(f.condition||100)-(.06+fact(k,p)*.025+(hash(`${yr()}-${wk()}-${k}`)%9)/100),20,100);if(f.incident&&Number(f.incident.deferredUntil||0)>0&&cw()>=Number(f.incident.deferredUntil)){f.incident.deferredUntil=0;f.condition=clamp(f.condition-3,20,100);mail('performance',`${FAC[k].name}: deferred repair now due`,`${f.incident.title} remains unresolved. Condition has fallen to ${Math.round(f.condition)}%. Review Finance → Facilities before the problem causes further performance loss.`,'review')}const b=f.condition<50?'critical':f.condition<70?'watch':null;if(b&&f.lastBand!==b){f.lastBand=b;mail('performance',`${FAC[k].name}: maintenance required`,`${FAC[k].name} is operating at ${Math.round(f.condition)}% condition. Its contribution is below its headline level. Open Finance → Facilities to review servicing.`)}if(!f.construction&&!f.incident&&f.condition<86&&cw()-Number(p.lastIncident||0)>32&&(hash(`${cw()}-${k}-incident`)%1000)<10)makeFacilityIncident(k,p)}}
'''
text=rx(text,r'function facilityWeek\(p\)\{.*?\}\nfunction athleteExpiries\(p\)\{',new_week+'function athleteExpiries(p){','facility week authority')
text=rep(text,
"function upgrade(k){const p=prog(),f=p.facilities[k];if(!f||f.level>=5||f.construction)return;",
"function upgrade(k){const p=prog(),f=p.facilities[k];if(!f||f.level>=5||f.construction)return;if(f.incident){toastNow('Resolve the current facility issue before starting an upgrade');return}",
'block upgrades during issue')
text=rep(text,
"function service(k){const p=prog(),f=p.facilities[k],cost=fservice(k);if(!f||Number(s.funding)<cost){toastNow('Not enough funding');return}",
"function service(k){const p=prog(),f=p.facilities[k],cost=fservice(k);if(f?.incident){toastNow('Resolve the operational issue using its repair options');return}if(!f||Number(s.funding)<cost){toastNow('Not enough funding');return}",
'block service during issue')
text=rep(text,
"f.condition=100;f.lastBand=null;saveNow();toastNow('Facility servicing authorised');",
"f.condition=100;f.temporaryRepairUntil=0;f.lastBand=null;saveNow();toastNow('Facility servicing authorised');",
'service clears temporary state')
text=rep(text,
"Object.entries(p.facilities).filter(([,f])=>f.condition<70||f.construction).forEach(([k,f])=>r.push({w:f.construction?.weeksRemaining??99,t:FAC[k].name,d:f.construction?`Upgrade completes in ${f.construction.weeksRemaining} weeks`:`Condition ${Math.round(f.condition)}%`,a:`<button class=\"btn ghost\" data-tab=\"facilities\">OPEN</button>`}));",
"Object.entries(p.facilities).filter(([,f])=>f.incident||f.condition<70||f.construction).forEach(([k,f])=>r.push({w:f.incident?0:(f.construction?.weeksRemaining??99),t:FAC[k].name,d:f.incident?f.incident.title:f.construction?`Upgrade completes in ${f.construction.weeksRemaining} weeks`:`Condition ${Math.round(f.condition)}%`,a:`<button class=\"btn ghost\" data-tab=\"facilities\">OPEN</button>`}));",
'facility decision priority')
new_facilities = r'''function facilities(){const p=prog();return`<div class="pe-facilities">${Object.entries(FAC).map(([k,m])=>{const f=p.facilities[k],l=fact(k,p),c=fcond(k,p),b=l<5?fbuild(k):0,svc=fservice(k),issue=f.incident,temp=Number(f.temporaryRepairUntil||0)>cw();return`<article class="pe-facility ${c<60?'warn':''} ${issue?'issue':''}"><header><div><small>${m.name.toUpperCase()}</small><h3>Level ${l} / 5</h3></div><span>${Math.round(c)}% CONDITION</span></header>${safe(()=>facilityArtHTML(k,l),'')}<div class="pe-condition"><i><b style="width:${c}%"></b></i><strong>${Math.round(c)}%</strong></div><div class="pe-fac-stats"><div><small>Weekly upkeep</small><strong>${cash(fup(k,p))}</strong></div><div><small>Capacity</small><strong>${fcap(k,p)}</strong></div><div><small>Effective level</small><strong>${feff(k).toFixed(1)}</strong></div></div><ul class="pe-benefits">${m.benefits.map(x=>`<li>${x}</li>`).join('')}</ul>${issue?`<div class="pe-fac-issue"><small>OPERATIONAL DECISION</small><strong>${esc(issue.title)}</strong><p>${esc(issue.body)}</p>${Number(issue.deferredUntil||0)>cw()?`<span>Deferred · review due in ${Number(issue.deferredUntil)-cw()} weeks</span>`:''}<div><button class="btn secondary" data-fi-full="${k}" ${Number(s.funding)<Number(issue.fullCost)?'disabled':''}>FULL REPAIR · ${cash(issue.fullCost)}</button><button class="btn ghost" data-fi-temp="${k}" ${Number(s.funding)<Number(issue.temporaryCost)?'disabled':''}>TEMPORARY · ${cash(issue.temporaryCost)}</button><button class="btn ghost" data-fi-defer="${k}" ${Number(issue.deferredUntil||0)>cw()?'disabled':''}>DEFER 4 WEEKS</button></div></div>`:temp?`<div class="pe-fac-temp"><strong>TEMPORARY REPAIR ACTIVE</strong><span>${Number(f.temporaryRepairUntil)-cw()} weeks remaining · effectiveness slightly reduced</span></div>`:''}${f.construction?`<div class="pe-build"><strong>UPGRADE IN PROGRESS</strong><span>Level ${f.construction.targetLevel} · ${f.construction.weeksRemaining} weeks remaining</span></div>`:l<5?`<div class="pe-build"><small>NEXT UPGRADE</small><strong>${cash(b)} · ${fweeks(k)} weeks</strong><span>Higher level means higher weekly upkeep.</span></div>`:'<div class="pe-build"><strong>ELITE CAPABILITY</strong><span>No further upgrade available.</span></div>'}<div class="pe-fac-actions"><button class="btn secondary" data-fu="${k}" ${l>=5||f.construction||issue||restricted(p)||Number(s.funding)<b?'disabled':''}>${l>=5?'MAX LEVEL':f.construction?'BUILDING':issue?'ISSUE ACTIVE':`UPGRADE · ${cash(b)}`}</button><button class="btn ghost" data-fs="${k}" ${issue||c>=99||Number(s.funding)<svc?'disabled':''}>${issue?'ISSUE REQUIRES DECISION':`SERVICE · ${cash(svc)}`}</button></div></article>`}).join('')}</div>`}
'''
text=rx(text,r'function facilities\(\)\{.*?\}\nfunction forecast\(\)\{',new_facilities+'function forecast(){','facility UI')
text=rep(text,
"root.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>service(b.dataset.fs));root.querySelectorAll('[data-commercial]')",
"root.querySelectorAll('[data-fs]').forEach(b=>b.onclick=()=>service(b.dataset.fs));root.querySelectorAll('[data-fi-full]').forEach(b=>b.onclick=()=>resolveFacilityIncident(b.dataset.fiFull,'full'));root.querySelectorAll('[data-fi-temp]').forEach(b=>b.onclick=()=>resolveFacilityIncident(b.dataset.fiTemp,'temporary'));root.querySelectorAll('[data-fi-defer]').forEach(b=>b.onclick=()=>resolveFacilityIncident(b.dataset.fiDefer,'defer'));root.querySelectorAll('[data-commercial]')",
'facility issue bindings')
p.write_text(text,encoding='utf-8')

# CSS for operational issue decision card
p=Path('styles/programme-economy-v1.css')
css=p.read_text(encoding='utf-8')
if '/* Facilities 2.0 operational decisions */' not in css:
    css += r'''

/* Facilities 2.0 operational decisions */
.pe-facility.issue{border-color:#6d4d2f}.pe-fac-issue{display:grid;gap:7px;margin:10px 0;padding:11px;border:1px solid #6d4d2f;border-radius:9px;background:#24180d}.pe-fac-issue>small{color:#efb96f;font-size:7px;font-weight:950;letter-spacing:.1em}.pe-fac-issue>strong{font-size:12px;color:#f4e5d1}.pe-fac-issue>p{margin:0;color:#ba9f82;font-size:8px;line-height:1.5}.pe-fac-issue>span{color:#e4b66d;font-size:8px;font-weight:800}.pe-fac-issue>div{display:grid;grid-template-columns:1.2fr 1fr .8fr;gap:6px}.pe-fac-issue .btn{min-height:37px;font-size:7px}.pe-fac-temp{margin:10px 0;padding:9px 10px;border:1px solid #31536a;border-radius:8px;background:#0a1b27}.pe-fac-temp strong{display:block;color:#91c8e6;font-size:8px}.pe-fac-temp span{display:block;margin-top:3px;color:#7894a6;font-size:7px}@media(max-width:760px){.pe-fac-issue>div{grid-template-columns:1fr}.pe-fac-issue .btn{width:100%}}
'''
p.write_text(css,encoding='utf-8')

# Cache bust dynamic authority
p=Path('scripts/ui-cutover-v1.js')
cut=p.read_text(encoding='utf-8')
cut=cut.replace("const BUILD='2026.09.13-programme-contracts1';","const BUILD='2026.09.13-facilities2';")
cut=cut.replace('styles/programme-economy-v1.css?v=20260913-contracts1','styles/programme-economy-v1.css?v=20260913-facilities2')
cut=cut.replace('scripts/programme-economy-v2.js?v=20260913-contracts1','scripts/programme-economy-v2.js?v=20260913-facilities2')
p.write_text(cut,encoding='utf-8')

p=Path('game.html')
game=p.read_text(encoding='utf-8').replace('scripts/ui-cutover-v1.js?v=20260913-contracts1','scripts/ui-cutover-v1.js?v=20260913-facilities2')
p.write_text(game,encoding='utf-8')
print('Facilities 2.0 operational decisions applied.')
