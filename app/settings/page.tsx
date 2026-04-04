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
  sunday:    { open: "00:00", close: "00:00", closed: true },
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#7a8499", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 20px 10px" }}>{title}</p>
      <div style={{ background: "#161a22", border: "1px solid rgba(255,255,255,0.07)", margin: "0 20px", borderRadius: 16, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)", gap: 12 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#e8eaf0", flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

function FieldInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ background: "transparent", border: "none", outline: "none", color: "#f0f2f7", fontSize: 14, textAlign: "right", width: "100%", fontFamily: "inherit" }} />
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 26, borderRadius: 13, background: value ? "#3bb7ff" : "#374151", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 21 : 3, transition: "left 0.2s" }} />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [hours, setHours] = useState<Record<string, { open: string; close: string; closed: boolean }>>(DEFAULT_HOURS);
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
    if (data) {
      setBusiness(data);
      if (data.business_hours) setHours(data.business_hours);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!business) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      name: business.name,
      owner_name: business.owner_name,
      phone: business.phone,
      notification_phone: business.notification_phone,
      sms_enabled: business.sms_enabled,
      business_hours: hours,
    }).eq("id", BUSINESS_ID);
    setSaving(false);
    if (error) { setSaveMsg("❌ Failed to save."); return; }
    setSaveMsg("✅ Saved!");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleTestIt = async () => {
    setTesting(true);
    setTestMsg("");
    const { data, error } = await supabase.from("leads").insert({
      business_id: BUSINESS_ID,
      caller_phone: business?.phone ?? "+10000000000",
      customer_name: "Test Customer",
      issue_type: "leaky_faucet_pipe",
      status: "new",
      description: "This is a test lead from Settings.",
      preferred_time: "asap",
    }).select().single();
    setTesting(false);
    if (error) { setTestMsg("❌ Test failed: " + error.message); return; }
    setTestMsg("✅ Test lead created! Opening...");
    if (data) setTimeout(() => router.push(`/lead/${data.id}`), 1200);
  };

  const updateHour = (key: string, field: string, value: string | boolean) => {
    setHours(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100svh", background: "#0a0c10", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#3bb7ff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0a0c10; color: #f0f2f7; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .page { max-width: 480px; margin: 0 auto; min-height: 100svh; padding-bottom: 120px; animation: fadeUp 0.3s ease; }
        .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 24px; }
        .top-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .back-btn { background: none; border: none; color: #7a8499; font-size: 14px; cursor: pointer; }
        .save-bar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; background: rgba(10,12,16,0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(255,255,255,0.08); padding: 12px 20px 28px; z-index: 50; }
        .btn-save { width: 100%; padding: 17px; background: #3bb7ff; color: #000; font-size: 16px; font-weight: 800; border: none; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.18s; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-save:not(:disabled):active { transform: scale(0.98); }
        .save-msg { text-align: center; font-size: 14px; font-weight: 600; color: #22c55e; margin-top: 8px; min-height: 20px; }
        .spinner { width: 18px; height: 18px; border: 3px solid rgba(0,0,0,0.2); border-top-color: #000; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
        .hours-row { display: flex; align-items: center; gap: 8px; padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .hours-row:last-child { border-bottom: none; }
        .day-label { font-size: 13px; font-weight: 700; color: #e8eaf0; width: 36px; flex-shrink: 0; }
        .time-input { background: #1e2330; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 8px; color: #f0f2f7; font-size: 13px; font-family: inherit; outline: none; width: 76px; }
        .time-sep { color: #7a8499; font-size: 13px; }
        .test-btn { width: calc(100% - 40px); margin: 0 20px; padding: 16px; background: #1e2330; border: 1.5px solid rgba(255,255,255,0.1); color: #f0f2f7; font-size: 15px; font-weight: 700; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.18s; }
        .test-btn:active { background: #2a3142; }
        .test-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .test-msg { text-align: center; font-size: 14px; font-weight: 600; color: #22c55e; margin: 10px 20px 0; }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <button className="back-btn" onClick={() => router.push("/leads")}>← Leads</button>
          <h1 className="top-title">⚙️ Settings</h1>
        </div>

        {/* Business Info */}
        <Section title="Business Info">
          <SettingRow label="Business name">
            <FieldInput value={business?.name ?? ""} onChange={(v) => setBusiness(b => b ? { ...b, name: v } : b)} placeholder="e.g. Denis Plumbing" />
          </SettingRow>
          <SettingRow label="Owner name">
            <FieldInput value={business?.owner_name ?? ""} onChange={(v) => setBusiness(b => b ? { ...b, owner_name: v } : b)} placeholder="e.g. Denis" />
          </SettingRow>
          <SettingRow label="Business phone" last>
            <FieldInput value={business?.phone ?? ""} onChange={(v) => setBusiness(b => b ? { ...b, phone: v } : b)} placeholder="+1 555 000 0000" type="tel" />
          </SettingRow>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow label="SMS alerts">
            <Toggle value={business?.sms_enabled ?? true} onChange={(v) => setBusiness(b => b ? { ...b, sms_enabled: v } : b)} />
          </SettingRow>
          <SettingRow label="Notify number" last>
            <FieldInput value={business?.notification_phone ?? ""} onChange={(v) => setBusiness(b => b ? { ...b, notification_phone: v } : b)} placeholder="+1 555 000 0000" type="tel" />
          </SettingRow>
        </Section>

        {/* Business Hours */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#7a8499", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 20px 10px" }}>Business Hours</p>
          <div style={{ background: "#161a22", border: "1px solid rgba(255,255,255,0.07)", margin: "0 20px", borderRadius: 16, overflow: "hidden" }}>
            {DAYS.map(({ key, label }) => {
              const h = hours[key] ?? { open: "08:00", close: "18:00", closed: false };
              return (
                <div key={key} className="hours-row">
                  <span className="day-label">{label}</span>
                  {h.closed ? (
                    <span style={{ fontSize: 13, color: "#7a8499", flex: 1 }}>Closed all day</span>
                  ) : (
                    <>
                      <input type="time" value={h.open} onChange={(e) => updateHour(key, "open", e.target.value)} className="time-input" />
                      <span className="time-sep">–</span>
                      <input type="time" value={h.close} onChange={(e) => updateHour(key, "close", e.target.value)} className="time-input" />
                    </>
                  )}
                  <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                    <Toggle value={!h.closed} onChange={(v) => updateHour(key, "closed", !v)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Test It */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#7a8499", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 20px 10px" }}>Test</p>
          <button className="test-btn" onClick={handleTestIt} disabled={testing}>
            {testing
              ? <><span className="spinner" style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "#fff" }} /> Creating test lead...</>
              : "🧪 Simulate a New Lead"
            }
          </button>
          {testMsg && <p className="test-msg">{testMsg}</p>}
        </div>
      </div>

      {/* Save bar */}
      <div className="save-bar">
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : "Save Settings"}
        </button>
        {saveMsg && <p className="save-msg">{saveMsg}</p>}
      </div>
    </>
  );
}
