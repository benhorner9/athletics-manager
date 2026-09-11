# Athletics Manager

Athletics Manager is a browser-based national athletics management game. The current repository is a static web application with a modular JavaScript/CSS runtime, automated regression checks and production deployment from `main` over FTPS.

## Production entry points

- `index.html` — public entry point; records entry save state and redirects into the game.
- `game.html` — authoritative application shell and production asset load order.
- `scripts/game.js` — core career simulation and shared runtime primitives.
- `styles/game.css` — core interface and layout primitives.

`game.html` is the source of truth for which top-level scripts and styles are active and for their load order.

## Repository structure

- `assets/` — athlete/staff portraits and game artwork.
- `scripts/` — simulation, UI, event, inbox, training, scouting and career systems.
- `scripts/training-v2/` — compressed production payloads loaded by `training-v2-bootstrap.js`.
- `scripts/scouting-v2/` — compressed production payloads loaded by `scouting-v2-bootstrap.js`.
- `styles/` — core and feature-specific production styles.
- `tools/` — static regression, runtime smoke and repository-hygiene checks.
- `.github/workflows/` — guarded update, regression and live deployment workflows.
- `docs/ARCHITECTURE.md` — detailed runtime, dependency and maintenance map.
- `RELEASE-1.0.md` — canonical shipping-system authority baseline.
- `VERSION` — product version.

## Production authorities

The canonical system owners are defined in `RELEASE-1.0.md`. Historical filename suffixes such as `-v2`, `-v3` and `-v4` describe implementation lineage; they are not the product version.

The current live-event presentation authority is `scripts/live-event-broadcast-v4.js`, with `scripts/live-event-engine-v3.js` retained as the simulation/compatibility layer.

## Dynamic dependencies

Some production files are intentionally not direct `<script>` tags in `game.html`.

`training-v2-bootstrap.js` dynamically loads its compressed payloads plus:

- `calendar-training-cleanup-v1.js`
- `training-squad-testing-v1.js`
- `training-attention-decisions-v2.js`

`scouting-v2-bootstrap.js` dynamically loads the payloads under `scripts/scouting-v2/`.

`editorial-release-note.js` dynamically loads `inbox-character-voices-v1.js`.

These files must not be treated as orphaned simply because they are not direct HTML imports.

## Development and QA

Changes should be made on a short-lived feature/maintenance branch and merged through a pull request.

The UI regression workflow validates:

- production asset presence and load order;
- critical runtime source contracts;
- JavaScript syntax;
- Live Event V4.6 authority;
- repository hygiene and orphan-file detection;
- browserless runtime smoke behaviour.

`main` is the production branch. `release/1.0` is the documented known-good shipping baseline.

## Deployment

A successful push to `main` triggers `.github/workflows/deploy-live.yml`, which validates the Live Event authority and deploys the static site to production hosting over FTPS using GitHub Actions secrets.

Do not commit FTP credentials, passwords, API keys or local `.env` files to the repository.

## Maintenance rule

When a system is replaced, remove the retired file once it is no longer referenced by `game.html` or a dynamic loader. Recovery belongs in Git history and the release branch, not in duplicate `old`, `backup`, `copy` or temporary runtime files.

See `docs/ARCHITECTURE.md` for the full repository map.
