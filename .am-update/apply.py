from pathlib import Path

root = Path('.')

# 1) Regression runs on both long-lived environments.
ui = root / '.github/workflows/ui-regression.yml'
text = ui.read_text()
old = '    branches: [main]\n'
new = '    branches: [main, dev]\n'
if old not in text:
    raise SystemExit('ui-regression main-only branch trigger not found')
ui.write_text(text.replace(old, new, 1))

# 2) Guarded generated updates must never write directly to production or the failsafe release branch.
apply = root / '.github/workflows/apply-athletics-update.yml'
text = apply.read_text()
old = "on:\n  push:\n    paths:\n      - '.am-update/READY'\n"
new = "on:\n  push:\n    branches-ignore:\n      - main\n      - release/1.0\n    paths:\n      - '.am-update/READY'\n"
if old not in text:
    raise SystemExit('apply-update trigger block not found')
apply.write_text(text.replace(old, new, 1))

# 3) Dedicated dev-site deployment. Uses separate secrets so it can never fall back to production FTPS credentials.
dev_deploy = root / '.github/workflows/deploy-dev.yml'
dev_deploy.write_text("""name: Deploy Athletics Manager Dev

on:
  push:
    branches:
      - dev
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: athletics-manager-dev-deploy
  cancel-in-progress: true

jobs:
  deploy:
    name: Deploy Dev via FTPS
    runs-on: ubuntu-latest

    steps:
      - name: Check out dev build
        uses: actions/checkout@v4

      - name: Validate Live Event engines
        run: |
          node --check scripts/live-event-engine-v3.js
          node --check scripts/live-event-broadcast-v4.js

      - name: Verify legacy renderers are not active
        run: |
          ! grep -Eq 'event-2d|track-race-core|track-live-scoreboard|field-dot-playback|field-scoreboard-authority|scoreboard-instance-ownership|live-event-engine-v2' game.html
          ! grep -q '<ellipse' scripts/live-event-engine-v3.js
          grep -q 'scripts/live-event-broadcast-v4.js' game.html
          grep -q 'styles/live-event-broadcast-v4.css' game.html

      - name: Run repository regression checks
        run: |
          node tools/repository-hygiene.mjs
          node tools/static-regression.mjs
          while IFS= read -r -d '' file; do node --check "$file"; done < <(find scripts -type f -name '*.js' -print0)

      - name: Deploy dev build to hosting
        uses: SamKirkland/FTP-Deploy-Action@v4.3.6
        with:
          server: ${{ secrets.DEV_FTP_SERVER }}
          username: ${{ secrets.DEV_FTP_USERNAME }}
          password: ${{ secrets.DEV_FTP_PASSWORD }}
          protocol: ftps
          port: ${{ secrets.DEV_FTP_PORT || 21 }}
          server-dir: ${{ secrets.DEV_FTP_REMOTE_DIR || './' }}
          local-dir: ./
          log-level: standard
          exclude: |
            **/.git*
            **/.git*/**
            **/.github/**
            **/README.md
            **/docs/**
""")

# 4) Repository documentation now describes promotion through dev rather than direct-to-main development.
readme = root / 'README.md'
text = readme.read_text()
text = text.replace(
    'Athletics Manager is a browser-based national athletics management game. The current repository is a static web application with a modular JavaScript/CSS runtime, automated regression checks and production deployment from `main` over FTPS.',
    'Athletics Manager is a browser-based national athletics management game. The repository uses separate development and production branches, automated regression checks, and independent FTPS deployment paths for the dev and live sites.'
)
text = text.replace(
    'Changes should be made on a short-lived feature/maintenance branch and merged through a pull request.',
    'Changes should be made on a short-lived feature/maintenance branch and merged into `dev` through a pull request. After testing on the dev site, the tested `dev` build is promoted to `main` through a separate pull request.'
)
text = text.replace(
    '`main` is the production branch. `release/1.0` is the documented known-good shipping baseline.',
    '`dev` is the integration/test branch. `main` is the production branch. `release/1.0` is the documented known-good shipping baseline.'
)
text = text.replace(
    'A successful push to `main` triggers `.github/workflows/deploy-live.yml`, which validates the Live Event authority and deploys the static site to production hosting over FTPS using GitHub Actions secrets.\n\nDo not commit FTP credentials, passwords, API keys or local `.env` files to the repository.',
    'A successful push to `dev` triggers `.github/workflows/deploy-dev.yml` and deploys to the development site using dedicated `DEV_FTP_*` GitHub Actions secrets. A successful push to `main` triggers `.github/workflows/deploy-live.yml` and deploys to production using the existing production FTPS secrets.\n\nNormal development must not be merged directly into `main`; promote the tested `dev` build instead. Do not commit FTP credentials, passwords, API keys or local `.env` files to the repository.'
)
readme.write_text(text)

arch = root / 'docs/ARCHITECTURE.md'
text = arch.read_text()
old = """## CI/CD

- `.github/workflows/ui-regression.yml` — runs source, syntax, hygiene and browserless runtime checks on relevant pull requests and `main` changes.
- `.github/workflows/deploy-live.yml` — validates the live-event authority and deploys `main` to production hosting over FTPS.
- `.github/workflows/apply-athletics-update.yml` — guarded staged-update mechanism used for large generated patches.

Production deployment is from `main`. `release/1.0` is the documented known-good failsafe branch.

## Branch policy

Active long-lived branches should be limited to:

- `main` — current production
- `release/1.0` — known-good shipping baseline

Historical `backup/*`, `batch/*` and old update branches are archival development artefacts, not active production lines. New work should use short-lived feature or maintenance branches and merge through a reviewed/regression-tested pull request.
"""
new = """## CI/CD

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
"""
if old not in text:
    raise SystemExit('Architecture CI/CD block not found')
arch.write_text(text.replace(old, new, 1))

policy = root / 'docs/DEPLOYMENT-ENVIRONMENTS.md'
policy.write_text("""# Development and Live Environments

Athletics Manager uses two active deployment environments.

## Development

- Branch: `dev`
- Purpose: integration, QA and tester verification before production
- Workflow: `.github/workflows/deploy-dev.yml`
- Deployment secrets: `DEV_FTP_SERVER`, `DEV_FTP_USERNAME`, `DEV_FTP_PASSWORD`, optional `DEV_FTP_PORT`, optional `DEV_FTP_REMOTE_DIR`
- Changes arrive from short-lived feature/fix branches through pull requests.

The development deploy uses dedicated secret names deliberately. It must never inherit the live FTPS destination by accident.

## Production

- Branch: `main`
- Purpose: public/closed-alpha live build
- Workflow: `.github/workflows/deploy-live.yml`
- Deployment secrets: existing `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, optional `FTP_PORT`, optional `FTP_REMOTE_DIR`
- `main` should receive tested promotions from `dev`, not ordinary feature/fix work directly.

## Promotion flow

1. Create a short-lived branch from `dev`.
2. Implement and run regression checks.
3. Merge the pull request into `dev`.
4. GitHub deploys `dev` to the development site.
5. Test the exact dev build on iPad/browser.
6. Open a promotion pull request from `dev` to `main`.
7. After regression passes and the promotion is approved, merge to `main`.
8. GitHub deploys that exact promoted commit to the live site.

## Guardrails

- The staged `.am-update` patch workflow is disabled on `main` and `release/1.0`.
- UI regression runs on both `dev` and `main` as well as pull requests.
- Dev and live use different FTPS secret names.
- `release/1.0` remains a recovery/failsafe branch and does not auto-deploy.
- Credentials must remain in GitHub Actions secrets and must never be committed to the repository.
""")
