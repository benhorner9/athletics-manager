from pathlib import Path
p=Path('scripts/programme-economy-v2.js')
text=p.read_text(encoding='utf-8')
old="function staffRoles(){return Object.keys(typeof STAFF_DEF!=='undefined'?STAFF_DEF:ATTR)}\nfunction coachAge(c){"
new="function staffRoles(){return Object.keys(typeof STAFF_DEF!=='undefined'?STAFF_DEF:ATTR)}\nfunction roleName(r){const d=typeof STAFF_DEF!=='undefined'?STAFF_DEF[r]:null;return d?.name||({sprint:'Sprint Coach',jumps:'Jumps Coach',throws:'Throws Coach',physio:'Head Physio',science:'Sports Scientist',scout:'Lead Scout'}[r]||String(r||'Staff'))}\nfunction coachAge(c){"
if old not in text: raise SystemExit('staffRoles anchor not found')
p.write_text(text.replace(old,new,1),encoding='utf-8')
print('Programme Economy Staff role labels are now locally authoritative.')
