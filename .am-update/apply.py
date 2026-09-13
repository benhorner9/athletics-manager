from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected text not found in {path}: {old[:120]!r}')
    if text.count(old) != 1:
        raise SystemExit(f'Expected exactly one match in {path}, found {text.count(old)}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'styles/ui-unification-v1.css',
    "html,body{background:radial-gradient(circle at 14% -8%,color-mix(in srgb,var(--am-ui-accent) 14%,transparent),transparent 34%),linear-gradient(180deg,#071522 0,#06101b 100%);color:var(--am-ui-text)}\n.main{background:radial-gradient(circle at 88% -12%,color-mix(in srgb,var(--am-ui-accent) 7%,transparent),transparent 30%)}",
    "html,body{background:radial-gradient(circle at 14% -8%,color-mix(in srgb,var(--am-ui-accent) 14%,transparent),transparent 34%),linear-gradient(180deg,#071522 0,#06101b 100%);color:var(--am-ui-text)}\nhtml{background-color:#06101b!important;overscroll-behavior-y:none}\nbody{background-color:#06101b;overscroll-behavior-y:none;min-height:100dvh}\n.main{min-height:100dvh;background:radial-gradient(circle at 88% -12%,color-mix(in srgb,var(--am-ui-accent) 7%,transparent),transparent 30%)}"
)

replace_once(
    'game.html',
    'styles/ui-unification-v1.css?v=20260913-profilebaseline3',
    'styles/ui-unification-v1.css?v=20260913-ipadoverscroll1'
)

replace_once(
    'tools/ui-unification-soak.mjs',
    "need(html.includes('styles/ui-unification-v1.css?v=20260913-profilebaseline3'),'unified UI stylesheet is not loaded');",
    "need(html.includes('styles/ui-unification-v1.css?v=20260913-ipadoverscroll1'),'unified UI stylesheet is not loaded');"
)

replace_once(
    'tools/ui-unification-soak.mjs',
    "need(css.includes('.am-inbox-v3-reader{position:relative;z-index:2'), 'Inbox reader stacking boundary missing');\nconsole.log('[ui-unification] My Profile visual baseline contract passed.');",
    "need(css.includes('.am-inbox-v3-reader{position:relative;z-index:2'), 'Inbox reader stacking boundary missing');\nneed(css.includes('html{background-color:#06101b!important;overscroll-behavior-y:none}'),'iPad root overscroll containment missing');\nneed(css.includes('body{background-color:#06101b;overscroll-behavior-y:none;min-height:100dvh}'),'iPad body overscroll containment missing');\nconsole.log('[ui-unification] My Profile visual baseline contract passed.');"
)
