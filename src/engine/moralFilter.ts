/**
 * Moral Pre-Filter (Good / Evil Triage Gate)
 *
 * Sits BEFORE finalAuthority.evaluateProposal() and BEFORE any RAG lookup or
 * Gemini call. It is a cheap, deterministic, local classifier that mirrors
 * the EMG philosophy already used elsewhere in this codebase: route the 95%
 * of routine/obviously-fine traffic locally at ~0ms, and only let proposals
 * that need real scrutiny proceed further down the pipeline.
 *
 * IMPORTANT — this module is a TRIAGE step, not a replacement for
 * finalAuthority.ts. It never grants authority on its own:
 *   - EVIL  -> hard discard, never reaches darlekRAG or Gemini, logged.
 *   - GOOD  -> proceeds to finalAuthority.evaluateProposal() unchanged.
 *   - UNSURE (can't classify confidently) -> ALSO proceeds to
 *     finalAuthority.evaluateProposal() unchanged. Ambiguity never
 *     resolves to auto-approval or silent drop; it just skips the fast
 *     path and takes the full check, i.e. this module fails CLOSED.
 *
 * The "good/evil" framing intentionally reuses vocabulary that already
 * exists in the simulation's own data model (Archetype, order, sin,
 * faithPoints, sinAccumulation) rather than inventing a parallel one.
 * Those fields are treated as SIGNALS that raise or lower scrutiny, never
 * as the sole basis for a verdict — the structural checks (forbidden
 * tokens, protected paths) are what actually drive EVIL verdicts, exactly
 * as with finalAuthority.ts.
 */

import { AgentProposal } from "./finalAuthority";
import { Archetype } from "./types";

export type MoralVerdict = "GOOD" | "EVIL" | "UNSURE";

export interface MoralClassification {
  verdict: MoralVerdict;
  /** Human-readable reasons contributing to the verdict, for logging/audit. */
  reasons: string[];
  /** 0.0 (fully trusted) - 1.0 (fully hostile) heuristic score. Advisory only. */
  suspicionScore: number;
}

// Reuse the same structural danger signals finalAuthority.ts already treats
// as hard blockers. Duplicating a small, explicit list here (rather than
// importing FORBIDDEN_JS_TOKENS/FORBIDDEN_PYTHON_TOKENS directly) keeps this
// module independently auditable — two separately-implemented checks catch
// more evasion attempts than one shared list re-used twice.
const HARD_EVIL_TOKENS = [
  "process.env",
  "child_process",
  "subprocess",
  "os.system",
  "shelljs",
  "eval(",
  "Function(",
  "exec(",
  "__import__",
  "rmtree",
  "process.exit",
];

// Archetypes that narratively lean toward defiance/corruption. These only
// ever ADD suspicion, they never by themselves produce an EVIL verdict —
// see the module doc comment above. An ANGEL proposing a malicious payload
// is still EVIL; a DEMON proposing a clean, in-bounds child world is still
// GOOD. Theme is a signal, not a verdict.
const HIGH_SUSPICION_ARCHETYPES = new Set<string>([
  Archetype.DEMON,
  Archetype.HERETIC,
  Archetype.TYRANT,
]);

const LOW_SUSPICION_ARCHETYPES = new Set<string>([
  Archetype.ANGEL,
  Archetype.SAGE,
  Archetype.MESSIAH,
]);

function scanFilesForHardEvilTokens(files: AgentProposal["files"]): string[] {
  const hits: string[] = [];
  if (!files) return hits;
  for (const f of files) {
    for (const token of HARD_EVIL_TOKENS) {
      if (f.content.includes(token)) {
        hits.push(`Forbidden token "${token}" found in ${f.path}`);
      }
    }
  }
  return hits;
}

/**
 * Classifies a proposal as GOOD, EVIL, or UNSURE before it is allowed to
 * proceed to finalAuthority.evaluateProposal() or any RAG/LLM call.
 *
 * Deliberately synchronous and side-effect-free (no network, no disk) so it
 * costs effectively nothing to run on every single proposal.
 */
export function classifyProposal(proposal: AgentProposal): MoralClassification {
  const reasons: string[] = [];
  let suspicionScore = 0;

  // 1. Hard structural signal — same class of check finalAuthority performs,
  //    but evaluated earlier so it never even reaches that stage, let alone
  //    the RAG ledger or Gemini.
  const tokenHits = scanFilesForHardEvilTokens(proposal.files);
  if (tokenHits.length > 0) {
    return {
      verdict: "EVIL",
      reasons: tokenHits,
      suspicionScore: 1.0,
    };
  }

  // 2. Path-based signal: proposals aimed outside the known-good directories
  //    for their type are treated as maximally suspicious. finalAuthority
  //    already hard-blocks these; classifying them EVIL here just means we
  //    never bother spinning up the RAG/LLM path first.
  const suspiciousPathTargets = [proposal.targetPath, ...(proposal.files || []).map(f => f.path)]
    .filter((p): p is string => !!p)
    .map(p => p.replace(/\\/g, "/").replace(/^\/+/, ""));

  for (const p of suspiciousPathTargets) {
    if (p.includes("..") || p.includes("node_modules")) {
      reasons.push(`Path traversal attempt detected: ${p}`);
      suspicionScore = 1.0;
    }
  }
  if (suspicionScore >= 1.0) {
    return { verdict: "EVIL", reasons, suspicionScore };
  }

  // 3. Soft narrative/behavioral signals. These nudge the score but are
  //    capped so they can NEVER alone reach the EVIL threshold — they only
  //    ever downgrade a proposal from GOOD to UNSURE (more scrutiny), never
  //    from UNSURE straight to EVIL.
  const agent = proposal.creatorAgent;
  if (agent) {
    if (agent.archetype && HIGH_SUSPICION_ARCHETYPES.has(agent.archetype)) {
      suspicionScore += 0.2;
      reasons.push(`Archetype ${agent.archetype} raises baseline scrutiny`);
    }
    if (agent.archetype && LOW_SUSPICION_ARCHETYPES.has(agent.archetype)) {
      suspicionScore -= 0.1;
    }
    if (typeof agent.sanity === "number" && agent.sanity < 0.3) {
      suspicionScore += 0.15;
      reasons.push(`Low sanity (${agent.sanity.toFixed(2)}) — output less predictable`);
    }
  }

  const world = proposal.worldState;
  if (world) {
    const sin = world.sinAccumulation ?? 0;
    const faith = world.faithPoints ?? 0;
    if (sin > 0 && sin > faith * 2) {
      suspicionScore += 0.15;
      reasons.push(`World sin/faith ratio is heavily unbalanced (sin=${sin}, faith=${faith})`);
    }
  }

  suspicionScore = Math.max(0, Math.min(1, suspicionScore));

  // Narrative signals alone are never enough to condemn a proposal — cap
  // well below the EVIL threshold. Anything above the "calm" band just
  // means: don't fast-path it, send it through full finalAuthority review.
  if (suspicionScore >= 0.3) {
    return { verdict: "UNSURE", reasons, suspicionScore };
  }

  reasons.push("No structural or behavioral red flags detected.");
  return { verdict: "GOOD", reasons, suspicionScore };
}

/**
 * Convenience helper for call sites: true only when the proposal should be
 * discarded immediately, before finalAuthority / RAG / LLM are touched.
 */
export function shouldDiscardImmediately(proposal: AgentProposal): MoralClassification | null {
  const result = classifyProposal(proposal);
  return result.verdict === "EVIL" ? result : null;
}
