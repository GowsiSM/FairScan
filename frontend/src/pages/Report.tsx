import { useState, useEffect, useRef } from "react";
import type { AnalysisResult, FixResult } from "../lib/types";
import { fixBias, downloadUrl } from "../lib/api";
import BiasScore from "../components/BiasScore";
import MetricCard from "../components/MetricCard";
import GroupChart from "../components/GroupChart";
import FixPanel from "../components/FixPanel";
import BiasContributors from "../components/BiasContributors";
import MetricGuide from "../components/MetricGuide";
import CertBadge from "../components/CertBadge";
import AiExplainer from "../components/AiExplainer";
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
      setTimeout(
        () => fixRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    } catch {
      setFixError("Fix failed. Please try again.");
    } finally {
      setFixing(false);
    }
  };

  const scoreColor =
    result.bias_score >= 70
      ? "low"
      : result.bias_score >= 40
        ? "medium"
        : "high";

  const totalRecords = result.group_stats.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className={`report-page ${visible ? "visible" : ""}`}>
      <header className="report-header">
        <button className="back-btn" onClick={onReset}>
          ← new scan
        </button>
        <div className="report-header-right">
          <div className="privacy-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
            <span>Data not stored</span>
          </div>
          <span className="report-domain">{result.domain}</span>
        </div>
      </header>

      {/* ── Consolidated Bias Overview Card ── */}
      <section className="bias-overview-card">
        {/* Left column: headline + stats + status badges + CTA */}
        <div className="boc-left">
          <div className="boc-eyebrow">Scan complete</div>
          <h1 className="boc-headline">{result.headline}</h1>
          <p className="boc-summary">{result.summary}</p>

          {/* Key scan stats */}
          <div className="boc-stats-row">
            <div className="boc-stat">
              <span className="boc-stat-value">{totalRecords.toLocaleString()}</span>
              <span className="boc-stat-label">Records scanned</span>
            </div>
            <div className="boc-stat-divider" />
            <div className="boc-stat">
              <span className="boc-stat-value">{result.metrics.length}</span>
              <span className="boc-stat-label">Metrics evaluated</span>
            </div>
            <div className="boc-stat-divider" />
            <div className="boc-stat">
              <span className="boc-stat-value" style={{ textTransform: "capitalize" }}>{result.sensitive_attr}</span>
              <span className="boc-stat-label">Sensitive attribute</span>
            </div>
          </div>

          {/* Status indicator (was CertBadge in sidebar) */}
          <div className="boc-status-row">
            <CertBadge score={result.bias_score} />
          </div>
        </div>

        {/* Right column: fairness score gauge */}
        <div className="boc-right">
          <BiasScore score={result.bias_score} severity={scoreColor} />
        </div>
      </section>

      {/* ── Ready to fix this? — embedded below overview ── */}
      {!fixResult && (
        <section className="fix-cta-section">
          <div className="fix-cta-inner">
            <div>
              <div className="fix-cta-title">Ready to fix this?</div>
              <div className="fix-cta-sub">
                We'll rebalance your dataset using Reweighing — the same
                technique used by IBM's AI Fairness 360.
              </div>
            </div>
            {fixError && <div className="fix-error">{fixError}</div>}
            <button className="fix-btn" onClick={handleFix} disabled={fixing}>
              {fixing ? (
                <>
                  <span className="spinner dark" /> Applying fix…
                </>
              ) : (
                "Fix bias →"
              )}
            </button>
          </div>
        </section>
      )}

      {/* ── Group outcome chart ── */}
      <section className="report-chart-section">
        <GroupChart
          stats={result.group_stats}
          sensitiveAttr={result.sensitive_attr}
        />
      </section>

      {/* ── ANALYSIS SECTION ── */}
      <section className="report-analysis">
        <div className="section-label">ANALYSIS</div>

        {/* 1. Why this bias exists (Diagnostic chart) */}
        {result.bias_contributors && result.bias_contributors.length > 0 && (
          <BiasContributors
            contributors={result.bias_contributors}
            sensitiveAttr={result.sensitive_attr}
          />
        )}

        {/* 2. AI Narrative Summary */}
        <AiExplainer sessionId={result.session_id} />

        {/* 3. Bias Breakdown (Metrics) */}
        <div className="metrics-grid">
          {result.metrics.map((m, i) => (
            <MetricCard key={m.key} metric={m} delay={i * 80} />
          ))}
        </div>
      </section>

      {fixResult && (
        <div ref={fixRef}>
          <FixPanel
            before={result}
            fix={fixResult}
            onDownload={() =>
              window.open(downloadUrl(fixResult.download_token))
            }
          />
        </div>
      )}
    </div>
  );
}
