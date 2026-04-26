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

  const [aiInsights, setAiInsights] = useState<{ headline: string; summary: string; bias_contributors_note: string; explanation: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(!result.isReadOnly);

  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Reset fix panel when result changes (e.g. loaded from history)
  useEffect(() => {
    setFixResult(null);
    setFixError("");
    setAiInsights(null);
    setAiLoading(!result.isReadOnly);
    requestAnimationFrame(() => setVisible(true));

    if (result.isReadOnly) return; // Skip AI fetch for archived reports

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
    result.bias_score >= 70
      ? "low"
      : result.bias_score >= 40
        ? "medium"
        : "high";

  const totalRecords = result.group_stats.reduce((sum, g) => sum + g.count, 0);

  const displayHeadline = aiInsights?.headline || (aiLoading ? "Analyzing bias context..." : result.headline);
  const displaySummary = aiInsights?.summary || (aiLoading ? "Generating AI summary from the dataset..." : result.summary);

  return (
    <div className={`report-page ${visible ? "visible" : ""}`}>
      <Navbar
        onHistory={() => setHistorySidebarOpen(true)}
        onSave={result.isReadOnly ? undefined : handleSave}
        saveState={saveState}
        rightSlot={
          <>
            <button className="back-link" onClick={onReset}>
              ← new scan
            </button>
            {!result.isReadOnly && (
              <div className="privacy-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
                <span>Data not stored</span>
              </div>
            )}
            {result.isReadOnly && (
              <div className="archived-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Archived report</span>
              </div>
            )}
            <span className="report-domain">{result.domain}</span>
          </>
        }
      />

      {/* ── Consolidated Bias Overview Card ── */}
      <section className="bias-overview-card">
        {/* Left column: headline + stats + status badges + CTA */}
        <div className="boc-left">
          <div className="boc-eyebrow">Scan complete {aiLoading && <span className="spinner small" style={{ marginLeft: 8 }} />}</div>
          <h1 className={`boc-headline ${aiLoading ? "skeleton-text" : ""}`}>{displayHeadline}</h1>
          <p className={`boc-summary ${aiLoading ? "skeleton-text" : ""}`}>{displaySummary}</p>

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

          {/* Status indicator */}
          <div className="boc-status-row">
            <CertBadge score={result.bias_score} />
          </div>
        </div>

        {/* Right column: fairness score gauge */}
        <div className="boc-right">
          <BiasScore score={result.bias_score} severity={scoreColor} />
        </div>
      </section>

      {/* ── Fix Bias section ── */}
      {!fixResult && !result.isReadOnly && (
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

      {/* ── Read-only banner (old report) ── */}
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

        {result.bias_contributors && result.bias_contributors.length > 0 && (
          <BiasContributors
            contributors={result.bias_contributors}
            sensitiveAttr={result.sensitive_attr}
            aiNote={aiInsights?.bias_contributors_note}
            aiLoading={aiLoading}
          />
        )}

        <AiExplainer
          explanation={aiInsights?.explanation}
          loading={aiLoading}
        />

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
