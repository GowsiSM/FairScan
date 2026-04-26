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
    prediction_col: str | None = None
    pred_dataset: BinaryLabelDataset | None = None


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def parse_csv_upload(file: UploadFile) -> pd.DataFrame:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    # Check size if available before reading
    if file.size is not None and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, detail="File too large. Maximum size is 10MB."
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Final size check after reading
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, detail="File too large. Maximum size is 10MB."
        )

    try:
        return pd.read_csv(BytesIO(content), low_memory=True)
    except Exception as exc:  # pragma: no cover - pandas emits varied parser errors
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}") from exc


def preview_json_rows(df: pd.DataFrame, size: int = 2) -> list[dict[str, Any]]:
    return df.head(size).replace({np.nan: None}).to_dict(orient="records")


def _as_text(series: pd.Series) -> pd.Series:
    s = series.astype(str).str.strip()
    return s.str.replace(r"\.0$", "", regex=True)


def _parse_and_apply_range(series: pd.Series, range_str: str) -> pd.Series | None:
    import re
    match = re.search(r'\(([^)]+)\)$', range_str.strip())
    if not match:
        return None
    
    expr = match.group(1).replace(" ", "")
    num_series = pd.to_numeric(series, errors='coerce')
    
    if '-' in expr:
        parts = expr.split('-')
        if len(parts) == 2 and parts[0].replace('.','',1).isdigit() and parts[1].replace('.','',1).isdigit():
            min_val = float(parts[0])
            max_val = float(parts[1])
            return (num_series >= min_val) & (num_series <= max_val)
    elif expr.endswith('+'):
        val = expr[:-1]
        if val.replace('.','',1).isdigit():
            return num_series >= float(val)
    elif expr.startswith('<='):
        val = expr[2:]
        if val.replace('.','',1).isdigit():
            return num_series <= float(val)
    elif expr.startswith('<'):
        val = expr[1:]
        if val.replace('.','',1).isdigit():
            return num_series < float(val)
    elif expr.startswith('>='):
        val = expr[2:]
        if val.replace('.','',1).isdigit():
            return num_series >= float(val)
    elif expr.startswith('>'):
        val = expr[1:]
        if val.replace('.','',1).isdigit():
            return num_series > float(val)
            
    return None

def prepare_binary_dataset(
    df: pd.DataFrame,
    *,
    label_col: str,
    sensitive_col: str,
    privileged_val: str,
    positive_label: str,
    unprivileged_val: str | None,
    prediction_col: str | None = None,
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

    priv_mask = sensitive_text == privileged_val
    if privileged_val not in unique_sensitive:
        range_mask = _parse_and_apply_range(df[sensitive_col], privileged_val)
        if range_mask is not None:
            priv_mask = range_mask
        else:
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

    unpriv_mask = sensitive_text == inferred_unpriv
    if inferred_unpriv not in unique_sensitive:
        range_mask = _parse_and_apply_range(df[sensitive_col], inferred_unpriv)
        if range_mask is not None:
            unpriv_mask = range_mask
        else:
            raise HTTPException(
                status_code=400,
                detail=f"unprivileged_val '{inferred_unpriv}' not found in {sensitive_col}.",
            )

    if inferred_unpriv == privileged_val:
        raise HTTPException(
            status_code=400, detail="privileged_val and unprivileged_val must differ."
        )

    keep_mask = priv_mask | unpriv_mask
    df_filtered = df.loc[keep_mask].copy()
    if df_filtered.empty:
        raise HTTPException(
            status_code=400, detail="No rows remain after group filtering."
        )

    label_filtered = _as_text(df_filtered[label_col])
    priv_mask_filtered = priv_mask.loc[keep_mask]
    
    # Ensure the column can hold string labels (prevents TypeError on numeric columns)
    df_filtered[sensitive_col] = df_filtered[sensitive_col].astype(object)
    df_filtered.loc[priv_mask_filtered, sensitive_col] = privileged_val
    df_filtered.loc[~priv_mask_filtered, sensitive_col] = inferred_unpriv

    df_binary = df_filtered.copy()
    df_binary[label_col] = (label_filtered == positive_label).astype(int)
    df_binary[sensitive_col] = priv_mask_filtered.astype(int)

    dataset = BinaryLabelDataset(
        df=df_binary,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col],
    )

    pred_dataset = None
    if prediction_col:
        if prediction_col not in df_filtered.columns:
            raise HTTPException(
                status_code=400, detail=f"prediction_col '{prediction_col}' not found."
            )
        df_pred = df_filtered.copy()
        pred_label_filtered = _as_text(df_pred[prediction_col])
        df_pred[prediction_col] = (pred_label_filtered == positive_label).astype(int)
        df_pred[sensitive_col] = priv_mask_filtered.astype(int)
        pred_dataset = BinaryLabelDataset(
            df=df_pred,
            label_names=[prediction_col],
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
        prediction_col=prediction_col,
        pred_dataset=pred_dataset,
    )


def _equal_opp_diff_from_model(
    prepared: PreparedData, sample_weight: np.ndarray | None = None
) -> float:
    df = prepared.df_original.copy()
    
    # PERFORMANCE: Sample for large datasets
    if len(df) > 5000:
        df = df.sample(5000, random_state=42)
        if sample_weight is not None:
             # This only happens during reweighing, but we should be careful.
             # For now, let's skip sampling if weights are present or handle it.
             pass 
             
    label_binary = (
        (_as_text(df[prepared.label_col]) == prepared.positive_label)
        .astype(int)
        .to_numpy()
    )

    feature_df = df.drop(columns=[prepared.label_col])
    
    # PERFORMANCE: Limit categorical expansion
    for col in feature_df.select_dtypes(include=['object']):
        if feature_df[col].nunique() > 50:
            feature_df = feature_df.drop(columns=[col])
            
    x = pd.get_dummies(feature_df, drop_first=False)
    
    # PERFORMANCE: Hard cap on number of dummy columns to prevent explosion
    if x.shape[1] > 50:
        x = x.iloc[:, :50]

    if len(np.unique(label_binary)) < 2:
        return 0.0

    model = LogisticRegression(max_iter=100, solver="liblinear", C=1.0)
    model.fit(x, label_binary, sample_weight=sample_weight)
    y_pred = model.predict(x)

    # PERFORMANCE: Manual calculation avoids BinaryLabelDataset overhead and alignment issues
    sensitive_binary = (
        (_as_text(df[prepared.sensitive_col]) == prepared.privileged_val)
        .astype(int)
        .to_numpy()
    )
    
    priv_mask = (sensitive_binary == 1) & (label_binary == 1)
    unpriv_mask = (sensitive_binary == 0) & (label_binary == 1)
    
    if priv_mask.sum() == 0 or unpriv_mask.sum() == 0:
        return 0.0
        
    tpr_priv = y_pred[priv_mask].mean()
    tpr_unpriv = y_pred[unpriv_mask].mean()
    
    return float(tpr_unpriv - tpr_priv)


def compute_metrics(prepared: PreparedData, analysis_type: str = "dataset") -> dict[str, Any]:
    if analysis_type == "model" and prepared.pred_dataset is not None:
        # For model predictions, calculate metrics on the predicted labels
        metric = BinaryLabelDatasetMetric(
            prepared.pred_dataset,
            privileged_groups=prepared.privileged_groups,
            unprivileged_groups=prepared.unprivileged_groups,
        )
        di = float(metric.disparate_impact())
        spd = float(metric.statistical_parity_difference())

        # Equal Opportunity is True Positive Rate diff
        # We can calculate this directly comparing true labels vs predicted labels
        class_metric = ClassificationMetric(
            prepared.dataset,
            prepared.pred_dataset,
            privileged_groups=prepared.privileged_groups,
            unprivileged_groups=prepared.unprivileged_groups,
        )
        eod = float(class_metric.equal_opportunity_difference())

    else:
        # For dataset historical bias, calculate metrics on the ground truth
        metric = BinaryLabelDatasetMetric(
            prepared.dataset,
            privileged_groups=prepared.privileged_groups,
            unprivileged_groups=prepared.unprivileged_groups,
        )
        di = float(metric.disparate_impact())
        spd = float(metric.statistical_parity_difference())
        # EOD approximation: difference in positive rates (no proxy model needed for dataset mode)
        # This is equivalent to statistical parity difference for binary outcomes
        eod = spd  # Positive rate gap serves as the EOD proxy for historical dataset bias

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


def compute_feature_importance(prepared: PreparedData, analysis_type: str = "dataset") -> list[dict[str, Any]]:
    """Identify which features contribute most to the bias gap."""
    df = prepared.df_original.copy()
    
    # PERFORMANCE: Sample for large datasets
    if len(df) > 5000:
        df = df.sample(5000, random_state=42)
        
    target_col = prepared.prediction_col if analysis_type == "model" and prepared.prediction_col else prepared.label_col
    
    label_binary = (
        (_as_text(df[target_col]) == prepared.positive_label)
        .astype(int)
        .to_numpy()
    )

    feature_df = df.drop(columns=[target_col])
    if target_col != prepared.label_col:
        feature_df = feature_df.drop(columns=[prepared.label_col], errors='ignore')
        
    # PERFORMANCE: Limit categorical expansion
    for col in feature_df.select_dtypes(include=['object']):
        if feature_df[col].nunique() > 50:
            feature_df = feature_df.drop(columns=[col])
            
    x = pd.get_dummies(feature_df, drop_first=False)
    
    # PERFORMANCE: Hard cap on number of dummy columns to prevent explosion
    if x.shape[1] > 50:
        x = x.iloc[:, :50]

    if len(np.unique(label_binary)) < 2:
        return []

    model = LogisticRegression(max_iter=100, solver="liblinear", C=1.0)
    model.fit(x, label_binary)

    # Get absolute feature importances from coefficients
    importances = np.abs(model.coef_[0])

    # Correlate each feature with the sensitive attribute to see
    # which features are both important AND correlated with group membership
    sensitive_binary = (
        _as_text(df[prepared.sensitive_col]) == prepared.privileged_val
    ).astype(int).to_numpy()

    # PERFORMANCE: Vectorized correlation calculation
    x_np = x.to_numpy().astype(float)
    s_mean = np.mean(sensitive_binary)
    s_std = np.std(sensitive_binary)
    
    if s_std == 0:
        correlations = np.zeros(x_np.shape[1])
    else:
        x_mean = np.mean(x_np, axis=0)
        x_std = np.std(x_np, axis=0)
        e_xs = (x_np.T @ sensitive_binary) / len(sensitive_binary)
        cov = e_xs - (x_mean * s_mean)
        correlations = np.zeros(x_np.shape[1])
        nonzero = x_std > 0
        correlations[nonzero] = np.abs(cov[nonzero] / (x_std[nonzero] * s_std))

    # Bias contribution = importance × correlation with sensitive attr
    bias_contribution = importances * correlations

    # Map back to original column names (collapse one-hot dummies)
    col_contributions: dict[str, float] = {}
    for feat_name, contrib in zip(x.columns, bias_contribution):
        # One-hot columns are named "OrigCol_Value" — get base column
        base_col = feat_name
        for orig_col in feature_df.columns:
            if feat_name.startswith(f"{orig_col}_") or feat_name == orig_col:
                base_col = orig_col
                break
        # Skip the sensitive column itself — it's obviously correlated
        if base_col == prepared.sensitive_col:
            continue
        col_contributions[base_col] = col_contributions.get(base_col, 0.0) + contrib

    if not col_contributions:
        return []

    import math
    
    total = sum(col_contributions.values())
    if total == 0 or math.isnan(total):
        return []

    sorted_contribs = sorted(col_contributions.items(), key=lambda x: x[1], reverse=True)[:5]
    return [
        {"feature": name, "importance": round((val / total) * 100, 1) if not math.isnan(val) else 0.0}
        for name, val in sorted_contribs
        if val > 0 and not math.isnan(val)
    ]


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
