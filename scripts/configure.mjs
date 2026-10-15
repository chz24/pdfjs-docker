import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Keep the URL parser identical to the browser's URL parser.
function parseOrigins(value) {
  if (!value.trim()) {
    return [];
  }
  const origins = new Set();
  for (const [index, item] of value.split(",").entries()) {
    const entry = item.trim();
    const invalid = (reason) => {
      throw new Error(`PDFJS_ALLOWED_ORIGINS entry ${index + 1}: ${reason}`);
    };
    // This grammar also prevents injection into JSON and Nginx headers.
    if (!/^https?:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:.]+\])(?::[0-9]+)?$/i.test(entry)) {
      invalid("Use an HTTP or HTTPS origin. Omit paths, credentials, queries, fragments, and wildcards.");
    }
    let url;
    try {
      url = new URL(entry);
    } catch {
      invalid("The hostname or port is invalid.");
    }
    if (!url.hostname || url.origin === "null") {
      invalid("The hostname is invalid.");
    }
    // CSP source expressions do not support IPv6 literals.
    if (url.hostname.startsWith("[")) {
      invalid("Use a DNS hostname instead of an IPv6 address. CSP cannot permit an IPv6 source.");
    }
    const hostname = url.hostname.replace(/\.$/, "");
    if (hostname.length > 253 || hostname.split(".").some(label =>
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) {
      invalid("The hostname is invalid.");
    }
    origins.add(url.origin);
  }
  return [...origins];
}

try {
  const allowedOrigins = parseOrigins(process.env.PDFJS_ALLOWED_ORIGINS ?? "");
  const webRoot = process.env.PDFJS_WEB_ROOT ?? "/usr/share/nginx/html";
  const nginxRoot = process.env.PDFJS_NGINX_ROOT ?? "/etc/nginx/pdfjs";
  const policy = [
    "default-src 'none'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self' blob:",
    "style-src 'self'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "media-src blob:",
    `connect-src 'self' blob: ${allowedOrigins.join(" ")}`.trim(),
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
  ].join("; ");
  // Validate the entire list before writing either output.
  mkdirSync(webRoot, { recursive: true });
  mkdirSync(nginxRoot, { recursive: true });
  writeFileSync(join(webRoot, "runtime-config.json"), JSON.stringify({ allowedOrigins }) + "\n");
  writeFileSync(join(nginxRoot, "headers.conf"),
    `add_header Content-Security-Policy "${policy}" always;\n` +
    'add_header X-Content-Type-Options "nosniff" always;\n');
} catch (error) {
  console.error(`PDF.js startup failed: ${error.message}`);
  process.exitCode = 1;
}

