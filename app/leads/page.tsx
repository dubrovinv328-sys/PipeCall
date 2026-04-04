"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ISSUE_LABELS: Record<string, string> = {
  leaky_faucet_pipe: "Leaky Faucet",
  clogged_drain: "Clogged Drain",
  toilet_issue: "Toilet Issue",
  water_heater: "Water Heater",
  sewer_sewage: "Sewer / Sewage",
  installation: "Installation",
  emergency_flooding: "Emergency",
  other: "Other",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new:          { label: "New",        color: "#fff",    bg: "#2563eb",  dot: "#2563eb" },
  accepted:     { label: "Accepted",   color: "#fff",    bg: "#16a34a",  dot: "#16a34a" },
  time_offered: { label: "Offered",    color: "#92400e", bg: "#fde68a",  dot: "#f59e0b" },
  completed:    { label: "Completed",  color: "#fff",    bg: "#0891b2",  dot: "#0891b2" },
  declined:     { label: "Passed",     color: "#9ca3af", bg: "#1f2937",  dot: "#374151" },
  no_answer:    { label: "No Answer",  color: "#fff",    bg: "#7c3aed",  dot: "#7c3aed" },
  missed:       { label: "Missed",     color: "#fff",    bg: "#dc2626",  dot: "#dc2626" },
};

type Lead = {
  id: string;
  caller_phone: string;
  customer_name?: string;
  issue_type?: string;
  preferred_time?: string;
  status: string;
  created_at: string;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

  // For older leads, show actual date
  const isThisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: isThisYear ? undefined : "numeric",
  });
}

function urgencyDot(lead: Lead): string {
  if (lead.issue_type === "emergency_flooding") return "#dc2626";
  if (lead.preferred_time === "asap") return "#dc2626";
  if (lead.preferred_time === "today_tomorrow") return "#f59e0b";
  return "#374151";
}

const FILTERS = [
  { id: "all",       label: "All" },
  { id: "new",       label: "New" },
  { id: "accepted",  label: "Accepted" },
  { id: "completed", label: "Completed" },
  { id: "no_answer", label: "No Answer" },
  { id: "declined",  label: "Passed" },
];

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      fetchLeads();
    };
    checkAuth();
  }, [router]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("id, caller_phone, customer_name, issue_type, preferred_time, status, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

  // Group leads by date
  const groupedLeads = filtered.reduce((groups: Record<string, Lead[]>, lead) => {
    const date = new Date(lead.created_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    let group: string;
    if (diff < 86400) group = "Today";
    else if (diff < 172800) group = "Yesterday";
    else group = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    if (!groups[group]) groups[group] = [];
    groups[group].push(lead);
    return groups;
  }, {});

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0a0c10; color: #f0f2f7; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } } .settings-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #f0f2f7; font-size: 18px; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .page { max-width: 480px; margin: 0 auto; min-height: 100svh; padding-bottom: 40px; }
        .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 0; }
        .top-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .top-right { display: flex; align-items: center; gap: 10px; }
        .refresh-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #7a8499; font-size: 16px; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .logout-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #7a8499; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
        .filters { display: flex; gap: 8px; padding: 16px 20px 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .filters::-webkit-scrollbar { display: none; }
        .filter-btn { flex-shrink: 0; padding: 7px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; border: 1.5px solid rgba(255,255,255,0.08); background: #161a22; color: #7a8499; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .filter-btn.active { background: #3bb7ff; border-color: #3bb7ff; color: #000; }
        .count-badge { font-size: 13px; color: #7a8499; padding: 4px 20px 10px; }
        .date-group-label { font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 20px 6px; }
        .leads-list { display: flex; flex-direction: column; }
        .lead-row { display: flex; align-items: center; gap: 14px; padding: 14px 20px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); animation: fadeUp 0.25s ease both; transition: background 0.15s; -webkit-tap-highlight-color: transparent; }
        .lead-row:active { background: #161a22; }
        .urgency-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .lead-info { flex: 1; min-width: 0; }
        .lead-name { font-size: 15px; font-weight: 700; color: #f0f2f7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lead-meta { font-size: 13px; color: #7a8499; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lead-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .time-ago { font-size: 12px; color: #7a8499; }
        .status-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 100px; white-space: nowrap; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; gap: 12px; text-align: center; }
        .empty-icon { font-size: 48px; }
        .empty-title { font-size: 18px; font-weight: 700; }
        .empty-sub { font-size: 14px; color: #7a8499; }
        .loading-state { display: flex; align-items: center; justify-content: center; padding: 80px; }
        .spinner { width: 28px; height: 28px; border: 3px solid rgba(255,255,255,0.08); border-top-color: #3bb7ff; border-radius: 50%; animation: spin 0.7s linear infinite; }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <h1 className="top-title">📋 Leads</h1>
          <div className="top-right">
            <button className="refresh-btn" onClick={fetchLeads}>↻</button>
            <div className="top-right">
            <button className="settings-btn" onClick={() => router.push("/settings")}>⚙️</button>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
         </div>
          </div>
        </div>

        <div className="filters">
          {FILTERS.map(f => (
            <button key={f.id} className={`filter-btn ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p className="empty-title">No leads here</p>
            <p className="empty-sub">{filter === "all" ? "When customers submit requests, they'll appear here." : `No ${filter} leads yet.`}</p>
          </div>
        ) : (
          <>
            <p className="count-badge">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</p>
            <div className="leads-list">
              {Object.entries(groupedLeads).map(([dateGroup, groupLeads]) => (
                <div key={dateGroup}>
                  <p className="date-group-label">{dateGroup}</p>
                  {groupLeads.map((lead, i) => {
                    const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: "#fff", bg: "#374151", dot: "#374151" };
                    return (
                      <div key={lead.id} className="lead-row"
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => router.push(`/lead/${lead.id}`)}>
                        <div className="urgency-dot" style={{ background: urgencyDot(lead) }} />
                        <div className="lead-info">
                          <p className="lead-name">{lead.customer_name || lead.caller_phone}</p>
                          <p className="lead-meta">
                            {lead.issue_type ? ISSUE_LABELS[lead.issue_type] ?? lead.issue_type : "No issue type"} · {lead.caller_phone}
                          </p>
                        </div>
                        <div className="lead-right">
                          <span className="time-ago">{formatDate(lead.created_at)}</span>
                          <span className="status-badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
