from pathlib import Path

html = Path('game.html')
text = html.read_text(encoding='utf-8')
old = 'scripts/scouting-v2-bootstrap.js?v=20260911-scouting2recovery1'
new = 'scripts/scouting-v2-bootstrap.js?v=20260913-scouting2-weekbridge1'
if old not in text:
    raise SystemExit('Expected Scouting V2 bootstrap cache key not found')
html.write_text(text.replace(old, new, 1), encoding='utf-8')

doc = Path('docs/FINAL-RELEASE-READINESS.md')
d = doc.read_text(encoding='utf-8')
addition = '''\n## Scouting V2 weekly integration finding\n\nThe release gate also exposed a real cutover defect in Scouting V2. The V2 assignment system was loaded, but it was not connected to the weekly career lifecycle; meanwhile the retired eight-week legacy discovery hook could still call V2's compatibility generator and seed hidden talent without producing the intended assignment outcome.\n\nThe Scouting V2 bootstrap now owns weekly scouting progression once V2 is ready. It seeds the first assignment, advances search, assessment, testing, camp, pathway, long-term and communication processors once per career week, and suppresses the retired legacy eight-week discovery trigger while V2 is active. The release gate verifies that the first search assignment is created, reaches its due week and resolves to a valid outcome.\n\n## Final automated result\n\nThe exact merge candidate passed repository hygiene, static asset/load-order regression, Live Event Broadcast V4.6 validation, JavaScript syntax checks and the browserless runtime gate. The release-readiness soak passed National Pool agreement expiry, Scouting V2 assignment progression, Staff/Finance authority, annual and Olympic-cycle rollover, a 40-season / ten-cycle career, representative live-event families and phone/tablet/desktop route structure.\n\nA real iPad Safari visual/touch pass remains the final device sign-off before any later production promotion.\n'''
if '## Scouting V2 weekly integration finding' not in d:
    d = d.rstrip() + '\n' + addition
    doc.write_text(d, encoding='utf-8')
