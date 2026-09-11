from pathlib import Path

css_path = Path('styles/squad-athlete-v2.css')
html_path = Path('game.html')

css = css_path.read_text(encoding='utf-8')
old_css = '.sav2{display:grid;gap:12px;min-height:calc(100vh - 112px)}'
new_css = '.sav2{display:grid;grid-template-rows:auto auto auto minmax(0,1fr);gap:12px;min-height:calc(100vh - 112px)}'
if old_css not in css:
    raise SystemExit('Expected .sav2 layout rule was not found; refusing to apply an unsafe patch.')
css_path.write_text(css.replace(old_css, new_css, 1), encoding='utf-8')

html = html_path.read_text(encoding='utf-8')
old_ref = 'styles/squad-athlete-v2.css?v=20260910-squadathlete2'
new_ref = 'styles/squad-athlete-v2.css?v=20260911-squadlayout1'
if old_ref not in html:
    raise SystemExit('Expected squad stylesheet reference was not found; refusing to apply an unsafe patch.')
html_path.write_text(html.replace(old_ref, new_ref, 1), encoding='utf-8')

print('Applied Squad/National Pool tab layout consistency fix.')
