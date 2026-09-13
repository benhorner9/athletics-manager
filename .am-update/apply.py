from pathlib import Path

path = Path('scripts/dev/dev-build-status-v1.js')
text = path.read_text(encoding='utf-8')
anchor = "if(!isDev)return;\n\nconst state={boot:null,server:null,history:[],status:'loading'};"
insert = """if(!isDev)return;\n\nfunction forceDevAlphaAccess(){\n try{localStorage.setItem('athletics_manager_alpha_menu_access_v2','16')}catch(_){}\n const menu=document.querySelector('.menu-side'),form=document.getElementById('alphaAccessForm');\n if(menu){menu.classList.remove('alpha-locked');menu.classList.add('alpha-unlocked');menu.dataset.devAutoAccess='true'}\n if(form){form.hidden=true;form.setAttribute('aria-hidden','true')}\n}\nforceDevAlphaAccess();\n\nconst state={boot:null,server:null,history:[],status:'loading'};"""
if anchor not in text:
    raise SystemExit('Expected dev build-status anchor not found; refusing blind edit.')
path.write_text(text.replace(anchor, insert, 1), encoding='utf-8')
print('Dev runtime alpha bypass added.')
