# 🤖 Social Media Agent — IBM Granite 4

A conversational AI agent that generates platform-optimised social media content powered by **IBM Granite 4** (`ibm/granite-4-h-small`) running on **IBM watsonx.ai**.

---

## ✨ Features

- **Multi-platform support** — Twitter/X, LinkedIn, Instagram, Facebook, TikTok
- **Content types** — Post, Thread, Caption, Hashtags, Bio, Ad Copy, Story, Script
- **Tone control** — Engaging, Professional, Casual, Humorous, Inspirational, Educational, Promotional, Storytelling
- **Length control** — Short, Medium, Long
- **Live post preview** — See your post rendered as a real social card in real-time
- **Character meter** — Visual bar showing usage vs platform limit (green → yellow → red)
- **Copy / Regenerate / Tweak** — Action buttons on every generated post
- **Export** — Download all generated posts as a `.txt` file
- **Quick prompts** — One-click starter ideas in the sidebar and welcome screen
- **Session stats** — Tracks posts generated and total characters written
- **IBM IAM token caching** — Token fetched server-side and cached for 55 minutes

---

## 🗂️ Project Structure

```
social-media-agent/
├── index.html        # Frontend — full UI (single-page, dark theme)
├── server.js         # Backend — Express proxy for IBM watsonx.ai API
├── package.json      # Node.js dependencies
└── README.md         # This file
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- An IBM watsonx.ai account with a valid API key

### 1. Install dependencies

```powershell
npm install
```

### 2. Start the server

```powershell
node server.js
```

### 3. Open in browser

```
http://localhost:3000
```

> If port 3000 is busy, the server automatically tries 3001, 3002, etc. and prints the actual URL in the terminal.

---

## ⚙️ Configuration

All credentials are set directly in [`server.js`](server.js). Update these constants if you need to change the project or model:

```js
const IBM_API_KEY = "your-ibm-api-key";
const PROJECT_ID  = "your-watsonx-project-id";
const MODEL_ID    = "ibm/granite-4-h-small";
const WATSONX_URL = "https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29";
```

| Variable | Value |
|---|---|
| `MODEL_ID` | `ibm/granite-4-h-small` |
| `PROJECT_ID` | `bcc8f6b2-fb77-44f1-a802-385b2c772b73` |
| Region | `eu-de` (Frankfurt) |
| API Version | `2023-05-29` |

---

## 🏗️ Architecture

```
Browser (index.html)
      │
      │  POST /api/chat  (JSON — messages + parameters)
      ▼
Express Server (server.js) — localhost:3000
      │
      │  1. Fetches IBM IAM Bearer token (cached 55 min)
      │  2. Forwards request to watsonx.ai
      ▼
IBM watsonx.ai — eu-de.ml.cloud.ibm.com
      │
      │  ibm/granite-4-h-small response
      ▼
Express Server → Browser → Rendered post card
```

> The proxy server exists to solve browser **CORS restrictions** — the IBM IAM token endpoint does not allow direct browser requests, so all credentials stay server-side and never reach the client.

---

## 📱 Platform Character Limits

| Platform | Limit |
|---|---|
| Twitter / X | 280 characters |
| LinkedIn | 3,000 characters |
| Instagram | 2,200 characters |
| TikTok | 2,200 characters |
| Facebook | 63,206 characters |

---

## 🛠️ Troubleshooting

### `EADDRINUSE` — Port already in use
Kill the stuck Node process and restart:
```powershell
taskkill /F /IM node.exe
node server.js
```

### `This site can't be reached`
The server is not running. Open a terminal in the project folder and run:
```powershell
node server.js
```
Then open **http://localhost:3000** — do **not** open `index.html` directly as a file.

### `API Error 401`
Your IBM API key has expired or is invalid. Update `IBM_API_KEY` in [`server.js`](server.js) with a fresh key from your [IBM Cloud dashboard](https://cloud.ibm.com/iam/apikeys).

### `API Error 404`
Check that `MODEL_ID` and `PROJECT_ID` in [`server.js`](server.js) match your watsonx.ai project.

---

## 📦 Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18.2 | HTTP server and static file serving |

All IBM API calls use Node's built-in `https` module — no extra HTTP client needed.

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<p align="center">Made with ❤️ using IBM Granite 4 on watsonx.ai</p>
