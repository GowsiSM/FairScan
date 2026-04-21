import pandas as pd
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric
from aif360.algorithms.preprocessing import Reweighing

# ── Load ──────────────────────────────────────────────────────
df = pd.read_csv("./backend/hiring_biased.csv")

privileged_groups = [{"gender": 1}]
unprivileged_groups = [{"gender": 0}]

dataset = BinaryLabelDataset(
    df=df, label_names=["hired"], protected_attribute_names=["gender"]
)

# ── Before ────────────────────────────────────────────────────
metric_before = BinaryLabelDatasetMetric(
    dataset,
    privileged_groups=privileged_groups,
    unprivileged_groups=unprivileged_groups,
)

print("=== BEFORE ===")
print("Disparate Impact:       ", round(metric_before.disparate_impact(), 3))
print(
    "Stat Parity Difference: ", round(metric_before.statistical_parity_difference(), 3)
)

# ── Reweighing ────────────────────────────────────────────────
RW = Reweighing(
    unprivileged_groups=unprivileged_groups, privileged_groups=privileged_groups
)
dataset_fixed = RW.fit_transform(dataset)

# ── After ─────────────────────────────────────────────────────
metric_after = BinaryLabelDatasetMetric(
    dataset_fixed,
    privileged_groups=privileged_groups,
    unprivileged_groups=unprivileged_groups,
)

print("\n=== AFTER ===")
print("Disparate Impact:       ", round(metric_after.disparate_impact(), 3))
print(
    "Stat Parity Difference: ", round(metric_after.statistical_parity_difference(), 3)
)

# ── Export debiased CSV ───────────────────────────────────────
df_fixed, _ = dataset_fixed.convert_to_dataframe()
df_fixed["weight"] = dataset_fixed.instance_weights
df_fixed.to_csv("hiring_debiased.csv", index=False)

print("\nDebiased CSV saved as hiring_debiased.csv")
