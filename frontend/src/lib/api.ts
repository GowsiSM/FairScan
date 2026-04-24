// Set VITE_MOCK=true in .env.local to develop without the backend running
const USE_MOCK = import.meta.env.VITE_MOCK === "true";
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function getColumns(file: File): Promise<{columns: string[], unique_values: any}> {
  if (USE_MOCK) {
    const { mockGetColumns } = await import("./mockApi");
    return { columns: mockGetColumns(file), unique_values: {} } as any;
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/columns`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Failed to read columns");
  const data = await res.json();
  return { columns: data.columns, unique_values: data.unique_values };
}

export async function analyze(
  file: File,
  sensitiveAttr: string,
  labelCol: string,
  privilegedValue: string,
  unprivilegedValue: string,
  domain: string,
  positiveLabel: string = "1",
) {
  if (USE_MOCK) {
    const { mockAnalyze } = await import("./mockApi");
    return mockAnalyze();
  }
  const form = new FormData();
  form.append("file", file);
  form.append("sensitive_col", sensitiveAttr);
  form.append("label_col", labelCol);
  form.append("privileged_val", privilegedValue);
  form.append("unprivileged_val", unprivilegedValue);
  form.append("positive_label", positiveLabel);
  form.append("domain", domain);
  const res = await fetch(`${BASE}/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export async function fixBias(sessionId: string) {
  if (USE_MOCK) {
    const { mockFixBias } = await import("./mockApi");
    return mockFixBias();
  }
  const res = await fetch(`${BASE}/fix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error("Fix failed");
  return res.json();
}

export function downloadUrl(token: string) {
  return `${BASE}/download/${token}`;
}


export async function getPresets() {
  const res = await fetch(`${BASE}/presets`);
  if (!res.ok) throw new Error("Failed to load presets");
  return res.json();
}

export async function getDemoDataset(domain: string) {
  const res = await fetch(`${BASE}/demo/${domain}`);
  if (!res.ok) throw new Error("Failed to load demo dataset");
  return res.json();
}


export async function analyzeColumns(payload: {
  columns: string[];
  unique_values: Record<string, string[]>;
  domain: string;
  provider: "gemini" | "local";
}) {
  const res = await fetch(`${BASE}/analyze-columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("AI Analysis failed");
  return res.json();
}
