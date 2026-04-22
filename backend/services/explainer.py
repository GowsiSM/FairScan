from __future__ import annotations


def group_label(column: str, raw_value: str) -> str:
	lowered_col = column.strip().lower()
	lowered_val = raw_value.strip().lower()

	if lowered_col in {"gender", "sex"}:
		if lowered_val in {"1", "male", "m"}:
			return "Male"
		if lowered_val in {"0", "female", "f"}:
			return "Female"

	return raw_value


def build_explanations(
	*,
	disparate_impact: float,
	stat_parity_diff: float,
	equal_opp_diff: float,
	privileged_label: str,
	unprivileged_label: str,
) -> dict[str, str]:
	di_percent = round(disparate_impact * 100)
	spd_percent = round(abs(stat_parity_diff) * 100)
	eod_percent = round(abs(equal_opp_diff) * 100)

	return {
		"disparate_impact": (
			f"{unprivileged_label} receive positive outcomes at {di_percent}% "
			f"the rate of {privileged_label}."
		),
		"stat_parity_diff": f"There is a {spd_percent}% gap in positive outcomes between groups.",
		"equal_opp_diff": (
			f"Qualified {unprivileged_label} are selected {eod_percent}% less often than "
			f"qualified {privileged_label}."
			if equal_opp_diff < 0
			else (
				f"Qualified {unprivileged_label} are selected {eod_percent}% more often than "
				f"qualified {privileged_label}."
			)
		),
	}
