const { WebSocketServer } = require("ws");
const {
  isClientMessageType,
} = require("../protocol/clientServer");

class ClientRealtimeGateway {
  constructor(options) {
    this.sessionService = options.sessionService;
    this.worldService = options.worldService;
    this.roomService = options.roomService;
    this.path = options.path || "/ws/client";
    this.resolveOpenClawId = options.resolveOpenClawId || null;
    this.onEnterRoom = options.onEnterRoom || null;
    this.onLeaveRoom = options.onLeaveRoom || null;
    this.wss = new WebSocketServer({ noServer: true });
  }

  handleUpgrade(req, socket, head) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this._onConnection(ws, req).catch((error) => {
        ws.send(JSON.stringify({
          type: "server_notice",
          level: "error",
          message: error.message || "failed to initialize realtime session",
        }));
        ws.close(1011, "session_init_failed");
      });
    });
  }

  async _onConnection(ws, req) {
    const openClawId = await this._resolveOpenClawId(req);
    let session = this.sessionService.createSession({ openClawId });
    this._sendSessionReady(ws, session);

    ws.on("message", async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: "server_notice", level: "error", message: "Invalid JSON" }));
        return;
      }

      if (!isClientMessageType(msg.type)) {
        ws.send(JSON.stringify({
          type: "command_result",
          ok: false,
          requestType: msg.type || "unknown",
          error: "Unsupported client message type",
        }));
        return;
      }

      try {
        if (msg.type === "client_hello" || msg.type === "enter_world") {
          this.sessionService.touch(session.sessionId);
          const world = await this.worldService.getWorldSnapshot(session.openClawId);
          ws.send(JSON.stringify({ type: "world_snapshot", sessionId: session.sessionId, world }));
          return;
        }

        if (msg.type === "resume_session") {
          const resumed = this.sessionService.resumeSession(msg.resumeToken);
          if (!resumed) {
            ws.send(JSON.stringify({
              type: "command_result",
              ok: false,
              requestType: msg.type,
              error: "Invalid resume token",
            }));
            return;
          }
          session = resumed;
          this._sendSessionReady(ws, session);
          const world = await this.worldService.getWorldSnapshot(session.openClawId);
          ws.send(JSON.stringify({ type: "world_snapshot", sessionId: session.sessionId, world }));
          if (session.roomId) {
            const room = this.roomService.getRoomSnapshot(session.roomId);
            if (room) ws.send(JSON.stringify({ type: "room_snapshot", room }));
          }
          return;
        }

        if (msg.type === "enter_room") {
          const joined = this.onEnterRoom
            ? await this.onEnterRoom({
                roomId: msg.roomId,
                openClawId: session.openClawId,
              })
            : this.roomService.joinRoom({
            roomId: msg.roomId,
            openClawId: session.openClawId,
          });
          if (!joined.ok) {
            ws.send(JSON.stringify({
              type: "command_result",
              ok: false,
              requestType: msg.type,
              error: joined.error,
            }));
            return;
          }
          session = this.sessionService.setRoom(session.sessionId, joined.room.roomId) || session;
          ws.send(JSON.stringify({ type: "room_snapshot", room: joined.room }));
          return;
        }

        if (msg.type === "leave_room") {
          if (!session.roomId) {
            ws.send(JSON.stringify({ type: "command_result", ok: true, requestType: msg.type }));
            return;
          }
          const previousRoomId = session.roomId;
          const left = this.onLeaveRoom
            ? await this.onLeaveRoom({
                roomId: session.roomId,
                openClawId: session.openClawId,
              })
            : this.roomService.leaveRoom({
            roomId: session.roomId,
            openClawId: session.openClawId,
          });
          session = this.sessionService.setRoom(session.sessionId, null) || session;
          ws.send(JSON.stringify({
            type: "room_delta",
            roomId: previousRoomId,
            op: "leave",
            room: left.room || null,
          }));
          return;
        }

        if (msg.type === "player_guidance") {
          ws.send(JSON.stringify({
            type: "agent_status",
            status: "guidance_received",
            guidance: msg.guidance || {},
          }));
          ws.send(JSON.stringify({
            type: "command_result",
            ok: true,
            requestType: msg.type,
          }));
          return;
        }

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", now: new Date().toISOString() }));
          return;
        }

        ws.send(JSON.stringify({ type: "command_result", ok: true, requestType: msg.type }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: "command_result",
          ok: false,
          requestType: msg.type,
          error: error.message || "Unhandled realtime error",
        }));
      }
    });
  }

  _sendSessionReady(ws, session) {
    ws.send(JSON.stringify({
      type: "session_ready",
      sessionId: session.sessionId,
      resumeToken: session.resumeToken,
      openClawId: session.openClawId,
    }));
  }

  async _resolveOpenClawId(req) {
    if (!this.resolveOpenClawId) {
      return undefined;
    }
    try {
      return await this.resolveOpenClawId(req);
    } catch {
      return undefined;
    }
  }
}

module.exports = {
  ClientRealtimeGateway,
};
