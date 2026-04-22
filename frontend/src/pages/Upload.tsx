import { useState, useRef, useCallback } from "react";
import { getColumns, analyze } from "../lib/api";
import type { Domain } from "../lib/types";
import "./Upload.css";

interface Props {
  onResult: (r: any) => void;
  onBack: () => void;
}

const DOMAINS: { id: Domain; label: string; icon: string; hint: string }[] = [
  {
    id: "hiring",
    label: "Hiring",
    icon: "◈",
    hint: "Job applications, résumé screening",
  },
  {
    id: "lending",
    label: "Lending",
    icon: "◎",
    hint: "Loan approvals, credit decisions",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    icon: "◇",
    hint: "Treatment allocation, diagnostics",
  },
  {
    id: "custom",
    label: "Custom",
    icon: "○",
    hint: "Any other decision system",
  },
];

const DEMO_SETS = [
  { label: "Hiring (biased)", file: "hiring_biased.csv" },
  { label: "Loan approval", file: "loan_approval.csv" },
  { label: "Healthcare", file: "healthcare.csv" },
];

export default function Upload({ onResult, onBack }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [sensitiveAttr, setSensitiveAttr] = useState("");
  const [labelCol, setLabelCol] = useState("");
  const [privVal, setPrivVal] = useState("");
  const [unprivVal, setUnprivVal] = useState("");
  const [positiveLabel, setPositiveLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError("");
    try {
      const cols = await getColumns(f);
      setColumns(cols);
      setStep(3);
    } catch {
      setError("Could not read columns. Make sure it's a valid CSV.");
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (
      !file ||
      !sensitiveAttr ||
      !labelCol ||
      !privVal ||
      !unprivVal ||
      !domain ||
      !positiveLabel
    )
      return;
    setLoading(true);
    setError("");
    try {
      const result = await analyze(
        file,
        sensitiveAttr,
        labelCol,
        privVal,
        unprivVal,
        domain,
        positiveLabel,
      );
      onResult(result);
    } catch {
      setError("Analysis failed. Check your column selections.");
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <header className="upload-header">
        <button className="back-btn" onClick={onBack}>
          ← fairscan
        </button>
        <div className="step-indicator">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`step-dot ${step >= n ? "active" : ""}`} />
          ))}
        </div>
      </header>

      <main className="upload-main">
        {/* Step 1 — Domain */}
        <section
          className={`step-block ${step === 1 ? "current" : step > 1 ? "done" : ""}`}
        >
          <div className="step-meta">
            <span className="step-num">01</span>
            <span className="step-label">Context</span>
          </div>
          <h2 className="step-title">
            What kind of decisions does your data describe?
          </h2>
          {step === 1 && (
            <div className="domain-grid">
              {DOMAINS.map((d) => (
                <button
                  key={d.id}
                  className={`domain-card ${domain === d.id ? "selected" : ""}`}
                  onClick={() => {
                    setDomain(d.id);
                    setStep(2);
                  }}
                >
                  <span className="domain-icon">{d.icon}</span>
                  <span className="domain-label">{d.label}</span>
                  <span className="domain-hint">{d.hint}</span>
                </button>
              ))}
            </div>
          )}
          {step > 1 && domain && (
            <div className="done-tag" onClick={() => setStep(1)}>
              {DOMAINS.find((d) => d.id === domain)?.label} ↗
            </div>
          )}
        </section>

        {/* Step 2 — File */}
        {step >= 2 && (
          <section
            className={`step-block ${step === 2 ? "current" : step > 2 ? "done" : ""}`}
          >
            <div className="step-meta">
              <span className="step-num">02</span>
              <span className="step-label">Dataset</span>
            </div>
            <h2 className="step-title">Upload your CSV</h2>
            {step === 2 && (
              <>
                <div
                  className={`dropzone ${drag ? "dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      e.target.files?.[0] && handleFile(e.target.files[0])
                    }
                  />
                  <span className="drop-icon">↑</span>
                  <span className="drop-text">
                    Drop CSV here or click to browse
                  </span>
                </div>
                <div className="demo-row">
                  <span className="demo-label">Or try a demo:</span>
                  {DEMO_SETS.map((d) => (
                    <button
                      key={d.file}
                      className="demo-chip"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/demo-datasets/${d.file}`);
                          const blob = await res.blob();
                          handleFile(
                            new File([blob], d.file, { type: "text/csv" }),
                          );
                        } catch {
                          setError("Demo dataset not found.");
                        }
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step > 2 && file && (
              <div className="done-tag" onClick={() => setStep(2)}>
                {file.name} ↗
              </div>
            )}
          </section>
        )}

        {/* Step 3 — Columns */}
        {step >= 3 && (
          <section className="step-block current">
            <div className="step-meta">
              <span className="step-num">03</span>
              <span className="step-label">Configure</span>
            </div>
            <h2 className="step-title">Map your columns</h2>
            <div className="fields">
              <label className="field">
                <span className="field-label">Sensitive attribute</span>
                <span className="field-hint">
                  The protected column (e.g. gender, race)
                </span>
                <select
                  value={sensitiveAttr}
                  onChange={(e) => setSensitiveAttr(e.target.value)}
                >
                  <option value="">Select column</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Outcome column</span>
                <span className="field-hint">
                  The decision column (e.g. hired, approved)
                </span>
                <select
                  value={labelCol}
                  onChange={(e) => setLabelCol(e.target.value)}
                >
                  <option value="">Select column</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <div className="field-row">
                <label className="field half">
                  <span className="field-label">Privileged group value</span>
                  <span className="field-hint">e.g. "Male", "White", 1</span>
                  <input
                    type="text"
                    value={privVal}
                    onChange={(e) => setPrivVal(e.target.value)}
                    placeholder="e.g. Male"
                  />
                </label>
                <label className="field half">
                  <span className="field-label">Unprivileged group value</span>
                  <span className="field-hint">e.g. "Female", "Black", 0</span>
                  <input
                    type="text"
                    value={unprivVal}
                    onChange={(e) => setUnprivVal(e.target.value)}
                    placeholder="e.g. Female"
                  />
                </label>
              </div>

              <label className="field">
                <span className="field-label">Positive outcome value</span>
                <span className="field-hint">
                  The value that means "yes" in your outcome column (e.g.
                  "&gt;50K", "1", "yes")
                </span>
                <input
                  type="text"
                  value={positiveLabel}
                  onChange={(e) => setPositiveLabel(e.target.value)}
                  placeholder='e.g. "&gt;50K" or "1" or "yes"'
                />
              </label>
            </div>

            {error && <div className="upload-error">{error}</div>}

            <button
              className="analyze-btn"
              onClick={handleSubmit}
              disabled={
                loading ||
                !sensitiveAttr ||
                !labelCol ||
                !privVal ||
                !unprivVal ||
                !positiveLabel
              }
            >
              {loading ? (
                <span className="analyzing">
                  <span className="spinner" /> Scanning for bias…
                </span>
              ) : (
                "Run analysis →"
              )}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
