import { useEffect, useState } from "react";
import type { GroupStat } from "../lib/types";
import "./GroupChart.css";

interface Props {
  stats: GroupStat[];
  sensitiveAttr: string;
}

export default function GroupChart({ stats, sensitiveAttr }: Props) {
  const [animated, setAnimated] = useState(false);
  const max = Math.max(...stats.map((s) => s.positive_rate), 0.01);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="group-chart">
      <div className="chart-header">
        <span className="chart-title">Outcome rate by {sensitiveAttr}</span>
        <span className="chart-sub">% receiving positive outcome</span>
      </div>
      <div className="chart-bars">
        {stats.map((s, i) => (
          <div className="chart-row" key={i}>
            <span className="bar-label">{s.group}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
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
