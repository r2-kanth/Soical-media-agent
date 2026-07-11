require("dotenv").config();

const express = require("express");
const path    = require("path");
const https   = require("https");
const http    = require("http");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CONFIG ────────────────────────────────────
const IBM_API_KEY   = process.env.IBM_API_KEY;
const PROJECT_ID    = process.env.PROJECT_ID    || "bcc8f6b2-fb77-44f1-a802-385b2c772b73";
const MODEL_ID      = process.env.MODEL_ID      || "ibm/granite-4-h-small";
const WATSONX_URL   = process.env.WATSONX_URL   || "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29";
const IAM_URL       = "https://iam.cloud.ibm.com/identity/token";

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── IBM IAM TOKEN CACHE ───────────────────────
let cachedToken   = null;
let tokenExpiry   = 0;

async function getIBMToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const body = `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${IBM_API_KEY}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "iam.cloud.ibm.com",
        path:     "/identity/token",
        method:   "POST",
        headers:  {
          "Content-Type":   "application/x-www-form-urlencoded",
          "Accept":         "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (!json.access_token) {
              return reject(new Error("No access_token in IBM response: " + data));
            }
            cachedToken = json.access_token;
            tokenExpiry = now + 55 * 60 * 1000; // cache 55 minutes
            resolve(cachedToken);
          } catch (e) {
            reject(new Error("Failed to parse IBM token response: " + data));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── PROXY: /api/chat ──────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const token = await getIBMToken();

    const payload = JSON.stringify({
      model_id:   MODEL_ID,
      project_id: PROJECT_ID,
      messages:   req.body.messages || [],
      parameters: req.body.parameters || {
        max_new_tokens:      1200,
        temperature:         0.8,
        top_p:               0.95,
        repetition_penalty:  1.1
      }
    });

    // Parse watsonx URL
    const url    = new URL(WATSONX_URL);
    const isHttps = url.protocol === "https:";
    const lib    = isHttps ? https : http;

    const apiReq = lib.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method:   "POST",
        headers:  {
          "Content-Type":   "application/json",
          "Authorization":  `Bearer ${token}`,
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => (data += chunk));
        apiRes.on("end", () => {
          res.status(apiRes.statusCode).set("Content-Type", "application/json").send(data);
        });
      }
    );

    apiReq.on("error", (e) => {
      console.error("watsonx API error:", e.message);
      res.status(502).json({ error: e.message });
    });

    apiReq.write(payload);
    apiReq.end();

  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── HEALTH CHECK ─────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: MODEL_ID, project: PROJECT_ID });
});

// ── START SERVER ──────────────────────────────
function startServer(port) {
  const server = app.listen(port, () => {
    console.log("");
    console.log("  ┌─────────────────────────────────────────┐");
    console.log("  │   🤖 Social Media Agent — IBM Granite 4  │");
    console.log("  │                                          │");
    console.log(`  │   http://localhost:${port}                   │`);
    console.log("  │                                          │");
    console.log("  │   Model : ibm/granite-4-h-small          │");
    console.log("  │   Region: eu-de (watsonx.ai)             │");
    console.log("  └─────────────────────────────────────────┘");
    console.log("");
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
