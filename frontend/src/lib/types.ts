export interface BiasMetric {
  key: string;
  label: string;
  value: number;
  threshold: number;
  direction: "lower_is_worse" | "zero_is_best";
  story: string;
  severity: "high" | "medium" | "low";
}

export interface GroupStat {
  group: string;
  positive_rate: number;
  count: number;
}

export interface BiasContributor {
  feature: string;
  importance: number;
}

export interface AnalysisResult {
  session_id: string;
  bias_score: number;
  domain: string;
  domain_context?: string;
  sensitive_attr: string;
  label_col: string;
  privileged_group: string;
  unprivileged_group: string;
  metrics: BiasMetric[];
  group_stats: GroupStat[];
  headline: string;
  summary: string;
  bias_contributors?: BiasContributor[];
  analysis_type?: string;
  /** Set when this result was loaded from Firestore */
  firestoreId?: string;
  /** If true, Fix Bias is disabled and AI re-fetch is skipped */
  isReadOnly?: boolean;
  /** ISO timestamp from Firestore */
  createdAt?: any;
}

export interface PresetConfig {
  domain_context: string;
  sensitive_col_hint: string;
  label_col_hint: string;
}

export type PresetsResponse = Record<string, PresetConfig>;

export interface FixResult {
  bias_score_before: number;
  bias_score_after: number;
  metrics_before: BiasMetric[];
  metrics_after: BiasMetric[];
  group_stats_after: GroupStat[];
  download_token: string;
}

export type Domain = "hiring" | "lending" | "healthcare" | "custom";
