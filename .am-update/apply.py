from pathlib import Path

def replace(path, old, new):
    p=Path(path); s=p.read_text()
    if old not in s: raise SystemExit(f'pattern not found in {path}')
    p.write_text(s.replace(old,new,1))

replace('styles/ui-unification-v1.css',
'''/* Finance has the most sections, so keep its tab rail compact instead of oversized. */
.pe-tabs{padding:3px!important;border-radius:10px!important;gap:3px!important}
.pe-tabs button{min-height:32px!important;padding:0 9px!important;border-radius:7px!important;font-size:9px!important;letter-spacing:.045em!important}''',
'''/* Finance uses one fixed navigation footprint across every section. Income is the sizing baseline. */
.pe-tabs{display:grid!important;grid-template-columns:repeat(8,minmax(68px,1fr))!important;width:min(100%,580px)!important;min-height:38px!important;padding:3px!important;border-radius:10px!important;gap:3px!important;overflow-x:auto!important;align-self:start!important}
.pe-tabs button{width:100%!important;min-width:68px!important;min-height:32px!important;padding:0 8px!important;border-radius:7px!important;font-size:9px!important;letter-spacing:.045em!important}''')

replace('tools/ui-unification-soak.mjs',
"need(css.includes('.pe-tabs button{min-height:32px!important'),'Finance compact tab correction missing');",
"need(css.includes('grid-template-columns:repeat(8,minmax(68px,1fr))!important;width:min(100%,580px)!important'),'Finance stable tab-rail sizing missing');\nneed(css.includes('.pe-tabs button{width:100%!important;min-width:68px!important;min-height:32px!important'),'Finance fixed tab sizing missing');")

replace('game.html','styles/ui-unification-v1.css?v=20260913-ipadoverscroll1','styles/ui-unification-v1.css?v=20260913-financebar1')
replace('tools/ui-unification-soak.mjs','styles/ui-unification-v1.css?v=20260913-ipadoverscroll1','styles/ui-unification-v1.css?v=20260913-financebar1')
