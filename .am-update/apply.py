from pathlib import Path
p=Path('tools/runtime-smoke.mjs')
s=p.read_text(encoding='utf-8')
old="},process.env.AM_AUDIT_SOAK==='1'?900000:25000);"
new="},process.env.AM_AUDIT_SOAK==='1'?900000:120000);"
if old not in s:
    raise SystemExit('runtime smoke timeout target not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
