from pathlib import Path

# Make Programme Economy a deterministic production asset instead of a late dynamic race.
gh=Path('game.html')
g=gh.read_text(encoding='utf-8')
css_anchor='<link rel="stylesheet" href="styles/staff-finance-v2.css?v=20260910-stafffinance2">'
css_insert=css_anchor+'\n<link rel="stylesheet" href="styles/programme-economy-v1.css?v=20260913-staffmarket2">'
if 'styles/programme-economy-v1.css?v=20260913-staffmarket2' not in g:
    if css_anchor not in g: raise SystemExit('Staff stylesheet anchor not found')
    g=g.replace(css_anchor,css_insert,1)
script_anchor='<script src="scripts/integration-regression-v1.js?v=20260910-integration1"></script>\n<script src="scripts/ui-cutover-v1.js?v=20260913-staffprofile1"></script>'
script_insert='<script src="scripts/integration-regression-v1.js?v=20260910-integration1"></script>\n<script src="scripts/programme-economy-v2.js?v=20260913-staffmarket2"></script>\n<script src="scripts/ui-cutover-v1.js?v=20260913-staffmarket2"></script>'
if 'scripts/programme-economy-v2.js?v=20260913-staffmarket2' not in g:
    if script_anchor not in g: raise SystemExit('UI cutover script anchor not found')
    g=g.replace(script_anchor,script_insert,1)
else:
    g=g.replace('scripts/ui-cutover-v1.js?v=20260913-staffprofile1','scripts/ui-cutover-v1.js?v=20260913-staffmarket2')
gh.write_text(g,encoding='utf-8')

uc=Path('scripts/ui-cutover-v1.js')
u=uc.read_text(encoding='utf-8')
u=u.replace("const BUILD='2026.09.13-staffprofile1';","const BUILD='2026.09.13-staffmarket2';")
old="""function loadProgrammeEconomy(){
 if(!$('amProgrammeEconomyStyle')){const link=document.createElement('link');link.id='amProgrammeEconomyStyle';link.rel='stylesheet';link.href='styles/programme-economy-v1.css?v=20260913-staffprofile1';document.head.appendChild(link)}
 if(!$('amProgrammeEconomyScript')){const script=document.createElement('script');script.id='amProgrammeEconomyScript';script.src='scripts/programme-economy-v2.js?v=20260913-staffprofile1';script.async=false;document.body.appendChild(script)}
}"""
new="""function loadProgrammeEconomy(){
 if(!document.querySelector('link[href*=\"programme-economy-v1.css\"]')&&!$('amProgrammeEconomyStyle')){const link=document.createElement('link');link.id='amProgrammeEconomyStyle';link.rel='stylesheet';link.href='styles/programme-economy-v1.css?v=20260913-staffmarket2';document.head.appendChild(link)}
 if(!window.__amProgrammeEconomyV2&&!$('amProgrammeEconomyScript')){const script=document.createElement('script');script.id='amProgrammeEconomyScript';script.src='scripts/programme-economy-v2.js?v=20260913-staffmarket2';script.async=false;document.body.appendChild(script)}
}"""
if old not in u: raise SystemExit('Programme Economy dynamic loader block not found')
u=u.replace(old,new,1)
uc.write_text(u,encoding='utf-8')

# The smoke test should wait for canonical Staff authority when the route is exercised.
smoke=Path('tools/runtime-smoke.mjs')
sm=smoke.read_text(encoding='utf-8')
old_staff="""   if(target==='staff'){
    const profile=w.document.querySelector('#staff [data-cp]'),marketTab=w.document.querySelector('#staff [data-stab=\"market\"]'),legacyShortlist=w.document.querySelector('#staff .sfv2-shortlist,#staff [data-sfv2-appoint]');
    if(!marketTab)fail('Staff route did not expose the canonical Staff Market tab.');
    if(legacyShortlist)fail('Staff route exposed the retired three-coach shortlist.');
    if(profile){
     try{const manager=w.document.getElementById('managementProfile');if(manager?.open)manager.close();profile.click();await new Promise(resolve=>setTimeout(resolve,15));const dialog=w.document.getElementById('programmeEconomyDialog');if(!dialog?.open)fail('Coach profile action did not open the Programme Economy staff dossier.');if(w.document.getElementById('myProfileShortcut')?.classList.contains('on'))fail('Coach profile incorrectly activated My Profile navigation.');dialog?.close()}catch(err){fail(`Coach profile click threw during Staff smoke: ${err?.stack||err}`)}
    }else console.log('[smoke] staff profile interaction skipped: startup smoke has no active career staff');
   }"""
new_staff="""   if(target==='staff'){
    if(w.AMProgrammeEconomy?.renderStaff){try{w.AMProgrammeEconomy.renderStaff();await new Promise(resolve=>setTimeout(resolve,20))}catch(err){fail(`Canonical Staff Market render threw: ${err?.stack||err}`)}}
    const profile=w.document.querySelector('#staff [data-cp]'),marketTab=w.document.querySelector('#staff [data-stab=\"market\"]'),legacyShortlist=w.document.querySelector('#staff .sfv2-shortlist,#staff [data-sfv2-appoint]');
    if(!w.AMProgrammeEconomy)fail('Programme Economy Staff authority was not loaded before Staff route validation.');
    if(!marketTab)fail('Staff route did not expose the canonical Staff Market tab.');
    if(legacyShortlist)fail('Staff route exposed the retired three-coach shortlist.');
    if(profile){
     try{const manager=w.document.getElementById('managementProfile');if(manager?.open)manager.close();profile.click();await new Promise(resolve=>setTimeout(resolve,15));const dialog=w.document.getElementById('programmeEconomyDialog');if(!dialog?.open)fail('Coach profile action did not open the Programme Economy staff dossier.');if(w.document.getElementById('myProfileShortcut')?.classList.contains('on'))fail('Coach profile incorrectly activated My Profile navigation.');dialog?.close()}catch(err){fail(`Coach profile click threw during Staff smoke: ${err?.stack||err}`)}
    }else console.log('[smoke] staff profile interaction skipped: startup smoke has no active career staff');
   }"""
if old_staff not in sm: raise SystemExit('Canonical Staff smoke block not found')
smoke.write_text(sm.replace(old_staff,new_staff,1),encoding='utf-8')

print('Deterministic Staff Market load order staged.')
