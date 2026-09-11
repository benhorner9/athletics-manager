from pathlib import Path
p=Path('tools/runtime-smoke.mjs')
text=p.read_text(encoding='utf-8')
old="if(!ftx||ftx.version!=='2.0.0'||ftx.stateVersion!==2)fail('First-Time Experience V2 snapshot is invalid.');"
new="if(!ftx||ftx.version!=='2.0.1'||ftx.stateVersion!==2)fail('First-Time Experience V2 snapshot is invalid.');"
if old not in text:
    raise SystemExit('FTUE smoke version marker not found')
p.write_text(text.replace(old,new,1),encoding='utf-8')
print('Updated runtime smoke contract to FTUE V2.0.1.')
