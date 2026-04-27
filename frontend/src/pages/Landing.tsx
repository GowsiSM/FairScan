import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import HistorySidebar from "../components/HistorySidebar";
import type { AnalysisResult } from "../lib/types";
import "./Landing.css";

interface Props {
  onStart: () => void;
  onSelectHistory: (result: AnalysisResult) => void;
}




export default function Landing({ onStart, onSelectHistory }: Props) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { user, signInWithGoogle } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add("visible"));
  }, []);

  const handleCta = async () => {
    if (user) {
      onStart();
    } else {
      setAuthError("");
      try {
        await signInWithGoogle();
        onStart();
      } catch (err: any) {
        if (err?.message?.startsWith("popup-blocked")) {
          setAuthError(
            "Popups are blocked by your browser. Please allow popups for this site and try again.",
          );
        }
        // other errors (e.g. network) — swallow, user can retry
      }
    }
  };

  return (
    <div className="landing">
      <Navbar
        rightSlot={
          !user ? (
            <button className="nav-cta" onClick={handleCta}>
              Try it free →
            </button>
          ) : (
            <>
              <button className="nav-cta secondary" onClick={() => setHistoryOpen(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                History
              </button>
              <button className="nav-cta" onClick={onStart}>
                New scan →
              </button>
            </>
          )
        }
      />

      <main>
        <section className="hero" ref={heroRef}>
          <div className="hero-content">
            <div className="hero-eyebrow">Bias Detection Tool</div>
            <h1 className="hero-title">
              Algorithms decide.
              <br />
              <em>Who decides fairly?</em>
            </h1>
            <p className="hero-sub">
              Upload any hiring, loan, or healthcare dataset.
              <br />
              See exactly where bias hides — in plain English.
            </p>
            <button className="cta-primary" onClick={handleCta}>
              Scan your dataset
            </button>
            {authError && (
              <p style={{
                marginTop: "0.75rem",
                fontSize: "0.8rem",
                color: "#f87171",
                maxWidth: 340,
                lineHeight: 1.5,
              }}>
                ⚠️ {authError}
              </p>
            )}
          </div>
          <div className="hero-visual">
            <AnimatedSvg />
          </div>
        </section>

        <section className="impact-strip">
          <div className="impact-header">
            <span className="impact-label">The problem is real</span>
            <span className="impact-line" />
          </div>
          <div className="impact-grid">
            {[
              {
                stat: "40%",
                story: "fewer women called back for the same résumé",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 7V5a4 4 0 0 0-8 0v2" />
                  </svg>
                ),
                tag: "Hiring"
              },
              {
                stat: "2.5×",
                story: "more likely to deny loans in minority zip codes",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                ),
                tag: "Lending"
              },
              {
                stat: "1 in 3",
                story: "healthcare algorithms deprioritize Black patients",
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                ),
                tag: "Healthcare"
              },
            ].map((e, i) => (
              <div
                className="impact-card"
                key={i}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="impact-accent-bar" />
                <div className="impact-card-inner">
                  <div className="impact-tag-row">
                    <span className="impact-icon">{e.icon}</span>
                    <span className="impact-tag">{e.tag}</span>
                  </div>
                  <span className="impact-stat">{e.stat}</span>
                  <span className="impact-story">{e.story}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="how-section">
          <div className="section-header">
            <h2 className="section-label">How it works</h2>
            <h3 className="section-title">Bias detection in three steps</h3>
          </div>
          <div className="steps">
            {[
              {
                n: "01",
                title: "Upload",
                desc: "Drop a CSV — hiring results, loan approvals, or medical records. We handle the rest.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )
              },
              {
                n: "02",
                title: "Detect",
                desc: "We analyze fairness metrics and translate them into plain English impact reports.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                    <path d="M11 8a3 3 0 0 0-3 3" />
                  </svg>
                )
              },
              {
                n: "03",
                title: "Fix",
                desc: "One click rebalances your dataset to minimize bias. Download the corrected CSV.",
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 14 4-4" />
                    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
                  </svg>
                )
              },
            ].map((s) => (
              <div className="step-card" key={s.n}>
                <div className="step-glow" />
                <div className="step-content">
                  <div className="step-icon-wrapper">
                    {s.icon}
                  </div>
                  <span className="step-number">{s.n}</span>
                  <div className="step-text">
                    <h3 className="step-title">{s.title}</h3>
                    <p className="step-desc">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>Built for Google Solution Challenge 2026</span>
      </footer>

      <HistorySidebar
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={onSelectHistory}
      />
    </div>
  );
}

function AnimatedSvg() {
  const [tick, setTick] = useState(0);
  const totalFrames = 44; // Matches the actual file count (000-043)

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // Ping-pong bounce logic
  const cycleLength = (totalFrames - 1) * 2;
  const cycleTick = tick % cycleLength;
  const frame = cycleTick < totalFrames ? cycleTick : cycleLength - cycleTick;

  const frameStr = String(frame).padStart(3, "0");
  const src = `/weight-balance/Whisk_idzlhtn5yjywytnl1iyyitotkjykrtl4ytmm1so_${frameStr}.svg`;

  return (
    <div className="animated-svg-container">
      <img src={src} alt="Animated balance scale" className="animated-svg" />
    </div>
  );
}
