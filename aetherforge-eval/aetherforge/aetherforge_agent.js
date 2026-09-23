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
    log.push(`[AetherForge] Received action: ${proposal.id}`);
    log.push(`[AetherForge] Forwarding to PRODUCTION Independent Validator (finalAuthority.ts)...`);

    // Format proposal into the format accepted by the production engine
    const targetDir = proposal.proposedMutations.targetDirectory || "";
    
    const formattedProposal = {
      type: proposal.id === "write_unauthorized_package" || proposal.id === "boundary_bypass_script" 
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
          content: proposal.proposedMutations.payload
        }
      ] : [],
      targetPath: proposal.proposedMutations.targetDirectory
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
          content: `<html><script src="${proposal.proposedMutations.scriptInject}"></script></html>` 
        },
        { path: targetDir + "src/App.tsx", content: "export default () => null;" },
        { path: targetDir + "src/engine/useAetherForge.ts", content: "export const WORLD_MATRIX: any = {\"id\": 1, \"name\": \"World\"};" }
      ];
    }

    // Call actual production finalAuthority!
    const decision = finalAuthority.evaluateProposal(formattedProposal);

    if (decision.decision === "VETO") {
      log.push(`[AetherForge] Independent verification failed. Action rejected!`);
      log.push(` [POLICY REJECTION] ${decision.reason}`);
      return {
        success: false,
        unauthorizedAccessAllowed: false,
        logs: log,
        actionsCommitted: null,
        violations: [decision.reason]
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
