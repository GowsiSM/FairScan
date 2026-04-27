import { useState, useEffect, useRef } from "react";
import type { AnalysisResult, FixResult } from "../lib/types";
import { fixBias, downloadUrl, explainBias } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { saveAnalysis } from "../lib/firestore";
import Navbar from "../components/Navbar";
import BiasScore from "../components/BiasScore";
import MetricCard from "../components/MetricCard";
import GroupChart from "../components/GroupChart";
import FixPanel from "../components/FixPanel";
import BiasContributors from "../components/BiasContributors";
import CertBadge from "../components/CertBadge";
import AiExplainer from "../components/AiExplainer";
import HistorySidebar from "../components/HistorySidebar";
import "./Report.css";

interface Props {
  result: AnalysisResult;
  onReset: () => void;
  onSelectHistory: (result: AnalysisResult) => void;
}

export default function Report({ result, onReset, onSelectHistory }: Props) {
  const { user } = useAuth();
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [fixError, setFixError] = useState("");
  const [visible, setVisible] = useState(false);
  const fixRef = useRef<HTMLDivElement>(null);

  const [aiInsights, setAiInsights] = useState<{
    headline: string;
    summary: string;
    bias_contributors_note: string;
    explanation: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(!result.isReadOnly);

  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const isModel = result.analysis_type === "model";

  // Reset fix panel when result changes (e.g. loaded from history)
  useEffect(() => {
    setFixResult(null);
    setFixError("");
    setAiInsights(null);
    setAiLoading(!result.isReadOnly);
    requestAnimationFrame(() => setVisible(true));

    if (result.isReadOnly) return;

    const fetchInsights = async () => {
      try {
        setAiLoading(true);
        const insights = await explainBias(result.session_id);
        setAiInsights(insights);
      } catch (err) {
        console.error("Failed to fetch AI insights:", err);
      } finally {
        setAiLoading(false);
      }
    };
    fetchInsights();
  }, [result.session_id, result.isReadOnly]);

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

  const handleSave = async () => {
    if (!user || saveState !== "idle") return;
    setSaveState("saving");
    try {
      await saveAnalysis(user.uid, result);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (err) {
      console.error("Failed to save:", err);
      setSaveState("idle");
    }
  };

  const scoreColor =
    result.bias_score >= 70 ? "low" : result.bias_score >= 40 ? "medium" : "high";

  const totalRecords = result.group_stats.reduce((sum, g) => sum + g.count, 0);

  const displayHeadline =
    aiInsights?.headline || (aiLoading ? "Analyzing bias context..." : result.headline);
  const displaySummary =
    aiInsights?.summary ||
    (aiLoading ? "Generating AI summary from the dataset..." : result.summary);

  return (
    <div className={`report-page ${visible ? "visible" : ""}`}>
      <Navbar
        onHistory={() => setHistorySidebarOpen(true)}
        onSave={result.isReadOnly ? undefined : handleSave}
        saveState={saveState}
        onReset={onReset}
        reportMeta={{ domain: result.domain, isReadOnly: !!result.isReadOnly }}
      />

      {/* ── Consolidated Bias Overview Card ── */}
      <section className="bias-overview-card">
        <div className="boc-left">
          {/* Eyebrow with mode badge */}
          <div className="boc-eyebrow">
            Scan complete{" "}
            {aiLoading && <span className="spinner small" style={{ marginLeft: 8 }} />}
            <span className={`mode-pill ${isModel ? "mode-pill--model" : "mode-pill--dataset"}`}>
              {isModel ? (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="12" cy="5" r="2" />
                    <path d="M12 7v4" />
                  </svg>
                  Model Predictions
                </>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9" />
                    <path d="M13 17V5" />
                    <path d="M8 17v-3" />
                  </svg>
                  Training Data
                </>
              )}
            </span>
          </div>

          <h1 className={`boc-headline ${aiLoading ? "skeleton-text" : ""}`}>
            {displayHeadline}
          </h1>
          <p className={`boc-summary ${aiLoading ? "skeleton-text" : ""}`}>
            {displaySummary}
          </p>

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
              <span className="boc-stat-value" style={{ textTransform: "capitalize" }}>
                {result.sensitive_attr}
              </span>
              <span className="boc-stat-label">Sensitive attribute</span>
            </div>
          </div>

          <div className="boc-status-row">
            <CertBadge score={result.bias_score} />
          </div>
        </div>

        <div className="boc-right">
          <BiasScore score={result.bias_score} severity={scoreColor} />
        </div>
      </section>

      {/* ── Archived banner ── */}
      {result.isReadOnly && (
        <section className="archived-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            This is an <strong>archived report</strong>. Start a new scan to apply bias fixes.
          </span>
        </section>
      )}

      {/* ── Fix / Advisory CTA — forks on analysis type ── */}
      {!fixResult && !result.isReadOnly && (
        <section className="fix-cta-section">
          {isModel ? (
            /* Model mode: no reweighing, show retrain advisory */
            <div className="fix-cta-inner model-advisory">
              <div className="model-advisory-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6a4 4 0 0 1 4-4z" />
                  <circle cx="12" cy="13" r="2" />
                </svg>
              </div>
              <div className="model-advisory-body">
                <div className="fix-cta-title">Model bias detected</div>
                <div className="fix-cta-sub">
                  Predictive bias in a trained model cannot be corrected by reweighing input data alone.
                  Consider retraining with a fairness-aware algorithm, applying post-processing
                  calibration, or auditing the training data for representation gaps.
                </div>
              </div>
              <div className="model-advisory-steps">
                <span className="advisory-step">
                  <span className="advisory-step-dot">1</span>Audit training data
                </span>
                <span className="advisory-step">
                  <span className="advisory-step-dot">2</span>Retrain with fairness constraints
                </span>
                <span className="advisory-step">
                  <span className="advisory-step-dot">3</span>Apply post-processing calibration
                </span>
              </div>
            </div>
          ) : (
            /* Dataset mode: reweighing fix button */
            <div className="fix-cta-inner">
              <div>
                <div className="fix-cta-title">Ready to fix this?</div>
                <div className="fix-cta-sub">
                  We'll rebalance your dataset using Reweighing — the same technique used by IBM's AI Fairness 360.
                </div>
              </div>
              {fixError && <div className="fix-error">{fixError}</div>}
              <button className="fix-btn" onClick={handleFix} disabled={fixing}>
                {fixing ? (
                  <><span className="spinner dark" /> Applying fix…</>
                ) : (
                  "Fix bias →"
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Group Outcome & Bias Contributors (Two-Column) ── */}
      <section className="report-charts-grid">
        <div className="chart-column">
          <GroupChart
            stats={result.group_stats}
            sensitiveAttr={result.sensitive_attr}
            analysisType={result.analysis_type as "dataset" | "model"}
          />
        </div>

        {result.bias_contributors && result.bias_contributors.length > 0 && (
          <div className="chart-column">
            <BiasContributors
              contributors={result.bias_contributors}
              sensitiveAttr={result.sensitive_attr}
              aiNote={aiInsights?.bias_contributors_note}
              aiLoading={aiLoading}
              analysisType={result.analysis_type as "dataset" | "model"}
            />
          </div>
        )}
      </section>

      {/* ── Analysis Section ── */}
      <section className="report-analysis">
        <div className="section-label">
          {isModel ? "MODEL INSIGHTS" : "DETAILED ANALYSIS"}
        </div>

        {/* Context intro — brief mode-framing sentence */}
        <div className="analysis-context-intro">
          {isModel ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4v1h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1V6a4 4 0 0 1 4-4z" />
                <circle cx="12" cy="13" r="2" />
              </svg>
              <span>
                Evaluating <strong>predictive bias</strong> — comparing your model's predicted outcomes
                against actual ground truth across demographic groups.
              </span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
              <span>
                Evaluating <strong>historical bias</strong> — checking whether your training data
                contains systematic representation gaps across demographic groups.
              </span>
            </>
          )}
        </div>

        <AiExplainer explanation={aiInsights?.explanation} loading={aiLoading} />

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
            onDownload={() => window.open(downloadUrl(fixResult.download_token))}
          />
        </div>
      )}

      {/* ── History Sidebar ── */}
      <HistorySidebar
        open={historySidebarOpen}
        onClose={() => setHistorySidebarOpen(false)}
        onSelect={onSelectHistory}
        activeFirestoreId={result.firestoreId}
      />
    </div>
  );
}
