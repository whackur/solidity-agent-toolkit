import { execFile, type ChildProcess } from "node:child_process";

export const DIAGRAM_TIMEOUT_MS = 60_000;
export const DIAGRAM_PROCESS_MAX_BUFFER = 1024 * 1024;

export function runDiagramProcess(
  executable: string,
  args: readonly string[],
  options: { env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DIAGRAM_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    let timedOut = false;
    let child: ChildProcess | undefined;
    const timeout = setTimeout(() => {
      timedOut = true;
      child?.kill("SIGKILL");
    }, timeoutMs);

    try {
      child = execFile(
        executable,
        [...args],
        {
          env: options.env,
          maxBuffer: DIAGRAM_PROCESS_MAX_BUFFER,
          windowsHide: true,
        },
        (error, _stdout, stderr) => {
          if (timeout) clearTimeout(timeout);
          if (!error) {
            resolve();
            return;
          }

          if (timedOut) {
            reject(new Error(`sol2uml-light exceeded the ${timeoutMs / 1000}-second time limit`));
          } else if (error.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
            reject(new Error("sol2uml-light output exceeded the 1 MiB process limit"));
          } else {
            const details = typeof stderr === "string" ? stderr.trim().slice(0, 1_000) : "";
            reject(new Error(details || `sol2uml-light failed: ${error.message}`));
          }
        },
      );
    } catch (error) {
      clearTimeout(timeout);
      reject(new Error(`Could not start sol2uml-light: ${describeError(error)}`));
    }
  });
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
