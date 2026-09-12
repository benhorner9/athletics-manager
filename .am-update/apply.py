from pathlib import Path
script=Path('.am-update/patch2.py').read_text(encoding='utf-8')
script=script.replace(r"['registerPerformance(a,d,row.perf,\'club\'','Club results",r"['registerPerformance(a,d,row.perf','Club results")
exec(compile(script,'.am-update/patch2.py','exec'))
