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

Two additional live-event compatibility modules are still requested during startup and must remain until their loaders are deliberately retired:

- `scripts/event-exit-authority-v1.js` — completed-event return/home compatibility authority.
- `scripts/high-jump-broadcast-v1.js` — High Jump highlights/full-event compatibility integration layered onto the authoritative V4 broadcast renderer.

They are not replacement renderers, but they are runtime dependencies. A repository cleanup must verify browser/runtime requests, not only direct `game.html` imports, before deleting them.

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
- Club Athletics — `scripts/club-athletics-v1.js` with persistent athlete club identity from `scripts/people-biography-v1.js`
- Manager Career / My Profile — `scripts/manager-career-v1.js`
- First-Time Experience — `scripts/first-time-experience-v2.js`

## Dynamic dependencies

Not every production dependency appears as a direct `<script>` tag in `game.html`. Runtime smoke is therefore the final authority before declaring an apparently unreferenced file safe to delete.

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

### Live-event compatibility loaders

Startup currently requests `scripts/event-exit-authority-v1.js` and `scripts/high-jump-broadcast-v1.js` indirectly. Keep both until the requesting loader and the functionality they protect are deliberately consolidated into the canonical Live Event authority and regression coverage is updated.

## CSS structure

`game.html` is the source of truth for production stylesheet order. Later feature-specific styles intentionally layer over `styles/game.css`. Do not casually alphabetise or regroup styles: order is part of the runtime presentation contract.

## Tooling

- `tools/static-regression.mjs` — validates the active asset graph, required authorities, source contracts and migration order.
- `tools/runtime-smoke.mjs` — browserless runtime smoke test, including dynamically requested runtime assets.
- `tools/repository-hygiene.mjs` — rejects orphan top-level runtime files and accidental temporary artefacts.

## CI/CD

- `.github/workflows/ui-regression.yml` — runs source, syntax, hygiene and browserless runtime checks on relevant pull requests and changes to both `dev` and `main`.
- `.github/workflows/deploy-dev.yml` — validates and deploys `dev` to the development site over FTPS using dedicated `DEV_FTP_*` secrets.
- `.github/workflows/deploy-live.yml` — validates and deploys `main` to production hosting over FTPS using the existing production secrets.
- `.github/workflows/apply-athletics-update.yml` — guarded staged-update mechanism used for large generated patches. It is blocked from running directly on `main` and `release/1.0`.

Development deployment is from `dev`. Production deployment is from `main`. `release/1.0` remains the documented known-good failsafe branch.

## Branch policy

Active long-lived branches should be limited to:

- `dev` — integration and tester build; all normal feature/fix work is merged here first
- `main` — live production; receives only tested promotions from `dev`
- `release/1.0` — known-good shipping baseline / recovery branch

Normal flow is `feature/*` or `fix/*` → pull request to `dev` → dev-site testing → pull request from `dev` to `main` → live deployment. Direct feature/fix merges to `main` are not part of the normal workflow.

Historical `backup/*`, `batch/*` and old update branches are archival development artefacts, not active environment branches.

## File retirement policy

When a runtime layer is replaced:

1. Remove it from `game.html` or the dynamic loader.
2. Confirm no production module imports or requests it.
3. Run the full browserless runtime smoke to catch indirect startup requests.
4. Delete the retired file rather than keeping `old`, `backup`, `copy` or `final-final` variants in the repository.
5. Rely on Git history and the release branch for recovery.
6. Add/update regression coverage when authority changes.

This keeps the repository readable without sacrificing rollback safety.
