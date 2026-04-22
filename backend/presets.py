DOMAIN_CONTEXT: dict[str, str] = {
	"hiring": "Disparate impact below 0.8 may violate EEOC's 80% rule in hiring decisions.",
	"lending": "Large parity gaps may indicate unfair credit access and potential ECOA risk.",
	"healthcare": "Allocation gaps can create inequitable care and adverse health outcomes.",
}


def get_domain_context(domain: str) -> str:
	return DOMAIN_CONTEXT.get(
		domain,
		"Bias metrics should be interpreted with domain policy and legal guidance.",
	)
