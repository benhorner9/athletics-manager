from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'scripts/selection-decision-v3.js',
    "d.querySelector('[data-review]')?.addEventListener('click',()=>{if(valid(ctx).length||!allDecided(ctx))return;confirming='submit';render()})}",
    "d.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>{if(valid(ctx).length||!allDecided(ctx))return;confirming='submit';render()}))}",
    'Review & Submit binding'
)

replace_once(
    'tools/static-regression.mjs',
    " 'scripts/inbox-decision-core-v1.js':[\n  ['getProgressionBlockers:blockers','Inbox decision core must remain the progression-blocker authority'],\n  ['openAction','Inbox decision core action router is missing']\n ],",
    " 'scripts/inbox-decision-core-v1.js':[\n  ['getProgressionBlockers:blockers','Inbox decision core must remain the progression-blocker authority'],\n  ['openAction','Inbox decision core action router is missing']\n ],\n 'scripts/selection-decision-v3.js':[\n  [\"querySelectorAll('[data-review]')\",'Every visible Review & Submit control must receive the selection review handler']\n ],",
    'Selection submit source contract'
)

replace_once(
    'game.html',
    'scripts/selection-decision-v3.js?v=20260911-selection-scroll1',
    'scripts/selection-decision-v3.js?v=20260911-selection-submit2',
    'Selection decision cache key'
)

print('Applied Review & Submit binding fix and regression contract.')
