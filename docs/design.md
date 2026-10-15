# Containerized PDF.js design

Status: Accepted. The user confirmed the complete design on 2026-10-14.
Scope: Accepted design. See [implementation status](implementation.md) for current progress and unresolved requirements.

## Confirmed requirements

- Serve a PDF.js viewer from a container.
- Permit PDFs from the viewer origin.
- Permit PDFs from additional configured PDF source origins.
- Read the configuration from an environment variable at container startup.
- Apply configuration changes after a container restart.
- Let the browser request PDFs directly from their source servers.
- Require source servers to permit the viewer origin through CORS for requests across origins.
- Match complete origins explicitly. Do not support wildcard entries.
- Support PDFs without cookies or authorization headers. Signed URLs are acceptable.
- Use `PDFJS_ALLOWED_ORIGINS` with a comma-separated list of complete origins.
- An unset or empty variable permits only the viewer origin.
- Each entry contains a scheme, hostname, and optional port.
- Invalid entries stop container startup with a clear error.
- Retain the standard PDF.js viewer controls.
- Accept the PDF URL through the `file` query parameter at `/web/viewer.html`.
- Permit redirects only when each destination origin is the viewer origin or a configured PDF source origin.
- Let the deployment proxy handle HTTPS. Serve HTTP inside the container.
- Preserve PDF.js defaults when the `file` query parameter is absent.

Changing Docker environment variables requires container recreation with the updated values.
A restart of an existing container retains its previous environment.

Example: A viewer at `https://maindomain.com` accepts a PDF URL from `https://otherdomain.com` when configuration permits that source.

## Technical constraints

The generic PDF.js viewer checks the PDF URL origin against the viewer origin.
Its `HOSTED_VIEWER_ORIGINS` constant identifies viewer origins that bypass this check.
It does not list allowed PDF source origins.
Adding the deployment origin to that constant would bypass the check for every PDF source origin.

Browser CORS checks still apply when the viewer requests a PDF from another origin.
The PDF server must permit the viewer origin through CORS, or a server must proxy the PDF request.

Sources: [PDF.js viewer source](https://github.com/mozilla/pdf.js/blob/master/web/app.js), [PDF.js FAQ](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#can-i-load-a-pdf-from-another-server-cross-domain-request).

## Configuration example

```env
PDFJS_ALLOWED_ORIGINS=https://otherdomain.com,https://files.example.com
```

Example viewer URL:

```text
https://maindomain.com/web/viewer.html?file=https%3A%2F%2Fotherdomain.com%2Freport.pdf
```

## Accepted container architecture

Build the generic viewer from a pinned PDF.js source release in a separate build stage.
Apply a small source modification before the build.
The modification reads runtime configuration before it checks the PDF URL origin.
Keep the upstream viewer controls and generated assets.
The current generic viewer uses `compressed.tracemonkey-pldi-09.pdf` as its default PDF.
Preserve the default PDF behavior of the selected release.

Serve the generated distribution with Nginx.
At startup, validate `PDFJS_ALLOWED_ORIGINS` and generate a runtime configuration file.
Generate a Content Security Policy from the same validated list.
Permit the viewer origin and configured PDF source origins through `connect-src`.
Serve the appropriate policy on viewer responses and worker scripts.
Keep fonts, CMaps, and WASM resources inside the container.

Do not cache the generated runtime configuration.
New page loads receive the current configuration after a restart.
Existing viewer tabs retain their loaded configuration until the user reloads them.

The source modification checks the initial PDF URL.
The browser policy restricts network requests, including redirect destinations.
The deployment proxy must preserve the container's policy headers.

Build reference: [PDF.js build instructions](https://github.com/mozilla/pdf.js/blob/master/README.md#building-pdfjs).
Policy reference: [CSP connect-src](https://w3c.github.io/webappsec-csp/#directive-connect-src).
Default reference: [PDF.js viewer options](https://github.com/mozilla/pdf.js/blob/master/web/app_options.js).

## Validation plan

- Load a PDF from the viewer origin with no additional entries.
- Load a PDF from an explicit allowed origin whose server permits CORS.
- Reject an initial PDF URL from an unlisted origin.
- Reject a redirect to an unlisted origin.
- Permit a redirect between allowed origins when source servers permit CORS.
- Stop startup for malformed origins, paths, credentials, or wildcard entries.
- Preserve signed URL query parameters.
- Check standard viewer controls and local worker resources.
- Check policy changes after a restart and page reload.
- Preserve upstream behavior when no PDF URL exists.

## Implementation details

Select the exact PDF.js release and Nginx image version during implementation.

Implementation files exist. See [implementation status](implementation.md) for validation limits and the pending redirect policy decision.
