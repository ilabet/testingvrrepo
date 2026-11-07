/**
 * SecondLife Go — Railway backend.
 *
 * Responsibilities:
 *   GET  /health   liveness + live counters
 *   POST /login    XML-RPC login against the selected grid, returns a stream WebSocket URL
 *   WS   /stream   relays agent movement / chat between the app and any session worker
 *
 * Env vars: PORT (Railway sets it), PROXY_TOKEN (optional shared secret).
 */
const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.PROXY_TOKEN || "";

const GRIDS = {
  agni: "https://login.agni.lindenlab.com/cgi-bin/login.cgi",
  aditi: "https://login.aditi.lindenlab.com/cgi-bin/login.cgi",
  osgrid: "http://login.osgrid.org/",
};

const agents = new Map();

const md5 = (value) => crypto.createHash("md5").update(value, "utf8").digest("hex");
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildLoginXml({ first, last, password, start = "last" }) {
  const passwd = `$1$${md5(password)}`;
  const fields = {
    first,
    last,
    passwd,
    start,
    channel: "SecondLife Go",
    version: "1.0.0",
    platform: "web",
    mac: "000000000000",
    id0: "00000000000000000000000000000000",
    agree_to_tos: "true",
    read_critical: "true",
  };
  const members = Object.entries(fields)
    .map(
      ([name, value]) =>
        `<member><name>${esc(name)}</name><value><string>${esc(value)}</string></value></member>`
    )
    .join("");
  return `<?xml version="1.0"?><methodCall><methodName>login_to_simulator</methodName><params><param><value><struct>${members}</struct></value></param></params></methodCall>`;
}

function readValue(xml, key) {
  const pattern = new RegExp(
    `<name>${key}</name>\\s*<value>\\s*<(?:string|int|i4|boolean|double)>([^<]*)</`,
    "i"
  );
  const match = xml.match(pattern);
  return match ? match[1] : null;
}

async function gridLogin({ first, last, password, grid, loginUri }) {
  const endpoint = loginUri || GRIDS[grid] || GRIDS.agni;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/xml", "User-Agent": "SecondLifeGo/1.0" },
    body: buildLoginXml({ first, last, password }),
  });
  const xml = await response.text();
  if (!xml.includes("login_to_simulator")) return { ok: false, message: "Unexpected grid response" };

  const loggedIn = readValue(xml, "login");
  const success = loggedIn === "true" || loggedIn === "1";
  return {
    ok: success,
    message: readValue(xml, "message") || (success ? null : "Login failed"),
    session_id: readValue(xml, "session_id"),
    agent_id: readValue(xml, "agent_id"),
    first_name: readValue(xml, "first_name") || first,
    last_name: readValue(xml, "last_name") || last,
    region: readValue(xml, "region_name") || readValue(xml, "sim_name"),
    position: [
      readValue(xml, "sim_pos_x"),
      readValue(xml, "sim_pos_y"),
      readValue(xml, "sim_pos_z"),
    ].filter(Boolean).join(", "),
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function publicUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

const server = http.createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-proxy-token",
    });
    res.end(JSON.stringify(body));
  };

  if (req.method === "OPTIONS") return send(204, {});
  if (req.url === "/health") {
    return send(200, {
      ok: true,
      service: "secondlife-go-backend",
      agents: agents.size,
      uptime: Math.round(process.uptime()),
    });
  }

  if (req.url?.startsWith("/login") && req.method === "POST") {
    if (TOKEN && req.headers["x-proxy-token"] !== TOKEN) return send(401, { success: false, message: "Unauthorized" });
    try {
      const body = await readBody(req);
      const first = body.first_name || body.first;
      const last = body.last_name || body.last || "Resident";
      const password = body.password || body.passwd;
      if (!first || !password) return send(400, { success: false, message: "Missing credentials" });

      const result = await gridLogin({
        first,
        last,
        password,
        grid: body.grid,
        loginUri: body.custom_login_uri || body.login_uri,
      });
      if (!result.ok) return send(200, { success: false, message: result.message });

      const wsUrl = publicUrl(req).replace(/^http/, "ws") + "/stream";
      return send(200, {
        success: true,
        ws_url: wsUrl,
        session_id: result.session_id,
        agent_id: result.agent_id,
        first_name: result.first_name,
        last_name: result.last_name,
        region: result.region,
        position: result.position,
      });
    } catch (error) {
      return send(500, { success: false, message: error.message || "Login bridge error" });
    }
  }

  return send(404, { ok: false, message: "Not found" });
});

const wss = new WebSocketServer({
  server,
  path: "/stream",
  verifyClient: ({ req }) => !TOKEN || new URL(req.url, "http://x").searchParams.get("token") === TOKEN,
});

const broadcast = (message, except) => {
  const raw = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== except && client.readyState === 1) client.send(raw);
  });
};

wss.on("connection", (ws, req) => {
  const id = crypto.randomBytes(6).toString("hex");
  ws.send(JSON.stringify({ type: "connected", client_id: id, agents: agents.size }));

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", t: Date.now() }));
      return;
    }

    if (msg.type === "agent_update") {
      agents.set(id, { id, ...msg, updated: Date.now() });
      broadcast({ type: "region_update", agents: [...agents.values()] });
      return;
    }

    if (msg.type === "chat") {
      broadcast({ type: "chat", from: msg.from || "Resident", text: msg.text, channel: msg.channel || "local" }, ws);
    }
  });

  ws.on("close", () => {
    agents.delete(id);
    broadcast({ type: "region_update", agents: [...agents.values()] });
  });

  ws.on("error", () => agents.delete(id));
});

server.listen(PORT, () => console.log(`SecondLife Go backend listening on ${PORT}`));