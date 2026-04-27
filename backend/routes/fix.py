from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.bias_engine import apply_reweighing, prepare_binary_dataset
from services.explainer import build_explanations, group_label
from services.scorer import score_bias
from store import bind_download_token, get_session, set_fix_result

router = APIRouter()


class FixRequest(BaseModel):
    session_id: str


def _build_bias_metrics(
    disparate_impact: float,
    stat_parity_diff: float,
    equal_opp_diff: float,
    explanations: dict[str, str],
) -> list[dict]:
    return [
        {
            "key": "disparate_impact",
            "label": "Disparate Impact",
            "value": disparate_impact,
            "threshold": 0.8,
            "direction": "lower_is_worse",
            "story": explanations["disparate_impact"],
            "severity": "high" if disparate_impact < 0.8 else "low",
        },
        {
            "key": "stat_parity_diff",
            "label": "Statistical Parity",
            "value": stat_parity_diff,
            "threshold": 0.0,
            "direction": "zero_is_best",
            "story": explanations["stat_parity_diff"],
            "severity": "high" if abs(stat_parity_diff) > 0.1 else "low",
        },
        {
            "key": "equal_opp_diff",
            "label": "Equal Opportunity",
            "value": equal_opp_diff,
            "threshold": 0.0,
            "direction": "zero_is_best",
            "story": explanations["equal_opp_diff"],
            "severity": "high" if abs(equal_opp_diff) > 0.1 else "low",
        },
    ]


@router.post("/fix")
def fix_bias(payload: FixRequest) -> dict:
    session = get_session(payload.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session_id not found")

    # Guard: reweighing only applies to training data (dataset) analysis.
    # Model prediction bias requires retraining — not a data fix.
    analysis_type = session.config.get("analysis_type", "dataset")
    if analysis_type == "model":
        raise HTTPException(
            status_code=400,
            detail=(
                "Reweighing cannot be applied to model prediction analysis. "
                "Predictive bias requires retraining with fairness constraints or "
                "applying post-processing calibration."
            ),
        )

    config = session.config
    prepared = prepare_binary_dataset(
        session.df_original,
        label_col=config["label_col"],
        sensitive_col=config["sensitive_col"],
        privileged_val=config["privileged_val"],
        positive_label=config["positive_label"],
        unprivileged_val=config["unprivileged_val"],
    )

    df_fixed, after_metrics = apply_reweighing(prepared)
    after_score, _ = score_bias(
        after_metrics["disparate_impact"],
        after_metrics["stat_parity_diff"],
        after_metrics["equal_opp_diff"],
    )

    privileged_name = config.get("privileged_name_override") or group_label(config["sensitive_col"], config["privileged_val"])
    unprivileged_name = config.get("unprivileged_name_override") or group_label(config["sensitive_col"], config["unprivileged_val"])

    after_explanations = build_explanations(
        disparate_impact=after_metrics["disparate_impact"],
        stat_parity_diff=after_metrics["stat_parity_diff"],
        equal_opp_diff=after_metrics["equal_opp_diff"],
        privileged_label=privileged_name,
        unprivileged_label=unprivileged_name,
        outcome_label=config["label_col"],
        analysis_type="dataset",
    )

    before_analysis = session.analysis
    before_bias_score = before_analysis["bias_score"]
    before_metrics_list = before_analysis["metrics"]

    after_metrics_list = _build_bias_metrics(
        after_metrics["disparate_impact"],
        after_metrics["stat_parity_diff"],
        after_metrics["equal_opp_diff"],
        after_explanations,
    )

    group_stats_after = [
        {
            "group": privileged_name,
            "positive_rate": after_metrics["group_stats"]["privileged"]["positive_rate"],
            "count": after_metrics["group_stats"]["privileged"]["count"],
        },
        {
            "group": unprivileged_name,
            "positive_rate": after_metrics["group_stats"]["unprivileged"]["positive_rate"],
            "count": after_metrics["group_stats"]["unprivileged"]["count"],
        },
    ]

    token = str(uuid4())
    bind_download_token(token, df_fixed)

    response = {
        "bias_score_before": before_bias_score,
        "bias_score_after": after_score,
        "metrics_before": before_metrics_list,
        "metrics_after": after_metrics_list,
        "group_stats_after": group_stats_after,
        "download_token": token,
    }

    set_fix_result(payload.session_id, df_fixed, response)
    return response
