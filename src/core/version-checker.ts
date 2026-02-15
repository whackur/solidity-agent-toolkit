import { createRequire } from "module";

const PACKAGE_NAME = "solidity-agent-toolkit";
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
const FETCH_TIMEOUT_MS = 5000;

export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export function getCurrentVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require("../../package.json") as { version: string };
  return pkg.version;
}

export async function fetchLatestVersion(): Promise<string> {
  const response = await fetch(REGISTRY_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`npm registry returned ${response.status}`);
  }

  const data = (await response.json()) as { version: string };
  return data.version;
}

export function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split(".").map(Number);
  const latestParts = latest.split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] ?? 0;
    const l = latestParts[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  return false;
}

export async function checkForUpdates(): Promise<VersionCheckResult | null> {
  const currentVersion = getCurrentVersion();
  const latestVersion = await fetchLatestVersion();
  const updateAvailable = isNewerVersion(currentVersion, latestVersion);

  return { currentVersion, latestVersion, updateAvailable };
}

const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function boxify(lines: string[], padding: number = 2): string {
  const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
  const contentWidth = Math.max(...lines.map((l) => stripAnsi(l).length)) + padding * 2;
  const pad = " ".repeat(padding);

  const top = `${YELLOW}╭${"─".repeat(contentWidth)}╮${RESET}`;
  const bottom = `${YELLOW}╰${"─".repeat(contentWidth)}╯${RESET}`;
  const empty = `${YELLOW}│${" ".repeat(contentWidth)}│${RESET}`;

  const body = lines.map((line) => {
    const visible = stripAnsi(line).length;
    const right = " ".repeat(contentWidth - padding - visible);
    return `${YELLOW}│${RESET}${pad}${line}${right}${YELLOW}│${RESET}`;
  });

  return ["\n", top, empty, ...body, empty, bottom, "\n"].join("\n");
}

export function formatUpdateMessage(result: VersionCheckResult): string {
  return boxify([
    `${BOLD}Update available${RESET}  ${DIM}${result.currentVersion}${RESET} → ${GREEN}${result.latestVersion}${RESET}`,
    `${CYAN}npm i -g ${PACKAGE_NAME}${RESET}`,
  ]);
}

export function notifyIfUpdateAvailable(): void {
  checkForUpdates()
    .then((result) => {
      if (result?.updateAvailable) {
        process.stderr.write(formatUpdateMessage(result));
      }
    })
    .catch(() => {});
}
