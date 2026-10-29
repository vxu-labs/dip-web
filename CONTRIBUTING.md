# Contributing to DIP Web

Thank you for helping make project history easier to understand.

## Choose the right repository

Use this repository for the public website, GitHub authentication, repository discovery and hosted workspace. Local hooks, the CLI, MCP tools and the local dashboard belong in [vxu-labs/dip](https://github.com/vxu-labs/dip).

For substantial features or compatibility changes, open an issue describing the problem and proposed behavior first. Small fixes can go directly to a pull request. Security issues should follow [SECURITY.md](SECURITY.md).

## Development workflow

1. Fork and clone the repository. Use Node.js 24 and run `npm ci`.
2. Create a branch for one focused change.
3. Run `npm run dev`. Signed-out development needs no production credentials.
4. Add regression coverage when changing authentication, authorization, event projection, caching or writes.
5. Run `npm test`, `npm run typecheck` and `npm run build`.
6. Stage the intended files and run `npm run check:publication` before committing.
7. Open a pull request explaining the problem, resulting behavior and validation. Include synthetic screenshots for visual changes and identify checks you could not run.

CI checks the publication boundary, tests, types and production build. Keep unrelated formatting and dependency upgrades in separate changes.

## Preserve the data contract

- Treat repository content as untrusted input; do not execute captured commands or plans.
- Preserve event identities, causal ancestry and visible conflict handling.
- Do not convert a saved summary, Stop event or partial check into verified completion.
- Keep provider tokens on the server and repository access scoped to the requesting user.
- Preserve non-forced writes and concurrency checks. Never overwrite intervening GitHub commits.
- Do not silently present partial or truncated history as complete.
- Use synthetic test fixtures, never exported sessions or customer repositories.

## Publishing hygiene

Do not commit environment files, keys, cookies, database files, deployment identities, logs, build output or captured `.dip` history. These can contain requests, local paths and private project data even when they contain no recognized token.

The checked-in hosting manifest is an example. Your `.openai/hosting.json` is local configuration and must remain ignored. Review your full diff and staged paths; secret scanners cannot understand every kind of confidential information.

By contributing, you agree that your original contribution is provided under Apache-2.0. Keep existing copyright and third-party license notices. Be respectful, make feedback specific and discuss the code rather than the person.
