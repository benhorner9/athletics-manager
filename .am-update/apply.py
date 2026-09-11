from pathlib import Path

js_path = Path('scripts/selection-decision-v3.js')
html_path = Path('game.html')
js = js_path.read_text(encoding='utf-8')
html = html_path.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing expected {label} pattern')
    if text.count(old) != 1:
        raise SystemExit(f'Expected exactly one {label} pattern, found {text.count(old)}')
    return text.replace(old, new, 1)

js = replace_once(
    js,
    '.sdv3-dialog{border:0;padding:0;background:transparent;color:#eaf4fa;width:min(1180px,calc(100vw - 20px));max-width:none}',
    '.sdv3-dialog{border:0;padding:0;background:transparent;color:#eaf4fa;width:min(1180px,calc(100vw - 20px));height:min(900px,calc(100dvh - 18px));max-width:none;max-height:calc(100dvh - 18px);overflow:hidden}',
    'dialog viewport'
)

js = replace_once(
    js,
    '.sdv3-shell,.sdv3-confirm{background:#071824;border:1px solid rgba(117,166,196,.24);border-radius:14px;overflow:hidden}',
    '.sdv3-shell,.sdv3-confirm{background:#071824;border:1px solid rgba(117,166,196,.24);border-radius:14px;overflow:hidden}.sdv3-shell{height:100%;min-height:0;display:grid;grid-template-rows:auto auto minmax(0,1fr) auto}',
    'shell grid'
)

js = replace_once(
    js,
    '.sdv3-shell main{display:grid;grid-template-columns:230px minmax(0,1fr) 250px;min-height:520px}',
    '.sdv3-shell main{display:grid;grid-template-columns:230px minmax(0,1fr) 250px;min-height:0;overflow:hidden}',
    'main viewport'
)

js = replace_once(
    js,
    '.sdv3-events,.sdv3-summary{padding:12px;background:rgba(3,14,23,.48)}',
    '.sdv3-events,.sdv3-summary{padding:12px;background:rgba(3,14,23,.48)}.sdv3-events,.sdv3-choice,.sdv3-summary{min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch}',
    'column scrolling'
)

js = replace_once(
    js,
    '.sdv3-choice{padding:14px;overflow:auto;max-height:70vh}',
    '.sdv3-choice{padding:14px;min-height:0;overflow-y:auto}',
    'choice scrolling'
)

js = replace_once(
    js,
    '.sdv3-validation.bad{border-color:rgba(239,64,87,.28)!important}.sdv3-confirm{padding:18px;',
    '.sdv3-validation.bad{border-color:rgba(239,64,87,.28)!important}.sdv3-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-top:1px solid rgba(117,166,196,.14);background:#091923;min-height:58px}.sdv3-foot strong,.sdv3-foot span{display:block}.sdv3-foot strong{font-size:10px;color:#dcebf2}.sdv3-foot span{margin-top:2px;font-size:8px;color:#7898aa}.sdv3-foot .btn{min-width:150px;min-height:38px}.sdv3-confirm{padding:18px;',
    'persistent footer styles'
)

js = replace_once(
    js,
    '.sdv3-shell main{display:block}.sdv3-events{display:flex;overflow:auto;',
    '.sdv3-shell main{display:block;overflow-y:auto;-webkit-overflow-scrolling:touch}.sdv3-events{display:flex;overflow:auto;',
    'mobile main scrolling'
)

old_close = "</aside></main></div>`;bind()"
new_close = "</aside></main><footer class=\"sdv3-foot\"><div><strong>${readonly?'Decision complete':missing?`${missing} slot${missing===1?'':'s'} still undecided`:errs.length?`${errs.length} issue${errs.length===1?'':'s'} to resolve`:'All entry slots decided'}</strong><span>${readonly?'Selection is locked.':missing?'Finish every entry decision before submitting.':errs.length?'Resolve the selection issue before submitting.':'Ready for final review.'}</span></div><div>${readonly?'<button class=\"btn primary\" data-close>DONE</button>':`<button class=\"btn primary\" data-review ${missing||errs.length?'disabled':''}>REVIEW &amp; SUBMIT</button>`}</div></footer></div>`;bind()"
js = replace_once(js, old_close, new_close, 'persistent footer markup')

html = replace_once(
    html,
    'scripts/selection-decision-v3.js?v=20260910-selection3',
    'scripts/selection-decision-v3.js?v=20260911-selection-scroll1',
    'selection cache key'
)

js_path.write_text(js, encoding='utf-8')
html_path.write_text(html, encoding='utf-8')
