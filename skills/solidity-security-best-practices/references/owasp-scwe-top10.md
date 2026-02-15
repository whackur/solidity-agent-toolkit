# OWASP Smart Contract Top 10 (2026)

## SC01: Access Control Vulnerabilities
Failures in restricting access to sensitive functions or data. This allows unauthorized users to execute administrative actions or access restricted information.

**Key mitigations:**
- Use OpenZeppelin Ownable or AccessControl
- Apply the principle of least privilege
- Ensure all state-changing functions have modifiers
- Audit visibility of internal/private functions

**Related SCWE IDs:** SCWE-048, SCWE-018, SCWE-038

## SC02: Business Logic Vulnerabilities
Flaws in the design or implementation of the contract's logic. These are often unique to the application and cannot be caught by generic tools.

**Key mitigations:**
- Formal verification of critical logic
- Extensive unit and integration testing
- Peer review of economic models
- Use of invariant testing (fuzzing)

**Related SCWE IDs:** SCWE-067, SCWE-030

## SC03: Price Oracle Manipulation
Relying on a single, manipulatable source for asset prices. Attackers can use flash loans to skew the price and exploit the contract.

**Key mitigations:**
- Use decentralized oracles like Chainlink
- Implement Time-Weighted Average Prices (TWAP)
- Check for price staleness and deviation
- Use multiple independent price sources

**Related SCWE IDs:** SCWE-063, SCWE-015

## SC04: Flash Loan Attacks
Exploiting a contract's logic using large amounts of capital borrowed and repaid within a single transaction. Often combined with oracle manipulation.

**Key mitigations:**
- Don't use spot prices for critical logic
- Implement slippage protection
- Use TWAP oracles
- Add reentrancy guards to sensitive functions

**Related SCWE IDs:** SCWE-063, SCWE-046

## SC05: Lack of Input Validation
Failing to properly sanitize or validate data provided by users. This can lead to unexpected state changes or contract crashes.

**Key mitigations:**
- Use require() for all user-provided parameters
- Validate address(0) and empty values
- Check array lengths and bounds
- Use custom errors for gas efficiency

**Related SCWE IDs:** SCWE-043, SCWE-025, SCWE-132

## SC06: Unchecked External Calls
Calling external contracts without handling potential failures or malicious behavior. This includes ignoring return values or calling untrusted addresses.

**Key mitigations:**
- Use SafeERC20 for token transfers
- Always check return values of .call()
- Use the pull-over-push pattern for payments
- Limit gas forwarded to external calls

**Related SCWE IDs:** SCWE-109, SCWE-100, SCWE-030

## SC07: Arithmetic Errors
Errors in mathematical operations, such as division by zero or precision loss. While Solidity 0.8+ handles overflow, logic errors remain common.

**Key mitigations:**
- Use Solidity 0.8.0 or higher
- Perform multiplication before division
- Use high-precision libraries for complex math
- Check for division by zero explicitly

**Related SCWE IDs:** SCWE-106, SCWE-067

## SC08: Reentrancy Attacks
An external call hijacks the control flow to call back into the original contract before the first execution is complete. This can drain funds or corrupt state.

**Key mitigations:**
- Follow the Checks-Effects-Interactions (CEI) pattern
- Use OpenZeppelin's ReentrancyGuard
- Update state before making external calls
- Avoid calling untrusted contracts

**Related SCWE IDs:** SCWE-046, SCWE-077

## SC09: Integer Overflow/Underflow
Mathematical operations that exceed the storage capacity of the variable type. In older Solidity versions, this wraps around silently.

**Key mitigations:**
- Use Solidity 0.8+ (built-in checks)
- Use SafeMath for older versions
- Be aware of 'unchecked' blocks in 0.8+
- Use appropriate uint sizes (uint256 preferred)

**Related SCWE IDs:** SCWE-106

## SC10: Proxy and Upgradeability Vulnerabilities
Risks associated with delegating logic to other contracts. Includes storage collisions, uninitialized implementations, and unauthorized upgrades.

**Key mitigations:**
- Use OpenZeppelin Upgrades plugins
- Protect initializers with 'initializer' modifier
- Use storage gaps in base contracts
- Validate implementation addresses before upgrading

**Related SCWE IDs:** SCWE-053, SCWE-132, SCWE-043
