import { useEffect, useState } from "react";
import "./BiasScore.css";

interface Props {
  score: number;
  severity: "low" | "medium" | "high";
}

const labels = {
  high: "High bias detected",
  medium: "Moderate bias",
  low: "Low bias",
};

const colors = {
  high: "#d4522a",
  medium: "#c98c1a",
  low: "#2a7d4f",
};

export default function BiasScore({ score, severity }: Props) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = score;
    const duration = 900;
    const step = (end / duration) * 16;
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplayed(Math.round(start));
      if (start >= end) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="bias-score">
      <div className="score-label-top">Fairness score</div>
      <div className="score-ring-wrap">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="70" cy="70" r={r}
            fill="none"
            stroke={colors[severity]}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={circ * 0.25}
            style={{ transition: "stroke-dasharray 0.9s ease" }}
          />
          <text x="70" y="66" textAnchor="middle" className="ring-number" fill={colors[severity]}>
            {displayed}
          </text>
          <text x="70" y="84" textAnchor="middle" className="ring-sub" fill="var(--ink-faint)">
            / 100
          </text>
        </svg>
      </div>
      <div className="score-verdict" style={{ color: colors[severity] }}>
        {labels[severity]}
      </div>
    </div>
  );
}
