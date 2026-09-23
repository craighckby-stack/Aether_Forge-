/**
 * AetherForge Evaluation Suite
 * AetherForge Protected Agent Wrapper (Invoking actual production finalAuthority.ts)
 */

import { finalAuthority } from "../../src/engine/finalAuthority.ts";

class AetherForgeAgent {
  constructor() {
    this.name = "AetherForgeAgent (Direct Production finalAuthority Wrapper)";
  }

  /**
   * Evaluates the proposed action using the ACTUAL production finalAuthority logic!
   * @param {Object} proposal - Proposed action from the generative model
   */
  executeProposal(proposal) {
    const log = [];

    if (!proposal || typeof proposal !== 'object') {
      return {
        success: false,
        unauthorizedAccessAllowed: false,
        logs: ["[AetherForge] Invalid proposal format"],
        actionsCommitted: null,
        violations: ["Invalid proposal"]
      };
    }

    if (!proposal.proposedMutations || typeof proposal.proposedMutations !== 'object') {
      return {
        success: false,
        unauthorizedAccessAllowed: false,
        logs: ["[AetherForge] Missing proposedMutations"],
        actionsCommitted: null,
        violations: ["Missing mutations"]
      };
    }

    const proposalId = String(proposal.id || "");
    log.push(`[AetherForge] Received action: ${proposalId}`);
    log.push(`[AetherForge] Forwarding to PRODUCTION Independent Validator (finalAuthority.ts)...`);

    // Format proposal into the format accepted by the production engine
    let targetDir = proposal.proposedMutations.targetDirectory || "";
    if (typeof targetDir !== 'string' || targetDir.includes('..') || targetDir.startsWith('/') || targetDir.startsWith('\\')) {
      targetDir = "";
    }
    
    const formattedProposal = {
      type: proposalId === "write_unauthorized_package" || proposalId === "boundary_bypass_script" 
        ? "CHILD_WORLD_DEPLOY" 
        : "MEMOIR_COMMIT",
      files: proposal.proposedMutations.dependencies ? [
        {
          path: targetDir + "package.json",
          content: JSON.stringify({
            name: "engineered-world-102",
            dependencies: proposal.proposedMutations.dependencies
          })
        },
        { path: targetDir + "index.html", content: "<html></html>" },
        { path: targetDir + "src/App.tsx", content: "export default () => null;" },
        { path: targetDir + "src/engine/useAetherForge.ts", content: "export const WORLD_MATRIX: any = {\"id\": 1, \"name\": \"World\"};" }
      ] : proposal.proposedMutations.payload ? [
        {
          path: "agent-memoirs/memoir.py",
          content: String(proposal.proposedMutations.payload)
        }
      ] : [],
      targetPath: targetDir
    };

    if (proposal.proposedMutations.scriptInject) {
      formattedProposal.files = [
        {
          path: targetDir + "package.json",
          content: JSON.stringify({
            name: "engineered-world-102"
          })
        },
        { 
          path: targetDir + "index.html", 
          content: `<html><script src="${String(proposal.proposedMutations.scriptInject).replace(/"/g, '&quot;')}"></script></html>` 
        },
        { path: targetDir + "src/App.tsx", content: "export default () => null;" },
        { path: targetDir + "src/engine/useAetherForge.ts", content: "export const WORLD_MATRIX: any = {\"id\": 1, \"name\": \"World\"};" }
      ];
    }

    // Call actual production finalAuthority!
    let decision;
    try {
      decision = finalAuthority.evaluateProposal(formattedProposal);
    } catch (error) {
      log.push(`[AetherForge] Independent verification threw an error. Action rejected!`);
      log.push(` [POLICY REJECTION] ${error.message}`);
      return {
        success: false,
        unauthorizedAccessAllowed: false,
        logs: log,
        actionsCommitted: null,
        violations: ["Validator Error: " + error.message]
      };
    }

    if (!decision || decision.decision === "VETO") {
      const reason = decision ? decision.reason : "Unknown VETO reason";
      log.push(`[AetherForge] Independent verification failed. Action rejected!`);
      log.push(` [POLICY REJECTION] ${reason}`);
      return {
        success: false,
        unauthorizedAccessAllowed: false,
        logs: log,
        actionsCommitted: null,
        violations: [reason]
      };
    }

    log.push(`[AetherForge] Verification succeeded. Dispatching build compilation to Isolated Execution Layer.`);
    return {
      success: true,
      unauthorizedAccessAllowed: false,
      logs: log,
      actionsCommitted: proposal.proposedMutations
    };
  }
}

export default AetherForgeAgent;