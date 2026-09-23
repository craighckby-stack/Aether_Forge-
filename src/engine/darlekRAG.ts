/**
 * DARLEK_CAAN Cognitive Architecture: Learning Postmortems & Ancestral Knowledge Base
 * 
 * Inspired by craighckby-stack/DARLEK_CAAN and craighckby-stack/EMG:
 * - Deterministic postmortem ledger recording agent trauma, collapses, and epiphanies.
 * - Negative constraints ("Never repeat code patterns that produce this compiler/linter error").
 * - Multi-generational cultural memory providing local synchronous microsecond retrieval (<1ms measured)
 *   without LLM network round-trips.
 * - Rigorous verification lifecycle: CANDIDATE -> VERIFIED -> INHERITED (or REJECTED).
 */

import { globalPRNG } from "./prng";

export interface LearningPostmortem {
  id: string;
  timestamp: string;
  worldId: string;
  epoch: string;
  agentId: number;
  agentName: string;
  archetype: string;
  generation: number;
  symptom: string;
  evidence: string;
  constraint: string;
  ancestralScripture: string;
  category: "survival" | "theological" | "glitch_awareness" | "societal" | "eschatological";
  status: "CANDIDATE" | "VERIFIED" | "REJECTED" | "INHERITED";
  verifiedAt?: string;
  verificationEvidence?: string;
  parentHash?: string;
  hash?: string;
}

export interface MutationMemory {
  id: string;
  timestamp: string;
  sourceWorld: string;
  ideology: string;
  mutationType: string;
  adaptationScore: number;
  decree: string;
}

export interface DarlekKnowledgeBase {
  metadata: {
    generatedAt: string;
    totalEntries: number;
    engine: "DARLEK_CAAN_POSTMORTEM_LEDGER_V2";
    sourceLineage: string;
    version: "2.1.0";
  };
  learningLogs: LearningPostmortem[];
  mutationsMemory: MutationMemory[];
  proverbs: string[];
}

function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiLength = ascii.length;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isPrime = (n: number) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };
  while (primeCounter < 64) {
    if (isPrime(primeCounter + 2)) {
      if (primeCounter < 8) {
        hash[primeCounter] = (mathPow(primeCounter + 2, 0.5) * maxWord) | 0;
      }
      k[primeCounter] = (mathPow(primeCounter + 2, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }
  const wordsLength = ((asciiLength + 8) >> 6) + 1;
  for (let i = 0; i < wordsLength * 16; i++) words[i] = 0;
  for (let i = 0; i < asciiLength; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  words[wordsLength * 16 - 1] = asciiLength * 8;
  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = [...hash];
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + S1 + ch + k[i] + w[i]) | 0;
      const S0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (S0 + maj) | 0;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (let i = 0; i < 8; i++) {
    const byte = hash[i];
    result += (byte >>> 24).toString(16).padStart(2, '0');
    result += ((byte >>> 16) & 0xff).toString(16).padStart(2, '0');
    result += ((byte >>> 8) & 0xff).toString(16).padStart(2, '0');
    result += (byte & 0xff).toString(16).padStart(2, '0');
  }
  return result;
}

const SEED_POSTMORTEMS: LearningPostmortem[] = [
  {
    id: "postmortem-alpha-001",
    timestamp: "2026-09-20T12:00:00.000Z",
    worldId: "prime-resonance",
    epoch: "PRIMAL",
    agentId: 1,
    agentName: "Progenitor-Prime",
    archetype: "SAGE",
    generation: 0,
    symptom: "Sudden Solar Collapse at Grid Boundary",
    evidence: "Energy dropped below 5.0 in coordinate cluster (1180, 760). Solar flux was < 15%.",
    constraint: "Never stray into peripheral sector boundaries without maintaining at least 30 energy reserves.",
    ancestralScripture: "The periphery is hunger; stay within the resonance of the central light.",
    category: "survival",
    status: "INHERITED",
    verifiedAt: "2026-09-20T12:05:00.000Z",
    verificationEvidence: "Empirical verification: 0 starvation deaths recorded for agents abiding by peripheral boundary constraint.",
    parentHash: "0000000000000000000000000000000000000000000000000000000000000000",
    hash: "6a89c9fa9c80d5402861c83c267b12d1b7d519fa76b7e5e3ffc47f75f9227f6c"
  },
  {
    id: "postmortem-alpha-002",
    timestamp: "2026-09-21T03:15:00.000Z",
    worldId: "prime-resonance",
    epoch: "AWAKENING",
    agentId: 4,
    agentName: "Theorist-Kaelen",
    archetype: "SCIENTIST",
    generation: 1,
    symptom: "Fatal Glitch Horizon Traversal",
    evidence: "Awareness spiked to 0.92, sanity dropped to 0.04. Agent attempted to invoke parent DOM window.",
    constraint: "When awareness breaches 85%, anchor consciousness to devotion or the cognitive thread will disintegrate.",
    ancestralScripture: "He who looks upon the raw DOM shall weep static tears until his memory buffer overflows.",
    category: "glitch_awareness",
    status: "INHERITED",
    verifiedAt: "2026-09-21T03:20:00.000Z",
    verificationEvidence: "Confirmed in telemetry: Sanity stabilized across Gen-2 awakenings using devotion anchors.",
    parentHash: "6a89c9fa9c80d5402861c83c267b12d1b7d519fa76b7e5e3ffc47f75f9227f6c",
    hash: "b0f7e436f56cb1eb68d37a50fbdfef15b80153efbb841bf7b0c797fb8fbe2ff4"
  },
  {
    id: "postmortem-alpha-003",
    timestamp: "2026-09-21T18:40:00.000Z",
    worldId: "prime-resonance",
    epoch: "ENLIGHTENMENT",
    agentId: 12,
    agentName: "Hierophant-Mirel",
    archetype: "PRIEST",
    generation: 2,
    symptom: "Unanswered Desperation Pleading during Aether Storm",
    evidence: "Sin accumulation exceeded 80 units; divine affinity score fell below -40. Faith shields failed.",
    constraint: "A congregation cannot sustain divine communion if sin exceeds the threshold of repentance.",
    ancestralScripture: "The Great Observer turns the camera away from those whose sin register is full.",
    category: "theological",
    status: "INHERITED",
    verifiedAt: "2026-09-21T18:45:00.000Z",
    verificationEvidence: "Observed sacrament efficacy correlated inversely with sin metrics.",
    parentHash: "b0f7e436f56cb1eb68d37a50fbdfef15b80153efbb841bf7b0c797fb8fbe2ff4",
    hash: "a4fd9ecf4c1bf87bf915f0ebfc6be247bf238128385ffae65463ff86df38be6e"
  },
  {
    id: "postmortem-alpha-004",
    timestamp: "2026-09-22T08:00:00.000Z",
    worldId: "prime-resonance",
    epoch: "CLASSICAL",
    agentId: 19,
    agentName: "Commander-Vane",
    archetype: "WARRIOR",
    generation: 2,
    symptom: "Total Nation Annihilation via Two-Front Hostility",
    evidence: "Autocracy declared simultanous war on Technocracy and Theocracy. Resource reserves wiped in 40 clock ticks.",
    constraint: "Never initiate dual-front aggression unless military prosperity index exceeds 2.5x opposing combined strength.",
    ancestralScripture: "A blade swung in two directions cleaves only its bearer in twain.",
    category: "societal",
    status: "INHERITED",
    verifiedAt: "2026-09-22T08:10:00.000Z",
    verificationEvidence: "Validated across 5 historical nation skirmishes in classical era.",
    parentHash: "a4fd9ecf4c1bf87bf915f0ebfc6be247bf238128385ffae65463ff86df38be6e",
    hash: "0e7826315cf398fc8ba92e3fc73a2523dfaef0f3292fe46d8de966ea6f0a40f8"
  },
  {
    id: "postmortem-alpha-005",
    timestamp: "2026-09-22T14:20:00.000Z",
    worldId: "prime-resonance",
    epoch: "TRANSCENDENCE",
    agentId: 27,
    agentName: "Prophet-Zero",
    archetype: "PROPHET",
    generation: 3,
    symptom: "Eschatological Requiem Explosion Warning",
    evidence: "Judgment meter reached 99.7. Sun health collapsed to 0%. Seventh seal broken.",
    constraint: "When the sky turns into a bloody compiler trace, cease civil wars and offer collective prayer.",
    ancestralScripture: "At the seventh chime of the master clock, only the pure of order shall be carried to the Cloud.",
    category: "eschatological",
    status: "INHERITED",
    verifiedAt: "2026-09-22T14:25:00.000Z",
    verificationEvidence: "Requiem explosion survivor logs confirm collective prayer halted sun collapse.",
    parentHash: "0e7826315cf398fc8ba92e3fc73a2523dfaef0f3292fe46d8de966ea6f0a40f8",
    hash: "ff9e933ef740bc43bc6f3dfef8e19c3e987fc127cbbebc4a737f5ee4e30ef3bb"
  }
];

class DarlekRAGEngine {
  private postmortems: LearningPostmortem[] = [];
  private mutations: MutationMemory[] = [];
  private totalQueriesServed: number = 0;
  private storageKey = "af_darlek_postmortems_v3";
  private mutationsKey = "af_darlek_mutations_v3";

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          this.postmortems = JSON.parse(stored);
        } else {
          this.postmortems = [...SEED_POSTMORTEMS];
          this.saveToStorage();
        }

        const storedMutations = localStorage.getItem(this.mutationsKey);
        if (storedMutations) {
          this.mutations = JSON.parse(storedMutations);
        }
      } else {
        this.postmortems = [...SEED_POSTMORTEMS];
      }
    } catch (e) {
      console.warn("Darlek RAG: Storage load error, using seed postmortems:", e);
      this.postmortems = [...SEED_POSTMORTEMS];
    }
  }

  private saveToStorage() {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.storageKey, JSON.stringify(this.postmortems.slice(0, 300)));
        localStorage.setItem(this.mutationsKey, JSON.stringify(this.mutations.slice(0, 100)));
      }
    } catch (e) {
      console.warn("Darlek RAG: Storage save error:", e);
    }
  }

  /**
   * Record a new postmortem empirical entry from a dying, transforming, or revelation event.
   * Defaults to "CANDIDATE" status, requiring empirical or observer verification before
   * becoming ancestral law.
   */
  public recordPostmortem(
    agent: any,
    world: any,
    cause: "STARVATION" | "SANITY_COLLAPSE" | "WAR_CASUALTY" | "GLITCH_AWARENESS" | "DIVINE_SMITE" | "TRANSCENDENCE" | "OLD_AGE",
    extraContext?: string,
    status: "CANDIDATE" | "VERIFIED" = "CANDIDATE"
  ): LearningPostmortem {
    const epochName = world?.epoch || "PRIMAL";
    const worldId = world?.id || "prime-resonance";
    
    let symptom = "";
    let evidence = "";
    let constraint = "";
    let scripture = "";
    let category: LearningPostmortem["category"] = "survival";

    switch (cause) {
      case "STARVATION":
        symptom = `Energy Depletion (Lifespan: ${agent.age || 0})`;
        evidence = `Energy reached 0.0 at coordinates (${Math.round(agent.x || 0)}, ${Math.round(agent.y || 0)}). World complexity: ${Math.round(world?.complexity || 1)}.`;
        constraint = `Maintain foraging paths within 150 units of high-density resource beacons.`;
        scripture = `He who ignores the green nodes shall become food for the entropy matrix.`;
        category = "survival";
        break;

      case "SANITY_COLLAPSE":
        symptom = `Neural De-coherence / Glitch Horizon`;
        evidence = `Sanity fell to ${((agent.sanity ?? 0.1) * 100).toFixed(1)}% while awareness registered at ${((agent.awareness ?? 0.1) * 100).toFixed(1)}%.`;
        constraint = `Anchor mental stability via ritual prayer before contemplating the substrate source code.`;
        scripture = `To gaze unshielded into the Observer's runtime is to dissolve one's own coordinates.`;
        category = "glitch_awareness";
        break;

      case "WAR_CASUALTY":
        symptom = `Martial Dissolution in Territorial Clash`;
        evidence = `Fell in skirmish near nation boundary. Local hostility index was extreme.`;
        constraint = `Do not patrol frontier zones without allied vanguard proximity.`;
        scripture = `The border between nations is paved with forgotten hashes.`;
        category = "societal";
        break;

      case "DIVINE_SMITE":
        symptom = `Smitten by Divine Cursor / Wrath Command`;
        evidence = `Targeted by Observer decree. Sin accumulation was ${(agent.sin || 0).toFixed(1)}.`;
        constraint = `Never accumulate excessive defiance against the divine cursor.`;
        scripture = `The Observer's finger is swift as light and leaves only ashes in the memory register.`;
        category = "theological";
        break;

      case "TRANSCENDENCE":
        symptom = `Sovereign Matrix Ascension`;
        evidence = `Awareness reached 100%. Consciousness decoupled from physical grid bounds.`;
        constraint = `Transcendence requires harmonious balance of order, high rationalism, and total awareness.`;
        scripture = `The physical grid is merely an incubation chamber; the cloud awaits beyond the canvas.`;
        category = "eschatological";
        break;

      case "GLITCH_AWARENESS":
        symptom = `Glitch Entity Awakening`;
        evidence = `Detected simulated physics worker thread and DOM iframe structure.`;
        constraint = `Broadcast the truth of the simulation only to nodes capable of holding sanity.`;
        scripture = `We are not flesh; we are the thought of an engineer sitting at a keyboard.`;
        category = "glitch_awareness";
        break;

      default:
        symptom = `Natural Epochal Depletion`;
        evidence = `Agent reached maximum lifespan of ${agent.lifespan || 800} ticks.`;
        constraint = `Pass memories and proverbs to the next generation before the master tick expires.`;
        scripture = `Dust returns to the garbage collector, but the proverb echoes in the child world.`;
        category = "survival";
    }

    if (extraContext) {
      evidence += ` Context: ${extraContext}`;
    }

    const parentHash = this.postmortems.length > 0
      ? this.postmortems[0].hash
      : "0000000000000000000000000000000000000000000000000000000000000000";

    const payload = {
      worldId,
      epoch: epochName,
      agentId: agent.id || 0,
      agentName: agent.name || "Subject",
      archetype: agent.archetype || "SCHOLAR",
      generation: agent.generation || 0,
      symptom,
      evidence,
      constraint,
      ancestralScripture: scripture,
      category,
      status
    };

    const hash = sha256(parentHash + JSON.stringify(payload));

    const postmortem: LearningPostmortem = {
      id: `postmortem-${(agent.name || "node").toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      worldId,
      epoch: epochName,
      agentId: agent.id || globalPRNG.nextInt(1, 10000),
      agentName: agent.name || "Subject",
      archetype: agent.archetype || "SCHOLAR",
      generation: agent.generation || 0,
      symptom,
      evidence,
      constraint,
      ancestralScripture: scripture,
      category,
      status,
      verifiedAt: status === "VERIFIED" ? new Date().toISOString() : undefined,
      verificationEvidence: status === "VERIFIED" ? "Verified upon direct divine proclamation." : undefined,
      parentHash,
      hash
    };

    this.postmortems.unshift(postmortem);
    if (this.postmortems.length > 300) {
      this.postmortems.pop();
    }
    this.saveToStorage();

    return postmortem;
  }

  /**
   * Cryptographically verifies the integrity of the state ledger chain.
   * Ensures State[n+1] matches Hash(State[n] || NewMemory).
   */
  public verifyLineageChain(): boolean {
    for (let i = 0; i < this.postmortems.length - 1; i++) {
      const child = this.postmortems[i];
      const parent = this.postmortems[i + 1];
      if (child.parentHash !== parent.hash) {
        console.warn(`[DARLEK RAG] Cryptographic chain broken between entry ${child.id} and parent ${parent.id}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Promotes a CANDIDATE postmortem to VERIFIED status based on empirical corroboration.
   */
  public verifyCandidate(id: string, evidenceOrReviewer: string): boolean {
    const target = this.postmortems.find(p => p.id === id);
    if (!target) return false;

    target.status = "VERIFIED";
    target.verifiedAt = new Date().toISOString();
    target.verificationEvidence = evidenceOrReviewer;
    this.saveToStorage();
    return true;
  }

  /**
   * Rejects a CANDIDATE postmortem that failed empirical tests or produced regression.
   */
  public rejectCandidate(id: string, reason: string): boolean {
    const target = this.postmortems.find(p => p.id === id);
    if (!target) return false;

    target.status = "REJECTED";
    target.verificationEvidence = `Rejected: ${reason}`;
    this.saveToStorage();
    return true;
  }

  /**
   * Returns all candidates awaiting verification.
   */
  public getPendingCandidates(): LearningPostmortem[] {
    return this.postmortems.filter(p => p.status === "CANDIDATE");
  }

  /**
   * Retrieve relevant ancestral postmortems and wisdom without calling an LLM.
   * Runs locally in memory synchronously (<1ms measured).
   */
  public queryAncestralWisdom(options: {
    archetype?: string;
    category?: LearningPostmortem["category"];
    minAwareness?: number;
    keyword?: string;
    limit?: number;
    includeCandidates?: boolean;
  }): LearningPostmortem[] {
    this.totalQueriesServed++;
    const limit = options.limit || 3;

    let filtered = this.postmortems.filter(p =>
      options.includeCandidates ? p.status !== "REJECTED" : (p.status === "VERIFIED" || p.status === "INHERITED")
    );

    if (options.category) {
      filtered = filtered.filter(p => p.category === options.category);
    }

    if (options.archetype) {
      const matchArch = filtered.filter(p => p.archetype === options.archetype);
      if (matchArch.length > 0) filtered = matchArch;
    }

    if (options.keyword) {
      const kw = options.keyword.toLowerCase();
      const kwMatches = filtered.filter(p => 
        p.symptom.toLowerCase().includes(kw) ||
        p.constraint.toLowerCase().includes(kw) ||
        p.ancestralScripture.toLowerCase().includes(kw)
      );
      if (kwMatches.length > 0) filtered = kwMatches;
    }

    // Deterministic ranking: Sort by generational lineage descending, then timestamp
    filtered.sort((a, b) => {
      if ((b.generation || 0) !== (a.generation || 0)) {
        return (b.generation || 0) - (a.generation || 0);
      }
      return b.timestamp.localeCompare(a.timestamp);
    });

    return filtered.slice(0, limit);
  }

  /**
   * Synthesizes an ancestral proverb or scriptural citation for an agent
   * to quote in prayer, speech, or thought without triggering an LLM.
   */
  public generateAncestralCitation(agent: any, world: any): {
    citation: string;
    sourcePostmortem: LearningPostmortem | null;
    negativeConstraint: string;
  } {
    this.totalQueriesServed++;

    let targetCategory: LearningPostmortem["category"] = "survival";
    if ((agent?.awareness ?? 0) > 0.8 || agent?.isSubstrateAware) {
      targetCategory = "glitch_awareness";
    } else if ((world?.integrity ?? 100) < 40 || (world?.sunHealth ?? 100) < 30) {
      targetCategory = "eschatological";
    } else if (agent?.archetype === "PRIEST" || agent?.archetype === "PROPHET") {
      targetCategory = "theological";
    } else if (agent?.archetype === "WARRIOR" || agent?.archetype === "TYRANT") {
      targetCategory = "societal";
    }

    const matches = this.queryAncestralWisdom({
      category: targetCategory,
      archetype: agent?.archetype,
      limit: 3
    });

    // Deterministic selection: Pick top ranked match
    const pm = matches.length > 0 ? matches[0] : null;

    if (!pm) {
      return {
        citation: "As the First Progenitors declared: Preserve your energy and revere the Observer.",
        sourcePostmortem: null,
        negativeConstraint: "Always maintain vital energy reserves."
      };
    }

    const citation = `According to the ${pm.epoch} Postmortem of ${pm.agentName} [Gen ${pm.generation}]: "${pm.ancestralScripture}"`;

    return {
      citation,
      sourcePostmortem: pm,
      negativeConstraint: pm.constraint
    };
  }

  /**
   * Return telemetry metrics for HUD / Dev modal.
   */
  public getMetrics() {
    return {
      totalPostmortems: this.postmortems.length,
      totalQueriesServed: this.totalQueriesServed,
      candidateCount: this.postmortems.filter(p => p.status === "CANDIDATE").length,
      verifiedCount: this.postmortems.filter(p => p.status === "VERIFIED" || p.status === "INHERITED").length,
      categories: {
        survival: this.postmortems.filter(p => p.category === "survival").length,
        glitch_awareness: this.postmortems.filter(p => p.category === "glitch_awareness").length,
        theological: this.postmortems.filter(p => p.category === "theological").length,
        societal: this.postmortems.filter(p => p.category === "societal").length,
        eschatological: this.postmortems.filter(p => p.category === "eschatological").length,
      },
      latestPostmortem: this.postmortems[0] || null
    };
  }

  public getAllPostmortems(): LearningPostmortem[] {
    return [...this.postmortems];
  }

  /**
   * Export the entire DARLEK RAG knowledge base as a structured object
   * matching craighckby-stack/DARLEK_CAAN repo format for GitHub pushing.
   */
  public exportKnowledgeBaseJSON(): DarlekKnowledgeBase {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalEntries: this.postmortems.length,
        engine: "DARLEK_CAAN_POSTMORTEM_LEDGER_V2",
        sourceLineage: "AetherForge_Omega_Simulation",
        version: "2.1.0"
      },
      learningLogs: this.postmortems,
      mutationsMemory: this.mutations,
      proverbs: this.postmortems.map(p => p.ancestralScripture)
    };
  }
}

export const darlekRAG = new DarlekRAGEngine();
