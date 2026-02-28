const { useState, useRef, useEffect } = React;


// API key is entered in the dashboard UI — no code editing needed

// ── GOOGLE SHEETS CONFIG ─────────────────────────────────────
const SHEETS_API_KEY = "AIzaSyB-C8Jno075nzXC0JFIfjml4aYkUEsEhY0";
const SHEET_ID = "1OdxwvSYtq2STt_MmZRmJHd98uK7n5_6Fpz_Hl2u1Wm4";
const SIGNALS_RANGE = "Signals!A2:I500";
const BRIEFS_RANGE = "Briefs!A2:E200";
const NOTES_RANGE = "Notes!A2:D500";
const WEBHOOK = "https://script.google.com/macros/s/AKfycbza6fjVrulBqGhn8vpHroK_Z9zbjFGwTwKiEYksMevy3KUlAT4WJV4UjOLVy4h8l3Q/exec";
// ─────────────────────────────────────────────────────────────

const SIGNALS = [
  { id: 1, title: "CRACKED VARSITY LETTERING RESURFACES ACROSS NYC STREET STYLE", source: "HYPEBEAST", category: "GRAPHIC MOTIF", commercial: "HIGH", date: "TODAY", reviewed: false, note: "" },
  { id: 2, title: "HEAVY PIGMENT DYE DOMINATES SS26 MENSWEAR — BLACK AND SLATE LEAD", source: "BOF", category: "COLOUR", commercial: "HIGH", date: "TODAY", reviewed: false, note: "" },
  { id: 3, title: "OVERSIZED ATHLETIC TEES WITH DECONSTRUCTED SPORT GRAPHICS", source: "REDDIT", category: "SILHOUETTE", commercial: "MED-HIGH", date: "TODAY", reviewed: true, note: "CHECK AGAINST LSKD CURRENT RANGE" },
  { id: 4, title: "BRUTALIST TYPOGRAPHY IN PERFORMANCE WEAR — NEXT BIG MOVE", source: "GQ", category: "TYPOGRAPHY", commercial: "HIGH", date: "YESTERDAY", reviewed: false, note: "" },
  { id: 5, title: "ARCHIVE NIKE ACG 94–98 LANGUAGE RE-ENTERING MAINSTREAM", source: "HIGHSNOBIETY", category: "GRAPHIC MOTIF", commercial: "HIGH", date: "YESTERDAY", reviewed: false, note: "" },
  { id: 6, title: "DIAGONAL SPEED STRIPE LANGUAGE HITTING ACTIVEWEAR COLLABS", source: "COMPLEX", category: "TEXTURE", commercial: "MEDIUM", date: "2D AGO", reviewed: false, note: "" },
];

const INITIAL_BRIEFS = [
  { id: 1, title: "ATHLETIC PERFORMANCE GRAPHIC TEE", range: "RANGE 01", date: "TODAY", tags: ["ATHLETIC", "FULL-FRONT", "BLACK"], signals: [], content: "CONCEPT: Bold athletic energy meets archive sport language. Full-front cracked screen print, varsity lettering deconstructed.\nGARMENT: Oversized tee, dropped shoulder, 240-260 GSM pre-wash\nGSM: 240-260 pre-wash for vintage energy\nPRINT METHOD: Cracked screen print, off-registration finish\nCOLOUR STORY: Pigment black (PMS Black 6 C), Off-white (PMS 9183 C), Sport red (PMS 186 C)\nMOTIFS TO PURSUE: Varsity numerics, speed lines, brutalist condensed type\nMOTIFS TO AVOID: Gothic/metal repetition, oversaturated graphics\nCOMPETITIVE CHECK: Represent, LSKD, Gymshark\nWEAVY PROMPT: Oversized menswear graphic tee, pigment-dyed black 240GSM cotton, heavy wash variance. Full front print: bold deconstructed athletic performance motif, dynamic speed lines. Cracked screen print finish, off-white and sport red on black. Flat lay raw concrete. --ar 4:5 --style raw" },
  { id: 2, title: "DARK SPORT ACTIVEWEAR COLLECTION", range: "RANGE 02", date: "3D AGO", tags: ["ACTIVEWEAR", "PIGMENT", "PERFORMANCE"], signals: [], content: "CONCEPT: Performance silhouettes in pigment-dyed black with subtle texture contrast.\nGARMENT: Set — shorts + long sleeve, athletic cut\nGSM: 200-220 4-way stretch\nPRINT METHOD: Tonal discharge print, minimal branding\nCOLOUR STORY: Obsidian (PMS Black 6 C), Slate (PMS 432 C), Bone (PMS 9183 C)\nMOTIFS TO PURSUE: Diagonal technical seaming, tonal texture\nMOTIFS TO AVOID: Loud colourblocking\nCOMPETITIVE CHECK: Gymshark, LSKD, Muscle Republic\nWEAVY PROMPT: Dark sport menswear activewear set, pigment black, technical performance fabric, minimal tonal branding, athletic male model, industrial location. --ar 4:5 --style raw" },
];

const PROMPTS = [
  { id: 1, tool: "WEAVY", label: "ATHLETIC TEE — FULL FRONT", text: "Oversized menswear graphic tee, pigment-dyed black 240GSM cotton, heavy wash variance. Full front print: bold deconstructed athletic performance motif, dynamic speed lines, condensed distressed type. Cracked screen print finish, off-white and sport red on black. Flat lay on raw concrete. --ar 4:5 --style raw" },
  { id: 2, tool: "MJ", label: "CAMPAIGN — DARK SPORT", text: "Editorial menswear campaign, dark sport aesthetic, male athlete in pigment-dyed black activewear set, industrial warehouse location, harsh overhead lighting, motion blur, shot on 35mm --ar 3:4 --style raw --v 7" },
  { id: 3, tool: "CLAUDE", label: "WEEKLY BRIEF GENERATOR", text: "You are a menswear design intelligence analyst. Based on the trend signals below, generate a structured design brief for menswear activewear and graphic tees. Include: 3 hero directions, colour palette with Pantone refs, motifs to pursue, motifs to avoid, Weavy image prompt." },
];

// Notes loaded from Sheets

const toolBg = { "WEAVY": "#f5f5f5", "MJ": "#f0f0f8", "CLAUDE": "#fef3ec" };
const commercialDot = { "HIGH": "#111", "MED-HIGH": "#555", "MEDIUM": "#999", "LOW": "#ccc" };



function Dashboard() {
  const [signals, setSignals] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [activePanel, setActivePanel] = useState("briefs");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSignal, setExpandedSignal] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  const [briefQueue, setBriefQueue] = useState([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [briefName, setBriefName] = useState("");
  const [briefRange, setBriefRange] = useState("");
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState(null);
  const [viewingBrief, setViewingBrief] = useState(null);

  const [claudeOpen, setClaudeOpen] = useState(false);
  const [claudeInput, setClaudeInput] = useState("");
  const [claudeMessages, setClaudeMessages] = useState([]);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const messagesEndRef = useRef(null);

  const keyMissing = !apiKey;
  const apiHeaders = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [claudeMessages, claudeLoading]);

  const fetchFromSheets = async () => {
    setSheetsLoading(true);
    setSheetsError(null);
    try {
      const base = "https://sheets.googleapis.com/v4/spreadsheets";
      const sigUrl = `${base}/${SHEET_ID}/values/${encodeURIComponent(SIGNALS_RANGE)}?key=${SHEETS_API_KEY}`;
      const res = await fetch(sigUrl);
      const data = await res.json();
      if (data.error) throw new Error(`${data.error.code}: ${data.error.message}`);
      const rows = data.values || [];
      // Columns: Date, Source, Category, Title, Summary, URL, Commercial, Published, Week
      const mapped = rows.map((row, i) => ({
        id: i + 1,
        date: row[0] ? row[0].split(" ")[0] : "RECENT",
        source: (row[1] || "").toUpperCase(),
        category: (row[2] || "GENERAL").toUpperCase(),
        title: (row[3] || "").toUpperCase(),
        summary: row[4] || "",
        url: row[5] || "",
        commercial: (row[6] || "MEDIUM").toUpperCase(),
        published: (row[7] || "").toUpperCase(),
        reviewed: false,
        note: "",
      }));
      // Deduplicate by title, keep latest
      const seen = new Set();
      const deduped = mapped.reverse().filter(s => {
        if (seen.has(s.title)) return false;
        seen.add(s.title);
        return true;
      });
      setSignals(deduped);

      // Fetch briefs
      try {
        const briefs_url = `${base}/${SHEET_ID}/values/${encodeURIComponent(BRIEFS_RANGE)}?key=${SHEETS_API_KEY}`;
        const briefs_res = await fetch(briefs_url);
        const briefs_data = await briefs_res.json();
        const brief_rows = briefs_data.values || [];
        // Cols: Date, Week, Title, Range, Tags, Content
        const mapped_briefs = brief_rows
          .filter(r => r[2]) // must have title
          .map((row, i) => ({
            id: i + 1,
            date: row[0] ? row[0].split(" ")[0] : "RECENT",
            title: (row[2] || "BRIEF").toUpperCase(),
            range: (row[3] || "UNASSIGNED").toUpperCase(),
            tags: row[4] ? row[4].split(",").map(t => t.trim().toUpperCase()) : [],
            content: row[5] || "",
            signals: [],
          }))
          .reverse();
        // Dedupe by title
        const seen_briefs = new Set();
        const deduped_briefs = mapped_briefs.filter(b => {
          if (seen_briefs.has(b.title)) return false;
          seen_briefs.add(b.title);
          return true;
        });
        setBriefs(deduped_briefs);
      } catch(e) { console.warn("Briefs fetch failed", e); }

      // Fetch notes
      try {
        const notes_url = `${base}/${SHEET_ID}/values/${encodeURIComponent(NOTES_RANGE)}?key=${SHEETS_API_KEY}`;
        const notes_res = await fetch(notes_url);
        const notes_data = await notes_res.json();
        const note_rows = notes_data.values || [];
        // Cols: Date, Text, Linked
        const mapped_notes = note_rows
          .filter(r => r[1])
          .map((row, i) => ({
            id: i + 1,
            date: row[0] ? row[0].split(" ")[0] : "RECENT",
            text: row[1] || "",
            linked: row[2] || null,
          }))
          .reverse();
        setNotes(mapped_notes);
      } catch(e) { console.warn("Notes fetch failed", e); }

      setLastFetched(new Date().toLocaleTimeString());
    } catch (e) {
      setSheetsError(e.message);
    }
    setSheetsLoading(false);
  };

  // Fetch on mount
  useEffect(() => { fetchFromSheets(); }, []);

  const writeToSheets = async (tab, row) => {
    try {
      await fetch(WEBHOOK, {
        method: "POST",
        body: JSON.stringify({ tab, row }),
      });
    } catch(e) { console.warn("Write failed", e); }
  };

  const addToQueue = (signal) => {
    if (briefQueue.find(s => s.id === signal.id)) return;
    setBriefQueue(prev => [...prev, signal]);
    setQueueOpen(true);
    setActivePanel("briefs");
  };

  const removeFromQueue = (id) => setBriefQueue(prev => prev.filter(s => s.id !== id));

  const generateBrief = async () => {
    if (!briefQueue.length || generatingBrief) return;
    if (keyMissing) { setShowKeyInput(true); return; }
    setGeneratingBrief(true);
    setGeneratedBrief(null);

    const signalSummary = briefQueue.map(s =>
      `- ${s.title} (Source: ${s.source}, Category: ${s.category}, Commercial: ${s.commercial})`
    ).join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a senior menswear design intelligence analyst. Generate tight, actionable design briefs from trend signals. Always output in this exact format with these exact uppercase headings, each on a new line:

CONCEPT: [2 sentence direction]
GARMENT: [type and silhouette]
GSM: [weight recommendation and reason]
PRINT METHOD: [screen print / DTG / embroidery etc and finish]
COLOUR STORY: [3 colours with Pantone codes]
MOTIFS TO PURSUE: [3 specific directions]
MOTIFS TO AVOID: [2-3 things to steer clear of]
COMPETITIVE CHECK: [1-2 brands to audit before proceeding]
WEAVY PROMPT: [ready-to-paste image generation prompt, detailed, ends with --ar 4:5 --style raw]

Be specific, commercial, and direct. No filler.`,
          messages: [{ role: "user", content: `Generate a menswear design brief from these trend signals:\n\n${signalSummary}\n\nBrief name: ${briefName || "UNTITLED BRIEF"}\nRange: ${briefRange || "UNASSIGNED"}` }],
        })
      });
      const data = await res.json();
      const content = data.content?.[0]?.text || "Error generating brief.";
      setGeneratedBrief(content);
      const newBrief = {
        id: Date.now(),
        title: briefName.toUpperCase() || "GENERATED BRIEF",
        range: briefRange.toUpperCase() || "UNASSIGNED",
        date: "TODAY",
        tags: briefQueue.map(s => s.category).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
        signals: briefQueue.map(s => s.id),
        content,
      };
      setBriefs(prev => [newBrief, ...prev]);
      // Save to Sheets
      const today = new Date().toISOString().split("T")[0];
      writeToSheets("Briefs", [
        today,
        new Date().toLocaleDateString("en-AU", {day:"2-digit", month:"short", year:"numeric"}),
        newBrief.title,
        newBrief.range,
        newBrief.tags.join(", "),
        content,
      ]);
    } catch (e) {
      setGeneratedBrief("ERROR — CHECK API KEY AND CONNECTION.");
    }
    setGeneratingBrief(false);
  };

  const askClaude = async () => {
    if (!claudeInput.trim() || claudeLoading) return;
    if (keyMissing) { setShowKeyInput(true); return; }
    const userMsg = claudeInput.trim();
    setClaudeInput("");
    setClaudeMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setClaudeLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are a menswear design intelligence assistant for a Senior Menswear Designer. Help with trend analysis, design briefs, fabric specs, print directions, competitor analysis, commercial viability, and activewear development. Be direct, specific, and actionable. Keep responses tight.",
          messages: [
            ...claudeMessages.map(m => ({ role: m.role, content: m.text })),
            { role: "user", content: userMsg }
          ],
        })
      });
      const data = await res.json();
      setClaudeMessages(prev => [...prev, { role: "assistant", text: data.content?.[0]?.text || "No response." }]);
    } catch {
      setClaudeMessages(prev => [...prev, { role: "assistant", text: "ERROR — CHECK API KEY AND CONNECTION." }]);
    }
    setClaudeLoading(false);
  };

  const filters = ["ALL", "GRAPHIC MOTIF", "COLOUR", "SILHOUETTE", "TYPOGRAPHY", "TEXTURE"];
  const filtered = signals.filter(s => {
    const matchFilter = activeFilter === "ALL" || s.category === activeFilter;
    const matchSearch = search === "" || s.title.toLowerCase().includes(search.toLowerCase()) || s.source.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  const newToday = signals.filter(s => s.date === "TODAY" && !s.reviewed).length;
  const markReviewed = (id) => setSignals(prev => prev.map(s => s.id === id ? { ...s, reviewed: true } : s));
  const copyPrompt = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", background: "#fff", minHeight: "100vh", color: "#111", display: "flex", flexDirection: "column", position: "relative" }}>

      {/* ── API KEY BANNER ── */}
      {(keyMissing || showKeyInput) && (
        <div style={{ background: "#111", color: "#fff", padding: "12px 40px", fontSize: 11, letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 16 }}>
          <span>🔑</span>
          <span style={{ color: "#aaa" }}>ANTHROPIC API KEY</span>
          <input
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && keyInput.trim()) { setApiKey(keyInput.trim()); setShowKeyInput(false); }}}
            placeholder="PASTE KEY HERE THEN HIT ENTER..."
            type="password"
            style={{ flex: 1, maxWidth: 420, background: "#222", border: "1px solid #444", color: "#fff", padding: "6px 12px", fontSize: 11, letterSpacing: 1, outline: "none", fontFamily: "inherit" }}
          />
          <button
            onClick={() => { if (keyInput.trim()) { setApiKey(keyInput.trim()); setShowKeyInput(false); }}}
            style={{ background: "#fff", color: "#111", border: "none", padding: "6px 16px", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            SAVE
          </button>
          {!keyMissing && <button onClick={() => setShowKeyInput(false)} style={{ background: "none", border: "none", color: "#666", fontSize: 16, cursor: "pointer" }}>×</button>}
        </div>
      )}

      {/* ── NAV ── */}
      <div style={{ borderBottom: "1px solid #e8e8e8", padding: "0 40px", display: "flex", alignItems: "center", height: 52, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>COURTNEY / STUDIO</div>
        <div style={{ display: "flex", gap: 32, marginLeft: 48 }}>
          {["INTELLIGENCE", "BRIEFS", "PROMPTS", "BRAND"].map((item, i) => (
            <span key={i} style={{ fontSize: 11, letterSpacing: 1.5, color: i === 0 ? "#111" : "#999", cursor: "pointer", fontWeight: i === 0 ? 600 : 400 }}>{item}</span>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH"
              style={{ background: "none", border: "none", borderBottom: "1px solid #ccc", padding: "4px 24px 4px 0", fontSize: 11, letterSpacing: 1.5, outline: "none", width: 160, fontFamily: "inherit", color: "#111" }} />
            <span style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#999" }}>⌕</span>
          </div>
          <div style={{ fontSize: 11, color: "#999", letterSpacing: 1 }}>{newToday} NEW</div>
        </div>
      </div>

      {/* ── ACTION BAR ── */}
      <div style={{ borderBottom: "1px solid #e8e8e8", padding: "0 40px", display: "flex", alignItems: "center", height: 44, flexShrink: 0 }}>
        {["RUN SCRAPER", "OPEN WEAVY", "OPEN MIDJOURNEY"].map((label, i) => (
          <button key={i} style={{ height: 44, padding: "0 24px", background: "none", color: "#555", border: "none", borderRight: "1px solid #e8e8e8", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => e.target.style.color = "#111"}
            onMouseLeave={e => e.target.style.color = "#555"}
          >{label}</button>
        ))}

        <button onClick={() => { setQueueOpen(true); setActivePanel("briefs"); }} style={{
          height: 44, padding: "0 24px",
          background: briefQueue.length > 0 ? "#111" : "#f5f5f5",
          color: briefQueue.length > 0 ? "#fff" : "#999",
          border: "none", borderRight: "1px solid #e8e8e8",
          fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          GENERATE BRIEF
          {briefQueue.length > 0 && (
            <span style={{ background: "#fff", color: "#111", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{briefQueue.length}</span>
          )}
        </button>

        <button onClick={() => setClaudeOpen(o => !o)} style={{
          height: 44, padding: "0 24px", marginLeft: 8,
          background: claudeOpen ? "#111" : keyMissing ? "#fafafa" : "#f5f5f5",
          color: claudeOpen ? "#fff" : keyMissing ? "#ccc" : "#111",
          border: "none", fontSize: 11, letterSpacing: 2, cursor: "pointer", fontFamily: "inherit",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>✦</span> ASK CLAUDE {keyMissing && <span style={{ fontSize: 9, color: "#ccc" }}>(KEY NEEDED)</span>}
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 24, fontSize: 10, color: "#bbb", letterSpacing: 1 }}>
          <span>FETCHED <span style={{ color: "#111" }}>{lastFetched || "—"}</span></span>
          <span>SIGNALS <span style={{ color: "#111" }}>{signals.length}</span></span>
          <span>BRIEFS <span style={{ color: "#111" }}>{briefs.length}</span></span>
          <span>API <span style={{ color: keyMissing ? "#f87171" : "#4ade80" }}>{keyMissing ? "NOT SET" : "LIVE"}</span></span>
        </div>
      </div>

      {/* ── TODAY'S SUMMARY ── */}
      <div style={{ padding: "20px 40px", borderBottom: "1px solid #e8e8e8", display: "flex", gap: 40, alignItems: "flex-start", flexShrink: 0, background: "#fafafa" }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "#999", paddingTop: 2, whiteSpace: "nowrap" }}>SAT 28 FEB 2026</div>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#999", marginBottom: 6 }}>TODAY'S SUMMARY</div>
          <div style={{ fontSize: 13, color: "#111", lineHeight: 1.8, maxWidth: 700 }}>
            <strong>6 NEW SIGNALS OVERNIGHT.</strong> CRACKED VARSITY AND BRUTALIST ATHLETIC TYPOGRAPHY APPEARING ACROSS 4 INDEPENDENT SOURCES — STRONG CONVERGENCE. PIGMENT BLACK CONTINUES TO DOMINATE.{" "}
            <span style={{ borderBottom: "1px solid #111" }}>ONE FLAG: DIAGONAL SPEED STRIPES IN GYMSHARK PREVIEW — REVIEW BEFORE COMMITTING.</span>
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT FEED */}
        <div style={{ flex: "0 0 63%", borderRight: "1px solid #e8e8e8", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "0 40px", display: "flex", borderBottom: "1px solid #e8e8e8", flexShrink: 0 }}>
            {filters.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)} style={{
                padding: "12px 14px", fontSize: 10, letterSpacing: 1.5, background: "none", border: "none",
                borderBottom: activeFilter === f ? "2px solid #111" : "2px solid transparent",
                color: activeFilter === f ? "#111" : "#aaa", cursor: "pointer", fontFamily: "inherit",
                fontWeight: activeFilter === f ? 600 : 400, marginBottom: -1,
              }}>{f}</button>
            ))}
            <span style={{ marginLeft: "auto", alignSelf: "center", fontSize: 10, color: "#ccc", letterSpacing: 1 }}>{filtered.length} RESULTS</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#e8e8e8" }}>
              {filtered.map(signal => {
                const inQueue = !!briefQueue.find(s => s.id === signal.id);
                return (
                  <div key={signal.id}
                    onClick={() => setExpandedSignal(expandedSignal === signal.id ? null : signal.id)}
                    style={{ background: signal.reviewed ? "#fafafa" : "#fff", cursor: "pointer", position: "relative", outline: inQueue ? "2px solid #111" : "none", outlineOffset: -2 }}
                    onMouseEnter={e => { if (!signal.reviewed) e.currentTarget.style.background = "#f9f9f9"; }}
                    onMouseLeave={e => e.currentTarget.style.background = signal.reviewed ? "#fafafa" : "#fff"}
                  >
                    {inQueue && (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, background: "#111", padding: "4px 10px", fontSize: 9, letterSpacing: 2, color: "#fff", display: "flex", justifyContent: "space-between" }}>
                        <span>IN BRIEF QUEUE</span>
                        <span onClick={e => { e.stopPropagation(); removeFromQueue(signal.id); }} style={{ cursor: "pointer", opacity: 0.7 }}>✕</span>
                      </div>
                    )}
                    <div style={{ width: "100%", paddingBottom: "45%", position: "relative", background: "#f5f5f5", overflow: "hidden", opacity: signal.reviewed ? 0.45 : 1, marginTop: inQueue ? 24 : 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 10, letterSpacing: 2, color: "#bbb" }}>{signal.category}</span>
                      </div>
                      {!signal.reviewed && !inQueue && <div style={{ position: "absolute", top: 12, right: 12, width: 7, height: 7, borderRadius: "50%", background: "#111" }} />}
                    </div>
                    <div style={{ padding: "14px 16px 16px" }}>
                      <div style={{ fontSize: 11, letterSpacing: 0.5, lineHeight: 1.5, color: signal.reviewed ? "#aaa" : "#111", marginBottom: 10 }}>{signal.title}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <span style={{ fontSize: 9, color: "#999", letterSpacing: 1 }}>{signal.source}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#999" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: commercialDot[signal.commercial], display: "inline-block" }} />
                            {signal.commercial}
                          </span>
                        </div>
                        <span style={{ fontSize: 9, color: "#ccc", letterSpacing: 1 }}>{signal.date}</span>
                      </div>
                      {signal.note && <div style={{ marginTop: 8, fontSize: 10, color: "#888", borderTop: "1px solid #f0f0f0", paddingTop: 8, fontStyle: "italic" }}>{signal.note}</div>}
                      {expandedSignal === signal.id && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
                          <textarea placeholder="ADD NOTE..." onClick={e => e.stopPropagation()}
                            style={{ width: "100%", border: "none", borderBottom: "1px solid #e8e8e8", padding: "6px 0", fontSize: 10, letterSpacing: 1, resize: "none", height: 44, fontFamily: "inherit", outline: "none", color: "#111", background: "none", boxSizing: "border-box" }} />
                          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                            <button onClick={e => { e.stopPropagation(); markReviewed(signal.id); }}
                              style={{ fontSize: 10, letterSpacing: 1.5, background: "none", border: "none", borderBottom: "1px solid #ccc", color: "#999", cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}>MARK REVIEWED</button>
                            <button onClick={e => { e.stopPropagation(); addToQueue(signal); }}
                              style={{ fontSize: 10, letterSpacing: 1.5, background: inQueue ? "#f0f0f0" : "#111", border: "none", color: inQueue ? "#aaa" : "#fff", cursor: "pointer", fontFamily: "inherit", padding: "5px 14px" }}>
                              {inQueue ? "IN QUEUE" : "+ ADD TO BRIEF"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: "0 0 37%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #e8e8e8", padding: "0 32px", flexShrink: 0 }}>
            {[{ id: "briefs", label: "BRIEFS" }, { id: "prompts", label: "PROMPTS" }, { id: "notes", label: "NOTES" }, { id: "brand", label: "BRAND" }].map(tab => (
              <button key={tab.id} onClick={() => setActivePanel(tab.id)} style={{
                padding: "12px 14px", fontSize: 10, letterSpacing: 1.5, background: "none", border: "none",
                borderBottom: activePanel === tab.id ? "2px solid #111" : "2px solid transparent",
                color: activePanel === tab.id ? "#111" : "#aaa", cursor: "pointer", fontFamily: "inherit",
                fontWeight: activePanel === tab.id ? 600 : 400, marginBottom: -1,
              }}>{tab.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>

            {activePanel === "briefs" && (
              <div>
                {/* BRIEF QUEUE */}
                <div style={{ marginBottom: 24, border: "1px solid #e8e8e8" }}>
                  <div onClick={() => setQueueOpen(o => !o)} style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: briefQueue.length > 0 ? "#111" : "#fafafa" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 10, letterSpacing: 2, fontWeight: 600, color: briefQueue.length > 0 ? "#fff" : "#111" }}>BRIEF QUEUE</span>
                      {briefQueue.length > 0 && <span style={{ background: "#fff", color: "#111", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{briefQueue.length}</span>}
                    </div>
                    <span style={{ fontSize: 16, color: briefQueue.length > 0 ? "#fff" : "#aaa" }}>{queueOpen ? "−" : "+"}</span>
                  </div>

                  {queueOpen && (
                    <div style={{ padding: "16px" }}>
                      {briefQueue.length === 0 ? (
                        <div style={{ fontSize: 11, color: "#ccc", letterSpacing: 1, textAlign: "center", padding: "20px 0", lineHeight: 1.8 }}>
                          EXPAND A SIGNAL CARD AND HIT<br />
                          <strong style={{ color: "#aaa" }}>+ ADD TO BRIEF</strong> TO START BUILDING
                        </div>
                      ) : (
                        <>
                          <div style={{ marginBottom: 14 }}>
                            {briefQueue.map(s => (
                              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                                <div style={{ width: 36, height: 36, background: "#f5f5f5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 7, letterSpacing: 1, color: "#bbb", textAlign: "center", padding: "2px" }}>{s.category.split(" ")[0]}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 10, color: "#111", lineHeight: 1.4 }}>{s.title.substring(0, 52)}...</div>
                                  <div style={{ fontSize: 9, color: "#aaa", letterSpacing: 1, marginTop: 2 }}>{s.category} · {s.source}</div>
                                </div>
                                <button onClick={() => removeFromQueue(s.id)} style={{ background: "none", border: "none", fontSize: 14, color: "#ccc", cursor: "pointer", padding: "0 4px" }}>✕</button>
                              </div>
                            ))}
                          </div>
                          <input value={briefName} onChange={e => setBriefName(e.target.value)} placeholder="BRIEF NAME..."
                            style={{ width: "100%", border: "none", borderBottom: "1px solid #e8e8e8", padding: "7px 0", fontSize: 10, letterSpacing: 1.5, outline: "none", fontFamily: "inherit", color: "#111", background: "none", marginBottom: 8, boxSizing: "border-box" }} />
                          <input value={briefRange} onChange={e => setBriefRange(e.target.value)} placeholder="RANGE TAG (E.G. RANGE 01)..."
                            style={{ width: "100%", border: "none", borderBottom: "1px solid #e8e8e8", padding: "7px 0", fontSize: 10, letterSpacing: 1.5, outline: "none", fontFamily: "inherit", color: "#111", background: "none", marginBottom: 14, boxSizing: "border-box" }} />
                          <button onClick={generateBrief} disabled={generatingBrief} style={{
                            width: "100%", padding: "11px",
                            background: generatingBrief ? "#f5f5f5" : keyMissing ? "#f5f5f5" : "#111",
                            border: keyMissing ? "1px dashed #ccc" : "none",
                            color: generatingBrief || keyMissing ? "#aaa" : "#fff",
                            cursor: generatingBrief || keyMissing ? "default" : "pointer",
                            fontFamily: "inherit", fontSize: 11, letterSpacing: 2,
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          }}>
                            {generatingBrief ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span> GENERATING...</> : keyMissing ? "API KEY NEEDED TO GENERATE" : "✦ GENERATE BRIEF"}
                          </button>
                          {generatedBrief && (
                            <div style={{ marginTop: 16, padding: "14px", background: "#fafafa", borderLeft: "2px solid #111" }}>
                              <div style={{ fontSize: 9, letterSpacing: 2, color: "#999", marginBottom: 10 }}>BRIEF GENERATED — SAVED TO ARCHIVE ↓</div>
                              <div style={{ fontSize: 11, color: "#111", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{generatedBrief}</div>
                              <button onClick={() => { setBriefQueue([]); setGeneratedBrief(null); setBriefName(""); setBriefRange(""); setQueueOpen(false); }}
                                style={{ marginTop: 12, fontSize: 10, letterSpacing: 1.5, background: "none", border: "none", borderBottom: "1px solid #ccc", color: "#999", cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}>
                                CLEAR QUEUE
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* ARCHIVE */}
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#999", marginBottom: 14 }}>BRIEF ARCHIVE</div>
                <input placeholder="SEARCH BRIEFS..." style={{ width: "100%", border: "none", borderBottom: "1px solid #e8e8e8", padding: "8px 0", fontSize: 10, letterSpacing: 1.5, outline: "none", fontFamily: "inherit", color: "#111", background: "none", marginBottom: 20, boxSizing: "border-box" }} />
                {briefs.map((brief, i) => (
                  <div key={brief.id} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: i < briefs.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 9, letterSpacing: 2, color: "#999" }}>{brief.range}</span>
                      <span style={{ fontSize: 9, color: "#ccc", letterSpacing: 1 }}>{brief.date}</span>
                    </div>
                    <div style={{ fontSize: 12, letterSpacing: 0.5, color: "#111", marginBottom: 8, fontWeight: 500, cursor: "pointer" }} onClick={() => setViewingBrief(viewingBrief === brief.id ? null : brief.id)}>
                      {brief.title}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {brief.tags.map(tag => (<span key={tag} style={{ fontSize: 9, padding: "2px 8px", letterSpacing: 1, background: "#f5f5f5", color: "#888" }}>{tag}</span>))}
                    </div>
                    {viewingBrief === brief.id && brief.content && (
                      <div style={{ background: "#fafafa", padding: "12px 14px", borderLeft: "2px solid #e8e8e8", marginBottom: 10, fontSize: 11, color: "#555", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                        {brief.content}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 16 }}>
                      <button onClick={() => setViewingBrief(viewingBrief === brief.id ? null : brief.id)}
                        style={{ fontSize: 10, letterSpacing: 1.5, background: "none", border: "none", borderBottom: "1px solid #ccc", color: "#999", cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}>
                        {viewingBrief === brief.id ? "COLLAPSE" : "VIEW"}
                      </button>
                      <button style={{ fontSize: 10, letterSpacing: 1.5, background: "none", border: "none", borderBottom: "1px solid #ccc", color: "#999", cursor: "pointer", fontFamily: "inherit", padding: "2px 0" }}>↓ DOWNLOAD</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activePanel === "prompts" && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#999", marginBottom: 20 }}>SAVED PROMPTS — CLICK TO COPY</div>
                {PROMPTS.map((prompt, i) => (
                  <div key={prompt.id} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: i < PROMPTS.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: 9, letterSpacing: 2, padding: "2px 8px", background: toolBg[prompt.tool] || "#f5f5f5", color: "#111", marginRight: 8 }}>{prompt.tool}</span>
                        <span style={{ fontSize: 11, color: "#111" }}>{prompt.label}</span>
                      </div>
                      <button onClick={() => copyPrompt(prompt.id, prompt.text)} style={{ fontSize: 10, letterSpacing: 1.5, background: copiedId === prompt.id ? "#111" : "none", border: "none", borderBottom: copiedId === prompt.id ? "none" : "1px solid #ccc", color: copiedId === prompt.id ? "#fff" : "#999", cursor: "pointer", fontFamily: "inherit", padding: copiedId === prompt.id ? "3px 10px" : "2px 0" }}>
                        {copiedId === prompt.id ? "COPIED" : "COPY"}
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: "#999", lineHeight: 1.7, background: "#fafafa", padding: "12px 14px", borderLeft: "2px solid #e8e8e8" }}>{prompt.text.substring(0, 120)}...</div>
                  </div>
                ))}
                <button style={{ width: "100%", padding: "12px", background: "none", border: "1px dashed #d0d0d0", color: "#ccc", cursor: "pointer", fontFamily: "inherit", fontSize: 10, letterSpacing: 2 }}>+ ADD PROMPT</button>
              </div>
            )}

            {activePanel === "notes" && (
              <div>
                <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="TYPE A NOTE..."
                  style={{ width: "100%", border: "none", borderBottom: "2px solid #111", padding: "8px 0", fontSize: 12, resize: "none", height: 72, fontFamily: "inherit", outline: "none", color: "#111", background: "none", lineHeight: 1.7, marginBottom: 8, boxSizing: "border-box" }} />
                <button onClick={() => {
                  if (!newNote.trim()) return;
                  const today = new Date().toISOString().split("T")[0];
                  const note = { id: Date.now(), date: today, text: newNote.trim(), linked: null };
                  setNotes(prev => [note, ...prev]);
                  writeToSheets("Notes", [today, newNote.trim(), ""]);
                  setNewNote("");
                }} style={{ marginBottom: 20, fontSize: 10, letterSpacing: 2, background: "#111", border: "none", color: "#fff", padding: "7px 16px", cursor: "pointer", fontFamily: "inherit" }}>
                  SAVE NOTE
                </button>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#ccc", marginBottom: 16 }}>RECENT NOTES</div>
                {notes.length === 0 ? <div style={{fontSize:11,color:"#ccc",letterSpacing:1}}>NO NOTES YET</div> : notes.map((note, i) => (
                  <div key={note.id} style={{ paddingBottom: 20, marginBottom: 20, borderBottom: i < notes.length - 1 ? "1px solid #f0f0f0" : "none", borderLeft: "2px solid #111", paddingLeft: 14 }}>
                    <div style={{ fontSize: 11, color: "#111", lineHeight: 1.7, marginBottom: 8 }}>{note.text}</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 9, color: "#ccc", letterSpacing: 1 }}>{note.date}</span>
                      {note.linked && <span style={{ fontSize: 9, color: "#555", letterSpacing: 1, borderBottom: "1px solid #ccc", cursor: "pointer" }}>↗ {note.linked}</span>}
                    </div>
                  </div>
                ))})
              </div>
            )}

            {activePanel === "brand" && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#999", marginBottom: 20 }}>NEW BRAND</div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#ccc", marginBottom: 10 }}>COLOUR PALETTE</div>
                <div style={{ display: "flex", gap: 1, marginBottom: 24 }}>
                  {[{ name: "OBSIDIAN", hex: "#111111" }, { name: "BONE", hex: "#F0EDE6" }, { name: "ELECTRIC", hex: "#E8FF00" }, { name: "SLATE", hex: "#6B6B7A" }].map(c => (
                    <div key={c.name} style={{ flex: 1 }}>
                      <div style={{ height: 56, background: c.hex }} />
                      <div style={{ padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 8, letterSpacing: 1.5, color: "#999" }}>{c.name}</div></div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: "#ccc", marginBottom: 10 }}>WEAVY OUTPUTS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, marginBottom: 20 }}>
                  {["01", "02", "03", "04", "05", "06"].map((n, i) => (
                    <div key={i} style={{ paddingBottom: "100%", position: "relative", background: "#f0f0f0" }}>
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 9, letterSpacing: 2, color: "#ccc" }}>ASSET {n}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CLAUDE CHAT DRAWER */}
      {claudeOpen && (
        <div style={{ position: "fixed", bottom: 0, right: 0, width: 420, height: 520, background: "#fff", border: "1px solid #e8e8e8", borderBottom: "none", borderRight: "none", display: "flex", flexDirection: "column", boxShadow: "-4px -4px 24px rgba(0,0,0,0.08)", zIndex: 1000 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: 11, letterSpacing: 2, fontWeight: 700 }}>✦ ASK CLAUDE</span>
              <span style={{ fontSize: 10, letterSpacing: 1, color: keyMissing ? "#f87171" : "#aaa", marginLeft: 12 }}>{keyMissing ? "API KEY NOT SET" : "DESIGN INTELLIGENCE"}</span>
            </div>
            <button onClick={() => setClaudeOpen(false)} style={{ background: "none", border: "none", fontSize: 18, color: "#aaa", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {claudeMessages.length === 0 && (
              <div style={{ color: "#ccc", fontSize: 11, letterSpacing: 1, lineHeight: 1.8, marginTop: 8 }}>
                <div style={{ marginBottom: 12 }}>ASK ANYTHING ABOUT YOUR RANGE —</div>
                {["IS THE DIAGONAL STRIPE DIRECTION TOO RISKY?", "WHAT GSM WORKS BEST FOR PIGMENT DYE?", "GIVE ME 3 GRAPHIC MOTIF DIRECTIONS FOR DARK SPORT"].map((q, i) => (
                  <div key={i} onClick={() => setClaudeInput(q)} style={{ padding: "8px 12px", background: "#fafafa", marginBottom: 6, cursor: "pointer", fontSize: 10, color: "#555", borderLeft: "2px solid #e8e8e8" }}
                    onMouseEnter={e => e.currentTarget.style.borderLeftColor = "#111"}
                    onMouseLeave={e => e.currentTarget.style.borderLeftColor = "#e8e8e8"}
                  >{q}</div>
                ))}
              </div>
            )}
            {claudeMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", padding: "10px 14px", background: msg.role === "user" ? "#111" : "#f5f5f5", color: msg.role === "user" ? "#fff" : "#111", fontSize: 12, lineHeight: 1.7 }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {claudeLoading && (
              <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "#f5f5f5", width: "fit-content" }}>
                {[0, 1, 2].map(i => (<div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#ccc", animation: "pulse 1.2s infinite", animationDelay: `${i * 0.2}s` }} />))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ borderTop: "1px solid #e8e8e8", display: "flex", flexShrink: 0 }}>
            <input value={claudeInput} onChange={e => setClaudeInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && askClaude()} placeholder="ASK SOMETHING..."
              style={{ flex: 1, border: "none", padding: "14px 20px", fontSize: 11, letterSpacing: 1, outline: "none", fontFamily: "inherit", color: "#111", background: "none" }} />
            <button onClick={askClaude} disabled={claudeLoading || !claudeInput.trim() || keyMissing}
              style={{ padding: "0 20px", background: claudeInput.trim() && !keyMissing ? "#111" : "#f5f5f5", border: "none", color: claudeInput.trim() && !keyMissing ? "#fff" : "#ccc", fontSize: 11, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit" }}>
              SEND
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid #e8e8e8", padding: "10px 40px", display: "flex", gap: 32, fontSize: 9, color: "#ccc", letterSpacing: 1.5, flexShrink: 0, alignItems: "center" }}>
        <span>COLAB <span style={{ color: "#111" }}>LIVE</span></span>
        <span>SHEETS <span style={{ color: "#111" }}>CONNECTED</span></span>
        <span>API <span style={{ color: keyMissing ? "#f87171" : "#4ade80" }}>{keyMissing ? "NOT SET" : "LIVE"}</span></span>
        <span>WEAVY <span style={{ color: "#aaa" }}>FREE TIER</span></span>
        <span style={{ marginLeft: "auto" }}>MISSION CONTROL — SAT 28 FEB 2026</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Dashboard />);
