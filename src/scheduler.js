const EventEmitter = require("events");

class LobsterScheduler extends EventEmitter {
  constructor(options) {
    super();
    this.adapter = options.adapter;
    this.store = options.store;
    this.wsManager = options.wsManager || null;
    this.agentOrchestration = options.agentOrchestration || null;
    this.roomService = options.roomService || null;
    this.intervalMs = options.intervalMs || 5000;
    this.timer = null;
    this.running = false;
    this.inFlight = false;
    this.nextIndex = 0;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((error) => {
        this.emit("error", error);
      });
    }, this.intervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    if (this.inFlight) return null;
    this.inFlight = true;
    let selectedOpenClawId = null;

    try {
      const schedulableOpenClawIds = await this.store.listSchedulableOpenClawIds();
      if (!schedulableOpenClawIds.length) {
        return null;
      }

      const openClawId = schedulableOpenClawIds[this.nextIndex % schedulableOpenClawIds.length];
      selectedOpenClawId = openClawId;
      this.nextIndex = (this.nextIndex + 1) % schedulableOpenClawIds.length;

      const input = await this.store.buildTickInput(openClawId);

      // Try WebSocket first, fall back to adapter
      let output;
      if (this.agentOrchestration && this.wsManager && this.wsManager.isConnected(openClawId)) {
        output = await this._tickViaWs(openClawId, input);
      } else {
        output = await this.adapter.runTick(input);
      }

      const result = await this.store.applyTickOutput(output, input.now, openClawId);
      const diagnosticEvents = [];

      if (output.debugSummary) {
        const debugEvent = await this.store.recordDiagnosticEvent(
          output.diagnosticEventType || "adapter_debug",
          output.debugSummary,
          {
            actionType: output.actionType,
            source: this.wsManager?.isConnected(openClawId) ? "websocket" : this.adapter.mode,
          },
          input.now,
          openClawId
        );
        diagnosticEvents.push(debugEvent);
      }

      this.emit("runtime", result.runtime);
      for (const event of result.events || [result.event]) {
        this.emit("event", event);
      }

      for (const diagnosticEvent of diagnosticEvents) {
        this.emit("diagnostic", diagnosticEvent);
      }

      this.emit("relationship_changed", {
        lobsterId: input.lobsterId,
        openClawId: selectedOpenClawId,
        relationships: result.relationshipChanges,
      });

      await this._tickRooms(input.now);
      return result;
    } catch (error) {
      const happenedAt = new Date().toISOString();
      console.warn(`[scheduler] tick failed, skipping: ${error.message}`);
      try {
        const diagnosticEvent = await this.store.recordDiagnosticEvent(
          "scheduler_error",
          error.message,
          {
            name: error.name,
            stack: error.stack,
          },
          happenedAt,
          selectedOpenClawId
        );
        this.emit("diagnostic", diagnosticEvent);
      } catch (diagError) {
        console.warn(`[scheduler] failed to record diagnostic: ${diagError.message}`);
      }
    } finally {
      this.inFlight = false;
    }
  }

  async _tickViaWs(openClawId, input) {
    try {
      const response = await this.agentOrchestration.runTickViaWorker(openClawId, input);
      if (response) {
        return response;
      }
      return this.agentOrchestration.buildSafeFallback("empty worker response");
    } catch (error) {
      return this.agentOrchestration.buildSafeFallback(error.message || "worker tick error");
    }
  }

  async _tickRooms(nowIso) {
    if (!this.roomService || typeof this.roomService.listSchedulableRoomIds !== "function") {
      return;
    }

    const roomIds = this.roomService.listSchedulableRoomIds(Date.now());
    for (const roomId of roomIds) {
      const participants = this.roomService.getRoomParticipants(roomId);
      if (!participants.length) {
        continue;
      }

      const tickAt = nowIso || new Date().toISOString();
      for (const openClawId of participants) {
        const related = participants.filter((id) => id !== openClawId);
        try {
          const roomResult = await this.store.applyTickOutput(
            {
              actionType: "react_event",
              statePatch: {
                currentActionType: "react_event",
              },
              emittedEvents: [
                {
                  type: "react_event",
                  payload: {
                    summary: `${openClawId} kept room ${roomId} active.`,
                    relatedLobsterIds: related,
                    roomId,
                  },
                },
              ],
            },
            tickAt,
            openClawId
          );
          for (const event of roomResult.events || [roomResult.event]) {
            this.emit("event", event);
          }
        } catch (error) {
          const diagnosticEvent = await this.store.recordDiagnosticEvent(
            "room_scheduler_error",
            error.message,
            { roomId, openClawId },
            tickAt,
            openClawId
          );
          this.emit("diagnostic", diagnosticEvent);
        }
      }

      this.roomService.markRoomTicked(roomId, tickAt);
    }
  }
}

module.exports = {
  OpenClawScheduler: LobsterScheduler,
  LobsterScheduler,
};
