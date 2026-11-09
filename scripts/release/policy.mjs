export function validateTag({ tag, version, eventSha, tagSha, checkoutSha }) {
  if (tag !== `v${version}`) {
    throw new Error(`Expected release tag v${version}, got ${tag}`);
  }
  if (eventSha !== checkoutSha) {
    throw new Error(`Checkout commit ${checkoutSha} does not match event commit ${eventSha}`);
  }
  if (eventSha !== tagSha) {
    throw new Error(`Tag ${tag} points to ${tagSha}, not event commit ${eventSha}`);
  }
}

export function getPublishTag(version) {
  return parseVersion(version).prerelease === undefined ? "latest" : "next";
}

export function parseVersion(version) {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(
      version,
    );
  if (!match) throw new Error(`Invalid semantic version: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (const field of ["major", "minor", "patch"]) {
    if (a[field] !== b[field]) return a[field] < b[field] ? -1 : 1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (a.prerelease === undefined) return 1;
  if (b.prerelease === undefined) return -1;
  const ap = a.prerelease.split(".");
  const bp = b.prerelease.split(".");
  for (let index = 0; index < Math.max(ap.length, bp.length); index++) {
    if (ap[index] === undefined) return -1;
    if (bp[index] === undefined) return 1;
    if (ap[index] === bp[index]) continue;
    const an = /^(0|[1-9]\d*)$/.test(ap[index]);
    const bn = /^(0|[1-9]\d*)$/.test(bp[index]);
    if (an && bn) return Number(ap[index]) < Number(bp[index]) ? -1 : 1;
    if (an !== bn) return an ? -1 : 1;
    return ap[index] < bp[index] ? -1 : 1;
  }
  return 0;
}

export function assertNotBehindLatest(candidate, latest) {
  if (compareVersions(candidate, latest) < 0) {
    throw new Error(`Refusing to publish ${candidate}; npm latest is already ${latest}`);
  }
}

export function shouldPublish(existingIntegrity, candidateIntegrity) {
  if (existingIntegrity === null) return true;
  if (existingIntegrity === candidateIntegrity) return false;
  throw new Error("npm already has different bytes for this package version");
}
