import { execFileSync, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileIntegrity } from "./artifact.mjs";
import { assertNotBehindLatest, getPublishTag, shouldPublish, validateTag } from "./policy.mjs";
import { getLatestVersion, getPublishedIntegrity, waitForIntegrity } from "./registry.mjs";

const artifactDir = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Pass the downloaded release artifact directory");
const [manifest, metadata] = await Promise.all([
  readFile("package.json", "utf8").then(JSON.parse),
  readFile(path.join(artifactDir, "release-package.json"), "utf8").then(JSON.parse),
]);
if (
  metadata.name !== manifest.name ||
  metadata.version !== manifest.version ||
  metadata.filename !== `${manifest.name}-${manifest.version}.tgz`
) {
  throw new Error("Release artifact metadata does not match package.json");
}
const tagSha = execFileSync(
  "git",
  ["rev-parse", `refs/tags/${process.env.GITHUB_REF_NAME}^{commit}`],
  { encoding: "utf8" },
).trim();
const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
validateTag({
  tag: process.env.GITHUB_REF_NAME,
  version: manifest.version,
  eventSha: process.env.GITHUB_SHA,
  tagSha,
  checkoutSha,
});
const archive = path.join(artifactDir, metadata.filename);
const actualIntegrity = await fileIntegrity(archive);
if (actualIntegrity !== metadata.integrity)
  throw new Error("Downloaded release archive failed its SHA-512 integrity check");

const existingIntegrity = await getPublishedIntegrity(manifest.name, manifest.version);
if (shouldPublish(existingIntegrity, metadata.integrity)) {
  const latest = await getLatestVersion(manifest.name);
  if (latest !== null) assertNotBehindLatest(manifest.version, latest);
  await publish(archive, getPublishTag(manifest.version));
  console.log(
    `npm publish accepted ${manifest.name}@${manifest.version}; waiting for registry visibility`,
  );
} else {
  console.log(
    `${manifest.name}@${manifest.version} already has the tested archive integrity; skipping publish`,
  );
}

await waitForIntegrity({
  packageName: manifest.name,
  version: manifest.version,
  integrity: metadata.integrity,
});
console.log(`Confirmed ${manifest.name}@${manifest.version} on npm`);

function publish(tarball, distTag) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npm",
      ["publish", tarball, "--ignore-scripts", "--provenance", "--tag", distTag],
      { stdio: "inherit" },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`npm publish failed (${signal ?? code})`));
    });
  });
}
