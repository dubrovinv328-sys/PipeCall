"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    setError("");
    if (!phone.trim()) { setError("Please enter your phone number."); return; }
    setLoading(true);
    const formatted = phone.startsWith("+") ? phone : `+${phone}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep("otp");
  };

  const handleVerifyCode = async () => {
    setError("");
    if (!otp.trim()) { setError("Please enter the 6-digit code."); return; }
    setLoading(true);
    const formatted = phone.startsWith("+") ? phone : `+${phone}`;
    const { error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push("/leads");
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; background: #0a0c10; color: #f0f2f7; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .page { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; max-width: 400px; margin: 0 auto; animation: fadeUp 0.3s ease; }
        .logo { width: 64px; height: 64px; background: #3bb7ff; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 28px; box-shadow: 0 0 40px rgba(59,183,255,0.3); }
        .title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
        .subtitle { font-size: 15px; color: #7a8499; margin-bottom: 36px; text-align: center; line-height: 1.5; }
        .field-group { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .field-label { font-size: 13px; font-weight: 600; color: #7a8499; text-transform: uppercase; letter-spacing: 0.5px; }
        .field-input { width: 100%; background: #161a22; border: 1.5px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; color: #f0f2f7; font-size: 18px; font-weight: 600; outline: none; transition: border-color 0.18s; letter-spacing: 1px; }
        .field-input:focus { border-color: #3bb7ff; }
        .field-input::placeholder { color: #4b5563; font-weight: 400; letter-spacing: 0; }
        .btn { width: 100%; padding: 17px; background: #3bb7ff; color: #000; font-size: 16px; font-weight: 800; border: none; border-radius: 12px; cursor: pointer; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.18s; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn:not(:disabled):active { transform: scale(0.98); }
        .spinner { width: 20px; height: 20px; border: 3px solid rgba(0,0,0,0.2); border-top-color: #000; border-radius: 50%; animation: spin 0.7s linear infinite; }
        .error { color: #f87171; font-size: 14px; font-weight: 500; margin-top: 8px; text-align: center; }
        .back-btn { margin-top: 16px; background: none; border: none; color: #7a8499; font-size: 14px; cursor: pointer; padding: 8px; }
        .back-btn:active { opacity: 0.6; }
        .otp-hint { font-size: 13px; color: #7a8499; text-align: center; margin-top: 12px; line-height: 1.5; }
      `}</style>

      <div className="page">
        <div className="logo">🔧</div>

        {step === "phone" ? (
          <>
            <h1 className="title">Welcome back</h1>
            <p className="subtitle">Enter your phone number to receive a login code</p>
            <div className="field-group">
              <label className="field-label">Phone number</label>
              <input
                className="field-input"
                type="tel"
                inputMode="tel"
                placeholder="+1 555 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                autoFocus
              />
            </div>
            {error && <p className="error">⚠️ {error}</p>}
            <button className="btn" onClick={handleSendCode} disabled={loading}>
              {loading ? <span className="spinner" /> : "Send Code →"}
            </button>
          </>
        ) : (
          <>
            <h1 className="title">Check your phone</h1>
            <p className="subtitle">Enter the 6-digit code sent to<br /><strong style={{ color: "#f0f2f7" }}>{phone}</strong></p>
            <div className="field-group">
              <label className="field-label">6-digit code</label>
              <input
                className="field-input"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                autoFocus
              />
            </div>
            {error && <p className="error">⚠️ {error}</p>}
            <button className="btn" onClick={handleVerifyCode} disabled={loading || otp.length < 6}>
              {loading ? <span className="spinner" /> : "Verify & Log In →"}
            </button>
            <p className="otp-hint">Didn&apos;t get a code?</p>
            <button className="back-btn" onClick={() => { setStep("phone"); setOtp(""); setError(""); }}>
              ← Change phone number
            </button>
          </>
        )}
      </div>
    </>
  );
}
