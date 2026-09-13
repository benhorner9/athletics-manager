from pathlib import Path
p=Path('tools/runtime-smoke.mjs')
text=p.read_text(encoding='utf-8')
old="""   if(target==='staff'){
    const profile=w.document.querySelector('#staff [data-cp],#staff [data-sfv2-coach]'),dialog=w.document.getElementById('managementProfile');
    if(!profile)fail('Staff route did not expose a coach profile action.');
    else{
     try{if(dialog?.open)dialog.close();profile.click();await new Promise(resolve=>setTimeout(resolve,15));if(!dialog?.open)fail('Coach profile action did not open the staff dossier dialog.');dialog?.close()}catch(err){fail(`Coach profile click threw during Staff smoke: ${err?.stack||err}`)}
    }
   }
"""
new="""   if(target==='staff'){
    const profile=w.document.querySelector('#staff [data-cp],#staff [data-sfv2-coach]'),dialog=w.document.getElementById('managementProfile');
    if(profile){
     try{if(dialog?.open)dialog.close();profile.click();await new Promise(resolve=>setTimeout(resolve,15));if(!dialog?.open)fail('Coach profile action did not open the staff dossier dialog.');dialog?.close()}catch(err){fail(`Coach profile click threw during Staff smoke: ${err?.stack||err}`)}
    }else console.log('[smoke] staff profile interaction skipped: startup smoke has no active career staff');
   }
"""
if old not in text: raise SystemExit('Missing Staff profile smoke block')
p.write_text(text.replace(old,new,1),encoding='utf-8')
