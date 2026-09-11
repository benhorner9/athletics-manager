from pathlib import Path


def replace(path, old, new, count=1):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if text.count(old) < count:
        raise SystemExit(f'{path}: missing expected anchor: {old!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')

# Production cutover must recognise the route root itself as a valid production marker.
replace(
    'scripts/ui-cutover-v1.js',
    "const BUILD='2026.09.11-cutover01';",
    "const BUILD='2026.09.11-cutover02';"
)
replace(
    'scripts/ui-cutover-v1.js',
    "try{return !!root.querySelector(def.selector)}catch(_){return false}",
    "try{return !!(root.matches?.(def.selector)||root.querySelector(def.selector))}catch(_){return false}"
)

# Force Safari/iPad to request the corrected watchdog runtime instead of reusing cutover3.
replace(
    'game.html',
    'scripts/ui-cutover-v1.js?v=20260911-cutover3',
    'scripts/ui-cutover-v1.js?v=20260911-cutover4'
)

# Keep this exact failure mode under regression protection.
replace(
    'tools/static-regression.mjs',
    "['errorBoundary','Production cutover recovery boundary is missing'],\n  [\"generation:GENERATION\",'Production cutover generation contract is missing']",
    "['errorBoundary','Production cutover recovery boundary is missing'],\n  ['root.matches?.(def.selector)','Production cutover must recognise route-root production markers'],\n  [\"generation:GENERATION\",'Production cutover generation contract is missing']"
)
