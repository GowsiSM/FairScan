import type { AnalysisResult, FixResult } from "../lib/types";
import "./FixPanel.css";

interface Props {
  before: AnalysisResult;
  fix: FixResult;
  onDownload: () => void;
}

const scoreColor = (s: number) =>
  s >= 70 ? "#2a7d4f" : s >= 40 ? "#c98c1a" : "#d4522a";

export default function FixPanel({ before, fix, onDownload }: Props) {
  const improvement = fix.bias_score_after - fix.bias_score_before;

  return (
    <section className="fix-panel">
      <div className="fix-panel-header">
        <div className="fix-eyebrow">Bias corrected</div>
        <h2 className="fix-title">
          Fairness score improved by{" "}
          <span className="improvement">+{improvement} points</span>
        </h2>
      </div>

      <div className="before-after">
        <div className="ba-col">
          <div className="ba-label">Before</div>
          <div className="ba-score" style={{ color: scoreColor(fix.bias_score_before) }}>
            {fix.bias_score_before}
          </div>
          <div className="ba-sub">/ 100</div>
          <div className="ba-metrics">
            {fix.metrics_before.map((m) => (
              <div className="ba-metric" key={m.key}>
                <span className="ba-metric-name">{m.label}</span>
                <span className="ba-metric-val">{m.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ba-arrow">→</div>

        <div className="ba-col after">
          <div className="ba-label">After</div>
          <div className="ba-score" style={{ color: scoreColor(fix.bias_score_after) }}>
            {fix.bias_score_after}
          </div>
          <div className="ba-sub">/ 100</div>
          <div className="ba-metrics">
            {fix.metrics_after.map((m) => (
              <div className="ba-metric" key={m.key}>
                <span className="ba-metric-name">{m.label}</span>
                <span className="ba-metric-val improved">{m.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="download-row">
        <div>
          <div className="dl-title">Download debiased dataset</div>
          <div className="dl-sub">Reweighted using IBM AIF360 Reweighing algorithm</div>
        </div>
        <button className="dl-btn" onClick={onDownload}>
          Download CSV ↓
        </button>
      </div>
    </section>
  );
}
