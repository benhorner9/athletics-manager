import fs from 'node:fs';
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

// Shipping contract: an athlete the rules make unavailable cannot be treated as a selection omission.
console.log('Summit selection morale regression passed: unavailable Summit athletes are neutral, not omitted.');
