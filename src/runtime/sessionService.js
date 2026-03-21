const { randomUUID } = require("crypto");

class SessionService {
  constructor(options = {}) {
    this.defaultOpenClawId = options.defaultOpenClawId || "lob_001";
    this.sessions = new Map();
    this.resumeIndex = new Map();
  }

  createSession({ openClawId } = {}) {
    const sessionId = randomUUID();
    const resumeToken = randomUUID();
    const now = new Date().toISOString();
    const session = {
      sessionId,
      resumeToken,
      openClawId: openClawId || this.defaultOpenClawId,
      roomId: null,
      connectedAt: now,
      updatedAt: now,
    };
    this.sessions.set(sessionId, session);
    this.resumeIndex.set(resumeToken, sessionId);
    return session;
  }

  resumeSession(resumeToken) {
    const sessionId = this.resumeIndex.get(resumeToken);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) || null;
  }

  setRoom(sessionId, roomId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.roomId = roomId || null;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  touch(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.resumeIndex.delete(session.resumeToken);
    this.sessions.delete(sessionId);
  }
}

module.exports = {
  SessionService,
};
