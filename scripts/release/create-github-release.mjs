import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileIntegrity } from "./artifact.mjs";
import { compareVersions, parseVersion, validateTag } from "./policy.mjs";

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
const tag = process.env.GITHUB_REF_NAME;
const eventSha = process.env.GITHUB_SHA;
const tagSha = execFileSync("git", ["rev-parse", `refs/tags/${tag}^{commit}`], {
  encoding: "utf8",
}).trim();
const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
validateTag({ tag, version: manifest.version, eventSha, tagSha, checkoutSha });
const archive = path.join(artifactDir, metadata.filename);
if ((await fileIntegrity(archive)) !== metadata.integrity)
  throw new Error("Downloaded release archive failed its SHA-512 integrity check");

let release = viewRelease(tag);
if (release === null) {
  const versions = JSON.parse(
    run("gh", [
      "release",
      "list",
      "--limit",
      "1000",
      "--exclude-drafts",
      "--exclude-pre-releases",
      "--json",
      "tagName",
    ]),
  );
  const prior = versions
    .map(({ tagName }) => (tagName.startsWith("v") ? tagName.slice(1) : ""))
    .filter((version) => {
      try {
        return parseVersion(version).prerelease === undefined;
      } catch {
        return false;
      }
    });
  const args = ["release", "create", tag, "--verify-tag", "--generate-notes"];
  if (parseVersion(manifest.version).prerelease !== undefined)
    args.push("--prerelease", "--latest=false");
  else if (prior.some((version) => compareVersions(manifest.version, version) < 0))
    args.push("--latest=false");
  else args.push("--latest");
  run("gh", args);
  release = viewRelease(tag);
  if (release === null) throw new Error(`GitHub Release ${tag} was not visible after creation`);
}
validateRelease(release);

const existingAsset = release.assets.find((asset) => asset.name === metadata.filename);
if (existingAsset) {
  await verifyAsset();
} else {
  run("gh", ["release", "upload", tag, archive]);
  release = viewRelease(tag);
  if (release === null) throw new Error(`GitHub Release ${tag} disappeared after asset upload`);
  validateRelease(release);
  if (!release.assets.some((asset) => asset.name === metadata.filename))
    throw new Error(`GitHub Release ${tag} did not retain ${metadata.filename}`);
  await verifyAsset();
  console.log(`Uploaded ${metadata.filename} to GitHub Release ${tag}`);
}

function validateRelease(current) {
  const expectedPrerelease = parseVersion(manifest.version).prerelease !== undefined;
  if (current.tagName !== tag || current.isDraft || current.isPrerelease !== expectedPrerelease) {
    throw new Error(
      `GitHub Release ${tag} does not match the expected published tag and prerelease status`,
    );
  }
}

async function verifyAsset() {
  const downloadDir = await mkdtemp(path.join(os.tmpdir(), "toolkit-release-asset-"));
  try {
    run("gh", ["release", "download", tag, "--pattern", metadata.filename, "--dir", downloadDir]);
    const downloaded = await fileIntegrity(path.join(downloadDir, metadata.filename));
    if (downloaded !== metadata.integrity)
      throw new Error(`GitHub Release ${tag} already has a different ${metadata.filename} asset`);
  } finally {
    await rm(downloadDir, { recursive: true, force: true });
  }
}

function viewRelease(releaseTag) {
  const result = spawnSync(
    "gh",
    ["release", "view", releaseTag, "--json", "tagName,assets,isDraft,isPrerelease"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status === 0) return JSON.parse(result.stdout);
  if (/release not found|HTTP 404/i.test(`${result.stderr}\n${result.stdout}`)) return null;
  throw new Error(`gh release view failed: ${result.stderr || result.stdout}`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  return result.stdout;
}
