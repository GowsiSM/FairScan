import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserAnalyses } from "../lib/firestore";
import type { AnalysisResult } from "../lib/types";
import "./HistorySidebar.css";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (result: AnalysisResult) => void;
  activeFirestoreId?: string;
}

function scoreColor(score: number) {
  if (score >= 70) return "score-low";
  if (score >= 40) return "score-medium";
  return "score-high";
}

function formatDate(createdAt: any): string {
  if (!createdAt) return "";
  try {
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function HistorySidebar({ open, onClose, onSelect, activeFirestoreId }: Props) {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<(AnalysisResult & { firestoreId: string; createdAt: any })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    setError("");
    getUserAnalyses(user.uid)
      .then(setAnalyses)
      .catch((err) => {
        console.error("Firestore Error:", err);
        setError("Failed to load history.");
      })
      .finally(() => setLoading(false));
  }, [open, user]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const sidebar = (
    <>
      {/* Backdrop — clicking outside closes the panel */}
      <div
        className={`history-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside className={`history-sidebar ${open ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Scan History">
        <div className="history-header">
          <div className="history-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Scan History
          </div>
          <button className="history-close" onClick={onClose} aria-label="Close history">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="history-body">
          {loading && (
            <div className="history-loading">
              <span className="spinner" />
              Loading history…
            </div>
          )}

          {!loading && error && (
            <div className="history-error">{error}</div>
          )}

          {!loading && !error && analyses.length === 0 && (
            <div className="history-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p>No saved analyses yet.</p>
              <span>Run a scan and save the report to see it here.</span>
            </div>
          )}

          {!loading && analyses.map((a) => (
            <button
              key={a.firestoreId}
              className={`history-card ${a.firestoreId === activeFirestoreId ? "active" : ""}`}
              onClick={() => {
                onSelect(a);
                onClose();
              }}
            >
              <div className="history-card-top">
                <span className="history-domain">{a.domain}</span>
                <span className={`history-score ${scoreColor(a.bias_score)}`}>
                  {a.bias_score}
                </span>
              </div>
              <div className="history-headline">{a.headline}</div>
              <div className="history-meta">
                <span className="history-attr">{a.sensitive_attr}</span>
                <span className="history-date">{formatDate(a.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="history-footer">
          Showing up to 20 most recent scans
        </div>
      </aside>
    </>
  );

  // Render into document.body via portal so it's completely outside
  // the report page DOM tree — no layout interference ever
  return createPortal(sidebar, document.body);
}
