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
        @import url('https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,300&family=Barlow+Condensed:wght@800;900&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }

        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .page {
          min-height: 100svh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
          font-family: 'Barlow', sans-serif;
          overflow: hidden;
        }

        @media (max-width: 767px) {
          .page { grid-template-columns: 1fr; }
          .left-panel { display: none; }
        }

        .bg-photo {
          position: fixed;
          inset: 0;
          z-index: 0;
          background-image: url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1920&q=85');
          background-size: cover;
          background-position: center 60%;
        }
        .bg-photo::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            rgba(5, 10, 28, 0.38) 0%,
            rgba(5, 10, 28, 0.55) 45%,
            rgba(5, 10, 28, 0.86) 100%
          );
        }

        /* ── Left branding panel ── */
        .left-panel {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 56px 60px;
          animation: fadeInLeft 0.9s cubic-bezier(.22,1,.36,1) both;
        }

        .logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          position: absolute;
          top: 48px;
          left: 60px;
          animation: fadeInLeft 0.8s cubic-bezier(.22,1,.36,1) 0.05s both;
        }
        .logo-text {
          font-size: 24px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
          line-height: 1;
        }
        .logo-text em { font-style: normal; font-weight: 800; color: #f97316; }

        .headline {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(56px, 5.5vw, 88px);
          font-weight: 900;
          color: white;
          line-height: 0.92;
          letter-spacing: -1px;
          text-transform: uppercase;
          margin-bottom: 20px;
          animation: fadeInLeft 0.9s cubic-bezier(.22,1,.36,1) 0.12s both;
        }
        .headline span { color: #f97316; }
        @media (max-width: 767px) { .headline { margin-top: 80px; } }

        .tagline {
          font-size: 16px;
          font-weight: 300;
          font-style: italic;
          color: rgba(255,255,255,0.62);
          line-height: 1.65;
          max-width: 320px;
          margin-bottom: 36px;
          animation: fadeInLeft 0.9s cubic-bezier(.22,1,.36,1) 0.2s both;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 100px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.88);
          letter-spacing: 0.2px;
          width: fit-content;
          animation: fadeInLeft 0.9s cubic-bezier(.22,1,.36,1) 0.28s both;
        }
        .badge-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #f97316;
          flex-shrink: 0;
        }

        /* ── Right form panel ── */
        .right-panel {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 56px;
        }
        @media (max-width: 767px) { .right-panel { padding: 48px 28px; } }

        .form-box {
          width: 100%;
          max-width: 380px;
          animation: fadeInUp 0.85s cubic-bezier(.22,1,.36,1) 0.1s both;
        }

        .mobile-logo {
          display: none;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
        }
        @media (max-width: 767px) { .mobile-logo { display: none; } }
        .mobile-logo-text {
          font-size: 22px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }
        .mobile-logo-text em { font-style: normal; color: #f97316; }

        .form-heading {
          font-size: 34px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.8px;
          margin-bottom: 6px;
          line-height: 1.1;
        }
        .form-sub {
          font-size: 15px;
          font-weight: 300;
          color: rgba(255,255,255,0.5);
          margin-bottom: 40px;
          line-height: 1.6;
        }
        .form-sub strong { color: rgba(255,255,255,0.85); font-weight: 600; }

        .field { margin-bottom: 20px; }
        .field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.42);
          margin-bottom: 9px;
        }
        .field input {
          width: 100%;
          height: 54px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 0 18px;
          font-size: 17px;
          font-family: 'Barlow', sans-serif;
          font-weight: 500;
          color: white;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .field input::placeholder { color: rgba(255,255,255,0.22); font-weight: 400; }
        .field input:focus {
          border-color: #f97316;
          background: rgba(255,255,255,0.11);
        }

        .btn-submit {
          width: 100%;
          height: 56px;
          background: #f97316;
          border: none;
          border-radius: 12px;
          font-family: 'Barlow', sans-serif;
          font-size: 16px;
          font-weight: 800;
          color: white;
          cursor: pointer;
          letter-spacing: 0.3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.18s, transform 0.15s;
          margin-top: 8px;
        }
        .btn-submit:hover:not(:disabled) { background: #ea6c0c; }
        .btn-submit:active:not(:disabled) { transform: scale(0.98); }
        .btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        .spinner {
          width: 20px; height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .error-msg {
          color: #fca5a5;
          font-size: 13px;
          font-weight: 500;
          margin-top: 12px;
          text-align: center;
          animation: slideIn 0.25s ease;
        }

        .divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 32px 0;
        }

        .terms {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          line-height: 1.7;
        }
        .terms a {
          color: rgba(255,255,255,0.5);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .otp-hint {
          font-size: 13px;
          color: rgba(255,255,255,0.32);
          text-align: center;
          margin-top: 16px;
          line-height: 1.5;
        }

        .back-link {
          display: block;
          text-align: center;
          margin-top: 14px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.38);
          font-family: 'Barlow', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.15s;
          padding: 6px;
          width: 100%;
        }
        .back-link:hover { color: rgba(255,255,255,0.75); }
      `}</style>

      {/* Colorado Rockies background */}
      <div className="bg-photo" />

      <div className="page">

        {/* ── LEFT: branding ── */}
        <div className="left-panel">
          <div className="logo-wrap">
            <svg width="36" height="36" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="7" y="4" width="6" height="30" rx="2.5" fill="white"/>
              <path d="M13 19 L30 4 L37 4 L37 9 L19 21 Z" fill="white"/>
              <path d="M13 19 L30 34 L37 34 L37 29 L19 17 Z" fill="white"/>
              <circle cx="14" cy="19" r="5.5" fill="#f97316"/>
            </svg>
            <span className="logo-text">We<em>Katch</em></span>
          </div>

          <h1 className="headline">
            Welcome<br /><span>Back</span>
          </h1>
          <p className="tagline">
            Manage your service leads, track jobs, and grow your plumbing business — all in one place.
          </p>
          <div className="badge">
            <div className="badge-dot" />
            Illinois&apos;s Plumber Platform
          </div>
        </div>

        {/* ── RIGHT: form ── */}
        <div className="right-panel">
          <div className="form-box">

            {/* Mobile-only logo */}
            <div className="mobile-logo">
              <svg width="30" height="30" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="7" y="4" width="6" height="30" rx="2.5" fill="white"/>
                <path d="M13 19 L30 4 L37 4 L37 9 L19 21 Z" fill="white"/>
                <path d="M13 19 L30 34 L37 34 L37 29 L19 17 Z" fill="white"/>
                <circle cx="14" cy="19" r="5.5" fill="#f97316"/>
              </svg>
              <span className="mobile-logo-text">We<em>Katch</em></span>
            </div>

            {step === "phone" ? (
              <>
                <h2 className="form-heading">Sign in</h2>
                <p className="form-sub">Enter your phone number to receive a login code</p>

                <div className="field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="+1 555 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                    autoFocus
                  />
                </div>

                {error && <p className="error-msg">⚠ {error}</p>}

                <button className="btn-submit" onClick={handleSendCode} disabled={loading}>
                  {loading ? <span className="spinner" /> : "Send Code →"}
                </button>

                <div className="divider" />
                <p className="terms">
                  By signing in you agree to our{" "}
                  <a href="#">Terms of Service</a> &amp; <a href="#">Privacy Policy</a>
                </p>
              </>
            ) : (
              <>
                <h2 className="form-heading">Check your phone</h2>
                <p className="form-sub">
                  Enter the 6-digit code sent to{" "}
                  <strong>{phone}</strong>
                </p>

                <div className="field">
                  <label>6-Digit Code</label>
                  <input
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

                {error && <p className="error-msg">⚠ {error}</p>}

                <button
                  className="btn-submit"
                  onClick={handleVerifyCode}
                  disabled={loading || otp.length < 6}
                >
                  {loading ? <span className="spinner" /> : "Verify & Log In →"}
                </button>

                <p className="otp-hint">Didn&apos;t get a code? Check your SMS or try again.</p>
                <button
                  className="back-link"
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                >
                  ← Change phone number
                </button>
              </>
            )}

          </div>
        </div>

      </div>
    </>
  );
}
