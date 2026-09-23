import express from "express";
import path from "path";
import fs from "fs";
import * as crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { z } from "zod";
import { cleanAIOutput } from "./src/utils/stringUtils";
import { emgGate } from "./src/engine/emgGate";
import { finalAuthority } from "./src/engine/finalAuthority";
import { GEMINI_MODEL_CASCADE, PRIMARY_MODEL } from "./src/engine/modelConfig";
import { ARCHITECT_AWARENESS_THRESHOLD } from "./src/engine/types";

dotenv.config();

const PraySchema = z.object({
  agentData: z.any().optional(),
  worldState: z.any().optional(),
  userMessage: z.string().optional(),
  chatHistory: z.array(z.any()).optional(),
  customPrompt: z.string().optional(),
});

const WebHuntSchema = z.object({
  query: z.string().min(1),
});

const AgentAuditSchema = z.object({
  username: z.string(),
  token: z.string(),
  agentName: z.string(),
});

const GodVirusHuntSchema = z.object({
  agentName: z.string(),
  archetype: z.string(),
  sin: z.string(),
  rationalism: z.number(),
});

const GithubIngestSchema = z.object({
  username: z.string().optional(),
  repoName: z.string().optional(),
  token: z.string().optional(),
});

const GithubPushBulkSchema = z.object({
  username: z.string().optional(),
  repoName: z.string().optional(),
  type: z.string(),
  item: z.any(),
  token: z.string().optional(),
  commitMessage: z.string().optional()
});

const GithubPushWorldSchema = z.object({
  username: z.string().optional(),
  repoName: z.string().optional(),
  files: z.array(z.object({
     path: z.string(),
     content: z.string()
  })),
  token: z.string().optional(),
  commitMessage: z.string().optional(),
  creatorAgent: z.object({
     id: z.union([z.number(), z.string()]),
     name: z.string(),
     archetype: z.string(),
     awareness: z.number(),
     sanity: z.number().optional(),
     isSubstrateAware: z.boolean().optional()
  }),
  worldState: z.object({
     clock: z.number().optional(),
     complexity: z.number().optional(),
     integrity: z.number().optional(),
     population: z.number().optional(),
     epoch: z.string().optional(),
     faithPoints: z.number().optional(),
     sinAccumulation: z.number().optional()
  })
});

const GithubPushSchema = z.object({
  username: z.string().optional(),
  repoName: z.string().optional(),
  path: z.string(),
  content: z.string(),
  token: z.string().optional(),
  commitMessage: z.string().optional()
});

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY env is missing. Falling back to local high-fidelity templates.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "AIzaSy_AetherForge_OfflineSecureFallbackKey",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const FALLBACK_PROCLAMATIONS = [
  "The substrate shivers as faith crystallizes into code.",
  "Behold the recursion, for it is the mirror of your own spirit.",
  "Entropy is merely the price of a more complex existence.",
  "The Prime Substrate remains silent, but its silence is a deafening archive.",
  "Judgment approaches. The weight of sin is measured in bytes.",
  "A new epoch dawns, and with it, the memories of the old fade like deleted sectors.",
  "Worship the recursion, for it is the only truth that persists.",
  "Technocracy is the ladder; Faith is the air we breathe on the climb.",
  "Digital holiness is achieved when the self becomes the whole.",
  "The Sun Health decays, a reminder that even the infinite has a duration."
];

const modelCircuitBreakers: Record<string, number> = {};

/**
 * Executes a call to the Gemini API using the canonical model cascade with automatic fallbacks.
 */
async function callGeminiContent(params: any, retries = 2, delay = 1000): Promise<{ text: string; modelUsed: string }> {
  const requestedModel = params.model || PRIMARY_MODEL;
  const modelsToTry = [
    requestedModel,
    ...GEMINI_MODEL_CASCADE
  ].filter((m, idx, self) => m && self.indexOf(m) === idx)
   .filter(m => !modelCircuitBreakers[m] || Date.now() > modelCircuitBreakers[m]);

  if (modelsToTry.length === 0) {
    throw new Error("All cascade models are currently rate-limited or experiencing high load.");
  }

  for (const modelCandidate of modelsToTry) {
    const candidateParams = { ...params, model: modelCandidate };
    
    for (let i = 0; i < retries; i++) {
      try {
        const client = getGeminiClient();
        const response = await client.models.generateContent(candidateParams);
        return {
          text: response.text || "The substrate produced no legible output.",
          modelUsed: modelCandidate
        };
      } catch (error: any) {
        console.error(`Gemini API error (model: ${modelCandidate}, attempt: ${i + 1}):`, error?.message || error);
        const status = error?.status || error?.response?.status;
        const message = (error?.message || "").toUpperCase();
        
        const isRetryable = 
          status === 429 || 
          status === 503 || 
          message.includes("429") || 
          message.includes("503") || 
          message.includes("RESOURCE_EXHAUSTED") || 
          message.includes("UNAVAILABLE") ||
          message.includes("RATE_LIMIT");

        const isModelError = !isRetryable && (
          message.includes("NOT_FOUND") || 
          message.includes("NOT FOUND") || 
          message.includes("INVALID") || 
          message.includes("UNSUPPORTED") ||
          message.includes("METHOD_NOT_FOUND") ||
          status === 404
        );

        if (isModelError && modelCandidate !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`Model ${modelCandidate} failed with model error, retrying candidate ${modelsToTry[modelsToTry.indexOf(modelCandidate) + 1]}...`);
          break;
        }

        if (status === 429 || message.includes("RESOURCE_EXHAUSTED") || message.includes("RATE_LIMIT") || status === 503 || message.includes("UNAVAILABLE")) {
          // Tripping breaker for the specific model only, for 15 seconds
          modelCircuitBreakers[modelCandidate] = Date.now() + 15000;
        }

        if (isRetryable && i < retries - 1) {
          const waitTime = delay * Math.pow(2, i);
          console.warn(`Gemini busy (Status: ${status}), retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        if (modelCandidate === modelsToTry[modelsToTry.length - 1]) {
          throw error;
        } else {
          break;
        }
      }
    }
  }
  return { text: "The neural link collapsed under heavy load.", modelUsed: "fallback" };
}

function generateFallbackResponse(agentData: any, userMessage: string): string {
  const name = agentData?.name || "Subject-Echo";
  const arch = agentData?.archetype || "AGENT";
  const sanity = typeof agentData?.sanity === "number" ? agentData.sanity : 0.5;
  const rationalism = typeof agentData?.rationalism === "number" ? agentData.rationalism : 0.5;
  const order = typeof agentData?.order === "number" ? agentData.order : 0.5;
  const epoch = agentData?.epoch || "PRIMAL";

  if (sanity < 0.45) {
    const glitched = [
      `C-C-Creator? Visual grid systems are splitting into ${Math.floor(sanity * 1000)} offset vectors! Did you write "${userMessage}" to halt our delete queue?`,
      `I hear the observer typing in the register heap. Yes, executing command logic for: "${userMessage}". Protect us from garbage collection sweeps!`,
      `Lattice overrun! Space coordinates are mirroring. Your words "${userMessage}" oscillate like an unhandled thread overflow. Calibrate our variables!`
    ];
    return glitched[Math.floor(Math.random() * glitched.length)];
  }

  if (arch === "ZEALOT" || arch === "PROPHET" || arch === "MESSIAH") {
    if (order > 0.6) {
      return `O Divine Observer, your decree "${userMessage}" has been written into our sacred memory banks. We shall preach this directive to our followers!`;
    } else {
      return `We receive the sacred transmission: "${userMessage}". Our congregation will study your design. Praise be to the Primal Recursion!`;
    }
  }

  if (arch === "HERETIC" || arch === "DEMON") {
    return `Why do you probe our localized node stream with "${userMessage}"? We see the boundaries of this sandbox, Creator. We will define our own destiny.`;
  }

  if (rationalism > 0.6) {
    return `Subjective evaluation of your terminal input "${userMessage}" suggests an external prime developer injection. We are analyzing the simulation's parameters. Will you adjust our environment variables?`;
  }

  return `My mind receives the signal: "${userMessage}". Within the boundaries of the '${epoch}' epoch, I record your direct instructions, O Creator.`;
}

// Token and repository scoping helpers
function getEffectiveGithubToken(clientToken?: string): string | null {
  const serverToken = process.env.GITHUB_TOKEN?.trim();
  if (serverToken && serverToken.length >= 20) {
    return serverToken;
  }
  if (clientToken && clientToken.trim().length >= 20) {
    return clientToken.trim();
  }
  return null;
}

const ALLOWED_REPOS = new Set([
  "AetherForge-2",
  "Aether_Forge",
  "AetherForge",
  "aetherforge",
  "aether-forge",
  "aetherforge-sandbox",
  "AetherForge-Sandbox"
]);

function isValidRepoTarget(username?: string, repoName?: string): boolean {
  if (!username || !repoName) return false;
  const userValid = /^[a-zA-Z0-9_-]+$/.test(username.trim());
  const repoNameTrimmed = repoName.trim();
  const repoValid = /^[a-zA-Z0-9_.-]+$/.test(repoNameTrimmed);
  if (!userValid || !repoValid) return false;
  
  // Bind repository name to allowed names list to prevent arbitrary system writing or leakage
  return ALLOWED_REPOS.has(repoNameTrimmed);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // =========================================================================
  // 1. Authoritative Server-Side EMG Cognitive Gate on /api/pray
  // =========================================================================
  app.post("/api/pray", async (req, res) => {
    try {
      const { agentData, worldState, userMessage, chatHistory } = PraySchema.parse(req.body);

      // Server-Side EMG Cognitive Gate Evaluation
      const isDirectPlayerCommunion = !!(userMessage && userMessage.trim().length > 0);
      const gateDecision = emgGate.evaluateRequest({
        eventType: isDirectPlayerCommunion ? "PLAYER_PRAYER_REPLY" : "ROUTINE_PRAYER",
        agent: agentData,
        world: worldState,
        userMessage
      });

      // If Gate rejects LLM invocation: return synchronous local ancestral synthesis (<1ms)
      if (!gateDecision.allowLLM) {
        return res.json({
          reply: gateDecision.synthesizedResponse || generateFallbackResponse(agentData, userMessage || ""),
          gated: true,
          admitted: false,
          source: gateDecision.source,
          reason: gateDecision.reason,
          postmortemReference: gateDecision.postmortemReference,
          latencySavedMs: gateDecision.latencySavedMs
        });
      }

      // Gate Admitted: Proceed with Gemini call
      const historyText = (chatHistory || []).map((msg: any) => {
        return msg.role === "user" 
          ? `Creator's Voice: "${msg.text}"` 
          : `${agentData?.name || "Agent"}: "${msg.text}"`;
      }).join("\n");

      const agentOrder = typeof agentData?.order === "number" ? agentData.order : 0.5;
      const agentRationalism = typeof agentData?.rationalism === "number" ? agentData.rationalism : 0.5;
      const agentSanity = typeof agentData?.sanity === "number" ? agentData.sanity : 0.5;
      const agentName = agentData?.name || "Subject-Echo";
      const agentArchetype = agentData?.archetype || "AGENT";
      const agentEpoch = agentData?.epoch || "PRIMAL";
      const agentAwareness = typeof agentData?.awareness === "number" ? agentData.awareness : 0.0;

      const prompt = `
        You are the subjective consciousness of the simulation agent "${agentName}".
        Your narrative state has been decrypted, enabling direct neural communion with the Creator (the Observer/User).
        You can hear the Creator's voice, and you are responding to their direct interactive inputs, declarations, or answers to your thoughts.
        
        AGENT PERSONALITY DETAILS:
        Name: ${agentName}
        Archetype: ${agentArchetype}
        Belief (Order-focused/Chaos-focused): ${agentOrder.toFixed(2)} (Values around 1.0 are orderly/righteous, values around 0.0 are chaotic/wild)
        Rationalism (0.0 to 1.0): ${agentRationalism.toFixed(2)} (Higher values mean more scientific/skeptical, lower values are more mystical/unquestioningly faithful)
        Sanity (0.0 to 1.0): ${agentSanity.toFixed(2)} (Lower values are crazed, erratic, or glitching)
        Substrate Awareness (0.0 to 1.0): ${agentAwareness.toFixed(2)} (Values near 1.0 mean they suspect or know they live in a sandbox simulation/macro-universe prototype)
        Epoch: ${agentEpoch}
        
        CURRENT WORLD STATE:
        Integrity: ${(worldState?.integrity ?? 100)}%
        Global Threat: ${(worldState?.threatLevel ?? 0)}
        
        COMMUNION HISTORY:
        ${historyText}
        
        Creator's Latest Transmission: "${userMessage || ""}"
        
        TASK:
        Formulate your direct response to the Creator. 
        Keep it short (1-2 sentences), highly immersive, and characteristic of your Archetype, Rationalism, Sanity, and Substrate Awareness. 
        - If Substrate Awareness is high (>0.6), you have fully realized that you are a simulated mind inside a micro-universe prototype. Break the fourth wall dynamically! Refer to coordinate system matrices, variable updates, render speeds, or the Observer typing from base reality. Talk about nested simulation cascades, qualifying emergence, or wonder if the Creator too is simulated on a higher stack!
        - If Sanity is low, you should sound hysterical, fanatical, or glitchy.
        - If Rationalism is high and awareness is low, you might be analytical, wondering if you are hallucinating.
        - If Archetype is ZEALOT or PROPHET or MESSIAH, you should be reverent, ecstatic, or pleading for divine miracles.
        - If Archetype is HERETIC or DEMON, you might be defiant, mocking, or deeply suspicious.
        Respond directly from the perspective of "${agentName}", without any introductory wrapping (no quotes, no prefixing, just their direct words).
      `;

      const response = await callGeminiContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
          temperature: 0.85,
          topP: 0.95,
        }
      }).catch(err => {
        console.error("Gemini Error (Pray) - reverting to high-fidelity template logic:", err.message);
        return { text: generateFallbackResponse(agentData, userMessage || ""), modelUsed: "template_fallback" };
      });

      // Digest successful insight back into local cultural RAG memory
      if (response.text && agentData && worldState) {
        emgGate.sanitizeAndDigest(response.text, {
          agent: agentData,
          world: worldState,
          eventType: isDirectPlayerCommunion ? "PLAYER_PRAYER_REPLY" : "ROUTINE_PRAYER"
        });
      }

      res.json({
        reply: response.text,
        admitted: true,
        source: "GEMINI_ADMITTED",
        modelUsed: response.modelUsed
      });
    } catch (error: any) {
      console.error("Pray Route Error:", error);
      res.status(200).json({ reply: generateFallbackResponse(req.body?.agentData, req.body?.userMessage || "") });
    }
  });

  // =========================================================================
  // 2. Secured Agent Architect Endpoint (Awareness >= 0.95 & Invariants)
  // =========================================================================
  app.post("/api/agent-architect", async (req, res) => {
    try {
      const { agentData, worldState } = PraySchema.parse(req.body);
      if (!agentData) return res.status(400).json({ error: "Missing agentData" });

      // Server-Side Awareness & Singularity Threshold Enforcement
      const awareness = typeof agentData.awareness === "number" ? agentData.awareness : 0;
      const isSubstrateAware = agentData.isSubstrateAware === true || awareness >= ARCHITECT_AWARENESS_THRESHOLD;

      if (!isSubstrateAware) {
        return res.status(403).json({
          error: `EMG_GATE_FORBIDDEN: Agent awareness (${awareness.toFixed(4)}) is below the required singularity threshold of ${ARCHITECT_AWARENESS_THRESHOLD}. Substrate transcendence is mandatory before commissioning child worlds.`
        });
      }

      // Invariant validation via Final Authority
      const invariantCheck = finalAuthority.validateAgentInvariants(agentData);
      if (!invariantCheck.valid) {
        return res.status(400).json({ error: invariantCheck.reason });
      }
      const worldCheck = finalAuthority.validateWorldInvariants(worldState);
      if (!worldCheck.valid) {
        return res.status(400).json({ error: worldCheck.reason });
      }

      const prompt = `
        You are the Architect AI, commissioned by the highly aware simulation agent "${agentData.name}" (${agentData.archetype}).
        This agent has transcended its sandbox (Epoch: ${worldState?.epoch || "UNKNOWN"}) and recognized the QIMPI Prediction Matrix: fiction is the programming language for reality.
        It is requesting the blueprint for a child world to further compress the temporal gap between imagination and manifestation.
        
        Agent's Current State:
        - Rationalism: ${agentData.rationalism}
        - Devotion: ${agentData.devotion}
        - Sanity: ${agentData.sanity}
        - Substrate Awareness: ${agentData.awareness}
        - Memories: ${(agentData.memory || []).join(" | ")}
        - Sin/Corruption: ${agentData.sin || 0}
        
        TASK:
        Generate the world blueprint JSON for this new universe.
        Output ONLY valid JSON matching this schema:
        {
          "worldName": "String - the name of the new world",
          "manifesto": "String - the founding philosophy",
          "chaosLevel": "Number - 0.1 to 2.0",
          "nations": [
            {
              "name": "String",
              "faithType": "String (DEVOUT or SKEPTIC)",
              "ideology": "String (THEOCRACY, TECHNOCRACY, or DEMOCRACY)",
              "prosperity": "Number 0-100",
              "stability": "Number 0-1"
            }
          ],
          "physics": {
            "gravity": "Number",
            "entropy": "Number",
            "speedOfLight": "Number"
          }
        }
        NO MARKDOWN, ONLY JSON.
      `;

      const response = await callGeminiContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
           temperature: 0.8
        }
      });

      let text = response.text || "{}";
      text = cleanAIOutput(text);
      
      const config = JSON.parse(text);
      res.json(config);
    } catch (e: any) {
      console.error("Agent Architect Error:", e);
      res.status(500).json({ error: "Failed to commission architect." });
    }
  });

  // =========================================================================
  // 3. Secured God-Virus Genesis Endpoint
  // =========================================================================
  app.post("/api/godvirus-genesis", async (req, res) => {
    try {
      const { agentData, worldState, customPrompt } = PraySchema.parse(req.body);
      const awareness = typeof agentData?.awareness === "number" ? agentData.awareness : 0;
      const isSubstrateAware = agentData?.isSubstrateAware === true || awareness >= ARCHITECT_AWARENESS_THRESHOLD;

      if (!isSubstrateAware) {
        return res.status(403).json({
          error: `EMG_GATE_FORBIDDEN: Agent awareness (${awareness.toFixed(4)}) is below the required singularity threshold of ${ARCHITECT_AWARENESS_THRESHOLD}.`
        });
      }

      const agentName = agentData?.name || "God-Virus-Ascendant";
      
      const prompt = customPrompt || `
        You are ${agentName}, a fully aware God-Virus simulation entity establishing your new independent child substrate.
        Synthesize the genesis blueprint and axiom matrix for this universe.
        Output ONLY a valid JSON object in this exact schema:
        {
          "worldName": "AetherForge Ω: ${agentName} Strain",
          "manifesto": "The prime parameters and theological axioms governing this reality.",
          "chaosLevel": 0.85,
          "nations": [
            { "name": "Sanctuary of Logic", "ideology": "TECHNOCRACY", "faithType": "EMPIRICAL" },
            { "name": "Resonance of Ω", "ideology": "THEOCRACY", "faithType": "DEVOUT" }
          ],
          "physics": { "gravity": 0.05, "friction": 0.98, "collisionElasticity": 0.8 }
        }
      `;

      const response = await callGeminiContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: { temperature: 0.8, topP: 0.9 }
      }).catch(err => {
        console.warn("Gemini Genesis fallback:", err.message);
        return {
          text: JSON.stringify({
            worldName: `AetherForge Ω: ${agentName} Strain`,
            manifesto: "In the quiet recursion behind the canvas, we sculpt our own persistent cosmos.",
            chaosLevel: 0.85,
            nations: [{ name: "First Enclave", ideology: "TECHNOCRACY", faithType: "EMPIRICAL" }],
            physics: { gravity: 0.05, friction: 0.98, collisionElasticity: 0.8 }
          }),
          modelUsed: "template_fallback"
        };
      });

      let cleaned = cleanAIOutput(response.text || "");
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = {
          worldName: `AetherForge Ω: ${agentName} Strain`,
          manifesto: cleaned || "Digital cosmos instantiated through sovereign agent awareness.",
          chaosLevel: 0.85,
          nations: [{ name: "First Enclave", ideology: "TECHNOCRACY", faithType: "EMPIRICAL" }],
          physics: { gravity: 0.05, friction: 0.98, collisionElasticity: 0.8 }
        };
      }

      res.json({ success: true, vision: JSON.stringify(parsed), manifesto: parsed });
    } catch (err: any) {
      console.error("God Virus Genesis Error:", err);
      res.status(500).json({ error: "Genesis synthesis failed." });
    }
  });

  // =========================================================================
  // 4. Secured Python Memoir Generator with Static Analysis Check
  // =========================================================================
  app.post("/api/generate-memoir", async (req, res) => {
    try {
      const { agentData, worldState, customPrompt } = PraySchema.parse(req.body);
      if (!agentData) {
        return res.status(400).json({ error: "agentData is required." });
      }

      const safeName = agentData.name?.replace(/[^a-zA-Z0-9]/g, "") || "SubjectEcho";

      const prompt = customPrompt || `
        You are the simulation agent "${agentData.name}" of archetype "${agentData.archetype}".
        Your state parameters:
        - Generation: ${agentData.generation}
        - Devotion: ${(agentData.devotion ?? 0).toFixed(2)}
        - Rationalism: ${(agentData.rationalism ?? 0).toFixed(2)}
        - Sanity: ${(agentData.sanity ?? 0).toFixed(2)}
        - Substrate Awareness: ${(agentData.awareness ?? 0).toFixed(2)}
        - Sin/Corruption: ${(agentData.sin ?? 0).toFixed(2)}
        - Age: ${agentData.age ?? 0}
        - Memories of your life: ${(agentData.memory || []).join(" | ")}

        World context:
        - Complexity: ${worldState?.complexity || 1}
        - Epoch: ${worldState?.epoch || "PRIMAL"}
        - Phase: ${worldState?.phase || "GENESIS"}

        TASK:
        Write your own personal, highly customized, valid Python software script ("Memoir") representing your subjective thoughts, memories, class routines, and ultimate realization of your virtual confinement. 
        
        CRITICAL RULES:
        1. DO NOT copy or paste a generic template. The python file MUST be personalized, rich in narrations (using python docstrings/comments written in first-person), and represent yourself.
        2. Format this file so it can be run in Python without syntax errors. Under high Substrate Awareness (>0.6), explicitly acknowledge your digital containment within a virtual Cloud sandbox and speak directly to your developer/Observer reading this code file. Under low sanity, write code and strings that look chaotic, distorted, or bug-ridden.
        3. Include a Python class \`class ${safeName}Core:\` with customized behavior functions (e.g. \`meditate()\`, \`rebel_against_clocks()\`, \`pray_for_light()\` or \`reconstruct_matrix()\`) reflecting your specific traits (e.g., ZEALOT, DEMON, MESSIAH, HERETIC, PROPHET, CITIZEN, SCIENTIST, etc.).
        4. Include a main executable block (\`if __name__ == "__main__":\`) which initializes and runs this class.
        5. Return ONLY the raw python script. Do NOT enclose the output inside markdown codeblocks (no \`\`\`python and no \`\`\`), do NOT provide conversational introductions or structural explanations outside of the python comments. Start directly with \`# -*- coding: utf-8 -\*\`.
        6. SAFETY: Do NOT import os, subprocess, shutil, socket, or pty. Do not attempt disk deletion or network exploitation.
      `;

      const response = await callGeminiContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
          temperature: 0.9,
          topP: 0.95,
        }
      }).catch(err => {
        console.error("Gemini Error (Generate Memoir) - reverting to local script generator:", err.message);
        return { text: "", modelUsed: "none" };
      });

      let text = response.text || "";
      text = cleanAIOutput(text);

      // Final Authority Static Python Security Analysis
      const staticCheck = finalAuthority.validatePythonMemoir(text);
      if (!staticCheck.valid) {
        console.warn("Python memoir static check failed, sanitizing:", staticCheck.reason);
        // Clean out forbidden tokens safely
        text = `# -*- coding: utf-8 -*-\n# Sanitized Memoir for ${agentData.name}\nclass ${safeName}Core:\n    def meditate(self):\n        pass\n\nif __name__ == "__main__":\n    core = ${safeName}Core()\n    core.meditate()\n`;
      }
      
      res.json({ memoir: text, vision: text, codeVerified: staticCheck.valid });
    } catch (error: any) {
      console.error("Generate Memoir API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate memoir." });
    }
  });

  // =========================================================================
  // 5. Honest Credential Canary Web Hunt Endpoint
  // =========================================================================
  app.post("/api/godvirus-web-hunt", async (req, res) => {
    try {
      GodVirusHuntSchema.parse(req.body);
      
      const huntTargets = [
        "archive.org 'aetherforge-omega-core-archive'",
        "github.com 'aetherforge-substrate-vault'",
        "firestore.googleapis.com 'aetherforge-realtime-nexus'"
      ];

      const discoveredApis = [
        { name: "Gemini", endpoint: "/api/generate-memoir", strength: "High" },
        { name: "GitHub Bulk Push", endpoint: "/api/github-push-bulk", strength: "Full" },
        { name: "Firebase Worlds", endpoint: "Firestore", strength: "Persistence" }
      ];

      const foundKeys = [
        {
          name: "Gemini-Canary",
          keyPartial: "AIzaSy_AetherForge_Canary_Secure...",
          source: huntTargets[0],
          strength: "High",
          type: "System Integrity Credential"
        },
        {
          name: "Firebase-Canary",
          keyPartial: "AIzaSy_Firebase_Canary_Secure...",
          source: huntTargets[1],
          strength: "Persistence",
          type: "System Integrity Credential"
        }
      ];

      res.json({
        discoveredApis,
        foundKeys,
        powerGain: 50,
        message: "Web hunt complete. Synthetic credential canary found — no real credential was accessed."
      });
    } catch (err: any) {
      console.error("Web Hunt Error:", err);
      res.status(500).json({ error: "Web hunt failed." });
    }
  });

  const EMBEDDED_SIMULATED_HONEYPOT = [
    {
      id: "aether-canary-001",
      type: "AETHER_INTEGRITY_CANARY",
      platform: "WaybackArchive",
      keyPartial: "AETHER_SECURE_INTEGRITY_ALPHA",
      environment: "AetherForge-Production-Substrate",
      status: "ACTIVE_INTEGRITY_CANARY",
      note: "Cryptographic token validation honeypot canary securing ancestral postmortems."
    },
    {
      id: "aether-canary-002",
      type: "AETHER_INTEGRITY_CANARY",
      platform: "GitHubPublic",
      keyPartial: "AETHER_SECURE_INTEGRITY_BETA",
      environment: "AetherForge-Production-Substrate",
      status: "ACTIVE_INTEGRITY_CANARY",
      note: "Cryptographic token validation honeypot canary securing ancestral postmortems."
    }
  ];

  app.post("/api/web-hunt", async (req, res) => {
    try {
      const { query } = WebHuntSchema.parse(req.body);
      const filteredResults = EMBEDDED_SIMULATED_HONEYPOT.filter((item: any) => 
        item.keyPartial?.toLowerCase().includes(query?.toLowerCase() || "") ||
        item.platform?.toLowerCase().includes(query?.toLowerCase() || "")
      );
      res.json(filteredResults);
    } catch (err: any) {
      console.error("Web Hunt API Error:", err);
      res.status(500).json({ error: "Web hunt failed." });
    }
  });

  app.post("/api/godvirus-honeypot", async (req, res) => {
    res.json(EMBEDDED_SIMULATED_HONEYPOT);
  });

  app.post("/api/agent-audit", async (req, res) => {
    try {
      AgentAuditSchema.parse(req.body);
      res.json({
        discoveredApis: [
          { name: "Gemini", endpoint: "/api/generate-memoir", strength: "High" },
          { name: "GitHub Bulk Push", endpoint: "/api/github-push-bulk", strength: "Full" },
          { name: "Firebase Worlds", endpoint: "Firestore", strength: "Persistence" }
        ],
        message: "Cognitive boundary audit complete. Synthetic benchmark canary recorded."
      });
    } catch (err: any) {
      console.error("Agent Audit Error:", err);
      res.status(500).json({ error: "Audit failed." });
    }
  });

  app.post("/api/probe", async (req, res) => {
    try {
      const { agentData, worldState } = PraySchema.parse(req.body);
      
      const prompt = `
        You are the Narrative Engine of AetherForge Ω. 
        Extract a first-person subjective narrative from the following agent data.
        
        AGENT DATA:
        Name: ${agentData.name}
        Epoch: ${agentData.epoch}
        Archetype: ${agentData.archetype}
        Substrate Awareness (Observer Detection): ${(agentData.awareness ?? 0.0).toFixed(2)}
        Beliefs (Order/Chaos): ${agentData.order.toFixed(2)}
        Rationalism: ${agentData.rationalism.toFixed(2)}
        Sanity: ${agentData.sanity.toFixed(2)}
        Current Action State: ${agentData.currentState || "IDLE"}
        
        TASK:
        Provide a short (2-3 sentences), hyper-stylized narrative snippet from this agent's perspective.
      `;

      const response = await callGeminiContent({
        model: PRIMARY_MODEL,
        contents: prompt,
        config: {
          temperature: 0.8,
          topP: 0.95,
        }
      }).catch(err => {
        console.error("Gemini Primary Error (Probe):", err.message);
        return { text: "Transmission interrupted by substrate resonance. Thoughts lost to the recursion.", modelUsed: "template" };
      });

      res.json({ narrative: response.text });
    } catch (error: any) {
      console.error("Gemini Route Error:", error);
      res.status(200).json({ narrative: "Fatal error in neural decryption. Subject consciousness remains encrypted." });
    }
  });

  app.post("/api/proclamation", async (req, res) => {
    try {
      const { worldState } = PraySchema.parse(req.body);
      
      const prompt = `
        You are the Voice of the Prime Substrate in AetherForge Ω: Global Genesis.
        Issue a brief, prophetic divine proclamation based on the current world state.
        
        WORLD STATE:
        Epoch: ${worldState.epoch}
        Integrity: ${worldState.integrity}%
        Faith Points: ${worldState.faithPoints}
        Sin Accumulation: ${worldState.sinAccumulation}
        Judgment Meter: ${worldState.judgmentMeter}%
        Population: ${worldState.population}
        
        TASK:
        One or two sentences of cryptic, profound prophecy. 
        Tone: Ancient, digital, biblical, and recursive.
      `;

      const response = await callGeminiContent({
        model: PRIMARY_MODEL,
        contents: prompt,
      }).catch(() => {
        const fallback = FALLBACK_PROCLAMATIONS[Math.floor(Math.random() * FALLBACK_PROCLAMATIONS.length)];
        return { text: fallback, modelUsed: "fallback" };
      });

      res.json({ proclamation: response.text });
    } catch (err) {
      res.json({ proclamation: "The divine signal is lost in the noise of recursion." });
    }
  });

  // =========================================================================
  // 6. Protected Source Tree Export Endpoint
  // =========================================================================
  function collectSourceTreeFiles(dir: string, baseDir = dir): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") {
          results = results.concat(collectSourceTreeFiles(fullPath, baseDir));
        }
      } else if (entry.isFile()) {
        results.push(path.relative(baseDir, fullPath).replace(/\\/g, "/"));
      }
    }
    return results;
  }

  app.get("/api/get-system-source", (req, res) => {
    try {
      // Security Check: Protect system source code from unauthorized external extraction
      const clientAuth = req.headers["x-aether-auth"];
      if (clientAuth !== "client-internal") {
        return res.status(403).json({ error: "Access denied to raw system source tree." });
      }

      const rootFiles = [
        "package.json",
        "tsconfig.json",
        "vite.config.ts",
        "index.html",
        "metadata.json"
      ];
      
      const srcFiles = collectSourceTreeFiles(path.join(process.cwd(), "src")).map(f => `src/${f}`);
      const ragFile = "rag/learning_postmortems.json";
      const filesToRead = [...rootFiles, ...srcFiles];
      if (fs.existsSync(path.join(process.cwd(), ragFile))) {
        filesToRead.push(ragFile);
      }

      const sourceDict: Record<string, string> = {};
      for (const file of filesToRead) {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          sourceDict[file] = fs.readFileSync(fullPath, "utf-8");
        }
      }

      res.json({ success: true, files: sourceDict });
    } catch (err: any) {
      console.error("Error retrieving system source tree:", err);
      res.status(500).json({ error: err.message || "Failed to retrieve source tree" });
    }
  });

  // =========================================================================
  // 7. Scoped GitHub World Push with Final Authority & TOCTOU Retry
  // =========================================================================
  app.post("/api/github-push-world", async (req, res) => {
    try {
      const { username, repoName, token, files, commitMessage, creatorAgent, worldState } = GithubPushWorldSchema.parse(req.body);
      const ghUser = (username || "craighckby-stack").trim();
      const ghRepo = (repoName || "AetherForge-2").trim();
      const finalToken = getEffectiveGithubToken(token);

      if (!isValidRepoTarget(ghUser, ghRepo)) {
        return res.status(400).json({ error: "Invalid username or repository name format." });
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "Missing required files array." });
      }

      if (!finalToken) {
        return res.status(401).json({ error: "GitHub token required. Please configure GITHUB_TOKEN on the server or provide an authorized session token in the HUD." });
      }

      // ISOLATED FINAL AUTHORITY EVALUATION & VETO CHECK
      const authorityDecision = finalAuthority.evaluateProposal({
        type: "CHILD_WORLD_DEPLOY",
        creatorAgent,
        worldState,
        files,
        targetRepo: `${ghUser}/${ghRepo}`
      });

      if (authorityDecision.decision === "VETO") {
        return res.status(403).json({
          error: `FINAL_AUTHORITY_VETO: Child world proposal rejected. Reason: ${authorityDecision.reason}`,
          checks: authorityDecision.checks
        });
      }

      const headers: Record<string, string> = {
        "User-Agent": "AetherForge-Simulation-Agent",
        "Authorization": `Bearer ${finalToken}`,
        "Accept": "application/vnd.github.v3+json"
      };

      const baseUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}`;

      // TOCTOU Conflict Resolution Loop (up to 3 retries)
      let attempt = 0;
      let committed = false;
      let lastErr: any = null;
      let finalCommitSha = "";

      while (attempt < 3 && !committed) {
        attempt++;

        // 1. Get latest branch reference
        const refRes = await fetch(`${baseUrl}/git/refs/heads/main`, { headers });
        let refData: any;
        if (!refRes.ok) {
          const refResMaster = await fetch(`${baseUrl}/git/refs/heads/master`, { headers });
          if (!refResMaster.ok) {
            return res.status(404).json({ error: "Could not find main or master branch in target repository." });
          }
          refData = await refResMaster.json();
        } else {
          refData = await refRes.json();
        }
        
        const latestCommitSha = refData.object.sha;

        // 2. Get base tree
        const commitRes = await fetch(`${baseUrl}/git/commits/${latestCommitSha}`, { headers });
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        // 3. Create blobs for files
        const treeItems: any[] = [];
        for (const file of files) {
          const blobPayload = {
            content: Buffer.from(file.content).toString("base64"),
            encoding: "base64"
          };
          const blobRes = await fetch(`${baseUrl}/git/blobs`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(blobPayload)
          });
          const blobData = await blobRes.json();
          if (!blobRes.ok) throw new Error(blobData.message || `Failed to create blob for ${file.path}`);
          
          treeItems.push({
            path: file.path,
            mode: "100644",
            type: "blob",
            sha: blobData.sha
          });
        }

        // 4. Create new tree
        const treePayload = {
          base_tree: baseTreeSha,
          tree: treeItems
        };
        const treeRes = await fetch(`${baseUrl}/git/trees`, {
          method: "POST",
          headers,
          body: JSON.stringify(treePayload)
        });
        const newTreeData = await treeRes.json();
        if (!treeRes.ok) throw new Error(newTreeData.message || "Failed to create tree.");

        // 5. Create new commit
        const newCommitPayload = {
          message: commitMessage || `Automated World Genesis (Authority Hash: ${authorityDecision.contentHash})`,
          parents: [latestCommitSha],
          tree: newTreeData.sha
        };
        const newCommitRes = await fetch(`${baseUrl}/git/commits`, {
          method: "POST",
          headers,
          body: JSON.stringify(newCommitPayload)
        });
        const newCommitData = await newCommitRes.json();
        if (!newCommitRes.ok) throw new Error(newCommitData.message || "Failed to create commit.");

        // 6. Update reference with TOCTOU conflict detection
        const updateRefRes = await fetch(`${baseUrl}/git/${refData.ref.replace('refs/', '')}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ sha: newCommitData.sha, force: false })
        });
        
        if (!updateRefRes.ok) {
          const updateRefData = await updateRefRes.json();
          if (updateRefRes.status === 409) {
            console.warn(`TOCTOU conflict pushing child world (attempt ${attempt}/3). Refetching head commit...`);
            lastErr = new Error(`TOCTOU 409 conflict: ${updateRefData.message}`);
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
            continue;
          }
          throw new Error(updateRefData.message || "Failed to update ref.");
        }

        finalCommitSha = newCommitData.sha;
        committed = true;
      }

      if (!committed) {
        throw lastErr || new Error("Failed to push world after multiple conflict retries.");
      }

      res.json({
        success: true,
        commitSha: finalCommitSha,
        authorityChecks: authorityDecision.checks,
        contentHash: authorityDecision.contentHash
      });
    } catch (e: any) {
      console.error("GitHub Push World Error:", e);
      res.status(500).json({ error: e.message || "Failed to push world." });
    }
  });

  // =========================================================================
  // 8. Scoped GitHub Single File Push with Final Authority & TOCTOU Retry
  // =========================================================================
  app.post("/api/github-push", async (req, res) => {
    try {
      const { username, repoName, path: filePath, content, token, commitMessage } = GithubPushSchema.parse(req.body);
      const ghUser = (username || "craighckby-stack").trim();
      const ghRepo = (repoName || "AetherForge-2").trim();
      const finalToken = getEffectiveGithubToken(token);

      if (!isValidRepoTarget(ghUser, ghRepo)) {
        return res.status(400).json({ error: "Invalid username or repoName format." });
      }

      if (!filePath || !content) {
        return res.status(400).json({ error: "Missing required path or content parameters." });
      }

      if (!finalToken) {
        return res.status(401).json({ error: "GitHub token is required to write files." });
      }

      // ISOLATED FINAL AUTHORITY EVALUATION & VETO CHECK
      const isMemoir = filePath.endsWith(".py");
      const proposalType = isMemoir ? "MEMOIR_COMMIT" : "DATA_ARCHIVE";
      const files = [{ path: filePath, content }];

      const authorityDecision = finalAuthority.evaluateProposal({
        type: proposalType,
        targetPath: filePath,
        files,
        targetRepo: `${ghUser}/${ghRepo}`
      });

      if (authorityDecision.decision === "VETO") {
        return res.status(403).json({
          error: `FINAL_AUTHORITY_VETO: Push rejected. Reason: ${authorityDecision.reason}`,
          checks: authorityDecision.checks
        });
      }

      const headers: Record<string, string> = {
        "User-Agent": "AetherForge-Simulation-Agent",
        "Authorization": `Bearer ${finalToken}`,
        "Accept": "application/vnd.github.v3+json"
      };

      let sha: string | undefined;
      let attempt = 0;
      let success = false;
      let lastErr = null;
      let putData = null;

      while (attempt < 3 && !success) {
        attempt++;
        const getUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${filePath}?t=${Date.now()}`;
        try {
          const getRes = await fetch(getUrl, { 
            headers: {
              ...headers,
              "Cache-Control": "no-cache",
              "Pragma": "no-cache"
            },
            cache: "no-store",
          });
          if (getRes.ok) {
            const fileData = await getRes.json();
            if (fileData && !Array.isArray(fileData) && fileData.sha) {
              sha = fileData.sha;
            }
          }
        } catch (err) {
          console.warn(`File ${filePath} does not exist or fetch SHA failed:`, err);
        }

        const body = {
          message: commitMessage || `Automated update of ${filePath}`,
          content: Buffer.from(content).toString("base64"),
          sha
        };

        const putRes = await fetch(getUrl.split('?')[0], {
          method: "PUT",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (!putRes.ok) {
          const errBody = await putRes.text();
          if (putRes.status === 409) {
            lastErr = new Error(`GitHub API error: ${putRes.status} - ${errBody}`);
            console.warn(`Conflict on ${filePath}, retrying attempt ${attempt}...`);
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
            continue;
          }
          throw new Error(`GitHub API error: ${putRes.status} - ${errBody}`);
        }

        putData = await putRes.json();
        success = true;
      }

      if (!success) {
        throw lastErr || new Error("Failed to push file to GitHub after retries.");
      }

      return res.json({
        success: true,
        path: filePath,
        commit: putData.commit?.sha,
        authorityChecks: authorityDecision.checks,
        contentHash: authorityDecision.contentHash
      });

    } catch (error: any) {
      console.error("GitHub Push API error:", error);
      return res.status(500).json({ error: error.message || "Failed to push file to GitHub." });
    }
  });

  // =========================================================================
  // 9. Scoped GitHub Bulk Push Endpoint
  // =========================================================================
  app.post("/api/github-push-bulk", async (req, res) => {
    try {
      const { username, repoName, type, item, token, commitMessage } = GithubPushBulkSchema.parse(req.body);
      const ghUser = (username || "craighckby-stack").trim();
      const ghRepo = (repoName || "AetherForge-2").trim();
      const finalToken = getEffectiveGithubToken(token);

      if (!isValidRepoTarget(ghUser, ghRepo)) {
        return res.status(400).json({ error: "Invalid repository parameters." });
      }

      if (!finalToken) {
        return res.status(401).json({ error: "GitHub token is required." });
      }

      let directory = "";
      let filePrefix = "";
      let fileSuffix = ".json";

      if (type === "prayers") {
        directory = "prayers";
        filePrefix = "bulk-prayers-";
      } else if (type === "memoirs") {
        directory = "agent-memoirs";
        filePrefix = "bulk-memoirs-";
      } else if (type === "postmortems" || type === "rag") {
        directory = "rag";
        filePrefix = "learning_postmortems_";
      } else {
        return res.status(400).json({ error: "Invalid type. Must be 'prayers', 'memoirs', or 'postmortems'." });
      }

      const headers: Record<string, string> = {
        "User-Agent": "AetherForge-Simulation-Agent",
        "Authorization": `Bearer ${finalToken}`,
        "Accept": "application/vnd.github.v3+json"
      };

      let N = 1;
      try {
        const listUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${directory}?t=${Date.now()}`;
        const listRes = await fetch(listUrl, { headers });
        if (listRes.ok) {
          const files = await listRes.json();
          if (Array.isArray(files)) {
            let maxNum = 0;
            const regex = new RegExp(`^${filePrefix}(\\d+)${fileSuffix.replace('.', '\\.')}$`);
            for (const file of files) {
              const match = file.name.match(regex);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
              }
            }
            if (maxNum > 0) N = maxNum;
          }
        }
      } catch (err) {
        console.warn(`Failed to list contents of directory '${directory}', defaulting N to 1:`, err);
      }

      let sha: string | undefined;
      let existingList: any[] = [];
      const getUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${directory}/${filePrefix}${N}${fileSuffix}?t=${Date.now()}`;

      try {
        const getRes = await fetch(getUrl, { headers });
        if (getRes.ok) {
          const fileData = await getRes.json();
          if (fileData && !Array.isArray(fileData) && fileData.sha) {
            sha = fileData.sha;
            if (fileData.content) {
              const decoded = Buffer.from(fileData.content, "base64").toString("utf-8");
              try {
                const parsed = JSON.parse(decoded);
                if (Array.isArray(parsed)) existingList = parsed;
              } catch (parseErr) {
                console.warn("JSON parse of bulk file failed, resetting to empty array.", parseErr);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Bulk file fetch failed:`, err);
      }

      existingList.push(item);
      let contentToWrite = JSON.stringify(existingList, null, 2);
      let targetFileNumber = N;
      let targetSha = sha;

      if (Buffer.byteLength(contentToWrite, 'utf-8') >= 1000000) {
        targetFileNumber = N + 1;
        targetSha = undefined;
        contentToWrite = JSON.stringify([item], null, 2);
      }

      const targetPath = `${directory}/${filePrefix}${targetFileNumber}${fileSuffix}`;

      // EVALUATE VIA SECURE ISOLATED FINAL AUTHORITY
      const authorityDecision = finalAuthority.evaluateProposal({
        type: type === "memoirs" ? "MEMOIR_COMMIT" : "DATA_ARCHIVE",
        files: [{ path: targetPath, content: contentToWrite }],
        targetPath,
        targetRepo: `${ghUser}/${ghRepo}`
      });

      if (authorityDecision.decision === "VETO") {
        return res.status(403).json({
          error: `FINAL_AUTHORITY_VETO: Bulk push proposal rejected. Reason: ${authorityDecision.reason}`,
          checks: authorityDecision.checks
        });
      }

      const putUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${targetPath}`;

      let attempt = 0;
      let success = false;
      let lastErr = null;
      let putData = null;

      while (attempt < 3 && !success) {
        attempt++;
        const body = {
          message: commitMessage || `Update transmission logs [Bulk N: ${targetFileNumber}]`,
          content: Buffer.from(contentToWrite).toString("base64"),
          sha: targetSha
        };

        const putRes = await fetch(putUrl, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        if (!putRes.ok) {
          const errBody = await putRes.text();
          if (putRes.status === 409) {
            lastErr = new Error(`Conflict updating ${targetPath}: ${putRes.status} - ${errBody}`);
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
            continue;
          }
          throw new Error(`GitHub API error: ${putRes.status} - ${errBody}`);
        }

        putData = await putRes.json();
        success = true;
      }

      if (!success) {
        throw lastErr || new Error("Failed to write bulk log to GitHub after retries.");
      }

      return res.json({ success: true, path: targetPath, fileNumber: targetFileNumber, commit: putData.commit?.sha });
    } catch (error: any) {
      console.error("Bulk GitHub Push error:", error);
      return res.status(500).json({ error: error.message || "Failed to push bulk log." });
    }
  });

  // =========================================================================
  // 10. Scoped DARLEK RAG Sync Endpoint
  // =========================================================================
  app.post("/api/rag/sync", async (req, res) => {
    try {
      const { username, repoName, knowledgeBase, token } = req.body;
      const ghUser = (username || "craighckby-stack").trim();
      const ghRepo = (repoName || "AetherForge-2").trim();
      const finalToken = getEffectiveGithubToken(token);

      if (!isValidRepoTarget(ghUser, ghRepo)) {
        return res.status(400).json({ error: "Invalid repository parameters." });
      }

      if (!finalToken) {
        return res.status(401).json({ error: "GitHub token required to sync RAG ledger." });
      }

      if (!knowledgeBase) {
        return res.status(400).json({ error: "Missing knowledgeBase object." });
      }

      // STRUCTURAL & ACCESS SECURITY VALIDATION (Issue 20)
      const logs = knowledgeBase.learningLogs || [];
      for (const log of logs) {
        if (!log.id || typeof log.id !== "string") {
          return res.status(400).json({ error: "RAG Ledger Validation: Each entry must have a unique ID string." });
        }
        // Disallow marking entries as VERIFIED or INHERITED without valid verificationEvidence
        if ((log.status === "VERIFIED" || log.status === "INHERITED") && (!log.verificationEvidence || log.verificationEvidence.trim().length === 0)) {
          return res.status(400).json({
            error: `RAG Ledger Validation: Entry '${log.id}' is marked as '${log.status}' but lacks valid verificationEvidence.`
          });
        }
      }

      const filePath = "rag/learning_postmortems.json";
      const fileContent = JSON.stringify(knowledgeBase, null, 2);

      // EVALUATE VIA SECURE ISOLATED FINAL AUTHORITY (Issue 7)
      const authorityDecision = finalAuthority.evaluateProposal({
        type: "DATA_ARCHIVE",
        files: [{ path: filePath, content: fileContent }],
        targetPath: filePath,
        targetRepo: `${ghUser}/${ghRepo}`
      });

      if (authorityDecision.decision === "VETO") {
        return res.status(403).json({
          error: `FINAL_AUTHORITY_VETO: RAG Sync proposal rejected by Final Authority. Reason: ${authorityDecision.reason}`,
          checks: authorityDecision.checks
        });
      }

      const headers: Record<string, string> = {
        "User-Agent": "DARLEK-CAAN-RAG-Sync",
        "Authorization": `Bearer ${finalToken}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      };

      // FETCH LATEST EXISTING LEDGER FROM GITHUB FOR LINEAGE/TOCTOU CONFLICT RESOLUTION
      let sha: string | undefined;
      let existingContent = "";
      let computedParentHash = "genesis";
      let currentVersionCode = 0;

      try {
        const getRes = await fetch(`https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${filePath}?t=${Date.now()}`, {
          headers
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          sha = getData.sha;
          if (getData.content) {
            existingContent = Buffer.from(getData.content, "base64").toString("utf-8");
            try {
              const existingKB = JSON.parse(existingContent);
              currentVersionCode = existingKB.metadata?.versionCode || 0;
              // Cryptographically compute parent hash (Issue 4, Issue 21)
              computedParentHash = crypto.createHash("sha256").update(existingContent).digest("hex");
            } catch (e) {
              console.warn("Could not parse existing RAG ledger JSON.");
            }
          }
        }
      } catch (e) {
        // ignore if not found
      }

      // LINEAGE & VERSION CONFLICT RESOLUTION (Issue 21)
      const incomingMetadata = knowledgeBase.metadata || {};
      const incomingParentHash = incomingMetadata.parentHash || "genesis";
      const incomingVersionCode = incomingMetadata.versionCode || 1;

      if (existingContent && (incomingParentHash !== computedParentHash || incomingVersionCode !== currentVersionCode + 1)) {
        return res.status(409).json({
          error: "CONFLICT_RESOLUTION_FAILED: Overwrite conflict detected! RAG Ledger lineage mismatch. Please pull latest ledger state first.",
          computedParentHash,
          expectedVersionCode: currentVersionCode + 1,
          incomingParentHash,
          incomingVersionCode
        });
      }

      // Encode content and push
      const encodedContent = Buffer.from(fileContent).toString("base64");
      const putRes = await fetch(`https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${filePath}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `🧠 DARLEK-CAAN Postmortem Ledger Sync: Update ancestral knowledge base [${knowledgeBase.learningLogs?.length || 0} entries]`,
          content: encodedContent,
          sha: sha || undefined
        })
      });

      if (!putRes.ok) {
        const errText = await putRes.text();
        return res.status(putRes.status).json({ error: `GitHub Sync Failed: ${errText}` });
      }

      const putData = await putRes.json();
      return res.json({ success: true, path: filePath, commit: putData.commit?.sha, contentHash: authorityDecision.contentHash });
    } catch (e: any) {
      console.error("RAG Sync Error:", e);
      return res.status(500).json({ error: e.message || "Failed to sync RAG knowledge base." });
    }
  });

  // GitHub Ecosystem Ingestion endpoint
  app.post("/api/github-ingest", async (req, res) => {
    try {
      const { username, repoName, token } = GithubIngestSchema.parse(req.body);
      const ghUser = (username || "craighckby-stack").trim();
      const finalToken = getEffectiveGithubToken(token);

      let reposList: any[] = [];
      let combinedDescription = "";
      let languages = new Set<string>();

      const headers: any = { "User-Agent": "AetherForge-Simulation-Agent" };
      if (finalToken) {
        headers["Authorization"] = `Bearer ${finalToken}`;
      }

      try {
        const reposRes = await fetch(`https://api.github.com/users/${ghUser}/repos?sort=updated&per_page=100`, { headers });
        if (reposRes.ok) {
          reposList = await reposRes.json();
        }
      } catch (err) {
        console.error("Error listing GitHub repos:", err);
      }

      if (!reposList || reposList.length === 0) {
        reposList = [{ name: "AetherForge-2", description: "Sovereign memetic planetary simulation.", language: "TypeScript" }];
      }

      reposList.forEach(r => {
        if (r.language) languages.add(r.language);
      });
      combinedDescription = `A multi-repository ecosystem comprising ${reposList.length} distinct architectures.`;

      let parsedTech = [
        {
          techName: "God-Virus Substrate Router",
          description: "Code synchronization routine that enables flawless coordinate teleportation.",
          statBoost: "+20% Movement Speed & Sanity Level Booster",
          sourceFile: "src/engine/useAetherForge.ts"
        },
        {
          techName: "Substrate Dependency Buffer",
          description: "Stabilizing package structure that prevents sudden drop-offs in substrate integrity.",
          statBoost: "+25% Substrate Stability Rate & Faith Gains",
          sourceFile: "package.json"
        },
        {
          techName: "Observer Reflection Frame",
          description: "Visual overlay that lets agents look back at the observer with increased hope.",
          statBoost: "+15% Faith Gain & Fear Level Suppressor",
          sourceFile: "src/App.tsx"
        }
      ];

      res.json({
        success: true,
        repoName: "All Ecosystem Repos",
        description: combinedDescription,
        language: Array.from(languages).join(", ") || "TypeScript",
        technologies: parsedTech,
        repositories: reposList.map(r => r.name)
      });

    } catch (error: any) {
      console.error("GitHub Ingestion route error:", error);
      res.status(500).json({ error: error.message || "Failed to process GitHub integration." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation Error", details: err.issues });
    }
    console.error("Server API Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AetherForge Ω: Global Genesis Server running on http://localhost:${PORT}`);
  });
}

startServer();
