from pathlib import Path

root = Path('.')
selection = root / 'scripts/selection-decision-v3.js'
html = root / 'game.html'
static = root / 'tools/static-regression.mjs'

text = selection.read_text()
old = """</span></div>${readonly?'<button class=\"btn primary\" data-close>DONE</button>':`<button class=\"btn primary\" data-review ${missing||errs.length?'disabled':''}>REVIEW & SUBMIT</button>`}</aside></main><footer"""
new = """</span></div></aside></main><footer"""
if old not in text:
    raise SystemExit('Expected duplicate summary action block was not found')
text = text.replace(old, new, 1)
selection.write_text(text)

html_text = html.read_text()
old_cache = 'scripts/selection-decision-v3.js?v=20260911-selection-submit2'
new_cache = 'scripts/selection-decision-v3.js?v=20260911-selection-submit3'
if old_cache not in html_text:
    raise SystemExit('Expected selection cache key was not found')
html.write_text(html_text.replace(old_cache, new_cache, 1))

static_text = static.read_text()
needle = """for(const [file,contracts] of Object.entries(sourceContracts)){
 const full=path.join(root,file);
 if(!fs.existsSync(full)){fail(`Source contract file missing: ${file}`);continue}
 const text=read(file);
 for(const [token,message] of contracts)if(!text.includes(token))fail(`${message} (${file})`);
}

note(`${routes.length} route containers present`);"""
replacement = """for(const [file,contracts] of Object.entries(sourceContracts)){
 const full=path.join(root,file);
 if(!fs.existsSync(full)){fail(`Source contract file missing: ${file}`);continue}
 const text=read(file);
 for(const [token,message] of contracts)if(!text.includes(token))fail(`${message} (${file})`);
}

const selectionDecisionSource=read('scripts/selection-decision-v3.js');
const reviewActionTokens=(selectionDecisionSource.match(/data-review/g)||[]).length;
if(reviewActionTokens!==2)fail(`Selection V3 must contain one rendered Review & Submit action plus one binding selector; found ${reviewActionTokens} data-review tokens`);

note(`${routes.length} route containers present`);"""
if needle not in static_text:
    raise SystemExit('Static regression insertion point was not found')
static.write_text(static_text.replace(needle, replacement, 1))
