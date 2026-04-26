import { useState, useEffect } from "react";
import "./AiExplainer.css";

interface Props {
  explanation?: string;
  loading?: boolean;
}

export default function AiExplainer({ explanation, loading }: Props) {
  const [displayedText, setDisplayedText] = useState("");

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

  return (
    <div className="ai-explainer-narrative">
      {loading && (
        <div className="ae-loading">
          <span className="ae-spinner" /> Analyzing bias patterns...
        </div>
      )}

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
