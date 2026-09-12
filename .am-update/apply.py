from pathlib import Path
script=Path('.am-update/patch2.py').read_text(encoding='utf-8')
script=script.replace(r"['registerPerformance(a,d,row.perf,\'club\'','Club results",r"['registerPerformance(a,d,row.perf','Club results")
exec(compile(script,'.am-update/patch2.py','exec'))
p=Path('scripts/club-athletics-v1.js')
text=p.read_text(encoding='utf-8')
old="view('clubs')}}}\n }\n}\nconst legacyDrawCalendar"
new="view('clubs')}}}\n}\nconst legacyDrawCalendar"
if old not in text:
    raise SystemExit('Club Athletics calendar brace anchor not found')
p.write_text(text.replace(old,new,1),encoding='utf-8')
