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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:          { label: "New",        color: "#1a2b5e", bg: "#e8edff", border: "#c7d2f8" },
  accepted:     { label: "Accepted",   color: "#14532d", bg: "#dcfce7", border: "#86efac" },
  time_offered: { label: "Offered",    color: "#7c2d12", bg: "#fff7ed", border: "#fed7aa" },
  completed:    { label: "Completed",  color: "#164e63", bg: "#ecfeff", border: "#a5f3fc" },
  declined:     { label: "Passed",     color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  no_answer:    { label: "No Answer",  color: "#581c87", bg: "#faf5ff", border: "#d8b4fe" },
  missed:       { label: "Missed",     color: "#7f1d1d", bg: "#fef2f2", border: "#fca5a5" },
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
  if (lead.issue_type === "emergency_flooding") return "#ef4444";
  if (lead.preferred_time === "asap") return "#ef4444";
  if (lead.preferred_time === "today_tomorrow") return "#f97316";
  return "#d1d5db";
}

const FILTERS = [
  { id: "all",       label: "All",       icon: "📋" },
  { id: "new",       label: "New",       icon: "🔵" },
  { id: "accepted",  label: "Accepted",  icon: "✅" },
  { id: "completed", label: "Completed", icon: "🏁" },
  { id: "no_answer", label: "No Answer", icon: "📵" },
  { id: "declined",  label: "Passed",    icon: "✗"  },
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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f4f6fb; color: #1a2b5e; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        :root {
          --navy: #1a2b5e;
          --navy-light: #2d4a9e;
          --orange: #f97316;
          --orange-light: #fff7ed;
          --bg: #f4f6fb;
          --white: #ffffff;
          --border: #e2e8f0;
          --text: #1a2b5e;
          --text-muted: #64748b;
          --sidebar-w: 240px;
        }

        .layout { display: flex; min-height: 100svh; background: var(--bg); }

        /* ── Sidebar ── */
        .sidebar { display: none; }
        @media (min-width: 768px) {
          .sidebar {
            display: flex; flex-direction: column;
            width: var(--sidebar-w); flex-shrink: 0;
            background: var(--navy); position: sticky; top: 0; height: 100vh;
            padding: 0;
          }
        }

        .sidebar-header { padding: 28px 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-logo { display: flex; align-items: center; gap: 10px; }
        .logo-mark { width: 36px; height: 36px; background: var(--orange); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: white; flex-shrink: 0; letter-spacing: -1px; }
        .logo-text { font-size: 18px; font-weight: 800; color: white; letter-spacing: -0.3px; }
        .logo-text span { color: var(--orange); }

        .sidebar-nav { flex: 1; padding: 20px 12px; display: flex; flex-direction: column; gap: 2px; }
        .sidebar-section-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1px; padding: 12px 8px 6px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.6); transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; }
        .nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
        .nav-item.active { background: var(--orange); color: white; }
        .nav-item.active:hover { background: #ea6a0a; }
        .nav-badge { margin-left: auto; background: rgba(255,255,255,0.15); color: white; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 100px; }
        .nav-item.active .nav-badge { background: rgba(255,255,255,0.25); }

        .sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 2px; }
        .nav-item-footer { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.5); transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; }
        .nav-item-footer:hover { background: rgba(255,255,255,0.08); color: white; }

        /* ── Main ── */
        .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

        /* Top bar */
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .topbar-logo { display: flex; align-items: center; gap: 8px; }
        .topbar-logo-mark { width: 30px; height: 30px; background: var(--navy); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: var(--orange); }
        .topbar-logo-text { font-size: 16px; font-weight: 800; color: var(--navy); letter-spacing: -0.3px; }
        .topbar-logo-text span { color: var(--orange); }
        .page-title { font-size: 18px; font-weight: 800; color: var(--navy); }
        @media (min-width: 768px) { .topbar-logo { display: none; } }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .btn-icon { width: 36px; height: 36px; border-radius: 8px; border: 1.5px solid var(--border); background: none; color: var(--text-muted); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .btn-icon:hover { border-color: var(--navy); color: var(--navy); }
        .btn-logout { padding: 8px 16px; border-radius: 8px; border: 1.5px solid var(--border); background: none; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .btn-logout:hover { border-color: var(--navy); color: var(--navy); }

        /* Mobile filters */
        .mobile-filters { display: flex; gap: 8px; padding: 16px 20px 0; overflow-x: auto; scrollbar-width: none; background: var(--white); border-bottom: 1px solid var(--border); }
        .mobile-filters::-webkit-scrollbar { display: none; }
        @media (min-width: 768px) { .mobile-filters { display: none; } }
        .filter-chip { flex-shrink: 0; padding: 7px 14px; border-radius: 100px; font-size: 13px; font-weight: 600; border: 1.5px solid var(--border); background: none; color: var(--text-muted); cursor: pointer; white-space: nowrap; transition: all 0.15s; font-family: inherit; }
        .filter-chip.active { background: var(--navy); border-color: var(--navy); color: white; }

        /* Content */
        .content { padding: 24px 20px; }
        @media (min-width: 768px) { .content { padding: 28px 32px; } }

        /* Stats */
        .stats-grid { display: none; }
        @media (min-width: 768px) {
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        }
        .stat-card { background: var(--white); border: 1.5px solid var(--border); border-radius: 14px; padding: 20px; transition: border-color 0.15s; }
        .stat-card:hover { border-color: #c7d2f8; }
        .stat-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .stat-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .stat-value { font-size: 32px; font-weight: 800; color: var(--navy); letter-spacing: -1px; line-height: 1; }
        .stat-label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-top: 4px; }

        /* Section header */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-title { font-size: 16px; font-weight: 700; color: var(--navy); }
        .section-count { font-size: 13px; color: var(--text-muted); font-weight: 500; }

        /* Leads table */
        .leads-card { background: var(--white); border: 1.5px solid var(--border); border-radius: 16px; overflow: hidden; }
        .lead-row { display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.12s; -webkit-tap-highlight-color: transparent; animation: fadeUp 0.2s ease both; }
        .lead-row:last-child { border-bottom: none; }
        .lead-row:hover { background: #f8faff; }
        .lead-row:active { background: #f0f4ff; }
        .urgency-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .lead-avatar { width: 40px; height: 40px; border-radius: 10px; background: #e8edff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: var(--navy); flex-shrink: 0; }
        .lead-info { flex: 1; min-width: 0; }
        .lead-name { font-size: 15px; font-weight: 700; color: var(--navy); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lead-meta { font-size: 13px; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .lead-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .time-ago { font-size: 12px; color: var(--text-muted); }
        .status-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px; white-space: nowrap; border: 1px solid; }
        .lead-chevron { color: #cbd5e1; font-size: 14px; flex-shrink: 0; }
        @media (min-width: 768px) { .lead-chevron { display: block; } }

        /* Empty */
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 24px; gap: 12px; text-align: center; }
        .empty-icon { font-size: 48px; margin-bottom: 4px; }
        .empty-title { font-size: 18px; font-weight: 700; color: var(--navy); }
        .empty-sub { font-size: 14px; color: var(--text-muted); max-width: 280px; line-height: 1.5; }

        /* Loading */
        .loading-state { display: flex; align-items: center; justify-content: center; padding: 80px; }
        .spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--orange); border-radius: 50%; animation: spin 0.7s linear infinite; }
      `}</style>

      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="logo-mark">K</div>
              <span className="logo-text">Katch<span>Flow</span></span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <span className="sidebar-section-label">Leads</span>
            {FILTERS.map(f => (
              <button key={f.id} className={`nav-item ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
                <span>{f.icon}</span> {f.label}
                {counts[f.id] > 0 && <span className="nav-badge">{counts[f.id]}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button className="nav-item-footer" onClick={() => router.push("/settings")}>⚙️ Settings</button>
            <button className="nav-item-footer" onClick={handleLogout}>← Log out</button>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          {/* Topbar */}
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-logo">
                <div className="topbar-logo-mark">K</div>
                <span className="topbar-logo-text">Katch<span>Flow</span></span>
              </div>
              <h1 className="page-title">Leads</h1>
            </div>
            <div className="topbar-right">
              <button className="btn-icon" onClick={fetchLeads} title="Refresh">↻</button>
              <button className="btn-icon" onClick={() => router.push("/settings")} title="Settings">⚙️</button>
              <button className="btn-logout" onClick={handleLogout}>Log out</button>
            </div>
          </div>

          {/* Mobile filters */}
          <div className="mobile-filters">
            {FILTERS.map(f => (
              <button key={f.id} className={`filter-chip ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
                {f.label} {counts[f.id] > 0 ? `(${counts[f.id]})` : ""}
              </button>
            ))}
          </div>

          <div className="content">
            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-card-top">
                  <div className="stat-icon" style={{ background: "#e8edff" }}>📋</div>
                </div>
                <div className="stat-value">{leads.length}</div>
                <div className="stat-label">Total Leads</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-top">
                  <div className="stat-icon" style={{ background: "#e8edff" }}>🔵</div>
                </div>
                <div className="stat-value" style={{ color: "#1a2b5e" }}>{counts.new}</div>
                <div className="stat-label">New</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-top">
                  <div className="stat-icon" style={{ background: "#dcfce7" }}>✅</div>
                </div>
                <div className="stat-value" style={{ color: "#15803d" }}>{counts.accepted}</div>
                <div className="stat-label">Accepted</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-top">
                  <div className="stat-icon" style={{ background: "#fff7ed" }}>🏁</div>
                </div>
                <div className="stat-value" style={{ color: "#f97316" }}>{counts.completed}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>

            {/* Leads list */}
            {loading ? (
              <div className="loading-state"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p className="empty-title">No leads here</p>
                <p className="empty-sub">{filter === "all" ? "When customers submit requests, they'll appear here." : `No ${filter} leads yet.`}</p>
              </div>
            ) : (
              <>
                <div className="section-header">
                  <span className="section-title">{filter === "all" ? "All Leads" : FILTERS.find(f => f.id === filter)?.label}</span>
                  <span className="section-count">{filtered.length} lead{filtered.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="leads-card">
                  {filtered.map((lead, i) => {
                    const statusCfg = STATUS_CONFIG[lead.status] ?? { label: lead.status, color: "#64748b", bg: "#f9fafb", border: "#e5e7eb" };
                    const initials = (lead.customer_name || lead.caller_phone).slice(0, 2).toUpperCase();
                    return (
                      <div key={lead.id} className="lead-row" style={{ animationDelay: `${i * 0.03}s` }}
                        onClick={() => router.push(`/lead/${lead.id}`)}>
                        <div className="urgency-dot" style={{ background: urgencyDot(lead) }} />
                        <div className="lead-avatar">{initials}</div>
                        <div className="lead-info">
                          <p className="lead-name">{lead.customer_name || lead.caller_phone}</p>
                          <p className="lead-meta">
                            {lead.issue_type ? ISSUE_LABELS[lead.issue_type] ?? lead.issue_type : "No issue type"} · {lead.caller_phone}
                          </p>
                        </div>
                        <div className="lead-right">
                          <span className="time-ago">{formatDate(lead.created_at)}</span>
                          <span className="status-badge" style={{ background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <span className="lead-chevron">›</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
