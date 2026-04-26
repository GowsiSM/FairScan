from __future__ import annotations

import os
import json
import requests
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from store import get_session

import re

load_dotenv()

router = APIRouter()

def sanitize_text(text: Any) -> str:
    """Basic sanitization for LLM prompt inclusion."""
    if text is None:
        return "unknown"
    return re.sub(r"[{}[\]\"']", "", str(text))


class ExplainRequest(BaseModel):
    session_id: str


@router.post("/explain-bias")
def explain_bias(payload: ExplainRequest) -> dict:
    session = get_session(payload.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session_id not found")

    analysis = session.analysis
    config = session.config

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    # Build a rich context prompt for Gemini
    metrics_summary = "\n".join(
        f"- {m['label']}: {m['value']:.3f} (threshold: {m['threshold']}, severity: {m['severity']})"
        for m in analysis.get("metrics", [])
    )

    group_summary = "\n".join(
        f"- {g['group']}: {g['positive_rate']*100:.1f}% positive rate ({g['count']} records)"
        for g in analysis.get("group_stats", [])
    )

    contributors = analysis.get("bias_contributors", [])
    contrib_text = "\n".join(
        f"- {c['feature']}: {c['importance']}% contribution"
        for c in contributors
    ) if contributors else "No feature importance data available."

    analysis_type = config.get("analysis_type", "dataset")
    is_model = analysis_type == "model"
    
    target_col = sanitize_text(config.get("prediction_col") if is_model else config.get("label_col", "unknown"))
    safe_domain = sanitize_text(config.get("domain", "unknown"))
    safe_sensitive = sanitize_text(config.get("sensitive_col", "unknown"))
    safe_priv = sanitize_text(analysis.get("privileged_group", "unknown"))
    safe_unpriv = sanitize_text(analysis.get("unprivileged_group", "unknown"))

    prompt = f"""You are an expert AI fairness advisor giving a plain-English explanation to a non-technical user.

Context:
- Analysis Type: {analysis_type}
- Domain: {safe_domain}
- Sensitive attribute: {safe_sensitive}
- Target column (being analyzed): {target_col}
- Privileged group: {safe_priv}
- Unprivileged group: {safe_unpriv}
- Bias score: {analysis.get('bias_score', 'N/A')} / 100

Fairness metrics:
{metrics_summary}

Group statistics:
{group_summary}

Top features contributing to bias:
{contrib_text}

Provide your response strictly as a JSON object with the following keys. Do NOT wrap the JSON in markdown or backticks.
1. "headline": A short, 1-sentence catchy headline about the bias found in the dataset.
2. "summary": A 2-sentence summary accurate to the dataset bias metrics provided above.
3. "explanation": A 3-4 paragraph explanation in plain English that explains what kind of bias was found and how severe it is, suggests possible systemic or algorithmic reasons WHY this bias exists, explains the real-world impact, and {"recommends next steps for retraining, algorithmic auditing, or using fairness-aware modeling techniques" if is_model else "recommends next steps beyond statistical fixes"}. Use flowing paragraphs, no bullet points, no jargon.
4. "bias_contributors_note": A 1-2 sentence note explaining WHY the specific features listed in "Top features contributing to bias" are correlated with the sensitive attribute and outcome, acting as proxies.

CRITICAL INSTRUCTIONS:
- You must strictly output valid JSON and nothing else.
- The summary and headline must be accurate to the dataset.
- You must not hallucinate and should not include any unrelated info.
"""

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://fairscan.ai", # Optional, for OpenRouter rankings
        "X-Title": "FairScan", # Optional
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "google/gemini-2.0-flash-001",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "response_format": { "type": "json_object" }
    }

    try:
        res = requests.post(url, headers=headers, json=payload, timeout=45)
        res.raise_for_status()
        data = res.json()
        
        content = data["choices"][0]["message"]["content"]
        return json.loads(content, strict=False)

    except Exception as e:
        print(f"OpenRouter Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI explanation failed via OpenRouter: {str(e)}")
