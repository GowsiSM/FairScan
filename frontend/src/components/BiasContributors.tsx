import { useEffect, useState } from "react";
import type { BiasContributor } from "../lib/types";
import "./BiasContributors.css";

interface Props {
  contributors: BiasContributor[];
  sensitiveAttr: string;
  aiNote?: string;
  aiLoading?: boolean;
  analysisType?: "dataset" | "model";
}

export default function BiasContributors({
  contributors,
  sensitiveAttr,
  aiNote,
  aiLoading,
  analysisType,
}: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!contributors || contributors.length === 0) return null;

  const max = Math.max(...contributors.map((c) => c.importance));

  const defaultNote =
    analysisType === "model"
      ? `These features are both predictive of the model's output and correlated with ${sensitiveAttr} — suggesting the model may have learned discriminatory patterns.`
      : `These features are both predictive of the outcome and correlated with ${sensitiveAttr} — meaning they may act as proxies for group membership in your training data.`;

  const displayNote =
    aiNote || (aiLoading ? "Generating analysis..." : defaultNote);

  return (
    <section className="bias-contributors">
      <div className="bc-header">
        <div className="bc-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <div>
          <h3 className="bc-title">Why this bias exists</h3>
          <p className="bc-sub">
            Top features contributing to the {sensitiveAttr} bias gap
          </p>
        </div>
      </div>

      <div className="bc-bars">
        {contributors.map((c, i) => (
          <div className="bc-row" key={c.feature}>
            <span className="bc-feature">{c.feature}</span>
            <div className="bc-track">
              <div
                className="bc-fill"
                style={{
                  width: animated ? `${(c.importance / max) * 100}%` : "0%",
                  transitionDelay: `${i * 120}ms`,
                }}
              />
            </div>
            <span className="bc-pct">{c.importance}%</span>
          </div>
        ))}
      </div>

      <p className={`bc-note ${aiLoading ? "skeleton-text" : ""}`}>
        {displayNote}
      </p>
    </section>
  );
}
