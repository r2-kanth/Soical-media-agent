require("dotenv").config();

const express = require("express");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CONFIG ────────────────────────────────────
const IBM_API_KEY = process.env.IBM_API_KEY;
const PROJECT_ID  = process.env.PROJECT_ID  || "bcc8f6b2-fb77-44f1-a802-385b2c772b73";
const MODEL_ID    = process.env.MODEL_ID    || "ibm/granite-4-h-small";
const WATSONX_URL = process.env.WATSONX_URL || "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29";

if (!IBM_API_KEY) {
  console.error("FATAL: IBM_API_KEY environment variable is not set.");
  process.exit(1);
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── IBM IAM TOKEN CACHE ───────────────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getIBMToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const resp = await fetch("https://iam.cloud.ibm.com/identity/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept":       "application/json"
    },
    body: new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey:     IBM_API_KEY
    })
  });

  const json = await resp.json();

  if (!json.access_token) {
    throw new Error("IBM IAM token error: " + JSON.stringify(json));
  }

  cachedToken = json.access_token;
  tokenExpiry = now + 55 * 60 * 1000;
  return cachedToken;
}

// ── PROXY: /api/chat ──────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const token = await getIBMToken();

    const payload = {
      model_id:   MODEL_ID,
      project_id: PROJECT_ID,
      messages:   req.body.messages || [],
      parameters: req.body.parameters || {
        max_new_tokens:     1200,
        temperature:        0.8,
        top_p:              0.95,
        repetition_penalty: 1.1
      }
    };

    const apiResp = await fetch(WATSONX_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await apiResp.json();
    res.status(apiResp.status).json(data);

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DEBUG: /api/debug — shows exactly what is configured ─────────────────────
app.get("/api/debug", async (_req, res) => {
  const keySnippet = IBM_API_KEY
    ? IBM_API_KEY.slice(0, 4) + "..." + IBM_API_KEY.slice(-4)
    : "NOT SET";

  let tokenStatus = "not tested";
  try {
    await getIBMToken();
    tokenStatus = "✅ IBM IAM token fetched successfully";
  } catch (e) {
    tokenStatus = "❌ " + e.message;
  }

  res.json({
    IBM_API_KEY:  keySnippet,
    PROJECT_ID,
    MODEL_ID,
    WATSONX_URL,
    token_status: tokenStatus
  });
});

// ── HEALTH CHECK ─────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: MODEL_ID, project: PROJECT_ID });
});

// ── START SERVER ──────────────────────────────
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n  ┌─────────────────────────────────────────┐`);
    console.log(`  │       SM Buddy — IBM Granite 4          │`);
    console.log(`  ├─────────────────────────────────────────┤`);
    console.log(`  │  🌐  Local:   http://localhost:${port}      │`);
    console.log(`  │  🤖  Model:   ${MODEL_ID}   │`);
    console.log(`  │  🌍  Region:  ${WATSONX_URL.split(".ml.cloud")[0].replace("https://","")}                  │`);
    console.log(`  └─────────────────────────────────────────┘\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`  ⚠️  Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error("Server error:", err);
    }
  });
}

startServer(PORT);
