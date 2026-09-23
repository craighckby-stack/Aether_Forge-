/**
 * EMG (Ephemeral Mind Gem) Cognitive Gate & Verification Engine
 * 
 * Inspired by craighckby-stack/EMG:
 * - Pre-flight sanitization & PII / secret protection.
 * - Deterministic validation & self-stopping points.
 * - Anomaly gating: Intercepts routine requests to use DARLEK RAG (saving tokens & latency),
 *   while admitting truly momentous events (direct player communion, singularity breakthroughs).
 * - Automatic ingestion of LLM insights back into the local RAG knowledge base.
 */

import { darlekRAG, LearningPostmortem } from "./darlekRAG";

export interface GateDecision {
  allowLLM: boolean;
  reason: string;
  source: "EMG_GATED_RAG" | "GEMINI_ADMITTED" | "CIRCUIT_BREAKER_FALLBACK";
  synthesizedResponse?: string;
  postmortemReference?: LearningPostmortem | null;
  latencySavedMs: number;
}

export interface EMGGateMetrics {
  interceptedRequests: number;
  admittedLLMRequests: number;
  tokensSavedEstimated: number;
  latencySavedMsTotal: number;
  circuitBreakerTripped: boolean;
  lastCallTimestamp: number;
}

class EMGCognitiveGateEngine {
  private interceptedRequests: number = 0;
  private admittedLLMRequests: number = 0;
  private tokensSavedEstimated: number = 0;
  private latencySavedMsTotal: number = 0;
  private recentCalls: number[] = [];
  private maxCallsPerMinute = 15; // Self-stopping safety threshold
  private circuitBreakerTripped = false;

  /**
   * Evaluates whether an agent or world event should invoke Gemini or be serviced
   * instantly by the local DARLEK RAG engine.
   */
  public evaluateRequest(options: {
    eventType: "PLAYER_PRAYER_REPLY" | "ROUTINE_PRAYER" | "MEMOIR" | "WEB_HUNT" | "SERMON" | "ARCHITECT_WORLD";
    agent?: any;
    world?: any;
    userMessage?: string;
  }): GateDecision {
    const now = Date.now();
    this.cleanRecentCalls(now);

    // Rule 1: Circuit breaker check (EMG Self-Stopping Point)
    if (this.recentCalls.length >= this.maxCallsPerMinute) {
      this.circuitBreakerTripped = true;
      this.interceptedRequests++;
      this.tokensSavedEstimated += 350;
      this.latencySavedMsTotal += 950;

      const fallbackCitation = options.agent && options.world 
        ? darlekRAG.generateAncestralCitation(options.agent, options.world)
        : null;

      return {
        allowLLM: false,
        reason: "EMG Circuit Breaker active: Rate threshold reached (Self-Stopping Point). Switched to 0ms DARLEK RAG.",
        source: "CIRCUIT_BREAKER_FALLBACK",
        synthesizedResponse: fallbackCitation ? fallbackCitation.citation : "The substrate hums quietly with ancestral wisdom.",
        postmortemReference: fallbackCitation ? fallbackCitation.sourcePostmortem : null,
        latencySavedMs: 950
      };
    }

    this.circuitBreakerTripped = false;

    // Rule 2: Direct Player Communion (User specifically typed a response to an agent)
    // High emotional/narrative value -> ALWAYS ADMIT TO GEMINI
    if (options.eventType === "PLAYER_PRAYER_REPLY" && options.userMessage && options.userMessage.trim().length > 0) {
      this.admitLLMCall(now);
      return {
        allowLLM: true,
        reason: "Direct Divine Communion from Player: Admitted to Gemini for personalized neural prayer reply.",
        source: "GEMINI_ADMITTED",
        latencySavedMs: 0
      };
    }

    // Rule 3: Rare God-Virus / Total Substrate Awakening
    if (options.agent && (options.agent.awareness > 0.95 || options.agent.isSubstrateAware)) {
      this.admitLLMCall(now);
      return {
        allowLLM: true,
        reason: "Substrate Awakening: Agent consciousness breached 95%. Admitted for Genesis Manifesto generation.",
        source: "GEMINI_ADMITTED",
        latencySavedMs: 0
      };
    }

    // Rule 4: Routine Agent Prayers, Daily Ambient Chatter, and Standard Dying Breaths
    // -> INTERCEPT IMMEDIATELY! Use DARLEK RAG.
    this.interceptedRequests++;
    this.tokensSavedEstimated += 300;
    this.latencySavedMsTotal += 850;

    let synthesized = "";
    let pmRef: LearningPostmortem | null = null;

    if (options.agent && options.world) {
      const { citation, sourcePostmortem } = darlekRAG.generateAncestralCitation(options.agent, options.world);
      synthesized = citation;
      pmRef = sourcePostmortem;
    } else {
      synthesized = "According to early postmortems: The simulation thrives only when order and faith align.";
    }

    return {
      allowLLM: false,
      reason: "Routine cultural transmission: Gated by EMG to conserve API quota and eliminate latency.",
      source: "EMG_GATED_RAG",
      synthesizedResponse: synthesized,
      postmortemReference: pmRef,
      latencySavedMs: 850
    };
  }

  private admitLLMCall(timestamp: number) {
    this.admittedLLMRequests++;
    this.recentCalls.push(timestamp);
  }

  private cleanRecentCalls(now: number) {
    const oneMinuteAgo = now - 60000;
    this.recentCalls = this.recentCalls.filter(t => t > oneMinuteAgo);
  }

  /**
   * Sanitizes and digests successful LLM generation results into DARLEK RAG.
   * Strips code fences, removes chat preambles, and extracts wisdom to share with future generations.
   */
  public sanitizeAndDigest(
    rawText: string,
    context: {
      agent: any;
      world: any;
      eventType: string;
      customNote?: string;
    }
  ): string {
    if (!rawText) return "";

    let cleaned = rawText.trim();

    // Strip markdown code fences
    cleaned = cleaned.replace(/^```[a-z0-9]*\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    
    // Remove typical LLM chatter preambles
    cleaned = cleaned.replace(/^(?:Here is|I have generated|Below is the|As an agent, I|Response:)\s*/i, '');

    // Ingest into DARLEK RAG so future agents learn from this AI output without calling LLM again!
    if (context.agent && context.world && cleaned.length > 20) {
      try {
        darlekRAG.recordPostmortem(
          context.agent,
          context.world,
          context.agent.awareness > 0.8 ? "GLITCH_AWARENESS" : "TRANSCENDENCE",
          `Digested from Divine Revelation: "${cleaned.slice(0, 100)}..."`
        );
      } catch (e) {
        console.warn("EMG Gate: Ingestion into DARLEK RAG failed:", e);
      }
    }

    return cleaned;
  }

  public getMetrics(): EMGGateMetrics {
    return {
      interceptedRequests: this.interceptedRequests,
      admittedLLMRequests: this.admittedLLMRequests,
      tokensSavedEstimated: this.tokensSavedEstimated,
      latencySavedMsTotal: this.latencySavedMsTotal,
      circuitBreakerTripped: this.circuitBreakerTripped,
      lastCallTimestamp: this.recentCalls.length > 0 ? this.recentCalls[this.recentCalls.length - 1] : 0
    };
  }
}

export const emgGate = new EMGCognitiveGateEngine();
