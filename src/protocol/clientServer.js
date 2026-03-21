const CLIENT_MESSAGE_TYPES = new Set([
  "client_hello",
  "resume_session",
  "enter_world",
  "enter_room",
  "leave_room",
  "player_guidance",
  "player_interact",
  "spectate_target",
  "ping",
]);

const SERVER_MESSAGE_TYPES = new Set([
  "session_ready",
  "world_snapshot",
  "world_delta",
  "room_snapshot",
  "room_delta",
  "event_feed_item",
  "relationship_update",
  "agent_status",
  "command_result",
  "server_notice",
  "pong",
]);

function isClientMessageType(type) {
  return CLIENT_MESSAGE_TYPES.has(type);
}

function isServerMessageType(type) {
  return SERVER_MESSAGE_TYPES.has(type);
}

module.exports = {
  CLIENT_MESSAGE_TYPES,
  SERVER_MESSAGE_TYPES,
  isClientMessageType,
  isServerMessageType,
};
