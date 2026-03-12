/**
 * Mapping of Slither detector names to SCWE (Smart Contract Weakness Enumeration) IDs.
 *
 * Based on Slither detector documentation:
 * https://github.com/crytic/slither/wiki/Detector-Documentation
 *
 * This mapping enables correlation between Slither's static analysis findings
 * and the OWASP Smart Contract Top 10 vulnerability taxonomy.
 */

export interface SlitherDetectorMapping {
  detector: string;
  scweId: string;
  description: string;
}

/**
 * Comprehensive mapping of Slither detectors to SCWE IDs.
 * Includes 25+ common detectors covering critical security issues.
 */
export const SLITHER_SCWE_MAPPINGS: Record<string, string> = {
  // Reentrancy vulnerabilities -> SCWE-046
  "reentrancy-eth": "SCWE-046",
  "reentrancy-no-eth": "SCWE-046",
  "reentrancy-benign": "SCWE-046",
  "reentrancy-events": "SCWE-046",
  "reentrancy-unlimited-gas": "SCWE-046",

  // tx.origin authentication -> SCWE-018
  "tx-origin": "SCWE-018",

  // Unchecked return values -> SCWE-048
  "unchecked-transfer": "SCWE-048",
  "unchecked-lowlevel": "SCWE-048",
  "unchecked-send": "SCWE-048",

  // State variable shadowing -> SCWE-069
  "shadowing-state": "SCWE-069",
  "shadowing-abstract": "SCWE-069",
  "shadowing-builtin": "SCWE-069",
  "shadowing-local": "SCWE-069",

  // Unused return values -> SCWE-048
  "unused-return": "SCWE-048",

  // Unprotected selfdestruct -> SCWE-038
  suicidal: "SCWE-038",

  // Delegatecall vulnerabilities -> SCWE-035
  "controlled-delegatecall": "SCWE-035",
  "delegatecall-loop": "SCWE-035",

  // Access control issues
  "unprotected-upgrade": "SCWE-005",
  "arbitrary-send-eth": "SCWE-049",
  "arbitrary-send-erc20": "SCWE-016",

  // Integer overflow/underflow (pre-0.8.0) -> SCWE-047
  "divide-before-multiply": "SCWE-047",
  "weak-prng": "SCWE-024",

  // Timestamp dependence -> SCWE-065
  timestamp: "SCWE-065",
  "block-timestamp": "SCWE-065",

  // Uninitialized storage -> SCWE-071
  "uninitialized-state": "SCWE-071",
  "uninitialized-storage": "SCWE-071",
  "uninitialized-local": "SCWE-071",

  // Locked ether -> SCWE-140
  "locked-ether": "SCWE-140",

  // Dangerous strict equalities -> SCWE-075
  "incorrect-equality": "SCWE-075",

  // Assembly usage -> SCWE-042
  assembly: "SCWE-042",

  // Low-level calls -> SCWE-042
  "low-level-calls": "SCWE-042",

  // Naming convention issues -> SCWE-097
  "naming-convention": "SCWE-097",

  // Pragma issues -> SCWE-060
  pragma: "SCWE-060",
  "solc-version": "SCWE-060",

  // Reentrancy read-before-write -> SCWE-046
  "reentrancy-readonly": "SCWE-046",

  // Costly operations in loop -> SCWE-058
  "costly-loop": "SCWE-058",

  // External function calls in loop -> SCWE-109
  "calls-loop": "SCWE-109",

  // Missing zero address validation -> SCWE-143
  "missing-zero-check": "SCWE-143",

  // Encode packed collision -> SCWE-074
  "encode-packed-collision": "SCWE-074",

  // Incorrect shift order -> SCWE-080
  "incorrect-shift": "SCWE-080",

  // Multiple constructor schemes -> SCWE-070
  "multiple-constructors": "SCWE-070",

  // Void constructor -> SCWE-070
  "void-cst": "SCWE-070",
};

/**
 * Get SCWE ID for a given Slither detector name.
 * Returns undefined if no mapping exists.
 */
export function getScweIdForDetector(detector: string): string | undefined {
  return SLITHER_SCWE_MAPPINGS[detector];
}

/**
 * Get all detectors mapped to a specific SCWE ID.
 */
export function getDetectorsForScweId(scweId: string): string[] {
  return Object.entries(SLITHER_SCWE_MAPPINGS)
    .filter(([_, id]) => id === scweId)
    .map(([detector]) => detector);
}
