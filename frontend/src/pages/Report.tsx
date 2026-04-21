import { useState, useEffect, useRef } from "react";
import type { AnalysisResult, FixResult } from "../lib/types";
import { fixBias, downloadUrl } from "../lib/api";
import BiasScore from "../components/BiasScore";
import MetricCard from "../components/MetricCard";
import GroupChart from "../components/GroupChart";
import FixPanel from "../components/FixPanel";
import "./Report.css";

interface Props {
  result: AnalysisResult;
  onReset: () => void;
}

export default function Report({ result, onReset }: Props) {
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [fixError, setFixError] = useState("");
  const [visible, setVisible] = useState(false);
  const fixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleFix = async () => {
    setFixing(true);
    setFixError("");
    try {
      const r = await fixBias(result.session_id);
      setFixResult(r);
      setTimeout(() => fixRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setFixError("Fix failed. Please try again.");
    } finally {
      setFixing(false);
    }
  };

  const scoreColor =
    result.bias_score >= 70 ? "low" :
    result.bias_score >= 40 ? "medium" : "high";

  return (
    <div className={`report-page ${visible ? "visible" : ""}`}>
      <header className="report-header">
        <button className="back-btn" onClick={onReset}>← new scan</button>
        <span className="report-domain">{result.domain}</span>
      </header>

      {/* Headline */}
      <section className="report-hero">
        <div className="report-eyebrow">Scan complete</div>
        <h1 className="report-headline">{result.headline}</h1>
        <p className="report-summary">{result.summary}</p>
      </section>

      {/* Score + group chart side by side */}
      <section className="report-overview">
        <BiasScore score={result.bias_score} severity={scoreColor} />
        <GroupChart
          stats={result.group_stats}
          sensitiveAttr={result.sensitive_attr}
        />
      </section>

      {/* Metrics */}
      <section className="report-metrics">
        <h2 className="section-label">What we found</h2>
        <div className="metrics-grid">
          {result.metrics.map((m, i) => (
            <MetricCard key={m.key} metric={m} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* Fix */}
      {!fixResult && (
        <section className="fix-cta-section">
          <div className="fix-cta-inner">
            <div>
              <div className="fix-cta-title">Ready to fix this?</div>
              <div className="fix-cta-sub">
                We'll rebalance your dataset using Reweighing — the same technique used by IBM's AI Fairness 360.
              </div>
            </div>
            {fixError && <div className="fix-error">{fixError}</div>}
            <button className="fix-btn" onClick={handleFix} disabled={fixing}>
              {fixing ? <><span className="spinner dark" /> Applying fix…</> : "Fix bias →"}
            </button>
          </div>
        </section>
      )}

      {fixResult && (
        <div ref={fixRef}>
          <FixPanel
            before={result}
            fix={fixResult}
            onDownload={() => window.open(downloadUrl(fixResult.download_token))}
          />
        </div>
      )}
    </div>
  );
}
