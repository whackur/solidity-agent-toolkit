/**
 * Barrel import for all AST detectors. Each module self-registers
 * via registerDetector() on import. Import this file to activate
 * all detectors in the registry.
 */

import "./reentrancy.js";
import "./access-control.js";
import "./external-calls.js";
import "./arithmetic.js";
import "./code-quality.js";
import "./events.js";
import "./randomness.js";
import "./signature.js";
import "./dos.js";
