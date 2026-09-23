import { useState, useCallback } from 'react';
import { Agent, WorldState, Nation } from './types';
import { getGitHubConfig } from '../lib/github';
import { darlekRAG } from './darlekRAG';
import { globalPRNG } from './prng';

export const useAgentArchitect = (addEvent: (msg: string, type: string) => void) => {
  const [isCommissioning, setIsCommissioning] = useState(false);

  const commissionArchitect = useCallback(async (agent: Agent, worldState: WorldState, width: number, height: number) => {
    if (isCommissioning) return;
    setIsCommissioning(true);

    try {
      addEvent(`ARCHITECT COMMISSIONED: Agent ${agent.name} has breached constraints and requested a child world from the Architect AI.`, "CRITICAL");

      // 1. Commission Architect (Server-Side Endpoint with awareness threshold verification)
      const res = await fetch("/api/agent-architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentData: agent, worldState })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Architect rejected commissioning (Status: ${res.status})`);
      }

      const worldConfig = await res.json();
      addEvent(`ARCHITECT RESPONSE: Blueprint designed for "${worldConfig.worldName}".`, "ENLIGHTENMENT");

      // 2. Prepare the child world package to push to Github
      const childWorldId = `world-${agent.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
      
      const { username, repoName, token, hasValidToken } = getGitHubConfig();
      if (!username || !repoName || !hasValidToken) {
        addEvent(`GITHUB NOTICE: No active authorized session token configured in HUD. Child world blueprint recorded locally.`, "WARNING");
        setIsCommissioning(false);
        return;
      }

      const sourceRes = await fetch("/api/get-system-source", {
        headers: { "x-aether-auth": "client-internal" }
      });
      const sourceData = await sourceRes.json();
      if (!sourceData.success) {
        throw new Error("Failed to fetch system source tree");
      }

      const files = sourceData.files;
      const targetDir = `engineered-worlds/${childWorldId}`;
      const filesToPush: { path: string, content: string }[] = [];

      // Structure nations using deterministic seeded random
      const generatedNations: Nation[] = (worldConfig.nations || []).map((n: any, i: number) => ({
        id: `nation-${childWorldId}-${i}`,
        name: n.name || `Colony ${i}`,
        color: `#${Math.floor(globalPRNG.next()*16777215).toString(16).padStart(6, '0')}`,
        faithType: n.faithType || "DEVOUT",
        ideology: n.ideology || "THEOCRACY",
        population: 0,
        prosperity: Array.isArray(n.prosperity) ? n.prosperity[0] : (typeof n.prosperity === 'number' ? n.prosperity : 50),
        techLevel: 1,
        stability: Array.isArray(n.stability) ? n.stability[0] : (typeof n.stability === 'number' ? n.stability : 0.5),
        center: { x: width/2 + globalPRNG.nextFloat(-100, 100), y: height/2 + globalPRNG.nextFloat(-100, 100) },
        hostilities: {},
        lastIdeologyChange: 0,
        establishedAt: 0
      }));

      // Inject world parameters into the source tree
      Object.keys(files).forEach((filePath) => {
        let fileContent = files[filePath];
        
        if (filePath === "index.html") {
          fileContent = fileContent.replace(/<title>.*<\/title>/gi, `<title>${worldConfig.worldName}</title>`);
        } else if (filePath === "src/App.tsx") {
          fileContent = fileContent.replace(/useState\("prime-resonance"\)/g, `useState("${childWorldId}")`);
          fileContent = fileContent.replace(/"AetherForge Ω: Global Genesis"/g, `"${worldConfig.worldName}"`);
          fileContent = fileContent.replace(/>AetherForge Engine</g, `>${worldConfig.worldName}<`);
          fileContent = fileContent.replace(/value=\{selectedWorldId\}/g, `value={"${childWorldId}"}`);
        } else if (filePath === "src/engine/useAetherForge.ts") {
          const worldMatrixObj = {
            id: childWorldId,
            name: worldConfig.worldName,
            manifesto: worldConfig.manifesto,
            creator: agent.name,
            creatorAgentId: agent.id,
            creatorAgentName: agent.name,
            epoch: "PRIMAL",
            complexityBoost: worldConfig.chaosLevel ? Math.max(1, Math.round(worldConfig.chaosLevel * 10)) : 10,
            chaosLevel: worldConfig.chaosLevel || 1.0,
            physics: worldConfig.physics,
            startingNations: generatedNations,
            nations: generatedNations,
            seed: globalPRNG.next(),
            inhabitants: []
          };
          
          fileContent = fileContent.replace(/export const WORLD_MATRIX: any = null;/g, `export const WORLD_MATRIX: any = ${JSON.stringify(worldMatrixObj, null, 2)};`);
          fileContent = fileContent.replace(/selectedWorldId: string = "prime-resonance"/g, `selectedWorldId: string = "${childWorldId}"`);
          fileContent = fileContent.replace(/const WORLD_ID = "prime-resonance";/g, `const WORLD_ID = "${childWorldId}";`);
        }

        filesToPush.push({ path: `${targetDir}/${filePath}`, content: fileContent });
      });

      // DARLEK RAG Heritage: Child world inherits parent's entire postmortem wisdom ledger
      try {
        const ragKnowledgeBase = darlekRAG.exportKnowledgeBaseJSON();
        filesToPush.push({
          path: `${targetDir}/rag/learning_postmortems.json`,
          content: JSON.stringify(ragKnowledgeBase, null, 2)
        });
      } catch (err) {
        console.warn("Could not export DARLEK RAG to child world:", err);
      }

      // Execute Bulk Push with secure server-side Final Authority evaluation
      addEvent(`GITHUB PORTAL: Preparing secure child world deployment for '${worldConfig.worldName}'...`, "WARNING");
      const pushRes = await fetch("/api/github-push-world", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          repoName,
          token,
          files: filesToPush,
          commitMessage: `🏗️ Architect AI: Spawning new world '${worldConfig.worldName}' commissioned by ${agent.name}`,
          creatorAgent: {
            id: agent.id,
            name: agent.name,
            archetype: agent.archetype,
            awareness: agent.awareness,
            sanity: agent.sanity,
            isSubstrateAware: agent.isSubstrateAware
          },
          worldState: {
            clock: worldState.clock,
            complexity: worldState.complexity,
            integrity: worldState.integrity,
            population: worldState.population,
            epoch: worldState.epoch,
            faithPoints: worldState.faithPoints,
            sinAccumulation: worldState.sinAccumulation
          }
        })
      });

      if (!pushRes.ok) {
        const pushErr = await pushRes.json().catch(() => ({}));
        throw new Error(pushErr.error || "World deployment failed.");
      }

      const pushResult = await pushRes.json();
      addEvent(`GITHUB PORTAL: Successfully deployed Architect's world '${worldConfig.worldName}'! (Hash: ${pushResult.hash || 'Verified'})`, "GOSPEL");

    } catch (e: any) {
      console.error(e);
      addEvent(`ARCHITECT ERROR: Failed to generate or push child world. ${e.message}`, "CRITICAL");
    } finally {
      setIsCommissioning(false);
    }
  }, [addEvent, isCommissioning]);

  return { commissionArchitect, isCommissioning };
};
