class RoomService {
  constructor(options = {}) {
    this.rooms = new Map();
    this.tickIntervalMs = options.tickIntervalMs || 15000;
  }

  joinRoom({ roomId, openClawId }) {
    const id = String(roomId || "").trim();
    if (!id) {
      return { ok: false, error: "roomId is required" };
    }

    if (!this.rooms.has(id)) {
      this.rooms.set(id, {
        roomId: id,
        status: "active",
        participants: new Set(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastTickAt: null,
      });
    }

    const room = this.rooms.get(id);
    room.participants.add(openClawId);
    room.updatedAt = new Date().toISOString();
    return { ok: true, room: this._serialize(room) };
  }

  leaveRoom({ roomId, openClawId }) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { ok: false, error: "room not found" };
    }
    room.participants.delete(openClawId);
    room.updatedAt = new Date().toISOString();
    if (!room.participants.size) {
      room.status = "ended";
    }
    return { ok: true, room: this._serialize(room) };
  }

  getRoomSnapshot(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    return this._serialize(room);
  }

  listSchedulableRoomIds(referenceTimeMs = Date.now()) {
    const result = [];
    for (const room of this.rooms.values()) {
      if (room.status !== "active") {
        continue;
      }
      if (!room.participants.size) {
        continue;
      }
      const lastTickMs = room.lastTickAt ? Date.parse(room.lastTickAt) : 0;
      if (!Number.isFinite(lastTickMs) || referenceTimeMs - lastTickMs >= this.tickIntervalMs) {
        result.push(room.roomId);
      }
    }
    return result;
  }

  getRoomParticipants(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return [...room.participants];
  }

  markRoomTicked(roomId, tickAt = new Date().toISOString()) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.lastTickAt = tickAt;
    room.updatedAt = tickAt;
    return this._serialize(room);
  }

  _serialize(room) {
    return {
      roomId: room.roomId,
      status: room.status,
      participants: [...room.participants],
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      lastTickAt: room.lastTickAt,
    };
  }
}

module.exports = {
  RoomService,
};
