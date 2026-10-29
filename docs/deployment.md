# Deployment and GitHub App setup

The production architecture uses Cloudflare Workers, D1 and the Sites build integration. This repository contains source and templates, not credentials, database contents or the hosted application's deployment identity.

## Local configuration

Run `npm run setup` to create `.openai/hosting.json` from `.openai/hosting.example.json`. This ignored file declares the D1 binding `DB`. The example has no production project ID; a deployment operator registers their own Site and configures the returned identity locally. Setup leaves existing configuration untouched.

`npm run dev` provides signed-out development without credentials. The Sites preview helpers do not create a GitHub identity or bypass the session requirement.

## GitHub App

Create an App you control. To support multiple users, make it available for installation by other accounts.

- Homepage: your HTTPS application origin.
- Callback: `https://your-domain.example/api/github/callback`.
- Setup URL: `https://your-domain.example/dashboard`.
- Repository permissions: Metadata read; Contents read and write for task editing. Contents read alone supports a read-only deployment, but writes will fail.
- Keep expiring user access tokens enabled. Disable webhooks; the app does not consume webhook deliveries.

Users authorize their own identity and install the App on selected repositories. An organization installation does not give arbitrary users access to every organization repository.

**Before using another domain, update the canonical `origin` in `lib/auth.ts`.** The supplied source uses `https://dip.vxu.me`. It is fixed deliberately for callback and same-origin validation; do not derive it from an untrusted request header. OAuth and secure host cookies require HTTPS. This release does not offer a complete authenticated localhost workflow.

## Runtime configuration

| Name | Purpose | Handling |
| --- | --- | --- |
| `DB` | D1 database binding | Operator-created database, migrated before sign-in. |
| `GITHUB_CLIENT_ID` | Your GitHub App client ID | Runtime configuration. |
| `GITHUB_APP_SLUG` | Your App's URL slug | Runtime configuration. |
| `GITHUB_CLIENT_SECRET` | OAuth client secret | Runtime secret storage only. |
| `DIP_SESSION_KEY` | Token encryption key | Runtime secret storage only; generate 32 random bytes encoded as base64url. |

`.env.example` lists variable names with empty values. It is documentation, not a secret distribution mechanism. The application reads Cloudflare runtime bindings; filling a shell environment file does not provision hosted bindings.

Apply the SQL migrations in `drizzle/` through the deployment platform's D1 migration workflow. They create OAuth state and session tables. Never copy a development database or production export into Git.

## Build and release

1. Run `npm ci`, `npm test`, `npm run typecheck` and `npm run build` on a reviewed commit.
2. Register or select your Site, configure its identity in local hosting configuration, and provision the `DB` binding and secrets.
3. Use Sites deployment tooling to synchronize source, package the build, apply migrations and deploy. Production binding IDs come from the platform; the Vite database ID is a local placeholder.
4. Verify sign-in, installation selection, discovery and sign-out on the intended HTTPS domain. Test writes and concurrent-change rejection in a disposable repository.
5. Record the deployed revision privately. Publishing source to GitHub alone does not deploy the app.

The repository does not include a turnkey standalone Wrangler production deployment. If adapting it for one, configure real bindings and migrations and test the origin and session behavior explicitly.

## Operations

Keep backups and deployment metadata outside the public repository. Monitor errors and rate limits without logging tokens or private event bodies. Encryption-key rotation requires invalidating existing sessions and asking users to sign in again.
