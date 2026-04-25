import { useState, useEffect } from "react";
import { explainBias } from "../lib/api";
import "./AiExplainer.css";

interface Props {
  sessionId: string;
}

export default function AiExplainer({ sessionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [displayedText, setDisplayedText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!explanation) {
      setDisplayedText("");
      return;
    }
    
    let i = 0;
    const timer = setInterval(() => {
      setDisplayedText(explanation.substring(0, i + 1));
      i++;
      if (i >= explanation.length) clearInterval(timer);
    }, 15);
    
    return () => clearInterval(timer);
  }, [explanation]);

  const handleExplain = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await explainBias(sessionId);
      setExplanation(res.explanation);
    } catch (err: any) {
      setError(err.message || "AI explanation unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-explainer-narrative">
      {!explanation && !loading && (
        <button className="ae-generate-btn" onClick={handleExplain}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
          </svg>
          Explain the bias
        </button>
      )}

      {loading && (
        <div className="ae-loading">
          <span className="ae-spinner" /> Analyzing bias patterns...
        </div>
      )}
      
      {error && <div className="ae-error">{error}</div>}

      {explanation && (
        <div className="ae-code-box">
          <div className="ae-code-header">
            <span className="ae-dot red"></span>
            <span className="ae-dot yellow"></span>
            <span className="ae-dot green"></span>
            <span className="ae-code-title">ai-bias-analysis.md</span>
          </div>
          <div className="ae-text mono-font">
            {displayedText.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            {displayedText.length < explanation.length && (
              <span className="ae-cursor"></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
