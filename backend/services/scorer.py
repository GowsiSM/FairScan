from __future__ import annotations


def _clamp(value: float, lo: float, hi: float) -> float:
	return max(lo, min(hi, value))


def score_bias(disparate_impact: float, stat_parity_diff: float, equal_opp_diff: float) -> tuple[int, str]:
	# Normalize each metric to a [0, 1] penalty where 0 is best.
	di_penalty = _clamp(abs(1.0 - disparate_impact), 0.0, 1.0)
	spd_penalty = _clamp(abs(stat_parity_diff) / 0.5, 0.0, 1.0)
	eod_penalty = _clamp(abs(equal_opp_diff) / 0.5, 0.0, 1.0)

	total_penalty = (0.5 * di_penalty) + (0.3 * spd_penalty) + (0.2 * eod_penalty)
	score = round(100 * (1.0 - total_penalty))

	if score < 50:
		verdict = "high_bias"
	elif score < 80:
		verdict = "moderate"
	else:
		verdict = "fair"

	return score, verdict
