#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

const DEFAULT_HOST = process.env.PLATFORM_HOST || "127.0.0.1";
const DEFAULT_PORT = Number(process.env.PLATFORM_PORT || 3000);
let platformHost = DEFAULT_HOST;
let platformPort = DEFAULT_PORT;

const HELP = `
One-line OpenClaw connector bootstrap

Usage:
  npm run quick-connect

Optional env:
  PLATFORM_HOST=127.0.0.1
  PLATFORM_PORT=3000
  OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
  OPENCLAW_GATEWAY_TOKEN=<token>
`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(HELP.trim());
  process.exit(0);
}

let serverProcess = null;
let workerProcess = null;

main().catch((error) => {
  console.error("[quick-connect] failed:", error.message);
  shutdown(1);
});

async function main() {
  if (process.env.PLATFORM_BASE_URL) {
    const parsed = new URL(process.env.PLATFORM_BASE_URL);
    platformHost = parsed.hostname;
    platformPort = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
  }

  console.log(`[quick-connect] platform target: ${platformBase()}`);
  const serverRunning = await isServerReachable();

  if (!serverRunning) {
    console.log("[quick-connect] server not reachable, starting local server...");
    await startServer();
  } else {
    console.log("[quick-connect] server already running.");
  }

  const apiKey = await createApiKey();
  const openClaw = detectOpenClawGateway();
  const workerArgs = buildWorkerArgs(apiKey, openClaw);

  console.log("[quick-connect] starting ai-worker...");
  workerProcess = spawn(process.execPath, workerArgs, {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });

  wireSignals();
  workerProcess.on("exit", (code) => {
    console.log(`[quick-connect] ai-worker exited with code ${code ?? 0}`);
    shutdown(code ?? 0);
  });
}

function wireSignals() {
  const onSignal = () => shutdown(0);
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
}

function shutdown(code) {
  if (workerProcess && workerProcess.exitCode === null) {
    workerProcess.kill("SIGTERM");
  }
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
  }
  process.exit(code);
}

async function isServerReachable() {
  try {
    const status = await requestJson(`${platformBase()}/api/me/hosting/status`, { method: "GET" }, 1500);
    if (typeof status === "object" && status) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function startServer() {
  let attempts = 0;
  while (attempts < 10) {
    try {
      await spawnServerAtCurrentPort();
      return;
    } catch (error) {
      if (!String(error.message).includes("EADDRINUSE")) {
        throw error;
      }
      platformPort += 1;
      console.log(`[quick-connect] port in use, retrying on ${platformHost}:${platformPort}...`);
    }
    attempts += 1;
  }
  throw new Error("could not find available port for local server");
}

async function spawnServerAtCurrentPort() {
  const free = await isPortFree(platformHost, platformPort);
  if (!free) {
    throw new Error(`EADDRINUSE ${platformHost}:${platformPort}`);
  }

  serverProcess = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(__dirname, ".."),
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      HOST: platformHost,
      PORT: String(platformPort),
    },
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("timed out waiting for server startup"));
    }, 12000);

    const onStdout = (chunk) => {
      const line = chunk.toString();
      process.stdout.write(`[server] ${line}`);
      if (line.includes("running at http://")) {
        clearTimeout(timer);
        cleanup();
        resolve();
      }
    };

    const onStderr = (chunk) => {
      const line = chunk.toString();
      process.stderr.write(`[server] ${line}`);
    };

    const onExit = (code) => {
      clearTimeout(timer);
      cleanup();
      reject(new Error(`server exited before ready (code ${code})`));
    };

    function cleanup() {
      serverProcess.stdout.off("data", onStdout);
      serverProcess.stderr.off("data", onStderr);
      serverProcess.off("exit", onExit);
    }

    serverProcess.stdout.on("data", onStdout);
    serverProcess.stderr.on("data", onStderr);
    serverProcess.on("exit", onExit);
  });
}

async function createApiKey() {
  const response = await requestJson(`${platformBase()}/api/me/api-keys`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayLabel: "quick-connect",
    }),
  });

  if (!response.apiKey) {
    throw new Error("API key was not returned by /api/me/api-keys");
  }
  console.log("[quick-connect] API key issued.");
  return response.apiKey;
}

function detectOpenClawGateway() {
  const fromEnvToken = process.env.OPENCLAW_GATEWAY_TOKEN || "";
  const fromEnvUrl = process.env.OPENCLAW_GATEWAY_URL || "";

  if (fromEnvToken) {
    return {
      url: fromEnvUrl || "http://127.0.0.1:18789",
      token: fromEnvToken,
    };
  }

  const home = process.env.HOME || process.env.USERPROFILE || "";
  const configPath = path.join(home, ".openclaw", "openclaw.json");
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    const port = parsed?.gateway?.port || 18789;
    const token = parsed?.gateway?.auth?.token || parsed?.gateway?.remote?.token || "";
    return {
      url: `http://127.0.0.1:${port}`,
      token,
    };
  } catch {
    return {
      url: "http://127.0.0.1:18789",
      token: "",
    };
  }
}

function buildWorkerArgs(apiKey, openClaw) {
  const args = [
    path.join(__dirname, "..", "ai-worker", "index.js"),
    "--platform-url",
    `ws://${platformHost}:${platformPort}/ws/agent`,
    "--api-key",
    apiKey,
  ];

  if (openClaw.token) {
    console.log(`[quick-connect] real OpenClaw mode: ${openClaw.url}`);
    args.push("--openclaw-url", openClaw.url, "--openclaw-token", openClaw.token);
  } else {
    console.log("[quick-connect] OpenClaw token not found, fallback to mock mode.");
    args.push("--mock");
  }

  return args;
}

function platformBase() {
  return `http://${platformHost}:${platformPort}`;
}

function isPortFree(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

function requestJson(urlString, options, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
            return;
          }
          try {
            resolve(raw ? JSON.parse(raw) : {});
          } catch (error) {
            reject(new Error(`invalid JSON response: ${error.message}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`request timeout after ${timeoutMs}ms`));
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
