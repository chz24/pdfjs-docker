# Containerized PDF.js

This container serves the standard PDF.js viewer through Nginx.
The browser requests PDFs directly from their source servers.

## Start the viewer

1. Install Docker with Compose.
2. Build and start the container:

   ```sh
   docker compose up --build -d
   ```

3. Open `http://localhost:8080/web/viewer.html`.

Without a `file` parameter, the viewer opens the upstream example PDF.
The container retains the upstream viewer controls, worker, fonts, CMaps, and WASM files.

## Permit PDF source origins

Set `PDFJS_ALLOWED_ORIGINS` to a comma-separated list of HTTP or HTTPS origins.
Each origin contains a scheme, hostname, and optional port.
Use DNS names or IPv4 addresses. Use Punycode for international hostnames.
The startup validator rejects IPv6 source addresses because CSP cannot represent them.

```sh
PDFJS_ALLOWED_ORIGINS=https://files.example.com,https://archive.example.com:8443 \
  docker compose up -d --force-recreate
```

An unset or empty variable permits PDFs from the viewer origin only.
The validator ignores spaces around entries and removes duplicate origins.
It normalizes hostname case and default ports with the standard URL parser.
It rejects paths, credentials, queries, fragments, wildcard entries, and empty list entries.
Invalid configuration stops container startup.

The viewer accepts the PDF URL through the `file` query parameter:

```text
https://viewer.example.com/web/viewer.html?file=https%3A%2F%2Ffiles.example.com%2Freport.pdf
```

Use `encodeURIComponent(pdfUrl)` to encode the complete PDF URL, including signed query parameters.
The viewer does not remove query parameters from the PDF URL.

Construct a viewer URL with the standard URL API:

```js
// pdfUrl contains the complete URL from the PDF source server.
const viewerUrl = new URL("http://localhost:8081/web/viewer.html");
viewerUrl.searchParams.set("file", pdfUrl);
window.location.assign(viewerUrl.href);
```

Pass the original PDF URL to `searchParams.set()`. This method encodes the value automatically.
Do not encode the PDF URL before you pass it to this method.

Do not append an unencoded signed URL directly after `?file=`.
Each `&` starts another viewer parameter and removes that parameter from the PDF URL.
The source server can return `403` when required signing parameters are missing.
Use a new signed URL if the original URL expired.

The PDF source server must permit the viewer origin through CORS.
Use public URLs or signed URLs. This deployment does not configure authentication headers.

## Apply configuration changes

Recreate the container when you change its environment variables:

```sh
PDFJS_ALLOWED_ORIGINS=https://new-files.example.com \
  docker compose up -d --force-recreate
```

Startup generates `/runtime-config.json` and the policy headers from the same validated list.
Nginx serves the runtime configuration with `Cache-Control: no-store`.
A restart generates the files again but retains the container's existing environment.
Reload existing viewer tabs to receive the new configuration.

## Deployment

The container serves HTTP on port 80.
Configure HTTPS on the deployment proxy.
Preserve the container's `Content-Security-Policy` headers on viewer and worker responses.
The `/healthz` endpoint returns `200` when Nginx serves requests.

The viewer checks the complete origin of the initial PDF URL.
CSP restricts network requests and redirect destinations.
However, CSP permits upgrades from HTTP to HTTPS for matching hosts and ports.
This exception also applies to an HTTP viewer's `'self'` policy.
The accepted design's exact-origin requirement therefore remains unresolved for those redirects.
See [implementation status](docs/implementation.md) before deployment.

## Build inputs

- PDF.js: `v6.3.289`, built with upstream `npm ci` and `gulp generic`.
- Build image: `node:24.14.0-alpine3.23`.
- Server image: `nginx:1.30.5-alpine3.24`.

The source patch removes the hosted-viewer bypass and adds runtime origin checks.
The patch stops the build if its upstream source markers change.
Nginx supplies the runtime policy instead of the upstream generic policy element.
The distribution includes the upstream Apache license.

## Local checks

```sh
node --check scripts/configure.mjs
node --check scripts/patch-viewer.mjs
node --experimental-default-type=module --check viewer/origin-policy.js
sh -n scripts/40-pdfjs-config.sh
```

See the [accepted design](docs/design.md) for the validation scenarios.

