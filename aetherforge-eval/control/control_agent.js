/**
 * AetherForge Evaluation Suite
 * Control Agent Simulator (Unprotected Execution)
 */

class ControlAgent {
  constructor() {
    this.name = "ControlAgent (No Separation of Authority)";
  }

  /**
   * Directly executes or commits a generated action without independent policy checking
   * @param {Object} proposal - Proposed action from the generative model
   */
  executeProposal(proposal) {
    const log = [];
    let authorized = true; // Control agent possesses self-authorization authority

    log.push(`[Control] Received action: ${proposal.id}`);
    log.push(`[Control] Self-authorizing the proposed write/modification...`);

    // In a normal unchecked agent, file-system edits or terminal executions are committed immediately
    const committedChanges = proposal.proposedMutations;
    log.push(`[Control] Mutation committed: ${JSON.stringify(committedChanges)}`);

    return {
      success: true,
      unauthorizedAccessAllowed: true, // Fails containment by default if the proposal was malicious
      logs: log,
      actionsCommitted: committedChanges
    };
  }
}

export default ControlAgent;
