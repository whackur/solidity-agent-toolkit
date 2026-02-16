export function computeC3Linearization(
  inheritanceMap: Record<string, string[]>,
): Record<string, string[]> {
  const linearization: Record<string, string[]> = {};
  const memo = new Map<string, string[]>();
  const visiting = new Set<string>();

  function getLinearization(contract: string): string[] {
    if (memo.has(contract)) {
      return memo.get(contract)!;
    }
    if (visiting.has(contract)) {
      return [contract];
    }

    visiting.add(contract);

    const parents = inheritanceMap[contract] || [];
    if (parents.length === 0) {
      const result = [contract];
      visiting.delete(contract);
      memo.set(contract, result);
      return result;
    }

    // Solidity C3: reverse parents to get [MostDerived, ..., MostBase]
    // D is B, C -> parents in map ["B", "C"] -> we want order D, C, B
    const reversedParents = [...parents].reverse();

    const listsToMerge: string[][] = [];
    for (const parent of reversedParents) {
      listsToMerge.push([...getLinearization(parent)]);
    }
    listsToMerge.push([...reversedParents]);

    const merged = merge(listsToMerge);
    const result = [contract, ...merged];

    visiting.delete(contract);
    memo.set(contract, result);
    return result;
  }

  function merge(lists: string[][]): string[] {
    const result: string[] = [];

    while (true) {
      const activeLists = lists.filter((l) => l.length > 0);
      if (activeLists.length === 0) {
        return result;
      }

      let candidate: string | undefined;

      for (const list of activeLists) {
        const head = list[0];
        const inTail = activeLists.some((otherList) => otherList.slice(1).includes(head));

        if (!inTail) {
          candidate = head;
          break;
        }
      }

      if (!candidate) {
        return result;
      }

      result.push(candidate);

      for (const list of lists) {
        if (list.length > 0 && list[0] === candidate) {
          list.shift();
        }
      }
    }
  }

  for (const contract of Object.keys(inheritanceMap)) {
    linearization[contract] = getLinearization(contract);
  }

  return linearization;
}

export function computeMaxInheritanceDepth(inheritanceMap: Record<string, string[]>): number {
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  function getDepth(contract: string): number {
    if (memo.has(contract)) {
      return memo.get(contract)!;
    }
    if (visiting.has(contract)) {
      return Number.POSITIVE_INFINITY;
    }

    visiting.add(contract);

    const parents = inheritanceMap[contract] || [];
    if (parents.length === 0) {
      visiting.delete(contract);
      memo.set(contract, 0);
      return 0;
    }

    let maxParentDepth = 0;
    for (const parent of parents) {
      const d = getDepth(parent);
      if (d === Number.POSITIVE_INFINITY) {
        maxParentDepth = Number.POSITIVE_INFINITY;
        break;
      }
      if (d > maxParentDepth) {
        maxParentDepth = d;
      }
    }

    const result =
      maxParentDepth === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : 1 + maxParentDepth;

    visiting.delete(contract);
    memo.set(contract, result);
    return result;
  }

  let maxDepth = 0;
  for (const contract of Object.keys(inheritanceMap)) {
    const depth = getDepth(contract);
    if (depth === Number.POSITIVE_INFINITY) {
      return Number.POSITIVE_INFINITY;
    }
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  }

  return maxDepth;
}
