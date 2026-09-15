from pathlib import Path

path = Path('game.html')
text = path.read_text(encoding='utf-8')
needle = '<script src="scripts/persistence-performance-v1.js?v=20260914-persistence1"></script>'
insert = '<script src="scripts/annual-career-refresh-v1.js?v=20260915-annualrefresh1"></script>\n' + needle
if 'scripts/annual-career-refresh-v1.js' not in text:
    if needle not in text:
        raise SystemExit('Annual refresh insertion point not found in game.html')
    text = text.replace(needle, insert, 1)
    path.write_text(text, encoding='utf-8')
