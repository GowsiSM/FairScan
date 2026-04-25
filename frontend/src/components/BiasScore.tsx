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
  const [dashFill, setDashFill] = useState(0);

  const r = 48;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    // Reset first (handles re-renders with new score)
    setDisplayed(0);
    setDashFill(0);

    let start = 0;
    const end = score;
    const duration = 1000;
    const steps = duration / 16;
    const increment = end / steps;

    const timer = setInterval(() => {
      start = Math.min(start + increment, end);
      setDisplayed(Math.round(start));
      setDashFill(start);
      if (start >= end) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [score]);

  // Ring: starts at top (−90° = −circ/4 offset), fills clockwise
  const filled = (dashFill / 100) * circ;
  const empty = circ - filled;
  // strokeDashoffset = −circ * 0.25 rotates start point to 12 o'clock
  const offset = circ * 0.25;

  return (
    <div className="bias-score">
      <div className="score-label-top">Fairness score</div>

      <div className="score-ring-wrap">
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          style={{ display: "block" }}
        >
          {/* Track */}
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="7"
          />

          {/* Filled arc — clockwise from top */}
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={colors[severity]}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${empty}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dasharray 0.06s linear" }}
          />

          {/* Score number — centered */}
          <text
            x="80"
            y="74"
            textAnchor="middle"
            dominantBaseline="middle"
            className="ring-number"
            fill={colors[severity]}
          >
            {displayed}
          </text>

          {/* /100 label below score */}
          <text
            x="80"
            y="96"
            textAnchor="middle"
            dominantBaseline="middle"
            className="ring-sub"
            fill="var(--ink-faint)"
          >
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
