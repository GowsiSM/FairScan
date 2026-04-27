from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from fastapi import APIRouter, File, Form, UploadFile

from presets import get_domain_context
from services.bias_engine import (
    compute_feature_importance,
    compute_metrics,
    parse_csv_upload,
    prepare_binary_dataset,
    preview_json_rows,
)
from services.explainer import build_explanations, group_label
from services.scorer import score_bias
from store import SessionData, set_session

router = APIRouter()


@router.post("/columns")
async def columns(file: UploadFile = File(...)) -> dict:
    df = await parse_csv_upload(file)

    unique_values = {}
    for col in df.columns:
        uniques = df[col].dropna().unique()
        if len(uniques) <= 100:
            unique_values[col] = [
                str(x).replace(".0", "") if str(x).endswith(".0") else str(x)
                for x in uniques
            ]

    return {
        "columns": df.columns.tolist(),
        "preview": preview_json_rows(df, size=2),
        "row_count": int(len(df)),
        "unique_values": unique_values,
    }


@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    label_col: str = Form(...),
    sensitive_col: str | None = Form(default=None),
    sensitive_attr: str | None = Form(default=None),
    privileged_val: str | None = Form(default=None),
    privileged_value: str | None = Form(default=None),
    unprivileged_val: str | None = Form(default=None),
    unprivileged_value: str | None = Form(default=None),
    privileged_name_override: str | None = Form(default=None),
    unprivileged_name_override: str | None = Form(default=None),
    positive_label: str = Form(
        ..., description="The value representing a favorable outcome"
    ),
    domain: str = Form("hiring"),
    analysis_type: str = Form("dataset"),
    prediction_col: str | None = Form(default=None),
) -> dict:
    sensitive_target = sensitive_col or sensitive_attr
    privileged_target = privileged_val or privileged_value
    unprivileged_target = unprivileged_val or unprivileged_value

    if sensitive_target is None:
        return {"detail": "Provide sensitive_col (or sensitive_attr)."}
    if privileged_target is None:
        return {"detail": "Provide privileged_val (or privileged_value)."}
    if analysis_type == "model" and not prediction_col:
        return {"detail": "prediction_col is required for model analysis."}

    df = await parse_csv_upload(file)
    prepared = prepare_binary_dataset(
        df,
        label_col=label_col,
        sensitive_col=sensitive_target,
        privileged_val=privileged_target,
        positive_label=positive_label,
        unprivileged_val=unprivileged_target,
        prediction_col=prediction_col if analysis_type == "model" else None,
    )

    metrics = compute_metrics(prepared, analysis_type=analysis_type)
    bias_score, verdict = score_bias(
        metrics["disparate_impact"],
        metrics["stat_parity_diff"],
        metrics["equal_opp_diff"],
    )

    privileged_name = privileged_name_override or group_label(
        sensitive_target, prepared.privileged_val
    )
    unprivileged_name = unprivileged_name_override or group_label(
        sensitive_target, prepared.unprivileged_val
    )

    explanations = build_explanations(
        disparate_impact=metrics["disparate_impact"],
        stat_parity_diff=metrics["stat_parity_diff"],
        equal_opp_diff=metrics["equal_opp_diff"],
        privileged_label=privileged_name,
        unprivileged_label=unprivileged_name,
        outcome_label=prediction_col if analysis_type == "model" else label_col,
        analysis_type=analysis_type,
    )

    session_id = str(uuid4())

    bias_metrics = [
        {
            "key": "disparate_impact",
            "label": "Disparate Impact",
            "value": metrics["disparate_impact"],
            "threshold": 0.8,
            "direction": "lower_is_worse",
            "story": explanations["disparate_impact"],
            "severity": "high" if metrics["disparate_impact"] < 0.8 else "low",
        },
        {
            "key": "stat_parity_diff",
            "label": "Statistical Parity",
            "value": metrics["stat_parity_diff"],
            "threshold": 0.0,
            "direction": "zero_is_best",
            "story": explanations["stat_parity_diff"],
            "severity": "high" if abs(metrics["stat_parity_diff"]) > 0.1 else "low",
        },
        {
            "key": "equal_opp_diff",
            "label": "Equal Opportunity",
            "value": metrics["equal_opp_diff"],
            "threshold": 0.0,
            "direction": "zero_is_best",
            "story": explanations["equal_opp_diff"],
            "severity": "high" if abs(metrics["equal_opp_diff"]) > 0.1 else "low",
        },
    ]

    group_stats_list = [
        {
            "group": privileged_name,
            "positive_rate": metrics["group_stats"]["privileged"]["positive_rate"],
            "count": metrics["group_stats"]["privileged"]["count"],
        },
        {
            "group": unprivileged_name,
            "positive_rate": metrics["group_stats"]["unprivileged"]["positive_rate"],
            "count": metrics["group_stats"]["unprivileged"]["count"],
        },
    ]

    import math

    di = metrics["disparate_impact"]
    if math.isnan(di):
        prob_gap = 0
        direction_word = "less"
    elif di < 1:
        direction_word = "less"
        prob_gap = round((1 - di) * 100)
    else:
        direction_word = "more"
        prob_gap = round((di - 1) * 100)

    verb_label = (
        (prediction_col if analysis_type == "model" else label_col)
        .lower()
        .replace("be ", "")
    )

    rate_desc = (
        "at a rate well below the 80% threshold"
        if direction_word == "less"
        else "at a disproportionately higher rate"
    )

    if analysis_type == "model":
        headline = f"The model is {prob_gap}% {direction_word} likely to predict '{verb_label}' for {unprivileged_name}."
        summary = f"Your model exhibits predictive bias. It predicts positive outcomes for {unprivileged_name} {rate_desc} compared to {privileged_name}. This suggests the model has learned or amplified historical disadvantages."
    else:
        headline = f"{unprivileged_name} are {prob_gap}% {direction_word} likely to be {verb_label}."
        summary = f"Your dataset shows a significant fairness gap. {unprivileged_name} are {verb_label} {rate_desc} compared to {privileged_name}. This pattern suggests systematic disadvantage."

    # Compute bias root cause — run in thread pool with timeout so it never blocks the response
    _executor = ThreadPoolExecutor(max_workers=1)
    try:
        loop = asyncio.get_event_loop()
        bias_contributors = await asyncio.wait_for(
            loop.run_in_executor(
                _executor, compute_feature_importance, prepared, analysis_type
            ),
            timeout=8.0,
        )
    except (asyncio.TimeoutError, Exception):
        bias_contributors = []

    payload = {
        "session_id": session_id,
        "bias_score": bias_score,
        "domain": domain,
        "domain_context": get_domain_context(domain),
        "sensitive_attr": sensitive_target,
        "label_col": label_col,
        "privileged_group": privileged_name,
        "unprivileged_group": unprivileged_name,
        "metrics": bias_metrics,
        "group_stats": group_stats_list,
        "headline": headline,
        "summary": summary,
        "bias_contributors": bias_contributors,
        "analysis_type": analysis_type,
    }

    set_session(
        session_id,
        SessionData(
            df_original=prepared.df_original,
            analysis=payload,
            config={
                "label_col": prepared.label_col,
                "sensitive_col": prepared.sensitive_col,
                "privileged_val": prepared.privileged_val,
                "unprivileged_val": prepared.unprivileged_val,
                "positive_label": prepared.positive_label,
                "domain": domain,
                "prediction_col": prepared.prediction_col,
                "analysis_type": analysis_type,
            },
        ),
    )
    return payload
