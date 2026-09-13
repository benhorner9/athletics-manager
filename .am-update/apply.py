from pathlib import Path
p=Path('tools/runtime-smoke.mjs')
s=p.read_text(encoding='utf-8')
old="  console.log('[smoke] route render sweep finished');\n if(process.env.AM_AUDIT_SOAK==='1')await (await import('./dev-career-soak.mjs')).run(w);"
new="  console.log('[smoke] route render sweep finished');\n await (await import('./release-readiness-soak.mjs')).run(w);\n if(process.env.AM_AUDIT_SOAK==='1')await (await import('./dev-career-soak.mjs')).run(w);"
if old not in s:
    raise SystemExit('runtime smoke integration target not found')
p.write_text(s.replace(old,new,1),encoding='utf-8')
