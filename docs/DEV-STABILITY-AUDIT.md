# Development stability audit — 13 September 2026

Dev base: `d709ec98` (includes the owner's removal of the dev alpha gate).
Work branch: `audit/dev-stability-20260913`. No production deployment or promotion is authorized.

This is a live audit log, not a release certificate. Browser verification of repaired assets is pending.

| ID | Priority | System | Issue | Root cause | Fix | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-01 | P2 | Inbox | Counter observer refreshes continuously | Counter children replaced even when unchanged | Idempotent counter updates | Verified: regression reproduced before repair, settles afterwards |
| AUD-02 | P1 | Training / Home | Different attention queues and unresolvable medical alerts | Legacy queue reads trainingV2; current screen reads attributeDevelopment | Current training owns queue and badge; medical status excluded from decisions | Verified: fatigue, recovery, adapted block and medical fixtures |
| AUD-03 | P1 | Inbox actions | Action Required can be empty despite a global action count | Persisted search/category hide actions; missing-email actions omitted | Reset filters on Action Required; materialize missing-mail actions and route to destination | Verified: targeted fixture |
| AUD-04 | P1 | Weekly training | Current attribute development is bypassed | Async compressed legacy engine replaces processWeek and other current hooks | Legacy engine delegates to captured current hooks when current authority exists | Fixed: extended career integration in progress |
| AUD-05 | P0 | Saves / progression | Storage quota stops week processing; autosaved label is misleading | Large career/scouting/history JSON exceeds localStorage capacity; save throws | Lossless gzip envelope, legacy JSON reading, visible failure warning, recovery download and retry | Verified: >5 MB round trip, Unicode, quota failure retains old save, retry; multi-week integration in progress |
| AUD-06 | P0 | Selection | Withdrawn athlete requires a new selection but screen stays locked | Core invalidates event.decision while old centre/mail flags remain submitted | Explicit false event decision overrides stale flags; centre draft rebuilt from retained entries | Verified: withdrawal and resubmission fixture; extended integration in progress |
| AUD-07 | P1 | Selection | Mark Next Slot No Entry does nothing | Dangling else belongs to inner condition instead of all/single branch | Explicit braces for both paths | Verified: unresolved slot becomes No Entry and can submit |
| AUD-08 | P1 | Onboarding / training mail | Current training changes not recognized; mail contains undefined recommendation | Guidance observes legacy trainingV2 and references removed focus field | Observe current attributeDevelopment; correct review text | Fixed: browser retest pending |
| AUD-09 | P3 | Large selection confirmation | Long final review can hide submission controls | Fixed dialog clips unbounded confirmation summary | Scrollable summary within bounded flex confirmation; actions remain available | Fixed: browser layout verification pending |

## Evidence and scope

- Repository hygiene, static asset/load-order checks and baseline runtime smoke pass.
- Six targeted regression scenarios pass: `node tools/dev-stability-regression.mjs` (requires jsdom@26, as existing runtime smoke does).
- Extended integration: `AM_AUDIT_SOAK=1 node tools/runtime-smoke.mjs`. Uses actual runtime and selection DOM handlers, but a post-onboarding fixture and instant competition simulation. It is not browser journey verification.
- Initial soak reproduced storage failure around week 10, then around week 17 after legacy growth was stopped. A subsequent run exposed invalidated/relocked selection at week 12.
- Hosted dev browser: new career, Great Britain nation, manager details, appointment, Home, squad sorting/profile, week 2, inbox reading and Training visited. Training guidance blocker reproduced on original dev assets.
- Browser rejects local preview addresses with ERR_BLOCKED_BY_CLIENT. Repaired browser tests require the dev-only site to receive this branch.
- Alpha gate removed by owner in dev; earlier secure alpha entry was blocked by automatic review. The supplied code has not been embedded in source.

## System ownership findings

The current inbox authority chooses the V3 list and a single reader. Several older generators/render wrappers remain in the load graph; the repaired paths do not create another inbox store. Legacy badge refresh and training attention were still active and inconsistent. No evidence yet of repeated generation of the same message in the extended run; ID uniqueness alone does not establish semantic uniqueness.

The compressed training engine was still running the old simulation after the current attribute system loaded. Its conflicting weekly/performance hooks now delegate to the current system; compatibility functions needed by training camps remain available. Existing history is preserved.

## Remaining verification and risks

- Browser retest of repaired onboarding, full meeting, result persistence and reload; desktop/tablet/mobile usability.
- Full-season/year rollover, Olympic career and 40-year longevity are not established by a short soak.
- The storage envelope is backward-readable by this build; older builds cannot read newly compressed saves. Rollback requires save conversion or a retained raw recovery copy.
- Compressed executable payloads and many function wrappers remain architectural maintenance risks.
- Corrupt-save recovery and blocked-storage startup need further review; quota write failure is covered.
