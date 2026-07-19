/**
 * Minimal ESM resolve hook that maps the project's "@/*" import alias (defined
 * in jsconfig.json) onto ./src/* so plain Node scripts (e.g. the e2e tests) can
 * import the app's own modules — which webpack/Next resolve via that alias but
 * raw Node cannot. Register with:
 *   node --import ./scripts/alias-loader.register.mjs …
 * or inline via module.register (see e2e-medications.mjs).
 */
import { existsSync, statSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { pathToFileURL } from "node:url";

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
  return nextResolve(specifier, context);
}
