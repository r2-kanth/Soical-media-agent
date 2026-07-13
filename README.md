# SM Buddy — IBM Granite 4

A conversational AI agent that generates platform-optimised social media content powered by **IBM Granite 4** (`ibm/granite-4-h-small`) running on **IBM watsonx.ai**.

---

## ✨ Features

- **Multi-platform support** — Twitter/X, LinkedIn, Instagram, Facebook, TikTok
- **Content types** — Post, Thread, Caption, Hashtags, Bio, Ad Copy, Story, Script
- **Tone control** — Engaging, Professional, Casual, Humorous, Inspirational, Educational, Promotional, Storytelling
- **Length control** — Short, Medium, Long
- **Character meter** — Visual bar showing usage vs platform limit (green → yellow → red)
- **Copy / Regenerate / Tweak** — Action buttons on every generated post
- **Quick prompts** — One-click starter ideas in the sidebar and welcome screen
- **Session stats** — Tracks posts generated and total characters written
- **IBM IAM token caching** — Token fetched server-side and cached for 55 minutes
- **Custom neon background** — Full-screen background image (`assets/bg.jpg`)
- **SM Buddy branding** — Custom round logo (`assets/logo.png`) in sidebar and welcome screen
- **Transparent glass UI** — All panels use `backdrop-filter` glass effect over the background

---

## 🗂️ Project Structure

```
sm-buddy/
├── index.html           # Frontend — full UI (single-page)
├── styles.css           # All styling — dark glass theme
├── javascript/
│   └── app.js           # All client-side JavaScript
├── assets/
│   ├── bg.jpg           # Neon background image
│   └── logo.png         # SM Buddy round logo
├── server.js            # Backend — Express proxy for IBM watsonx.ai API
├── .env                 # API credentials (not committed to git)
├── package.json         # Node.js dependencies
└── README.md            # This file
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

### 2. Set your IBM API key

Create a `.env` file in the project root:

```env
IBM_API_KEY=your-ibm-api-key-here
PROJECT_ID=bcc8f6b2-fb77-44f1-a802-385b2c772b73
MODEL_ID=ibm/granite-4-h-small
WATSONX_URL=https://eu-de.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29
```

> ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

### 3. Start the server

```powershell
node server.js
```

### 4. Open in browser

```
http://localhost:3000
```

> If port 3000 is busy, the server automatically tries 3001, 3002, etc. and prints the actual URL in the terminal.

---

## ⚙️ Configuration

Credentials are loaded from `.env` via `dotenv`. The fallback values in [`server.js`](server.js) are:

| Variable | Value |
|---|---|
| `MODEL_ID` | `ibm/granite-4-h-small` |
| `PROJECT_ID` | `bcc8f6b2-fb77-44f1-a802-385b2c772b73` |
| Region | `eu-de` (Frankfurt) |
| API Version | `2023-05-29` |

---

## 🏗️ Architecture

```
Browser (index.html + javascript/app.js)
      │
      │  POST /api/chat  (JSON — messages + parameters)
      ▼
Express Server (server.js) — localhost:3000
      │
      │  1. Loads IBM_API_KEY from .env
      │  2. Fetches IBM IAM Bearer token (cached 55 min)
      │  3. Forwards request to watsonx.ai
      ▼
IBM watsonx.ai — eu-de.ml.cloud.ibm.com
      │
      │  ibm/granite-4-h-small response
      ▼
Express Server → Browser → Rendered post card in chat
```

> The proxy server exists to solve browser **CORS restrictions** — the IBM IAM token endpoint does not allow direct browser requests, so all credentials stay server-side and never reach the client.

---

## 🖥️ UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (200px)  │   Chat (flex)   │ Panel (240px) │
│  ─────────────    │  ─────────────  │ ────────────  │
│  SM Buddy logo    │  Platform tabs  │ Tone cards    │
│  Platforms        │  Chat messages  │ Stats         │
│  Quick Prompts    │  Input area     │ Plat. limits  │
│  Model badge      │                 │               │
└─────────────────────────────────────────────────────┘
```

All three columns use **transparent glass** (`rgba(0,0,0,0.28)` + `backdrop-filter: blur`) so the neon background image shows through.

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

## 🎨 Assets

| File | Purpose |
|---|---|
| `assets/bg.jpg` | Full-screen neon social media background. Save any image here as `bg.jpg` to change it. |
| `assets/logo.png` | SM Buddy brand logo. Displayed as a `42px` circle in the sidebar and `80px` circle in the welcome screen. The image is automatically inverted to white via CSS `filter: invert(1)`. |

---

## 🛠️ Troubleshooting

### `EADDRINUSE` — Port already in use
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

### `API Error 401 / BXNIM0462E — API key disabled`
Your IBM API key has expired or been disabled.
1. Go to [cloud.ibm.com](https://cloud.ibm.com) → **Manage** → **Access (IAM)** → **API keys**
2. Create a new key and copy it immediately
3. Paste it into your `.env` file as `IBM_API_KEY=your-new-key`
4. Restart the server

### `API Error 404`
Check that `MODEL_ID` and `PROJECT_ID` in `.env` match your watsonx.ai project.

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server and static file serving |
| `dotenv` | Loads `.env` credentials into `process.env` |

All IBM API calls use Node's built-in `https` module — no extra HTTP client needed.


# Social Media Agent

## 🚀 Live Demo

https://soical-media-agent-2.onrender.com
---

## 📄 License

MIT — free to use, modify, and distribute.

---

<p align="center">Made with ❤️ using IBM Granite 4 on watsonx.ai</p>
