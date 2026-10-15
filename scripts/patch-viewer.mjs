import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [sourceRoot, policySource] = process.argv.slice(2);
if (!sourceRoot || !policySource) {
  throw new Error("Usage: node patch-viewer.mjs SOURCE_ROOT POLICY_SOURCE");
}
const appPath = join(sourceRoot, "web/app.js");
const htmlPath = join(sourceRoot, "web/viewer.html");
let app = readFileSync(appPath, "utf8");
const start = app.indexOf("  const HOSTED_VIEWER_ORIGINS = new Set([");
const end = app.indexOf("  // eslint-disable-next-line no-var\n  var onFileInputChange", start);
if (start === -1 || end === -1 || app.includes('from "./origin_policy.js"')) {
  throw new Error("The PDF.js origin check changed. Review the patch before building.");
}
const validator = `  // eslint-disable-next-line no-var
  var validateFileURL = function (file) {
    try {
      validatePdfOrigin(file);
    } catch (ex) {
      PDFViewerApplication._documentError("pdfjs-loading-error", {
        message: ex.message,
      });
      throw ex;
    }
  };
`;
app = app.slice(0, start) + validator + app.slice(end);
app = 'import { validatePdfOrigin } from "./origin_policy.js";\n' + app;

// PDF.js emits its generic CSP as a meta element. Nginx supplies the policy.
const html = readFileSync(htmlPath, "utf8");
const genericPolicy = /    <!--<meta\n      http-equiv="Content-Security-Policy"\n      content="default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self'; img-src 'self' blob: data:; media-src blob:; font-src 'self' data:; connect-src \* blob: data:; base-uri 'none'; form-action 'none';"\n    \/>-->/;
if (!genericPolicy.test(html)) {
  throw new Error("The PDF.js generic policy changed. Review the patch before building.");
}
writeFileSync(appPath, app);
writeFileSync(htmlPath, html.replace(genericPolicy, "    <!-- Nginx supplies the runtime Content Security Policy. -->"));
copyFileSync(policySource, join(sourceRoot, "web/origin_policy.js"));

