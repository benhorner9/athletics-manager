from pathlib import Path
import gzip, base64

root=Path('.')
payload=''.join((root/f'.am-update/nation{i}.b64').read_text().strip() for i in range(1,5))
(root/'scripts/nation-world-v1.js').write_bytes(gzip.decompress(base64.b64decode(payload)))

html=root/'game.html'
text=html.read_text()
css_anchor='<link rel="stylesheet" href="styles/game.css?v=20260908-architecture2">'
css_line='<link rel="stylesheet" href="styles/nation-world-v1.css?v=20260912-nations64-1">'
if css_line not in text:
    if css_anchor not in text: raise SystemExit('game.css anchor missing')
    text=text.replace(css_anchor,css_anchor+'\n'+css_line,1)
script_anchor='<script src="scripts/game.js?v=20260911-nationsort1"></script>'
script_line='<script src="scripts/nation-world-v1.js?v=20260912-nations64-1"></script>'
if script_line not in text:
    if script_anchor not in text: raise SystemExit('game.js anchor missing')
    text=text.replace(script_anchor,script_anchor+'\n'+script_line,1)
html.write_text(text)

reg=root/'tools/static-regression.mjs'
r=reg.read_text()
req=" 'scripts/game.js',\n"
add=" 'scripts/game.js',\n 'scripts/nation-world-v1.js',\n"
if " 'scripts/nation-world-v1.js'," not in r:
    if req not in r: raise SystemExit('requiredScripts game anchor missing')
    r=r.replace(req,add,1)
order="before('scripts/game.js','scripts/ui-platform-v1.js');"
order_new="before('scripts/game.js','scripts/nation-world-v1.js');\nbefore('scripts/nation-world-v1.js','scripts/ui-platform-v1.js');"
if "before('scripts/game.js','scripts/nation-world-v1.js');" not in r:
    if order not in r: raise SystemExit('script order anchor missing')
    r=r.replace(order,order_new,1)
contract='const sourceContracts={\n'
contract_new="const sourceContracts={\n 'scripts/nation-world-v1.js':[\n  ['EXPECTED_NATIONS=64','64-nation world count contract is missing'],\n  ['function addWorld(list)','64-nation athlete seeding is missing'],\n  ['function ensure(st)','64-nation existing-save migration is missing'],\n  ['data-nation-search','64-nation picker search control is missing'],\n  ['data-nation-region','64-nation picker region filter is missing'],\n  ['window.AMNationWorld','64-nation world public service is missing']\n ],\n"
if "'scripts/nation-world-v1.js':[" not in r:
    if contract not in r: raise SystemExit('sourceContracts anchor missing')
    r=r.replace(contract,contract_new,1)
reg.write_text(r)
