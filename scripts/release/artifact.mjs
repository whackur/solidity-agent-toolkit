import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function fileIntegrity(filePath) {
  return `sha512-${createHash("sha512")
    .update(await readFile(filePath))
    .digest("base64")}`;
}
