---
name: solidity-hardhat-development
description: Hardhat 3 development workflow for Solidity smart contracts. Use when building, testing, or deploying with Hardhat 3.x (hardhat, ignition, EDR). Covers ESM-first project setup, defineConfig, Solidity-native tests, TypeScript tests, multichain support, Hardhat Ignition deployment, and hook-based plugin system. Triggers on tasks involving hardhat init, hardhat build, hardhat test, hardhat ignition, or Hardhat-based Solidity development.
license: MIT
metadata:
  author: whackur (whackur@gmail.com)
  version: "0.8.0"
---

# Hardhat 3 Development Guide

## When to Apply

- Starting new Hardhat 3 projects.
- Migrating from v2 to v3.
- Testing Solidity contracts with Foundry-compatible tests.
- Deploying with Hardhat Ignition.
- Building multichain applications.

## Requirements

| Requirement   | Value                                        |
| :------------ | :------------------------------------------- |
| Node.js       | v22.10 or newer                              |
| Module system | ESM — set `"type": "module"` in package.json |
| Init command  | `npx hardhat --init`                         |
| Config entry  | `defineConfig` from `hardhat/config`         |

## Configuration

Organize setup with `solidity`, `networks`, and `plugins` keys. Use `configVariable("KEY")` for secrets to keep them out of code. Plugins MUST be listed explicitly — side-effect imports from v2 no longer work.

| Network `type`  | Use for                  |
| :-------------- | :----------------------- |
| `edr-simulated` | Local in-process testing |
| `http`          | Remote RPC connections   |

`chainType` accepts `"l1"`, `"op"`, or `"generic"`. Build profiles allow per-environment settings (e.g., enabling the optimizer for production).

```typescript
import { defineConfig, configVariable } from "hardhat/config";
import { hardhatIgnition } from "@nomicfoundation/hardhat-ignition";

export default defineConfig({
  solidity: "0.8.28",
  plugins: [hardhatIgnition],
  networks: {
    hardhat: { type: "edr-simulated" },
    mainnet: { type: "http", url: configVariable("MAINNET_RPC_URL") },
  },
});
```

## Testing

| Test type           | Runner                                     | Notes                                                                 |
| :------------------ | :----------------------------------------- | :-------------------------------------------------------------------- |
| Solidity (`.t.sol`) | Rust-powered                               | Inherits `forge-std/Test.sol`; full `vm` cheatcodes; fuzzing built-in |
| TypeScript          | Node test runner + Viem, or Mocha + Ethers | Access network helpers via the `networkHelpers` property              |

| Command                     | Runs                |
| :-------------------------- | :------------------ |
| `npx hardhat test`          | All tests           |
| `npx hardhat test solidity` | Solidity tests only |
| `--coverage`                | Coverage data       |
| `--gas-stats`               | Gas usage data      |

## Deployment (Ignition)

Hardhat Ignition is the primary deployment framework: declarative modules via `buildModule`, automatic transaction parallelization, and automatic resume of failed deployments.

- **Deploy**: `npx hardhat ignition deploy ignition/modules/MyModule.ts --network <network>`
- **Verify**: `@nomicfoundation/hardhat-verify` plugin

## Multichain Support

Hardhat 3 simulates multiple chains at once. Connect per-network with `const mainnet = await network.connect("mainnet")`. Fork several chains concurrently for complex cross-chain testing.

## Debugging

| Tool                                  | Purpose                          |
| :------------------------------------ | :------------------------------- |
| `console.log` (`hardhat/console.sol`) | Print debugging inside contracts |
| Verbosity flags on the `test` command | Increase trace detail            |
| EDR stack traces                      | Detailed failure traces          |

## Migration from v2

| v2                         | v3                          |
| :------------------------- | :-------------------------- |
| CommonJS                   | ESM (`"type": "module"`)    |
| Node.js < 22               | Node.js v22.10+             |
| `module.exports`           | `defineConfig`              |
| Side-effect plugin imports | Explicit `plugins` array    |
| Ethers v5                  | Ethers v6 or Viem           |
| Single network object      | Multichain `NetworkManager` |
| v2 plugins                 | v3-specific plugin versions |

Essential plugins: `hardhat-verify`, `hardhat-ignition`, `hardhat-keystore`.

## Enhanced with MCP

When the `solidity-agent-toolkit` is available:

- `compile_contract`: Build contracts and get artifacts.
- `run_tests`: Execute the test suite.
- `gas_snapshot`: Get gas reports.
- `dry_run_deploy`: Simulate deployments.
- `run_slither`, `run_aderyn`: Perform security analysis.

## References

See the [Hardhat 3 Cheatsheet](./references/hardhat-cheatsheet.md) for examples.
