import fs from "node:fs";
import path from "node:path";

const PACKAGE_NAME = "solidity-agent-toolkit";

let cachedRoot: string | undefined;

// Walks upward instead of using a fixed relative path because the module runs from both
// src/knowledge (tsx/vitest) and dist/src/knowledge (published build) at different depths.
export function findPackageRoot(
  startDir: string = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
): string {
  if (cachedRoot) return cachedRoot;
  let dir = startDir;
  for (;;) {
    const manifest = path.join(dir, "package.json");
    if (fs.existsSync(manifest)) {
      try {
        const { name } = JSON.parse(fs.readFileSync(manifest, "utf8")) as { name?: string };
        if (name === PACKAGE_NAME) {
          cachedRoot = dir;
          return dir;
        }
      } catch {
        // Unreadable manifest belongs to some other package; keep walking.
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not locate ${PACKAGE_NAME} package root from ${startDir}`);
    }
    dir = parent;
  }
}
