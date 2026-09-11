# Athletics Manager — Repository Architecture

This document describes the current production structure of Athletics Manager. Historical implementation version numbers in filenames (`-v2`, `-v3`, `-v4`) are lineage markers only; the shipping baseline is defined in `RELEASE-1.0.md` and `scripts/release-baseline.js`.

## Production entry points

- `index.html` — public entry point. Records whether a career save existed at entry, then redirects to `game.html`.
- `game.html` — authoritative production asset graph and application shell.
- `scripts/game.js` — core career simulation, shared game state and legacy primitives still required by current production systems.
- `styles/game.css` — core layout and styling primitives still required by current production systems.

Do not remove `scripts/game.js` or `styles/game.css` until their remaining gameplay/shell responsibilities have been deliberately extracted and the regression contracts have been updated.

## Runtime layers

### Core and simulation

Core state, simulation and event data load first. Important modules include:

- `scripts/game.js`
- `scripts/sprint-expansion.js`
- `scripts/endurance-expansion.js`
- `scripts/event-ai-realism.js`
- `scripts/event-day-integrity.js`
- `scripts/progression-selection-core.js`

### Live Event authority

The current live-event presentation authority is:

- `scripts/live-event-engine-v3.js` — simulation compatibility layer
- `scripts/shotput-athlete-v1.js` — Shot Put visual integration
- `scripts/live-event-broadcast-v4.js` — authoritative live renderer, commentary, camera direction and scoreboard presentation
- `styles/live-event-broadcast-v4.css` — authoritative broadcast presentation styles

`window.AMLiveBroadcastV4` and the compatibility handle `window.AMLiveEventV3` must continue to resolve to the production renderer.

### Production UI authorities

The current shipping authorities are documented in `RELEASE-1.0.md`. Key route owners include:

- Home — `scripts/home-v2.js`
- Inbox — `scripts/inbox-v3.js`
- Squad / Pool / Athlete Profile — `scripts/squad-athlete-v2.js`
- Calendar — `scripts/calendar-v2.js`
- Competition Journey — `scripts/competition-journey-v2.js`
- Training — `scripts/training-v2-bootstrap.js` with `scripts/training-v3.js`
- Scouting — `scripts/scouting-v2-bootstrap.js` with `scripts/scouting-v3.js`
- Staff / Finance — `scripts/staff-finance-v2.js`
- World / Season — `scripts/world-season-v2.js`
- Manager Career / My Profile — `scripts/manager-career-v1.js`
- First-Time Experience — `scripts/first-time-experience-v2.js`

## Dynamic dependencies

Not every production dependency appears as a direct `<script>` tag in `game.html`.

### Training bootstrap

`scripts/training-v2-bootstrap.js` dynamically loads and executes:

- `scripts/training-v2/styles.gz.b64`
- `scripts/training-v2/engine-a.b64`
- `scripts/training-v2/engine-b.b64`
- `scripts/training-v2/camps.gz.b64`
- `scripts/training-v2/ui.gz.b64`
- `scripts/calendar-training-cleanup-v1.js`
- `scripts/training-squad-testing-v1.js`
- `scripts/training-attention-decisions-v2.js`

These files are production dependencies even though they are not direct tags in `game.html`.

### Scouting bootstrap

`scripts/scouting-v2-bootstrap.js` dynamically loads the payloads under `scripts/scouting-v2/`. Those encoded files remain production dependencies until Scouting V2 is deliberately unpacked/replaced.

### Inbox character voices

`scripts/editorial-release-note.js` dynamically loads `scripts/inbox-character-voices-v1.js`.

## CSS structure

`game.html` is the source of truth for production stylesheet order. Later feature-specific styles intentionally layer over `styles/game.css`. Do not casually alphabetise or regroup styles: order is part of the runtime presentation contract.

## Tooling

- `tools/static-regression.mjs` — validates the active asset graph, required authorities, source contracts and migration order.
- `tools/runtime-smoke.mjs` — browserless runtime smoke test.
- `tools/repository-hygiene.mjs` — rejects orphan top-level runtime files and accidental temporary artefacts.

## CI/CD

- `.github/workflows/ui-regression.yml` — runs source, syntax, hygiene and browserless runtime checks on relevant pull requests and `main` changes.
- `.github/workflows/deploy-live.yml` — validates the live-event authority and deploys `main` to production hosting over FTPS.
- `.github/workflows/apply-athletics-update.yml` — guarded staged-update mechanism used for large generated patches.

Production deployment is from `main`. `release/1.0` is the documented known-good failsafe branch.

## Branch policy

Active long-lived branches should be limited to:

- `main` — current production
- `release/1.0` — known-good shipping baseline

Historical `backup/*`, `batch/*` and old update branches are archival development artefacts, not active production lines. New work should use short-lived feature or maintenance branches and merge through a reviewed/regression-tested pull request.

## File retirement policy

When a runtime layer is replaced:

1. Remove it from `game.html` or the dynamic loader.
2. Confirm no production module imports it.
3. Delete the retired file rather than keeping `old`, `backup`, `copy` or `final-final` variants in the repository.
4. Rely on Git history and the release branch for recovery.
5. Add/update regression coverage when authority changes.

This keeps the repository readable without sacrificing rollback safety.
