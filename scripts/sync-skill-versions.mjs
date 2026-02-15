#!/usr/bin/env node

/**
 * Syncs all skills/{name}/SKILL.md metadata.version to match package.json version.
 * Runs automatically via the "version" lifecycle hook in package.json.
 *
 * Usage:
 *   node scripts/sync-skill-versions.mjs          # reads version from package.json
 *   node scripts/sync-skill-versions.mjs 0.3.0    # explicit version override
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");

function getVersion() {
  const explicit = process.argv[2];
  if (explicit) {
    if (!/^\d+\.\d+\.\d+/.test(explicit)) {
      console.error(`Invalid version: ${explicit}`);
      process.exit(1);
    }
    return explicit;
  }
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  return pkg.version;
}

function getSkillFiles() {
  return readdirSync(SKILLS_DIR)
    .map((entry) => join(SKILLS_DIR, entry, "SKILL.md"))
    .filter((path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    });
}

function updateSkillVersion(filePath, version) {
  const content = readFileSync(filePath, "utf8");
  const updated = content.replace(/^(\s*version:\s*)"[^"]*"/m, `$1"${version}"`);

  if (content === updated) {
    console.log(`  skip  ${filePath} (no version field or already up to date)`);
    return false;
  }

  writeFileSync(filePath, updated, "utf8");
  return true;
}

const version = getVersion();
const files = getSkillFiles();
let changed = 0;

console.log(`Syncing skill versions to ${version}`);

for (const file of files) {
  const name = file.replace(SKILLS_DIR + "/", "");
  if (updateSkillVersion(file, version)) {
    console.log(`  done  ${name}`);
    changed++;
  }
}

console.log(`\n${changed}/${files.length} skills updated to ${version}`);
