import { useEffect, useState } from "react";
import type { AnalysisResult, FixResult } from "../lib/types";
import "./FixPanel.css";

interface Props {
  before: AnalysisResult;
  fix: FixResult;
  onDownload: () => void;
}

const scoreColor = (s: number) =>
  s >= 70 ? "#2a7d4f" : s >= 40 ? "#c98c1a" : "#d4522a";

function AnimatedScore({ endValue, durationMs = 1000 }: { endValue: number; durationMs?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      
      const current = Math.round(startValue + progress * (endValue - startValue));
      setValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  }, [endValue, durationMs]);

  return <div className="ba-score" style={{ color: scoreColor(value) }}>{value}</div>;
}

export default function FixPanel({ fix, onDownload }: Props) {
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
        <div className="ba-col column-before">
          <div className="ba-label">Before</div>
          <AnimatedScore endValue={fix.bias_score_before} />
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

        <div className="ba-col column-after after">
          <div className="ba-label">After</div>
          <AnimatedScore endValue={fix.bias_score_after} />
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
          <div className="dl-sub">Reweighted using IBM AIF360 Reweighing algorithm</div
>
        </div>
        <button className="dl-btn" onClick={onDownload}>
          Download CSV ↓
        </button>
      </div>
    </section>
  );
}
