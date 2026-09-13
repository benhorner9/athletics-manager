from pathlib import Path
import re

root = Path('.')
js = root / 'scripts/programme-economy-v2.js'
text = js.read_text(encoding='utf-8')
replacements = {
    "r==='scout'?.9:1": "r==='scout' ? .9 : 1",
    "bf=f.construction?.weeksRemaining>0?.9:1": "bf=f.construction?.weeksRemaining>0 ? .9 : 1",
    "const f=p===1?1:p===2?.65:.4": "const f=p===1 ? 1 : p===2 ? .65 : .4",
    "o.term>=Number(c.preferredTerm||104)?.025:0": "o.term>=Number(c.preferredTerm||104) ? .025 : 0",
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'Expected programme-economy token missing: {old}')
    text = text.replace(old, new)
if re.search(r'\?\.\d', text):
    raise SystemExit('Suspicious numeric optional-chain token remains in programme-economy-v2.js')
js.write_text(text, encoding='utf-8')

cut = root / 'scripts/ui-cutover-v1.js'
ui = cut.read_text(encoding='utf-8')
ui = ui.replace("const BUILD='2026.09.13-programme-economy1';", "const BUILD='2026.09.13-programme-economy2';")
ui = ui.replace('programme-staff-v1', 'programme-staff-v2')
ui = ui.replace('[data-am-ui-screen=\"programme-economy-v1\"]', '[data-am-ui-screen=\"programme-economy-v2\"]')
ui = ui.replace("programmeEconomy:'programme-economy-v1'", "programmeEconomy:'programme-economy-v2'")
ui = ui.replace("styles/programme-economy-v1.css?v=20260913-pe1", "styles/programme-economy-v1.css?v=20260913-pe2")
ui = ui.replace("scripts/programme-economy-v1.js?v=20260913-pe1", "scripts/programme-economy-v2.js?v=20260913-pe2")
if 'scripts/programme-economy-v1.js' in ui:
    raise SystemExit('Retired programme-economy-v1.js is still active in UI cutover')
if 'scripts/programme-economy-v2.js' not in ui:
    raise SystemExit('Programme Economy V2 was not wired into UI cutover')
cut.write_text(ui, encoding='utf-8')

broken = root / 'scripts/programme-economy-v1.js'
if broken.exists():
    broken.unlink()

css = root / 'styles/programme-economy-v1.css'
style = css.read_text(encoding='utf-8')
extra = """
/* Programme Economy V2 facility benefit list */
.pe-benefits{margin:0;padding:0 26px 2px;color:#859dab;font-size:8px;line-height:1.55}.pe-benefits li+li{margin-top:2px}
@media(max-width:700px){.pe-benefits{padding-left:24px;padding-right:18px}}
"""
if '.pe-benefits{' not in style:
    css.write_text(style.rstrip() + '\n' + extra, encoding='utf-8')

arch = root / 'docs/PROGRAMME-ECONOMY-ARCHITECTURE.md'
arch.write_text("""# Programme Economy & Management Systems V2

## Authority

`window.AMProgrammeEconomy` / `scripts/programme-economy-v2.js` is the canonical authority for player-programme finance, funded athlete agreements, staff employment contracts, the staff market and facility operating state.

The current cash balance remains `s.funding` for save compatibility. Every new economy movement is recorded through the shared `s.finance.ledger`. Per-nation programme state lives in `s.programmeEconomies[nation]` and is versioned.

## Compatibility boundary

Existing gameplay systems remain authoritative for performance simulation. The economy layer does **not** add a second competition-performance modifier. Facility condition feeds the existing simulation through the canonical `facilityLevel()` compatibility adapter. Existing `s.staff` levels remain the compatibility bridge for training/performance while named staff contracts and role-specific attributes live in Programme Economy V2.

## Weekly order

1. Existing gameplay/training week is processed.
2. Programme Economy processes facility construction and condition.
3. Athlete payroll is charged.
4. Staff payroll is charged.
5. Facility upkeep is charged.
6. Performance operations are charged.
7. Contract expiry and financial-health rules are resolved.
8. Every movement is written to the ledger and persisted by the normal save cycle.

## Annual order

The established season rollover remains authoritative for federation core/performance funding. Programme Economy wraps that rollover to update board financial confidence, refresh the staff market and run the simplified AI-nation economy. It must not duplicate the existing grant award.

## Athlete agreements

National programme status and club affiliation are separate. A funded agreement contains status, duration, guaranteed annual funding and medal-bonus rate. Expiry or release returns the athlete to club-led/National Pool activity without deleting the athlete or career history.

## Staff

Staff are named people with role-specific 1–20 capabilities, reputation, style, salary expectations and employment contracts. There is no player-facing single staff OVR in the new market. Existing staff migrate in place.

## Facilities

Facilities have actual level, condition, capacity, upkeep and construction state. Effective level is condition-adjusted and is the only value exposed back to existing performance logic.

## Financial safety

Health states are Healthy, Watch, Restricted and Critical. Critical programmes restrict major new commitments and may receive one contextual emergency stabilisation intervention per season rather than an instant cash-zero game over.

## Long careers

Funding, salaries and upkeep use controlled 2% annual inflation capped at 2.2x the initial scale. AI programmes use a simplified annual budget model so the same concepts can later support playable nations without simulating every AI transaction weekly.

## Migration

Existing facilities, named staff, squad members, funding and legacy finance history are retained. Migration is versioned through `s.programmeEconomies[nation].migration`; no existing career is required to restart.
""", encoding='utf-8')
