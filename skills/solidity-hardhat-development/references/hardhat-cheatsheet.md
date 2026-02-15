# Hardhat 3 Cheatsheet

> **MCP Integration**: Use `compile_contract`, `run_tests`, and `dry_run_deploy` MCP tools for programmatic access within AI agent workflows.

## CLI Commands

- `npx hardhat --init`: Initialize a new project.
- `npx hardhat build`: Compile all contracts.
- `npx hardhat test`: Run both Solidity and TypeScript tests.
- `npx hardhat test solidity`: Run only Solidity tests.
- `npx hardhat ignition deploy <path>`: Deploy an Ignition module.
- `npx hardhat verify --network <name> <address>`: Verify a contract on Etherscan.
- `npx hardhat clean`: Remove build artifacts and cache.

## Configuration Pattern

```typescript
import { defineConfig, configVariable } from "hardhat/config";
import { hardhatViem } from "@nomicfoundation/hardhat-viem";

export default defineConfig({
  solidity: "0.8.28",
  plugins: [hardhatViem],
  networks: {
    sepolia: {
      type: "http",
      url: configVariable("SEPOLIA_URL"),
      chainType: "l1",
    },
  },
});
```

## Solidity Test Pattern

```solidity
// test/Counter.t.sol
import "forge-std/Test.sol";
import "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;

    function setUp() public {
        counter = new Counter();
    }

    function test_Increment() public {
        counter.increment();
        assertEq(counter.number(), 1);
    }

    function testFuzz_SetNumber(uint256 x) public {
        counter.setNumber(x);
        assertEq(counter.number(), x);
    }
}
```

## TypeScript Test Pattern

```typescript
import { test } from "node:test";
import assert from "node:assert";
import { network } from "hardhat";

test("should connect to mainnet", async () => {
  const mainnet = await network.connect("mainnet");
  const block = await mainnet.provider.getBlockNumber();
  assert.ok(block > 0);
});
```

## Network Helpers

- `setBalance(address, balance)`: Set the ETH balance of an account.
- `impersonateAccount(address)`: Act as a specific address.
- `mine(blocks)`: Advance the chain by a number of blocks.
- `time.increase(seconds)`: Advance the block timestamp.
- `loadFixture(fn)`: Reset state to a specific snapshot for faster tests.

## Ignition Module Pattern

```typescript
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenModule", (m) => {
  const token = m.contract("Token", [1000]);
  m.call(token, "transfer", [m.getAccount(1), 100]);
  return { token };
});
```

## Config Variable Pattern

```typescript
const apiKey = configVariable("ETHERSCAN_API_KEY");
```

## Hardhat 2 → 3 Migration Quick Reference

| Feature       | Hardhat 2           | Hardhat 3        |
| ------------- | ------------------- | ---------------- |
| Module System | CommonJS            | ESM              |
| Config Export | `module.exports`    | `defineConfig`   |
| Plugins       | Side-effect imports | `plugins` array  |
| Local Network | Hardhat Network     | EDR              |
| Secrets       | `.env` / `dotenv`   | `configVariable` |
| Tests         | Mocha/Chai          | Node.js/Solidity |
