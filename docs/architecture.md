# Architecture

## Request flow

1. A visitor opens the landing page or signed-out dashboard.
2. `/api/github/auth` creates a short-lived PKCE request. `/api/github/callback` consumes the one-time state, obtains the user's token and stores an encrypted session in D1.
3. The browser calls `/api/dashboard`. The server lists authorized installations and repositories and detects committed `.dip/events` directories.
4. Project reads resolve a branch to a commit and a DIP tree. The browser requests bounded event batches and projects the task history.
5. Edits append native DIP events through the GitHub Git Data API. Expected-commit checks and non-forced reference updates reject concurrent changes.

## Source map

| Path | Purpose |
| --- | --- |
| `app/page.tsx`, `lib/landing.ts`, `public/` | Landing page and assets. |
| `app/dashboard/` | GitHub workspace and styling. |
| `app/api/github/` | Authorization, callback and sign-out routes. |
| `app/api/dashboard/route.ts` | Discovery, reads and task mutation dispatch. |
| `lib/auth.ts`, `lib/security.mjs` | Sessions, cryptography and request validation. |
| `lib/github.mjs` | Bounded REST and GraphQL access. |
| `lib/ledger.mjs` | Cloud projection of DIP's event protocol. |
| `lib/task-writes.mjs` | Validation and append-only GitHub commits. |
| `lib/workspace-cache.mjs` | Incremental cache reconciliation. |
| `db/`, `drizzle/` | Session schema and migrations, not database contents. |
| `build/`, `scripts/` | Sites/Vinext build and development integration. |

## Storage and privacy

GitHub is the source of committed project history. D1 stores OAuth state and encrypted sessions; it is not the project-history store. The browser retains snapshots, event blobs and preferences in account-scoped IndexedDB. Notes and favorites are browser-local data and do not create repository commits.

Sign-out and expired authorization clear account-local caches. This is application cleanup, not secure erasure of a device. No browser cache contains provider tokens by design.

## Bounded reads and honest results

Individual event reads are limited to 1 MiB, batches to 32 files and approximately 4 MiB, and provider responses to 16 MiB. Project task histories are capped at 20,000 events; editing one task is capped at 2,000 event files. Tree truncation, failed reads and malformed events are surfaced rather than silently omitted from a claim of completeness.

Recorded evidence is historical. The hosted app cannot validate the current local checkout, acquire local agent leases or run project checks. The projection is adapted from DIP protocol v1 / version 0.3.12; upstream event changes require compatibility review and tests.
