from __future__ import annotations

import os
import json
import requests

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

from store import get_session

load_dotenv()

router = APIRouter()


class ExplainRequest(BaseModel):
    session_id: str


@router.post("/explain-bias")
def explain_bias(payload: ExplainRequest) -> dict:
    session = get_session(payload.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="session_id not found")

    analysis = session.analysis
    config = session.config

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

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
    
    target_col = config.get("prediction_col") if is_model else config.get("label_col", "unknown")
    context_type = "Machine Learning Model Predictions" if is_model else "Historical Dataset Records"

    prompt = f"""You are an expert AI fairness advisor giving a plain-English explanation to a non-technical user.

Context:
- Analysis Type: {context_type}
- Domain: {config.get('domain', 'unknown')}
- Sensitive attribute: {config.get('sensitive_col', 'unknown')}
- Target column (being analyzed): {target_col}
- Privileged group: {analysis.get('privileged_group', 'unknown')}
- Unprivileged group: {analysis.get('unprivileged_group', 'unknown')}
- Bias score: {analysis.get('bias_score', 'N/A')} / 100

Key findings:
{analysis.get('headline', '')}
{analysis.get('summary', '')}

Fairness metrics:
{metrics_summary}

Group statistics:
{group_summary}

Top features contributing to bias:
{contrib_text}

Write a 3-4 paragraph explanation in plain English that:
1. Explains what kind of bias was found and how severe it is.
2. Suggests possible systemic or algorithmic reasons WHY this bias exists (based on the domain and features).
3. Explains the real-world impact on the unprivileged group.
4. {"Recommends next steps for retraining, algorithmic auditing, or using fairness-aware modeling techniques." if is_model else "Recommends next steps beyond statistical fixes, such as auditing data collection or revising evaluation criteria."}

Keep the tone professional but accessible. No jargon. No code. No bullet points — use flowing paragraphs.
Do NOT wrap the response in markdown or quotes. Just plain text paragraphs."""

    req_payload = {
        "contents": [{"parts": [{"text": prompt}]}],
    }

    models_to_try = ["gemma-4-31b-it", "gemini-2.5-flash", "gemini-3-flash"]
    last_error = None
    import time
    max_retries = 3

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        for attempt in range(max_retries):
            try:
                res = requests.post(url, json=req_payload, timeout=30)
                if res.status_code == 500 and attempt < max_retries - 1:
                    time.sleep(1.5)
                    continue
                res.raise_for_status()
                data = res.json()

                parts = data["candidates"][0]["content"]["parts"]
                text_part = next(
                    (p["text"] for p in parts if "text" in p and not p.get("thought")),
                    None,
                )
                if not text_part:
                    raise ValueError("No text in AI response")

                return {"explanation": text_part.strip()}

            except requests.exceptions.HTTPError as e:
                last_error = str(e)
                if 400 <= e.response.status_code < 500 and e.response.status_code != 429:
                    break # Skip retries for unrecoverable client errors like 404
                if e.response.status_code == 429:
                    break # Quota exhausted, skip to next model
                if attempt < max_retries - 1:
                    time.sleep(1.5)
                    continue
                break
            except Exception as e:
                last_error = str(e)
                if attempt < max_retries - 1:
                    time.sleep(1.5)
                    continue
                break # try next model
                
    raise HTTPException(status_code=500, detail=f"AI explanation failed. Last error: {last_error}")
