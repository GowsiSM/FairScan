DOMAIN_CONTEXT: dict[str, dict[str, str]] = {
    "hiring": {
        "domain_context": "Disparate impact below 0.8 may violate EEOC's 80% rule in hiring decisions.",
        "sensitive_col_hint": "gender",
        "label_col_hint": "hired",
    },
    "lending": {
        "domain_context": "Large parity gaps may indicate unfair credit access and potential ECOA risk.",
        "sensitive_col_hint": "race",
        "label_col_hint": "approved",
    },
    "healthcare": {
        "domain_context": "Allocation gaps can create inequitable care and adverse health outcomes.",
        "sensitive_col_hint": "age_group",
        "label_col_hint": "treated",
    },
}


def get_domain_context(domain: str) -> str:
    preset = DOMAIN_CONTEXT.get(domain)
    if preset:
        return preset["domain_context"]
    return "Bias metrics should be interpreted with domain policy and legal guidance."


def get_presets() -> dict[str, dict[str, str]]:
    return DOMAIN_CONTEXT
