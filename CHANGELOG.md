# Release notes

## 0.1.0 — 2026-10-29

Initial public source release of the DIP website and GitHub workspace.

### Included

- GitHub App authorization, expiring server-side sessions and repository discovery.
- Committed DIP history projection with causal ancestry and conflict reporting.
- Task list and board views, filtering, priorities, due dates and activity history.
- Task creation and updates through GitHub commits with concurrency protection.
- Account-scoped browser snapshots, notes and favorites with incremental synchronization.
- Synthetic regression tests for security primitives, GitHub reads, event projection, task writes and caching.

### Publication preparation

- Fresh public Git history excludes private operational records and deployment identity.
- Added license notices, contributor guidance, architecture and deployment documentation.
- Added safe local configuration setup, CI and publication boundary checks.

### Known boundaries

Only committed GitHub data is visible. Local agent capture, live ownership and fresh verification remain responsibilities of the DIP engine. GitHub sign-in requires operator configuration and HTTPS. Writes require installation approval, account permissions and compatible branch rules. This source release does not automatically update the hosted application.
