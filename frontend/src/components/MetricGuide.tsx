import "./MetricGuide.css";

interface Props {
  domain: string;
}

const DOMAIN_GUIDES: Record<
  string,
  { metric: string; key: string; why: string; law?: string }
> = {
  hiring: {
    metric: "Equal Opportunity",
    key: "equal_opp_diff",
    why: "In hiring, the key question is: among equally qualified candidates, are groups treated equally? Equal Opportunity measures exactly this — it ensures the selection rate for qualified candidates doesn't depend on their demographic group.",
    law: "US EEOC Guidelines / Title VII",
  },
  lending: {
    metric: "Disparate Impact",
    key: "disparate_impact",
    why: "In lending, regulators focus on the overall ratio of positive outcomes between groups. If a protected group receives approvals at less than 80% the rate of the majority group, it triggers a legal review under the disparate impact framework.",
    law: "US Equal Credit Opportunity Act (ECOA)",
  },
  healthcare: {
    metric: "Equal Opportunity",
    key: "equal_opp_diff",
    why: "In healthcare, equalized odds ensures that patients with the same medical need receive the same level of care regardless of demographic factors. This metric captures both false positive and false negative disparities.",
  },
  custom: {
    metric: "Statistical Parity",
    key: "stat_parity_diff",
    why: "For general decision systems, statistical parity provides a broad check: are positive outcomes distributed equally across groups? It's a good starting point when domain-specific regulations don't apply.",
  },
};

export default function MetricGuide({ domain }: Props) {
  const guide = DOMAIN_GUIDES[domain] || DOMAIN_GUIDES.custom;

  return (
    <div className="metric-guide">
      <div className="mg-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <path d="m2 17 10 5 10-5" />
          <path d="m2 12 10 5 10-5" />
        </svg>
        <span>Metric guide for {domain}</span>
      </div>
      <div className="mg-content">
        <div className="mg-recommended">
          <span className="mg-rec-label">★ Recommended metric</span>
          <span className="mg-rec-name">{guide.metric}</span>
        </div>
        <p className="mg-why">{guide.why}</p>
        {guide.law && (
          <div className="mg-law">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
            <span>Legal framework: {guide.law}</span>
          </div>
        )}
      </div>
    </div>
  );
}
