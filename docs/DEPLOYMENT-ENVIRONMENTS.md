# Development and Live Environments

Athletics Manager uses two active deployment environments on the same hosting account.

## Development

- Branch: `dev`
- Purpose: integration, QA and tester verification before production
- Site: `dev.athleticsmanagergame.com`
- Workflow: `.github/workflows/deploy-dev.yml`
- Connection: reuses the existing production FTPS connection secrets (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, optional `FTP_PORT`)
- Destination: uses a separate required `DEV_FTP_REMOTE_DIR` secret pointing at the dev subdomain document root
- Changes arrive from short-lived feature/fix branches through pull requests.

The development and live sites share the same hosting connection, but they must never share the same remote directory. `DEV_FTP_REMOTE_DIR` is therefore required and has no production fallback.

## Production

- Branch: `main`
- Purpose: public/closed-alpha live build
- Site: `athleticsmanagergame.com`
- Workflow: `.github/workflows/deploy-live.yml`
- Deployment secrets: existing `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, optional `FTP_PORT`, optional `FTP_REMOTE_DIR`
- `main` should receive tested promotions from `dev`, not ordinary feature/fix work directly.

## Promotion flow

1. Create a short-lived branch from `dev`.
2. Implement and run regression checks.
3. Merge the pull request into `dev`.
4. GitHub deploys `dev` to the development subdomain.
5. Test the exact dev build on iPad/browser.
6. Open a promotion pull request from `dev` to `main`.
7. After regression passes and the promotion is approved, merge to `main`.
8. GitHub deploys that exact promoted commit to the live site.

## Guardrails

- The staged `.am-update` patch workflow is disabled on `main` and `release/1.0`.
- UI regression runs on both `dev` and `main` as well as pull requests.
- Dev and live share FTP credentials but use different document roots.
- `DEV_FTP_REMOTE_DIR` is mandatory for development deployment and never defaults to the live directory.
- `release/1.0` remains a recovery/failsafe branch and does not auto-deploy.
- Credentials must remain in GitHub Actions secrets and must never be committed to the repository.
