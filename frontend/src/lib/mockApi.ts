/**
 * MOCK API — use this during frontend development
 * when the backend isn't running.
 *
 * To use: in api.ts, swap the real functions for these.
 * Switch back before integration testing.
 */

import type { AnalysisResult, FixResult } from "./types";

export const MOCK_RESULT: AnalysisResult = {
  session_id: "mock-session-001",
  bias_score: 34,
  domain: "hiring",
  sensitive_attr: "sex",
  label_col: "income",
  privileged_group: "Male",
  unprivileged_group: "Female",
  headline: "Women are 42% less likely to be selected.",
  summary:
    "Your dataset shows a significant fairness gap. Female candidates receive positive outcomes at a rate well below the 80% threshold required by employment law. This pattern suggests systematic disadvantage in the decision process.",
  metrics: [
    {
      key: "disparate_impact",
      label: "Disparate Impact",
      value: 0.58,
      threshold: 0.8,
      direction: "lower_is_worse",
      story: "Female candidates are selected at 58% the rate of male candidates. The legal minimum is 80%.",
      severity: "high",
    },
    {
      key: "stat_parity_diff",
      label: "Statistical Parity",
      value: -0.19,
      threshold: 0,
      direction: "zero_is_best",
      story: "There is a 19 percentage point gap in positive outcome rates between groups.",
      severity: "high",
    },
    {
      key: "equal_opp_diff",
      label: "Equal Opportunity",
      value: -0.12,
      threshold: 0,
      direction: "zero_is_best",
      story: "Even among equally qualified candidates, women are selected 12% less often.",
      severity: "medium",
    },
  ],
  group_stats: [
    { group: "Male", positive_rate: 0.31, count: 3247 },
    { group: "Female", positive_rate: 0.11, count: 1179 },
  ],
};

export const MOCK_FIX: FixResult = {
  bias_score_before: 34,
  bias_score_after: 71,
  metrics_before: MOCK_RESULT.metrics,
  metrics_after: [
    {
      key: "disparate_impact",
      label: "Disparate Impact",
      value: 0.89,
      threshold: 0.8,
      direction: "lower_is_worse",
      story: "After reweighing, female candidates are selected at 89% the rate of males. Above the legal threshold.",
      severity: "low",
    },
    {
      key: "stat_parity_diff",
      label: "Statistical Parity",
      value: -0.03,
      threshold: 0,
      direction: "zero_is_best",
      story: "The outcome gap has been reduced from 19 points to just 3 points.",
      severity: "low",
    },
    {
      key: "equal_opp_diff",
      label: "Equal Opportunity",
      value: -0.04,
      threshold: 0,
      direction: "zero_is_best",
      story: "Qualified candidates are now treated nearly equally across groups.",
      severity: "low",
    },
  ],
  group_stats_after: [
    { group: "Male", positive_rate: 0.29, count: 3247 },
    { group: "Female", positive_rate: 0.26, count: 1179 },
  ],
  download_token: "mock-download-token-abc123",
};

// Drop-in replacements for api.ts during dev
export async function mockGetColumns(_file: File): Promise<string[]> {
  await delay(400);
  return ["age", "workclass", "education", "sex", "race", "hours-per-week", "income"];
}

export async function mockAnalyze(): Promise<AnalysisResult> {
  await delay(1800);
  return MOCK_RESULT;
}

export async function mockFixBias(): Promise<FixResult> {
  await delay(1400);
  return MOCK_FIX;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
