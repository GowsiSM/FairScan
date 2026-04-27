import os
import json
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

import re

load_dotenv()

router = APIRouter()


def parse_json_safely(text: str):
    """Extracts JSON from text, handling markdown blocks if present."""
    # Remove markdown code blocks if present
    text = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", text).strip()

    try:
        return json.loads(text, strict=False)
    except json.JSONDecodeError as e:
        # Fallback: try to find the first { and last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(text[start : end + 1], strict=False)
            except:
                pass
        raise e


class AIAnalyzeRequest(BaseModel):
    columns: list[str]
    unique_values: dict[str, list[str]]
    domain: str
    provider: str


def sanitize_prompt_input(text: str) -> str:
    """Basic sanitization to prevent prompt injection."""
    return re.sub(r"[{}[\]\"']", "", text)


def filter_pii_columns(
    columns: list[str], unique_values: dict[str, list[str]]
) -> tuple[list[str], dict[str, list[str]]]:
    """Exclude columns that likely contain PII from unique value analysis."""
    pii_keywords = {
        "ssn",
        "email",
        "phone",
        "address",
        "social_security",
        "fullname",
        "first_name",
        "last_name",
        "password",
    }
    filtered_columns = []
    filtered_uniques = {}

    for col in columns:
        col_lower = col.lower()
        # If it looks like a PII column, redact its values
        if any(k in col_lower for k in pii_keywords):
            filtered_columns.append(col)
            filtered_uniques[col] = ["[REDACTED_POTENTIAL_PII]"]
        else:
            filtered_columns.append(col)
            filtered_uniques[col] = unique_values.get(col, [])

    return filtered_columns, filtered_uniques


@router.post("/analyze-columns")
def analyze_columns(req: AIAnalyzeRequest):
    # Sanitize and filter inputs
    safe_domain = sanitize_prompt_input(req.domain)
    safe_columns = [sanitize_prompt_input(c) for c in req.columns]
    safe_columns_list, safe_uniques = filter_pii_columns(
        safe_columns, req.unique_values
    )

    system_prompt = f"""
You are an expert data ethicist and ML fairness engineer. Analyzing a structured dataset for the "{safe_domain}" domain to be used with IBM AIF360 (AI Fairness 360).
Columns: {safe_columns_list}
Categorical Options: {safe_uniques}

Identify:
1. Primary sensitive column: Which column is the MOST likely primary sensitive demographic attribute (e.g. sex, race, age).
2. Primary outcome column: Which column is the target/label.
3. FOR EVERY COLUMN in the dataset:
   - If it contains numeric codes (e.g. 1/0, 1/2/3), provide a mapping in "group_mappings".
   - If it contains continuous numeric data (Age, Income, etc.), provide semantic ranges in "numerical_groups".
   - For the outcome column, identify the AIF360 "favorable_label": the exact value representing the "positive" (favorable/beneficial) outcome (e.g., getting a loan, being hired, high income). Choose this STRICTLY from the dataset's unique values. DO NOT output a placeholder; output the literal value.
   - Investigate the sensitive column and identify which exact value acts as the AIF360 "privileged_group" (historically favored, higher expected beneficial outcomes), and which acts as the "unprivileged_group" (historically disadvantaged, lower expected beneficial outcomes). Choose these STRICTLY from the dataset's unique values. DO NOT output placeholders; output the literal values.

Mandatory Numerical Grouping:
- Use format: "GroupName (Min-Max)", "GroupName (Min+)", or "GroupName (<Max)".
- Cover the full range of values seen in the data.

Return EXACTLY this JSON structure and nothing else:
{{
  "sensitive_columns": {{ "column_name": "most sensitive" }},
  "outcome_values": {{ "col_name": {{ "val": "not impacted", "val2": "impacted" }}, "another_col": {{ "0": "no", "1": "yes" }} }},
  "group_mappings": {{ "col_name": {{ "1": "Male", "0": "Female" }}, "another_col": {{ "2": "Other" }} }},
  "numerical_groups": {{ "col_name": ["Young (0-20)", "Old (21+)"] }},
  "suggested_roles": {{ "privileged_group": "RAW_VALUE_FROM_DATASET (e.g. 1.0)", "unprivileged_group": "RAW_VALUE_FROM_DATASET (e.g. 0.0)", "positive_outcome": "RAW_VALUE_FROM_DATASET (e.g. 1)" }}
}}
"""

    if req.provider == "gemini":
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500, detail="OPENROUTER_API_KEY not configured on server"
            )

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://fairscan.ai",
            "X-Title": "FairScan",
            "Content-Type": "application/json",
        }

        payload = {
            "model": "google/gemini-3-flash-preview",
            "messages": [{"role": "user", "content": system_prompt}],
            "response_format": {"type": "json_object"},
        }

        try:
            res = requests.post(url, headers=headers, json=payload, timeout=45)
            res.raise_for_status()
            data = res.json()

            if "choices" not in data or not data["choices"]:
                raise Exception(f"Invalid response format from OpenRouter: {data}")

            content = data["choices"][0]["message"]["content"]
            return parse_json_safely(content)
        except Exception as e:
            print(f"OpenRouter Error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"All OpenRouter models failed. Last error: {str(e)}",
            )

    elif req.provider == "local":
        url = "http://localhost:1234/v1/chat/completions"
        models_to_try = ["gemma4:e4b"]
        last_error = None
        for model in models_to_try:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": system_prompt}],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            }
            try:
                res = requests.post(url, json=payload, timeout=15)
                if not res.ok:
                    raise Exception(f"LM Studio Error: {res.text}")
                raw_text = res.json()["choices"][0]["message"]["content"]
                return json.loads(raw_text)
            except Exception as e:
                print(f"Local model {model} failed: {e}")
                last_error = e
                continue

        raise HTTPException(
            status_code=500,
            detail=f"All local models failed. Last error: {str(last_error)}",
        )

    else:
        raise HTTPException(status_code=400, detail="Provider must be gemini or local")
