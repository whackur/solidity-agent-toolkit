import { spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fileIntegrity } from "./artifact.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Pass the release artifact directory");
await mkdir(outputDir, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
const result = spawnSync(
  "npm",
  ["pack", "--ignore-scripts", "--json", "--pack-destination", outputDir],
  {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  },
);
if (result.error) throw result.error;
if (result.status !== 0)
  throw new Error(`npm pack failed (${result.status}): ${result.stderr || result.stdout}`);

const packed = JSON.parse(result.stdout);
if (
  !Array.isArray(packed) ||
  packed.length !== 1 ||
  packed[0].name !== manifest.name ||
  packed[0].version !== manifest.version
) {
  throw new Error("npm pack did not produce the expected single package archive");
}
const filename = path.basename(packed[0].filename);
if (filename !== `${manifest.name}-${manifest.version}.tgz`)
  throw new Error(`Unexpected npm archive name: ${filename}`);
const archive = path.join(outputDir, filename);
await stat(archive);
const integrity = await fileIntegrity(archive);
await writeFile(
  path.join(outputDir, "release-package.json"),
  `${JSON.stringify({ name: manifest.name, version: manifest.version, filename, integrity }, null, 2)}\n`,
  { flag: "wx" },
);
if (process.env.GITHUB_OUTPUT) {
  await writeFile(
    process.env.GITHUB_OUTPUT,
    `filename=${filename}\nintegrity=${integrity}\narchive=${archive}\n`,
    { flag: "a" },
  );
}
console.log(`Prepared ${filename} (${integrity})`);
