import { useEffect, useRef } from "react";
import "./Landing.css";

interface Props {
  onStart: () => void;
}

const examples = [
  { stat: "40%", story: "fewer women called back for the same résumé" },
  { stat: "2.5×", story: "more likely to deny loans in minority zip codes" },
  { stat: "1 in 3", story: "healthcare algorithms deprioritize Black patients" },
];

export default function Landing({ onStart }: Props) {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    requestAnimationFrame(() => el.classList.add("visible"));
  }, []);

  return (
    <div className="landing">
      <header className="landing-header">
        <span className="logo">fairscan</span>
        <button className="nav-cta" onClick={onStart}>Try it free →</button>
      </header>

      <main>
        <section className="hero" ref={heroRef}>
          <div className="hero-eyebrow">Bias Detection Tool</div>
          <h1 className="hero-title">
            Algorithms decide.<br />
            <em>Who decides fairly?</em>
          </h1>
          <p className="hero-sub">
            Upload any hiring, loan, or healthcare dataset.<br />
            See exactly where bias hides — in plain English.
          </p>
          <button className="cta-primary" onClick={onStart}>
            Scan your dataset
          </button>
        </section>

        <section className="impact-strip">
          {examples.map((e, i) => (
            <div className="impact-card" key={i} style={{ animationDelay: `${i * 0.12}s` }}>
              <span className="impact-stat">{e.stat}</span>
              <span className="impact-story">{e.story}</span>
            </div>
          ))}
        </section>

        <section className="how-section">
          <h2 className="section-label">How it works</h2>
          <div className="steps">
            {[
              { n: "01", title: "Upload", desc: "Drop a CSV — hiring results, loan approvals, medical records." },
              { n: "02", title: "Detect", desc: "We measure three fairness metrics and translate them into plain human impact." },
              { n: "03", title: "Fix", desc: "One click rebalances your dataset. Download the corrected version." },
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
    </div>
  );
}
