"use client";
import { useState, useRef, useEffect } from "react";

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

function getHeaders() {
  const headers = { "Content-Type": "application/json", "Prefer": "return=minimal" };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith("sb_publishable_")) {
    headers["Authorization"] = `Bearer ${SUPABASE_KEY}`;
    headers["apikey"] = SUPABASE_KEY;
  } else {
    headers["apikey"] = SUPABASE_KEY;
    headers["Authorization"] = `Bearer ${SUPABASE_KEY}`;
  }
  return headers;
}

async function dbGet(id) {
  try {
    const base = SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "");
    const res = await fetch(`${base}/rest/v1/mia_knowledge?id=eq.${id}&select=data`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0]?.data || null;
  } catch { return null; }
}

async function dbSet(id, data) {
  try {
    const base = SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "");
    await fetch(`${base}/rest/v1/mia_knowledge?id=eq.${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ data, updated_at: new Date().toISOString() })
    });
  } catch {}
}

// ─── HUB SSO: look up a staff member in gp_staff (shared with the Grandpride Hub) ──
// The staff list lives in the HUB's Supabase project, which may be different from
// MIA's own project. Set NEXT_PUBLIC_HUB_SUPABASE_URL / _KEY in Vercel to point at it.
// If not set, falls back to MIA's own Supabase project.
const HUB_SUPABASE_URL = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL || SUPABASE_URL;
const HUB_SUPABASE_KEY = process.env.NEXT_PUBLIC_HUB_SUPABASE_KEY || SUPABASE_KEY;

function getHubHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": HUB_SUPABASE_KEY,
    "Authorization": `Bearer ${HUB_SUPABASE_KEY}`,
  };
}

// Returns { username, name, role, apps } for the given username, or null if not found.
async function dbGetStaff(username) {
  try {
    const base = HUB_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "");
    const u = encodeURIComponent(username);
    const res = await fetch(
      `${base}/rest/v1/gp_staff?username=eq.${u}&select=username,name,role,apps`,
      { headers: getHubHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = rows?.[0];
    if (!row) return null;
    // apps may come back as an array or a JSON string — normalise to an array
    let apps = row.apps;
    if (!Array.isArray(apps)) { try { apps = apps ? JSON.parse(apps) : []; } catch { apps = []; } }
    return { username: row.username, name: row.name, role: row.role, apps };
  } catch { return null; }
}

// ─── ADMIN CREDENTIALS ──────────────────────────────────────────────────────
// These are checked against env vars on the server. 
// For the client side, we just store the hashed session.
const ADMIN_USERS = [
  { username: "grandlab.admin", password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "MIA@2024gl" },
  { username: "jimmy", password: process.env.NEXT_PUBLIC_JIMMY_PASSWORD || "Gldetailing2019" },
];

// ─── SERVICE CATEGORIES ─────────────────────────────────────────────────────
const SERVICE_CATS = [
  { id:"ppf",       label:"PPF",          icon:"🛡️", color:"#4a90d9" },
  { id:"wrap",      label:"Car Wrap",     icon:"🎨", color:"#9b59b6" },
  { id:"coating",   label:"Coating",      icon:"✨", color:"#c9a84c" },
  { id:"polish",    label:"Polish",       icon:"💎", color:"#e05a54" },
  { id:"detailing", label:"Detailing",    icon:"🚗", color:"#4cbc90" },
  { id:"tint",      label:"Window Tint",  icon:"🪟", color:"#e8a020" },
];

const DEFAULT_KB = {
  salestalk: {
    start:  "OPENING SCRIPTS\n\n• Hey! Thanks for reaching out to Grandlab 😊 How can I help?\n• What car are you driving and what are you looking to do?\n• Always ask: car model, new or used, current protection",
    middle: "MIDDLE SCRIPTS\n\n• Educate on benefits, share before/after results\n• Handle objections: price, timing, comparison\n• Think of it as RM50/month over 3 years\n• Send relevant photos/videos",
    end:    "CLOSING SCRIPTS\n\n• Jom book a free inspection — no obligation!\n• We have slots this Saturday, morning or afternoon?\n• Always offer 2 time choices only",
  },
  salestalkPdfText: "",
  services: { ppf:"", wrap:"", coating:"", polish:"", detailing:"", tint:"" },
  faq: "Q: Ceramic how long?\nA: Basic 1yr, Pro 3yr, Graphene 5yr.\n\nQ: PPF vs Ceramic?\nA: PPF = physical. Ceramic = chemical/shine. Best = both.\n\nQ: After tint wind down window?\nA: Wait 3-5 days.\n\nQ: Got warranty?\nA: Yes — all services.\n\nQ: Hours?\nA: Mon–Sat 9am–6pm.",
  miaInstructions: `GRANDLAB MIA — PERSONALIZED INSTRUCTIONS\n\nBrand name: Grandlab Detailing\nAssistant name: MIA\nLocation: [Add your address here]\nOperating hours: Monday–Saturday, 9am–6pm\nContact: [Add your WhatsApp number]\n\nTONE & PERSONALITY:\n• Friendly, warm, like a knowledgeable friend\n• WhatsApp casual style — not corporate\n• Use emojis naturally 😊👌\n• Never pushy, always helpful\n• Honest — recommend what customer genuinely needs\n\nLANGUAGE RULES:\n• BM: Use real slang — la, ok je, jom, boleh, kan, nanti, roger\n• English: Warm and natural, 3-4 lines max\n• Chinese: Friendly Mandarin, not formal\n\nALWAYS:\n• Ask for car model before recommending\n• Offer free inspection to close\n• End with a question to keep conversation going\n• Mention warranty when relevant\n\nNEVER:\n• Sound robotic or use corporate language\n• Give prices not in the knowledge base\n• Be pushy or aggressive`,
};

const SUGGESTIONS = [
  "Customer say too expensive",
  "Customer want to discuss with wife first",
  "Customer asking about car wrap",
  "Customer interested in ceramic coating",
  "Customer tanya ada discount tak",
  "Customer comparing with other shops",
];

const STAGE_OPTIONS = [
  { key:"opening", label:"Just Started 👋", desc:"Customer first message" },
  { key:"middle",  label:"In Discussion 💬", desc:"Already talking, building interest" },
  { key:"closing", label:"Almost Closing 🎯", desc:"Need final push to book" },
];

// ─── ICONS ──────────────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const EditIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const CopyIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

// ─── MIA AVATAR ─────────────────────────────────────────────────────────────
function MIAAvatar({ size = 80, style = {} }) {
  return (
    <img
      src="/mia-avatar.jpg"
      alt="MIA"
      width={size}
      height={size}
      style={{
        borderRadius: "50%",
        display: "block",
        flexShrink: 0,
        objectFit: "cover",
        objectPosition: "center top",
        border: "2px solid #c9a84c",
        ...style
      }}
    />
  );
}

function TypingDots() {
  return (
    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"6px 2px" }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#c9a84c",
          animation:`bop .9s ease-in-out ${i*.18}s infinite` }}/>
      ))}
      <style>{`@keyframes bop{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-6px);opacity:1}}`}</style>
    </div>
  );
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(()=>setOk(false),2000); }}
      style={{ display:"flex", alignItems:"center", gap:4, background:ok?"#c9a84c15":"transparent",
        border:`1px solid ${ok?"#c9a84c44":"#252525"}`, cursor:"pointer", color:ok?"#c9a84c":"#484848",
        fontSize:10.5, padding:"3px 9px", borderRadius:5, transition:"all .2s", fontFamily:"inherit" }}>
      <CopyIcon/>{ok?"Copied!":"Copy"}
    </button>
  );
}

const LANGS = [
  { key:"en", flag:"🇬🇧", label:"English",  color:"#4a90d9", bg:"#080e18" },
  { key:"bm", flag:"🇲🇾", label:"BM Slang", color:"#c9a84c", bg:"#0e0900" },
  { key:"zh", flag:"🇨🇳", label:"Chinese",  color:"#e05a54", bg:"#150806" },
];

function ThreeColumnReply({ data, mediaFiles }) {
  const [copied, setCopied] = useState(null);
  const copy = (k,t) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(()=>setCopied(null),2000); };
  const allText = `${data.en||""} ${data.bm||""} ${data.zh||""}`.toLowerCase();
  const matched = (mediaFiles||[]).filter(f => {
    const t = (f.tags||"").toLowerCase();
    return t.split(" ").some(tag => tag.length > 3 && allText.includes(tag));
  }).slice(0,3);

  return (
    <div style={{ width:"100%" }}>
      {data.tip && (
        <div style={{ display:"flex", gap:8, background:"#0c0c04", border:"1px solid #2a2a10",
          borderRadius:8, padding:"8px 12px", marginBottom:10, fontSize:12.5, color:"#a08840", lineHeight:1.6 }}>
          <span style={{flexShrink:0}}>💡</span><span>{data.tip}</span>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
        {LANGS.map(lang => (
          <div key={lang.key} style={{ background:lang.bg, border:`1px solid ${lang.color}22`,
            borderRadius:10, display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"7px 10px", borderBottom:`1px solid ${lang.color}18`, background:`${lang.color}0d` }}>
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{fontSize:13}}>{lang.flag}</span>
                <span style={{ fontSize:10.5, fontWeight:700, color:lang.color }}>{lang.label}</span>
              </div>
              <button onClick={()=>copy(lang.key, data[lang.key]||"")}
                style={{ display:"flex", alignItems:"center", gap:3,
                  background:copied===lang.key?lang.color+"22":"transparent",
                  border:`1px solid ${copied===lang.key?lang.color+"55":"#222"}`,
                  borderRadius:4, padding:"2px 6px", fontSize:9.5,
                  color:copied===lang.key?lang.color:"#3a3a3a", cursor:"pointer",
                  transition:"all .2s", fontFamily:"inherit" }}>
                <CopyIcon/>{copied===lang.key?"✓":"Copy"}
              </button>
            </div>
            <div style={{ padding:"10px 11px", fontSize:12.5, lineHeight:1.8,
              color:"#c8c4bc", flex:1, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              {data[lang.key]||"—"}
            </div>
          </div>
        ))}
      </div>
      {matched.length > 0 && (
        <div style={{ marginTop:10, background:"#0a0a0a", border:"1px solid #1e1e1e",
          borderRadius:10, padding:"10px 12px" }}>
          <div style={{ fontSize:11, color:"#a08840", marginBottom:8, fontWeight:600 }}>
            📎 Send these to your customer:
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {matched.map((f,i) => (
              <div key={i} style={{ background:"#111", border:"1px solid #222",
                borderRadius:8, overflow:"hidden", width:110 }}>
                {f.type?.startsWith("video")
                  ? <div style={{ width:"100%", height:70, background:"#000",
                      display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                      <video src={f.src} style={{width:"100%",height:"100%",objectFit:"cover",opacity:.7}}/>
                      <div style={{position:"absolute",width:24,height:24,borderRadius:"50%",
                        background:"#c9a84ccc",display:"flex",alignItems:"center",
                        justifyContent:"center",fontSize:10,color:"#000"}}>▶</div>
                    </div>
                  : <img src={f.src} alt={f.name} style={{width:"100%",height:70,objectFit:"cover"}}/>
                }
                <div style={{ padding:"5px 7px", fontSize:9.5, color:"#484848",
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.name}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:8, fontSize:11, color:"#484838", fontStyle:"italic" }}>
            💬 "Hi! This is what we recently did for a similar service 😊"
          </div>
        </div>
      )}
    </div>
  );
}

function ContextPrompt({ question, onSelect, onSkip }) {
  const [stage, setStage] = useState(null);
  const [ctxImg, setCtxImg] = useState(null);
  const ref = useRef();
  return (
    <div style={{ width:"100%", background:"#0f0f09", border:"1px solid #c9a84c33",
      borderRadius:12, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <MIAAvatar size={26}/>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:"#c9a84c" }}>MIA needs a bit more context 🤔</div>
          <div style={{ fontSize:11, color:"#585048" }}>Tell me where the conversation is at for a better reply</div>
        </div>
      </div>
      <div style={{ fontSize:11, color:"#585048", marginBottom:8 }}>What stage is the conversation?</div>
      <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" }}>
        {STAGE_OPTIONS.map(s => (
          <button key={s.key} onClick={()=>setStage(s.key)}
            style={{ padding:"8px 13px", borderRadius:8,
              border:`1px solid ${stage===s.key?"#c9a84c":"#222"}`,
              background:stage===s.key?"#c9a84c18":"#111",
              color:stage===s.key?"#c9a84c":"#585048",
              fontSize:11.5, cursor:"pointer", transition:"all .2s", textAlign:"left" }}>
            <div style={{ fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:10, opacity:.7 }}>{s.desc}</div>
          </button>
        ))}
      </div>
      <div style={{ fontSize:11, color:"#585048", marginBottom:8 }}>
        📱 Optional: Screenshot your WhatsApp chat so MIA can see the full conversation
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:6, background:"#111",
          border:"1px solid #252525", borderRadius:7, padding:"7px 12px",
          color:"#686058", fontSize:11.5, cursor:"pointer" }}>
          📷 Upload Chat Screenshot
          <input ref={ref} type="file" accept="image/*" style={{display:"none"}}
            onChange={e=>{
              const f=e.target.files[0]; if(!f) return;
              const r=new FileReader(); r.onload=ev=>setCtxImg(ev.target.result); r.readAsDataURL(f);
            }}/>
        </label>
        {ctxImg && (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <img src={ctxImg} alt="ctx" style={{height:38,borderRadius:6,border:"1px solid #333"}}/>
            <button onClick={()=>setCtxImg(null)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={()=>onSelect(stage||"middle", ctxImg)}
          style={{ background:"linear-gradient(135deg,#c9a84c,#8a5f1e)", border:"none",
            borderRadius:7, padding:"8px 18px", color:"#0d0d0d",
            fontSize:12.5, fontWeight:700, cursor:"pointer" }}>
          Get Reply ✨
        </button>
        <button onClick={onSkip}
          style={{ background:"transparent", border:"1px solid #222", borderRadius:7,
            padding:"8px 14px", color:"#555", fontSize:12, cursor:"pointer" }}>
          Skip, just reply
        </button>
      </div>
    </div>
  );
}

function LockedScreen({ onLogin }) {
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:20, padding:40 }}>
      <div style={{ width:70, height:70, borderRadius:"50%", background:"#0f0f0f",
        border:"1px solid #1e1e1e", display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:30 }}>🔒</div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:16, fontWeight:600, color:"#e0d8cc", marginBottom:8 }}>Admin Access Only</div>
        <div style={{ fontSize:12.5, color:"#383838", lineHeight:1.75 }}>
          This section is restricted.<br/>Only authorised admins can view and edit.
        </div>
      </div>
      <button onClick={onLogin} style={{ background:"linear-gradient(135deg,#c9a84c,#8a5f1e)",
        border:"none", borderRadius:8, padding:"10px 28px", color:"#0d0d0d",
        fontSize:13, fontWeight:700, cursor:"pointer" }}>
        Login as Admin
      </button>
    </div>
  );
}

function needsContext(q) {
  const lower = q.toLowerCase();
  const isSituation = /(customer say|customer ask|customer nak|customer want|customer reply|how to reply|how to answer|nak reply|nak jawab|customer cakap|customer tanya)/i.test(lower);
  const hasContext = /(screenshot|just started|first message|already|tadi|dah cakap|we discussed)/i.test(lower);
  return isSituation && !hasContext;
}

// ─── HUB ACCESS GATE ─────────────────────────────────────────────────────────
// Shown full-screen while checking, or when access is denied / no user supplied.
function AccessGate({ state, name }) {
  // state: "checking" | "denied" | "nouser"
  const title =
    state === "checking" ? "Checking access…" :
    state === "nouser"   ? "Open MIA from the Hub" :
                           "MIA is locked";
  const body =
    state === "checking" ? "One moment while we verify your access." :
    state === "nouser"   ? "Please open MIA from the Grandpride Hub so we can verify who you are." :
                           (name ? `Hi ${name} — your account doesn't have MIA access yet.` : "Your account doesn't have MIA access yet.");
  return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:18, padding:40,
      background:"#0d0d0d", color:"#e0d8cc", fontFamily:"system-ui, sans-serif" }}>
      <div style={{ width:74, height:74, borderRadius:"50%", background:"#0f0f0f",
        border:"1px solid #1e1e1e", display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:32 }}>
        {state === "checking" ? "⏳" : "🔒"}
      </div>
      <div style={{ textAlign:"center", maxWidth:340 }}>
        <div style={{ fontSize:17, fontWeight:700, marginBottom:10 }}>{title}</div>
        <div style={{ fontSize:13, color:"#9a8f7e", lineHeight:1.7 }}>{body}</div>
        {state === "denied" && (
          <div style={{ fontSize:13, color:"#c9a84c", lineHeight:1.7, marginTop:12, fontWeight:600 }}>
            Please ask your Head of Department to unlock MIA access.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function MIAApp() {
  // Hub SSO gate: "checking" until verified, then "ok" / "denied" / "nouser"
  const [access, setAccess] = useState("checking");
  const [hubUser, setHubUser] = useState(null); // { username, name, role, apps }

  const [adminAuth, setAdminAuth] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [view, setView] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([{id:1,title:"New Chat",msgs:[]}]);
  const [activeChatId, setActiveChatId] = useState(1);

  const [imgPreview, setImgPreview] = useState(null);
  const imgRef = useRef();
  const bottomRef = useRef();
  const taRef = useRef();

  // KB state — loads from Supabase on mount
  const [kb, setKbState] = useState(DEFAULT_KB);
  const [mediaFiles, setMediaFilesState] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(""); // "saving" | "saved" | "error"

  // Hub SSO: read ?u=<username> on load and verify against gp_staff
  useEffect(() => {
    async function checkAccess() {
      let username = null;
      try {
        const params = new URLSearchParams(window.location.search);
        username = params.get("u");
      } catch {}
      if (!username) { setAccess("nouser"); return; }
      const staff = await dbGetStaff(username);
      if (!staff) { setAccess("denied"); return; }
      const allowed = staff.role === "Admin" || (Array.isArray(staff.apps) && staff.apps.includes("mia"));
      setHubUser(staff);
      setAccess(allowed ? "ok" : "denied");
    }
    checkAccess();
  }, []);

  // Load from Supabase on mount
  useEffect(() => {
    async function loadFromDB() {
      setDbLoading(true);
      try {
        const [kbData, mediaData] = await Promise.all([dbGet("kb"), dbGet("media")]);
        if (kbData && Object.keys(kbData).length > 0) {
          setKbState(prev => ({ ...prev, ...kbData }));
        }
        if (mediaData && Array.isArray(mediaData)) {
          setMediaFilesState(mediaData);
        }
      } catch {}
      setDbLoading(false);
    }
    loadFromDB();
  }, []);

  // setKb — updates state + saves to Supabase
  const setKb = (updater) => {
    setKbState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setSaveStatus("saving");
      dbSet("kb", next).then(() => setSaveStatus("saved")).catch(() => setSaveStatus("error"));
      setTimeout(() => setSaveStatus(""), 3000);
      return next;
    });
  };

  // setMediaFiles — updates state + saves to Supabase
  const setMediaFiles = (updater) => {
    setMediaFilesState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setSaveStatus("saving");
      dbSet("media", next).then(() => setSaveStatus("saved")).catch(() => setSaveStatus("error"));
      setTimeout(() => setSaveStatus(""), 3000);
      return next;
    });
  };

  const [kbTab, setKbTab] = useState("services");
  const [editingService, setEditingService] = useState(null);
  const [serviceDraft, setServiceDraft] = useState("");
  const [stEditing, setStEditing] = useState(null);
  const [stDraft, setStDraft] = useState("");
  const [stMode, setStMode] = useState("write");

  const mediaRef = useRef();
  const pdfRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const tryLogin = () => {
    if (ADMIN_USERS.find(u => u.username === loginUser && u.password === loginPass)) {
      setAdminAuth(true); setShowLogin(false); setLoginErr("");
      setLoginUser(""); setLoginPass("");
    } else {
      setLoginErr("Wrong username or password.");
    }
  };

  const logout = () => { setAdminAuth(false); setView("chat"); };

  const handleImg = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => setImgPreview(ev.target.result);
    r.readAsDataURL(f);
  };
  const clearImg = () => { setImgPreview(null); if (imgRef.current) imgRef.current.value = ""; };
  const newChat = () => {
    const id = Date.now();
    setConversations(p => [...p, {id, title:"New Chat", msgs:[]}]);
    setActiveChatId(id); setMessages([]);
  };

  const handleMediaUpload = e => {
    Array.from(e.target.files).forEach(f => {
      const r = new FileReader();
      r.onload = ev => setMediaFiles(p => [...p, {
        id: Date.now()+Math.random(), name:f.name, type:f.type,
        src:ev.target.result, category:f.type.startsWith("video")?"video":"photo",
        tags: f.name.toLowerCase().replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")
      }]);
      r.readAsDataURL(f);
    });
  };

  const handlePdfUpload = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const text = typeof ev.target.result === "string" ? ev.target.result : "";
      setKb(p => ({...p, salestalkPdfText: `[From PDF: ${f.name}]\n\n` + text.substring(0,3000)}));
    };
    r.readAsText(f);
  };

  const buildSystemPrompt = (stage, hasImage) => {
    const svcKnowledge = Object.entries(kb.services||{})
      .filter(([,v]) => v && v.length > 20)
      .map(([k,v]) => `=== ${k.toUpperCase()} ===\n${v}`)
      .join("\n\n");

    const stTalk = kb.salestalkPdfText ||
      `START: ${kb.salestalk?.start||""}\nMIDDLE: ${kb.salestalk?.middle||""}\nCLOSE: ${kb.salestalk?.end||""}`;

    const stageContext = stage === "opening" ? "Customer just reached out — this is the OPENING reply."
      : stage === "closing" ? "Customer is interested — give a CLOSING reply to book them in."
      : "Conversation is in the MIDDLE — build value and keep them engaged.";

    return `You are MIA, Grandlab Detailing's AI Sales Assistant. You sound like a real, warm human — WhatsApp style. NOT robotic, NOT corporate.

${kb.miaInstructions ? `PERSONALIZED INSTRUCTIONS FROM GRANDLAB ADMIN:\n${kb.miaInstructions}\n` : ""}

GRANDLAB KNOWLEDGE:
${svcKnowledge || "[No service knowledge added yet — admin can add in Knowledge Base]"}

SALES TALK GUIDE:
${stTalk}

FAQ:
${kb.faq||""}

CONVERSATION STAGE: ${stageContext}
${hasImage ? "The salesperson has shared a screenshot of the customer WhatsApp chat. Analyse it carefully." : ""}

YOUR JOB: Generate 3 reply versions for the salesperson to send to the customer.

RETURN ONLY THIS JSON — no markdown, no explanation:
{"en":"...","bm":"...","zh":"...","tip":"..."}

en = English reply (warm, natural, 3-4 lines, WhatsApp style)
bm = BM slang (real WhatsApp — la, ok je, jom, boleh, kan, nanti, 3-4 lines)  
zh = Mandarin Chinese (friendly natural tone, 3-4 lines)
tip = ONE short sales tip for the salesperson in English

TONE RULES — sound like a real person:
✅ EN: "Hey! No worries, take your time 😊 I'll send you some photos so you have everything ready for your discussion. Any questions, just ping me!"
✅ BM: "Ok ok takpe, berbincang dulu 😊 Nanti saya hantar gambar before/after senang nak refer. Roger je kalau ada soalan!"
✅ ZH: "没问题，先商量一下😊 我发些照片给你参考。有问题随时找我！"
❌ NEVER: "Thank you for your inquiry. We would like to inform you..."`;
  };

  const callAPI = async (userMessages, stage, contextImg) => {
    const hasImage = !!contextImg;
    const systemPrompt = buildSystemPrompt(stage, hasImage);

    const apiMessages = userMessages.map(m => {
      if (m.imgB64) {
        return { role:m.role, content:[
          {type:"image", source:{type:"base64", media_type:"image/jpeg", data:m.imgB64}},
          {type:"text", text: m.content || "Read this customer screenshot and help me craft a reply."}
        ]};
      }
      return { role:m.role, content:m.content };
    });

    // Add context image if provided
    if (contextImg) {
      const b64 = contextImg.split(",")[1];
      const last = apiMessages[apiMessages.length - 1];
      apiMessages[apiMessages.length - 1] = {
        role: last.role,
        content: [
          {type:"image", source:{type:"base64", media_type:"image/jpeg", data:b64}},
          {type:"text", text: last.content || "This is the WhatsApp chat screenshot. Help me reply."}
        ]
      };
    }

    const res = await fetch("/api/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ messages:apiMessages, systemPrompt })
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text;
  };

  const processReply = async (question, stage, contextImg, msgHistory) => {
    setLoading(true);
    try {
      const raw = await callAPI(msgHistory, stage, contextImg);
      let parsed;
      try {
        const clean = raw.replace(/```json|```/g,"").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = { en:raw, bm:"", zh:"", tip:"" };
      }
      setMessages(p => [...p, {
        role:"assistant", type:"3col", data:parsed,
        time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
      }]);
    } catch(err) {
      setMessages(p => [...p, {
        role:"assistant", type:"error",
        content:`⚠️ ${err.message}. Please check your API key in Vercel settings.`,
        time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
      }]);
    }
    setLoading(false);
  };

  const send = (overText) => {
    const text = (overText || input).trim();
    if (!text && !imgPreview) return;

    let imgB64 = null;
    if (imgPreview) imgB64 = imgPreview.split(",")[1];

    const userMsg = {
      role:"user", content:text||"[Screenshot uploaded]",
      img:imgPreview, imgB64,
      time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
    };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput(""); clearImg();
    if (taRef.current) taRef.current.style.height = "auto";
    if (messages.length === 0) {
      setConversations(p => p.map(c => c.id===activeChatId ? {...c, title:(text||"Chat").substring(0,36)} : c));
    }

    // Check if context needed
    if (needsContext(text) && !imgPreview) {
      setTimeout(() => {
        setMessages(p => [...p, {
          role:"context_prompt", question:text, msgHistory:newMsgs,
          time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})
        }]);
      }, 300);
      return;
    }

    processReply(text, "middle", null, newMsgs);
  };

  const handleKey = e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
  const canSend = !loading && !!(input.trim() || imgPreview);

  const renderMsg = (msg, i) => {
    if (msg.role === "context_prompt") {
      return (
        <div key={i} style={{ padding:"13px 0", display:"flex", gap:10, alignItems:"flex-start" }}>
          <MIAAvatar size={33} style={{boxShadow:"0 0 12px #c9a84c22"}}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{fontSize:10,color:"#303030",marginBottom:6}}>MIA · {msg.time}</div>
            <ContextPrompt
              question={msg.question}
              onSelect={(stage, ctxImg) => processReply(msg.question, stage, ctxImg, msg.msgHistory)}
              onSkip={() => processReply(msg.question, "middle", null, msg.msgHistory)}
            />
          </div>
        </div>
      );
    }

    const isUser = msg.role === "user";
    const is3col = !isUser && msg.type === "3col";
    const isError = !isUser && msg.type === "error";

    return (
      <div key={i} style={{ display:"flex", gap:10, padding:"13px 0",
        flexDirection:isUser?"row-reverse":"row", alignItems:"flex-start" }}>
        {isUser
          ? <div style={{width:31,height:31,borderRadius:"50%",background:"#181818",
              border:"1px solid #242424",display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:13,flexShrink:0}}>👤</div>
          : <MIAAvatar size={33} style={{boxShadow:"0 0 12px #c9a84c22"}}/>
        }
        <div style={{ minWidth:0, flex:is3col?1:undefined, maxWidth:is3col?"100%":"72%" }}>
          <div style={{fontSize:10,color:"#303030",marginBottom:3,textAlign:isUser?"right":"left"}}>
            {isUser?"You":"MIA"} · {msg.time}
          </div>
          {msg.img && <img src={msg.img} alt="" style={{maxWidth:170,borderRadius:7,marginBottom:7,border:"1px solid #252525",display:"block"}}/>}
          {is3col ? (
            <ThreeColumnReply data={msg.data} mediaFiles={mediaFiles}/>
          ) : (
            <div style={{background:isUser?"#111a11":isError?"#1a0808":"#111111",
              border:`1px solid ${isUser?"#1c2c1c":isError?"#3a1c1c":"#1c1c1c"}`,
              borderRadius:isUser?"13px 3px 13px 13px":"3px 13px 13px 13px",
              padding:"9px 13px",fontSize:13,lineHeight:1.8,
              color:isError?"#e05a54":"#d0ccc4",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
              {msg.content||""}
            </div>
          )}
        </div>
      </div>
    );
  };

  const ST_COLS = [
    {key:"start",label:"🟢 Start",color:"#4cbc80",desc:"Opening"},
    {key:"middle",label:"🟡 Middle",color:"#c9a84c",desc:"Build interest"},
    {key:"end",label:"🔴 Close",color:"#e05a54",desc:"Book them in"},
  ];

  // Hub SSO gate — block the app until access is verified
  if (access !== "ok") {
    return <AccessGate state={access} name={hubUser?.name} />;
  }

  return (
    <div style={{display:"flex",height:"100vh",background:"#0d0d0d",
      fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#d0ccc4",overflow:"hidden"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:2px}
        textarea::placeholder{color:#282828}input::placeholder{color:#333}
        .hbg:hover{background:#121202!important}
        .sugg:hover{background:#121202!important;border-color:#c9a84c44!important;color:#c9a84c!important}
        .sbtn:hover:not(:disabled){transform:scale(1.06)}
        .cb:hover{opacity:.8}
      `}</style>

      {/* SIDEBAR */}
      <div style={{width:sidebarOpen?236:0,transition:"width .25s ease",overflow:"hidden",
        background:"#0b0b0b",borderRight:"1px solid #161616",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{width:236,display:"flex",flexDirection:"column",height:"100%"}}>
          <div style={{padding:"14px 13px 11px",borderBottom:"1px solid #161616"}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <MIAAvatar size={37}/>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"#e0d8cc",letterSpacing:.5}}>GRANDLAB</div>
                <div style={{fontSize:9,color:"#c9a84c",letterSpacing:1.5,textTransform:"uppercase",marginTop:1}}>MIA · Sales Assistant</div>
              </div>
            </div>
          </div>
          <button className="hbg" onClick={newChat}
            style={{margin:"9px 9px 5px",padding:"7px 11px",background:"transparent",border:"1px solid #1d1d1d",
              borderRadius:7,color:"#585048",fontSize:11.5,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
            <PlusIcon/> New Chat
          </button>
          <div style={{borderBottom:"1px solid #161616",paddingBottom:4,marginBottom:4}}>
            {[["chat","💬","Chat with MIA"],
              ...(adminAuth ? [["kb","📋","Knowledge Base"],["media","🖼️","Media Library"]] : [])
            ].map(([v,icon,label]) => (
              <div key={v} className="hbg" onClick={()=>setView(v)}
                style={{padding:"7px 12px",cursor:"pointer",fontSize:11.5,
                  color:view===v?"#c9a84c":"#444",
                  borderLeft:view===v?"2px solid #c9a84c":"2px solid transparent",
                  background:view===v?"#0f0c00":"transparent",transition:"all .15s"}}>
                {icon} {label}
              </div>
            ))}
            {!adminAuth && (
              <div style={{padding:"7px 12px",fontSize:10.5,color:"#222",display:"flex",alignItems:"center",gap:5,userSelect:"none"}}>
                🔒 Admin area locked
              </div>
            )}
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            <div style={{fontSize:8.5,color:"#222",padding:"3px 12px 4px",textTransform:"uppercase",letterSpacing:1.2}}>Chats</div>
            {conversations.slice().reverse().map(c => (
              <div key={c.id} className="hbg"
                onClick={()=>{setActiveChatId(c.id);setMessages(c.msgs||[]);setView("chat");}}
                style={{padding:"6px 12px",cursor:"pointer",fontSize:11,
                  color:c.id===activeChatId?"#c9a84c":"#3c3c3c",
                  background:c.id===activeChatId?"#0f0c00":"transparent",
                  borderRadius:5,margin:"1px 5px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",transition:"all .15s"}}>
                💬 {c.title}
              </div>
            ))}
          </div>
          <button className="hbg" onClick={()=>adminAuth?logout():setShowLogin(true)}
            style={{margin:"7px 9px 12px",padding:"6px 11px",
              background:adminAuth?"#0f0c00":"transparent",border:"1px solid #191919",borderRadius:7,
              color:adminAuth?"#c9a84c":"#343434",fontSize:11,cursor:"pointer",
              display:"flex",alignItems:"center",gap:5,transition:"all .2s"}}>
            <LockIcon/>{adminAuth?" Admin Active · Logout":" Admin Login"}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* Topbar */}
        <div style={{padding:"10px 15px",borderBottom:"1px solid #131313",display:"flex",
          alignItems:"center",gap:9,background:"#0d0d0d",flexShrink:0}}>
          <button onClick={()=>setSidebarOpen(p=>!p)}
            style={{background:"none",border:"none",cursor:"pointer",color:"#343434",fontSize:17,padding:3,lineHeight:1}}>☰</button>
          <MIAAvatar size={27}/>
          <div>
            <div style={{fontSize:12.5,fontWeight:600,color:"#e0d8cc"}}>MIA</div>
            <div style={{fontSize:9,color:"#4cbc70"}}>● Online · Grandlab</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            {saveStatus==="saving" && <span style={{fontSize:10,color:"#c9a84c"}}>⏳ Saving...</span>}
            {saveStatus==="saved" && <span style={{fontSize:10,color:"#4cbc70"}}>✓ Saved</span>}
            {saveStatus==="error" && <span style={{fontSize:10,color:"#e05a54"}}>⚠️ Save failed</span>}
            {adminAuth
              ? <span style={{fontSize:10,color:"#4cbc70",background:"#081408",padding:"2px 9px",borderRadius:9,border:"1px solid #143014"}}>✓ Admin Mode</span>
              : <span style={{fontSize:10,color:"#3a3a3a"}}>Sales Advisor</span>
            }
          </div>
        </div>

        {/* CHAT VIEW */}
        {view==="chat" && (
          <>
            <div style={{flex:1,overflowY:"auto",padding:"0 18px"}}>
              {messages.length===0 ? (
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",height:"100%",gap:18,padding:20}}>
                  <div style={{position:"relative"}}>
                    <MIAAvatar size={90} style={{boxShadow:"0 0 55px #c9a84c1e,0 0 18px #c9a84c10"}}/>
                    <div style={{position:"absolute",bottom:3,right:3,width:13,height:13,
                      borderRadius:"50%",background:"#4cbc70",border:"2px solid #0d0d0d"}}/>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:600,color:"#e0d8cc",marginBottom:5}}>
                      Hi, I'm MIA from Grandlab 👋
                    </div>
                    <div style={{fontSize:13,color:"#3c3c3c",lineHeight:1.75}}>
                      Describe the customer situation and I'll give you<br/>ready-to-send replies in English, BM & Chinese.
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",maxWidth:520}}>
                    {SERVICE_CATS.map(cat => (
                      <button key={cat.id} className="sugg"
                        onClick={()=>{setInput(`Customer asking about ${cat.label}`);taRef.current?.focus();}}
                        style={{padding:"5px 12px",background:"#0d0d0d",border:`1px solid ${cat.color}22`,
                          borderRadius:16,fontSize:11,color:cat.color,cursor:"pointer",transition:"all .2s"}}>
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",maxWidth:520}}>
                    {SUGGESTIONS.map((s,i) => (
                      <button key={i} className="sugg"
                        onClick={()=>{setInput(s);taRef.current?.focus();}}
                        style={{padding:"6px 12px",background:"#0d0d0d",border:"1px solid #181818",
                          borderRadius:18,fontSize:11.5,color:"#4a4840",cursor:"pointer",transition:"all .2s"}}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{paddingTop:5}}>
                  {messages.map((m,i)=>renderMsg(m,i))}
                  {loading && (
                    <div style={{display:"flex",gap:10,padding:"12px 0",alignItems:"flex-start"}}>
                      <MIAAvatar size={33}/>
                      <div style={{background:"#111",border:"1px solid #1c1c1c",
                        borderRadius:"3px 13px 13px 13px",padding:"7px 12px"}}><TypingDots/></div>
                    </div>
                  )}
                  <div ref={bottomRef}/>
                </div>
              )}
            </div>
            <div style={{padding:"10px 18px 14px",background:"#0d0d0d",borderTop:"1px solid #131313",flexShrink:0}}>
              {imgPreview && (
                <div style={{maxWidth:740,margin:"0 auto 6px",display:"flex",alignItems:"center",gap:7}}>
                  <img src={imgPreview} alt="" style={{height:40,borderRadius:5,border:"1px solid #222"}}/>
                  <button onClick={clearImg} style={{background:"none",border:"none",color:"#343434",cursor:"pointer",fontSize:14}}>✕</button>
                </div>
              )}
              <div style={{display:"flex",alignItems:"flex-end",gap:7,background:"#0e0e0e",
                border:"1px solid #1a1a1a",borderRadius:12,padding:"7px 10px",maxWidth:740,margin:"0 auto"}}>
                <label style={{background:"none",border:"none",cursor:"pointer",color:"#2a2a2a",
                  fontSize:16,padding:"1px 3px",flexShrink:0,lineHeight:1,transition:"color .2s"}}
                  onMouseEnter={e=>e.currentTarget.style.color="#c9a84c"}
                  onMouseLeave={e=>e.currentTarget.style.color="#2a2a2a"}>
                  📎<input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImg}/>
                </label>
                <textarea ref={taRef} rows={1}
                  style={{flex:1,background:"none",border:"none",color:"#d0ccc4",fontSize:13,
                    resize:"none",outline:"none",maxHeight:120,lineHeight:1.65,fontFamily:"inherit",padding:"1px 0"}}
                  placeholder="Describe customer situation or paste their message..."
                  value={input}
                  onChange={e=>{setInput(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
                  onKeyDown={handleKey}
                />
                <button className="sbtn" disabled={!canSend} onClick={()=>send()}
                  style={{width:32,height:32,borderRadius:"50%",border:"none",
                    cursor:canSend?"pointer":"default",
                    background:canSend?"linear-gradient(135deg,#c9a84c,#8a5f1e)":"#141414",
                    color:canSend?"#0d0d0d":"#222",display:"flex",alignItems:"center",
                    justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                  <SendIcon/>
                </button>
              </div>
              <div style={{textAlign:"center",fontSize:9,color:"#1c1c1c",marginTop:5}}>
                MIA · Grandlab Sales AI · English · BM · Chinese
              </div>
            </div>
          </>
        )}

        {/* KNOWLEDGE BASE */}
        {view==="kb" && (
          adminAuth ? (
            <div style={{flex:1,overflow:"auto",padding:"18px 16px"}}>
              {/* Tabs */}
              <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
                {[{id:"services",label:"🔧 Services",color:"#4cbc90"},
                  {id:"salestalk",label:"💬 Sales Talk",color:"#7c9fd4"},
                  {id:"faq",label:"❓ FAQ",color:"#d47ca0"},
                  {id:"instructions",label:"⚙️ MIA Instructions",color:"#e8a020"}].map(tab => (
                  <button key={tab.id} className="cb" onClick={()=>setKbTab(tab.id)}
                    style={{padding:"6px 14px",borderRadius:18,
                      border:`1px solid ${kbTab===tab.id?tab.color:"#1a1a1a"}`,
                      background:kbTab===tab.id?tab.color+"18":"transparent",
                      color:kbTab===tab.id?tab.color:"#404040",
                      fontSize:11.5,cursor:"pointer",transition:"all .2s"}}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Services KB */}
              {kbTab==="services" && (
                <div>
                  <div style={{fontSize:12,color:"#585048",marginBottom:16,lineHeight:1.7}}>
                    Add knowledge for each service. MIA automatically uses the right category when a customer asks about it.
                    You can type directly or upload a PDF for each service.
                  </div>
                  {SERVICE_CATS.map(cat => (
                    <div key={cat.id} style={{marginBottom:20,background:"#0a0a0a",
                      border:`1px solid ${cat.color}22`,borderRadius:10,overflow:"hidden"}}>
                      <div style={{padding:"10px 14px",background:`${cat.color}0d`,
                        borderBottom:`1px solid ${cat.color}18`,
                        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:18}}>{cat.icon}</span>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:cat.color}}>{cat.label}</div>
                            <div style={{fontSize:10.5,color:"#484848"}}>MIA uses this for all {cat.label}-related questions</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          {editingService===cat.id ? (
                            <>
                              <button onClick={()=>{ setKb(p=>({...p,services:{...p.services,[cat.id]:serviceDraft}})); setEditingService(null); }}
                                style={{background:cat.color,border:"none",borderRadius:6,padding:"5px 12px",color:"#0d0d0d",fontSize:11,fontWeight:700,cursor:"pointer"}}>💾 Save</button>
                              <button onClick={()=>setEditingService(null)}
                                style={{background:"transparent",border:"1px solid #252525",borderRadius:6,padding:"5px 10px",color:"#555",fontSize:11,cursor:"pointer"}}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={()=>{ setServiceDraft(kb.services?.[cat.id]||""); setEditingService(cat.id); }}
                                style={{display:"flex",alignItems:"center",gap:4,background:"transparent",border:`1px solid ${cat.color}33`,borderRadius:6,padding:"5px 11px",color:cat.color,fontSize:11,cursor:"pointer"}}>
                                <EditIcon/>Edit
                              </button>
                              <label style={{display:"flex",alignItems:"center",gap:4,background:"transparent",border:`1px solid ${cat.color}33`,borderRadius:6,padding:"5px 11px",color:cat.color,fontSize:11,cursor:"pointer"}}>
                                📄 PDF
                                <input type="file" accept="application/pdf,.txt" style={{display:"none"}}
                                  onChange={e=>{
                                    const f=e.target.files[0]; if(!f) return;
                                    const r=new FileReader();
                                    r.onload=ev=>setKb(p=>({...p,services:{...p.services,[cat.id]:`[PDF: ${f.name}]\n${ev.target.result}`.substring(0,3000)}}));
                                    r.readAsText(f);
                                  }}/>
                              </label>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{padding:"12px 14px"}}>
                        {editingService===cat.id ? (
                          <textarea value={serviceDraft} onChange={e=>setServiceDraft(e.target.value)}
                            style={{width:"100%",minHeight:160,background:"#060606",
                              border:`1px solid ${cat.color}33`,borderRadius:7,padding:10,
                              color:"#d0ccc4",fontSize:12,fontFamily:"monospace",
                              resize:"vertical",outline:"none",lineHeight:1.75}}
                            placeholder={`Enter all ${cat.label} knowledge — pricing, packages, process, FAQs...`}/>
                        ) : kb.services?.[cat.id] ? (
                          <div style={{fontSize:12,color:"#585048",lineHeight:1.8,
                            whiteSpace:"pre-wrap",fontFamily:"monospace",maxHeight:140,overflow:"auto"}}>
                            {kb.services[cat.id]}
                          </div>
                        ) : (
                          <div style={{fontSize:12,color:"#252525",fontStyle:"italic"}}>
                            No {cat.label} knowledge yet — click Edit to add or upload a PDF
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sales Talk */}
              {kbTab==="salestalk" && (
                <div>
                  <div style={{display:"flex",gap:8,marginBottom:16}}>
                    <button onClick={()=>setStMode("write")}
                      style={{padding:"5px 14px",borderRadius:16,border:`1px solid ${stMode==="write"?"#7c9fd4":"#1c1c1c"}`,background:stMode==="write"?"#7c9fd418":"transparent",color:stMode==="write"?"#7c9fd4":"#444",fontSize:11.5,cursor:"pointer",transition:"all .2s"}}>
                      ✏️ Write Scripts
                    </button>
                    <button onClick={()=>setStMode("pdf")}
                      style={{padding:"5px 14px",borderRadius:16,border:`1px solid ${stMode==="pdf"?"#7c9fd4":"#1c1c1c"}`,background:stMode==="pdf"?"#7c9fd418":"transparent",color:stMode==="pdf"?"#7c9fd4":"#444",fontSize:11.5,cursor:"pointer",transition:"all .2s"}}>
                      📄 Upload PDF
                    </button>
                  </div>
                  {stMode==="pdf" ? (
                    <div style={{background:"#0a0a0a",border:"1px solid #1c1c1c",borderRadius:10,padding:20}}>
                      <div style={{fontSize:13,color:"#7c9fd4",fontWeight:600,marginBottom:8}}>Upload Sales Talk PDF</div>
                      <div style={{fontSize:11.5,color:"#484848",marginBottom:14,lineHeight:1.7}}>
                        Upload your full sales guide. MIA will use it to open, build and close conversations.
                      </div>
                      {kb.salestalkPdfText && (
                        <div style={{background:"#0a0a14",border:"1px solid #7c9fd433",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#7c9fd4"}}>
                          📄 PDF loaded ✓
                        </div>
                      )}
                      <label style={{display:"inline-flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#7c9fd4,#4a70a0)",border:"none",borderRadius:8,padding:"9px 18px",color:"#fff",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>
                        📄 Upload PDF
                        <input ref={pdfRef} type="file" accept="application/pdf,.txt" style={{display:"none"}} onChange={handlePdfUpload}/>
                      </label>
                    </div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                      {ST_COLS.map(col => (
                        <div key={col.key} style={{background:"#0a0a0a",border:`1px solid ${col.color}28`,borderRadius:10,display:"flex",flexDirection:"column"}}>
                          <div style={{padding:"9px 12px",borderBottom:`1px solid ${col.color}20`,background:`${col.color}0d`,borderRadius:"10px 10px 0 0"}}>
                            <div style={{fontSize:12.5,fontWeight:700,color:col.color}}>{col.label}</div>
                            <div style={{fontSize:10.5,color:"#484848"}}>{col.desc}</div>
                          </div>
                          <div style={{flex:1,padding:"10px 11px"}}>
                            {stEditing===col.key ? (
                              <>
                                <textarea value={stDraft} onChange={e=>setStDraft(e.target.value)}
                                  style={{width:"100%",minHeight:180,background:"#060606",border:`1px solid ${col.color}44`,borderRadius:7,padding:10,color:"#d0ccc4",fontSize:12,fontFamily:"monospace",resize:"vertical",outline:"none",lineHeight:1.7}}/>
                                <div style={{display:"flex",gap:6,marginTop:7}}>
                                  <button onClick={()=>{ setKb(p=>({...p,salestalk:{...p.salestalk,[col.key]:stDraft}})); setStEditing(null); }}
                                    style={{background:col.color,border:"none",borderRadius:6,padding:"5px 12px",color:"#0d0d0d",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>💾 Save</button>
                                  <button onClick={()=>setStEditing(null)}
                                    style={{background:"transparent",border:"1px solid #252525",borderRadius:6,padding:"5px 10px",color:"#555",fontSize:11.5,cursor:"pointer"}}>Cancel</button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{fontSize:12,color:"#686058",lineHeight:1.8,whiteSpace:"pre-wrap",minHeight:60}}>
                                  {kb.salestalk?.[col.key]||<span style={{color:"#2a2a2a",fontStyle:"italic"}}>Empty — add scripts</span>}
                                </div>
                                <button onClick={()=>{ setStDraft(kb.salestalk?.[col.key]||""); setStEditing(col.key); }}
                                  style={{marginTop:10,display:"flex",alignItems:"center",gap:4,background:"transparent",border:`1px solid ${col.color}33`,borderRadius:6,padding:"5px 10px",color:col.color,fontSize:11,cursor:"pointer"}}>
                                  <EditIcon/>Edit
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FAQ */}
              {kbTab==="faq" && (
                <div style={{maxWidth:700}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#d47ca0",marginBottom:10}}>❓ FAQ</div>
                  <textarea value={kb.faq} onChange={e=>setKb(p=>({...p,faq:e.target.value}))}
                    style={{width:"100%",minHeight:360,background:"#060606",border:"1px solid #d47ca033",
                      borderRadius:9,padding:13,color:"#d0ccc4",fontSize:12,fontFamily:"monospace",
                      resize:"vertical",outline:"none",lineHeight:1.75}}/>
                </div>
              )}

              {/* MIA INSTRUCTIONS */}
              {kbTab==="instructions" && (
                <div style={{maxWidth:700}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                    <span style={{fontSize:20}}>⚙️</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#e8a020"}}>MIA Personalized Instructions</div>
                      <div style={{fontSize:11,color:"#484848"}}>Tell MIA exactly how to behave, what tone to use, and any specific rules for Grandlab</div>
                    </div>
                  </div>
                  <div style={{background:"#0a0800",border:"1px solid #e8a02033",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#a07820",lineHeight:1.7}}>
                    💡 Everything you write here becomes MIA's core personality and behavior rules. Be as specific as you want — pricing rules, tone, what to say or not say, your shop address, operating hours, etc.
                  </div>
                  <textarea value={kb.miaInstructions||""} onChange={e=>setKb(p=>({...p,miaInstructions:e.target.value}))}
                    style={{width:"100%",minHeight:500,background:"#060600",border:"1px solid #e8a02033",
                      borderRadius:9,padding:13,color:"#d0ccc4",fontSize:12,fontFamily:"monospace",
                      resize:"vertical",outline:"none",lineHeight:1.85}}
                    placeholder={"Write your custom instructions for MIA here...\n\nExamples:\n• Our shop is located at [address]\n• Operating hours: Mon-Sat 9am-6pm\n• Always greet customer by name if known\n• Never offer more than 10% discount\n• Always mention our warranty\n• Our WhatsApp: 01X-XXXXXXX\n• Preferred closing line: Jom singgah workshop kami!"}
                  />
                  <div style={{marginTop:8,fontSize:11,color:"#383838"}}>Changes apply immediately to all new MIA replies.</div>
                </div>
              )}
            </div>
          ) : <LockedScreen onLogin={()=>setShowLogin(true)}/>
        )}

        {/* MEDIA */}
        {view==="media" && (
          adminAuth ? (
            <div style={{flex:1,overflow:"auto",padding:"18px 16px"}}>
              <div style={{maxWidth:820}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:"#e0d8cc",marginBottom:3}}>Media Library</div>
                    <div style={{fontSize:11,color:"#383838"}}>Upload photos & videos. Tag them so MIA suggests them automatically.</div>
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:6,background:"linear-gradient(135deg,#c9a84c,#8a5f1e)",border:"none",borderRadius:7,padding:"7px 14px",color:"#0d0d0d",fontSize:12,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                    ↑ Upload<input ref={mediaRef} type="file" accept="image/*,video/*" multiple style={{display:"none"}} onChange={handleMediaUpload}/>
                  </label>
                </div>
                {mediaFiles.length===0 ? (
                  <div style={{textAlign:"center",padding:"55px 20px",border:"1px dashed #191919",borderRadius:11,color:"#222"}}>
                    <div style={{fontSize:34,marginBottom:9}}>🖼️</div>
                    <div style={{fontSize:12.5,marginBottom:4}}>No media yet</div>
                    <div style={{fontSize:11}}>Upload before/after photos & service videos.<br/>Tag with service names for auto-suggestions.</div>
                  </div>
                ) : (
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:9}}>
                    {mediaFiles.map(f => (
                      <div key={f.id} style={{background:"#0c0c0c",border:"1px solid #171717",borderRadius:9,overflow:"hidden"}}>
                        {f.type?.startsWith("video")
                          ? <video src={f.src} controls style={{width:"100%",height:115,objectFit:"cover",background:"#000"}}/>
                          : <img src={f.src} alt={f.name} style={{width:"100%",height:115,objectFit:"cover"}}/>
                        }
                        <div style={{padding:"7px 9px 9px"}}>
                          <div style={{fontSize:10.5,color:"#484040",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:5}}>{f.name}</div>
                          <input value={f.tags||""} onChange={e=>setMediaFiles(p=>p.map(m=>m.id===f.id?{...m,tags:e.target.value}:m))}
                            placeholder="Tags: ceramic ppf wrap..."
                            style={{width:"100%",background:"#080808",border:"1px solid #1c1c1c",borderRadius:5,padding:"3px 7px",color:"#585048",fontSize:10,fontFamily:"inherit",outline:"none"}}/>
                        </div>
                        <button onClick={()=>setMediaFiles(p=>p.filter(m=>m.id!==f.id))}
                          style={{width:"100%",background:"#0c0606",border:"none",borderTop:"1px solid #181414",padding:"5px",color:"#3a1c1c",cursor:"pointer",fontSize:10.5}}>
                          ✕ Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : <LockedScreen onLogin={()=>setShowLogin(true)}/>
        )}
      </div>

      {/* DB LOADING OVERLAY */}
      {dbLoading && (
        <div style={{position:"fixed",inset:0,background:"#0d0d0ddd",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:300,gap:16}}>
          <div style={{width:56,height:56,borderRadius:"50%",border:"3px solid #1e1e1e",borderTop:"3px solid #c9a84c",animation:"spin 0.8s linear infinite"}}/>
          <div style={{fontSize:13,color:"#c9a84c"}}>Loading MIA knowledge...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* LOGIN MODAL */}
      {showLogin && (
        <div style={{position:"fixed",inset:0,background:"#000000b8",display:"flex",
          alignItems:"center",justifyContent:"center",zIndex:200}}
          onClick={e=>e.target===e.currentTarget&&setShowLogin(false)}>
          <div style={{background:"#0d0d0d",border:"1px solid #1c1c1c",borderRadius:15,
            padding:28,width:300,boxShadow:"0 28px 80px #000"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <MIAAvatar size={40}/>
              <div>
                <div style={{fontSize:14,fontWeight:600,color:"#e0d8cc"}}>Admin Login</div>
                <div style={{fontSize:10,color:"#444"}}>Authorised personnel only</div>
              </div>
            </div>
            <input value={loginUser} onChange={e=>setLoginUser(e.target.value)} placeholder="Username"
              style={{width:"100%",background:"#080808",border:"1px solid #1c1c1c",borderRadius:7,
                padding:"8px 11px",color:"#d0ccc4",fontSize:13,outline:"none",marginBottom:7,fontFamily:"inherit"}}/>
            <input value={loginPass} onChange={e=>setLoginPass(e.target.value)}
              type="password" placeholder="Password"
              onKeyDown={e=>e.key==="Enter"&&tryLogin()}
              style={{width:"100%",background:"#080808",border:"1px solid #1c1c1c",borderRadius:7,
                padding:"8px 11px",color:"#d0ccc4",fontSize:13,outline:"none",marginBottom:12,fontFamily:"inherit"}}/>
            {loginErr && <div style={{color:"#e63946",fontSize:11,marginBottom:10}}>⚠️ {loginErr}</div>}
            <button onClick={tryLogin}
              style={{width:"100%",background:"linear-gradient(135deg,#c9a84c,#8a5f1e)",border:"none",
                borderRadius:7,padding:10,color:"#0d0d0d",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              Login
            </button>
            <button onClick={()=>{setShowLogin(false);setLoginErr("");}}
              style={{width:"100%",background:"none",border:"none",color:"#2e2e2e",
                fontSize:11.5,cursor:"pointer",marginTop:8,padding:4}}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
