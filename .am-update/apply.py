from pathlib import Path
p=Path('tools/runtime-smoke.mjs')
text=p.read_text(encoding='utf-8')
old="const audit=w.AMAthleteAttributes.audit(w.s?.athletes||[]);"
new="const auditState=typeof w.fresh==='function'?w.fresh('GREAT BRITAIN'):null;\n   const audit=w.AMAthleteAttributes.audit(auditState?.athletes||w.s?.athletes||[]);"
if old not in text: raise SystemExit('calibration audit fixture anchor not found')
p.write_text(text.replace(old,new,1),encoding='utf-8')
