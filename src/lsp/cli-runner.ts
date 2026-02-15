import { spawn } from "node:child_process";

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function runCliAsync(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    stdin?: string;
    timeout?: number;
  },
): Promise<CliResult> {
  const timeout = options?.timeout ?? 60_000;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`CLI command timed out after ${timeout}ms: ${command} ${args.join(" ")}`));
    }, timeout);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    if (options?.stdin) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }
  });
}
