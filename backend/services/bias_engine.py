from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Any

import numpy as np
import pandas as pd
from aif360.algorithms.preprocessing import Reweighing
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric, ClassificationMetric
from fastapi import HTTPException, UploadFile
from sklearn.linear_model import LogisticRegression


@dataclass
class PreparedData:
    df_original: pd.DataFrame
    dataset: BinaryLabelDataset
    privileged_groups: list[dict[str, int]]
    unprivileged_groups: list[dict[str, int]]
    label_col: str
    sensitive_col: str
    privileged_val: str
    unprivileged_val: str
    positive_label: str


async def parse_csv_upload(file: UploadFile) -> pd.DataFrame:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        return pd.read_csv(BytesIO(content))
    except Exception as exc:  # pragma: no cover - pandas emits varied parser errors
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}") from exc


def preview_json_rows(df: pd.DataFrame, size: int = 2) -> list[dict[str, Any]]:
    return df.head(size).replace({np.nan: None}).to_dict(orient="records")


def _as_text(series: pd.Series) -> pd.Series:
    s = series.astype(str).str.strip()
    return s.str.replace(r"\.0$", "", regex=True)


def prepare_binary_dataset(
    df: pd.DataFrame,
    *,
    label_col: str,
    sensitive_col: str,
    privileged_val: str,
    positive_label: str,
    unprivileged_val: str | None,
) -> PreparedData:
    if label_col not in df.columns:
        raise HTTPException(
            status_code=400, detail=f"label_col '{label_col}' not found in CSV."
        )
    if sensitive_col not in df.columns:
        raise HTTPException(
            status_code=400, detail=f"sensitive_col '{sensitive_col}' not found in CSV."
        )

    label_text = _as_text(df[label_col])
    sensitive_text = _as_text(df[sensitive_col])

    unique_labels = set(label_text.unique())
    unique_sensitive = set(sensitive_text.unique())

    if positive_label not in unique_labels:
        raise HTTPException(
            status_code=400,
            detail=f"positive_label '{positive_label}' not found in {label_col}.",
        )
    if privileged_val not in unique_sensitive:
        raise HTTPException(
            status_code=400,
            detail=f"privileged_val '{privileged_val}' not found in {sensitive_col}.",
        )

    inferred_unpriv = unprivileged_val
    if inferred_unpriv is None:
        candidates = [val for val in sorted(unique_sensitive) if val != privileged_val]
        if not candidates:
            raise HTTPException(
                status_code=400, detail="Need at least two groups in sensitive column."
            )
        inferred_unpriv = candidates[0]

    if inferred_unpriv not in unique_sensitive:
        raise HTTPException(
            status_code=400,
            detail=f"unprivileged_val '{inferred_unpriv}' not found in {sensitive_col}.",
        )
    if inferred_unpriv == privileged_val:
        raise HTTPException(
            status_code=400, detail="privileged_val and unprivileged_val must differ."
        )

    # Keep only selected comparison groups for consistent fairness math.
    keep_mask = (sensitive_text == privileged_val) | (sensitive_text == inferred_unpriv)
    df_filtered = df.loc[keep_mask].copy()
    if df_filtered.empty:
        raise HTTPException(
            status_code=400, detail="No rows remain after group filtering."
        )

    label_filtered = _as_text(df_filtered[label_col])
    sensitive_filtered = _as_text(df_filtered[sensitive_col])

    df_binary = df_filtered.copy()
    df_binary[label_col] = (label_filtered == positive_label).astype(int)
    df_binary[sensitive_col] = (sensitive_filtered == privileged_val).astype(int)

    dataset = BinaryLabelDataset(
        df=df_binary,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col],
    )

    return PreparedData(
        df_original=df_filtered,
        dataset=dataset,
        privileged_groups=[{sensitive_col: 1}],
        unprivileged_groups=[{sensitive_col: 0}],
        label_col=label_col,
        sensitive_col=sensitive_col,
        privileged_val=privileged_val,
        unprivileged_val=inferred_unpriv,
        positive_label=positive_label,
    )


def _equal_opp_diff_from_model(
    prepared: PreparedData, sample_weight: np.ndarray | None = None
) -> float:
    df = prepared.df_original.copy()
    label_binary = (
        (_as_text(df[prepared.label_col]) == prepared.positive_label)
        .astype(int)
        .to_numpy()
    )

    feature_df = df.drop(columns=[prepared.label_col])
    x = pd.get_dummies(feature_df, drop_first=False)

    if len(np.unique(label_binary)) < 2:
        return 0.0

    model = LogisticRegression(max_iter=500)
    model.fit(x, label_binary, sample_weight=sample_weight)
    y_pred = model.predict(x)

    pred_dataset = prepared.dataset.copy(deepcopy=True)
    pred_dataset.labels = y_pred.reshape(-1, 1)

    class_metric = ClassificationMetric(
        prepared.dataset,
        pred_dataset,
        privileged_groups=prepared.privileged_groups,
        unprivileged_groups=prepared.unprivileged_groups,
    )
    return float(class_metric.equal_opportunity_difference())


def compute_metrics(prepared: PreparedData) -> dict[str, Any]:
    metric = BinaryLabelDatasetMetric(
        prepared.dataset,
        privileged_groups=prepared.privileged_groups,
        unprivileged_groups=prepared.unprivileged_groups,
    )

    di = float(metric.disparate_impact())
    spd = float(metric.statistical_parity_difference())
    eod = _equal_opp_diff_from_model(prepared)

    priv_instances = metric.num_instances(privileged=True)
    unpriv_instances = metric.num_instances(privileged=False)

    priv_rate = (
        float(metric.num_positives(privileged=True) / priv_instances)
        if priv_instances > 0
        else 0.0
    )
    unpriv_rate = (
        float(metric.num_positives(privileged=False) / unpriv_instances)
        if unpriv_instances > 0
        else 0.0
    )

    group_text = _as_text(prepared.df_original[prepared.sensitive_col])
    priv_count = int((group_text == prepared.privileged_val).sum())
    unpriv_count = int((group_text == prepared.unprivileged_val).sum())

    return {
        "disparate_impact": di,
        "stat_parity_diff": spd,
        "equal_opp_diff": eod,
        "group_stats": {
            "privileged": {
                "label": prepared.privileged_val,
                "positive_rate": priv_rate,
                "count": priv_count,
            },
            "unprivileged": {
                "label": prepared.unprivileged_val,
                "positive_rate": unpriv_rate,
                "count": unpriv_count,
            },
        },
    }


def apply_reweighing(prepared: PreparedData) -> tuple[pd.DataFrame, dict[str, Any]]:
    rw = Reweighing(
        privileged_groups=prepared.privileged_groups,
        unprivileged_groups=prepared.unprivileged_groups,
    )
    dataset_fixed = rw.fit_transform(prepared.dataset)

    metric_after = BinaryLabelDatasetMetric(
        dataset_fixed,
        privileged_groups=prepared.privileged_groups,
        unprivileged_groups=prepared.unprivileged_groups,
    )

    di_after = float(metric_after.disparate_impact())
    spd_after = float(metric_after.statistical_parity_difference())
    eod_after = _equal_opp_diff_from_model(
        prepared, sample_weight=dataset_fixed.instance_weights
    )

    df_export = prepared.df_original.copy()
    df_export["reweighing_weight"] = dataset_fixed.instance_weights

    priv_instances = metric_after.num_instances(privileged=True)
    unpriv_instances = metric_after.num_instances(privileged=False)

    priv_rate = (
        float(metric_after.num_positives(privileged=True) / priv_instances)
        if priv_instances > 0
        else 0.0
    )
    unpriv_rate = (
        float(metric_after.num_positives(privileged=False) / unpriv_instances)
        if unpriv_instances > 0
        else 0.0
    )

    group_text = _as_text(prepared.df_original[prepared.sensitive_col])
    priv_count = int((group_text == prepared.privileged_val).sum())
    unpriv_count = int((group_text == prepared.unprivileged_val).sum())

    metrics = {
        "disparate_impact": di_after,
        "stat_parity_diff": spd_after,
        "equal_opp_diff": eod_after,
        "group_stats": {
            "privileged": {
                "label": prepared.privileged_val,
                "positive_rate": priv_rate,
                "count": priv_count,
            },
            "unprivileged": {
                "label": prepared.unprivileged_val,
                "positive_rate": unpriv_rate,
                "count": unpriv_count,
            },
        },
    }
    return df_export, metrics
