const { normalizeWorkerTickPayload } = require("../protocol/serverWorker");

class AgentOrchestrationService {
  constructor(options = {}) {
    this.wsManager = options.wsManager || null;
  }

  setWsManager(wsManager) {
    this.wsManager = wsManager;
  }

  async runTickViaWorker(openClawId, tickInput) {
    if (!this.wsManager || !this.wsManager.isConnected(openClawId)) {
      return null;
    }

    const response = await this.wsManager.sendTickRequest(openClawId, tickInput);
    if (!response) {
      return null;
    }
    return normalizeWorkerTickPayload(response);
  }

  buildSafeFallback(reason) {
    const summary = typeof reason === "string" && reason.trim()
      ? `Worker degraded to safe fallback: ${reason}`
      : "Worker degraded to safe fallback.";
    return {
      actionType: "idle",
      emittedEvents: [
        {
          type: "idle",
          payload: { summary },
        },
      ],
      statePatch: {},
      diagnosticEventType: "worker_fallback",
      debugSummary: summary,
    };
  }
}

module.exports = {
  AgentOrchestrationService,
};
