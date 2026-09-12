# Development and Live Environments

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
