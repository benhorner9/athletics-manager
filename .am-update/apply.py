from pathlib import Path

# 1) Fix Selection Immersion omission accounting so only genuinely eligible athletes
# can be treated as omitted. This uses the same eligibility authority as the Selection Centre,
# which already respects Summit Series commitments, camps, injuries and other lockouts.
path = Path('scripts/selection-immersion-v1.js')
text = path.read_text(encoding='utf-8')
old = "for(const d of ds){for(const a of activeSquad(d)){const st=story(a),wasSelected=selected.has(a.id),eligibleNow=!(a.injury>0)&&!a.retired;"
new = "for(const d of ds){const eligibleIds=eligible(e,d);for(const a of activeSquad(d)){const st=story(a),wasSelected=selected.has(a.id),eligibleNow=eligibleIds.has(a.id);"
if text.count(old) != 1:
    raise SystemExit(f'Expected one Selection Immersion omission block, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')

# 2) Cache-bust the patched Selection Immersion script for dev testing.
path = Path('game.html')
text = path.read_text(encoding='utf-8')
old = 'scripts/selection-immersion-v1.js?v=20260913-languageqa1'
new = 'scripts/selection-immersion-v1.js?v=20260915-summitmorale1'
if text.count(old) != 1:
    raise SystemExit(f'Expected one Selection Immersion asset reference, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')

# 3) Add a regression contract proving Summit/unavailable athletes cannot accumulate
# Selection Immersion omission penalties.
regression = Path('tools/summit-selection-morale-regression.mjs')
regression.write_text("""import fs from 'node:fs';
import assert from 'node:assert/strict';

const immersion=fs.readFileSync('scripts/selection-immersion-v1.js','utf8');
const game=fs.readFileSync('scripts/game.js','utf8');

assert.match(immersion,/for\(const d of ds\)\{const eligibleIds=eligible\(e,d\);for\(const a of activeSquad\(d\)\)/,
  'Selection Immersion must resolve the real eligible athlete set for each discipline.');
assert.match(immersion,/eligibleNow=eligibleIds\.has\(a\.id\)/,
  'Selection Immersion omission penalties must require actual event eligibility.');
assert.doesNotMatch(immersion,/eligibleNow=!\(a\.injury>0\)&&!a\.retired/,
  'Injury/retirement-only eligibility is too broad and incorrectly penalises Summit-locked athletes.');
assert.match(immersion,/function eligible\(e,d\)\{try\{return new Set\(\(eligibleFor\(e,d\)\|\|\[\]\)\.map\(a=>a\.id\)\)/,
  'Selection Immersion must continue to delegate to the canonical eligibleFor authority.');
assert.match(game,/function activityBusy\(a,week=s\.game\.week\).*week>=16&&week<=21.*l\.entries\.includes\(a\.id\)/s,
  'Canonical event eligibility must continue to recognise the Summit/league commitment window.');
assert.match(game,/function eligibleFor\(e,d\).*activityBusy\(a,e\.week\)/s,
  'Canonical eligibleFor must continue to exclude activity-busy athletes for the event week.');

console.log('Summit selection morale regression passed: unavailable Summit athletes are neutral, not omitted.');
""", encoding='utf-8')

# 4) Run the contract as part of critical automated QA.
path = Path('tools/automated-qa.mjs')
text = path.read_text(encoding='utf-8')
old = "await run('Contract expiry reentrancy regression',['tools/contract-expiry-reentrancy-regression.mjs']);\nawait run('Deterministic gameplay regressions',['tools/automated-gameplay-regression.mjs']);"
new = "await run('Contract expiry reentrancy regression',['tools/contract-expiry-reentrancy-regression.mjs']);\nawait run('Summit selection morale regression',['tools/summit-selection-morale-regression.mjs']);\nawait run('Deterministic gameplay regressions',['tools/automated-gameplay-regression.mjs']);"
if text.count(old) != 1:
    raise SystemExit(f'Expected automated QA insertion point once, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
