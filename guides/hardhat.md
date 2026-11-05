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

## Related MCP Capabilities

The MCP build, test, gas, and deployment tools wrap Foundry. For Hardhat projects, use them only when the project also has Foundry configured (`forge` can run Solidity tests that inherit `forge-std/Test.sol`):

- `run_foundry` (`build`, `inspect`, `test`, `gas_report`, `gas_snapshot`, `deploy_simulate`, `deploy_status`)
- `run_security_scan` (Slither / Aderyn) works on Hardhat projects directly

## References

- `hardhat-cheatsheet` — Hardhat 3 examples (load with `lookup_knowledge` `guide: "hardhat-cheatsheet"`)
