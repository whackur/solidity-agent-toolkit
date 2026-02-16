import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerContractAnalysisTools } from "../../mcp/tools/contract-analysis.js";
import { analyzeProxySafety } from "../../core/proxy-safety.js";

describe("Proxy Safety Analysis Tools", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
  });

  describe("Tool Registration", () => {
    it("registerContractAnalysisTools does not throw", () => {
      expect(() => registerContractAnalysisTools(server)).not.toThrow();
    });

    it("registers analyze_proxy_safety tool", () => {
      registerContractAnalysisTools(server);

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      expect(tool).toBeDefined();
      expect(tool.description).toContain("proxy");
    });
  });

  describe("analyze_proxy_safety tool", () => {
    beforeEach(() => {
      registerContractAnalysisTools(server);
    });

    it("flags unprotected initializer in upgradeable contract", async () => {
      const code = `
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
contract MyContract is Initializable {
    address public owner;
    function initialize(address _owner) external {
        owner = _owner;
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      const result = await tool.handler({ analysis: "proxy_safety", code });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Unprotected Initializer");
    });

    it("flags constructor alongside upgradeTo", async () => {
      const code = `
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
contract MyContract is UUPSUpgradeable {
    uint256 public value;
    constructor(uint256 _val) {
        value = _val;
    }
    function upgradeTo(address newImpl) external {
        _upgradeTo(newImpl);
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      const result = await tool.handler({ analysis: "proxy_safety", code });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Constructor in Upgradeable");
    });

    it("flags selfdestruct in proxy implementation", async () => {
      const code = `
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
contract MyContract is Initializable {
    function initialize() external initializer {}
    function kill() external {
        selfdestruct(payable(msg.sender));
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      const result = await tool.handler({ analysis: "proxy_safety", code });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Selfdestruct");
      expect(result.content[0].text).toContain("CRITICAL");
    });

    it("returns zero findings for clean upgradeable contract", async () => {
      const code = `
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
contract MyContract is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256[50] private __gap;
    function initialize(address _owner) external initializer {
        __Ownable_init(_owner);
    }
    constructor() { _disableInitializers(); }
    function _authorizeUpgrade(address) internal override onlyOwner {}
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      const result = await tool.handler({ analysis: "proxy_safety", code });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("No proxy anti-patterns detected");
    });

    it("returns not upgradeable for non-proxy contract", async () => {
      const code = `
pragma solidity ^0.8.0;
contract SimpleContract {
    uint256 public value;
    function setValue(uint256 _val) external {
        value = _val;
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      const result = await tool.handler({ analysis: "proxy_safety", code });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("does not appear to be upgradeable");
    });

    it("handles empty string without crashing", async () => {
      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      const result = await tool.handler({ analysis: "proxy_safety", code: "" });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("does not appear to be upgradeable");
    });
  });

  describe("analyzeProxySafety core function", () => {
    it("detects UUPS proxy pattern", () => {
      const code = `
contract MyContract is UUPSUpgradeable {
    function proxiableUUID() external pure returns (bytes32) {
        return keccak256("UUPS");
    }
    uint256[50] private __gap;
    function initialize() external initializer {}
    constructor() { _disableInitializers(); }
}`;
      const result = analyzeProxySafety(code);
      expect(result.isUpgradeable).toBe(true);
      expect(result.proxyPattern).toBe("UUPS");
    });

    it("detects Transparent proxy pattern", () => {
      const code = `
contract MyProxy is TransparentUpgradeableProxy, Initializable {
    function initialize() external initializer {}
    uint256[50] private __gap;
    constructor() { _disableInitializers(); }
}`;
      const result = analyzeProxySafety(code);
      expect(result.isUpgradeable).toBe(true);
      expect(result.proxyPattern).toBe("Transparent");
    });

    it("detects Beacon proxy pattern", () => {
      const code = `
contract MyContract is IBeacon, Initializable {
    function initialize() external initializer {}
    uint256[50] private __gap;
    constructor() { _disableInitializers(); }
}`;
      const result = analyzeProxySafety(code);
      expect(result.isUpgradeable).toBe(true);
      expect(result.proxyPattern).toBe("Beacon");
    });

    it("flags missing storage gap", () => {
      const code = `
contract MyContract is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;
    function initialize() external initializer {}
    constructor() { _disableInitializers(); }
}`;
      const result = analyzeProxySafety(code);
      expect(result.findings.some((f) => f.id === "PROXY-006")).toBe(true);
    });

    it("flags immutable in upgradeable context", () => {
      const code = `
contract MyContract is Initializable {
    uint256 public immutable maxSupply = 1000;
    function initialize() external initializer {}
    uint256[50] private __gap;
    constructor() { _disableInitializers(); }
}`;
      const result = analyzeProxySafety(code);
      expect(result.findings.some((f) => f.id === "PROXY-007")).toBe(true);
    });

    it("returns isUpgradeable false for empty input", () => {
      const result = analyzeProxySafety("");
      expect(result.isUpgradeable).toBe(false);
      expect(result.proxyPattern).toBe("none");
      expect(result.findings).toHaveLength(0);
    });

    it("returns isUpgradeable false for non-proxy contract", () => {
      const code = `
contract Foo {
    function bar() public pure returns (uint) { return 1; }
}`;
      const result = analyzeProxySafety(code);
      expect(result.isUpgradeable).toBe(false);
      expect(result.proxyPattern).toBe("none");
      expect(result.findings).toHaveLength(0);
    });
  });

  describe("proxy contract detection (false positive prevention)", () => {
    it("does NOT flag constructor or immutables on EIP-7702 style proxy", () => {
      const code = `
import {Proxy} from "@openzeppelin/contracts/proxy/Proxy.sol";
import {ERC1967Utils} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";
contract EIP7702Proxy is Proxy {
    address public immutable nonceTracker;
    address internal immutable _receiver;
    address internal immutable _proxy;
    constructor(address nonceTracker_, address receiver) {
        nonceTracker = nonceTracker_;
        _receiver = receiver;
        _proxy = address(this);
    }
    function setImplementation(address newImpl, bytes calldata data) external {
        ERC1967Utils.upgradeToAndCall(newImpl, data);
    }
    function _implementation() internal view override returns (address impl) {
        impl = ERC1967Utils.getImplementation();
        if (impl == address(0)) impl = _receiver;
    }
}`;
      const result = analyzeProxySafety(code);
      expect(result.isUpgradeable).toBe(true);
      expect(result.isProxyContract).toBe(true);
      expect(result.findings.some((f) => f.id === "PROXY-002")).toBe(false);
      expect(result.findings.some((f) => f.id === "PROXY-007")).toBe(false);
    });

    it("does NOT flag constructor on OZ-style ERC1967Proxy", () => {
      const code = `
import {Proxy} from "@openzeppelin/contracts/proxy/Proxy.sol";
contract MyProxy is ERC1967Proxy {
    constructor(address impl, bytes memory data) ERC1967Proxy(impl, data) {}
    function upgradeTo(address newImpl) external {}
}`;
      const result = analyzeProxySafety(code);
      expect(result.isProxyContract).toBe(true);
      expect(result.findings.some((f) => f.id === "PROXY-002")).toBe(false);
    });

    it("still flags selfdestruct even on proxy contracts (appliesTo: both)", () => {
      const code = `
import {Proxy} from "@openzeppelin/contracts/proxy/Proxy.sol";
contract BadProxy is Proxy {
    function _implementation() internal view override returns (address) { return address(0); }
    function kill() external { selfdestruct(payable(msg.sender)); }
    function upgradeTo(address newImpl) external {}
}`;
      const result = analyzeProxySafety(code);
      expect(result.isProxyContract).toBe(true);
      expect(result.findings.some((f) => f.id === "PROXY-004")).toBe(true);
    });

    it("still flags constructor on implementation contracts (not proxies)", () => {
      const code = `
contract MyImpl is UUPSUpgradeable {
    uint256 public value;
    constructor(uint256 _val) { value = _val; }
    function upgradeTo(address newImpl) external { _upgradeTo(newImpl); }
}`;
      const result = analyzeProxySafety(code);
      expect(result.isProxyContract).toBe(false);
      expect(result.findings.some((f) => f.id === "PROXY-002")).toBe(true);
    });

    it("detects proxy via _fallback function", () => {
      const code = `
contract CustomProxy {
    function _fallback() internal { delegatecall(...); }
    function upgradeTo(address newImpl) external {}
}`;
      const result = analyzeProxySafety(code);
      expect(result.isProxyContract).toBe(true);
    });

    it("detects proxy via _delegate function", () => {
      const code = `
contract CustomProxy {
    function _delegate(address impl) internal {}
    function upgradeTo(address newImpl) external {}
}`;
      const result = analyzeProxySafety(code);
      expect(result.isProxyContract).toBe(true);
    });
  });
});
