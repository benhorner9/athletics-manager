from pathlib import Path
p=Path('scripts/relay-v1.js')
text=p.read_text(encoding='utf-8')
old="if(ds.length&&ds.every(x=>Array.isArray(e.results?.[x]))&&!e.completed){safe(()=>finaliseEvent(e,false),null);return}activeEventDisc=null;competitionMode='overview';drawCompetition()"
new="if(ds.length&&ds.every(x=>Array.isArray(e.results?.[x]))&&!e.completed){activeEventDisc=null;competitionMode='overview';safe(()=>finaliseEvent(e,false),null);return}activeEventDisc=null;competitionMode='overview';drawCompetition()"
if old not in text: raise SystemExit('Relay completion flow contract missing')
p.write_text(text.replace(old,new,1),encoding='utf-8')
print('Relay completion now returns to the programme in one action.')
