# Implementation status

Date: 2026-10-14.
Status: Implementation files exist. Deployment validation remains incomplete.

## Implemented files

- `Dockerfile` builds a pinned PDF.js release and serves its distribution through Nginx.
- `compose.yaml` provides a local deployment on port 8080.
- `scripts/configure.mjs` validates configured origins and generates runtime JSON and policy headers.
- `scripts/40-pdfjs-config.sh` generates configuration before Nginx starts.
- `scripts/patch-viewer.mjs` replaces the generic viewer's initial origin check before the build.
- `viewer/origin-policy.js` loads runtime configuration before it permits an initial PDF URL.
- `nginx/default.conf` serves the viewer, worker, resources, and uncached runtime configuration.

## Architecture issue

The accepted design requires complete origin matches for every redirect destination.
CSP does not guarantee this requirement for HTTP origins.
Its source matching rules permit HTTP-to-HTTPS upgrades for matching hosts and ports.
Its `'self'` rule also permits secure upgrades for HTTP viewer origins.

The browser's Fetch API cannot expose every cross-origin redirect destination to application code.
The implementation therefore cannot guarantee exact matches with the accepted CSP architecture.
The user must select a policy exception or revise the architecture before this requirement can close.
The current files retain the accepted CSP approach while that decision remains pending.

The validator rejects configured IPv6 literals because CSP source expressions cannot represent them.
This restriction requires DNS names for PDF sources that use IPv6.

References:

- [CSP source matching](https://w3c.github.io/webappsec-csp/#scheme-part-matching).
- [CSP host matching](https://w3c.github.io/webappsec-csp/#host-part-matching).
- [Pinned PDF.js viewer source](https://github.com/mozilla/pdf.js/blob/v6.3.289/web/app.js).

## Environment limits

The implementation environment denies access to the Docker daemon.
Shell commands cannot resolve public download hosts.
The environment also denies creation of `.git` in this folder.

These limits prevent a container build, container integration checks, and a repository commit.
No automated tests exist yet because the user did not confirm the proposed test interfaces.
The TDD skill requires this agreement before the agent writes tests.
No TypeScript compiler or project typecheck configuration exists in this folder.

Local syntax checks pass for both Node scripts, the browser module, and the startup shell script.
A startup example generated canonical origins and matching policy headers.
A PDF URL with a path caused startup validation to fail with a clear error.
The STE linter found no structural violations in the new documentation.
The lint command disables the synonym rule because configuration validation and code checks name different actions.
Docker Compose configuration validation passes.

## Review results

The code-review skill reviewed standards and specification coverage in separate agents.
The standards review found no actionable issues.
The specification review identified two unresolved requirements:

- CSP permits HTTP-to-HTTPS upgrades, so redirect matching is not always exact.
- Startup rejects configured IPv6 literals, which the accepted design does not exclude.

Both findings require a design decision. Neither finding is complete.
The agents reviewed the new files directly because the folder has no Git history.

## Remaining checks

1. Resolve the redirect policy with the user.
2. Confirm the startup and browser interfaces for tests.
3. Build the image in an environment with Docker and network access.
4. Execute every applicable scenario in `docs/design.md`.
5. Check generated resource paths and standard viewer controls in a browser.
6. Commit the implementation after Git becomes writable.
