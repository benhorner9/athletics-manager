from pathlib import Path

game=Path('game.html')
text=game.read_text(encoding='utf-8')
link='<link rel="stylesheet" href="styles/ui-unification-v1.css?v=20260913-profilebaseline1">'
if link not in text:
    marker='<link rel="stylesheet" href="styles/first-time-experience-v2.css?v=20260911-ftx2">\n</head>'
    if marker not in text:
        raise SystemExit('UI unification: game.html stylesheet marker not found')
    text=text.replace(marker,marker.replace('\n</head>',f'\n{link}\n</head>'),1)
    game.write_text(text,encoding='utf-8')

runtime=Path('tools/runtime-smoke.mjs')
r=runtime.read_text(encoding='utf-8')
imp=" await import('./ui-unification-soak.mjs');"
if imp not in r:
    marker=" await import('./programme-management-integration-soak.mjs');"
    if marker not in r:
        raise SystemExit('UI unification: runtime smoke import marker not found')
    r=r.replace(marker,marker+'\n'+imp,1)
    runtime.write_text(r,encoding='utf-8')
