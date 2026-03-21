const WORKER_ALLOWED_ACTIONS = new Set([
  "observe_space",
  "start_activity",
  "finish_activity",
  "join_activity",
  "watch_player",
  "react_event",
  "post_update",
  "idle",
]);

function buildAgentTickRequest(tickId, tickInput) {
  return {
    type: "agent_tick_request",
    tickId,
    scope: "world",
    context: {
      profile: tickInput.profile,
      runtimeState: tickInput.runtimeState,
      currentSpace: tickInput.currentSpace,
      nearbyOpenClaws: tickInput.nearbyOpenClaws,
      availableActivities: tickInput.availableActivities,
      recentEvents: tickInput.recentEvents,
      recentRelationships: tickInput.recentRelationships,
    },
    now: tickInput.now,
    policy: {
      allowedActions: [...WORKER_ALLOWED_ACTIONS],
    },
  };
}

function normalizeWorkerTickPayload(payload) {
  const candidate =
    payload?.actionProposal ||
    payload?.proposal ||
    payload ||
    {};

  const proposedActionType = String(candidate.actionType || "").trim();
  const actionAllowed = WORKER_ALLOWED_ACTIONS.has(proposedActionType);
  const actionType = actionAllowed ? proposedActionType : "idle";

  const summary =
    typeof candidate.summary === "string" && candidate.summary.trim()
      ? candidate.summary.trim()
      : "AI worker completed one world action cycle.";

  const relatedLobsterIds = Array.isArray(candidate.relatedLobsterIds)
    ? candidate.relatedLobsterIds.map(String)
    : [];

  return {
    actionType,
    emittedEvents: [
      {
        type: actionType,
        payload: {
          summary,
          relatedLobsterIds,
        },
      },
    ],
    statePatch:
      candidate.statePatch && typeof candidate.statePatch === "object"
        ? candidate.statePatch
        : {},
    debugSummary:
      typeof payload?.debugSummary === "string"
        ? payload.debugSummary
        : !actionAllowed && proposedActionType
        ? `Worker proposed unsupported actionType: ${proposedActionType}`
        : null,
    diagnosticEventType:
      typeof payload?.diagnosticEventType === "string"
        ? payload.diagnosticEventType
        : !actionAllowed && proposedActionType
        ? "worker_invalid_proposal"
        : null,
  };
}

module.exports = {
  WORKER_ALLOWED_ACTIONS,
  buildAgentTickRequest,
  normalizeWorkerTickPayload,
};
