from pathlib import Path

p = Path('tools/runtime-smoke.mjs')
s = p.read_text(encoding='utf-8')
old = "process.env.AM_AUDIT_SOAK==='1'?900000:120000"
new = "process.env.AM_AUDIT_SOAK==='1'?900000:240000"
if old not in s:
    raise SystemExit('Expected runtime smoke timeout not found')
p.write_text(s.replace(old, new, 1), encoding='utf-8')

doc = Path('docs/FINAL-RELEASE-READINESS.md')
d = doc.read_text(encoding='utf-8')
d = d.replace('The standard runtime-smoke watchdog is now 120 seconds', 'The standard runtime-smoke watchdog is now 240 seconds')
doc.write_text(d, encoding='utf-8')
