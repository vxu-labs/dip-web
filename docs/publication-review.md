# Public-source release review

Date: 2026-10-29. Scope: the initial public source release of DIP Web.

## Publication boundary

The public repository begins with a fresh source snapshot. Earlier private deployment history was not imported because it contains operational activity that is unsuitable for public distribution. The original local history is retained separately; no history was destroyed.

Excluded from the public snapshot:

- Captured DIP requests, tool activity, intent history and local integration metadata.
- Production Site identity and operator-specific hosting configuration.
- Environment values, credentials, private keys and session data.
- Database files, runtime state, logs, generated output and dependency installations.

The source includes schema migrations, empty environment examples, a portable DIP check configuration and a deployment-neutral hosting template. Captured DIP records remain ignored even when Git hooks stage the configuration. The retained dashboard image was visually reviewed and contains synthetic local-demo data. It does not show a signed-in user's private repositories.

## Validation

- Reviewed all 12 commits in the original local history for publication risks. Gitleaks reported two secret-like matches in captured operational activity; none of that history is part of this public repository. These matches were not established to be live credentials.
- Gitleaks 8.30.1 reported zero findings in the clean source candidate. The scanner distribution was verified against its published checksum.
- The publication boundary check passed for staged source. It rejects operational paths and selected sensitive content, including when the working copy differs from staged data.
- All 28 automated tests passed, with no skipped or failed tests.
- TypeScript checking and the production Vinext build passed from the clean checkout.
- Third-party notices were retained; an Apache-2.0 license and NOTICE were added for the public release.

CI runs publication checks, regression tests, type checking, the build and a full-history Gitleaks scan. Dependency advisories are a separate finding below, not a passing security result.

## Known dependency advisories

The initial locked dependency tree has **26 packages reported by npm audit: 1 critical, 15 high, 9 moderate and 1 low**. Counts include development tooling and transitive dependencies; they are not a count of independently confirmed exploitable application flaws.

The critical report concerns the direct Next.js dependency. Other reports include React server components, Vinext, Vite, Cloudflare tooling and transitive packages. The detailed, machine-independent report is in [dependency-audit.json](dependency-audit.json), with advisory links and the registry's proposed fixes.

This publication preserves the existing application's dependency versions. Framework upgrades need compatibility and authenticated-flow testing; some suggested fixes involve major version changes or downgrades. **Do not treat this source release as production security clearance. Address applicable advisories before a new production deployment.** Existing deployments need a separate dependency-remediation review.

## Limits

Secret scanners cannot prove the absence of every confidential value. This review did not include a penetration test, new authenticated production-flow testing or a production deployment. Documentation distinguishes application-enforced event paths from GitHub's broader Contents permission. The hosted app's deployment lifecycle remains separate from source publication.
