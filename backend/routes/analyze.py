from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, File, Form, UploadFile

from presets import get_domain_context
from services.bias_engine import (
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
            unique_values[col] = [str(x).replace(".0", "") if str(x).endswith(".0") else str(x) for x in uniques]
            
    return {
        "columns": df.columns.tolist(),
        "preview": preview_json_rows(df, size=2),
        "row_count": int(len(df)),
        "unique_values": unique_values
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
    positive_label: str = Form("1"),
    domain: str = Form("hiring"),
) -> dict:
    sensitive_target = sensitive_col or sensitive_attr
    privileged_target = privileged_val or privileged_value
    unprivileged_target = unprivileged_val or unprivileged_value

    if sensitive_target is None:
        return {"detail": "Provide sensitive_col (or sensitive_attr)."}
    if privileged_target is None:
        return {"detail": "Provide privileged_val (or privileged_value)."}

    df = await parse_csv_upload(file)
    prepared = prepare_binary_dataset(
        df,
        label_col=label_col,
        sensitive_col=sensitive_target,
        privileged_val=privileged_target,
        positive_label=positive_label,
        unprivileged_val=unprivileged_target,
    )

    metrics = compute_metrics(prepared)
    bias_score, verdict = score_bias(
        metrics["disparate_impact"],
        metrics["stat_parity_diff"],
        metrics["equal_opp_diff"],
    )

    privileged_name = group_label(sensitive_target, prepared.privileged_val)
    unprivileged_name = group_label(sensitive_target, prepared.unprivileged_val)

    explanations = build_explanations(
        disparate_impact=metrics["disparate_impact"],
        stat_parity_diff=metrics["stat_parity_diff"],
        equal_opp_diff=metrics["equal_opp_diff"],
        privileged_label=privileged_name,
        unprivileged_label=unprivileged_name,
        outcome_label=label_col,
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

    di = metrics["disparate_impact"]
    if di < 1:
        direction_word = "less"
        prob_gap = round((1 - di) * 100)
    else:
        direction_word = "more"
        prob_gap = round((di - 1) * 100)

    verb_label = label_col.lower().replace("be ", "")
    headline = f"{unprivileged_name} are {prob_gap}% {direction_word} likely to be {verb_label}."
    summary = f"Your dataset shows a significant fairness gap. {unprivileged_name} are {verb_label} at a rate well below the 80% threshold compared to {privileged_name}. This pattern suggests systematic disadvantage."

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
            },
        ),
    )
    return payload
