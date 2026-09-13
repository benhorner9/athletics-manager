# Development stability audit — 13 September 2026

Dev base: `d709ec98` (includes the owner's removal of the dev alpha gate).
Work branch: `audit/dev-stability-20260913`. No production deployment or promotion is authorized.

This is a live audit log, not a release certificate. First repair batch merged into dev by PR #58 (c89bc29c); dev deployment and CI succeeded. Browser follow-up repairs are in progress.

| ID | Priority | System | Issue | Root cause | Fix | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-01 | P2 | Inbox | Counter observer refreshes continuously | Counter children replaced even when unchanged | Idempotent counter updates | Verified: regression reproduced before repair, settles afterwards |
| AUD-02 | P1 | Training / Home | Different attention queues and unresolvable medical alerts | Legacy queue reads trainingV2; current screen reads attributeDevelopment | Current training owns queue and badge; medical status excluded from decisions | Verified: fatigue, recovery, adapted block and medical fixtures |
| AUD-03 | P1 | Inbox actions | Action Required can be empty despite a global action count | Persisted search/category hide actions; missing-email actions omitted | Reset filters on Action Required; materialize missing-mail actions and route to destination | Verified: targeted fixture |
| AUD-04 | P1 | Weekly training | Current attribute development is bypassed | Async compressed legacy engine replaces processWeek and other current hooks | Legacy engine delegates to captured current hooks when current authority exists | Verified: 45 consecutive weeks in the actual runtime |
| AUD-05 | P0 | Saves / progression | Storage quota stops week processing; autosaved label is misleading | Large career/scouting/history JSON exceeds localStorage capacity; save throws | Lossless gzip envelope, legacy JSON reading, visible failure warning, recovery download and retry | Verified: >5 MB round trip, Unicode, quota failure retains old save, retry; 45-week integration passed |
| AUD-06 | P0 | Selection | Withdrawn athlete requires a new selection but screen stays locked | Core invalidates event.decision while old centre/mail flags remain submitted | Explicit false event decision overrides stale flags; centre draft rebuilt from retained entries | Verified: withdrawal and resubmission fixture; 45-week integration passed |
| AUD-07 | P1 | Selection | Mark Next Slot No Entry does nothing | Dangling else belongs to inner condition instead of all/single branch | Explicit braces for both paths | Verified: unresolved slot becomes No Entry and can submit |
| AUD-08 | P1 | Onboarding / training mail | Current training changes not recognized; mail contains undefined recommendation | Guidance observes legacy trainingV2 and references removed focus field | Observe current attributeDevelopment before redraw detaches input; correct review text; route selection guidance through current centre and recognize its No Entry state | Fixed: browser retest pending |
| AUD-10 | P1 | Onboarding controls | Home/Squad guidance replaces its own buttons continuously | Body observer triggers unconditional guidance DOM replacement | Idempotent guidance markup and mentor identity | Verified: node identity regression; browser retest pending |
| AUD-11 | P1 | Live events | Recovery saves official result while broadcast is still running | Legacy watchdog ignores V4 timeline and bypasses V4 completion | Watch current engine frames; respect pause/background; recover through canonical Instant Result | Fixed: watchdog regression passes; browser retest pending |
| AUD-12 | P1 | Training UI | Current training is incorrectly reported missing | Cutover and diagnostic selectors recognize only older training DOM | Recognize training-v4 authority | Fixed: browser retest pending |
| AUD-13 | P1 | Live controls | Pause/speed buttons disappear during interaction | Broadcast redraw replaces controls every painted frame | Preserve controls while updating canvas; bind each handler once | Verified: control node identity and pause/speed regression; browser retest pending |
| AUD-14 | P1 | Competition navigation | Footer overview does not consistently leave discipline screen | Footer relies on legacy draw state instead of current competition route | Use canonical openEvent for programme/results return | Verified: targeted route regression; browser retest pending |
| AUD-15 | P3 | Live header | Programme text overflows narrow back button | Journey changes icon to long label despite V4 fixed icon dimensions | Keep V4 icon and descriptive accessible label | Fixed: screenshot retest pending |
| AUD-09 | P3 | Large selection confirmation | Long final review can hide submission controls | Fixed dialog clips unbounded confirmation summary | Scrollable summary within bounded flex confirmation; actions remain available | Fixed: browser layout verification pending |

## Evidence and scope

- Repository hygiene, static asset/load-order checks and baseline runtime smoke pass.
- Ten targeted regression scenarios pass: `node tools/dev-stability-regression.mjs` (requires jsdom@26, as existing runtime smoke does).
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

## Extended evidence

- 45 consecutive week advances reached week 46; 12 selections and 13 completed meetings, including all six Summit rounds. Final career JSON exceeded 13 million characters and compressed save/load preserved decisions and results.
- Browser on c89bc29c: current Training review appears; Keep Current Plan advances to week 3. Search reset exposes the real funding decision; Keep Baseline Plan clears Home actions from 1 to 0. Scouting assignment submitted, competition preview opens and returns to Calendar, week 4 coach team submits/locks and clears selection action, week 5 launches first event.
- Browser revealed additional defects: detached change event target, self-replacing guidance buttons, outdated training boundary selector, and old live watchdog prematurely saving while animation continues. Follow-up repairs are tracked above.

Fresh browser retest on c68c03ec: appointment, Home/Squad guidance clicks, profile, current training dropdown change, week 3/4 advancement, manual Maya Thompson selection plus explicit No Entry slots submitted successfully. Duplicate onboarding selection controls are absent.
