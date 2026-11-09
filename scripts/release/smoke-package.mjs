import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const archive = process.argv[2] ? path.resolve(process.argv[2]) : "";
assert.ok(archive, "Usage: node scripts/release/smoke-package.mjs ABS_TARBALL");
assert.ok((await stat(archive)).isFile(), `Tarball not found: ${archive}`);
const consumer = await mkdtemp(path.join(os.tmpdir(), "solidity-agent-toolkit-consumer-"));

function terminate(child) {
  if (!child.pid) return;
  try {
    if (process.platform === "win32") child.kill("SIGKILL");
    else process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
}

function run(command, args, cwd, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32",
      shell: process.platform === "win32" && command === "npm",
    });
    let stdout = "";
    let stderr = "";
    let failure;
    const timeout = setTimeout(() => {
      failure = new Error(`${command} timed out after ${timeoutMs}ms`);
      terminate(child);
    }, timeoutMs);
    const capture = (isStdout, chunk) => {
      const current = isStdout ? stdout : stderr;
      if (current.length + chunk.length > 8 * 1024 * 1024) {
        failure ??= new Error(`${command} produced too much output`);
        terminate(child);
      } else if (isStdout) stdout += chunk;
      else stderr += chunk;
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => capture(true, chunk));
    child.stderr.on("data", (chunk) => capture(false, chunk));
    child.on("error", (error) => {
      failure = error;
      terminate(child);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (failure) reject(failure);
      else if (code !== 0)
        reject(new Error(`${command} ${args.join(" ")} failed (${code}): ${stderr || stdout}`));
      else resolve({ stdout, stderr });
    });
  });
}

function startProtocol(bin, cwd, framing) {
  const child = spawn(process.execPath, [bin], {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    detached: process.platform !== "win32",
  });
  const pending = new Map();
  let nextId = 1;
  let stderr = "";
  let closed = false;
  let buffer = framing === "lsp" ? Buffer.alloc(0) : "";
  const failPending = (error) => {
    for (const item of pending.values()) {
      clearTimeout(item.timer);
      item.reject(error);
    }
    pending.clear();
  };
  const receive = (message) => {
    if (!Object.hasOwn(message, "id")) return;
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    clearTimeout(item.timer);
    if (message.error) item.reject(new Error(JSON.stringify(message.error)));
    else item.resolve(message.result);
  };
  child.stdout.on("data", (chunk) => {
    if (framing === "mcp") {
      buffer += chunk.toString("utf8");
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) {
          try {
            receive(JSON.parse(line));
          } catch (error) {
            failPending(error);
          }
        }
      }
      return;
    }
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const boundary = buffer.indexOf("\r\n\r\n");
      if (boundary < 0) return;
      const header = buffer.subarray(0, boundary).toString("ascii");
      const length = Number(header.match(/Content-Length:\s*(\d+)/i)?.[1]);
      if (!Number.isInteger(length) || length < 0) {
        failPending(new Error(`Invalid LSP response header: ${header}`));
        return;
      }
      const end = boundary + 4 + length;
      if (buffer.length < end) return;
      const body = buffer.subarray(boundary + 4, end).toString("utf8");
      buffer = buffer.subarray(end);
      try {
        receive(JSON.parse(body));
      } catch (error) {
        failPending(error);
      }
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    if (stderr.length > 64 * 1024) stderr = stderr.slice(-64 * 1024);
  });
  child.on("error", (error) => failPending(error));
  child.on("close", (code) => {
    closed = true;
    failPending(new Error(`Protocol process exited (${code}): ${stderr}`));
  });

  function send(message) {
    const json = JSON.stringify(message);
    child.stdin.write(
      framing === "mcp" ? `${json}\n` : `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`,
    );
  }
  function request(method, params, timeoutMs = 15_000) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      send({ jsonrpc: "2.0", id, method, params });
    });
  }
  function notify(method, params) {
    send({ jsonrpc: "2.0", method, params });
  }
  async function close() {
    if (!closed) child.stdin.end();
    if (!closed)
      await Promise.race([
        new Promise((resolve) => child.once("close", resolve)),
        new Promise((resolve) => setTimeout(resolve, 1_500)),
      ]);
    if (!closed) terminate(child);
    if (!closed)
      await Promise.race([
        new Promise((resolve) => child.once("close", resolve)),
        new Promise((resolve) => setTimeout(resolve, 1_000)),
      ]);
    if (!closed) child.kill("SIGKILL");
  }
  return { request, notify, close };
}

async function countFiles(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) count += await countFiles(fullPath);
    else if (entry.isFile()) count++;
  }
  return count;
}

try {
  await writeFile(path.join(consumer, "package.json"), '{"private":true,"type":"module"}\n');
  await run(
    "npm",
    ["install", "--no-audit", "--no-fund", "--ignore-scripts", "--no-save", archive],
    consumer,
    180_000,
  );

  const packageRoot = path.join(consumer, "node_modules", "solidity-agent-toolkit");
  const manifest = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  assert.equal(manifest.name, "solidity-agent-toolkit", "installed package name");
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/, "installed package version");
  assert.equal(
    path.basename(archive),
    `${manifest.name}-${manifest.version}.tgz`,
    "archive name must match installed package version",
  );
  for (const name of ["solidity-agent-toolkit", "solidity-agent-toolkit-lsp", "sol2uml-light"]) {
    assert.ok(manifest.bin?.[name], `missing package binary: ${name}`);
  }
  const binPaths = Object.values(manifest.bin ?? {});
  for (const file of [manifest.main, manifest.types, ...binPaths]) {
    assert.ok(file, "main, types, and all bin entries must be declared");
    assert.ok(
      (await stat(path.join(packageRoot, file))).isFile(),
      `missing package entry: ${file}`,
    );
  }
  for (const directory of ["data/owasp-scs/docs/SCWE", "data/owasp-scs/docs/sctop10", "guides"]) {
    assert.ok(
      (await countFiles(path.join(packageRoot, directory))) > 0,
      `missing packaged data: ${directory}`,
    );
  }

  const bins = Object.fromEntries(
    Object.entries(manifest.bin).map(([name, file]) => [name, path.join(packageRoot, file)]),
  );
  const umlHelp = await run(process.execPath, [bins["sol2uml-light"], "--help"], consumer);
  assert.match(umlHelp.stdout, /Solidity|UML|diagram/i, "installed UML CLI help");
  const source = path.join(consumer, "Smoke.sol");
  await writeFile(
    source,
    "pragma solidity ^0.8.20; contract Smoke { uint256 public value; function setValue(uint256 next) external { value = next; } }\n",
  );
  const svg = path.join(consumer, "Smoke.svg");
  const png = path.join(consumer, "Smoke.png");
  await run(
    process.execPath,
    [bins["sol2uml-light"], "class", "-f", "svg", "-o", svg, source],
    consumer,
  );
  await run(
    process.execPath,
    [bins["sol2uml-light"], "class", "-f", "png", "-o", png, source],
    consumer,
  );
  assert.match(await readFile(svg, "utf8"), /<svg[\s>]/i, "installed UML SVG output");
  const pngBytes = await readFile(png);
  assert.deepEqual(
    [...pngBytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    "installed UML PNG output",
  );

  const previousNodeUrl = process.env.NODE_URL;
  process.env.NODE_URL = "invalid://offline-package-smoke";
  const mcp = startProtocol(bins["solidity-agent-toolkit"], consumer, "mcp");
  try {
    const initialized = await mcp.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "package-smoke", version: "1.0.0" },
    });
    assert.ok(initialized.serverInfo?.name, "MCP initialization response");
    mcp.notify("notifications/initialized", {});
    const tools = await mcp.request("tools/list", {});
    const names = tools.tools.map((tool) => tool.name);
    assert.ok(names.length >= 6, "MCP tools/list response");
    for (const name of ["lookup_knowledge", "run_security_scan", "analyze_contract"]) {
      assert.ok(names.includes(name), `missing MCP tool ${name}`);
    }
    assert.ok(names.includes("generate_diagram"), "missing MCP tool generate_diagram");
    const mcpDiagramPath = path.join(consumer, "mcp-artifacts", "Smoke.svg");
    const overview = await mcp.request("tools/call", {
      name: "generate_diagram",
      arguments: { path: source, outputPath: mcpDiagramPath },
    });
    assert.equal(overview.isError, undefined, "installed MCP diagram overview");
    assert.ok(
      overview.content.some(
        (item) => item.type === "resource" && item.resource.mimeType === "image/svg+xml",
      ),
      "installed MCP SVG artifact",
    );
    assert.match(await readFile(mcpDiagramPath, "utf8"), /<svg[\s>]/i, "saved MCP SVG output");

    const storage = await mcp.request("tools/call", {
      name: "generate_diagram",
      arguments: { path: source, view: "storage", contractName: "Smoke", format: "png" },
    });
    assert.equal(storage.isError, undefined, "installed offline MCP storage diagram");
    const storageImage = storage.content.find((item) => item.type === "image");
    assert.ok(storageImage?.type === "image", "installed MCP PNG artifact");
    assert.deepEqual(
      [...Buffer.from(storageImage.data, "base64").subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
      "installed MCP storage PNG output",
    );
    const readResource = async (uri, pattern) => {
      const result = await mcp.request("resources/read", { uri });
      const text = result.contents?.map((content) => content.text ?? "").join("\n") ?? "";
      assert.ok(text.length > 0 && pattern.test(text), `invalid installed resource ${uri}`);
    };
    await readResource("scwe://list", /Total entries:\s*[1-9]\d*/);
    await readResource("sctop10://list", /OWASP Smart Contract Top 10/);
    await readResource("guide://code-review", /code review/i);
  } finally {
    await mcp.close();
    if (previousNodeUrl === undefined) delete process.env.NODE_URL;
    else process.env.NODE_URL = previousNodeUrl;
  }

  const lsp = startProtocol(bins["solidity-agent-toolkit-lsp"], consumer, "lsp");
  try {
    const initialized = await lsp.request("initialize", {
      processId: process.pid,
      rootUri: null,
      capabilities: {},
      clientInfo: { name: "package-smoke", version: "1.0.0" },
    });
    assert.ok(initialized.capabilities, "LSP initialization response");
    lsp.notify("initialized", {});
    await lsp.request("shutdown", {});
    lsp.notify("exit", {});
  } finally {
    await lsp.close();
  }

  console.log(`Package smoke passed: ${manifest.name}@${manifest.version}`);
} finally {
  await rm(consumer, { recursive: true, force: true });
}
