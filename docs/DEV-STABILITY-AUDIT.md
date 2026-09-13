# Development stability audit — 13 September 2026

Dev base: `d709ec98` (includes the owner's removal of the dev alpha gate).
Work branch: `audit/dev-stability-20260913`. No production deployment or promotion is authorized.

This is a live audit log, not a release certificate. Status: **Improved but requires more work**. Dev repair PRs #58–#61 passed CI and were deployed only to dev. Calendar follow-up verification is tracked below; its first browser retest exposed the historical route guard and led to an additional targeted repair. Production was not modified, deployed, or merged.

| ID | Priority | System | Issue | Root cause | Fix | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-01 | P2 | Inbox | Counter observer refreshes continuously | Counter children replaced even when unchanged | Idempotent counter updates | Verified: regression reproduced before repair, settles afterwards |
| AUD-02 | P1 | Training / Home | Different attention queues and unresolvable medical alerts | Legacy queue reads trainingV2; current screen reads attributeDevelopment | Current training owns queue and badge; medical status excluded from decisions | Verified: fatigue, recovery, adapted block and medical fixtures |
| AUD-03 | P1 | Inbox actions | Action Required can be empty despite a global action count | Persisted search/category hide actions; missing-email actions omitted | Reset filters on Action Required; materialize missing-mail actions and route to destination | Verified: targeted fixture |
| AUD-04 | P1 | Weekly training | Current attribute development is bypassed | Async compressed legacy engine replaces processWeek and other current hooks | Legacy engine delegates to captured current hooks when current authority exists | Verified: 45 consecutive weeks in the actual runtime |
| AUD-05 | P0 | Saves / progression | Storage quota stops week processing; autosaved label is misleading | Large career/scouting/history JSON exceeds localStorage capacity; save throws | Lossless gzip envelope, legacy JSON reading, visible failure warning, recovery download and retry | Verified: >5 MB round trip, Unicode, quota failure retains old save, retry; 45-week integration passed |
| AUD-06 | P0 | Selection | Withdrawn athlete requires a new selection but screen stays locked | Core invalidates event.decision while old centre/mail flags remain submitted | Explicit false event decision overrides stale flags; centre draft rebuilt from retained entries | Verified: withdrawal and resubmission fixture; 45-week integration passed |
| AUD-07 | P1 | Selection | Mark Next Slot No Entry does nothing | Dangling else belongs to inner condition instead of all/single branch | Explicit braces for both paths | Verified: unresolved slot becomes No Entry and can submit |
| AUD-08 | P1 | Onboarding / training mail | Current training changes not recognized; mail contains undefined recommendation | Guidance observes legacy trainingV2 and references removed focus field | Observe current attributeDevelopment before redraw detaches input; correct review text; route selection guidance through current centre and recognize its No Entry state | Verified: fresh-career browser onboarding and current training change |
| AUD-10 | P1 | Onboarding controls | Home/Squad guidance replaces its own buttons continuously | Body observer triggers unconditional guidance DOM replacement | Idempotent guidance markup and mentor identity | Verified: regression and ordinary Home/Squad browser clicks |
| AUD-11 | P1 | Live events | Recovery saves official result while broadcast is still running | Legacy watchdog ignores V4 timeline and bypasses V4 completion | Watch current engine frames; respect pause/background; recover through canonical Instant Result | Verified: regression and live 100m pause beyond old timeout, resume and official finish |
| AUD-12 | P1 | Training UI | Current training is incorrectly reported missing | Cutover and diagnostic selectors recognize only older training DOM | Recognize training-v4 authority | Verified: fresh-career browser onboarding and current training change |
| AUD-13 | P1 | Live controls | Pause/speed buttons disappear during interaction | Broadcast redraw replaces controls every painted frame | Preserve controls while updating canvas; bind each handler once | Verified: regression and browser Pause / 4x / Resume |
| AUD-14 | P3 | Competition navigation | Footer overview click hits the dev badge | Fixed dev badge overlaps footer button; DOM rectangles confirmed | Move dev badge above event controls; retain canonical programme/results route | Fixed: browser overlap retest pending |
| AUD-15 | P3 | Live header | Programme text overflows narrow back button | Journey changes icon to long label despite V4 fixed icon dimensions | Keep V4 icon and descriptive accessible label | Fixed: screenshot retest pending |
| AUD-16 | P3 | Selection | Locked slots still say Tap to clear and look editable | Handler rejects changes but controls retain draft affordance | Disable locked athlete/slot controls and label Selection locked | Verified: regression; browser retest pending |
| AUD-17 | P0 | Existing-save startup | Reload can abort core script and leave expansion constants undefined | Initial UI and qualification read expanded saved disciplines before their definitions load | Defer initial presentation and qualification reconciliation until DOMContentLoaded | Verified: seeded startup smoke and latest dev browser reload; no new game console errors |
| AUD-18 | P2 | Commentary | Instant/recovered official result still says waiting or provisional | Instant completion omits official speech; legacy saved logs lack final commentary | Reuse current finish path and derive final commentary from official rows | Verified: official-commentary regression; browser retest pending |
| AUD-19 | P2 | Programme results | Unselected domestic rivals appear as Your Programme and inflate medals | Player result filtering uses nation alone | Filter by recorded event entries in result, Calendar and onboarding summaries | Verified: same-nation rival and No Entry regression; browser retest pending |
| AUD-20 | P3 | Calendar | Completed meeting has no results navigation | Calendar only renders a status label; legacy guard redirects historical requests to current Event Day | Open existing results route; preserve explicit historical request until leaving competition | Fixed: targeted regression; hosted browser retest pending |
| AUD-21 | P2 | Calendar / Summit | Calendar advertises obsolete weeks 17/19/21 | Hardcoded legacy league schedule | Read current Summit meeting schedule | Verified: current weeks 14/20/26/32/38/44 and absence of old weeks in regression |
| AUD-09 | P3 | Large selection confirmation | Long final review can hide submission controls | Fixed dialog clips unbounded confirmation summary | Scrollable summary within bounded flex confirmation; actions remain available | Verified at desktop: all 36 Summit slots reviewed/submitted; submit button inside viewport; tablet/mobile pending |

## Evidence and scope

- Repository hygiene, static asset/load-order checks and baseline runtime smoke pass.
- Fifteen targeted regression scenarios pass: `node tools/dev-stability-regression.mjs` (requires jsdom@26, as existing runtime smoke does).
- Extended integration: `AM_AUDIT_SOAK=1 node tools/runtime-smoke.mjs`. Uses actual runtime and selection DOM handlers, but a post-onboarding fixture and instant competition simulation. It is not browser journey verification.
- Initial soak reproduced storage failure around week 10, then around week 17 after legacy growth was stopped. A subsequent run exposed invalidated/relocked selection at week 12.
- Hosted dev browser: new career, Great Britain nation, manager details, appointment, Home, squad sorting/profile, week 2, inbox reading and Training visited. Training guidance blocker reproduced on original dev assets.
- Local previews were blocked by the browser. Interactive checks used the isolated hosted dev site.
- Alpha gate removed by owner in dev; earlier secure alpha entry was blocked by automatic review. The supplied code has not been embedded in source.

## System ownership findings

The current inbox authority chooses the V3 list and a single reader. Several older generators/render wrappers remain in the load graph; the repaired paths do not create another inbox store. Legacy badge refresh and training attention were still active and inconsistent. No evidence yet of repeated generation of the same message in the extended run; ID uniqueness alone does not establish semantic uniqueness.

The compressed training engine was still running the old simulation after the current attribute system loaded. Its conflicting weekly/performance hooks now delegate to the current system; compatibility functions needed by training camps remain available. Existing history is preserved.

## Remaining verification and risks

- Tablet/mobile visual checks, every live event family, full staff/finance/scouting lifecycle and national-pool call-up/demotion are not fully verified.
- Full-season/year rollover, Olympic career and 40-year longevity are not established by a short soak.
- The storage envelope is backward-readable by this build; older builds cannot read newly compressed saves. Rollback requires save conversion or a retained raw recovery copy.
- Compressed executable payloads and many function wrappers remain architectural maintenance risks.
- Corrupt-save recovery and blocked-storage startup need further review; quota write failure is covered.

## Extended evidence

- 45 consecutive week advances reached week 46; 12 selections and 13 completed meetings, including all six Summit rounds. Final career JSON exceeded 13 million characters and compressed save/load preserved decisions and results.
- Browser on c89bc29c: current Training review appears; Keep Current Plan advances to week 3. Search reset exposes the real funding decision; Keep Baseline Plan clears Home actions from 1 to 0. Scouting assignment submitted, competition preview opens and returns to Calendar, week 4 coach team submits/locks and clears selection action, week 5 launches first event.
- Browser revealed additional defects: detached change event target, self-replacing guidance buttons, outdated training boundary selector, and old live watchdog prematurely saving while animation continues. Follow-up repairs are tracked above.

Fresh browser retest on c68c03ec: appointment, Home/Squad guidance clicks, profile, current training dropdown change, week 3/4 advancement, manual Maya Thompson selection plus explicit No Entry slots submitted successfully. Duplicate onboarding selection controls are absent.

## Latest verification checkpoint

- Dev PRs #58, #59 and #60 merged and deployed with successful CI; production remains untouched.
- Fresh career on repaired dev: manager Final Dev QA, Great Britain; appointment → Home → Squad → athlete profile → week 2; changing current training load completed guidance and advanced to week 3.
- Week 4 manual selection: Maya Thompson in W100, remaining W100 slots explicitly No Entry, all W200 slots No Entry. Submission succeeded and remained locked after reopening.
- Week 5 live 100m: Pause remained active beyond the old watchdog timeout; 4x/Resume controls worked; playback progressed, with Maya Thompson first at 11.27s in official result and scoreboard. No premature playback recovery. Reload retained the 1/2 meeting result and selection.
- Skipping the unentered W200 completed the meeting; career returned Home and advanced through week 7. The domestic-rival summary bug and dev-badge overlap were found in this journey and repaired in the final follow-up.
- Existing-save seeded startup smoke reproduced errors in initial Home/qualification; passes after deferred initialisation. Normal smoke and all 15 targeted scenarios pass.
- Browser viewport available: 1363 × 936. No supported viewport resizing capability was exposed; tablet/mobile visual verification remains incomplete.

## Scope and final review limits

Issue totals: **21 — P0: 3; P1: 9; P2: 4; P3: 5; P4: 0**. Fixed does not imply every device or career stage was verified.

Browser evidence additionally covers week 8 Summit registration: coach recommendations resolved all 36 slots across 18 disciplines, final review and submission were reachable, the decision changed to complete, and reload retained the selection. The latest code build at 6a23d8dc reloaded the existing career without new game errors.

Coverage distinction:

- Browser: fresh career, nation/manager appointment, Home, squad/profile, current training, inbox read/action/search, funding decision, scouting assignment, manual and recommended selection, No Entry, live sprint pause/speed/finish, meeting completion, subsequent weeks, compressed reload, large Summit registration.
- Integration: 45 consecutive weeks, 12 selections, 13 meetings including six Summit rounds, current weekly training, unique event/email IDs, attempt/result consistency, save/load and duplicate submission checks. Instant simulation is used; this does not establish every live animation/commentary path.
- Not fully verified: responsive tablet/mobile layouts, all throws/jumps/combined/relay live presentations, national-pool call-up/demotion, full staff/injury/finance lifecycle, every ranking/record view, year rollover, Olympics and 40-year career longevity. Semantic email duplication is not disproved solely by unique IDs.

Release considerations (maximum five):

1. Complete tablet/iPad/mobile interaction checks before promotion.
2. Verify remaining live event families and full annual/Olympic progression.
3. Older builds cannot read compressed saves; rollback needs conversion or raw recovery saves.
4. Corrupt-save and blocked-storage startup recovery need additional fault testing.
5. Remaining legacy wrappers and encoded engines still create load-order and duplicate-authority maintenance risk.
