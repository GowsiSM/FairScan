import { useEffect, useState } from "react";
import "./CertBadge.css";

interface Props {
  score: number;
  compact?: boolean;
}

type Tier = "fail" | "review" | "certified";

const tiers: Record<Tier, { label: string; icon: string; sub: string }> = {
  fail: {
    label: "Not Fair",
    icon: "✕",
    sub: "Significant bias detected — action required",
  },
  review: {
    label: "Needs Review",
    icon: "⚠",
    sub: "Moderate bias — manual review recommended",
  },
  certified: {
    label: "FairScan Certified",
    icon: "✓",
    sub: "Meets fairness thresholds across all metrics",
  },
};

function getTier(score: number): Tier {
  if (score >= 70) return "certified";
  if (score >= 40) return "review";
  return "fail";
}

export default function CertBadge({ score, compact }: Props) {
  const [visible, setVisible] = useState(false);
  const tier = getTier(score);
  const info = tiers[tier];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (compact) {
    return (
      <div className={`cert-badge-compact cert-${tier} ${visible ? "visible" : ""}`}>
        <span className="cb-icon-compact">{info.icon}</span>
        <span className="cb-label-compact">{info.label}</span>
      </div>
    );
  }

  return (
    <div className={`cert-badge cert-${tier} ${visible ? "visible" : ""}`}>
      <div className="cb-stamp">
        <div className="cb-ring">
          <span className="cb-icon">{info.icon}</span>
        </div>
      </div>
      <div className="cb-text">
        <span className="cb-label">{info.label}</span>
        <span className="cb-sub">{info.sub}</span>
      </div>
    </div>
  );
}
