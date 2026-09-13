from pathlib import Path


def replace(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Missing expected text in {path}: {old[:120]}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Programme Economy: give the Staff screen one explicit profile-opening authority.
p=Path('scripts/programme-economy-v2.js')
text=p.read_text(encoding='utf-8')
marker="function marketCard(c){"
helper="""function openCoachDossier(id){const key=String(id||'');if(!key)return false;const api=window.__athleticsStaffFinanceV2;if(api&&typeof api.openCoachProfile==='function'){api.openCoachProfile(key);return true}if(typeof window.openCoachProfile==='function'){window.openCoachProfile(key);return true}return false}\n"""
if helper not in text:
    if marker not in text: raise SystemExit('Missing marketCard insertion point')
    text=text.replace(marker,helper+marker,1)
old_name="<h3>${esc(c.name)}</h3><span>${esc(c.economyProfile.style)}</span>"
new_name="<h3><button type=\"button\" class=\"athlete-link\" data-cp=\"${esc(c.id)}\">${esc(c.name)}</button></h3><span>${esc(c.economyProfile.style)}</span>"
if old_name not in text: raise SystemExit('Missing coach name markup')
text=text.replace(old_name,new_name,1)
old_button='<button class="btn ghost" data-cp="${c.id}">PROFILE</button>'
new_button='<button type="button" class="btn ghost" data-cp="${esc(c.id)}">PROFILE</button>'
if old_button not in text: raise SystemExit('Missing coach profile button')
text=text.replace(old_button,new_button,1)
old_bind="root.querySelectorAll('[data-cp]').forEach(b=>b.onclick=()=>safe(()=>openCoachProfile(b.dataset.cp),null));"
new_bind="root.querySelectorAll('[data-cp]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();if(!openCoachDossier(b.dataset.cp))toastNow('Coach profile unavailable')});"
if old_bind not in text: raise SystemExit('Missing coach profile binding')
text=text.replace(old_bind,new_bind,1)
p.write_text(text,encoding='utf-8')

# Browser runtime: actually click a coach dossier from Staff and require the dialog to open.
p=Path('tools/runtime-smoke.mjs')
text=p.read_text(encoding='utf-8')
old="""   const on=[...w.document.querySelectorAll('.view.on')];
   if(on.length!==1)fail(`Route ${target} left ${on.length} active views.`);
  }
"""
new="""   const on=[...w.document.querySelectorAll('.view.on')];
   if(on.length!==1)fail(`Route ${target} left ${on.length} active views.`);
   if(target==='staff'){
    const profile=w.document.querySelector('#staff [data-cp],#staff [data-sfv2-coach]'),dialog=w.document.getElementById('managementProfile');
    if(!profile)fail('Staff route did not expose a coach profile action.');
    else{
     try{if(dialog?.open)dialog.close();profile.click();await new Promise(resolve=>setTimeout(resolve,15));if(!dialog?.open)fail('Coach profile action did not open the staff dossier dialog.');dialog?.close()}catch(err){fail(`Coach profile click threw during Staff smoke: ${err?.stack||err}`)}
    }
   }
  }
"""
if old not in text: raise SystemExit('Missing route smoke insertion point')
text=text.replace(old,new,1)
p.write_text(text,encoding='utf-8')

# Static V4 integration contract keeps the explicit profile authority in place.
p=Path('tools/programme-management-integration-soak.mjs')
text=p.read_text(encoding='utf-8')
needle="need(economy.includes('function handleNationChange(')&&career.includes('handleNationChange?.(ctx.before.nation)'),'national-job economy handover missing');\n"
addition="need(economy.includes('function openCoachDossier(')&&economy.includes('__athleticsStaffFinanceV2')&&economy.includes(\"if(!openCoachDossier(b.dataset.cp))\"),'Staff profile actions must use the explicit Staff V2 profile authority');\n"
if addition not in text:
    if needle not in text: raise SystemExit('Missing integration soak insertion point')
    text=text.replace(needle,needle+addition,1)
p.write_text(text,encoding='utf-8')

# Cache-bust the dynamic Programme Economy runtime and cutover loader for iPad/Safari.
for path in ['scripts/ui-cutover-v1.js','game.html']:
    p=Path(path); t=p.read_text(encoding='utf-8'); t=t.replace('2026.09.13-staffrecovery1','2026.09.13-staffprofile1').replace('20260913-staffrecovery1','20260913-staffprofile1'); p.write_text(t,encoding='utf-8')
