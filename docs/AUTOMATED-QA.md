# Athletics Manager Automated QA

Athletics Manager uses automated QA to stop functional regressions reaching the development client.

## Principle

The player should test whether the game is enjoyable, understandable and well paced. They should not be relied on to discover repeatable software failures such as broken routes, silent contract expiry, missing controls, save corruption, clipped responsive layouts or dead competition flows.

Every fixed regression should gain an automated test whenever the behaviour can be reproduced deterministically.

## Critical QA profile

`node tools/automated-qa.mjs critical`

This runs:

1. Repository hygiene.
2. Static UI and asset graph regression checks.
3. Syntax validation for every runtime JavaScript file.
4. Deterministic gameplay regressions.
5. Stability regressions.
6. Full browserless runtime smoke and release-readiness checks.

The deterministic gameplay suite currently protects:

- athlete contract expiry becoming mandatory at two weeks remaining;
- explicit allow-expiry resolving the progression block without removing the athlete early;
- coach-led training recommendations for recovery, reduced load, championship preparation and stale-block rotation;
- Summit Series owning the Competition route when explicitly opened even if a normal event exists in the same week;
- the universal completed-event Return Home route;
- athlete nicknames remaining separate from official athlete names.

## Career soak profile

`AM_AUDIT_WEEKS=16 node tools/automated-qa.mjs soak`

The soak profile runs the same deterministic checks, then executes the real game runtime through multiple career weeks. It processes selections, meetings, week advancement, training, inbox decisions, results and save/load integrity.

The dev deployment uses this profile automatically before any files are uploaded.

## Real-browser QA

`node tools/browser-qa.mjs`

This requires Playwright browsers and performs route sweeps in:

- Chromium desktop;
- WebKit at 1366×1024, matching the large iPad landscape layout used heavily during development;
- WebKit at 430×932 for the compact phone layout.

It checks that:

- each route renders its canonical production UI;
- exactly one route remains active;
- the Interface Recovery screen never appears during normal navigation;
- no page-level horizontal overflow is introduced;
- National Pool rating elements remain inside their table cells;
- Training Overview exposes the Performance Staff recommendation control.

WebKit iPad screenshots of National Pool, Training and Summit are saved as CI artifacts for visual inspection when needed.

## GitHub Actions

### Pull requests into `dev`

`Automated QA Gate` runs the critical gameplay/runtime suite first. If that passes, it runs the Chromium + WebKit browser suite.

A failed gate means the change should not be merged.

### Pushes to `dev`

`Deploy Athletics Manager Dev` now has two jobs:

1. `Automated QA before Dev Deploy`
2. `Deploy Dev via FTPS`

The deployment job has an explicit dependency on the QA job. If any deterministic regression, career soak, browser check, responsive check or runtime check fails, the upload job never starts.

This means the dev client is no longer deployed first and tested afterwards.

## What still requires human playtesting

Automation cannot reliably judge:

- whether an event feels exciting;
- whether a screen feels overwhelming despite technically fitting;
- whether an email sounds natural;
- whether progression feels rewarding;
- whether a decision is interesting rather than merely functional;
- whether the game remains fun over several hours.

Human testing should focus on those experience questions. Repeatable technical failures should be moved into this suite instead.

## Regression policy

When a bug is found:

1. reproduce it;
2. add or extend an automated regression that fails for the bug;
3. fix the bug;
4. prove the regression now passes;
5. keep the test permanently.

The goal is that the same bug category cannot silently return in a later update.
