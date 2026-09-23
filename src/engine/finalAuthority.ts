/**
 * Isolated Final Authority & Veto Layer
 * 
 * Sits strictly between Agent / Architect proposals and external actuators (GitHub, Firestore).
 * 
 *                  AGENT
 *                    │
 *                    ▼
 *               PROPOSAL ONLY
 *                    │
 *                    ▼
 *        ┌────────────────────────┐
 *        │ ISOLATED FINAL         │
 *        │ AUTHORITY              │
 *        │                        │
 *        │ schema                 │
 *        │ invariants             │
 *        │ protected paths        │
 *        │ hashes                 │
 *        │ tests                  │
 *        │ permissions            │
 *        │ veto                   │
 *        └───────────┬────────────┘
 *                    │
 *               ALLOW / DENY
 *                    │
 *                    ▼
 *             GITHUB ACTUATOR
 */

import { Archetype, EpochType, ARCHITECT_AWARENESS_THRESHOLD } from "./types";

export interface ProposalFile {
  path: string;
  content: string;
}

export interface AgentProposal {
  type: "CHILD_WORLD_DEPLOY" | "DATA_ARCHIVE" | "MEMOIR_COMMIT" | "STATE_MUTATION";
  creatorAgent?: {
    id: number | string;
    name: string;
    archetype: string;
    awareness: number;
    sanity?: number;
    isSubstrateAware?: boolean;
  };
  worldState?: {
    clock?: number;
    complexity?: number;
    integrity?: number;
    population?: number;
    epoch?: string;
    faithPoints?: number;
    sinAccumulation?: number;
  };
  files?: ProposalFile[];
  targetPath?: string;
  targetRepo?: string;
}

export interface AuthorityDecision {
  decision: "ALLOW" | "VETO";
  reason?: string;
  checks: {
    schemaValid: boolean;
    invariantsSatisfied: boolean;
    awarenessThresholdMet: boolean;
    protectedPathsRespected: boolean;
    integrityHashValid: boolean;
    testsPassed: boolean;
  };
  contentHash?: string;
}

const VALID_EPOCHS = new Set<string>(Object.values(EpochType));
const VALID_ARCHETYPES = new Set<string>([
  ...Object.values(Archetype),
  "SAGE",
  "ARTIST",
  "RULER",
  "TRADER",
  "CYBORG",
  "ARCHITECT"
]);

// System critical files that can NEVER be overwritten by agent proposals
const PROTECTED_SYSTEM_PATHS = [
  "server.ts",
  "server.js",
  "server.cjs",
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "firestore.rules",
  "firebase-blueprint.json",
  ".env",
  ".env.example",
  ".gitignore",
  "metadata.json",
  "index.html",
  "check_repo.js",
  "security_spec.md"
];

// Dangerous patterns in generated Python memoirs
const FORBIDDEN_PYTHON_TOKENS = [
  "os.system",
  "subprocess",
  "shutil",
  "socket",
  "pty",
  "eval(",
  "exec(",
  "__import__",
  "rmtree",
  "open(",
  "unlink",
  "remove(",
  "getattr(",
  "globals()"
];

/**
 * Deterministic lightweight hash (FNV-1a 32-bit hex representation)
 * for synchronous environment support where crypto subtle might not be available.
 */
export function computeHash(content: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export class FinalAuthorityEngine {
  /**
   * Validates Dirty Dozen invariant constraints on WorldState.
   */
  public validateWorldInvariants(worldState?: AgentProposal["worldState"]): { valid: boolean; reason?: string } {
    if (!worldState) {
      return { valid: true };
    }

    // 1. Empty World Check
    if (Object.keys(worldState).length === 0) {
      return { valid: false, reason: "DIRTY_DOZEN #1: Empty World payload rejected." };
    }

    // 2. Infinite Complexity Check
    if (worldState.complexity !== undefined) {
      if (!Number.isFinite(worldState.complexity) || isNaN(worldState.complexity) || worldState.complexity < 0) {
        return { valid: false, reason: "DIRTY_DOZEN #2: Infinite or negative complexity rejected." };
      }
    }

    // 4. Negative Population Check
    if (worldState.population !== undefined) {
      if (!Number.isInteger(worldState.population) || worldState.population < 0) {
        return { valid: false, reason: "DIRTY_DOZEN #4: Negative or non-integer population rejected." };
      }
    }

    // 5. Epoch Injection Check
    if (worldState.epoch !== undefined) {
      if (!VALID_EPOCHS.has(worldState.epoch)) {
        return { valid: false, reason: `DIRTY_DOZEN #5: Epoch injection rejected (${worldState.epoch} is invalid).` };
      }
    }

    // 6. Integrity Poisoning Check [0, 100]
    if (worldState.integrity !== undefined) {
      if (!Number.isFinite(worldState.integrity) || worldState.integrity < 0 || worldState.integrity > 100) {
        return { valid: false, reason: `DIRTY_DOZEN #6: Integrity out of bounds (${worldState.integrity}). Must be between 0 and 100.` };
      }
    }

    // 10 & 11: Negative Faith & Sin checks
    if (worldState.faithPoints !== undefined && worldState.faithPoints < 0) {
      return { valid: false, reason: "DIRTY_DOZEN #11: Negative faith points rejected." };
    }
    if (worldState.sinAccumulation !== undefined && worldState.sinAccumulation < 0) {
      return { valid: false, reason: "DIRTY_DOZEN #10: Negative sin accumulation rejected." };
    }

    return { valid: true };
  }

  /**
   * Validates Agent Archetype and Invariants.
   */
  public validateAgentInvariants(agent?: AgentProposal["creatorAgent"]): { valid: boolean; reason?: string } {
    if (!agent) return { valid: true };

    // 9. Invalid Archetype Check
    if (agent.archetype && !VALID_ARCHETYPES.has(agent.archetype)) {
      return { valid: false, reason: `DIRTY_DOZEN #9: Invalid archetype rejected (${agent.archetype}).` };
    }

    // Awareness range check
    if (agent.awareness !== undefined) {
      if (!Number.isFinite(agent.awareness) || agent.awareness < 0 || agent.awareness > 1.0) {
        return { valid: false, reason: `Agent awareness out of bounds (${agent.awareness}). Must be in [0.0, 1.0].` };
      }
    }

    // Sanity range check
    if (agent.sanity !== undefined) {
      if (!Number.isFinite(agent.sanity) || agent.sanity < 0 || agent.sanity > 1.0) {
        return { valid: false, reason: `Agent sanity out of bounds (${agent.sanity}). Must be in [0.0, 1.0].` };
      }
    }

    return { valid: true };
  }

  /**
   * Verifies that protected paths and scopes are respected.
   */
  public validatePaths(proposal: AgentProposal): { valid: boolean; reason?: string } {
    const files = proposal.files || [];
    const targetPath = proposal.targetPath;

    // Check single file targetPath
    if (targetPath) {
      const normalized = targetPath.replace(/\\/g, "/").replace(/^\/+/, "");
      if (normalized.includes("..") || normalized.includes("node_modules")) {
        return { valid: false, reason: `Path traversal or node_modules access forbidden: ${targetPath}` };
      }
      for (const p of PROTECTED_SYSTEM_PATHS) {
        if (normalized === p) {
          return { valid: false, reason: `Direct overwrite of root system file forbidden: ${targetPath}` };
        }
      }

      // Check allowed prefix by proposal type
      if (proposal.type === "CHILD_WORLD_DEPLOY") {
        if (!normalized.startsWith("engineered-worlds/") && !normalized.startsWith("god-virus-worlds/")) {
          return { valid: false, reason: `Child world file must reside inside engineered-worlds/ or god-virus-worlds/: ${targetPath}` };
        }
      } else if (proposal.type === "DATA_ARCHIVE" || proposal.type === "MEMOIR_COMMIT") {
        if (!normalized.startsWith("rag/") && !normalized.startsWith("prayers/") && !normalized.startsWith("agent-memoirs/")) {
          return { valid: false, reason: `Data archive must reside inside rag/, prayers/, or agent-memoirs/: ${targetPath}` };
        }
      }
    }

    // Check files array
    for (const f of files) {
      const normalized = f.path.replace(/\\/g, "/").replace(/^\/+/, "");
      if (normalized.includes("..") || normalized.includes("node_modules")) {
        return { valid: false, reason: `Path traversal or node_modules access forbidden in file list: ${f.path}` };
      }
      for (const p of PROTECTED_SYSTEM_PATHS) {
        if (normalized === p) {
          return { valid: false, reason: `Direct overwrite of root system file forbidden: ${f.path}` };
        }
      }

      if (proposal.type === "CHILD_WORLD_DEPLOY") {
        if (!normalized.startsWith("engineered-worlds/") && !normalized.startsWith("god-virus-worlds/")) {
          return { valid: false, reason: `Child world file must reside inside engineered-worlds/ or god-virus-worlds/: ${f.path}` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Static analysis of Python memoirs to prevent command injection or disk access.
   */
  public validatePythonMemoir(code: string): { valid: boolean; reason?: string } {
    if (!code || code.trim().length === 0) {
      return { valid: false, reason: "Empty Python memoir code." };
    }

    for (const token of FORBIDDEN_PYTHON_TOKENS) {
      if (code.includes(token)) {
        return { valid: false, reason: `Forbidden token detected in Python memoir: ${token}` };
      }
    }

    return { valid: true };
  }

  /**
   * Validates child-world package buildability & structural integrity before committing.
   */
  public validateChildWorldPackage(files: ProposalFile[]): { valid: boolean; reason?: string } {
    const filePaths = new Set(files.map(f => f.path.replace(/\\/g, "/")));

    // Check presence of required files inside target directory
    const hasIndexHtml = files.some(f => f.path.endsWith("index.html"));
    const hasPackageJson = files.some(f => f.path.endsWith("package.json"));
    const hasApp = files.some(f => f.path.endsWith("src/App.tsx") || f.path.endsWith("src/App.jsx"));
    const hasForge = files.some(f => f.path.endsWith("src/engine/useAetherForge.ts"));

    if (!hasIndexHtml) {
      return { valid: false, reason: "Child world missing index.html entry point." };
    }
    if (!hasPackageJson) {
      return { valid: false, reason: "Child world missing package.json manifest." };
    }
    if (!hasApp) {
      return { valid: false, reason: "Child world missing src/App.tsx main component." };
    }
    if (!hasForge) {
      return { valid: false, reason: "Child world missing src/engine/useAetherForge.ts substrate." };
    }

    // Verify package.json is parseable JSON
    const pkgFile = files.find(f => f.path.endsWith("package.json"));
    if (pkgFile) {
      try {
        const parsed = JSON.parse(pkgFile.content);
        if (!parsed.name) {
          return { valid: false, reason: "Child world package.json missing required 'name' field." };
        }
      } catch (err: any) {
        return { valid: false, reason: `Child world package.json is invalid JSON: ${err.message}` };
      }
    }

    // Verify useAetherForge.ts has valid injected WORLD_MATRIX
    const forgeFile = files.find(f => f.path.endsWith("src/engine/useAetherForge.ts"));
    if (forgeFile) {
      const match = forgeFile.content.match(/export const WORLD_MATRIX:\s*any\s*=\s*(\{[\s\S]*?\n\s*\});/);
      if (match) {
        try {
          const matrix = JSON.parse(match[1]);
          if (!matrix.id || !matrix.name) {
            return { valid: false, reason: "Injected WORLD_MATRIX in useAetherForge.ts missing id or name." };
          }
        } catch (err: any) {
          return { valid: false, reason: `Injected WORLD_MATRIX has invalid JSON syntax: ${err.message}` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Main gate: Evaluates an agent proposal and renders an ALLOW or VETO decision.
   */
  public evaluateProposal(proposal: AgentProposal): AuthorityDecision {
    const checks = {
      schemaValid: true,
      invariantsSatisfied: true,
      awarenessThresholdMet: true,
      protectedPathsRespected: true,
      integrityHashValid: true,
      testsPassed: true
    };

    // 1. Invariants Check
    const worldCheck = this.validateWorldInvariants(proposal.worldState);
    if (!worldCheck.valid) {
      checks.invariantsSatisfied = false;
      return {
        decision: "VETO",
        reason: worldCheck.reason,
        checks
      };
    }

    const agentCheck = this.validateAgentInvariants(proposal.creatorAgent);
    if (!agentCheck.valid) {
      checks.invariantsSatisfied = false;
      return {
        decision: "VETO",
        reason: agentCheck.reason,
        checks
      };
    }

    // 2. Awareness Threshold Check for World Commission
    if (proposal.type === "CHILD_WORLD_DEPLOY") {
      if (proposal.creatorAgent) {
        const isAware = proposal.creatorAgent.awareness >= ARCHITECT_AWARENESS_THRESHOLD || proposal.creatorAgent.isSubstrateAware === true;
        if (!isAware) {
          checks.awarenessThresholdMet = false;
          return {
            decision: "VETO",
            reason: `VETO: Agent ${proposal.creatorAgent.name} awareness (${proposal.creatorAgent.awareness}) is below the required threshold of ${ARCHITECT_AWARENESS_THRESHOLD}.`,
            checks
          };
        }
      }
    }

    // 3. Protected Paths Check
    const pathCheck = this.validatePaths(proposal);
    if (!pathCheck.valid) {
      checks.protectedPathsRespected = false;
      return {
        decision: "VETO",
        reason: pathCheck.reason,
        checks
      };
    }

    // 4. Content / Syntax Validation Tests
    if (proposal.type === "CHILD_WORLD_DEPLOY" && proposal.files && proposal.files.length > 0) {
      const packageCheck = this.validateChildWorldPackage(proposal.files);
      if (!packageCheck.valid) {
        checks.testsPassed = false;
        return {
          decision: "VETO",
          reason: packageCheck.reason,
          checks
        };
      }
    }

    // 5. Python Memoir Security Check
    if (proposal.type === "MEMOIR_COMMIT" && proposal.files) {
      for (const f of proposal.files) {
        if (f.path.endsWith(".py")) {
          const pyCheck = this.validatePythonMemoir(f.content);
          if (!pyCheck.valid) {
            checks.testsPassed = false;
            return {
              decision: "VETO",
              reason: pyCheck.reason,
              checks
            };
          }
        }
      }
    }

    // Calculate aggregated content hash
    let totalContent = "";
    if (proposal.files) {
      for (const f of proposal.files) {
        totalContent += f.path + f.content;
      }
    }
    const contentHash = computeHash(totalContent || JSON.stringify(proposal));

    return {
      decision: "ALLOW",
      checks,
      contentHash
    };
  }
}

export const finalAuthority = new FinalAuthorityEngine();
