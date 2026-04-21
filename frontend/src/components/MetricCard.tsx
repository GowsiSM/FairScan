import { useEffect, useState } from "react";
import type { BiasMetric } from "../lib/types";
import "./MetricCard.css";

interface Props {
  metric: BiasMetric;
  delay: number;
}

const severityColors = {
  high: "#d4522a",
  medium: "#c98c1a",
  low: "#2a7d4f",
};

export default function MetricCard({ metric, delay }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`metric-card ${visible ? "visible" : ""}`}>
      <div
        className="metric-severity-bar"
        style={{ background: severityColors[metric.severity] }}
      />
      <div className="metric-inner">
        <div className="metric-name">{metric.label}</div>
        <div className="metric-story">{metric.story}</div>
        <div className="metric-value" style={{ color: severityColors[metric.severity] }}>
          {metric.value.toFixed(2)}
        </div>
        <div className="metric-threshold">
          threshold: {metric.threshold}
        </div>
      </div>
    </div>
  );
}
