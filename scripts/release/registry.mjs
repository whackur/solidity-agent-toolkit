const registryUrl = "https://registry.npmjs.org";

export async function getPublishedIntegrity(packageName, version, fetchImpl = fetch) {
  const url = `${registryUrl}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
  const response = await fetchImpl(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`npm registry returned ${response.status} for ${packageName}@${version}`);
  const integrity = (await response.json()).dist?.integrity;
  if (typeof integrity !== "string")
    throw new Error(`npm registry did not return integrity for ${packageName}@${version}`);
  return integrity;
}

export async function getLatestVersion(packageName, fetchImpl = fetch) {
  const response = await fetchImpl(`${registryUrl}/${encodeURIComponent(packageName)}/latest`, {
    cache: "no-store",
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`npm registry returned ${response.status} for ${packageName}/latest`);
  const version = (await response.json()).version;
  if (typeof version !== "string")
    throw new Error(`npm registry did not return a latest version for ${packageName}`);
  return version;
}

export async function waitForIntegrity({
  fetchImpl = fetch,
  packageName,
  version,
  integrity,
  timeoutMs = 20 * 60 * 1000,
  pollIntervalMs = 15 * 1000,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const url = `${registryUrl}/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`;
  const deadline = now() + timeoutMs;
  while (true) {
    const remaining = deadline - now();
    if (remaining <= 0)
      throw new Error(`Timed out waiting for ${packageName}@${version} to become visible on npm`);
    const response = await fetchImpl(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(Math.max(1, Math.min(30_000, remaining))),
    });
    if (response.status === 200) {
      const actual = (await response.json()).dist?.integrity;
      if (actual !== integrity)
        throw new Error(`Registry integrity mismatch for ${packageName}@${version}`);
      return;
    }
    if (response.status !== 404)
      throw new Error(
        `npm registry returned ${response.status} while checking ${packageName}@${version}`,
      );
    await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - now())));
  }
}
