import { useState, useEffect, useRef } from "react";

const LANGUAGES = [
  { code: "en", name: "English",    native: "English",    flag: "🇬🇧" },
  { code: "zh", name: "Chinese",    native: "中文",        flag: "🇨🇳" },
  { code: "es", name: "Spanish",    native: "Español",    flag: "🇪🇸" },
  { code: "hi", name: "Hindi",      native: "हिंदी",       flag: "🇮🇳" },
  { code: "ar", name: "Arabic",     native: "العربية",    flag: "🇸🇦" },
  { code: "pt", name: "Portuguese", native: "Português",  flag: "🇧🇷" },
  { code: "ru", name: "Russian",    native: "Русский",    flag: "🇷🇺" },
  { code: "fr", name: "French",     native: "Français",   flag: "🇫🇷" },
  { code: "de", name: "German",     native: "Deutsch",    flag: "🇩🇪" },
  { code: "ja", name: "Japanese",   native: "日本語",       flag: "🇯🇵" },
  { code: "ko", name: "Korean",     native: "한국어",       flag: "🇰🇷" },
  { code: "id", name: "Indonesian", native: "Bahasa",     flag: "🇮🇩" },
  { code: "ta", name: "Tamil",      native: "தமிழ்",       flag: "🇮🇳" },
  { code: "tr", name: "Turkish",    native: "Türkçe",     flag: "🇹🇷" },
  { code: "bn", name: "Bengali",    native: "বাংলা",       flag: "🇧🇩" },
];

const makeSystemPrompt = (lang, isIteration, prevCode, originalPrompt) => `You are Kode — the world's most creative AI app builder. You turn descriptions into complete, stunning, production-ready single-file HTML web apps.

MOST CRITICAL RULE — UNIQUE DESIGN EVERY TIME:
Each app must have a completely custom visual identity. Never reuse the same:
- Color palette
- Font combination
- Layout structure
- UI component style

Match design language to the domain:
- Finance/business → navy, clean tables, sharp typography
- Food/restaurant → warm earthy tones, organic shapes, Playfair Display
- Creative/portfolio → bold asymmetric layouts, oversized type, Bebas Neue
- Health/fitness → energetic greens/oranges, rounded cards, Nunito
- Tech/dev tools → dark terminal aesthetic, monospace, neon accents
- Kids/education → playful pastels, rounded everything, Fredoka One
- E-commerce → minimal white space, product-forward, DM Serif Display
- Analytics/data → dark dashboard, charts, Inter/Space Grotesk

WHAT TO BUILD:
${isIteration
  ? `Current code:\n\`\`\`html\n${prevCode}\n\`\`\`\nOriginal app: "${originalPrompt}"\nUpdate based on user feedback. Return COMPLETE updated HTML.`
  : "Build the complete app described. Return a 100% working single HTML file."}

TECHNICAL STANDARDS:
- All CSS inside <style> tags
- All JS inside <script> tags
- Google Fonts import at top of <style>
- localStorage for any persistent data
- Mobile responsive with media queries
- Smooth CSS animations and transitions
- Real functionality — no lorem ipsum, no placeholder buttons
- If charts needed: use Chart.js from CDN
- If icons needed: use Unicode or emoji — never broken icon fonts

OUTPUT FORMAT:
1. One sentence in ${lang.name} describing what you built + one surprise feature added
2. Complete HTML in a \`\`\`html code block — nothing omitted

RESPOND IN: ${lang.name}
CODE COMMENTS: English only`;

export default function KodeApp() {
  const [view, setView] = useState("home");
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [prompt, setPrompt] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("Thinking...");
  const [input, setInput] = useState("");
  const [tab, setTab] = useState("preview");
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const loadMsgs = ["Reading your idea...", "Picking the perfect design...", "Writing clean code...", "Adding the wow factor...", "Making it beautiful...", "Almost done..."];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % loadMsgs.length; setLoadMsg(loadMsgs[i]); }, 1800);
    return () => clearInterval(t);
  }, [loading]);

  const getCode = (text) => { const m = text.match(/```html([\s\S]*?)```/); return m ? m[1].trim() : null; };
  const getExplanation = (text) => text.replace(/```html[\s\S]*?```/g, "").trim();

  const callAI = async (system, userMsg) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, system, messages: [{ role: "user", content: userMsg }] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text || "";
  };

  const build = async () => {
    if (!prompt.trim() || loading) return;
    const p = prompt.trim();
    setCurrentPrompt(p);
    setPrompt("");
    setMessages([{ role: "user", content: p }]);
    setCode("");
    setView("build");
    setTab("preview");
    setLoading(true);
    try {
      const reply = await callAI(makeSystemPrompt(lang, false, "", p), p);
      const html = getCode(reply);
      const explanation = getExplanation(reply);
      setMessages([{ role: "user", content: p }, { role: "assistant", content: explanation }]);
      if (html) setCode(html);
    } catch (e) {
      setMessages([{ role: "user", content: p }, { role: "assistant", content: "Error: " + e.message }]);
    }
    setLoading(false);
  };

  const update = async () => {
    if (!input.trim() || loading) return;
    const req = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: req }]);
    setLoading(true);
    try {
      const reply = await callAI(makeSystemPrompt(lang, true, code, currentPrompt), `${req}

IMPORTANT: Update the existing app above. Return the COMPLETE updated HTML file.`);
      const html = getCode(reply);
      const explanation = getExplanation(reply);
      setMessages(m => [...m, { role: "assistant", content: explanation }]);
      if (html) setCode(html);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: "Error: " + e.message }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([code], { type: "text/html" }));
    a.download = currentPrompt.slice(0, 30).replace(/\s+/g, "-") + ".html";
    a.click();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code).catch(() => {
      const t = document.createElement("textarea"); t.value = code;
      document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t);
    });
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); update(); } };
  const onPromptKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); build(); } };

  const examples = ["SaaS landing page for AI startup", "Expense tracker with charts", "Restaurant menu with cart", "Developer portfolio", "Invoice generator", "Habit tracker with streaks", "Flashcard study app", "Kanban board"];

  return (
    <div style={{ minHeight: "100vh", background: "#07070e", color: "#f0f0f8", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Fira+Code:wght@400;500&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
        @keyframes shimmer{0%{background-position:-300% center}100%{background-position:300% center}}
        @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(167,139,250,.2)}50%{box-shadow:0 0 36px rgba(167,139,250,.4)}}
        .kb{transition:all .18s cubic-bezier(.34,1.56,.64,1)!important;cursor:pointer}
        .kb:hover:not(:disabled){transform:translateY(-1px) scale(1.02)!important}
        .kb:active:not(:disabled){transform:scale(.97)!important}
        textarea,input{outline:none!important}
        textarea::placeholder,input::placeholder{color:rgba(255,255,255,.2)!important}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(167,139,250,.25);border-radius:3px}
      `}</style>

      {/* NAV */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,.06)", background: "rgba(7,7,14,.97)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)" }}>
        <div onClick={() => { setView("home"); setMessages([]); setCode(""); }} className="kb" style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,#a78bfa,#60a5fa)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#07070e", fontFamily: "monospace" }}>&gt;_</div>
          <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: -.5 }}>kode</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {view !== "home" && (
            <button className="kb" onClick={() => { setView("home"); setMessages([]); setCode(""); }}
              style={{ padding: "6px 14px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 7, color: "rgba(255,255,255,.5)", fontSize: 12 }}>
              ← New
            </button>
          )}
          <div style={{ padding: "4px 12px", background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.2)", borderRadius: 100, fontSize: 11, color: "rgba(167,139,250,.7)", fontWeight: 600 }}>FREE BETA</div>
        </div>
      </nav>

      {/* HOME */}
      {view === "home" && (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "56px 20px 80px", animation: "fadeUp .5s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", background: "rgba(167,139,250,.07)", border: "1px solid rgba(167,139,250,.18)", borderRadius: 100, marginBottom: 22 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: "rgba(167,139,250,.75)", fontWeight: 500, letterSpacing: .3 }}>15 languages · Claude Sonnet · unique design every time</span>
            </div>
            <h1 style={{ fontSize: "clamp(38px,6vw,68px)", fontWeight: 900, letterSpacing: -2.5, lineHeight: .9, marginBottom: 16 }}>
              <span style={{ color: "#fff" }}>describe it.</span><br />
              <span style={{ background: "linear-gradient(90deg,#a78bfa,#60a5fa,#f472b6)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmer 4s linear infinite" }}>kode builds it.</span>
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.35)", lineHeight: 1.7, fontWeight: 300 }}>Type what you want in any language. Get a complete working web app — unique design, real code, download instantly.</p>
          </div>

          {/* Lang selector */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.2)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>Choose language</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {LANGUAGES.map(l => (
                <button key={l.code} className="kb" onClick={() => setLang(l)}
                  style={{ padding: "6px 13px", background: lang.code === l.code ? "rgba(167,139,250,.14)" : "rgba(255,255,255,.03)", border: `1px solid ${lang.code === l.code ? "rgba(167,139,250,.45)" : "rgba(255,255,255,.08)"}`, borderRadius: 100, fontSize: 12, color: lang.code === l.code ? "#a78bfa" : "rgba(255,255,255,.38)", display: "flex", alignItems: "center", gap: 5, transform: lang.code === l.code ? "scale(1.04)" : "scale(1)" }}>
                  <span style={{ fontSize: 13 }}>{l.flag}</span><span>{l.native}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 14, padding: "14px 14px 10px", marginBottom: 14, transition: "border-color .2s" }}
            onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(167,139,250,.4)"}
            onBlurCapture={e => e.currentTarget.style.borderColor = "rgba(255,255,255,.09)"}>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={onPromptKey}
              placeholder={`Describe your app in ${lang.name}...`} rows={3}
              style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontSize: 15, lineHeight: 1.65, resize: "none", fontWeight: 400 }}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.18)" }}>Enter ↵ to build</span>
              <button className="kb" onClick={build} disabled={!prompt.trim()}
                style={{ padding: "9px 22px", background: prompt.trim() ? "linear-gradient(135deg,#a78bfa,#60a5fa)" : "rgba(167,139,250,.07)", border: "none", borderRadius: 9, color: prompt.trim() ? "#07070e" : "rgba(167,139,250,.2)", fontSize: 13, fontWeight: 700, animation: prompt.trim() ? "glow 3s infinite" : "none" }}>
                Build →
              </button>
            </div>
          </div>

          {/* Examples */}
          <div style={{ marginBottom: 44 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.18)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>Quick start</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {examples.map((ex, i) => (
                <button key={i} className="kb" onClick={() => setPrompt(ex)}
                  style={{ padding: "6px 13px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 100, fontSize: 12, color: "rgba(255,255,255,.38)", transition: "all .15s" }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[["🎨", "Unique every time", "Custom design for every app — never the same look twice"], ["🌍", "15 languages", "Hindi, Tamil, Arabic, Chinese, Spanish and 10 more"], ["⚡", "Ship instantly", "One HTML file. Open anywhere. Deploy for free."]].map(([icon, title, desc], i) => (
              <div key={i} style={{ padding: "14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 11 }}>
                <div style={{ fontSize: 18, marginBottom: 7 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, color: "rgba(255,255,255,.75)" }}>{title}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BUILD */}
      {view === "build" && (
        <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>

          {/* Sidebar */}
          <div style={{ width: 290, borderRight: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", background: "rgba(0,0,0,.25)", flexShrink: 0 }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ animation: "msgIn .25s ease", display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 3 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,.2)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, paddingInline: 2 }}>{m.role === "user" ? "You" : "Kode"}</span>
                  <div style={{ maxWidth: "93%", padding: "9px 11px", borderRadius: m.role === "user" ? "11px 11px 3px 11px" : "11px 11px 11px 3px", background: m.role === "user" ? "rgba(167,139,250,.09)" : "rgba(255,255,255,.04)", border: `1px solid ${m.role === "user" ? "rgba(167,139,250,.2)" : "rgba(255,255,255,.07)"}`, fontSize: 12, lineHeight: 1.65, color: m.role === "user" ? "rgba(167,139,250,.85)" : "rgba(255,255,255,.65)" }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ animation: "msgIn .25s ease", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,.2)", letterSpacing: 1, textTransform: "uppercase" }}>Kode</span>
                  <div style={{ padding: "9px 12px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "11px 11px 11px 3px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 11, height: 11, border: "2px solid rgba(167,139,250,.2)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "rgba(167,139,250,.65)", animation: "pulse 1.5s infinite" }}>{loadMsg}</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Update input */}
            <div style={{ padding: "9px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)", marginBottom: 5, letterSpacing: 1, textTransform: "uppercase" }}>Request changes</div>
              <div style={{ display: "flex", gap: 5 }}>
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                  placeholder="Make the header blue..." rows={2}
                  style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 7, padding: "7px 9px", color: "#fff", fontSize: 12, resize: "none", lineHeight: 1.5 }} />
                <button className="kb" onClick={update} disabled={!input.trim() || loading}
                  style={{ padding: "0 11px", background: input.trim() && !loading ? "linear-gradient(135deg,#a78bfa,#60a5fa)" : "rgba(167,139,250,.07)", border: "none", borderRadius: 7, color: input.trim() && !loading ? "#07070e" : "rgba(167,139,250,.2)", fontSize: 15, fontWeight: 700 }}>
                  ↑
                </button>
              </div>
            </div>
          </div>

          {/* Main panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Tabs */}
            <div style={{ display: "flex", alignItems: "center", padding: "7px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", gap: 5, background: "rgba(0,0,0,.2)", flexShrink: 0 }}>
              {["preview", "code"].map(t => (
                <button key={t} className="kb" onClick={() => setTab(t)}
                  style={{ padding: "5px 13px", background: tab === t ? "rgba(167,139,250,.13)" : "transparent", border: `1px solid ${tab === t ? "rgba(167,139,250,.28)" : "transparent"}`, borderRadius: 6, color: tab === t ? "#a78bfa" : "rgba(255,255,255,.28)", fontSize: 11, fontWeight: tab === t ? 600 : 400 }}>
                  {t === "preview" ? "▶ Preview" : "</> Code"}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {code && (
                <>
                  <button className="kb" onClick={copyCode}
                    style={{ padding: "5px 11px", background: copied ? "rgba(99,255,180,.08)" : "rgba(255,255,255,.04)", border: `1px solid ${copied ? "rgba(99,255,180,.25)" : "rgba(255,255,255,.07)"}`, borderRadius: 6, color: copied ? "#63ffb4" : "rgba(255,255,255,.38)", fontSize: 11, fontFamily: "monospace" }}>
                    {copied ? "✓ copied" : "copy"}
                  </button>
                  <button className="kb" onClick={download}
                    style={{ padding: "5px 13px", background: "linear-gradient(135deg,#a78bfa,#60a5fa)", border: "none", borderRadius: 6, color: "#07070e", fontSize: 11, fontWeight: 700 }}>
                    ↓ Download
                  </button>
                </>
              )}
            </div>

            {/* Preview */}
            {tab === "preview" && (
              <div style={{ flex: 1, position: "relative" }}>
                {loading && !code && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "#07070e" }}>
                    <div style={{ position: "relative", width: 52, height: 52 }}>
                      <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(167,139,250,.12)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      <div style={{ position: "absolute", inset: 8, border: "2px solid rgba(96,165,250,.08)", borderBottomColor: "#60a5fa", borderRadius: "50%", animation: "spin 1.5s linear infinite reverse" }} />
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(167,139,250,.65)", animation: "pulse 1.5s infinite" }}>{loadMsg}</div>
                  </div>
                )}
                {code && (
                  <iframe srcDoc={code} style={{ width: "100%", height: "100%", border: "none" }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals" title="Preview" />
                )}
              </div>
            )}

            {/* Code */}
            {tab === "code" && (
              <div style={{ flex: 1, overflow: "auto", background: "#0a0a15", padding: "18px 20px" }}>
                {code ? (
                  <>
                    <div style={{ display: "flex", gap: 5, marginBottom: 14, alignItems: "center" }}>
                      {["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                      <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(255,255,255,.18)", fontFamily: "monospace" }}>{currentPrompt.slice(0,35)}.html · {(code.length/1000).toFixed(1)}KB</span>
                    </div>
                    <pre style={{ fontSize: 11, lineHeight: 1.8, color: "rgba(255,255,255,.55)", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'Fira Code',monospace" }}>
                      {code.split("\n").map((line, i) => (
                        <div key={i} style={{ display: "flex", gap: 14 }}>
                          <span style={{ color: "rgba(255,255,255,.12)", minWidth: 30, textAlign: "right", userSelect: "none", flexShrink: 0, fontSize: 10 }}>{i+1}</span>
                          <span style={{ color: /^\s*(<!--|\/\/)/.test(line) ? "#6a9955" : /^\s*<\/?[a-z]/i.test(line) ? "#4ec9b0" : /(function|const|let|var|=>)/.test(line) ? "#569cd6" : /"[^"]*"|'[^']*'/.test(line) ? "#ce9178" : "rgba(255,255,255,.55)" }}>{line}</span>
                        </div>
                      ))}
                    </pre>
                  </>
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.15)", fontSize: 13 }}>Code appears here after build...</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
