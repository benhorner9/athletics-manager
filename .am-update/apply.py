from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly 1 match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'scripts/game.js',
    "Object.entries(NATIONS).map(([k,p])=>`<button class=\"nation-card\"",
    "Object.entries(NATIONS).sort((a,b)=>String(a[1]?.name||a[0]).localeCompare(String(b[1]?.name||b[0]),'en-GB',{sensitivity:'base'})).map(([k,p])=>`<button class=\"nation-card\""
)

replace_once(
    'game.html',
    'scripts/game.js?v=20260908-architecture2',
    'scripts/game.js?v=20260911-nationsort1'
)

print('Nation picker now sorts by displayed nation name.')
