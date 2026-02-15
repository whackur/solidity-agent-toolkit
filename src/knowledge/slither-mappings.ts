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

  // Unchecked return values -> SCWE-104
  "unchecked-transfer": "SCWE-104",
  "unchecked-lowlevel": "SCWE-104",
  "unchecked-send": "SCWE-104",

  // State variable shadowing -> SCWE-119
  "shadowing-state": "SCWE-119",
  "shadowing-abstract": "SCWE-119",
  "shadowing-builtin": "SCWE-119",
  "shadowing-local": "SCWE-119",

  // Unused return values -> SCWE-104
  "unused-return": "SCWE-104",

  // Unprotected selfdestruct -> SCWE-038
  suicidal: "SCWE-038",

  // Delegatecall vulnerabilities -> SCWE-112
  "controlled-delegatecall": "SCWE-112",
  "delegatecall-loop": "SCWE-112",

  // Access control issues -> SCWE-105
  "unprotected-upgrade": "SCWE-105",
  "arbitrary-send-eth": "SCWE-105",
  "arbitrary-send-erc20": "SCWE-105",

  // Integer overflow/underflow (pre-0.8.0) -> SCWE-101
  "divide-before-multiply": "SCWE-101",
  "weak-prng": "SCWE-120",

  // Timestamp dependence -> SCWE-116
  timestamp: "SCWE-116",
  "block-timestamp": "SCWE-116",

  // Uninitialized storage -> SCWE-109
  "uninitialized-state": "SCWE-109",
  "uninitialized-storage": "SCWE-109",
  "uninitialized-local": "SCWE-109",

  // Locked ether -> SCWE-132
  "locked-ether": "SCWE-132",

  // Dangerous strict equalities -> SCWE-132
  "incorrect-equality": "SCWE-132",

  // Assembly usage -> SCWE-127
  assembly: "SCWE-127",

  // Low-level calls -> SCWE-107
  "low-level-calls": "SCWE-107",

  // Naming convention issues -> SCWE-114
  "naming-convention": "SCWE-114",

  // Pragma issues -> SCWE-103
  pragma: "SCWE-103",
  "solc-version": "SCWE-103",

  // Reentrancy read-before-write -> SCWE-046
  "reentrancy-readonly": "SCWE-046",

  // Costly operations in loop -> SCWE-128
  "costly-loop": "SCWE-128",

  // External function calls in loop -> SCWE-113
  "calls-loop": "SCWE-113",

  // Missing zero address validation -> SCWE-123
  "missing-zero-check": "SCWE-123",

  // Encode packed collision -> SCWE-133
  "encode-packed-collision": "SCWE-133",

  // Incorrect shift order -> SCWE-129
  "incorrect-shift": "SCWE-129",

  // Multiple constructor schemes -> SCWE-124
  "multiple-constructors": "SCWE-124",

  // Void constructor -> SCWE-125
  "void-cst": "SCWE-125",
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
