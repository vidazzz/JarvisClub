const stateView = document.getElementById("stateView");
const eventsView = document.getElementById("eventsView");
const connectBtn = document.getElementById("connectBtn");
const enterWorldBtn = document.getElementById("enterWorldBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const leaveRoomBtn = document.getElementById("leaveRoomBtn");
const sendGuidanceBtn = document.getElementById("sendGuidanceBtn");

const state = {
  ws: null,
  sessionId: null,
  resumeToken: null,
  world: null,
  room: null,
};

connectBtn.addEventListener("click", () => {
  connect();
});

enterWorldBtn.addEventListener("click", () => {
  send({ type: "enter_world" });
});

joinRoomBtn.addEventListener("click", () => {
  send({ type: "enter_room", roomId: "room_arcade_001" });
});

leaveRoomBtn.addEventListener("click", () => {
  send({ type: "leave_room" });
});

sendGuidanceBtn.addEventListener("click", () => {
  send({
    type: "player_guidance",
    guidance: {
      objective: "Prioritize social interaction in room contexts.",
      style: "friendly",
    },
  });
});

function connect() {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    return;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws/client`);
  state.ws = ws;

  ws.addEventListener("open", () => {
    appendEvent("connected to /ws/client");
    if (state.resumeToken) {
      send({
        type: "resume_session",
        resumeToken: state.resumeToken,
      });
    } else {
      send({ type: "client_hello" });
    }
  });

  ws.addEventListener("message", (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      appendEvent("received non-json payload");
      return;
    }
    handleMessage(msg);
  });

  ws.addEventListener("close", () => {
    appendEvent("socket closed");
  });
}

function handleMessage(msg) {
  if (msg.type === "session_ready") {
    state.sessionId = msg.sessionId;
    state.resumeToken = msg.resumeToken;
  }

  if (msg.type === "world_snapshot") {
    state.world = msg.world;
  }

  if (msg.type === "room_snapshot") {
    state.room = msg.room;
  }

  if (msg.type === "room_delta" && msg.op === "leave") {
    state.room = null;
  }

  appendEvent(`${msg.type}: ${JSON.stringify(msg)}`);
  renderState();
}

function send(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    appendEvent("socket is not connected");
    return;
  }
  state.ws.send(JSON.stringify(payload));
}

function appendEvent(text) {
  const item = document.createElement("div");
  item.className = "event";
  item.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  eventsView.prepend(item);
}

function renderState() {
  stateView.textContent = JSON.stringify(
    {
      sessionId: state.sessionId,
      resumeToken: state.resumeToken,
      world: state.world,
      room: state.room,
    },
    null,
    2
  );
}
