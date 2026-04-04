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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:          { label: "New",        color: "#fff",    bg: "#2563eb" },
  accepted:     { label: "Accepted",   color: "#fff",    bg: "#16a34a" },
  time_offered: { label: "Offered",    color: "#92400e", bg: "#fde68a" },
  completed:    { label: "Completed",  color: "#fff",    bg: "#0891b2" },
  declined:     { label: "Passed",     color: "#9ca3af", bg: "#1f2937" },
  no_answer:    { label: "No Answer",  color: "#fff",    bg: "#7c3aed" },
  missed:       { label: "Missed",     color: "#fff",    bg: "#dc2626" },
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
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function urgencyDot(lead: Lead): string {
  if (lead.issue_type === "emergency_flooding") return "#dc2626";
  if (lead.preferred_time === "asap") return "#dc2626";
  if (lead.preferred_time === "today_tomorrow") return "#f59e0b";
  return "#4b5563";
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "accepted", label: "Accepted" },
  { id: "completed", label: "Completed" },
  { id: "no_answer", label: "No Answer" },
  { id: "declined", label: "Passed" },
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

  const counts = FILTERS.reduce((acc, f) => {
    acc[f.id] = f.id === "all" ? leads.length : leads.filter(l => l.status === f.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0a0c10; color: #f0f2f7; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .layout { display: flex; min-height: 100svh; }

        /* Sidebar — desktop only */
        .sidebar { display: none; }
        @media (min-width: 768px) {
          .sidebar {
            display: flex; flex-direction: column;
            width: 240px; flex-shrink: 0;
            background: #111318; border-right: 1px solid rgba(255,255,255,0.07);
            padding: 28px 16px; position: sticky; top: 0; height: 100vh;
          }
        }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 0 8px 28px; border-bottom: 1px solid rgba(255,255,255,0.07); margin-bottom: 20px; }
        .sidebar-logo-icon { width: 36px; height: 36px; background: #3bb7ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .sidebar-logo-name { font-size: 17px; font-weight: 800; color: #f0f2f7; }
        .sidebar-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: #7a8499; transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; }
        .sidebar-item:hover { background: rgba(255,255,255,0.05); color: #f0f2f7; }
        .sidebar-item.active { background: rgba(59,183,255,0.12); color: #3bb7ff; }
        .sidebar-item-count { margin-left: auto; font-size: 12px; background: rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 100px; }
        .sidebar-item.active .sidebar-item-count { background: rgba(59,183,255,0.2); }
        .sidebar-bottom { padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; flex-direction: column; gap: 4px; }

        /* Main content */
        .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

        /* Top bar — mobile */
        .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 0; }
        @media (min-width: 768px) { .top-bar { padding: 28px 32px 0; } }
        .top-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        @media (min-width: 768px) { .top-title { font-size: 28px; } }
        .top-right { display: flex; align-items: center; gap: 10px; }
        .refresh-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #7a8499; font-size: 16px; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .logout-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #7a8499; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
        .settings-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #f0f2f7; font-size: 16px; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        /* Mobile filters */
        .mobile-filters { display: flex; gap: 8px; padding: 16px 20px 8px; overflow-x: auto; scrollbar-width: none; }
        .mobile-filters::-webkit-scrollbar { display: none; }
        @media (min-width: 768px) { .mobile-filters { display: none; } }
        .filter-btn { flex-shrink: 0; padding: 7px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; border: 1.5px solid rgba(255,255,255,0.08); background: #161a22; color: #7a8499; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
        .filter-btn.active { background: #3bb7ff; border-color: #3bb7ff; color: #000; }

        /* Stats row — desktop */
        .stats-row { display: none; }
        @media (min-width: 768px) {
          .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 20px 32px; }
        }
        .stat-card { background: #161a22; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 16px 20px; }
        .stat-value { font-size: 28px; font-weight: 800; color: #f0f2f7; letter-spacing: -0.5px; }
        .stat-label { font-size: 13px; color: #7a8499; margin-top: 4px; }

        /* Leads list */
        .leads-container { padding: 0; }
        @media (min-width: 768px) { .leads-container { padding: 0 32px 32px; } }
        .count-badge { font-size: 13px; color: #7a8499; padding: 4px 20px 10px; }
        @media (min-width: 768px) { .count-badge { padding: 4px 0 12px; } }
        .date-group-label { font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 20px 6px; }
        @media (min-width: 768px) { .date-group-label { padding: 12px 0 6px; } }
        .leads-list { display: flex; flex-direction: column; }
        @media (min-width: 768px) {
          .leads-list { background: #161a22; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; overflow: hidden; }
        }
        .lead-row { display: flex; align-items: center; gap: 14px; padding: 14px 20px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); animation: fadeUp 0.2s ease both; transition: background 0.15s; -webkit-tap-highlight-color: transparent; }
        @media (min-width: 768px) { .lead-row { padding: 16px 20px; } .lead-row:hover { background: rgba(255,255,255,0.03); } }
        .lead-row:last-child { border-bottom: none; }
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

      <div className="layout">
        {/* Desktop Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">🔧</div>
            <span className="sidebar-logo-name">WeKatch</span>
          </div>
          <nav className="sidebar-nav">
            {FILTERS.map(f => (
              <button key={f.id} className={`sidebar-item ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
                {f.id === "all" ? "📋" : f.id === "new" ? "🔵" : f.id === "accepted" ? "✅" : f.id === "completed" ? "🏁" : f.id === "no_answer" ? "📵" : "✗"} {f.label}
                {counts[f.id] > 0 && <span className="sidebar-item-count">{counts[f.id]}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button className="sidebar-item" onClick={() => router.push("/settings")}>⚙️ Settings</button>
            <button className="sidebar-item" onClick={handleLogout}>← Log out</button>
          </div>
        </aside>

        {/* Main content */}
        <div className="main">
          <div className="top-bar">
            <h1 className="top-title">📋 Leads</h1>
            <div className="top-right">
              <button className="refresh-btn" onClick={fetchLeads}>↻</button>
              <button className="settings-btn" onClick={() => router.push("/settings")}>⚙️</button>
              <button className="logout-btn" onClick={handleLogout}>Log out</button>
            </div>
          </div>

          {/* Mobile filters */}
          <div className="mobile-filters">
            {FILTERS.map(f => (
              <button key={f.id} className={`filter-btn ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
                {f.label} {counts[f.id] > 0 ? `(${counts[f.id]})` : ""}
              </button>
            ))}
          </div>

          {/* Desktop stats */}
          <div className="stats-row">
            <div className="stat-card">
              <p className="stat-value">{leads.length}</p>
              <p className="stat-label">Total leads</p>
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: "#2563eb" }}>{counts.new}</p>
              <p className="stat-label">New</p>
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: "#16a34a" }}>{counts.accepted}</p>
              <p className="stat-label">Accepted</p>
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: "#0891b2" }}>{counts.completed}</p>
              <p className="stat-label">Completed</p>
            </div>
          </div>

          {/* Leads */}
          {loading ? (
            <div className="loading-state"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p className="empty-title">No leads here</p>
              <p className="empty-sub">{filter === "all" ? "When customers submit requests, they'll appear here." : `No ${filter} leads yet.`}</p>
            </div>
          ) : (
            <div className="leads-container">
              <p className="count-badge">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</p>
              <div className="leads-list">
                {filtered.map((lead, i) => {
                  const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: "#fff", bg: "#374151" };
                  return (
                    <div key={lead.id} className="lead-row" style={{ animationDelay: `${i * 0.03}s` }}
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}
