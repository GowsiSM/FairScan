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
  privilegedName?: string,
  unprivilegedName?: string,
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
  if (privilegedName) form.append("privileged_name_override", privilegedName);
  if (unprivilegedName) form.append("unprivileged_name_override", unprivilegedName);
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

export async function explainBias(sessionId: string): Promise<{ explanation: string }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 2000));
    return {
      explanation:
        "Your dataset reveals a concerning pattern where female candidates face a significantly lower selection rate compared to their male counterparts. This 42% gap suggests that historical hiring decisions may have been influenced by gender-related factors rather than purely merit-based criteria.\n\nLooking at the contributing features, factors like years of experience and educational background appear to be strongly correlated with the bias. This is a common pattern in hiring datasets — historically, women have had fewer opportunities to accumulate certain types of experience or access specific educational pathways, and when these features carry heavy weight in decision-making, they perpetuate existing inequalities.\n\nThe real-world impact of this bias is substantial. For every 100 qualified female candidates, roughly 42 fewer are receiving positive outcomes compared to equally situated male candidates. This doesn't just affect individual careers — it reinforces systemic barriers and reduces organizational diversity.\n\nBeyond applying the statistical fix, we recommend auditing your hiring criteria to ensure they measure actual job-relevant qualifications. Consider whether proxy variables (like specific school names or continuous employment history) might be inadvertently screening out qualified candidates from underrepresented groups.",
    };
  }
  const res = await fetch(`${BASE}/explain-bias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "AI explanation failed");
  }
  return res.json();
}
