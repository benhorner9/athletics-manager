from pathlib import Path

p=Path('scripts/first-time-experience-v2.js')
text=p.read_text(encoding='utf-8')
old="const VERSION='2.0.3';"
new="const VERSION='2.0.2';"
if text.count(old)!=1:
    raise SystemExit(f'Expected exactly one FTX 2.0.3 version marker, found {text.count(old)}')
p.write_text(text.replace(old,new,1),encoding='utf-8')
