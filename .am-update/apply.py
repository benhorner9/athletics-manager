from pathlib import Path

root=Path('.')
html=root/'game.html'
static=root/'tools/static-regression.mjs'

html_text=html.read_text()
needle='<script src="scripts/first-time-experience-v2.js?v=20260911-ftx26-training-progression"></script>\n<script src="scripts/language-system-v1.js?v=20260911-language1"></script>'
replacement='<script src="scripts/first-time-experience-v2.js?v=20260911-ftx26-training-progression"></script>\n<script src="scripts/keyboard-shortcuts-v1.js?v=20260911-spaceadvance1"></script>\n<script src="scripts/language-system-v1.js?v=20260911-language1"></script>'
if needle not in html_text:
    raise SystemExit('Keyboard shortcut insertion point not found')
html.write_text(html_text.replace(needle,replacement,1))

text=static.read_text()
required_needle=" 'scripts/first-time-experience-v2.js',\n 'scripts/release-baseline.js',"
required_replacement=" 'scripts/first-time-experience-v2.js',\n 'scripts/keyboard-shortcuts-v1.js',\n 'scripts/release-baseline.js',"
if required_needle not in text:
    raise SystemExit('Required script insertion point not found')
text=text.replace(required_needle,required_replacement,1)

contract_needle=""" 'scripts/first-time-experience-v2.js':[
  ['window.AMFirstTimeExperienceV2','First-Time Experience V2 public service is missing'],"""
contract_replacement=""" 'scripts/keyboard-shortcuts-v1.js':[
  ["event.code!=='Space'",'Space shortcut key contract is missing'],
  ["document.getElementById('advanceTop')",'Space shortcut must target the canonical Advance Week button'],
  ["document.querySelector('dialog[open]')",'Space shortcut must not fire through open dialogs'],
  ['isInteractiveTarget(event.target)','Space shortcut must not fire while typing or using interactive controls'],
  ['button.click()','Space shortcut must use the canonical Advance Week click path']
 ],
 'scripts/first-time-experience-v2.js':[
  ['window.AMFirstTimeExperienceV2','First-Time Experience V2 public service is missing'],"""
if contract_needle not in text:
    raise SystemExit('Keyboard shortcut source contract insertion point not found')
static.write_text(text.replace(contract_needle,contract_replacement,1))
