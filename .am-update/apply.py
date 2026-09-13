from pathlib import Path
p=Path('tools/runtime-smoke.mjs')
s=p.read_text(encoding='utf-8')
needle=" if(process.env.AM_AUDIT_SOAK==='1')await (await import('./dev-career-soak.mjs')).run(w);"
insert=" await (await import('./release-readiness-soak.mjs')).run(w);\n"
if insert.strip() in s:
    raise SystemExit('release readiness smoke already integrated')
if needle not in s:
    raise SystemExit('runtime smoke audit hook not found')
p.write_text(s.replace(needle,insert+needle,1),encoding='utf-8')
