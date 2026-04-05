"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUSINESS_ID = "315a6978-ab9a-4c66-a0ec-97caf3d71796";

const DAYS = [
  { key: "monday",    label: "Mon" },
  { key: "tuesday",   label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday",  label: "Thu" },
  { key: "friday",    label: "Fri" },
  { key: "saturday",  label: "Sat" },
  { key: "sunday",    label: "Sun" },
];

const DEFAULT_HOURS: Record<string, { open: string; close: string; closed: boolean }> = {
  monday:    { open: "08:00", close: "18:00", closed: false },
  tuesday:   { open: "08:00", close: "18:00", closed: false },
  wednesday: { open: "08:00", close: "18:00", closed: false },
  thursday:  { open: "08:00", close: "18:00", closed: false },
  friday:    { open: "08:00", close: "18:00", closed: false },
  saturday:  { open: "09:00", close: "14:00", closed: false },
  sunday:    { open: "00:00", close: "00:00", closed: true  },
};

type Business = {
  id: string;
  name: string;
  owner_name?: string;
  phone: string;
  twilio_phone?: string;
  email?: string;
  sms_enabled?: boolean;
  notification_phone?: string;
  business_hours?: Record<string, { open: string; close: string; closed: boolean }>;
};

/* ── WeKatch K-mark SVG ── */
function WeKatchLogo({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ width: 44, height: 26, borderRadius: 13, background: value ? "#f97316" : "#cbd5e1", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 16, background: "#f97316", borderRadius: 2 }} />
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a2b5e", letterSpacing: "-0.2px" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: last ? "none" : "1px solid #f1f5f9", gap: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b", flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ background: "transparent", border: "none", outline: "none", color: "#1a2b5e", fontSize: 13, fontWeight: 600, textAlign: "right", width: "100%", fontFamily: "inherit" }} />
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      fetchBusiness();
    };
    checkAuth();
  }, [router]);

  const fetchBusiness = async () => {
    setLoading(true);
    const { data } = await supabase.from("businesses").select("*").eq("id", BUSINESS_ID).single();
    if (data) { setBusiness(data); if (data.business_hours) setHours(data.business_hours); }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      name: business.name, owner_name: business.owner_name,
      phone: business.phone, notification_phone: business.notification_phone,
      sms_enabled: business.sms_enabled, business_hours: hours,
    }).eq("id", BUSINESS_ID);
    setSaving(false);
    if (error) { setSaveMsg("❌ Failed to save."); return; }
    setSaveMsg("✅ Saved!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleTestIt = async () => {
    setTesting(true); setTestMsg("");
    const { data, error } = await supabase.from("leads").insert({
      business_id: BUSINESS_ID, caller_phone: business?.phone ?? "+10000000000",
      customer_name: "Test Customer", issue_type: "leaky_faucet_pipe",
      status: "new", description: "This is a test lead from Settings.", preferred_time: "asap",
    }).select().single();
    setTesting(false);
    if (error) { setTestMsg("❌ Test failed: " + error.message); return; }
    setTestMsg("✅ Test lead created! Opening...");
    if (data) setTimeout(() => router.push(`/lead/${data.id}`), 1200);
  };

  const updateHour = (key: string, field: string, value: string | boolean) =>
    setHours(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) return (
    <div style={{ minHeight: "100svh", background: "#f4f6fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#f97316", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #f4f6fb; color: #1a2b5e; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        :root {
          --navy: #1a2b5e;
          --orange: #f97316;
          --bg: #f4f6fb;
          --white: #ffffff;
          --border: #e2e8f0;
          --muted: #64748b;
          --sidebar-w: 240px;
        }

        .layout { display: flex; min-height: 100svh; }

        /* Sidebar */
        .sidebar { display: none; }
        @media (min-width: 768px) {
          .sidebar {
            display: flex; flex-direction: column;
            width: var(--sidebar-w); flex-shrink: 0;
            background: var(--navy); position: sticky; top: 0; height: 100vh;
          }
        }
        .sidebar-header { padding: 24px 20px 22px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-nav { flex: 1; padding: 20px 12px; display: flex; flex-direction: column; gap: 2px; }
        .sidebar-section-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1px; padding: 12px 8px 6px; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.6); transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }
        .nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
        .nav-item.active { background: var(--orange); color: white; }
        .sidebar-footer { padding: 16px 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 2px; }
        .nav-item-footer { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.5); transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }
        .nav-item-footer:hover { background: rgba(255,255,255,0.08); color: white; }

        /* Main */
        .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

        /* Topbar */
        .topbar { background: var(--white); border-bottom: 1px solid var(--border); padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .page-title { font-size: 20px; font-weight: 800; color: var(--navy); letter-spacing: -0.4px; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .btn-outline { padding: 8px 18px; border-radius: 8px; border: 1.5px solid var(--border); background: none; color: var(--muted); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .btn-outline:hover { border-color: var(--navy); color: var(--navy); }
        .btn-primary { padding: 8px 20px; border-radius: 8px; border: none; background: var(--orange); color: white; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; display: flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: #ea6c0c; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .save-msg { font-size: 13px; font-weight: 600; color: #15803d; }

        /* Content */
        .content { padding: 28px 32px; animation: fadeUp 0.3s ease; }
        .content-title { font-size: 22px; font-weight: 800; color: var(--navy); letter-spacing: -0.5px; margin-bottom: 24px; }

        /* Card grid */
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
        .grid-full { grid-column: 1 / -1; }

        /* Hours table */
        .hours-row { display: flex; align-items: center; gap: 10px; padding: 11px 20px; border-bottom: 1px solid #f1f5f9; }
        .hours-row:last-child { border-bottom: none; }
        .day-label { font-size: 13px; font-weight: 700; color: #1a2b5e; width: 36px; flex-shrink: 0; }
        .time-input { background: #f4f6fb; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 5px 8px; color: #1a2b5e; font-size: 12px; font-weight: 600; font-family: inherit; outline: none; width: 80px; transition: border-color 0.15s; }
        .time-input:focus { border-color: #f97316; }
        .time-sep { color: #94a3b8; font-size: 12px; }
        .closed-label { font-size: 12px; color: #94a3b8; font-weight: 500; flex: 1; }

        /* Test button */
        .test-btn { width: 100%; padding: 14px 20px; background: #f4f6fb; border: 1.5px dashed #cbd5e1; color: #1a2b5e; font-size: 14px; font-weight: 700; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.18s; font-family: inherit; margin: 16px 20px; width: calc(100% - 40px); }
        .test-btn:hover { border-color: #f97316; color: #f97316; background: #fff7ed; }
        .test-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .test-msg { font-size: 13px; font-weight: 600; color: #15803d; padding: 0 20px 16px; text-align: center; }

        .spinner { width: 16px; height: 16px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
        .spinner-dark { width: 16px; height: 16px; border: 2.5px solid rgba(26,43,94,0.2); border-top-color: #1a2b5e; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }

        /* Mobile topbar logo */
        .mobile-logo { display: flex; }
        @media (min-width: 768px) { .mobile-logo { display: none; } }
      `}</style>

      <div className="layout">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <WeKatchLogo size={34} />
          </div>
          <nav className="sidebar-nav">
            <span className="sidebar-section-label">Navigation</span>
            <button className="nav-item" onClick={() => router.push("/leads")}>📋 Leads</button>
            <button className="nav-item active">⚙️ Settings</button>
          </nav>
          <div className="sidebar-footer">
            <button className="nav-item-footer" onClick={handleLogout}>← Log out</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="main">

          {/* Topbar */}
          <div className="topbar">
            <div className="topbar-left">
              <div className="mobile-logo"><WeKatchLogo size={28} /></div>
              <h1 className="page-title">Settings</h1>
            </div>
            <div className="topbar-right">
              {saveMsg && <span className="save-msg">{saveMsg}</span>}
              <button className="btn-outline" onClick={() => router.push("/leads")}>← Leads</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : "Save Settings"}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="content">
            <div className="grid">

              {/* Company Profile */}
              <Card title="Company Profile">
                <FieldRow label="Business name">
                  <TextInput value={business?.name ?? ""} onChange={v => setBusiness(b => b ? { ...b, name: v } : b)} placeholder="e.g. Denis Plumbing" />
                </FieldRow>
                <FieldRow label="Owner name">
                  <TextInput value={business?.owner_name ?? ""} onChange={v => setBusiness(b => b ? { ...b, owner_name: v } : b)} placeholder="e.g. Denis" />
                </FieldRow>
                <FieldRow label="Business phone" last>
                  <TextInput value={business?.phone ?? ""} onChange={v => setBusiness(b => b ? { ...b, phone: v } : b)} placeholder="+1 555 000 0000" type="tel" />
                </FieldRow>
              </Card>

              {/* Notification Preferences */}
              <Card title="Notification Preferences">
                <FieldRow label="SMS alerts">
                  <Toggle value={business?.sms_enabled ?? true} onChange={v => setBusiness(b => b ? { ...b, sms_enabled: v } : b)} />
                </FieldRow>
                <FieldRow label="Notify number" last>
                  <TextInput value={business?.notification_phone ?? ""} onChange={v => setBusiness(b => b ? { ...b, notification_phone: v } : b)} placeholder="+1 555 000 0000" type="tel" />
                </FieldRow>
              </Card>

              {/* Business Hours — full width */}
              <div className="grid-full">
                <Card title="Business Hours">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    {DAYS.map(({ key, label }, i) => {
                      const h = hours[key] ?? { open: "08:00", close: "18:00", closed: false };
                      const isRight = i % 2 === 1;
                      return (
                        <div key={key} className="hours-row" style={{ borderRight: isRight ? "none" : "1px solid #f1f5f9" }}>
                          <span className="day-label">{label}</span>
                          {h.closed ? (
                            <span className="closed-label">Closed</span>
                          ) : (
                            <>
                              <input type="time" value={h.open} onChange={e => updateHour(key, "open", e.target.value)} className="time-input" />
                              <span className="time-sep">–</span>
                              <input type="time" value={h.close} onChange={e => updateHour(key, "close", e.target.value)} className="time-input" />
                            </>
                          )}
                          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                            <Toggle value={!h.closed} onChange={v => updateHour(key, "closed", !v)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>

              {/* Test Lead */}
              <div className="grid-full">
                <Card title="Test">
                  <button className="test-btn" onClick={handleTestIt} disabled={testing}>
                    {testing
                      ? <><span className="spinner-dark" /> Creating test lead...</>
                      : "🧪 Simulate a New Lead"
                    }
                  </button>
                  {testMsg && <p className="test-msg">{testMsg}</p>}
                </Card>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
