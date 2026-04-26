from __future__ import annotations


def group_label(column: str, raw_value: str) -> str:
    col = column.strip().lower()
    val = raw_value.strip().lower()

    # Clean up "1.0" -> "1"
    if val.endswith(".0"):
        val = val[:-2]

    # Gender / Sex
    if col in {"gender", "sex", "is_male", "is_female"}:
        if val in {"1", "male", "m", "men", "true", "yes"}:
            return "Men"
        if val in {"0", "female", "f", "women", "false", "no"}:
            return "Women"

    # Race (common in US datasets like COMPAS or Adult)
    if col in {"race", "ethnicity"}:
        if val in {"1", "white", "caucasian"}:
            return "White"
        if val in {"0", "black", "african american", "minority"}:
            return "Underrepresented Group"

    # Age Groups
    if col in {"age", "age_group"}:
        if val in {"1", "old", "senior", "above_25"}:
            return "Older Group"
        if val in {"0", "young", "youth", "under_25"}:
            return "Younger Group"

    # Fallback to Title Case if it's a word, otherwise keep as is
    if val.isalpha():
        return val.title()
    return raw_value.replace(".0", "")


import math

def build_explanations(
    *,
    disparate_impact: float,
    stat_parity_diff: float,
    equal_opp_diff: float,
    privileged_label: str,
    unprivileged_label: str,
    outcome_label: str,
    analysis_type: str = "dataset",
) -> dict[str, str]:
    di_percent = round(disparate_impact * 100) if not math.isnan(disparate_impact) else 0
    spd_percent = round(abs(stat_parity_diff) * 100) if not math.isnan(stat_parity_diff) else 0
    eod_percent = round(abs(equal_opp_diff) * 100) if not math.isnan(equal_opp_diff) else 0

    # Clean outcome label (e.g. "hired" -> "be hired")
    verb_label = outcome_label.lower().strip()
    if not verb_label.startswith("be ") and analysis_type == "dataset":
        verb_label = f"be {verb_label}"

    if analysis_type == "model":
        return {
            "disparate_impact": (
                f"The model predicts '{verb_label}' for {unprivileged_label} at {di_percent}% "
                f"the rate of {privileged_label}."
            ),
            "stat_parity_diff": f"There is a {spd_percent}% gap in the model's positive prediction rate between groups.",
            "equal_opp_diff": (
                f"For qualified individuals, the model predicts '{verb_label}' for {unprivileged_label} {eod_percent}% less often than "
                f"for {privileged_label}."
                if equal_opp_diff < 0
                else (
                    f"For qualified individuals, the model predicts '{verb_label}' for {unprivileged_label} {eod_percent}% more often than "
                    f"for {privileged_label}."
                )
            ),
        }

    return {
        "disparate_impact": (
            f"{unprivileged_label} {verb_label} at {di_percent}% "
            f"the rate of {privileged_label}."
        ),
        "stat_parity_diff": f"There is a {spd_percent}% gap in who gets to {verb_label} between groups.",
        "equal_opp_diff": (
            f"Qualified {unprivileged_label} {verb_label} {eod_percent}% less often than "
            f"qualified {privileged_label}."
            if equal_opp_diff < 0
            else (
                f"Qualified {unprivileged_label} {verb_label} {eod_percent}% more often than "
                f"qualified {privileged_label}."
            )
        ),
    }
