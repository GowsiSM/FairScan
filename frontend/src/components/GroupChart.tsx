import { useEffect, useState } from "react";
import type { GroupStat } from "../lib/types";
import "./GroupChart.css";

interface Props {
  stats: GroupStat[];
  sensitiveAttr: string;
  analysisType?: "dataset" | "model";
}

export default function GroupChart({ stats, sensitiveAttr, analysisType = "dataset" }: Props) {
  const [animated, setAnimated] = useState(false);
  const max = Math.max(...stats.map((s) => s.positive_rate), 0.01);
  const isModel = analysisType === "model";

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Guide spec: "Selection Rate" for dataset, "Prediction Rate" for model
  const chartTitle = isModel
    ? `Prediction rate by ${sensitiveAttr}`
    : `Selection rate by ${sensitiveAttr}`;

  const chartSub = isModel
    ? "% predicted positive by the model"
    : "% receiving positive outcome";

  return (
    <div className={`group-chart ${isModel ? "model-mode" : ""}`}>
      <div className="chart-header">
        <div className="chart-header-top">
          <span className="chart-title">{chartTitle}</span>
          {isModel && (
            <span className="chart-mode-tag">model output</span>
          )}
        </div>
        <span className="chart-sub">{chartSub}</span>
      </div>
      <div className="chart-bars">
        {stats.map((s, i) => (
          <div className="chart-row" key={i}>
            <span className="bar-label">{s.group}</span>
            <div className="bar-track">
              <div
                className={`bar-fill ${isModel ? "bar-fill--model" : ""}`}
                style={{
                  width: animated ? `${(s.positive_rate / max) * 100}%` : "0%",
                  transitionDelay: `${i * 100}ms`,
                }}
              />
            </div>
            <span className="bar-pct">{(s.positive_rate * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
