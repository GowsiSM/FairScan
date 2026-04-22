import { useState } from "react";

const endpoints = [
  {
    method: "POST", path: "/columns", desc: "Parse CSV headers for column selector UI",
    request: `file:  CSV file`,
    response: `{
  "columns":   ["age", "gender", "education", "hired"],
  "preview":   [{ "age": 34, "gender": 1, "hired": 1 }, ...],
  "row_count": 82
}`,
  },
  {
    method: "POST", path: "/analyze", desc: "Run bias analysis on uploaded CSV",
    request: `file:           CSV file
label_col:      "hired"        // target column
sensitive_col:  "gender"       // protected attribute
privileged_val: "1"            // privileged group value
positive_label: "1"            // positive outcome value
domain:         "hiring"       // hiring | lending | healthcare`,
    response: `{
  "bias_score":     34,              // 0–100, lower = more biased
  "verdict":        "high_bias",     // high_bias | moderate | fair
  "metrics": {
    "disparate_impact":  0.61,       // <0.8 = biased (80% rule)
    "stat_parity_diff":  -0.28,      // <-0.1 = biased
    "equal_opp_diff":    -0.19       // close to 0 = fair
  },
  "explanations": {
    "disparate_impact": "Women hired at 61% the rate of men.",
    "stat_parity_diff": "28% gap in positive outcomes.",
    "equal_opp_diff":   "Qualified women selected 19% less often."
  },
  "domain_context": "DI below 0.8 may violate EEOC's 80% rule.",
  "group_stats": {
    "privileged":   { "label": "Male",   "positive_rate": 0.62, "count": 52 },
    "unprivileged": { "label": "Female", "positive_rate": 0.12, "count": 30 }
  },
  "session_id": "abc123"
}`,
  },
  {
    method: "POST", path: "/fix", desc: "Apply Reweighing, return before/after",
    request: `{ "session_id": "abc123" }`,
    response: `{
  "before": { "bias_score": 34, "disparate_impact": 0.19, "stat_parity_diff": -0.79 },
  "after":  { "bias_score": 91, "disparate_impact": 0.98, "stat_parity_diff": -0.01 },
  "technique":    "Reweighing",
  "explanation":  "Underrepresented samples given higher weights.",
  "download_token": "xyz789"
}`,
  },
  {
    method: "GET", path: "/download/{token}", desc: "Download debiased CSV",
    request: `// token from /fix response`,
    response: `// Returns CSV file stream
// Content-Disposition: attachment
// No JSON — triggers browser file save`,
  },
];

const beSteps = [
  ["Set up FastAPI project", "Install aif360 pandas scikit-learn python-multipart"],
  ["Build /columns", "Read CSV headers + 2-row preview → return JSON"],
  ["Build /analyze core", "Load CSV into BinaryLabelDataset, compute 3 metrics"],
  ["Write threshold logic", "Derive bias_score, verdict, plain-English explanations"],
  ["Store dataset in memory", "Dict keyed by session_id (uuid) for /fix to reuse"],
  ["Build /fix", "Run Reweighing on stored dataset, recompute metrics, before/after"],
  ["Build /download", "Return debiased CSV as StreamingResponse file stream"],
  ["Add domain presets", "Map domain → context string injected into /analyze response"],
  ["CORS + deploy", "Add CORS middleware, deploy to Railway via Procfile"],
];

const feSteps = [
  ["Set up project", "React + TypeScript + Tailwind + Recharts via Vite"],
  ["CSV upload dropzone", "On file select → call /columns → show column selector dropdowns"],
  ["Domain preset selector", "Hiring / Lending / Healthcare — auto-fills column dropdowns"],
  ["Analyze button", "POST to /analyze → store full response in state"],
  ["Bias Score card", "Large 0–100 number, color-coded by verdict field"],
  ["3 metric cards", "Use metrics{} + explanations{} from response"],
  ["Bar chart", "Recharts BarChart from group_stats — outcome rate per group"],
  ["Fix Bias button", "POST to /fix → show before/after comparison panel"],
  ["Download button", "GET /download/{token} → trigger browser file save"],
];

const screens = [
  {
    name: "Screen 1 — Upload & Configure", route: "/",
    fields: [
      ["file (local state)", "CSV file object from drag-drop or file input"],
      ["/columns response", "columns[], preview[], row_count → populate dropdowns"],
      ["domain preset", "Hardcoded in frontend — auto-fills label_col + sensitive_col"],
      ["user selections", "label_col, sensitive_col, privileged_val → sent to /analyze"],
    ]
  },
  {
    name: "Screen 2 — Bias Report", route: "/report",
    fields: [
      ["bias_score", "Large score card, 0–100, color by verdict"],
      ["verdict", "high_bias=red, moderate=yellow, fair=green"],
      ["metrics{}", "3 metric cards — value + threshold indicator"],
      ["explanations{}", "Plain-English text under each metric card"],
      ["domain_context", "Info banner below score card"],
      ["group_stats{}", "Recharts BarChart — positive_rate side by side per group"],
      ["session_id", "Stored in state, sent to /fix on button click"],
    ]
  },
  {
    name: "Screen 3 — Fix & Compare", route: "/report (panel slides in)",
    fields: [
      ["before{}", "Left column: original bias_score + 2 key metrics"],
      ["after{}", "Right column: fixed score + metrics — color shifts green"],
      ["technique", "Badge: 'Reweighing'"],
      ["explanation", "Plain-English description of what the fix did"],
      ["download_token", "Constructs /download/{token} URL for Download button"],
    ]
  },
];

export default function FairScanDraft() {
  const [openEp, setOpenEp] = useState(0);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "2rem", color: "#1a1a1a" }}>

      {/* Overview */}
      <section>
        <Label>Project Overview</Label>
        <Card>
          <div style={{ fontWeight: 500, fontSize: 15 }}>FairScan — Bias Detection & Mitigation Tool</div>
          <div style={{ fontSize: 13, color: "#666", margin: "4px 0 12px" }}>Upload a dataset → detect bias → fix it → download clean data</div>
          <FlowRow items={["CSV Upload", "Column Config", "Bias Analysis", "Report + Charts", "Fix Bias", "Download"]} />
          <div style={{ borderTop: "1px solid #e5e5e5", margin: "12px 0" }} />
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
            {[
              ["Backend", "FastAPI + AIF360 + Pandas", "Deploy: Railway"],
              ["Frontend", "React + TypeScript + Recharts", "Deploy: Vercel"],
              ["Team split", "You → Backend + Deploy", "Teammate → Frontend + Deck"],
            ].map(([title, a, b]) => (
              <div key={title}>
                <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#999", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{b}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Endpoints */}
      <section>
        <Label>API Contract — Endpoints</Label>
        {endpoints.map((ep, i) => (
          <div key={ep.path} style={{ border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
            <div onClick={() => setOpenEp(openEp === i ? -1 : i)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fafafa", cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "#EAF3DE", color: "#3B6D11" }}>{ep.method}</span>
              <span style={{ fontSize: 13, fontWeight: 500, fontFamily: "monospace" }}>{ep.path}</span>
              <span style={{ fontSize: 12, color: "#888", marginLeft: "auto" }}>{ep.desc}</span>
              <span style={{ color: "#aaa", fontSize: 13 }}>{openEp === i ? "▾" : "▸"}</span>
            </div>
            {openEp === i && (
              <div style={{ padding: 14, background: "#f5f5f5", borderTop: "1px solid #e5e5e5" }}>
                <SchemaLabel>Request</SchemaLabel>
                <Pre>{ep.request}</Pre>
                <SchemaLabel>Response</SchemaLabel>
                <Pre>{ep.response}</Pre>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Workflows */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label><span style={{ background: "#E6F1FB", color: "#0C447C", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10 }}>Backend</span> &nbsp;Your Tasks</Label>
          <Card style={{ padding: 12 }}>
            {beSteps.map(([title, sub], i) => (
              <Step key={i} num={i + 1} title={title} sub={sub} />
            ))}
          </Card>
        </div>
        <div>
          <Label><span style={{ background: "#FAEEDA", color: "#633806", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10 }}>Frontend</span> &nbsp;Teammate Tasks</Label>
          <Card style={{ padding: 12 }}>
            {feSteps.map(([title, sub], i) => (
              <Step key={i} num={i + 1} title={title} sub={sub} />
            ))}
          </Card>
        </div>
      </section>

      {/* Screens */}
      <section>
        <Label>Frontend Screens — What Data Each One Needs</Label>
        {screens.map(sc => (
          <div key={sc.name} style={{ border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "#fafafa", borderBottom: "1px solid #e5e5e5" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{sc.name}</span>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#999" }}>{sc.route}</span>
            </div>
            <div style={{ padding: 14, background: "#f5f5f5" }}>
              {sc.fields.map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 6 }}>
                  <span style={{ fontFamily: "monospace", color: "#185FA5", minWidth: 150, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: "#555" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* File structure */}
      <section>
        <Label>Backend File Structure</Label>
        <Card>
          <Pre>{`fairscan-backend/
├── main.py              # FastAPI app, CORS, route registration
├── routes/
│   ├── analyze.py       # /columns and /analyze endpoints
│   ├── fix.py           # /fix endpoint
│   └── download.py      # /download/{token} endpoint
├── services/
│   ├── bias_engine.py   # AIF360 logic — metrics + Reweighing
│   ├── scorer.py        # bias_score from raw metrics
│   └── explainer.py     # threshold → plain English strings
├── store.py             # in-memory dict for session datasets
├── presets.py           # domain context strings
├── requirements.txt
└── Procfile             # web: uvicorn main:app --host 0.0.0.0 --port $PORT`}</Pre>
        </Card>
      </section>

    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>{children}</div>;
}
function Card({ children, style }) {
  return <div style={{ background: "#f9f9f9", border: "1px solid #e5e5e5", borderRadius: 10, padding: 16, ...style }}>{children}</div>;
}
function Pre({ children }) {
  return <pre style={{ fontSize: 12, fontFamily: "monospace", color: "#444", background: "#fff", border: "1px solid #e5e5e5", borderRadius: 6, padding: 12, overflowX: "auto", lineHeight: 1.65, margin: 0 }}>{children}</pre>;
}
function SchemaLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#999", marginBottom: 6, marginTop: 12 }}>{children}</div>;
}
function FlowRow({ items }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {items.map((item, i) => (
        <span key={item} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff" }}>{item}</span>
          {i < items.length - 1 && <span style={{ color: "#aaa" }}>→</span>}
        </span>
      ))}
    </div>
  );
}
function Step({ num, title, sub }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
      <div style={{ minWidth: 22, height: 22, borderRadius: "50%", background: "#fff", border: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#666", flexShrink: 0, marginTop: 1 }}>{num}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}
