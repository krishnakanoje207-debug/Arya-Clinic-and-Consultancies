/**
 * Minimal ESM resolve hook that maps the project's "@/*" import alias (defined
 * in jsconfig.json) onto ./src/* so plain Node scripts (e.g. the e2e tests) can
 * import the app's own modules — which webpack/Next resolve via that alias but
 * raw Node cannot. Register with:
 *   node --import ./scripts/alias-loader.register.mjs …
 * or inline via module.register (see e2e-medications.mjs).
 */
import { existsSync, statSync } from "node:fs";
import { extname, dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rest = specifier.slice(2);
    const base = pathResolve(process.cwd(), "src", rest);
    const candidates = [base, `${base}.js`, pathResolve(base, "index.js")];
    for (const cand of candidates) {
      if (existsSync(cand) && statSync(cand).isFile()) {
        return nextResolve(pathToFileURL(cand).href, context);
      }
    }
  }
  // Extensionless relative imports (the app's own convention, resolved by
  // Next/webpack but not raw Node): fall back to .js / index.js so scripts can
  // import app modules that use them (e.g. src/lib/notify/*).
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !extname(specifier) &&
    context.parentURL
  ) {
    const base = pathResolve(dirname(fileURLToPath(context.parentURL)), specifier);
    for (const cand of [`${base}.js`, pathResolve(base, "index.js")]) {
      if (existsSync(cand) && statSync(cand).isFile()) {
        return nextResolve(pathToFileURL(cand).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
