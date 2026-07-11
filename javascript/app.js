// ── CONFIG ────────────────────────────────────
// All IBM calls go through the local proxy server (server.js) to avoid CORS
const PROXY_URL = "/api/chat";

const PLATFORM_LIMITS  = { tw:280, li:3000, ig:2200, fb:63206, tt:2200, all:3000 };
const PLATFORM_NAMES   = { tw:"Twitter/X", li:"LinkedIn", ig:"Instagram", fb:"Facebook", tt:"TikTok", all:"All Platforms" };
const PLATFORM_HANDLES = { tw:"@yourhandle · just now", li:"Your Name · 1st · just now", ig:"@yourhandle · 1s", fb:"Your Name · Just now", tt:"@yourhandle · 0s", all:"@yourhandle · just now" };

let currentPlatform = "all";
let postsGenerated  = 0;
let totalChars      = 0;
let generatedPosts  = [];

// ── SYSTEM PROMPT ─────────────────────────────
function buildSystemPrompt(platform, tone, type, length) {
  const name  = PLATFORM_NAMES[platform]  || "Social Media";
  const limit = PLATFORM_LIMITS[platform] || 3000;
  return `You are an expert social media content strategist and copywriter with 10+ years of experience creating viral, engaging content for top brands.

TASK: Generate high-quality ${type} content optimized for ${name}.

GUIDELINES:
- Platform: ${name} (max ${limit} characters per post)
- Tone: ${tone}
- Content type: ${type}
- Length: ${length}
- Write natural, authentic content that feels human, not AI-generated
- Use platform-specific best practices and formatting
- If writing a thread, number each tweet [1/N], [2/N] etc.
- Include relevant emojis where appropriate for the platform
- Add 3-10 relevant hashtags at the end if it's a post or caption
- For LinkedIn: use line breaks for readability, include a CTA
- For Twitter/X: be punchy, witty, and concise — under 280 chars per tweet
- For Instagram: focus on visual storytelling, lifestyle language
- For Facebook: conversational, community-focused
- For TikTok: trend-aware, energetic, youth-friendly

OUTPUT FORMAT:
- Return ONLY the post content, no explanations or meta-commentary
- Start directly with the post text`;
}

// ── CALL LOCAL PROXY → IBM GRANITE ───────────
async function callGraniteAPI(userMessage, platform, tone, type, length) {
  const systemPrompt = buildSystemPrompt(platform, tone, type, length);

  const resp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  }
      ],
      parameters: {
        max_new_tokens:     1200,
        temperature:        0.8,
        top_p:              0.95,
        repetition_penalty: 1.1
      }
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API Error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content
    || data.results?.[0]?.generated_text
    || "";
  if (!content) throw new Error("Empty response from model. Please try again.");
  return content.trim();
}

// ── UI HELPERS ────────────────────────────────
function setTab(platform) {
  currentPlatform = platform;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + platform).classList.add("active");
  updatePreviewHandle(platform);
}

function setSidebarPlatform(platform, el) {
  document.querySelectorAll(".platform-btn").forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  setTab(platform);
}

function setTone(tone, el) {
  document.querySelectorAll(".tone-card").forEach(c => c.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("tone-select").value = tone;
}

function updatePreviewHandle(platform) {}

function updatePreview(text, platform) {}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = "✅ " + msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

function scrollToBottom() {
  const c = document.getElementById("chat-messages");
  c.scrollTop = c.scrollHeight;
}

function hideWelcome() {
  const w = document.getElementById("welcome-screen");
  if (w) w.style.display = "none";
}

// ── COPY ──────────────────────────────────────
function copyPost(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add("copied");
    btn.textContent = "✅ Copied!";
    showToast("Copied to clipboard!");
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = "📋 Copy";
    }, 2000);
  });
}

// ── CHAR METER ────────────────────────────────
function buildCharMeter(text, platform) {
  const limit = PLATFORM_LIMITS[platform] || 3000;
  const count = text.length;
  const pct   = Math.min((count / limit) * 100, 100);
  const cls   = pct < 70 ? "ok" : pct < 90 ? "warn" : "danger";
  return `<div class="post-chars">
    <span>${count} / ${limit} chars</span>
    <div class="chars-bar"><div class="chars-fill ${cls}" style="width:${pct}%"></div></div>
  </div>`;
}

// ── RENDER POST CARD ──────────────────────────
function renderPostCard(text, platform) {
  const id  = "post-" + Date.now();
  const tag = PLATFORM_NAMES[platform] || platform;
  const cls = platform === "all" ? "tw" : platform;
  const meter = buildCharMeter(text, platform);
  const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<div class="post-card">
    <div class="post-card-header">
      <span class="post-platform-tag ${cls}">
        ${PLATFORM_NAMES[platform] || platform}
      </span>
    </div>
    <div class="post-text">${safeText}</div>
    ${meter}
    <div class="post-actions">
      <button class="post-action-btn" onclick="copyPost(${JSON.stringify(text)}, this)">📋 Copy</button>
      <button class="post-action-btn" onclick="regenerate(${JSON.stringify(text)})">🔄 Regenerate</button>
      <button class="post-action-btn" onclick="tweakPost(${JSON.stringify(text)})">✏️ Tweak</button>
    </div>
  </div>`;
}

// ── APPEND MESSAGE ────────────────────────────
function appendUserMsg(text) {
  hideWelcome();
  const c = document.getElementById("chat-messages");
  const time = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const div = document.createElement("div");
  div.className = "msg user";
  div.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-content">
      <div class="msg-bubble">${text.replace(/</g,"&lt;")}</div>
      <div class="msg-meta">${time}</div>
    </div>`;
  c.appendChild(div);
  scrollToBottom();
}

function appendTyping() {
  const c = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "msg agent";
  div.id = "typing-msg";
  div.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-content">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>`;
  c.appendChild(div);
  scrollToBottom();
}

function removeTyping() {
  const t = document.getElementById("typing-msg");
  if (t) t.remove();
}

function appendAgentMsg(text, platform, isError) {
  removeTyping();
  const c = document.getElementById("chat-messages");
  const time = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const div = document.createElement("div");
  div.className = "msg agent";

  let inner = "";
  if (isError) {
    inner = `<div class="msg-bubble" style="border-color:var(--red);color:var(--red)">⚠️ ${text.replace(/</g,"&lt;")}</div>`;
  } else {
    const postHtml = renderPostCard(text, platform);
    inner = `<div class="msg-bubble">Here's your ${PLATFORM_NAMES[platform] || "social media"} content:${postHtml}</div>`;
    // Update preview
    updatePreview(text, platform);
    // Stats
    postsGenerated++;
    totalChars += text.length;
    document.getElementById("stat-posts").textContent = postsGenerated;
    document.getElementById("stat-chars").textContent = totalChars > 999 ? (totalChars/1000).toFixed(1)+"k" : totalChars;
    generatedPosts.push({ text, platform, time: new Date().toISOString() });
  }

  div.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-content">
      ${inner}
      <div class="msg-meta">IBM Granite 4 · ${time}</div>
    </div>`;
  c.appendChild(div);
  scrollToBottom();
}

// ── SEND MESSAGE ──────────────────────────────
async function sendMessage() {
  const input = document.getElementById("user-input");
  const btn   = document.getElementById("send-btn");
  const msg   = input.value.trim();
  if (!msg) return;

  const tone   = document.getElementById("tone-select").value;
  const type   = document.getElementById("type-select").value;
  const length = document.getElementById("length-select").value;
  const platform = currentPlatform;

  input.value = "";
  input.style.height = "auto";
  btn.disabled = true;

  appendUserMsg(msg);
  appendTyping();

  try {
    const result = await callGraniteAPI(msg, platform, tone, type, length);
    appendAgentMsg(result, platform, false);
  } catch (err) {
    appendAgentMsg(err.message || "An error occurred. Please try again.", platform, true);
  } finally {
    btn.disabled = false;
  }
}

// ── QUICK PROMPT ─────────────────────────────
function quickPrompt(text) {
  document.getElementById("user-input").value = text;
  sendMessage();
}

// ── REGENERATE / TWEAK ────────────────────────
function regenerate(originalText) {
  quickPrompt("Regenerate this social media post with a fresh angle: " + originalText.slice(0, 120) + "...");
}

function tweakPost(originalText) {
  document.getElementById("user-input").value = "Tweak and improve this post: " + originalText;
  document.getElementById("user-input").focus();
}

// ── CLEAR CHAT ────────────────────────────────
function clearChat() {
  const c = document.getElementById("chat-messages");
  c.innerHTML = `
    <div class="welcome" id="welcome-screen">
      <div class="welcome-icon">✨</div>
      <h2>Social Media Agent</h2>
      <p>Generate platform-optimised posts, captions, threads, and hashtags instantly using IBM Granite 4 AI. Select a platform and describe your idea.</p>
      <div class="quick-actions">
        <button class="qa-btn" onclick="quickPrompt('Write a viral Twitter thread with 5 tweets about the future of AI')">
          <span class="qa-icon">🔥</span>
          <span class="qa-title">Viral Thread</span>
          <span class="qa-desc">Twitter/X thread format</span>
        </button>
        <button class="qa-btn" onclick="quickPrompt('Write a professional LinkedIn post about my experience launching a startup, include insights and a CTA')">
          <span class="qa-icon">💼</span>
          <span class="qa-title">LinkedIn Post</span>
          <span class="qa-desc">Professional tone & CTA</span>
        </button>
        <button class="qa-btn" onclick="quickPrompt('Create an Instagram caption for a minimalist lifestyle photo, include 10 relevant hashtags')">
          <span class="qa-icon">📸</span>
          <span class="qa-title">Instagram Caption</span>
          <span class="qa-desc">Caption + hashtags</span>
        </button>
        <button class="qa-btn" onclick="quickPrompt('Write a TikTok video script and caption for a cooking channel sharing a quick pasta recipe')">
          <span class="qa-icon">🎬</span>
          <span class="qa-title">TikTok Script</span>
          <span class="qa-desc">Script + caption</span>
        </button>
      </div>
    </div>`;
  updatePreview("", currentPlatform);
}

// ── EXPORT ────────────────────────────────────
function exportPosts() {
  if (generatedPosts.length === 0) {
    showToast("No posts to export yet!");
    return;
  }
  let out = "SOCIAL MEDIA AGENT — EXPORTED POSTS\n";
  out += "Generated by IBM Granite 4 on watsonx.ai\n";
  out += "=".repeat(50) + "\n\n";
  generatedPosts.forEach((p, i) => {
    out += `POST ${i+1} — ${PLATFORM_NAMES[p.platform] || p.platform}\n`;
    out += `Generated: ${p.time}\n`;
    out += "-".repeat(40) + "\n";
    out += p.text + "\n\n";
  });
  const blob = new Blob([out], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "social-media-posts.txt";
  a.click();
}

// ── INIT ──────────────────────────────────────
updatePreviewHandle("all");
