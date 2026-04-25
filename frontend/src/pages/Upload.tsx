import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { getColumns, analyze, analyzeColumns } from "../lib/api";
import type { Domain } from "../lib/types";
import "./Upload.css";

interface Props {
  onResult: (r: any) => void;
  onBack: () => void;
}

/* ── Domain SVG Icons ── */
const HiringIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <path d="M12 12v.01" />
    <path d="M2 12h20" />
  </svg>
);

const LendingIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M3 7h18" />
    <path d="M5 7v14" />
    <path d="M19 7v14" />
    <path d="M9 7V3h6v4" />
    <path d="M12 11v4" />
    <path d="M10 13h4" />
  </svg>
);

const HealthcareIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.04 3 5.5l7 7Z" />
    <path d="M12 5v6" />
    <path d="M9 8h6" />
  </svg>
);

const CustomIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const DatasetIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const ModelIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16.01" />
    <line x1="16" y1="16" x2="16" y2="16.01" />
  </svg>
);

const DOMAINS: { id: Domain; label: string; icon: ReactNode; hint: string }[] = [
  {
    id: "hiring",
    label: "Hiring",
    icon: <HiringIcon />,
    hint: "Job applications, résumé screening",
  },
  {
    id: "lending",
    label: "Lending",
    icon: <LendingIcon />,
    hint: "Loan approvals, credit decisions",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    icon: <HealthcareIcon />,
    hint: "Treatment allocation, diagnostics",
  },
  {
    id: "custom",
    label: "Custom",
    icon: <CustomIcon />,
    hint: "Any other decision system",
  },
];

const DEMO_SETS = [
  { domain: "hiring", label: "Hiring (biased)", file: "hiring.csv" },
  { domain: "lending", label: "Loan approval", file: "lending.csv" },
  { domain: "healthcare", label: "Healthcare", file: "healthcare.csv" },
];

export default function Upload({ onResult, onBack }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [analysisType, setAnalysisType] = useState<"dataset" | "model">("dataset");

  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>(
    {},
  );

  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const [sensitiveAttr, setSensitiveAttr] = useState("");
  const [labelCol, setLabelCol] = useState("");
  const [predictionCol, setPredictionCol] = useState("");
  const [privVal, setPrivVal] = useState("");
  const [unprivVal, setUnprivVal] = useState("");
  const [positiveLabel, setPositiveLabel] = useState("");

  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (f: File, overrideDomain?: Domain) => {
      setFile(f);
      setError("");
      const activeDomain = overrideDomain || domain || "custom";

      try {
        const { columns: cols, unique_values: uVals } = await getColumns(f);
        setColumns(cols);
        setUniqueValues(uVals);

        // Attempt AI Analysis
        if (activeDomain !== "custom" && Object.keys(uVals).length > 0) {
          setAiLoading(true);
          try {
            const aiRes = await analyzeColumns({
              columns: cols,
              unique_values: uVals,
              domain: activeDomain,
              provider: "gemini",
            });
            setAiData(aiRes);
          } catch (err) {
            console.warn("AI extraction failed, ignoring", err);
          } finally {
            setAiLoading(false);
            setStep(4);
          }
        } else {
          setStep(4);
        }
      } catch {
        setError("Could not read columns. Make sure it's a valid CSV.");
      }
    },
    [domain],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const getGroupValueName = (col: string, val: string) => {
    return aiData?.group_mappings?.[col]?.[val] || undefined;
  };

  const handleSubmit = async () => {
    if (
      !file ||
      !sensitiveAttr ||
      !labelCol ||
      (analysisType === "model" && !predictionCol) ||
      !privVal ||
      !unprivVal ||
      !domain ||
      !positiveLabel
    )
      return;
    setLoading(true);
    setError("");
    try {
      const privName = getGroupValueName(sensitiveAttr, privVal);
      const unprivName = getGroupValueName(sensitiveAttr, unprivVal);
      
      const result = await analyze(
        file,
        sensitiveAttr,
        labelCol,
        privVal,
        unprivVal,
        domain,
        positiveLabel,
        privName,
        unprivName,
        analysisType,
        predictionCol,
      );
      onResult(result);
    } catch {
      setError("Analysis failed. Check your column selections.");
      setLoading(false);
    }
  };

  const availableDemos =
    domain === "custom"
      ? DEMO_SETS
      : DEMO_SETS.filter((d) => d.domain === domain);

  // Helper to append AI annotations softly
  const getColLabel = (col: string) => {
    if (aiData?.sensitive_columns?.[col]) {
      return `${col} (${aiData.sensitive_columns[col]})`;
    }
    return col;
  };

  const getOutcomeValueLabel = (val: string) => {
    if (labelCol && aiData?.outcome_values?.[labelCol]?.[val]) {
      return `${val} (${aiData.outcome_values[labelCol][val]})`;
    }
    return val;
  };

  const getGroupValueLabel = (col: string, val: string) => {
    if (aiData?.group_mappings?.[col]?.[val]) {
      return `${aiData.group_mappings[col][val]} (${val})`;
    }
    return val;
  };

  // Auto-fill effect when AI data arrives
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  useEffect(() => {
    if (aiData && !hasAutoFilled) {
      // Sensitive Column
      const sensCol = Object.keys(aiData.sensitive_columns || {})[0];
      if (sensCol && columns.includes(sensCol)) {
        setSensitiveAttr(sensCol);
      }

      // Outcome Column
      const outCol = Object.keys(aiData.outcome_values || {})[0];
      if (outCol && columns.includes(outCol)) {
        setLabelCol(outCol);

        // Find positive/impacted values
        const vals = aiData.outcome_values[outCol];
        const posVal = Object.keys(vals).find(
          (v) => vals[v] === "not impacted",
        );
        if (posVal) setPositiveLabel(posVal);
      }

      setHasAutoFilled(true);
    }
  }, [aiData, columns, hasAutoFilled]);

  // Helper for dynamic placeholders
  const getGroupPlaceholder = (type: "priv" | "unpriv") => {
    if (!sensitiveAttr) return type === "priv" ? "e.g. Male" : "e.g. Female";
    const values = uniqueValues[sensitiveAttr];
    if (values && values.length > 0) {
      return type === "priv"
        ? `e.g. ${values[0]}`
        : `e.g. ${values[1] || values[0]}`;
    }
    return `Enter ${type} group`;
  };

  return (
    <div className="upload-page">
      <img src="/weight.svg" className="page-bg-icon" alt="" />
      <div className="upload-layout">
        <aside className="upload-sidebar">
          <button className="back-btn" onClick={onBack}>
            <img src="/weight.svg" className="nav-icon" alt="" />
            fairscan
          </button>
          <div className="vertical-step-indicator">
            {[
              { num: 1, label: "Context", click: () => step !== 1 && setStep(1), clickable: step !== 1 },
              { num: 2, label: "Analysis", click: () => step > 2 && setStep(2), clickable: step > 2 },
              { num: 3, label: "Dataset", click: () => step > 3 && setStep(3), clickable: step > 3 },
              { num: 4, label: "Configure", click: undefined, clickable: false }
            ].map(s => (
              <div 
                key={s.num} 
                className={`v-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''} ${s.clickable ? 'clickable' : ''}`}
                onClick={s.click}
              >
                <div className="v-step-line"></div>
                <div className="v-step-dot"></div>
                <div className="v-step-text">
                  <span className="v-step-num">0{s.num}</span>
                  <span className="v-step-label">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

      <main className={`upload-main step-${step}-active`}>
        {/* Step 1 — Domain */}
        <section
          className={`step-block ${step === 1 ? "current" : "done"}`}
          onClick={() => step !== 1 && setStep(1)}
        >
          <div className="step-meta">
            <span className="step-num">01</span>
            <span className="step-label">Context</span>
          </div>
          <h2 className="step-title">What kind of decisions?</h2>

          {domain && (
            <div className="step-summary">
              <span className="summary-label">Selected:</span>
              <span className="summary-value">
                {DOMAINS.find((d) => d.id === domain)?.label}
              </span>
            </div>
          )}

          <div className="domain-grid">
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                className={`domain-card ${domain === d.id ? "selected" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
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
        </section>

        {/* Step 2 — Analysis Type */}
        <section
          className={`step-block ${step === 2 ? "current" : step > 2 ? "done" : "pending"}`}
          onClick={() => step > 2 && setStep(2)}
        >
          <div className="step-meta">
            <span className="step-num">02</span>
            <span className="step-label">Analysis Type</span>
          </div>
          <h2 className="step-title">What are you analyzing?</h2>

          <div className="domain-grid">
            <button
              className={`domain-card ${analysisType === "dataset" ? "selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setAnalysisType("dataset");
                setStep(3);
              }}
            >
              <span className="domain-icon"><DatasetIcon /></span>
              <span className="domain-label">Training Data</span>
              <span className="domain-hint">Analyze raw dataset for historical bias</span>
            </button>
            <button
              className={`domain-card ${analysisType === "model" ? "selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setAnalysisType("model");
                setStep(3);
              }}
            >
              <span className="domain-icon"><ModelIcon /></span>
              <span className="domain-label">Model Predictions</span>
              <span className="domain-hint">Analyze model outputs for predictive bias</span>
            </button>
          </div>
        </section>

        {/* Step 3 — File */}
        <section
          className={`step-block ${step === 3 ? "current" : step > 3 ? "done" : "pending"}`}
          onClick={() => step > 3 && setStep(3)}
        >
          <div className="step-meta">
            <span className="step-num">03</span>
            <span className="step-label">Dataset</span>
          </div>
          <h2 className="step-title">Upload your CSV</h2>

          {file && (
            <div className="step-summary">
              <span className="summary-label">File:</span>
              <span className="summary-value">{file.name}</span>
            </div>
          )}

          {aiLoading && columns.length > 0 ? (
            <div className="scanning-container fade-in">
              <div className="csv-table-preview">
                <div className="csv-table-header">
                  {columns.map((col, idx) => (
                    <div
                      key={col}
                      className="csv-col"
                      style={{ animationDelay: `${idx * 0.15}s` }}
                    >
                      {col}
                    </div>
                  ))}
                </div>
                <div className="csv-table-body">
                  <div className="csv-row-skeleton"></div>
                  <div className="csv-row-skeleton"></div>
                  <div className="csv-row-skeleton"></div>
                </div>
              </div>
              <p className="scanning-text">AI is mapping your columns...</p>
              <AnimatedSvg />
            </div>
          ) : (
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
                <span className="drop-text">Drop CSV here</span>
              </div>

              {analysisType === "dataset" ? (
                <div className="demo-row">
                  <span className="demo-label">Or try a demo:</span>
                  {availableDemos.map((d) => (
                    <button
                      key={d.file}
                      className="demo-chip"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await fetch(`/demo-datasets/${d.file}`);
                          const blob = await res.blob();
                          handleFile(
                            new File([blob], d.file, { type: "text/csv" }),
                            d.domain as Domain,
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
              ) : (
                <div className="model-instructions">
                  <span className="demo-label">How to analyze your model:</span>
                  <ol className="instruction-list">
                    <li>
                      Download a test dataset:
                      <div className="instruction-actions">
                        {availableDemos.map((d) => (
                          <button
                            key={d.file}
                            className="demo-chip outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              const a = document.createElement("a");
                              a.href = `/demo-datasets/${d.file}`;
                              a.download = d.file;
                              a.click();
                            }}
                          >
                            Download {d.label} CSV
                          </button>
                        ))}
                      </div>
                    </li>
                    <li>Run your model on the downloaded CSV to generate predictions.</li>
                    <li>Add your predictions to the CSV as a new column.</li>
                    <li>Upload the modified CSV above.</li>
                  </ol>
                </div>
              )}
            </>
          )}
        </section>

        {/* Step 4 — Columns */}
        <section className={`step-block ${step === 4 ? "current" : "pending"}`}>
          <div className="step-meta">
            <span className="step-num">04</span>
            <span className="step-label">Configure</span>
          </div>
          <h2 className="step-title">Map columns</h2>

          {sensitiveAttr && labelCol && (
            <div className="step-summary">
              <span className="summary-label">Sensitive:</span>
              <span className="summary-value">{sensitiveAttr}</span>
              <span className="summary-label">Outcome:</span>
              <span className="summary-value">{labelCol}</span>
            </div>
          )}

          {aiLoading && (
            <div className="ai-loading">
              <span
                className="spinner"
                style={{
                  width: 12,
                  height: 12,
                  borderWidth: 2,
                  borderColor: "var(--brand)",
                  borderTopColor: "transparent",
                }}
              />
              AI is analyzing dataset context...
            </div>
          )}

          <div className="fields">
            <label className="field">
              <span className="field-label">
                Sensitive attribute{" "}
                {aiData && <span className="ai-badge">★ AI mapped</span>}
              </span>
              <select
                value={sensitiveAttr}
                onChange={(e) => setSensitiveAttr(e.target.value)}
              >
                <option value="">Select column</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {getColLabel(c)}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-row">
              <label className={`field ${analysisType === 'model' ? 'half' : ''}`}>
                <span className="field-label">
                  {analysisType === "model" ? "Ground truth column" : "Outcome column"}
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

              {analysisType === "model" && (
                <label className="field half">
                  <span className="field-label">Prediction column</span>
                  <select
                    value={predictionCol}
                    onChange={(e) => setPredictionCol(e.target.value)}
                  >
                    <option value="">Select column</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="field-row">
              <label className="field half">
                <span className="field-label">Privileged group value</span>
                {uniqueValues[sensitiveAttr] ? (
                  <select
                    value={privVal}
                    onChange={(e) => setPrivVal(e.target.value)}
                  >
                    <option value="">Select value</option>
                    {aiData?.numerical_groups?.[sensitiveAttr]?.map((grp: string) => (
                      <option key={grp} value={grp}>
                        ✦ {grp}
                      </option>
                    ))}
                    {aiData?.numerical_groups?.[sensitiveAttr] && (
                      <option disabled>──────</option>
                    )}
                    {uniqueValues[sensitiveAttr].map((v) => (
                      <option key={v} value={v}>
                        {getGroupValueLabel(sensitiveAttr, v)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={privVal}
                    onChange={(e) => setPrivVal(e.target.value)}
                    placeholder={getGroupPlaceholder("priv")}
                  />
                )}
              </label>

              <label className="field half">
                <span className="field-label">Unprivileged group value</span>
                {uniqueValues[sensitiveAttr] ? (
                  <select
                    value={unprivVal}
                    onChange={(e) => setUnprivVal(e.target.value)}
                  >
                    <option value="">Select value</option>
                    {aiData?.numerical_groups?.[sensitiveAttr]?.map((grp: string) => (
                      <option key={grp} value={grp}>
                        ✦ {grp}
                      </option>
                    ))}
                    {aiData?.numerical_groups?.[sensitiveAttr] && (
                      <option disabled>──────</option>
                    )}
                    {uniqueValues[sensitiveAttr].map((v) => (
                      <option key={v} value={v}>
                        {getGroupValueLabel(sensitiveAttr, v)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={unprivVal}
                    onChange={(e) => setUnprivVal(e.target.value)}
                    placeholder={getGroupPlaceholder("unpriv")}
                  />
                )}
              </label>
            </div>

            <label className="field">
              <span className="field-label">
                Positive outcome value{" "}
                {aiData && labelCol && (
                  <span className="ai-badge">★ AI impacted check</span>
                )}
              </span>
              {uniqueValues[labelCol] ? (
                <select
                  value={positiveLabel}
                  onChange={(e) => setPositiveLabel(e.target.value)}
                >
                  <option value="">Select value</option>
                  {uniqueValues[labelCol].map((v) => (
                    <option key={v} value={v}>
                      {getOutcomeValueLabel(v)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={positiveLabel}
                  onChange={(e) => setPositiveLabel(e.target.value)}
                  placeholder="e.g. 1"
                />
              )}
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
              (analysisType === "model" && !predictionCol) ||
              !privVal ||
              !unprivVal ||
              !positiveLabel ||
              aiLoading
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
      </main>
      </div>
    </div>
  );
}

function AnimatedSvg() {
  const [tick, setTick] = useState(0);
  const totalFrames = 44;

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const cycleLength = (totalFrames - 1) * 2;
  const cycleTick = tick % cycleLength;
  const frame = cycleTick < totalFrames ? cycleTick : cycleLength - cycleTick;

  const frameStr = String(frame).padStart(3, "0");
  const src = `/weight-balance/Whisk_idzlhtn5yjywytnl1iyyitotkjykrtl4ytmm1so_${frameStr}.svg`;

  return (
    <div className="animated-svg-container scanning-scale">
      <img src={src} alt="Animated balance scale" className="animated-svg" />
    </div>
  );
}
