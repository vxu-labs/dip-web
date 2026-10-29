# Security policy

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/vxu-labs/dip-web/security/advisories/new). Do not include credentials, session cookies, private repository contents or working exploits in public issues.

Describe the affected revision, impact, prerequisites and a minimal reproduction using synthetic data. Never test accounts or repositories you do not control. Maintainers will coordinate investigation and disclosure privately; no response-time commitment is implied.

Security fixes target the current `main` branch. There is no long-term support policy for older revisions.

Known dependency advisories in the initial release are documented in the [publication review](docs/publication-review.md#known-dependency-advisories). Publishing the source does not mean those advisories have been remediated.

## Security boundaries

- OAuth uses PKCE and a one-time state value tied to a Secure, HttpOnly cookie.
- Session IDs are opaque and hashed in D1. GitHub tokens are encrypted with AES-GCM using an operator-provided secret.
- Sessions last at most eight hours; refresh tokens are not persisted.
- Repository API calls use the requesting user's token. Browser responses do not include provider tokens.
- Writes require same-origin checks and a valid session, check repository push permission and append events using non-forced Git reference updates.
- The app does not execute commands from DIP history or establish new local verification evidence.
- Project data is cached in IndexedDB. Anyone with access to an unlocked browser profile may be able to inspect it.

The operator controls runtime secrets and session storage. Encryption at rest does not protect against compromise of the runtime and its key. The App's Contents permission is broader than the event paths the application writes.

## Safe operations

Keep credentials in runtime secret storage. Use an independent GitHub App and database for development. Retain secure cookie settings and an explicit canonical HTTPS origin. Do not log authorization headers, OAuth codes, state values, tokens, decrypted sessions or private event bodies.

If a credential is exposed, revoke or rotate it at its provider and invalidate affected sessions. Removing a file or Git commit does not revoke a credential. Review repository history, build artifacts and logs.

Automated tests and publication scans cover specific properties. They are not a penetration test or a promise that the software has no vulnerabilities.
