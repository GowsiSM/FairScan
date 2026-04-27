import { useState, useEffect } from "react";
import "./AiExplainer.css";

interface Props {
  explanation?: string;
  loading?: boolean;
}

export default function AiExplainer({ explanation, loading }: Props) {
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!explanation) {
      setParagraphs([]);
      setVisibleCount(0);
      return;
    }
    const paras = explanation.split("\n\n").filter((p) => p.trim());
    setParagraphs(paras);
    setVisibleCount(0);
    // Stagger paragraph reveals — clean fade-in, no typewriter
    paras.forEach((_, i) => {
      setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), i * 180);
    });
  }, [explanation]);

  if (!loading && !explanation) return null;

  return (
    <div className="ai-explainer">
      {/* Header row */}
      <div className="ae-header">
        <div className="ae-badge">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          Gemini AI Analysis
        </div>
        {loading && (
          <div className="ae-loading-row">
            <span className="ae-pulse" />
            <span className="ae-loading-text">Analyzing bias context…</span>
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && !explanation && (
        <div className="ae-skeleton">
          <div className="ae-skeleton-line long" />
          <div className="ae-skeleton-line medium" />
          <div className="ae-skeleton-line long" />
          <div className="ae-skeleton-line short" />
        </div>
      )}

      {/* Content */}
      {explanation && (
        <div className="ae-content">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className={`ae-para ${i < visibleCount ? "visible" : ""}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
