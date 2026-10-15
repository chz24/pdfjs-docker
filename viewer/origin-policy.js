const response = await fetch(new URL("../runtime-config.json", window.location.href), {
  cache: "no-store",
  credentials: "omit",
  redirect: "error",
});
if (!response.ok) {
  throw new Error("PDF.js runtime configuration could not load.");
}
const configuration = await response.json();
if (!Array.isArray(configuration.allowedOrigins) ||
    configuration.allowedOrigins.some(origin => {
      try {
        const url = new URL(origin);
        return !["http:", "https:"].includes(url.protocol) || url.origin !== origin;
      } catch {
        return true;
      }
    })) {
  throw new Error("PDF.js runtime configuration is invalid.");
}
const allowedOrigins = new Set(configuration.allowedOrigins);

export function validatePdfOrigin(file) {
  if (!file) {
    return;
  }
  const url = new URL(file, window.location.href);
  if (!["http:", "https:"].includes(url.protocol) ||
      url.username || url.password ||
      (url.origin !== window.location.origin && !allowedOrigins.has(url.origin))) {
    throw new Error("The PDF source origin is not allowed.");
  }
}

