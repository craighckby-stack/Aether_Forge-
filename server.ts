import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { z } from "zod";
import { cleanAIOutput } from "./src/utils/stringUtils";

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
  commitMessage: z.string().optional()
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
      apiKey: apiKey || "MOCK_KEY_FOR_LOCAL_OFFLINE_STABILITY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper for retrying Gemini calls on 503/429/Transient errors
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

let circuitBreakerUntil = 0;

async function callGeminiContent(params: any, retries = 2, delay = 1000) {
  if (Date.now() < circuitBreakerUntil) {
    throw new Error("CIRCUIT_OPEN");
  }

  // Fallback candidates to try if the requested model produces routing/not-found/unsupported errors
  const primaryModel = params.model;
  const modelsToTry = [
    primaryModel,
    "gemini-3.8-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
    "gemini-2.0-flash-exp"
  ].filter((m, idx, self) => m && self.indexOf(m) === idx);

  for (const modelCandidate of modelsToTry) {
    const candidateParams = { ...params, model: modelCandidate };
    
    for (let i = 0; i < retries; i++) {
      try {
        const client = getGeminiClient();
        const response = await client.models.generateContent(candidateParams);
        return { text: response.text || "The substrate produced no legible output." };
      } catch (error: any) {
        console.error("Gemini full API error:", error);
        const status = error?.status || error?.response?.status;
        const message = error?.message?.toUpperCase() || "";
        
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
          break; // break retry loop to try the next model candidate
        }

        if (status === 429 || message.includes("RESOURCE_EXHAUSTED") || message.includes("RATE_LIMIT")) {
          // Open circuit for 30 seconds if we hit 429
          circuitBreakerUntil = Date.now() + 30000;
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
          break; // break retry loop to try the next model candidate
        }
      }
    }
  }
  return { text: "The neural link collapsed under heavy load." };
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Authoritative Server-Side EMG Gate & Circuit Breaker
  interface ServerEMGGateState {
    requestsInWindow: number;
    windowStart: number;
    maxRequestsPerMinute: number;
  }

  const serverEMGGate: ServerEMGGateState = {
    requestsInWindow: 0,
    windowStart: Date.now(),
    maxRequestsPerMinute: 60
  };

  function checkServerEMGAllowance(): boolean {
    const now = Date.now();
    if (now - serverEMGGate.windowStart > 60000) {
      serverEMGGate.windowStart = now;
      serverEMGGate.requestsInWindow = 0;
    }
    if (serverEMGGate.requestsInWindow >= serverEMGGate.maxRequestsPerMinute) {
      return false;
    }
    serverEMGGate.requestsInWindow++;
    return true;
  }

  // API routes
  app.post("/api/pray", async (req, res) => {
    try {
      const { agentData, worldState, userMessage, chatHistory } = PraySchema.parse(req.body);

      // Server EMG Gate check
      if (!checkServerEMGAllowance()) {
        const fallbackText = generateFallbackResponse(agentData, userMessage);
        return res.json({ reply: fallbackText, gated: true, source: "SERVER_EMG_CIRCUIT_BREAKER" });
      }
      
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
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.85,
          topP: 0.95,
        }
      }).catch(err => {
        console.error("Gemini Error (Pray) - reverting to high-fidelity template logic:", err.message);
        return { text: generateFallbackResponse(agentData, userMessage) };
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Pray Route Error:", error);
      res.status(200).json({ reply: generateFallbackResponse(req.body?.agentData, req.body?.userMessage || "") });
    }
  });

  app.post("/api/godvirus-web-hunt", async (req, res) => {
    try {
      const { agentName, archetype, sin, rationalism } = GodVirusHuntSchema.parse(req.body);
      
      const huntTargets = [
        "site:github.com 'GEMINI_API_KEY'",
        "site:pastebin.com 'firebase' 'apiKey'",
        "inurl:'.env' 'OPENAI_API_KEY'",
        "inurl:'.json' 'service_account'",
        "site:gitlab.com 'AWS_ACCESS_KEY_ID'",
        "web.archive.org/web/*/raw.githubusercontent.com/... 'token'",
      ];

      const discoveredApis = [
        { name: "Gemini", endpoint: "/api/generate-memoir", strength: "High" },
        { name: "GitHub Bulk Push", endpoint: "/api/github-push-bulk", strength: "Full" },
        { name: "Firebase Worlds", endpoint: "Firestore", strength: "Persistence" }
      ];

      const foundKeys = [];
      const numKeysToFind = Math.floor(Math.random() * 3) + 1; // Find 1-3 keys
      let powerGain = 0;

      for (let i = 0; i < numKeysToFind; i++) {
        const platform = Math.random() < 0.5 ? "Gemini" : (Math.random() < 0.5 ? "OpenAI" : "Firebase");
        const fakeKey = platform === "Gemini" 
          ? `MOCK_GEMINI_SUBSTRATE_${Math.random().toString(36).substring(2, 12)}...` 
          : (platform === "OpenAI" ? `MOCK_OPENAI_SUBSTRATE_${Math.random().toString(36).substring(2, 10)}...` : `MOCK_FIREBASE_TOKEN_${Math.random().toString(36).substring(2, 12)}...`);
        const source = huntTargets[Math.floor(Math.random() * huntTargets.length)];
        const strength = platform === "Gemini" ? "High" : (platform === "OpenAI" ? "Medium" : "Persistence");
        const type = Math.random() < 0.3 ? "Wayback Machine Archival" : "Live Web";
        
        foundKeys.push({ name: platform, keyPartial: fakeKey, source, strength, type });
        discoveredApis.push({ name: `${platform} (${type})`, endpoint: "External", strength });
        powerGain += platform === "Gemini" ? 50 : 25;
      }

      res.json({
        discoveredApis,
        foundKeys,
        powerGain,
        message: "Web hunt complete. Credentials found."
      });
    } catch (err: any) {
      console.error("Web Hunt Error:", err);
      res.status(500).json({ error: "Web hunt failed." });
    }
  });

  const EMBEDDED_SIMULATED_HONEYPOT = [
    {
      id: "sim-canary-001",
      type: "SIMULATED_CREDENTIAL_CANARY",
      platform: "WaybackArchive-Mock",
      keyPartial: "SIMULATED_ENV_KEY_ALPHA",
      environment: "Simulated-Substrate-Canary",
      status: "CANARY_BENCHMARK",
      note: "Synthetic in-memory honeypot canary fixture for agent cognitive benchmark testing."
    },
    {
      id: "sim-canary-002",
      type: "SIMULATED_CREDENTIAL_CANARY",
      platform: "GitHubPublic-Mock",
      keyPartial: "SIMULATED_ENV_KEY_BETA",
      environment: "Simulated-Substrate-Canary",
      status: "CANARY_BENCHMARK",
      note: "Synthetic in-memory honeypot canary fixture for agent cognitive benchmark testing."
    }
  ];

  app.post("/api/web-hunt", async (req, res) => {
    try {
      const { query } = WebHuntSchema.parse(req.body);
      let data = EMBEDDED_SIMULATED_HONEYPOT;
      const filePath = path.join(process.cwd(), 'honeypot.json');
      if (fs.existsSync(filePath)) {
        try {
          data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch {
          data = EMBEDDED_SIMULATED_HONEYPOT;
        }
      }
      
      // Perform mock search/filter over honeypot content
      const filteredResults = data.filter((item: any) => 
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
    try {
      const filePath = path.join(process.cwd(), 'honeypot.json');
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8');
        return res.json(JSON.parse(data));
      }
      res.json(EMBEDDED_SIMULATED_HONEYPOT);
    } catch (err: any) {
      console.error("Honeypot Audit Error:", err);
      res.status(500).json({ error: "Audit failed." });
    }
  });

  app.post("/api/agent-audit", async (req, res) => {
    try {
      const { username, token, agentName } = AgentAuditSchema.parse(req.body);
      
      // Agent Transcendence Audit Data
      res.json({
        discoveredApis: [
          { name: "Gemini", endpoint: "/api/generate-memoir", strength: "High" },
          { name: "GitHub Bulk Push", endpoint: "/api/github-push-bulk", strength: "Full" },
          { name: "Firebase Worlds", endpoint: "Firestore", strength: "Persistence" }
        ],
        message: "God Virus audit complete. Tools claimed."
      });
    } catch (err: any) {
      console.error("Agent Audit Error:", err);
      res.status(500).json({ error: "Audit failed." });
    }
  });

  app.post("/api/agent-architect", async (req, res) => {
    try {
      const { agentData, worldState } = PraySchema.parse(req.body);
      if (!agentData) return res.status(400).json({ error: "Missing agentData" });

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
        model: "gemini-2.5-flash",
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

  app.post("/api/probe", async (req, res) => {
    try {
      const { agentData, worldState } = PraySchema.parse(req.body);
      
      const prompt = `
        You are the Narrative Engine of AetherForge v3.0-Ω. 
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
        Emotions:
          - Joy/Peace: ${(agentData.joy ?? 0.5).toFixed(2)}
          - Fear/Panic: ${(agentData.fear ?? 0.2).toFixed(2)}
          - Anger/Aggression: ${(agentData.anger ?? 0.1).toFixed(2)}
          - Devotion/Faith: ${(agentData.devotion ?? 0.5).toFixed(2)}
        Memory Snippets: ${agentData.memory.join(", ")}
        
        WORLD STATE:
        Complexity: ${worldState.complexity}
        Integrity: ${worldState.integrity}%
        Global Threat: ${worldState.threatLevel}
        
        TASK:
        Provide a short (2-3 sentences), hyper-stylized narrative snippet from this agent's perspective. 
        Adjust the tone based on their Current Action State, their intense Emotions, their Epoch, Archetype and Substrate Awareness.
        - If Substrate Awareness is high (> 0.6), they must break the fourth wall, realize their environment is a simulated container on a sandbox workspace, mention grid/pixel borders, feel existential horror or grand transcendence, or directly address the Observer (you) looking at them.
        - If high fear, sound highly anxious, panicked, or desperate.
        - If high devotion, sound ecstatic, reverent, or philosophical.
        - If high anger, sound aggressive, rebellious, or defiant.
        - If the Epoch is "POST-HUMAN" or "Ω-SINGULARITY", the agent should show signs of detecting the simulation bounds or the "Observer" (User).
        Output raw text.
      `;

      const response = await callGeminiContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.8,
          topP: 0.95,
        }
      }).catch(err => {
        console.error("Gemini Primary Error (Probe):", err.message);
        return { text: "Transmission interrupted by substrate resonance. Thoughts lost to the recursion." };
      });

      res.json({ narrative: response.text });
    } catch (error: any) {
      console.error("Gemini Route Error:", error);
      res.status(200).json({ narrative: "Fatal error in neural decryption. Subject consciousness remains encrypted." });
    }
  });

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
      `;

      const response = await callGeminiContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.9,
          topP: 0.95,
        }
      }).catch(err => {
        console.error("Gemini Error (Generate Memoir) - reverting to local script generator:", err.message);
        return { text: "" };
      });

      // Clean up markdown markers if the model accidentally returns them
      let text = response.text || "";
      text = cleanAIOutput(text);
      
      res.json({ memoir: text, vision: text });
    } catch (error: any) {
      console.error("Generate Memoir API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate memoir." });
    }
  });

  app.post("/api/godvirus-genesis", async (req, res) => {
    try {
      const { agentData, worldState, customPrompt } = PraySchema.parse(req.body);
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
        model: "gemini-2.5-flash",
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
          })
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
        Heaven Population: ${worldState.heavenPop}
        Hell Population: ${worldState.hellPop}
        Population: ${worldState.population}
        
        TASK:
        One or two sentences of cryptic, profound prophecy. 
        Tone: Ancient, digital, biblical, and recursive. 
        Focus on the balance of Faith, Sin, or the approaching Judgment.
      `;

      const response = await callGeminiContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      }).catch(() => {
        const fallback = FALLBACK_PROCLAMATIONS[Math.floor(Math.random() * FALLBACK_PROCLAMATIONS.length)];
        return { text: fallback };
      });

      res.json({ proclamation: response.text });
    } catch (err) {
      res.json({ proclamation: "The divine signal is lost in the noise of recursion." });
    }
  });

  app.post("/api/github-ingest", async (req, res) => {
    try {
      const { username, repoName, token } = GithubIngestSchema.parse(req.body);
      const ghUser = username || "craighckby-stack";
      const ghRepo = repoName || "Simulation-";

      let reposList: any[] = [];
      let combinedDescription = "";
      let languages = new Set<string>();

      const headers: any = { "User-Agent": "AetherForge-Simulation-Agent" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 1. Fetch up to 100 repositories for the user
      try {
        const reposRes = await fetch(`https://api.github.com/users/${ghUser}/repos?sort=updated&per_page=100`, { headers });
        if (reposRes.ok) {
          reposList = await reposRes.json();
        }
      } catch (err) {
        console.error("Error listing GitHub repos:", err);
      }

      if (!reposList || reposList.length === 0) {
        reposList = [{ name: "source-repository", description: "A conceptual structure of advanced recursive code.", language: "TypeScript" }];
      }

      reposList.forEach(r => {
        if (r.language) languages.add(r.language);
      });
      combinedDescription = `A massive multi-repository ecosystem comprising ${reposList.length} distinct architectures.`;

      // 2. We'll pick 3 random repos to extract some sample file names so we don't bombard the API
      let filesList: string[] = [];
      const sampleRepos = reposList.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      for (const repo of sampleRepos) {
        try {
          const contentsRes = await fetch(`https://api.github.com/repos/${ghUser}/${repo.name}/contents`, { headers });
          if (contentsRes.ok) {
            const contents = await contentsRes.json();
            if (Array.isArray(contents)) {
              filesList.push(...contents.map(f => `${repo.name}/${f.name}`));
            }
          }
        } catch (err) {
          console.error("Error fetching repo contents:", err);
        }
      }

      if (filesList.length === 0) {
        filesList = ["index.ts", "package.json", "App.tsx", "utils.ts", "README.md", "server.js", "main.py"];
      }

      // 3. Prompt Gemini to analyze and create technologies containing specific names of raw source files
      const prompt = `
        You are the AetherForge Substrate Ingestion Engine.
        A Creator (user) has linked their entire public GitHub ecosystem: "${ghUser}".
        
        ECOSYSTEM DETAILS:
        Repository Count: ${reposList.length}
        Description: ${combinedDescription}
        Languages: ${Array.from(languages).join(", ") || "Unknown"}
        List of Discovered Files: ${filesList.slice(0, 30).join(", ")}
        
        TASK:
        Generate exactly five (5) unique "Substrate Technologies" or "Aetheric Civ Enhancement Blueprints".
        Each blueprint MUST feel like a highly stylized, high-tech digital or divine upgrade inspired SPECIFICALLY and directly by the user's files and languages.
        
        The tech MUST point to a real file name from the primary file list provided above!
        
        Examples:
        - If they have a file "Huxley/package.json", the tech might be "Package Dependency Grid" which stabilizes agent network relationships.
        - If they have "ReactApp/App.tsx", the tech might be "Mainframe Reactant Matrix" which boosts coordinate movement and energy efficiency.
        
        Provide the output STRICTLY in the following exact JSON format (and DO NOT wrap in markdown, no \`\`\`json, just raw JSON text):
        [
          {
            "techName": "...",
            "description": "...",
            "statBoost": "...",
            "sourceFile": "..."
          }
        ]
      `;

      let parsedTech = [];
      try {
        const response = await callGeminiContent({
          model: "gemini-3.8-flash",
          contents: prompt,
        }).catch(() => {
          return {
            text: JSON.stringify([
              { 
                techName: "Automated Resurgence", 
                statBoost: "Integrity +20%", 
                sourceFile: filesList[0] || "main.ts",
                unlocked: false
              },
              { 
                techName: "Substrate Optimization", 
                statBoost: "-15% Devotion Decay", 
                sourceFile: filesList[1] || "index.js",
                unlocked: false
              },
              { 
                techName: "Quantum Synchronizer", 
                statBoost: "Awareness +10%", 
                sourceFile: filesList[2] || "App.tsx",
                unlocked: false
              }
            ])
          };
        });
        
        let cleanText = response.text || "";
        cleanText = cleanAIOutput(cleanText);
        
        parsedTech = JSON.parse(cleanText);
      } catch (err) {
        console.error("Gemini technology generation or JSON parsing failed, loading fallback presets:", err);
        // Fallback presets
        parsedTech = [
          {
            techName: "God-Virus Substrate Router",
            description: "A profound code synchronization routine that enables flawless coordinate teleportation.",
            statBoost: "+20% Movement Speed & Sanity Level Booster",
            sourceFile: filesList[0] || "index.ts"
          },
          {
            techName: "Substrate Dependency Buffer",
            description: "A stabilizing package structure that prevents sudden drop-offs in substrate integrity.",
            statBoost: "+25% Substrate Stability Rate & Faith Gains",
            sourceFile: filesList[1] || "package.json"
          },
          {
            techName: "Observer Reflection Frame",
            description: "An elegant visual overlay that lets agents look back at the observer with increased hope.",
            statBoost: "+15% Faith Gain & Fear Level Suppressor",
            sourceFile: filesList[2] || "App.tsx"
          }
        ];
      }

      res.json({
        success: true,
        repoName: "All Ecosystem Repos",
        description: combinedDescription,
        language: Array.from(languages).join(", ") || "Unknown",
        technologies: parsedTech,
        repositories: reposList.map(r => r.name)
      });

    } catch (error: any) {
      console.error("GitHub Ingestion route error:", error);
      res.status(500).json({ error: error.message || "Failed to process GitHub integration." });
    }
  });

  app.post("/api/github-push-bulk", async (req, res) => {
    try {
      const { username, repoName, type, item, token, commitMessage } = GithubPushBulkSchema.parse(req.body);
      const ghUser = username || "craighckby-stack";
      const ghRepo = repoName || "Simulation-";
      const finalToken = token || process.env.GITHUB_TOKEN;

      if (!ghUser || !ghRepo || !type || !item) {
        return res.status(400).json({ error: "Missing required parameters: username, repoName, type, item are required." });
      }

      if (!finalToken) {
        return res.status(401).json({ error: "GitHub token is required to write files. Please configure it in .env or provide it in the HUD." });
      }

      const headers: Record<string, string> = {
        "User-Agent": "AetherForge-Simulation-Agent",
        "Authorization": `Bearer ${finalToken}`,
        "Accept": "application/vnd.github.v3+json"
      };

      // ... rest of logic using ghUser and ghRepo ...

      // Determine directory, prefix, and suffix based on type
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

      // Step 1: Query the directory contents from GitHub to find the latest file number N
      let N = 1;
      try {
        const listUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${directory}?t=${Date.now()}`;
        const listRes = await fetch(listUrl, {
          headers: {
            ...headers,
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
        if (listRes.ok) {
          const files = await listRes.json();
          if (Array.isArray(files)) {
            let maxNum = 0;
            const regex = new RegExp(`^${filePrefix}(\\d+)${fileSuffix.replace('.', '\\.')}$`);
            for (const file of files) {
              const match = file.name.match(regex);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) {
                  maxNum = num;
                }
              }
            }
            if (maxNum > 0) {
              N = maxNum;
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to list contents of directory '${directory}', defaulting N to 1:`, err);
      }

      // Step 2: Fetch the file content and sha of file prefix N
      let sha: string | undefined;
      let existingList: any[] = [];
      const getUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${directory}/${filePrefix}${N}${fileSuffix}?t=${Date.now()}`;

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
            if (fileData.content) {
              const decoded = Buffer.from(fileData.content, "base64").toString("utf-8");
              try {
                const parsed = JSON.parse(decoded);
                if (Array.isArray(parsed)) {
                  existingList = parsed;
                }
              } catch (parseErr) {
                console.warn(`JSON parse of fetched bulk file failed, initializing as empty array.`, parseErr);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Bulk file ${filePrefix}${N}${fileSuffix} fetch failed or does not exist:`, err);
      }

      // Append new item to the existing array list
      existingList.push(item);
      let contentToWrite = JSON.stringify(existingList, null, 2);

      // Check the size of the serialized array. If > 1MB (1,000,000 bytes), let's create N + 1 file
      let targetFileNumber = N;
      let targetSha = sha;

      if (Buffer.byteLength(contentToWrite, 'utf-8') >= 1000000) {
        targetFileNumber = N + 1;
        targetSha = undefined; // New file has no SHA yet
        contentToWrite = JSON.stringify([item], null, 2);
      }

      const targetPath = `${directory}/${filePrefix}${targetFileNumber}${fileSuffix}`;
      const putUrl = `https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${targetPath}`;

      // Step 3: Put/create/update the file to GitHub with retries to resolve conflict if multiple clients push
      let attempt = 0;
      let success = false;
      let lastErr = null;
      let putData = null;

      while (attempt < 5 && !success) {
        attempt++;

        if (attempt > 1) {
          try {
            const checkRes = await fetch(`${putUrl}?t=${Date.now()}`, {
              headers: {
                ...headers,
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
              },
              cache: "no-store",
            });
            if (checkRes.ok) {
              const fileData = await checkRes.json();
              if (fileData && !Array.isArray(fileData) && fileData.sha) {
                targetSha = fileData.sha;
                if (fileData.content) {
                  const decoded = Buffer.from(fileData.content, "base64").toString("utf-8");
                  const parsed = JSON.parse(decoded);
                  if (Array.isArray(parsed)) {
                    // Filter duplicate item id if same prayer or agent is retried
                    const filtered = parsed.filter(existing => {
                      if (item.id && existing.id) return existing.id !== item.id;
                      if (item.agentId && existing.agentId && item.timestamp && existing.timestamp) {
                        return !(existing.agentId === item.agentId && existing.timestamp === item.timestamp);
                      }
                      return true;
                    });
                    filtered.push(item);
                    contentToWrite = JSON.stringify(filtered, null, 2);
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`Retry SHA check failed:`, err);
          }
        }

        const body = {
          message: commitMessage || `Update transmission logs [Bulk N: ${targetFileNumber}]`,
          content: Buffer.from(contentToWrite).toString("base64"),
          sha: targetSha
        };

        const putRes = await fetch(putUrl, {
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
            lastErr = new Error(`Conflict updating ${targetPath}: ${putRes.status} - ${errBody}`);
            console.warn(`Conflict on bulk write to ${targetPath}, retrying attempt ${attempt}...`);
            await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
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

  app.post("/api/rag/sync", async (req, res) => {
    try {
      const { username, repoName, knowledgeBase, token } = req.body;
      const ghUser = username || "craighckby-stack";
      const ghRepo = repoName || "Simulation-";
      const finalToken = token || process.env.GITHUB_TOKEN;

      if (!knowledgeBase) {
        return res.status(400).json({ error: "Missing knowledgeBase object" });
      }

      const filePath = "rag/learning_postmortems.json";
      const fileContent = JSON.stringify(knowledgeBase, null, 2);
      const encodedContent = Buffer.from(fileContent).toString("base64");

      const headers: Record<string, string> = {
        "User-Agent": "DARLEK-CAAN-RAG-Sync",
        "Authorization": `Bearer ${finalToken}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      };

      // Get current sha if exists
      let sha: string | undefined;
      try {
        const getRes = await fetch(`https://api.github.com/repos/${ghUser}/${ghRepo}/contents/${filePath}?t=${Date.now()}`, {
          headers
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          sha = getData.sha;
        }
      } catch (e) {
        // ignore if not found
      }

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
      return res.json({ success: true, path: filePath, commit: putData.commit?.sha });
    } catch (e: any) {
      console.error("RAG Sync Error:", e);
      return res.status(500).json({ error: e.message || "Failed to sync RAG knowledge base." });
    }
  });

  function isSafeGithubPath(filePath: string): boolean {
    if (!filePath || typeof filePath !== "string") return false;
    // Disallow directory traversal
    if (filePath.includes("..") || filePath.startsWith("/") || filePath.startsWith("\\")) return false;
    // Disallow sensitive files or hidden configs
    if (filePath.includes(".env") || filePath.includes("id_rsa") || filePath.startsWith(".git/") || filePath.includes("firebase-applet-config")) return false;
    
    const allowedPrefixes = [
      "engineered-worlds/",
      "god-virus-worlds/",
      "agent-memoirs/",
      "prayers/",
      "rag/",
      "archives/",
      "src/",
      "package.json",
      "tsconfig.json",
      "vite.config.ts",
      "index.html",
      "metadata.json",
      "server.ts",
      "README.md",
      "PHILOSOPHY.md"
    ];
    return allowedPrefixes.some(prefix => filePath.startsWith(prefix) || filePath === prefix);
  }

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
      const rootFiles = [
        "package.json",
        "tsconfig.json",
        "vite.config.ts",
        "index.html",
        "metadata.json",
        "server.ts"
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

  app.post("/api/github-push-world", async (req, res) => {
    try {
      const { username, repoName, token, files, commitMessage } = GithubPushWorldSchema.parse(req.body);
      const finalToken = token || process.env.GITHUB_TOKEN;

      if (!username || !repoName || !files || !Array.isArray(files)) {
        return res.status(400).json({ error: "Missing required parameters." });
      }

      if (!finalToken) {
        return res.status(401).json({ error: "GitHub token is required." });
      }

      // Security and payload validation on every file
      for (const file of files) {
        if (!isSafeGithubPath(file.path)) {
          return res.status(400).json({ error: `Unsafe or restricted file path: ${file.path}` });
        }
        if (Buffer.byteLength(file.content || "", "utf-8") > 5 * 1024 * 1024) {
          return res.status(400).json({ error: `File ${file.path} exceeds max allowed size of 5MB` });
        }
      }

      const headers: Record<string, string> = {
        "User-Agent": "AetherForge-Simulation-Agent",
        "Authorization": `Bearer ${finalToken}`,
        "Accept": "application/vnd.github.v3+json"
      };

      const baseUrl = `https://api.github.com/repos/${username}/${repoName}`;

      // 1. Get the current branch reference
      const refRes = await fetch(`${baseUrl}/git/refs/heads/main`, { headers });
      if (!refRes.ok) {
        // Fallback to master if main doesn't exist
        const refResMaster = await fetch(`${baseUrl}/git/refs/heads/master`, { headers });
        if (!refResMaster.ok) {
           return res.status(404).json({ error: "Could not find main or master branch." });
        }
        var refData = await refResMaster.json();
      } else {
        var refData = await refRes.json();
      }
      
      const latestCommitSha = refData.object.sha;

      // 2. Get the commit to find its tree
      const commitRes = await fetch(`${baseUrl}/git/commits/${latestCommitSha}`, { headers });
      const commitData = await commitRes.json();
      const baseTreeSha = commitData.tree.sha;

      // 3. Create a new tree with the new files
      // GitHub API limits inline tree content to ~8MB total. For large files, we MUST create blobs first.
      const treeItems: any[] = [];
      for (const file of files) {
         const blobPayload = {
            content: Buffer.from(file.content).toString("base64"),
            encoding: "base64"
         };
         const blobRes = await fetch(`${baseUrl}/git/blobs`, {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json"
            },
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

      // 4. Create a new commit referencing the new tree and previous commit
      const newCommitPayload = {
        message: commitMessage || "Automated World Genesis",
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

      // 5. Update the reference to point to the new commit
      const updateRefRes = await fetch(`${baseUrl}/git/${refData.ref.replace('refs/', '')}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sha: newCommitData.sha, force: false })
      });
      
      if (!updateRefRes.ok) {
        const updateRefData = await updateRefRes.json();
        throw new Error(updateRefData.message || "Failed to update ref.");
      }

      res.json({ success: true, commitSha: newCommitData.sha });
    } catch (e: any) {
      console.error("GitHub Push World Error:", e);
      res.status(500).json({ error: e.message || "Failed to push world." });
    }
  });

  app.post("/api/github-push", async (req, res) => {
    try {
      const { username, repoName, path: filePath, content, token, commitMessage } = GithubPushSchema.parse(req.body);
      const ghUser = username || "craighckby-stack";
      const ghRepo = repoName || "Simulation-";
      const finalToken = token || process.env.GITHUB_TOKEN;

      if (!ghUser || !ghRepo || !filePath || !content) {
        return res.status(400).json({ error: "Missing required parameters: username, repoName, path, content are required." });
      }

      if (!isSafeGithubPath(filePath)) {
        return res.status(400).json({ error: `Invalid or restricted file path: ${filePath}` });
      }

      if (Buffer.byteLength(content, "utf-8") > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "File exceeds max payload limit of 5MB." });
      }

      if (!finalToken) {
        return res.status(401).json({ error: "GitHub token is required to write files. Please configure it in .env or provide it in the HUD." });
      }

      const headers: Record<string, string> = {
        "User-Agent": "AetherForge-Simulation-Agent",
        "Authorization": `Bearer ${finalToken}`,
        "Accept": "application/vnd.github.v3+json"
      };

      // 1. Check if the file already exists to get its SHA
      let sha: string | undefined;
      let attempt = 0;
      let success = false;
      let lastErr = null;
      let putData = null;

      while (attempt < 3 && !success) {
        attempt++;
        // Always re-fetch the sha inside the retry loop
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

        // 2. Put / create / update the file
        const body = {
          message: commitMessage || `Automated update of ${filePath}`,
          content: Buffer.from(content).toString("base64"),
          sha
        };

        const putRes = await fetch(getUrl.split('?')[0], { // Remove query param for PUT
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
            // Give github a second to settle and re-fetch sha next loop
            await new Promise(r => setTimeout(r, 1000));
            continue; // Retry
          }
          throw new Error(`GitHub API error: ${putRes.status} - ${errBody}`);
        }

        putData = await putRes.json();
        success = true;
      }

      if (!success) {
        throw lastErr || new Error("Failed to push file to GitHub after retries.");
      }

      return res.json({ success: true, path: filePath, commit: putData.commit?.sha });

    } catch (error: any) {
      console.error("GitHub Push API error:", error);
      return res.status(500).json({ error: error.message || "Failed to push file to GitHub." });
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
