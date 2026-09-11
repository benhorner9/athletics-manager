from pathlib import Path

root = Path('.')

summit = root / 'scripts/summit-event-unified.js'
text = summit.read_text()
old = "const root=$('competition');if(!root)return;$('skipAllNoEntry')?.remove();root.classList.add('summit-modern-event');"
new = "const root=$('competition');if(!root)return;root.dataset.amUiScreen='competition-v2';$('skipAllNoEntry')?.remove();root.classList.add('summit-modern-event');"
if old not in text:
    raise SystemExit('Summit overview marker insertion point not found')
summit.write_text(text.replace(old, new, 1))

html = root / 'game.html'
html_text = html.read_text()
old_cache = 'scripts/summit-event-unified.js?v=20260911-summitroute1'
new_cache = 'scripts/summit-event-unified.js?v=20260911-summitroute2'
if old_cache not in html_text:
    raise SystemExit('Summit cache key not found')
html.write_text(html_text.replace(old_cache, new_cache, 1))

static = root / 'tools/static-regression.mjs'
static_text = static.read_text()
old_contract = "  ['function reconcileMeeting(m)','Summit meetings with every result must reconcile to completed state'],\n  [\"summitLiveMeetingNumber=null;saveNow();view('home')\",'Returning Home from Summit must clear the remembered Summit route']"
new_contract = "  ['function reconcileMeeting(m)','Summit meetings with every result must reconcile to completed state'],\n  [\"root.dataset.amUiScreen='competition-v2'\",'Summit overview/results must identify themselves as the production Competition screen'],\n  [\"summitLiveMeetingNumber=null;saveNow();view('home')\",'Returning Home from Summit must clear the remembered Summit route']"
if old_contract not in static_text:
    raise SystemExit('Summit regression contract insertion point not found')
static.write_text(static_text.replace(old_contract, new_contract, 1))
