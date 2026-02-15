import { describe, it, expect } from "vitest";
import {
  detectContractFeatures,
  analyzeAdversarialScenarios,
  formatAdversarialAnalysis,
} from "../../core/adversarial-analysis.js";

const MINIMAL_CONTRACT = `
contract Foo {
  function bar() public pure returns (uint) {
    return 1;
  }
}
`;

const REENTRANCY_CONTRACT = `
pragma solidity ^0.8.0;
contract Vulnerable {
  mapping(address => uint) public balances;
  function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount);
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] -= amount;
  }
}
`;

const ORACLE_CONTRACT = `
pragma solidity ^0.8.0;
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
contract PriceFeed {
  AggregatorV3Interface internal priceFeed;
  function getLatestPrice() public view returns (int) {
    (, int price, , , ) = priceFeed.latestRoundData();
    return price;
  }
}
`;

const GOVERNANCE_CONTRACT = `
pragma solidity ^0.8.0;
contract Governor {
  function propose(address[] memory targets) public returns (uint) {
    return 1;
  }
  function castVote(uint proposalId, uint8 support) public {
    // vote logic
  }
  function execute(uint proposalId) public {
    // execute logic
  }
}
`;

const MULTI_FEATURE_CONTRACT = `
pragma solidity ^0.8.0;
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
contract Complex {
  mapping(address => uint) public balances;
  AggregatorV3Interface internal priceFeed;

  function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount);
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    balances[msg.sender] -= amount;
  }

  function getPrice() public view returns (int) {
    (, int price, , , ) = priceFeed.latestRoundData();
    return price;
  }

  function propose(address[] memory targets) public returns (uint) {
    return 1;
  }
}
`;

describe("detectContractFeatures", () => {
  it("detects reentrancy features from .call{value:", () => {
    const features = detectContractFeatures(REENTRANCY_CONTRACT);
    const reentrancy = features.find((f) => f.category === "reentrancy");
    expect(reentrancy).toBeDefined();
    expect(reentrancy!.matchedLines.length).toBeGreaterThan(0);
    expect(reentrancy!.matchedLines.some((ml) => ml.text.includes("call{value"))).toBe(true);
  });

  it("detects oracle-manipulation features from AggregatorV3Interface", () => {
    const features = detectContractFeatures(ORACLE_CONTRACT);
    const oracle = features.find((f) => f.category === "oracle-manipulation");
    expect(oracle).toBeDefined();
    expect(oracle!.matchedLines.length).toBeGreaterThan(0);
    expect(oracle!.matchedLines.some((ml) => ml.text.includes("AggregatorV3Interface"))).toBe(true);
  });

  it("returns empty array for minimal contract with no features", () => {
    const features = detectContractFeatures(MINIMAL_CONTRACT);
    expect(features).toEqual([]);
  });

  it("detects multiple feature categories simultaneously", () => {
    const features = detectContractFeatures(MULTI_FEATURE_CONTRACT);
    const categories = features.map((f) => f.category);
    expect(categories).toContain("reentrancy");
    expect(categories).toContain("oracle-manipulation");
    expect(categories).toContain("governance");
    expect(features.length).toBeGreaterThanOrEqual(3);
  });

  it("deduplicates matched lines within same category", () => {
    const features = detectContractFeatures(REENTRANCY_CONTRACT);
    const reentrancy = features.find((f) => f.category === "reentrancy");
    expect(reentrancy).toBeDefined();
    const lineNumbers = reentrancy!.matchedLines.map((ml) => ml.line);
    const uniqueLines = new Set(lineNumbers);
    expect(lineNumbers.length).toBe(uniqueLines.size);
  });

  it("trims matched line text", () => {
    const features = detectContractFeatures(REENTRANCY_CONTRACT);
    const reentrancy = features.find((f) => f.category === "reentrancy");
    expect(reentrancy).toBeDefined();
    for (const ml of reentrancy!.matchedLines) {
      expect(ml.text).toBe(ml.text.trim());
    }
  });
});

describe("analyzeAdversarialScenarios", () => {
  it("returns reentrancy scenarios for code with external calls", () => {
    const result = analyzeAdversarialScenarios(REENTRANCY_CONTRACT);
    expect(result.success).toBe(true);
    expect(result.matchedScenarios.length).toBeGreaterThan(0);
    const reentrancyScenarios = result.matchedScenarios.filter(
      (m) => m.scenario.category === "reentrancy",
    );
    expect(reentrancyScenarios.length).toBeGreaterThan(0);
    expect(reentrancyScenarios[0].scenario.category).toBe("reentrancy");
  });

  it("returns oracle scenarios for code with Chainlink patterns", () => {
    const result = analyzeAdversarialScenarios(ORACLE_CONTRACT);
    expect(result.success).toBe(true);
    const oracleScenarios = result.matchedScenarios.filter(
      (m) => m.scenario.category === "oracle-manipulation",
    );
    expect(oracleScenarios.length).toBeGreaterThan(0);
    expect(oracleScenarios[0].scenario.scweIds.length).toBeGreaterThan(0);
  });

  it("returns governance scenarios for code with propose(", () => {
    const result = analyzeAdversarialScenarios(GOVERNANCE_CONTRACT);
    expect(result.success).toBe(true);
    const govScenarios = result.matchedScenarios.filter(
      (m) => m.scenario.category === "governance",
    );
    expect(govScenarios.length).toBeGreaterThan(0);
  });

  it("returns empty matchedScenarios for minimal safe contract", () => {
    const result = analyzeAdversarialScenarios(MINIMAL_CONTRACT);
    expect(result.matchedScenarios).toEqual([]);
    expect(result.detectedFeatures).toEqual([]);
  });

  it("returns success: true always (no error case in v1)", () => {
    expect(analyzeAdversarialScenarios(MINIMAL_CONTRACT).success).toBe(true);
    expect(analyzeAdversarialScenarios(REENTRANCY_CONTRACT).success).toBe(true);
    expect(analyzeAdversarialScenarios(ORACLE_CONTRACT).success).toBe(true);
    expect(analyzeAdversarialScenarios("").success).toBe(true);
  });

  it("includes detected features that triggered each scenario match", () => {
    const result = analyzeAdversarialScenarios(REENTRANCY_CONTRACT);
    for (const match of result.matchedScenarios) {
      expect(match.detectedFeatures.length).toBeGreaterThan(0);
      for (const feature of match.detectedFeatures) {
        expect(feature.category).toBe(match.scenario.category);
      }
    }
  });

  it("matches multiple scenario categories simultaneously", () => {
    const result = analyzeAdversarialScenarios(MULTI_FEATURE_CONTRACT);
    const categories = new Set(result.matchedScenarios.map((m) => m.scenario.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
    expect(categories.has("reentrancy")).toBe(true);
    expect(categories.has("oracle-manipulation")).toBe(true);
    expect(categories.has("governance")).toBe(true);
  });
});

describe("formatAdversarialAnalysis", () => {
  it("returns 'No adversarial scenarios' message for empty results", () => {
    const result = analyzeAdversarialScenarios(MINIMAL_CONTRACT);
    const output = formatAdversarialAnalysis(result);
    expect(output).toContain("No adversarial scenarios identified");
    expect(output).toContain("does not exhibit features");
  });

  it("returns readable markdown for matched results", () => {
    const result = analyzeAdversarialScenarios(REENTRANCY_CONTRACT);
    const output = formatAdversarialAnalysis(result);
    expect(output).toContain("# Adversarial Scenario Analysis");
    expect(output).toContain("applicable adversarial scenarios");
    expect(output).toContain("## Classic Ether Drain via Fallback");
    expect(output).toContain("**Severity:**");
    expect(output).toContain("CRITICAL");
    expect(output).toContain("SCWE-046");
    expect(output).toContain("### Pre-Conditions");
    expect(output).toContain("### Attack Steps");
    expect(output).toContain("### Invariants Violated");
    expect(output).toContain("**Real-World Example:**");
    expect(output).toContain("The DAO (2016)");
  });

  it("includes detected features section in formatted output", () => {
    const result = analyzeAdversarialScenarios(REENTRANCY_CONTRACT);
    const output = formatAdversarialAnalysis(result);
    expect(output).toContain("## Detected Contract Features");
    expect(output).toContain("External Value Transfers");
    expect(output).toContain("reentrancy");
  });

  it("formats multiple categories correctly", () => {
    const result = analyzeAdversarialScenarios(MULTI_FEATURE_CONTRACT);
    const output = formatAdversarialAnalysis(result);
    expect(output).toContain("oracle-manipulation");
    expect(output).toContain("governance");
    expect(output).toContain("reentrancy");
    expect(output).toMatch(/across \d+ attack categories/);
  });
});
