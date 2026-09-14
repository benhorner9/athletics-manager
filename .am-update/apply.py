from pathlib import Path

css = Path('styles/ui-unification-v1.css')
text = css.read_text(encoding='utf-8')
marker = '/* Sidebar brand — one game mark only */'
rule = '''\n\n/* Sidebar brand — one game mark only */\n.rail-brand.rail-brand-single .rail-brand-mark{background:#edf5f8!important;color:#07131d!important}\n.rail-brand.rail-brand-single .rail-brand-mark::before,\n.rail-brand.rail-brand-single .rail-brand-mark::after{content:none!important;display:none!important}\n'''
if marker not in text:
    text += rule
css.write_text(text, encoding='utf-8')

html = Path('game.html')
h = html.read_text(encoding='utf-8')
old = 'styles/ui-unification-v1.css?v=20260913-financebar1'
new = 'styles/ui-unification-v1.css?v=20260914-sidebarbrand1'
if old not in h and new not in h:
    raise SystemExit('ui-unification cache-bust token not found')
h = h.replace(old, new)
html.write_text(h, encoding='utf-8')

reg = Path('tools/static-regression.mjs')
r = reg.read_text(encoding='utf-8')
contract = '''\nconst shellBrand=read('styles/ui-unification-v1.css');\nfor(const token of ['Sidebar brand — one game mark only','background:#edf5f8!important','rail-brand-mark::after{content:none!important;display:none!important}'])if(!shellBrand.includes(token))fail(`Sidebar single-logo contract missing: ${token}`);\nif(!html.includes('styles/ui-unification-v1.css?v=20260914-sidebarbrand1'))fail('Sidebar single-logo cache-bust is missing from game.html.');\n'''
if 'Sidebar single-logo contract missing' not in r:
    r += contract
reg.write_text(r, encoding='utf-8')
