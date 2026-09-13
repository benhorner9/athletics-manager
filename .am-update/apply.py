from pathlib import Path
p=Path('game.html')
text=p.read_text(encoding='utf-8')
old_css='styles/relay-v1.css?v=20260913-relay1'
old_js='scripts/relay-v1.js?v=20260913-relay1'
if old_css not in text or old_js not in text: raise SystemExit('Relay V1 asset version contract missing')
text=text.replace(old_css,'styles/relay-v1.css?v=20260913-relay3',1).replace(old_js,'scripts/relay-v1.js?v=20260913-relay3',1)
p.write_text(text,encoding='utf-8')
print('Relay V1 asset cache version bumped to relay3.')
