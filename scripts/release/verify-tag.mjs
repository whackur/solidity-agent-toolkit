import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { validateTag } from "./policy.mjs";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
const tag = process.env.GITHUB_REF_NAME;
if (!tag || !process.env.GITHUB_SHA) throw new Error("GITHUB_REF_NAME and GITHUB_SHA are required");
const tagSha = execFileSync("git", ["rev-parse", `refs/tags/${tag}^{commit}`], {
  encoding: "utf8",
}).trim();
const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
validateTag({ tag, version, eventSha: process.env.GITHUB_SHA, tagSha, checkoutSha });
console.log(`Verified ${tag} at ${tagSha}`);
