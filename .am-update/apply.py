from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected source not found in {path}: {old[:120]!r}')
    text = text.replace(old, new, 1)
    p.write_text(text, encoding='utf-8')

# Programme Economy owns Staff profiles and market navigation.
pe = Path('scripts/programme-economy-v2.js')
text = pe.read_text(encoding='utf-8')
old = "function openCoachDossier(id){const key=String(id||'');if(!key)return false;const api=window.__athleticsStaffFinanceV2;if(api&&typeof api.openCoachProfile==='function'){api.openCoachProfile(key);return true}if(typeof window.openCoachProfile==='function'){window.openCoachProfile(key);return true}return false}\nfunction marketCard(c){const w=weak(c);return`<article class=\"pe-market-card\"><header><div><small>${roleName(c.role).toUpperCase()}</small><h3>${esc(c.name)}</h3><span>${c.employedNation?esc(nlabel(c.employedNation)):'Available'} · ${esc(c.nationality? nlabel(c.nationality):'International')} · Age ${coachAge(c)} · ${esc(c.economyProfile.style)}</span></div><b>REP ${c.reputation}</b></header><div class=\"pe-market-strengths\">${top(c,2).map(([k,v])=>`<span><b>${esc(k)}</b>${v}/20</span>`).join('')}<span class=\"weak\"><b>${esc(w[0])}</b>${w[1]}/20</span></div><div class=\"pe-market-money\"><div><small>Expected salary</small><strong>${cash(c.expectedSalary)}</strong></div><div><small>Preferred term</small><strong>${c.preferredTerm/52} year${c.preferredTerm===52?'':'s'}</strong></div></div><button class=\"btn secondary\" data-ap=\"${c.id}\" data-role=\"${c.role}\">APPROACH</button></article>`}"
new = """function coachSource(id){const key=String(id||'');if(!key)return null;for(const[r,c]of Object.entries(s.coaches||{}))if(c&&String(c.id)===key)return{role:r,coach:c,current:true,contract:scon(r)};const p=prog(),marketCoach=(p.staffMarket?.candidates||[]).find(c=>String(c?.id)===key);if(marketCoach)return{role:marketCoach.role,coach:marketCoach,market:true,contract:null};const archived=safe(()=>managementState()?.coachArchive?.[key],null);return archived?{role:archived.role||'science',coach:archived,archived:true,contract:null}:null}\nfunction openStaffMarket(role=UI.role){const roles=staffRoles();if(roles.includes(role))UI.role=role;UI.staff='market';try{view('staff')}catch(_){}requestAnimationFrame(()=>{try{drawStaff2()}catch(_){}});return true}\nfunction openCoachDossier(id){const src=coachSource(id);if(!src){toastNow('Coach profile unavailable');return false}const r=src.role,c=enrich(r,src.coach),ct=src.contract,attrs=Object.entries(cattrs(r,c)).sort((a,b)=>b[1]-a[1]),w=weak(c),rep=Number(c.reputation||c.economyProfile?.reputation||50),d=dialog(),history=safe(()=>coachDossier(c).history,[]),employment=src.current?`${nlabel()} · ${ct?weeks(ct)+' weeks remaining':'Interim'}`:src.market?(c.employedNation?`${nlabel(c.employedNation)} · under contract`:'Available for recruitment'):'Former programme staff',salary=src.current?Number(ct?.annualSalary||c.annualSalary||0):Number(c.expectedSalary||c.annualSalary||0),term=Number(c.preferredTerm||104),portrait=safe(()=>coachPortraitHTML(c),'<span>ST</span>');d.innerHTML=`<div class=\"pe-dialog pe-coach-dossier\"><header><div><small>STAFF DOSSIER · ${esc(roleName(r).toUpperCase())}</small><h2>${esc(c.name)}</h2><p>${esc(c.nationality?nlabel(c.nationality):'International')} · Age ${coachAge(c)} · ${esc(c.economyProfile?.style||'Professional')}</p></div><button class=\"btn ghost\" data-close>← BACK</button></header><div class=\"pe-dossier-hero\"><div class=\"pe-dossier-photo\">${portrait}</div><div><small>CURRENT STATUS</small><strong>${esc(employment)}</strong><span>Reputation ${rep}/100</span></div><div><small>${src.current?'ANNUAL SALARY':'EXPECTED SALARY'}</small><strong>${salary?cash(salary):'—'}</strong><span>${src.market?`${term/52} year${term===52?'':'s'} preferred term`:ct?`${weeks(ct)} weeks on current deal`:'Career record retained'}</span></div></div><div class=\"pe-dialog-grid\"><section><div class=\"pe-card-head\"><strong>Coaching Profile</strong><span>Role-specific attributes</span></div><div class=\"pe-skill-list pe-dossier-skills\">${attrs.map(([k,v],i)=>`<div class=\"${k===w[0]?'weak':''}\"><span>${esc(k)}${i<2?' · strength':''}</span><b>${v}/20</b></div>`).join('')}</div></section><aside><div class=\"pe-expect\"><small>FIT & APPROACH</small><strong>${esc(c.economyProfile?.style||'Professional')}</strong><span>Strongest: ${esc(attrs[0]?.[0]||'—')} ${attrs[0]?.[1]||'—'}/20 · Development area: ${esc(w[0])} ${w[1]}/20</span></div><div class=\"pe-contract-summary\"><small>CONTRACT POSITION</small><strong>${src.current?(ct?`${weeks(ct)} weeks remaining`:'Interim cover'):src.market?(c.employedNation?'Employed specialist':'Available now'):'Former staff'}</strong><span>${src.market?`Expected salary ${cash(salary)} · preferred term ${term/52} year${term===52?'':'s'}`:src.current&&ct?`${cash(ct.annualSalary)}/year through programme payroll`:'No active programme contract'}</span></div><div class=\"pe-dossier-actions\">${src.current?`<button class=\"btn secondary\" data-renew>RENEW CONTRACT</button><button class=\"btn ghost\" data-market>VIEW ${esc(roleName(r).toUpperCase())} MARKET</button>`:src.market?`<button class=\"btn secondary\" data-approach>APPROACH</button><button class=\"btn ghost\" data-market>BACK TO MARKET</button>`:`<button class=\"btn ghost\" data-market>OPEN STAFF MARKET</button>`}</div></aside></div><section class=\"pe-dossier-history\"><div class=\"pe-card-head\"><strong>Career Record</strong><span>${history.length?'Recent history':'No recorded history yet'}</span></div><div>${history.slice().reverse().slice(0,8).map(x=>`<p><b>${Number(x.season)||yr()} · Week ${Number(x.week)||1}</b><span>${esc(x.text||'Career entry')}</span></p>`).join('')||'<p><span>No programme career entries have been recorded yet.</span></p>'}</div></section></div>`;d.querySelector('[data-close]').onclick=closeD;d.querySelector('[data-market]')?.addEventListener('click',()=>{closeD();openStaffMarket(r)});d.querySelector('[data-renew]')?.addEventListener('click',()=>{closeD();openStaff(r,c.id,true)});d.querySelector('[data-approach]')?.addEventListener('click',()=>{closeD();openStaff(r,c.id,false)});if(!d.open)d.showModal();return true}\nfunction marketCard(c){const w=weak(c);return`<article class=\"pe-market-card\"><header><div><small>${roleName(c.role).toUpperCase()}</small><h3><button type=\"button\" class=\"athlete-link\" data-cp=\"${esc(c.id)}\">${esc(c.name)}</button></h3><span>${c.employedNation?esc(nlabel(c.employedNation)):'Available'} · ${esc(c.nationality? nlabel(c.nationality):'International')} · Age ${coachAge(c)} · ${esc(c.economyProfile.style)}</span></div><b>REP ${c.reputation}</b></header><div class=\"pe-market-strengths\">${top(c,2).map(([k,v])=>`<span><b>${esc(k)}</b>${v}/20</span>`).join('')}<span class=\"weak\"><b>${esc(w[0])}</b>${w[1]}/20</span></div><div class=\"pe-market-money\"><div><small>Expected salary</small><strong>${cash(c.expectedSalary)}</strong></div><div><small>Preferred term</small><strong>${c.preferredTerm/52} year${c.preferredTerm===52?'':'s'}</strong></div></div><div class=\"pe-market-actions\"><button type=\"button\" class=\"btn ghost\" data-cp=\"${esc(c.id)}\">PROFILE</button><button class=\"btn secondary\" data-ap=\"${c.id}\" data-role=\"${c.role}\">APPROACH</button></div></article>`}"""
if old not in text:
    raise SystemExit('Programme Economy profile/market source block not found')
text = text.replace(old, new, 1)
old_catch = "}catch(err){console.error('[Programme Economy] Staff screen recovery',err);try{return OLD.drawStaff.apply(this,arguments)}catch(fallbackErr){console.error('[Programme Economy] Staff V2 fallback failed',fallbackErr);root.innerHTML='<div class=\"am-cutover-error\" role=\"alert\"><div><small>STAFF RECOVERY</small><h2>Staff screen unavailable</h2><p>Your career data has not been changed. Return Home and reopen Staff.</p><div class=\"am-cutover-error-actions\"><button type=\"button\" class=\"btn secondary\" onclick=\"view(&#39;staff&#39;)\">RETRY</button><button type=\"button\" class=\"btn ghost\" onclick=\"view(&#39;home&#39;)\">RETURN HOME</button></div></div></div>'}}}"
new_catch = "}catch(err){console.error('[Programme Economy] Staff screen recovery',err);root.innerHTML='<div class=\"am-cutover-error\" role=\"alert\"><div><small>STAFF RECOVERY</small><h2>Staff screen unavailable</h2><p>The Staff Market did not finish loading. Your career data has not been changed.</p><div class=\"am-cutover-error-actions\"><button type=\"button\" class=\"btn secondary\" data-pe-staff-retry>RETRY STAFF MARKET</button><button type=\"button\" class=\"btn ghost\" onclick=\"view(&#39;home&#39;)\">RETURN HOME</button></div></div></div>';root.querySelector('[data-pe-staff-retry]')?.addEventListener('click',()=>drawStaff2())}}"
if old_catch not in text:
    raise SystemExit('Programme Economy legacy Staff fallback block not found')
text = text.replace(old_catch, new_catch, 1)
old_bind = "root.querySelectorAll('[data-mr]').forEach(b=>b.onclick=()=>{UI.staff='market';UI.role=b.dataset.mr;drawStaff2()});"
new_bind = "root.querySelectorAll('[data-mr]').forEach(b=>b.onclick=()=>openStaffMarket(b.dataset.mr));"
if old_bind not in text:
    raise SystemExit('Programme Economy market button binding not found')
text = text.replace(old_bind, new_bind, 1)
old_export = "renderFinance:drawFinance2,renderStaff:drawStaff2,debug:()=>({nation:nation(),cash:s.funding"
new_export = "renderFinance:drawFinance2,renderStaff:drawStaff2,openStaffMarket,openCoachProfile:openCoachDossier,staffCandidate:id=>coachSource(id)?.market?coachSource(id).coach:null,debug:()=>({nation:nation(),cash:s.funding"
if old_export not in text:
    raise SystemExit('Programme Economy export block not found')
text = text.replace(old_export, new_export, 1)
pe.write_text(text, encoding='utf-8')

# Retire the old three-person recruitment shortlist from Staff V2 fallback.
sf = Path('scripts/staff-finance-v2.js')
stext = sf.read_text(encoding='utf-8')
start = stext.index('function roleCard(x){')
end = stext.index('\nfunction staffAttention()', start)
role_fn = """function roleCard(x){const c=x.c,left=currentContract(c),tone=!c?'bad':left<=4?'bad':left<=12?'warn':'',renew=renewalCost(c);return `<article class=\"sfv2-role\"><div class=\"sfv2-role-top\"><div class=\"sfv2-avatar\">${portrait(c)}</div><div class=\"sfv2-person\"><small>${esc(x.d.name).toUpperCase()}</small><strong>${esc(c?.name||'Interim cover')}</strong><small>${c?`Ability ${x.level}/5`:'Level 1 temporary cover'}</small></div><span class=\"sfv2-contract ${tone}\">${c?`${left}W LEFT`:'INTERIM'}</span></div><div class=\"sfv2-ability\">${pips(x.level)}<b>Ability ${x.level}/5</b></div><div class=\"sfv2-role-copy\">${esc(roleEffect(x.role))}</div><div class=\"sfv2-role-actions\">${c?`<button class=\"btn ghost\" data-sfv2-coach=\"${esc(c.id)}\">PROFILE</button><button class=\"btn secondary\" data-sfv2-renew=\"${esc(x.role)}\" ${left>4||cash()<renew?'disabled title=\"'+esc(left>4?'Renewal opens with four weeks remaining':'Insufficient funding')+'\"':''}>${left>4?'RENEWAL LOCKED':`RENEW · ${esc(fmtMoney(renew))}`}</button>`:''}<button class=\"btn ${c?'ghost':'secondary'}\" data-sfv2-market=\"${esc(x.role)}\">OPEN STAFF MARKET</button></div></article>`}"""
stext = stext[:start] + role_fn + stext[end:]
old_bind_sf = " root.querySelectorAll('[data-sfv2-appoint]').forEach(b=>b.onclick=()=>{const role=b.dataset.sfv2Role,c=candidateById(b.dataset.sfv2Appoint),old=gs()?.coaches?.[role],cost=candidateCost(c);if(!c)return;const note=old?` This replaces ${old.name} immediately and the existing contract is not refunded.`:'';if(!confirmed(`Appoint ${c.name} as ${staffDefs()[role]?.name||role} for ${fmtMoney(cost)}?${note}`))return;safe(()=>appointCoach(role,c.id),null)});"
new_bind_sf = " root.querySelectorAll('[data-sfv2-market]').forEach(b=>b.onclick=()=>{const api=window.AMProgrammeEconomy;if(api?.openStaffMarket)return api.openStaffMarket(b.dataset.sfv2Market);safe(()=>toast('Staff Market is still loading'),null);setTimeout(()=>safe(()=>view('staff'),null),120)});"
if old_bind_sf not in stext:
    raise SystemExit('Staff V2 legacy appointment binding not found')
stext = stext.replace(old_bind_sf, new_bind_sf, 1)
needle = "function openCoachProfileV2(id){ensure();const current=currentCoachById(id),candidate=candidateById(id),archived=archiveById(id),c=current||candidate||archived;if(!c){legacy.openCoachProfile?.(id);return}const dossier="
if needle not in stext:
    raise SystemExit('Staff V2 profile function not found')
stext = stext.replace(needle, "function openCoachProfileV2(id){ensure();const current=currentCoachById(id),candidate=candidateById(id),archived=archiveById(id),c=current||candidate||archived;if(!c){legacy.openCoachProfile?.(id);return}const dossier=", 1)
profile_dialog = "role=dossier.role||c.role,def=staffDefs()[role]||{name:'Staff',desc:'Programme specialist'},left=current?currentContract(current):null,rep=Math.min(100,Number(c.level||1)*15+r.podiums+r.records*2),age=Number(dossier.age||40)+season()-Number(dossier.originSeason||season()),dialog=$('managementProfile');if(!dialog)return;\n const candidateCostValue="
profile_repl = "role=dossier.role||c.role,def=staffDefs()[role]||{name:'Staff',desc:'Programme specialist'},left=current?currentContract(current):null,rep=Math.min(100,Number(c.level||1)*15+r.podiums+r.records*2),age=Number(dossier.age||40)+season()-Number(dossier.originSeason||season()),dialog=$('managementProfile');if(!dialog)return;dialog.classList.remove('am-manager-profile-dialog');dialog.dataset.profileOwner='staff';\n const candidateCostValue="
if profile_dialog not in stext:
    raise SystemExit('Staff V2 shared profile dialog block not found')
stext = stext.replace(profile_dialog, profile_repl, 1)
sf.write_text(stext, encoding='utf-8')

# My Profile nav state only follows the manager profile, never a staff dossier.
mp = Path('scripts/manager-profile-sidebar-v1.js')
mtext = mp.read_text(encoding='utf-8')
old_sync = "function sync(open=dialog.open){const r=route();document.querySelectorAll('.rail-nav [data-view]').forEach(b=>{const on=!open&&b.dataset.view===r;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});for(const b of [desktop,mobile])if(b){b.classList.toggle('on',!!open);if(open)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}\nconst nativeShow=window.HTMLDialogElement?.prototype?.show;if(typeof nativeShow==='function')dialog.showModal=function(){if(!this.open)nativeShow.call(this);sync(true)};"
new_sync = "function managerProfileOpen(open=dialog.open){return !!open&&dialog.classList.contains('am-manager-profile-dialog')}\nfunction sync(open=dialog.open){const r=route(),managerOpen=managerProfileOpen(open);document.querySelectorAll('.rail-nav [data-view]').forEach(b=>{const on=!managerOpen&&b.dataset.view===r;b.classList.toggle('on',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});for(const b of [desktop,mobile])if(b){b.classList.toggle('on',managerOpen);if(managerOpen)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')}}\nconst nativeShow=window.HTMLDialogElement?.prototype?.show;if(typeof nativeShow==='function')dialog.showModal=function(){if(!this.open)nativeShow.call(this);sync(this.open)};"
if old_sync not in mtext:
    raise SystemExit('Manager profile sidebar sync block not found')
mtext = mtext.replace(old_sync, new_sync, 1)
mp.write_text(mtext, encoding='utf-8')

# Cache bust dynamic and static Staff assets.
uc = Path('scripts/ui-cutover-v1.js')
uct = uc.read_text(encoding='utf-8')
uct = uct.replace("const BUILD='2026.09.13-staffrecovery1';", "const BUILD='2026.09.13-staffmarket1';")
uct = uct.replace("staffProfile:'staff-finance-v2 + programme-economy-v1'", "staffProfile:'programme-economy-v2'")
uct = uct.replace("styles/programme-economy-v1.css?v=20260913-staffrecovery1", "styles/programme-economy-v1.css?v=20260913-staffmarket1")
uct = uct.replace("scripts/programme-economy-v2.js?v=20260913-staffrecovery1", "scripts/programme-economy-v2.js?v=20260913-staffmarket1")
uc.write_text(uct, encoding='utf-8')

gh = Path('game.html')
gtext = gh.read_text(encoding='utf-8')
gtext = gtext.replace('scripts/staff-finance-v2.js?v=20260910-stafffinance2', 'scripts/staff-finance-v2.js?v=20260913-staffmarket1')
gtext = gtext.replace('scripts/manager-profile-sidebar-v1.js?v=20260911-manager-sidebar2', 'scripts/manager-profile-sidebar-v1.js?v=20260913-staffmarket1')
gtext = gtext.replace('scripts/ui-cutover-v1.js?v=20260913-staffrecovery1', 'scripts/ui-cutover-v1.js?v=20260913-staffmarket1')
gh.write_text(gtext, encoding='utf-8')

# Staff dossier and market action layout.
css = Path('styles/programme-economy-v1.css')
ctext = css.read_text(encoding='utf-8')
addon = """
/* Staff Market authority + coach dossier */
.pe-market-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.pe-market-actions .btn{width:100%;min-height:38px;font-size:8px}.pe-dossier-hero{display:grid;grid-template-columns:72px minmax(0,1fr) minmax(180px,.65fr);gap:12px;align-items:center;padding:14px 16px;border-bottom:1px solid #1d3548;background:#091a27}.pe-dossier-photo{width:72px;height:72px;border-radius:12px;overflow:hidden;background:#132c3f}.pe-dossier-photo .coach-portrait{display:block;width:100%;height:100%;background-size:600% 500%}.pe-dossier-hero small{display:block;color:#718b9d;font-size:7px;font-weight:950;letter-spacing:.08em}.pe-dossier-hero strong{display:block;margin-top:4px;font-size:14px}.pe-dossier-hero span{display:block;margin-top:3px;color:#7f97a8;font-size:8px}.pe-dossier-skills{margin:0}.pe-dossier-actions{display:grid;gap:6px;margin-top:10px}.pe-dossier-actions .btn{width:100%}.pe-dossier-history{margin:0 14px 14px;border:1px solid #203c50;border-radius:10px;overflow:hidden;background:#091925}.pe-dossier-history>div:last-child{padding:0 12px}.pe-dossier-history p{display:grid;grid-template-columns:110px minmax(0,1fr);gap:10px;margin:0;padding:9px 0;border-bottom:1px solid #183246;font-size:8px}.pe-dossier-history p:last-child{border-bottom:0}.pe-dossier-history p b{color:#91b6cd}.pe-dossier-history p span{color:#829aaa}@media(max-width:760px){.pe-dossier-hero{grid-template-columns:58px 1fr}.pe-dossier-photo{width:58px;height:58px}.pe-dossier-hero>div:last-child{grid-column:1/-1}.pe-market-actions{grid-template-columns:1fr}.pe-dossier-history p{grid-template-columns:1fr;gap:3px}}
"""
if '/* Staff Market authority + coach dossier */' not in ctext:
    ctext += addon
css.write_text(ctext, encoding='utf-8')

# Regression contracts: no retired shortlist fallback, profile opens Programme Economy dialog,
# and opening a coach must not highlight My Profile.
soak = Path('tools/programme-management-integration-soak.mjs')
sot = soak.read_text(encoding='utf-8')
if "const staffUi=" not in sot:
    sot = sot.replace("const career=fs.readFileSync('scripts/manager-career-v1.js','utf8');", "const career=fs.readFileSync('scripts/manager-career-v1.js','utf8');\nconst staffUi=fs.readFileSync('scripts/staff-finance-v2.js','utf8');")
old_need = "need(economy.includes('function openCoachDossier(')&&economy.includes('__athleticsStaffFinanceV2')&&economy.includes(\"if(!openCoachDossier(b.dataset.cp))\"),'Staff profile actions must use the explicit Staff V2 profile authority');"
new_need = "need(economy.includes('function coachSource(')&&economy.includes('function openCoachDossier(')&&economy.includes('function openStaffMarket(')&&economy.includes('programmeEconomyDialog'),'Programme Economy must own Staff profiles and market navigation');\nneed(!economy.includes(\"return OLD.drawStaff.apply(this,arguments)\"),'Staff route must not fall back to the retired shortlist renderer');\nneed(!staffUi.includes('Recruitment shortlist'),'Retired three-coach recruitment shortlist is still present in Staff V2');"
if old_need not in sot:
    raise SystemExit('Programme management Staff profile regression assertion not found')
sot = sot.replace(old_need, new_need, 1)
soak.write_text(sot, encoding='utf-8')

smoke = Path('tools/runtime-smoke.mjs')
smt = smoke.read_text(encoding='utf-8')
old_smoke = """   if(target==='staff'){
    const profile=w.document.querySelector('#staff [data-cp],#staff [data-sfv2-coach]'),dialog=w.document.getElementById('managementProfile');
    if(!profile)fail('Staff route did not expose a coach profile action.');
    else{
     try{if(dialog?.open)dialog.close();profile.click();await new Promise(resolve=>setTimeout(resolve,15));if(!dialog?.open)fail('Coach profile action did not open the staff dossier dialog.');dialog?.close()}catch(err){fail(`Coach profile click threw during Staff smoke: ${err?.stack||err}`)}
    }
   }"""
new_smoke = """   if(target==='staff'){
    const profile=w.document.querySelector('#staff [data-cp]'),marketTab=w.document.querySelector('#staff [data-stab=\"market\"]'),legacyShortlist=w.document.querySelector('#staff .sfv2-shortlist,#staff [data-sfv2-appoint]');
    if(!marketTab)fail('Staff route did not expose the canonical Staff Market tab.');
    if(legacyShortlist)fail('Staff route exposed the retired three-coach shortlist.');
    if(!profile)fail('Staff route did not expose a Programme Economy coach profile action.');
    else{
     try{const manager=w.document.getElementById('managementProfile');if(manager?.open)manager.close();profile.click();await new Promise(resolve=>setTimeout(resolve,15));const dialog=w.document.getElementById('programmeEconomyDialog');if(!dialog?.open)fail('Coach profile action did not open the Programme Economy staff dossier.');if(w.document.getElementById('myProfileShortcut')?.classList.contains('on'))fail('Coach profile incorrectly activated My Profile navigation.');dialog?.close()}catch(err){fail(`Coach profile click threw during Staff smoke: ${err?.stack||err}`)}
    }
   }"""
if old_smoke not in smt:
    raise SystemExit('Runtime Staff profile smoke block not found')
smt = smt.replace(old_smoke, new_smoke, 1)
smoke.write_text(smt, encoding='utf-8')

print('Staff Market authority cutover staged successfully.')
