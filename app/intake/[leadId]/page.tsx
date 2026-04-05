"use client";
import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type IssueCategory = { id: string; emoji: string; label: string; sublabel: string; urgent?: boolean; };
type PhotoFile = { file: File; preview: string; };

const ISSUE_CATEGORIES: IssueCategory[] = [
  { id: "leaky_faucet_pipe", emoji: "💧", label: "Leaky Faucet", sublabel: "or Pipe" },
  { id: "clogged_drain", emoji: "🚿", label: "Clogged Drain", sublabel: "Slow or blocked" },
  { id: "toilet_issue", emoji: "🚽", label: "Toilet Issue", sublabel: "Running, clogged, broken" },
  { id: "water_heater", emoji: "🔥", label: "Water Heater", sublabel: "No hot water / leak" },
  { id: "sewer_sewage", emoji: "⚠️", label: "Sewer / Sewage", sublabel: "Backup or smell" },
  { id: "installation", emoji: "🔧", label: "Installation", sublabel: "Replacement / new fixture" },
  { id: "emergency_flooding", emoji: "🚨", label: "Emergency", sublabel: "Flooding / burst pipe", urgent: true },
  { id: "other", emoji: "❓", label: "Other", sublabel: "Something else" },
];

const TIME_OPTIONS = [
  { id: "asap", emoji: "🚨", label: "ASAP", sublabel: "It is urgent" },
  { id: "today_tomorrow", emoji: "📅", label: "Today or tomorrow", sublabel: "Within 24–48 hrs" },
  { id: "this_week", emoji: "🗓️", label: "This week", sublabel: "Flexible timing" },
  { id: "quote_only", emoji: "💬", label: "Just a quote", sublabel: "No rush right now" },
];

const STEPS = ["Issue", "Details", "Schedule", "Confirm"];

type FormData = {
  issueId?: string;
  description?: string;
  photoPaths?: string[];
  timePreference?: string;
  name?: string;
  phone?: string;
};

async function compressImage(file: File, maxMB = 1): Promise<File> {
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size <= maxBytes) return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const scale = Math.sqrt(maxBytes / file.size);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { if (!blob) return reject(new Error("Compression failed")); resolve(new File([blob], file.name, { type: "image/jpeg" })); },
        "image/jpeg", 0.85
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ── WeKatch K-mark — adapts to dark/light context ── */
function WeKatchMark({ light = false }: { light?: boolean }) {
  const stroke = light ? "#1a2b5e" : "white";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <svg width="32" height="32" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="4" width="6" height="30" rx="2.5" fill={stroke}/>
        <path d="M13 19 L30 4 L37 4 L37 9 L19 21 Z" fill={stroke}/>
        <path d="M13 19 L30 34 L37 34 L37 29 L19 17 Z" fill={stroke}/>
        <circle cx="14" cy="19" r="5.5" fill="#f97316"/>
      </svg>
      <span style={{ fontSize: 17, fontWeight: 700, color: light ? "#1a2b5e" : "white", letterSpacing: "-0.3px", lineHeight: 1, fontFamily: "system-ui, sans-serif" }}>
        We<span style={{ fontWeight: 800, color: "#f97316" }}>Katch</span>
      </span>
    </div>
  );
}

function StepIndicator({ current, light }: { current: number; light?: boolean }) {
  return (
    <div className={`step-indicator ${light ? "light" : ""}`}>
      {STEPS.map((label, i) => (
        <div key={label} className={`step ${i < current ? "done" : i === current ? "active" : "pending"}`}>
          <div className="step-dot">
            {i < current ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (<span>{i + 1}</span>)}
          </div>
          <span className="step-label">{label}</span>
          {i < STEPS.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  );
}

function Step1({ onNext }: { onNext: (issueId: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const handleContinue = () => { if (!selected) { setShowError(true); return; } onNext(selected); };
  return (
    <div className="step-content">
      <div className="step-header">
        <h1 className="step-title">What&apos;s the issue?</h1>
        <p className="step-subtitle">Select the category that best describes your problem</p>
      </div>
      <div className="issue-grid">
        {ISSUE_CATEGORIES.map((cat) => (
          <button key={cat.id} type="button"
            onClick={() => { setSelected(cat.id); setShowError(false); }}
            className={`issue-card ${selected === cat.id ? "selected" : ""} ${cat.urgent ? "urgent" : ""}`}>
            <span className="card-emoji">{cat.emoji}</span>
            <span className="card-label">{cat.label}</span>
            <span className="card-sublabel">{cat.sublabel}</span>
            {selected === cat.id && <span className="card-check">✓</span>}
          </button>
        ))}
      </div>
      {showError && <p className="validation-error">⚠️ Please select an issue type to continue.</p>}
      <div className="step-footer">
        <button type="button" className="btn-primary" onClick={handleContinue}>
          Continue
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.75 9H14.25M14.25 9L9.75 4.5M14.25 9L9.75 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function Step2({ leadId, onNext, onBack }: { leadId: string; onNext: (data: { description: string; photoPaths: string[] }) => void; onBack: () => void; }) {
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const toAdd = files.slice(0, 3 - photos.length);
    setPhotos((prev) => [...prev, ...toAdd.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  };

  const handleContinue = async () => {
    setUploading(true);
    const paths: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      try {
        const compressed = await compressImage(photos[i].file);
        const ext = compressed.name.split(".").pop() || "jpg";
        const path = `leads/${leadId}/${Date.now()}_${i}.${ext}`;
        const { error } = await supabase.storage.from("lead-photos").upload(path, compressed, { upsert: true });
        if (error) throw error;
        paths.push(path);
      } catch (err) { console.error("Upload error:", err); }
    }
    setUploading(false);
    onNext({ description, photoPaths: paths });
  };

  return (
    <div className="step-content">
      <div className="step-header">
        <h1 className="step-title">Describe the issue</h1>
        <p className="step-subtitle">Optional — helps the plumber prepare before arrival</p>
      </div>
      <div className="desktop-two-col">
        <div className="field-group">
          <label className="field-label">Description <span className="field-optional">optional</span></label>
          <textarea className="field-textarea" placeholder="e.g. Water dripping under the kitchen sink, started 2 days ago…" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={500} />
          <span className="field-count">{description.length}/500</span>
        </div>
        <div className="field-group">
          <label className="field-label">Photos <span className="field-optional">up to 3, optional</span></label>
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div key={i} className="photo-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Photo ${i + 1}`} />
                <button type="button" className="photo-remove" onClick={() => removePhoto(i)}>✕</button>
              </div>
            ))}
            {photos.length < 3 && (
              <button type="button" className="photo-add" onClick={() => fileInputRef.current?.click()}>
                <span className="photo-add-icon">📷</span>
                <span className="photo-add-label">Add photo</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFileChange} />
          <p className="field-hint">Compressed to under 1MB automatically</p>
        </div>
      </div>
      <div className="step-footer">
        <button type="button" className="btn-back" onClick={onBack}>← Back</button>
        <button type="button" className="btn-primary" onClick={handleContinue} disabled={uploading}>
          {uploading ? "Uploading…" : "Continue"}
          {!uploading && <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.75 9H14.25M14.25 9L9.75 4.5M14.25 9L9.75 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>
      </div>
    </div>
  );
}

function Step3({ initialPhone, onNext, onBack }: { initialPhone?: string; onNext: (data: { timePreference: string; name: string; phone: string }) => void; onBack: () => void; }) {
  const [timePreference, setTimePreference] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone || "");
  const [errors, setErrors] = useState<{ time?: string; phone?: string }>({});

  const handleContinue = () => {
    const newErrors: { time?: string; phone?: string } = {};
    if (!timePreference) newErrors.time = "Please select when you need help.";
    if (!phone.trim()) newErrors.phone = "Phone number is required so we can contact you.";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onNext({ timePreference: timePreference!, name, phone });
  };

  return (
    <div className="step-content">
      <div className="step-header">
        <h1 className="step-title">When &amp; who?</h1>
        <p className="step-subtitle">Pick a time and leave your details</p>
      </div>
      <div className="desktop-two-col">
        <div className="field-group">
          <label className="field-label">When do you need help?</label>
          <div className="time-options">
            {TIME_OPTIONS.map((opt) => (
              <button key={opt.id} type="button"
                className={`time-option ${timePreference === opt.id ? "selected" : ""} ${opt.id === "asap" ? "urgent" : ""}`}
                onClick={() => { setTimePreference(opt.id); setErrors((e) => ({ ...e, time: undefined })); }}>
                <span className="time-emoji">{opt.emoji}</span>
                <div className="time-text">
                  <span className="time-label">{opt.label}</span>
                  <span className="time-sublabel">{opt.sublabel}</span>
                </div>
                <span className="time-radio">{timePreference === opt.id ? "●" : "○"}</span>
              </button>
            ))}
          </div>
          {errors.time && <p className="validation-error">⚠️ {errors.time}</p>}
        </div>
        <div>
          <div className="field-group">
            <label className="field-label">Your name <span className="field-optional">optional</span></label>
            <input className="field-input" type="text" placeholder="e.g. John Smith" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="field-group">
            <label className="field-label">Phone number <span className="field-required">required</span></label>
            <input className={`field-input ${errors.phone ? "input-error" : ""}`} type="tel" placeholder="+1 (555) 000-0000" value={phone}
              onChange={(e) => { setPhone(e.target.value); setErrors((err) => ({ ...err, phone: undefined })); }}
              autoComplete="tel" inputMode="tel" />
            {errors.phone && <p className="validation-error">⚠️ {errors.phone}</p>}
          </div>
        </div>
      </div>
      <div className="step-footer">
        <button type="button" className="btn-back" onClick={onBack}>← Back</button>
        <button type="button" className="btn-primary" onClick={handleContinue}>
          Continue
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.75 9H14.25M14.25 9L9.75 4.5M14.25 9L9.75 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}

function Step4({ leadId, formData, onBack }: { leadId: string; formData: FormData; onBack: () => void }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async () => {
    setStatus("submitting");
    try {
      const { error } = await supabase.from("leads").update({
        issue_type: formData.issueId,
        description: formData.description || null,
        preferred_time: formData.timePreference,
        customer_name: formData.name || null,
        caller_phone: formData.phone,
        status: "new",
      }).eq("id", leadId);
      if (error) throw error;
      setStatus("success");
    } catch (err) { console.error("Submit error:", err); setStatus("error"); }
  };

  const selectedIssue = ISSUE_CATEGORIES.find((c) => c.id === formData.issueId);
  const selectedTime = TIME_OPTIONS.find((t) => t.id === formData.timePreference);
  if (status === "success") return <SuccessScreen />;
  if (status === "error") return <FallbackScreen onRetry={() => setStatus("idle")} />;

  return (
    <div className="step-content confirm-page">
      <div className="step-header">
        <h1 className="step-title confirm-title">Review &amp; submit</h1>
        <p className="step-subtitle" style={{ color: "#64748b" }}>Double-check your details before sending</p>
      </div>
      <div className="summary-card">
        <div className="summary-row"><span className="summary-key">Issue</span><span className="summary-val">{selectedIssue?.emoji} {selectedIssue?.label}</span></div>
        {formData.description && <div className="summary-row"><span className="summary-key">Description</span><span className="summary-val summary-desc">{formData.description}</span></div>}
        {formData.photoPaths && formData.photoPaths.length > 0 && <div className="summary-row"><span className="summary-key">Photos</span><span className="summary-val">{formData.photoPaths.length} attached</span></div>}
        <div className="summary-row"><span className="summary-key">Timing</span><span className="summary-val">{selectedTime?.emoji} {selectedTime?.label}</span></div>
        {formData.name && <div className="summary-row"><span className="summary-key">Name</span><span className="summary-val">{formData.name}</span></div>}
        <div className="summary-row"><span className="summary-key">Phone</span><span className="summary-val">{formData.phone}</span></div>
      </div>

      <div className="step-footer">
        <button type="button" className="btn-back confirm-back" onClick={onBack} disabled={status === "submitting"}>← Edit</button>
        <button type="button" className="btn-submit" onClick={handleSubmit} disabled={status === "submitting"}>
          {status === "submitting" ? <span className="spinner" /> : <>Send Request ✓</>}
        </button>
      </div>
    </div>
  );
}

function FallbackScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="success-screen">
      <div style={{ fontSize: 56, marginBottom: 20 }}>💬</div>
      <h1 className="success-title" style={{ color: "#1a2b5e" }}>Something went wrong</h1>
      <p className="success-subtitle">
        Reply to our text with what you need and we will take care of it.
      </p>
      <button
        onClick={onRetry}
        style={{ marginTop: 8, padding: "12px 28px", background: "#f97316", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
      >
        Try again
      </button>
    </div>
  );
}

function SuccessScreen() {
  const [animate, setAnimate] = useState(false);
  useEffect(() => { setTimeout(() => setAnimate(true), 100); }, []);
  return (
    <div className="success-screen">
      <div className={`checkmark-wrap ${animate ? "animate" : ""}`}>
        <svg className="checkmark-circle" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="#22c55e" strokeWidth="4" strokeDasharray="226" strokeDashoffset={animate ? "0" : "226"} />
        </svg>
        <svg className="checkmark-tick" viewBox="0 0 80 80" fill="none">
          <path d="M24 40L35 52L56 28" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="50" strokeDashoffset={animate ? "0" : "50"} />
        </svg>
      </div>
      <h1 className="success-title">Request sent!</h1>
      <p className="success-subtitle">We&apos;ve received your service request and will be in touch shortly to confirm your appointment.</p>
      <div className="success-badge">📱 Check your phone for updates</div>
    </div>
  );
}

export default function IntakePage() {
  const params = useParams();
  const leadId = params?.leadId as string;
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const isConfirm = currentStep === 3;

  useEffect(() => {
    if (!leadId) return;
    const trackStart = async () => {
      try {
        await supabase.from("events").insert({
          lead_id: leadId, business_id: null,
          event_type: "intake_started",
          event_data: { started_at: new Date().toISOString() },
        });
      } catch (err) { console.error("Failed to track intake_started:", err); }
    };
    trackStart();
  }, [leadId]);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #f4f6fb; --surface: #ffffff; --surface-2: #f4f6fb;
          --border: #e2e8f0; --text: #1a2b5e; --text-muted: #64748b;
          --accent: #f97316; --accent-glow: rgba(249,115,22,0.12);
          --urgent: #ff4d4d; --urgent-glow: rgba(255,77,77,0.15);
          --success: #22c55e; --radius: 16px; --radius-sm: 10px; --blue: #2563eb;
        }
        html, body { height: 100%; font-family: system-ui, sans-serif; font-size: 16px; background: #f4f6fb; }

        .intake-wrapper { min-height: 100svh; display: flex; flex-direction: column; max-width: 560px; margin: 0 auto; background: #ffffff; color: #1a2b5e; }
        
        @media (min-width: 768px) {
          body { background: #eef1f8; }
          .intake-wrapper { max-width: 680px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; box-shadow: 0 4px 32px rgba(26,43,94,0.08); }
          
        }

        /* Top bar */
        .top-bar { display: flex; align-items: center; gap: 10px; padding: 16px 24px; background: #1a2b5e; border-bottom: 2px solid rgba(255,255,255,0.08); }
        .top-bar-brand { display: flex; align-items: center; gap: 9px; flex: 1; flex-shrink: 0; }
        .top-bar-lead { font-size: 12px; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); white-space: nowrap; }
        

        /* Step indicator */
        .step-indicator { display: flex; align-items: flex-start; padding: 20px 24px 4px; }
        .step { display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative; flex: 1; }
        .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 2px solid transparent; position: relative; z-index: 1; }
        .step.active .step-dot { background: #f97316; border-color: #f97316; color: #ffffff; box-shadow: 0 0 16px rgba(249,115,22,0.35); }
        .step.done .step-dot { background: var(--success); border-color: var(--success); color: #fff; }
        .step.pending .step-dot { background: #f1f5f9; border-color: #e2e8f0; color: #94a3b8; }
        .light-mode .step.active .step-dot { background: var(--blue); border-color: var(--blue); color: #fff; }
        .light-mode .step.pending .step-dot { background: #f1f5f9; border-color: #e2e8f0; color: #94a3b8; }
        .step-label { font-size: 11px; font-weight: 500; color: var(--text-muted); white-space: nowrap; }
        .step.active .step-label { color: #f97316; font-weight: 600; }
        .step.done .step-label { color: var(--success); }
        .light-mode .step.active .step-label { color: var(--blue); }
        .step-line { position: absolute; top: 13px; left: calc(50% + 14px); right: calc(-50% + 14px); height: 2px; background: #e2e8f0; }
        .step.done .step-line { background: var(--success); }
        .light-mode .step-line { background: #e2e8f0; }

        /* Step content */
        .step-content { flex: 1; display: flex; flex-direction: column; padding: 8px 24px 0; }
        .step-header { padding: 20px 0 20px; }
        .step-title { font-size: clamp(22px, 5vw, 30px); font-weight: 800; line-height: 1.2; letter-spacing: -0.5px; }
        .step-subtitle { margin-top: 6px; font-size: 14px; color: var(--text-muted); }
        .light-mode .step-subtitle { color: #64748b; }

        .issue-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (min-width: 768px) { .issue-grid { grid-template-columns: repeat(4, 1fr); } }
        .issue-card { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 20px 12px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: var(--radius); cursor: pointer; text-align: center; transition: all 0.18s; -webkit-tap-highlight-color: transparent; min-height: 110px; touch-action: manipulation; }
        .issue-card:hover { border-color: rgba(249,115,22,0.3); background: rgba(249,115,22,0.04); }
        .issue-card:active { transform: scale(0.96); }
        .issue-card.selected { background: rgba(249,115,22,0.1); border-color: #f97316; box-shadow: 0 0 0 1px #f97316; }
        .issue-card.urgent { border-color: rgba(255,77,77,0.3); }
        .issue-card.urgent:hover { border-color: rgba(255,77,77,0.5); background: rgba(255,77,77,0.05); }
        .issue-card.urgent.selected { background: var(--urgent-glow); border-color: var(--urgent); box-shadow: 0 0 0 1px var(--urgent); }
        .card-emoji { font-size: 30px; line-height: 1; }
        .card-label { font-size: 14px; font-weight: 700; line-height: 1.2; }
        .card-sublabel { font-size: 11px; color: var(--text-muted); }
        .issue-card.urgent .card-label { color: #ff7070; }
        .card-check { position: absolute; top: 8px; right: 10px; font-size: 12px; color: var(--accent); font-weight: 700; }
        .issue-card.urgent .card-check { color: var(--urgent); }

        .desktop-two-col { display: flex; flex-direction: column; gap: 0; }
        @media (min-width: 768px) { .desktop-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; } }

        .field-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .field-label { font-size: 14px; font-weight: 600; }
        .field-optional { font-size: 12px; font-weight: 400; color: var(--text-muted); margin-left: 6px; }
        .field-required { font-size: 12px; font-weight: 500; color: #f87171; margin-left: 6px; }
        .field-textarea, .field-input { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: var(--radius-sm); padding: 14px; color: #1a2b5e; font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.18s; width: 100%; }
        .field-textarea { resize: none; line-height: 1.5; }
        .field-textarea:focus, .field-input:focus { border-color: #f97316; }
        .field-textarea::placeholder, .field-input::placeholder { color: var(--text-muted); }
        .field-input.input-error { border-color: #f87171; }
        .light-mode .field-textarea, .light-mode .field-input { background: #f8fafc; border-color: #e2e8f0; color: #111827; }
        .light-mode .field-textarea:focus, .light-mode .field-input:focus { border-color: var(--blue); }
        .light-mode .field-textarea::placeholder, .light-mode .field-input::placeholder { color: #94a3b8; }
        .field-count { font-size: 12px; color: var(--text-muted); text-align: right; }
        .field-hint { font-size: 12px; color: var(--text-muted); }
        .validation-error { font-size: 13px; color: #f87171; font-weight: 500; margin-top: 2px; }

        .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .photo-thumb { position: relative; aspect-ratio: 1; border-radius: var(--radius-sm); overflow: hidden; background: #f4f6fb; }
        .photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .photo-remove { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.7); border: none; color: #fff; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .photo-add { aspect-ratio: 1; border-radius: var(--radius-sm); background: #f8fafc; border: 1.5px dashed #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: border-color 0.15s; }
        .photo-add:hover { border-color: #f97316; }
        .photo-add-icon { font-size: 22px; }
        .photo-add-label { font-size: 11px; color: var(--text-muted); }

        .time-options { display: flex; flex-direction: column; gap: 10px; }
        .time-option { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: var(--radius-sm); cursor: pointer; text-align: left; transition: all 0.18s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; width: 100%; }
        .time-option:hover { border-color: rgba(249,115,22,0.3); }
        .time-option:active { transform: scale(0.98); }
        .time-option.selected { background: rgba(249,115,22,0.1); border-color: #f97316; box-shadow: 0 0 0 1px #f97316; }
        .time-option.urgent { border-color: rgba(255,77,77,0.3); }
        .time-option.urgent.selected { background: var(--urgent-glow); border-color: var(--urgent); box-shadow: 0 0 0 1px var(--urgent); }
        .light-mode .time-option { background: #f8fafc; border-color: #e2e8f0; }
        .light-mode .time-option.selected { background: #eff6ff; border-color: var(--blue); box-shadow: 0 0 0 1px var(--blue); }
        .time-emoji { font-size: 24px; flex-shrink: 0; }
        .time-text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .time-label { font-size: 15px; font-weight: 600; }
        .time-sublabel { font-size: 12px; color: var(--text-muted); }
        .time-option.urgent .time-label { color: #ff7070; }
        .time-radio { font-size: 18px; color: var(--text-muted); flex-shrink: 0; }
        .time-option.selected .time-radio { color: #f97316; }
        .time-option.urgent.selected .time-radio { color: var(--urgent); }
        .light-mode .time-option.selected .time-radio { color: var(--blue); }

        .confirm-page { background: #fff; color: #111827; }
        .confirm-title { color: #111827; }
        .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius); overflow: hidden; margin-bottom: 20px; }
        .summary-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }
        .summary-row:last-child { border-bottom: none; }
        .summary-key { font-size: 13px; color: #64748b; font-weight: 500; min-width: 90px; flex-shrink: 0; padding-top: 1px; }
        .summary-val { font-size: 14px; font-weight: 600; color: #111827; }
        .summary-desc { font-weight: 400; line-height: 1.5; }
        .error-msg { color: #ef4444; font-size: 14px; margin-bottom: 12px; text-align: center; }

        .step-footer { padding: 24px 0 32px; margin-top: auto; display: flex; gap: 10px; }
        .btn-primary { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 17px 24px; background: #f97316; color: #ffffff; font-size: 16px; font-weight: 700; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.18s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .btn-primary:hover { background: #ea6c0c; }
        .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn-primary:not(:disabled):active { transform: scale(0.97); }
        .btn-back { padding: 17px 18px; background: #f1f5f9; color: #64748b; font-size: 15px; font-weight: 600; border: 1.5px solid #e2e8f0; border-radius: var(--radius-sm); cursor: pointer; -webkit-tap-highlight-color: transparent; white-space: nowrap; transition: all 0.15s; }
        .btn-back:hover { border-color: rgba(255,255,255,0.2); color: #1a2b5e; }
        .btn-submit { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 17px 24px; background: var(--blue); color: #fff; font-size: 16px; font-weight: 700; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.18s; min-height: 56px; }
        .btn-submit:hover { background: #1d4ed8; }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .confirm-back { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
        .spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .success-screen { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; background: #fff; text-align: center; }
        .checkmark-wrap { position: relative; width: 100px; height: 100px; margin-bottom: 28px; }
        .checkmark-circle { width: 100%; height: 100%; }
        .checkmark-circle circle { transition: stroke-dashoffset 0.7s cubic-bezier(0.65, 0, 0.45, 1); }
        .checkmark-tick { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
        .checkmark-tick path { transition: stroke-dashoffset 0.4s 0.5s cubic-bezier(0.65, 0, 0.45, 1); }
        .success-title { font-size: 32px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin-bottom: 12px; }
        .success-subtitle { font-size: 16px; color: #475569; line-height: 1.6; max-width: 340px; margin-bottom: 28px; }
        .success-badge { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 100px; padding: 10px 20px; font-size: 14px; font-weight: 600; }
      `}</style>

      <div className={`intake-wrapper ${""}`}>
        {/* Top bar — WeKatch logo */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <WeKatchMark light={false} />
          </div>
          {leadId && <span className="top-bar-lead">#{leadId.slice(0, 8).toUpperCase()}</span>}
        </div>

        <StepIndicator current={currentStep} light={isConfirm} />

        {currentStep === 0 && <Step1 onNext={(issueId) => { setFormData((p) => ({ ...p, issueId })); setCurrentStep(1); }} />}
        {currentStep === 1 && <Step2 leadId={leadId} onNext={(data) => { setFormData((p) => ({ ...p, ...data })); setCurrentStep(2); }} onBack={() => setCurrentStep(0)} />}
        {currentStep === 2 && <Step3 initialPhone={formData.phone} onNext={(data) => { setFormData((p) => ({ ...p, ...data })); setCurrentStep(3); }} onBack={() => setCurrentStep(1)} />}
        {currentStep === 3 && <Step4 leadId={leadId} formData={formData} onBack={() => setCurrentStep(2)} />}
      </div>
    </>
  );
}
