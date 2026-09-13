from pathlib import Path

path = Path('game.html')
html = path.read_text(encoding='utf-8')
old = 'scripts/alpha-menu-gate.js?v=20260910-alpha16'
new = 'scripts/alpha-menu-gate.js?v=20260913-devalpha1'
if old not in html:
    raise SystemExit('Expected alpha gate asset tag not found; refusing blind edit.')
path.write_text(html.replace(old, new, 1), encoding='utf-8')
print('Dev alpha auto-access cache bust applied.')
