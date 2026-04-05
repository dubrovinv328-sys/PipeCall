"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ISSUE_LABELS: Record<string, string> = {
  leaky_faucet_pipe: "💧 Leaky Faucet / Pipe",
  clogged_drain: "🚿 Clogged Drain",
  toilet_issue: "🚽 Toilet Issue",
  water_heater: "🔥 Water Heater",
  sewer_sewage: "⚠️ Sewer / Sewage",
  installation: "🔧 Installation",
  emergency_flooding: "🚨 Emergency / Flooding",
  other: "❓ Other",
};

const TIME_LABELS: Record<string, string> = {
  asap: "🚨 ASAP — It's urgent",
  today_tomorrow: "📅 Today or tomorrow",
  this_week: "🗓️ This week",
  quote_only: "💬 Just a quote",
};

const DAY_OPTIONS = [
  { id: "today",     label: "Today" },
  { id: "tomorrow",  label: "Tomorrow" },
  { id: "in_2_days", label: "In 2 days" },
  { id: "this_week", label: "This week" },
];

const TIME_WINDOW_OPTIONS = [
  { id: "morning",   emoji: "🌅", label: "Morning",   sublabel: "8am – 12pm" },
  { id: "afternoon", emoji: "☀️", label: "Afternoon", sublabel: "12pm – 5pm" },
  { id: "evening",   emoji: "🌆", label: "Evening",   sublabel: "5pm – 8pm" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:          { label: "New",       color: "#1a2b5e", bg: "#e8edff", border: "#c7d2f8" },
  accepted:     { label: "Accepted",  color: "#14532d", bg: "#dcfce7", border: "#86efac" },
  time_offered: { label: "Offered",   color: "#7c2d12", bg: "#fff7ed", border: "#fed7aa" },
  completed:    { label: "Completed", color: "#164e63", bg: "#ecfeff", border: "#a5f3fc" },
  declined:     { label: "Passed",    color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  no_answer:    { label: "No Answer", color: "#581c87", bg: "#faf5ff", border: "#d8b4fe" },
};

type Lead = {
  id: string;
  caller_phone: string;
  customer_name?: string;
  issue_type?: string;
  description?: string;
  preferred_time?: string;
  status: string;
  created_at: string;
};

function timeSince(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function urgencyFromLead(lead: Lead): { label: string; color: string; bg: string; border: string } {
  if (lead.issue_type === "emergency_flooding" || lead.preferred_time === "asap")
    return { label: "🚨 Emergency", color: "#7f1d1d", bg: "#fef2f2", border: "#fca5a5" };
  if (lead.preferred_time === "today_tomorrow")
    return { label: "⚡ Soon", color: "#7c2d12", bg: "#fff7ed", border: "#fed7aa" };
  return { label: "✓ Routine", color: "#14532d", bg: "#dcfce7", border: "#86efac" };
}

/* ── WeKatch logo ── */
function WeKatchLogo({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 38 38" fill="none">
        <rect x="7" y="4" width="6" height="30" rx="2.5" fill="white"/>
        <path d="M13 19 L30 4 L37 4 L37 9 L19 21 Z" fill="white"/>
        <path d="M13 19 L30 34 L37 34 L37 29 L19 17 Z" fill="white"/>
        <circle cx="14" cy="19" r="5.5" fill="#f97316"/>
      </svg>
      <span style={{ fontSize: 18, fontWeight: 700, color: "white", letterSpacing: "-0.3px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        We<span style={{ color: "#f97316", fontWeight: 800 }}>Katch</span>
      </span>
    </div>
  );
}

function WeKatchLogoTopbar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={26} height={26} viewBox="0 0 38 38" fill="none">
        <rect x="7" y="4" width="6" height="30" rx="2.5" fill="#1a2b5e"/>
        <path d="M13 19 L30 4 L37 4 L37 9 L19 21 Z" fill="#1a2b5e"/>
        <path d="M13 19 L30 34 L37 34 L37 29 L19 17 Z" fill="#1a2b5e"/>
        <circle cx="14" cy="19" r="5.5" fill="#f97316"/>
      </svg>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2b5e", letterSpacing: "-0.3px" }}>
        We<span style={{ color: "#f97316", fontWeight: 800 }}>Katch</span>
      </span>
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Full size" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12, objectFit: "contain" }} />
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
    </div>
  );
}

function OfferTimeModal({ onClose, onSend, sending }: { onClose: () => void; onSend: (day: string, window: string) => void; sending: boolean }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const canSend = selectedDay && selectedWindow;
  const dayLabel = DAY_OPTIONS.find(d => d.id === selectedDay)?.label.toLowerCase();
  const windowLabel = TIME_WINDOW_OPTIONS.find(w => w.id === selectedWindow)?.label.toLowerCase();

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(26,43,94,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", width: "100%", maxWidth: 480, padding: "28px 24px 32px", animation: "fadeUp 0.2s ease", boxShadow: "0 20px 60px rgba(26,43,94,0.15)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a2b5e", marginBottom: 6 }}>Offer a time</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>Customer gets an SMS with your time offer</p>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Which day?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {DAY_OPTIONS.map((d) => (
            <button key={d.id} onClick={() => setSelectedDay(d.id)}
              style={{ padding: 14, borderRadius: 12, background: selectedDay === d.id ? "#fff7ed" : "#f8fafc", border: `1.5px solid ${selectedDay === d.id ? "#f97316" : "#e2e8f0"}`, color: selectedDay === d.id ? "#f97316" : "#1a2b5e", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}>
              {d.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>What time?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {TIME_WINDOW_OPTIONS.map((w) => (
            <button key={w.id} onClick={() => setSelectedWindow(w.id)}
              style={{ padding: "14px 8px", borderRadius: 12, background: selectedWindow === w.id ? "#fff7ed" : "#f8fafc", border: `1.5px solid ${selectedWindow === w.id ? "#f97316" : "#e2e8f0"}`, color: selectedWindow === w.id ? "#f97316" : "#1a2b5e", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.15s", fontFamily: "inherit" }}>
              <span style={{ fontSize: 22 }}>{w.emoji}</span>
              <span>{w.label}</span>
              <span style={{ fontSize: 11, color: selectedWindow === w.id ? "#f97316" : "#94a3b8", fontWeight: 400 }}>{w.sublabel}</span>
            </button>
          ))}
        </div>
        {canSend && (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#92400e", lineHeight: 1.5 }}>
            📱 SMS: <strong>&quot;Your plumber can come {dayLabel} {windowLabel}. Reply YES to confirm.&quot;</strong>
          </div>
        )}
        <button onClick={() => canSend && onSend(selectedDay!, selectedWindow!)} disabled={!canSend || sending}
          style={{ width: "100%", padding: 17, borderRadius: 12, background: canSend ? "#f97316" : "#f1f5f9", border: "none", color: canSend ? "#fff" : "#94a3b8", fontSize: 16, fontWeight: 800, cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s", fontFamily: "inherit" }}>
          {sending ? <span style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> : "📨 Send Time Offer"}
        </button>
      </div>
    </div>
  );
}

function StatusPickerModal({ current, onClose, onSelect, loading }: { current: string; onClose: () => void; onSelect: (s: string) => void; loading: boolean }) {
  const options = [
    { id: "new",       emoji: "🔵", label: "New",       desc: "Back to new" },
    { id: "accepted",  emoji: "✅", label: "Accepted",  desc: "Job confirmed" },
    { id: "completed", emoji: "🏁", label: "Completed", desc: "Job done" },
    { id: "no_answer", emoji: "📵", label: "No Answer", desc: "Called, no response" },
    { id: "declined",  emoji: "✗",  label: "Passed",    desc: "Not taking this job" },
  ];
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(26,43,94,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0", width: "100%", maxWidth: 440, padding: "28px 24px 32px", animation: "fadeUp 0.2s ease", boxShadow: "0 20px 60px rgba(26,43,94,0.15)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a2b5e", marginBottom: 6 }}>Update status</h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
          Current: <strong style={{ color: "#1a2b5e" }}>{STATUS_CONFIG[current]?.label ?? current}</strong>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt) => {
            const cfg = STATUS_CONFIG[opt.id] ?? { bg: "#f9fafb", border: "#e5e7eb", color: "#6b7280" };
            return (
              <button key={opt.id} onClick={() => onSelect(opt.id)} disabled={loading || opt.id === current}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: opt.id === current ? cfg.bg : "#f8fafc", border: `1.5px solid ${opt.id === current ? cfg.border : "#e2e8f0"}`, borderRadius: 12, cursor: opt.id === current ? "default" : "pointer", opacity: loading ? 0.5 : 1, transition: "all 0.15s", fontFamily: "inherit" }}>
                <span style={{ fontSize: 22, width: 32, textAlign: "center" }}>{opt.emoji}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: opt.id === current ? cfg.color : "#1a2b5e" }}>{opt.label}</p>
                  <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{opt.desc}</p>
                </div>
                {opt.id === current && <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "2px 8px", borderRadius: 100 }}>Current</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LeadPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params?.leadId as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [showOfferTime, setShowOfferTime] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [offerSending, setOfferSending] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    const fetchLead = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
      if (error) { console.error(error); setLoading(false); return; }
      setLead(data);
      const { data: files } = await supabase.storage.from("lead-photos").list(`leads/${leadId}`);
      if (files && files.length > 0) {
        const urls = await Promise.all(files.map(async (f) => {
          const { data: urlData } = supabase.storage.from("lead-photos").getPublicUrl(`leads/${leadId}/${f.name}`);
          return urlData.publicUrl;
        }));
        setPhotoUrls(urls);
      }
      setLoading(false);
    };
    fetchLead();
  }, [leadId]);

  const updateStatus = async (newStatus: string) => {
    setActionLoading(true);
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId);
    if (error) { setActionMsg("Something went wrong."); setActionLoading(false); return; }
    setLead((prev) => prev ? { ...prev, status: newStatus } : prev);
    setActionMsg(`✅ Status updated to ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
    setActionLoading(false);
    setShowStatusPicker(false);
  };

  const handleSendOffer = async (day: string, timeWindow: string) => {
    setOfferSending(true);
    const dayLabel = DAY_OPTIONS.find(d => d.id === day)?.label.toLowerCase();
    const windowLabel = TIME_WINDOW_OPTIONS.find(w => w.id === timeWindow)?.label.toLowerCase();
    const { error } = await supabase.from("leads").update({ status: "time_offered", offered_time: `${day} ${timeWindow}` }).eq("id", leadId);
    if (!error) {
      setLead((prev) => prev ? { ...prev, status: "time_offered" } : prev);
      setActionMsg(`📨 Time offer sent — "${dayLabel} ${windowLabel}"`);
    }
    setOfferSending(false);
    setShowOfferTime(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) return (
    <div style={{ minHeight: "100svh", background: "#f4f6fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!lead) return (
    <div style={{ minHeight: "100svh", background: "#f4f6fb", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <span style={{ fontSize: 48 }}>🔍</span>
      <p style={{ fontSize: 18, fontWeight: 700, color: "#1a2b5e" }}>Lead not found</p>
    </div>
  );

  const urgency = urgencyFromLead(lead);
  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f4f6fb; color: #1a2b5e; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        :root { --navy: #1a2b5e; --orange: #f97316; --bg: #f4f6fb; --white: #fff; --border: #e2e8f0; --muted: #64748b; --sidebar-w: 240px; }

        .layout { display: flex; min-height: 100svh; }

        /* Sidebar */
        .sidebar { display: none; }
        @media (min-width: 768px) {
          .sidebar { display: flex; flex-direction: column; width: var(--sidebar-w); flex-shrink: 0; background: var(--navy); position: sticky; top: 0; height: 100vh; }
        }
        .sidebar-header { padding: 24px 20px 22px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-nav { flex: 1; padding: 20px 12px; display: flex; flex-direction: column; gap: 2px; }
        .sidebar-section-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1px; padding: 12px 8px 6px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.6); transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }
        .nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
        .nav-item.active { background: var(--orange); color: white; }
        .sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 2px; }
        .nav-footer-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.5); transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }
        .nav-footer-item:hover { background: rgba(255,255,255,0.08); color: white; }

        /* Main */
        .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

        /* Topbar */
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .mobile-logo { display: flex; }
        @media (min-width: 768px) { .mobile-logo { display: none; } }
        .btn-back { background: none; border: 1.5px solid var(--border); color: var(--muted); font-size: 13px; font-weight: 600; padding: 7px 16px; border-radius: 8px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .btn-back:hover { border-color: var(--navy); color: var(--navy); }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .time-stamp { font-size: 13px; color: var(--muted); }

        /* Content */
        .content { padding: 28px 24px; animation: fadeUp 0.3s ease; }
        @media (min-width: 768px) { .content { padding: 28px 32px; } }
        .content-inner { display: flex; flex-direction: column; gap: 20px; max-width: 900px; }
        @media (min-width: 768px) { .content-inner { flex-direction: row; align-items: flex-start; gap: 28px; } }
        .col-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
        .col-right { width: 300px; flex-shrink: 0; display: none; flex-direction: column; gap: 16px; }
        @media (min-width: 768px) { .col-right { display: flex; } }

        /* Customer card */
        .customer-card { background: var(--white); border: 1.5px solid var(--border); border-radius: 16px; padding: 20px; }
        .urgency-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; border: 1px solid; margin-bottom: 14px; }
        .customer-name { font-size: clamp(24px, 4vw, 36px); font-weight: 800; letter-spacing: -0.5px; color: var(--navy); line-height: 1.1; margin-bottom: 12px; }
        .customer-name.unknown { color: var(--muted); font-style: italic; }
        .phone-link { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; background: #e8edff; border: 1.5px solid #c7d2f8; border-radius: 100px; color: var(--navy); font-size: 15px; font-weight: 700; text-decoration: none; transition: all 0.15s; }
        .phone-link:hover { background: #d4dcff; }

        /* Status row */
        .status-row { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
        .status-chip { display: inline-flex; align-items: center; padding: 5px 14px; border-radius: 100px; font-size: 12px; font-weight: 700; border: 1px solid; }
        .change-btn { background: none; border: 1.5px solid var(--border); color: var(--muted); font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .change-btn:hover { border-color: var(--navy); color: var(--navy); }

        /* Detail card */
        .detail-card { background: var(--white); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
        .card-title { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; padding: 14px 20px 10px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
        .card-title::before { content: ''; width: 3px; height: 14px; background: var(--orange); border-radius: 2px; }
        .detail-row { display: flex; align-items: flex-start; gap: 12px; padding: 13px 20px; border-bottom: 1px solid #f1f5f9; }
        .detail-row:last-child { border-bottom: none; }
        .detail-key { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; min-width: 72px; flex-shrink: 0; padding-top: 2px; }
        .detail-val { font-size: 14px; font-weight: 500; color: var(--navy); line-height: 1.5; }
        .issue-chip { display: inline-flex; align-items: center; gap: 6px; background: #e8edff; border: 1px solid #c7d2f8; border-radius: 8px; padding: 4px 12px; font-size: 13px; font-weight: 600; color: var(--navy); }

        /* Photos */
        .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 14px 20px; }
        .photo-thumb { aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: #f1f5f9; cursor: pointer; border: 1.5px solid var(--border); transition: transform 0.15s; }
        .photo-thumb:hover { transform: scale(1.02); }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Action message */
        .action-msg { background: #dcfce7; border: 1px solid #86efac; border-radius: 12px; padding: 12px 16px; font-size: 14px; font-weight: 600; color: #14532d; }

        /* Right column cards */
        .action-card { background: var(--white); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
        .action-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; font-size: 14px; font-weight: 700; border: none; cursor: pointer; transition: all 0.15s; font-family: inherit; border-bottom: 1px solid var(--border); }
        .action-btn:last-child { border-bottom: none; }
        .btn-call { background: #dcfce7; color: #14532d; }
        .btn-call:hover { background: #bbf7d0; }
        .btn-status { background: #e8edff; color: #1a2b5e; }
        .btn-status:hover { background: #d4dcff; }
        .btn-time { background: #f8fafc; color: #64748b; }
        .btn-time:hover { background: #f1f5f9; }

        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .info-row:last-child { border-bottom: none; }
        .info-key { color: var(--muted); font-weight: 500; }
        .info-val { color: var(--navy); font-weight: 600; }

        /* Mobile action bar */
        .action-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.96); backdrop-filter: blur(20px); border-top: 1px solid var(--border); padding: 12px 16px 28px; display: flex; gap: 10px; z-index: 50; }
        @media (min-width: 768px) { .action-bar { display: none; } }
        .mob-btn-call { flex: 2; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; background: #16a34a; color: #fff; font-size: 16px; font-weight: 800; border-radius: 12px; text-decoration: none; border: none; cursor: pointer; font-family: inherit; }
        .mob-btn-status { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px 10px; background: #e8edff; color: var(--navy); font-size: 13px; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; font-family: inherit; }
        .mob-btn-time { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px 10px; background: #f1f5f9; color: var(--muted); font-size: 13px; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; font-family: inherit; }
      `}</style>

      <div className="layout">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-header"><WeKatchLogo size={34} /></div>
          <nav className="sidebar-nav">
            <span className="sidebar-section-label">Leads</span>
            <button className="nav-item active" onClick={() => router.push("/leads")}>📋 All Leads</button>
          </nav>
          <div className="sidebar-footer">
            <button className="nav-footer-item" onClick={() => router.push("/settings")}>⚙️ Settings</button>
            <button className="nav-footer-item" onClick={handleLogout}>← Log out</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="main">

          {/* Topbar */}
          <div className="topbar">
            <div className="topbar-left">
              <div className="mobile-logo"><WeKatchLogoTopbar /></div>
              <button className="btn-back" onClick={() => router.push("/leads")}>← Back to Leads</button>
            </div>
            <div className="topbar-right">
              <span className="time-stamp">{timeSince(lead.created_at)}</span>
            </div>
          </div>

          {/* Content */}
          <div className="content">
            <div className="content-inner">

              {/* Left col */}
              <div className="col-left">

                {/* Customer card */}
                <div className="customer-card">
                  <div className="urgency-badge" style={{ background: urgency.bg, color: urgency.color, borderColor: urgency.border }}>
                    {urgency.label}
                  </div>
                  <p className={`customer-name ${!lead.customer_name ? "unknown" : ""}`}>
                    {lead.customer_name || "Unknown caller"}
                  </p>
                  <a href={`tel:${lead.caller_phone}`} className="phone-link">📞 {lead.caller_phone}</a>
                  <div className="status-row">
                    <span className="status-chip" style={{ background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}>
                      {statusCfg.label}
                    </span>
                    <button className="change-btn" onClick={() => setShowStatusPicker(true)}>Change status ↓</button>
                  </div>
                </div>

                {/* Detail card */}
                <div className="detail-card">
                  <div className="card-title">Lead Details</div>
                  {lead.issue_type && (
                    <div className="detail-row">
                      <span className="detail-key">Issue</span>
                      <span className="detail-val"><span className="issue-chip">{ISSUE_LABELS[lead.issue_type] ?? lead.issue_type}</span></span>
                    </div>
                  )}
                  {lead.preferred_time && (
                    <div className="detail-row">
                      <span className="detail-key">Timing</span>
                      <span className="detail-val">{TIME_LABELS[lead.preferred_time] ?? lead.preferred_time}</span>
                    </div>
                  )}
                  {lead.description && (
                    <div className="detail-row">
                      <span className="detail-key">Notes</span>
                      <span className="detail-val">{lead.description}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-key">Lead ID</span>
                    <span className="detail-val" style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{lead.id}</span>
                  </div>
                </div>

                {/* Photos */}
                {photoUrls.length > 0 && (
                  <div className="detail-card">
                    <div className="card-title">Photos ({photoUrls.length})</div>
                    <div className="photos-grid">
                      {photoUrls.map((url, i) => (
                        <div key={i} className="photo-thumb" onClick={() => setLightboxUrl(url)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Photo ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {actionMsg && <div className="action-msg">{actionMsg}</div>}
              </div>

              {/* Right col — desktop */}
              <div className="col-right">
                <div className="action-card">
                  <div className="card-title">Actions</div>
                  <a href={`tel:${lead.caller_phone}`} className="action-btn btn-call">📞 Call Now</a>
                  <button className="action-btn btn-status" onClick={() => setShowStatusPicker(true)}>📋 Update Status</button>
                  <button className="action-btn btn-time" onClick={() => setShowOfferTime(true)}>🕐 Offer Time</button>
                </div>

                <div className="action-card">
                  <div className="card-title">Lead Info</div>
                  <div className="info-row">
                    <span className="info-key">Submitted</span>
                    <span className="info-val">{timeSince(lead.created_at)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-key">Status</span>
                    <span className="status-chip" style={{ background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border, fontSize: 11, padding: "3px 10px" }}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="action-bar">
        <a href={`tel:${lead.caller_phone}`} className="mob-btn-call">📞 Call Now</a>
        <button className="mob-btn-status" onClick={() => setShowStatusPicker(true)}>📋 Status</button>
        <button className="mob-btn-time" onClick={() => setShowOfferTime(true)}>🕐 Time</button>
      </div>

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {showOfferTime && <OfferTimeModal onClose={() => setShowOfferTime(false)} onSend={handleSendOffer} sending={offerSending} />}
      {showStatusPicker && <StatusPickerModal current={lead.status} onClose={() => setShowStatusPicker(false)} onSelect={updateStatus} loading={actionLoading} />}
    </>
  );
}
