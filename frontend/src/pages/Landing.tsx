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

const examples = [
  { stat: "40%", story: "fewer women called back for the same résumé" },
  { stat: "2.5×", story: "more likely to deny loans in minority zip codes" },
  {
    stat: "1 in 3",
    story: "healthcare algorithms deprioritize Black patients",
  },
];

export default function Landing({ onStart, onSelectHistory }: Props) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { user, signInWithGoogle } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add("visible"));
  }, []);

  const handleCta = async () => {
    if (user) {
      onStart();
    } else {
      try {
        await signInWithGoogle();
        onStart();
      } catch {
        // user closed the popup — do nothing
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
          </div>
          <div className="hero-visual">
            <AnimatedSvg />
          </div>
        </section>

        <section className="impact-strip">
          {examples.map((e, i) => (
            <div
              className="impact-card"
              key={i}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <span className="impact-stat">{e.stat}</span>
              <span className="impact-story">{e.story}</span>
            </div>
          ))}
        </section>

        <section className="how-section">
          <h2 className="section-label">How it works</h2>
          <div className="steps">
            {[
              {
                n: "01",
                title: "Upload",
                desc: "Drop a CSV — hiring results, loan approvals, medical records.",
              },
              {
                n: "02",
                title: "Detect",
                desc: "We measure three fairness metrics and translate them into plain human impact.",
              },
              {
                n: "03",
                title: "Fix",
                desc: "One click rebalances your dataset. Download the corrected version.",
              },
            ].map((s) => (
              <div className="step" key={s.n}>
                <span className="step-n">{s.n}</span>
                <div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
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
