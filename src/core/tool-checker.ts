import { execSync } from "child_process";

/**
 * Check if a CLI command is available on the system PATH.
 * Runs `command --version` silently — returns true if it exits 0, false otherwise.
 */
export function isCliAvailable(command: string): boolean {
  try {
    execSync(`${command} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
