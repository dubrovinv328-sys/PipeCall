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
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "in_2_days", label: "In 2 days" },
  { id: "this_week", label: "This week" },
];

const TIME_WINDOW_OPTIONS = [
  { id: "morning", emoji: "🌅", label: "Morning", sublabel: "8am – 12pm" },
  { id: "afternoon", emoji: "☀️", label: "Afternoon", sublabel: "12pm – 5pm" },
  { id: "evening", emoji: "🌆", label: "Evening", sublabel: "5pm – 8pm" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:          { label: "New",        color: "#fff",    bg: "#2563eb" },
  accepted:     { label: "Accepted",   color: "#fff",    bg: "#16a34a" },
  time_offered: { label: "Offered",    color: "#92400e", bg: "#fde68a" },
  completed:    { label: "Completed",  color: "#fff",    bg: "#0891b2" },
  declined:     { label: "Passed",     color: "#9ca3af", bg: "#1f2937" },
  no_answer:    { label: "No Answer",  color: "#fff",    bg: "#7c3aed" },
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

function urgencyFromLead(lead: Lead): { label: string; color: string; bg: string } {
  if (lead.issue_type === "emergency_flooding" || lead.preferred_time === "asap") {
    return { label: "Emergency", color: "#fff", bg: "#dc2626" };
  }
  if (lead.preferred_time === "today_tomorrow") {
    return { label: "Soon", color: "#92400e", bg: "#fde68a" };
  }
  return { label: "Routine", color: "#374151", bg: "#e5e7eb" };
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Full size" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12, objectFit: "contain" }} />
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
    </div>
  );
}

function OfferTimeModal({ onClose, onSend, sending }: { onClose: () => void; onSend: (day: string, window: string) => void; sending: boolean; }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const canSend = selectedDay && selectedWindow;
  const dayLabel = DAY_OPTIONS.find(d => d.id === selectedDay)?.label.toLowerCase();
  const windowLabel = TIME_WINDOW_OPTIONS.find(w => w.id === selectedWindow)?.label.toLowerCase();

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#161a22", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", width: "100%", maxWidth: 480, padding: "28px 24px 32px", animation: "fadeUp 0.2s ease" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f0f2f7", marginBottom: 6 }}>Offer a time</h2>
        <p style={{ fontSize: 14, color: "#7a8499", marginBottom: 24 }}>Customer gets an SMS with your time offer</p>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#7a8499", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Which day?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {DAY_OPTIONS.map((d) => (
            <button key={d.id} onClick={() => setSelectedDay(d.id)} style={{ padding: "14px", borderRadius: 12, background: selectedDay === d.id ? "rgba(59,183,255,0.15)" : "#1e2330", border: `1.5px solid ${selectedDay === d.id ? "#3bb7ff" : "rgba(255,255,255,0.08)"}`, color: selectedDay === d.id ? "#3bb7ff" : "#e8eaf0", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>{d.label}</button>
          ))}
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#7a8499", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>What time?</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {TIME_WINDOW_OPTIONS.map((w) => (
            <button key={w.id} onClick={() => setSelectedWindow(w.id)} style={{ padding: "14px 8px", borderRadius: 12, background: selectedWindow === w.id ? "rgba(59,183,255,0.15)" : "#1e2330", border: `1.5px solid ${selectedWindow === w.id ? "#3bb7ff" : "rgba(255,255,255,0.08)"}`, color: selectedWindow === w.id ? "#3bb7ff" : "#e8eaf0", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
              <span style={{ fontSize: 22 }}>{w.emoji}</span>
              <span>{w.label}</span>
              <span style={{ fontSize: 11, color: selectedWindow === w.id ? "rgba(59,183,255,0.8)" : "#7a8499", fontWeight: 400 }}>{w.sublabel}</span>
            </button>
          ))}
        </div>
        {canSend && (
          <div style={{ background: "rgba(59,183,255,0.08)", border: "1px solid rgba(59,183,255,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#a8d8f0", lineHeight: 1.5 }}>
            📱 SMS: <strong style={{ color: "#f0f2f7" }}>&quot;Your plumber can come {dayLabel} {windowLabel}. Reply YES to confirm.&quot;</strong>
          </div>
        )}
        <button onClick={() => canSend && onSend(selectedDay!, selectedWindow!)} disabled={!canSend || sending} style={{ width: "100%", padding: "17px", borderRadius: 14, background: canSend ? "#2563eb" : "#1e2330", border: "none", color: canSend ? "#fff" : "#4b5563", fontSize: 16, fontWeight: 800, cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
          {sending ? <span style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> : "📨 Send Time Offer"}
        </button>
      </div>
    </div>
  );
}

function StatusPickerModal({ current, onClose, onSelect, loading }: { current: string; onClose: () => void; onSelect: (status: string) => void; loading: boolean; }) {
  const options = [
    { id: "new",       emoji: "🔵", label: "New",        desc: "Back to new" },
    { id: "accepted",  emoji: "✅", label: "Accepted",   desc: "Job confirmed" },
    { id: "completed", emoji: "🏁", label: "Completed",  desc: "Job done" },
    { id: "no_answer", emoji: "📵", label: "No Answer",  desc: "Called, no response" },
    { id: "declined",  emoji: "✗",  label: "Passed",     desc: "Not taking this job" },
  ];

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
      <div style={{ background: "#161a22", borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", width: "100%", maxWidth: 440, padding: "28px 24px 32px", animation: "fadeUp 0.2s ease" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#f0f2f7", marginBottom: 6 }}>Update status</h2>
        <p style={{ fontSize: 14, color: "#7a8499", marginBottom: 20 }}>Current: <strong style={{ color: "#f0f2f7" }}>{STATUS_CONFIG[current]?.label ?? current}</strong></p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt) => (
            <button key={opt.id} onClick={() => onSelect(opt.id)} disabled={loading || opt.id === current}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: opt.id === current ? "rgba(59,183,255,0.1)" : "#1e2330", border: `1.5px solid ${opt.id === current ? "#3bb7ff" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, cursor: opt.id === current ? "default" : "pointer", opacity: loading ? 0.5 : 1, transition: "all 0.15s" }}>
              <span style={{ fontSize: 22, width: 32, textAlign: "center" }}>{opt.emoji}</span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: opt.id === current ? "#3bb7ff" : "#f0f2f7" }}>{opt.label}</p>
                <p style={{ fontSize: 12, color: "#7a8499", marginTop: 2 }}>{opt.desc}</p>
              </div>
              {opt.id === current && <span style={{ fontSize: 12, color: "#3bb7ff", fontWeight: 700 }}>Current</span>}
            </button>
          ))}
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

  if (loading) {
    return (
      <div style={{ minHeight: "100svh", background: "#0a0c10", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#3bb7ff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ minHeight: "100svh", background: "#0a0c10", color: "#f0f2f7", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 24 }}>
        <span style={{ fontSize: 48 }}>🔍</span>
        <p style={{ fontSize: 18, fontWeight: 700 }}>Lead not found</p>
      </div>
    );
  }

  const urgency = urgencyFromLead(lead);
  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: "#fff", bg: "#374151" };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0a0c10; color: #f0f2f7; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        .page { max-width: 900px; margin: 0 auto; padding: 0 0 120px; }
        @media (min-width: 768px) { .page { padding: 32px 32px 80px; } }

        /* Header */
        .header { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 0; }
        @media (min-width: 768px) { .header { padding: 0 0 24px; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 32px; } }
        .back-btn { background: none; border: none; color: #7a8499; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px 0; }
        .back-btn:hover { color: #f0f2f7; }
        .header-right { display: flex; align-items: center; gap: 10px; }

        /* Desktop 2-col layout */
        .content { display: flex; flex-direction: column; }
        @media (min-width: 768px) { .content { flex-direction: row; gap: 32px; align-items: flex-start; } }
        .col-left { flex: 1; min-width: 0; }
        .col-right { width: 320px; flex-shrink: 0; display: none; }
        @media (min-width: 768px) { .col-right { display: flex; flex-direction: column; gap: 16px; } }

        /* Customer block */
        .customer-block { padding: 20px 20px 0; animation: fadeUp 0.3s ease; }
        @media (min-width: 768px) { .customer-block { padding: 0 0 24px; } }
        .urgency-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; margin-bottom: 12px; }
        .customer-name { font-size: clamp(28px, 5vw, 40px); font-weight: 800; line-height: 1.1; letter-spacing: -0.5px; color: #f0f2f7; }
        .customer-name.unknown { color: #7a8499; font-style: italic; }
        .phone-link { display: inline-flex; align-items: center; gap: 8px; margin-top: 12px; padding: 12px 20px; background: rgba(59,183,255,0.12); border: 1.5px solid rgba(59,183,255,0.3); border-radius: 100px; color: #3bb7ff; font-size: 18px; font-weight: 700; text-decoration: none; }
        .phone-link:hover { background: rgba(59,183,255,0.2); }

        /* Status */
        .status-row { margin: 14px 20px 0; display: flex; align-items: center; gap: 10px; animation: fadeUp 0.3s ease 0.05s both; }
        @media (min-width: 768px) { .status-row { margin: 0 0 20px; } }
        .status-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; }
        .change-status-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #7a8499; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; cursor: pointer; }
        .change-status-btn:hover { border-color: rgba(255,255,255,0.2); color: #f0f2f7; }

        /* Detail card */
        .detail-card { margin: 20px 20px 0; background: #161a22; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; animation: fadeUp 0.3s ease 0.1s both; }
        @media (min-width: 768px) { .detail-card { margin: 0 0 20px; } }
        .detail-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .detail-row:last-child { border-bottom: none; }
        .detail-key { font-size: 12px; font-weight: 600; color: #7a8499; text-transform: uppercase; letter-spacing: 0.5px; min-width: 80px; padding-top: 2px; flex-shrink: 0; }
        .detail-val { font-size: 15px; font-weight: 500; color: #e8eaf0; line-height: 1.5; }
        .issue-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(59,183,255,0.1); border: 1px solid rgba(59,183,255,0.25); border-radius: 8px; padding: 5px 12px; font-size: 14px; font-weight: 600; color: #3bb7ff; }

        /* Photos */
        .photos-section { padding: 20px 20px 0; animation: fadeUp 0.3s ease 0.15s both; }
        @media (min-width: 768px) { .photos-section { padding: 0; } }
        .photos-title { font-size: 13px; font-weight: 600; color: #7a8499; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .photo-thumb { aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: #161a22; cursor: pointer; border: 1px solid rgba(255,255,255,0.07); transition: transform 0.15s; }
        .photo-thumb:hover { transform: scale(1.02); }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }

        /* Action message */
        .action-msg { margin: 16px 20px 0; padding: 12px 16px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); border-radius: 12px; font-size: 14px; font-weight: 600; color: #22c55e; }
        @media (min-width: 768px) { .action-msg { margin: 16px 0 0; } }

        /* Desktop action panel (right column) */
        .action-panel { background: #161a22; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; }
        .action-panel-title { font-size: 13px; font-weight: 700; color: #7a8499; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
        .desktop-action-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 700; border: none; cursor: pointer; margin-bottom: 10px; transition: all 0.15s; text-decoration: none; }
        .desktop-action-btn:last-child { margin-bottom: 0; }
        .btn-call-desktop { background: #16a34a; color: #fff; }
        .btn-call-desktop:hover { background: #15803d; }
        .btn-status-desktop { background: #2563eb; color: #fff; }
        .btn-status-desktop:hover { background: #1d4ed8; }
        .btn-time-desktop { background: #374151; color: #d1d5db; }
        .btn-time-desktop:hover { background: #4b5563; }

        /* Mobile action bar */
        .action-bar { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(10,12,16,0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.08); padding: 12px 16px 28px; display: flex; gap: 10px; z-index: 50; }
        @media (min-width: 768px) { .action-bar { display: none; } }
        .btn-call { flex: 2; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; background: #16a34a; color: #fff; font-size: 17px; font-weight: 800; border-radius: 14px; text-decoration: none; border: none; cursor: pointer; }
        .btn-status { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px 10px; background: #2563eb; color: #fff; font-size: 14px; font-weight: 700; border-radius: 14px; border: none; cursor: pointer; }
        .btn-time { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px 10px; background: #374151; color: #d1d5db; font-size: 14px; font-weight: 700; border-radius: 14px; border: none; cursor: pointer; }
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="header">
          <button className="back-btn" onClick={() => router.push("/leads")}>← Back to Leads</button>
          <div className="header-right">
            <span style={{ fontSize: 13, color: "#7a8499" }}>{timeSince(lead.created_at)}</span>
          </div>
        </div>

        <div className="content">
          {/* Left column */}
          <div className="col-left">
            {/* Customer */}
            <div className="customer-block">
              <span className="urgency-badge" style={{ background: urgency.bg, color: urgency.color }}>
                {urgency.label === "Emergency" ? "🚨" : urgency.label === "Soon" ? "⚡" : "✓"} {urgency.label}
              </span>
              <p className={`customer-name ${!lead.customer_name ? "unknown" : ""}`}>
                {lead.customer_name || "Unknown caller"}
              </p>
              <a href={`tel:${lead.caller_phone}`} className="phone-link">📞 {lead.caller_phone}</a>
            </div>

            {/* Status */}
            <div className="status-row">
              <span className="status-chip" style={{ background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
              <button className="change-status-btn" onClick={() => setShowStatusPicker(true)}>Change status ↓</button>
            </div>

            {/* Detail card */}
            <div className="detail-card">
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
                <span className="detail-val" style={{ fontSize: 12, color: "#7a8499", fontFamily: "monospace" }}>{lead.id}</span>
              </div>
            </div>

            {/* Photos */}
            {photoUrls.length > 0 && (
              <div className="photos-section">
                <p className="photos-title">Photos ({photoUrls.length})</p>
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

          {/* Right column — desktop only */}
          <div className="col-right">
            <div className="action-panel">
              <p className="action-panel-title">Actions</p>
              <a href={`tel:${lead.caller_phone}`} className="desktop-action-btn btn-call-desktop">📞 Call Now</a>
              <button className="desktop-action-btn btn-status-desktop" onClick={() => setShowStatusPicker(true)}>📋 Update Status</button>
              <button className="desktop-action-btn btn-time-desktop" onClick={() => setShowOfferTime(true)}>🕐 Offer Time</button>
            </div>

            <div className="action-panel">
              <p className="action-panel-title">Lead Info</p>
              <div style={{ fontSize: 13, color: "#7a8499", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Submitted</span>
                  <span style={{ color: "#f0f2f7", fontWeight: 600 }}>{timeSince(lead.created_at)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Status</span>
                  <span className="status-chip" style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: 12, padding: "3px 10px" }}>{statusCfg.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="action-bar">
        <a href={`tel:${lead.caller_phone}`} className="btn-call">📞 Call Now</a>
        <button className="btn-status" onClick={() => setShowStatusPicker(true)}>📋 Status</button>
        <button className="btn-time" onClick={() => setShowOfferTime(true)}>🕐 Time</button>
      </div>

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      {showOfferTime && <OfferTimeModal onClose={() => setShowOfferTime(false)} onSend={handleSendOffer} sending={offerSending} />}
      {showStatusPicker && <StatusPickerModal current={lead.status} onClose={() => setShowStatusPicker(false)} onSelect={updateStatus} loading={actionLoading} />}
    </>
  );
}
