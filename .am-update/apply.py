from pathlib import Path
p=Path('tools/runtime-smoke.mjs')
s=p.read_text(encoding='utf-8')
old="if(process.env.AM_SMOKE_CHILD!=='1'){\n const child=spawn(process.execPath,[scriptPath],{"
new="if(process.env.AM_SMOKE_CHILD!=='1'){\n await import('./programme-economy-soak.mjs');\n const child=spawn(process.execPath,[scriptPath],{"
if old not in s: raise SystemExit('Missing runtime smoke parent anchor')
p.write_text(s.replace(old,new,1),encoding='utf-8')
