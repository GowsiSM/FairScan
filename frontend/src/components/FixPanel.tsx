import { useEffect, useState } from "react";
import type { AnalysisResult, FixResult } from "../lib/types";
import CertBadge from "./CertBadge";
import "./FixPanel.css";

interface Props {
  before: AnalysisResult;
  fix: FixResult;
  onDownload: () => void;
}

const scoreColor = (s: number) =>
  s >= 70 ? "#2a7d4f" : s >= 40 ? "#c98c1a" : "#d4522a";

function AnimatedScore({
  endValue,
  durationMs = 1000,
}: {
  endValue: number;
  durationMs?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      setValue(Math.round(progress * endValue));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [endValue, durationMs]);

  return (
    <div className="ba-score" style={{ color: scoreColor(value) }}>
      {value}
    </div>
  );
}

function FinalParityBars({
  statsBefore,
  statsAfter,
}: {
  statsBefore: { group: string; positive_rate: number }[];
  statsAfter: { group: string; positive_rate: number }[];
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(
    ...statsBefore.map((s) => s.positive_rate),
    ...statsAfter.map((s) => s.positive_rate),
    0.01,
  );

  // Merge by group name
  const groups = statsBefore.map((before) => {
    const after = statsAfter.find((a) => a.group === before.group);
    return {
      group: before.group,
      before: before.positive_rate,
      after: after?.positive_rate ?? before.positive_rate,
    };
  });

  return (
    <div className="parity-bars-section">
      <div className="pb-header">
        <span className="pb-title">Group outcome rates</span>
        <div className="pb-legend">
          <span className="pb-dot before" />
          <span className="pb-legend-label">Before</span>
          <span className="pb-dot after" />
          <span className="pb-legend-label">After</span>
        </div>
      </div>
      <div className="pb-rows">
        {groups.map((g, i) => (
          <div className="pb-group" key={i}>
            <span className="pb-group-label">{g.group}</span>
            <div className="pb-tracks">
              {/* Before */}
              <div className="pb-track-row">
                <span className="pb-track-sub">Before</span>
                <div className="pb-track">
                  <div
                    className="pb-fill pb-fill-before"
                    style={{
                      width: animated ? `${(g.before / max) * 100}%` : "0%",
                      transitionDelay: `${i * 80}ms`,
                    }}
                  />
                </div>
                <span className="pb-pct">{(g.before * 100).toFixed(1)}%</span>
              </div>
              {/* After */}
              <div className="pb-track-row">
                <span className="pb-track-sub">After</span>
                <div className="pb-track">
                  <div
                    className="pb-fill pb-fill-after"
                    style={{
                      width: animated ? `${(g.after / max) * 100}%` : "0%",
                      transitionDelay: `${i * 80 + 120}ms`,
                    }}
                  />
                </div>
                <span className="pb-pct improved">
                  {(g.after * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FixPanel({ before, fix, onDownload }: Props) {
  const improvement = fix.bias_score_after - fix.bias_score_before;

  return (
    <section className="fix-panel">
      {/* ── Header ── */}
      <div className="fix-panel-header">
        <div className="fix-eyebrow">Bias corrected</div>
        <h2 className="fix-title">
          Fairness score improved by{" "}
          <span className="improvement">+{improvement} points</span>
        </h2>
        <p className="fix-desc">
          The Reweighing algorithm has rebalanced your dataset. Here's the full
          before-and-after picture.
        </p>
      </div>

      {/* ── Score comparison ── */}
      <div className="before-after">
        <div className="ba-col column-before">
          <div className="ba-label">Before</div>
          <AnimatedScore endValue={fix.bias_score_before} />
          <div className="ba-sub">/ 100</div>
          <CertBadge score={fix.bias_score_before} compact />
          <div className="ba-metrics">
            {fix.metrics_before.map((m) => (
              <div className="ba-metric" key={m.key}>
                <span className="ba-metric-name">{m.label}</span>
                <span className="ba-metric-val">{m.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="ba-arrow-col">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className="ba-arrow-label">+{improvement}</span>
        </div>

        <div className="ba-col column-after after">
          <div className="ba-label">After</div>
          <AnimatedScore endValue={fix.bias_score_after} durationMs={1200} />
          <div className="ba-sub">/ 100</div>
          <CertBadge score={fix.bias_score_after} compact />
          <div className="ba-metrics">
            {fix.metrics_after.map((m) => (
              <div className="ba-metric" key={m.key}>
                <span className="ba-metric-name">{m.label}</span>
                <span className="ba-metric-val improved">
                  {m.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Before/After parity bars ── */}
      <FinalParityBars
        statsBefore={before.group_stats}
        statsAfter={fix.group_stats_after}
      />

      {/* ── Download ── */}
      <div className="download-row">
        <div>
          <div className="dl-title">Download debiased dataset</div>
          <div className="dl-sub">
            Contains <code>reweighing_weight</code> column — use as{" "}
            <code>sample_weight</code> when training your model
          </div>
        </div>
        <button className="dl-btn" onClick={onDownload}>
          Download CSV ↓
        </button>
      </div>
    </section>
  );
}
