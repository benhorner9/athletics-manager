from pathlib import Path

css_path = Path('styles/ui-unification-v1.css')
html_path = Path('game.html')
soak_path = Path('tools/ui-unification-soak.mjs')

css = css_path.read_text(encoding='utf-8')
marker = '/* Inbox column composition follow-up — keep message list visually separate from reader. */'
block = r'''

/* Inbox column composition follow-up — keep message list visually separate from reader. */
@media(min-width:701px){
 .am-inbox-v3-workspace{grid-template-columns:minmax(360px,420px) minmax(0,1fr)}
 .am-inbox-v3-sidebar{position:relative;z-index:1;overflow:hidden}
 .am-inbox-v3-reader{position:relative;z-index:2;min-width:0;box-shadow:-1px 0 0 var(--am-ui-line)}
 .am-inbox-v3-row{width:100%;max-width:100%;grid-template-columns:40px minmax(0,1fr) 28px;overflow:hidden}
 .am-inbox-v3-row>*{min-width:0}
 .am-inbox-v3-copy,.am-inbox-v3-sender{min-width:0;max-width:100%;overflow:hidden}
 .am-inbox-v3-copy>strong{display:block;max-width:100%;font-size:10px!important;line-height:1.25;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .am-inbox-v3-preview{display:block;max-width:100%;font-size:8px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .am-inbox-v3-week{width:28px;max-width:28px;text-align:right;overflow:hidden}
}
@media(min-width:701px) and (max-width:1100px){
 .am-inbox-v3-workspace{grid-template-columns:minmax(330px,38%) minmax(0,1fr)}
 .am-inbox-v3-copy>strong{font-size:9.5px!important}
}
'''
if marker not in css:
    css = css.rstrip() + block + '\n'
css_path.write_text(css, encoding='utf-8')

html = html_path.read_text(encoding='utf-8')
old = 'styles/ui-unification-v1.css?v=20260913-profilebaseline2'
new = 'styles/ui-unification-v1.css?v=20260913-profilebaseline3'
if old not in html and new not in html:
    raise SystemExit('Expected UI unification cache token not found')
html = html.replace(old, new)
html_path.write_text(html, encoding='utf-8')

soak = soak_path.read_text(encoding='utf-8')
soak = soak.replace('styles/ui-unification-v1.css?v=20260913-profilebaseline2', 'styles/ui-unification-v1.css?v=20260913-profilebaseline3')
assertion = "need(css.includes('grid-template-columns:minmax(360px,420px) minmax(0,1fr)'), 'Inbox desktop list/reader column boundary missing');\nneed(css.includes('font-size:10px!important;line-height:1.25'), 'Inbox compact subject treatment missing');\nneed(css.includes('.am-inbox-v3-reader{position:relative;z-index:2'), 'Inbox reader stacking boundary missing');\n"
anchor = "console.log('[ui-unification] My Profile visual baseline contract passed.');"
if assertion.strip() not in soak:
    soak = soak.replace(anchor, assertion + anchor)
soak_path.write_text(soak, encoding='utf-8')
