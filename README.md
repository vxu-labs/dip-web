# DIP Web

**Project memory for development that moves at the speed of AI.**

DIP Web brings the history recorded by [DIP](https://github.com/vxu-labs/dip) into a GitHub-connected workspace. Explore the requests, tasks, plans and activity committed alongside your code, and pick up where the work left off.

Think of it as archaeology for AI-assisted development: a way to reconstruct how a project changed as people and agents worked on it.

[Hosted application](https://dip.vxu.me/dashboard) · [DIP engine](https://github.com/vxu-labs/dip) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

## What you can do

- Sign in with GitHub and choose repositories through the GitHub App.
- Discover repositories with committed `.dip/events` on their default branch.
- Browse tasks in a list or board, with status filters, priorities, due dates and search.
- Inspect recorded history and commit links, including incomplete or conflicting records.
- Create and update tasks by appending DIP events to a GitHub branch, when your account and App installation have write access.
- Keep account-scoped snapshots, view preferences, notes and favorites in your browser. Incremental synchronization reuses unchanged event blobs.

## How this relates to DIP

| Project | Responsibility |
| --- | --- |
| [DIP](https://github.com/vxu-labs/dip) | Local capture, agent integrations, ownership coordination, configured checks and the local dashboard. |
| **DIP Web — this repository** | Public website, GitHub sign-in, repository discovery and the hosted task workspace. |

The web app reads **committed GitHub data**. It cannot see uncommitted local work, run local checks or provide live ownership coordination across machines. Recorded verification is historical evidence, not a new verification of current code. Browser edits cannot mark a task verified.

## Run locally

Use Node.js 22.13 or newer; CI uses Node.js 24. Dependencies are locked with npm.

```sh
git clone https://github.com/vxu-labs/dip-web.git
cd dip-web
npm ci
npm run dev
```

The development server uses port `5173`. `dev`, `typecheck` and `build` create an ignored local hosting configuration from the committed example when needed; existing configuration is never overwritten.

Without runtime credentials, the landing page and signed-out workspace are available. GitHub sign-in requires your own GitHub App, an HTTPS origin, a D1 database and runtime secrets. There is no mock GitHub user or bundled access token. See [deployment and GitHub App setup](docs/deployment.md).

```sh
npm test
npm run typecheck
npm run build
npm run check:publication
```

The publication check runs in a Git checkout and rejects tracked operational data and selected sensitive patterns. It complements secret scanning and manual review; it cannot guarantee that arbitrary data is safe to publish.

## Data and access

Repository requests use the signed-in user's GitHub token. D1 stores expiring OAuth state and sessions; provider tokens are encrypted at rest and stay on the server. No shared organization token is required.

Project snapshots and personal notes are stored in account-scoped IndexedDB on the current browser. Sign-out and expired authorization clear that account's cache. Use sign-out on shared devices. Repository writes create Git commits and remain subject to GitHub permissions and branch protection.

The GitHub App's **Contents: read and write** permission covers repository contents. The application limits task writes to new `.dip/events` files, but that is an application boundary, not a narrower GitHub permission.

## Architecture and project status

React and Vinext provide the interface and routes; Cloudflare Workers and D1 provide the server runtime and session storage. This repository includes the Sites build integration. Production deployment requires operator-owned infrastructure and credentials.

- [Architecture and data flow](docs/architecture.md)
- [Deployment guide](docs/deployment.md)
- [Release notes](CHANGELOG.md)
- [Public-source release review](docs/publication-review.md)

This is experimental software. API limits and incomplete histories are reported explicitly. Dedicated user/model attribution is a roadmap direction, not a completed capability. The hosted deployment and this source repository have separate release lifecycles; publishing a source change does not deploy it automatically.

**Deployment note:** the inherited dependency lockfile has reported security advisories, including a critical Next.js finding. Read the [release review](docs/publication-review.md#known-dependency-advisories) before operating a new deployment.

## Contribute

Bug reports, accessibility improvements, tests and documentation are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report vulnerabilities privately through [GitHub security advisories](https://github.com/vxu-labs/dip-web/security/advisories/new).

## License

Apache-2.0 for original DIP Web code. See [LICENSE](LICENSE), [NOTICE](NOTICE) and [third-party attribution](content/ATTRIBUTION.md) for retained upstream notices. VXU Labs maintains DIP Web as an independent project; it is not affiliated with GitHub, Cloudflare, OpenAI or Anthropic.
