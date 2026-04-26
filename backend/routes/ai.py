import os
import json
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

import re

load_dotenv()

router = APIRouter()

class AIAnalyzeRequest(BaseModel):
    columns: list[str]
    unique_values: dict[str, list[str]]
    domain: str
    provider: str

def sanitize_prompt_input(text: str) -> str:
    """Basic sanitization to prevent prompt injection."""
    return re.sub(r"[{}[\]\"']", "", text)

def filter_pii_columns(columns: list[str], unique_values: dict[str, list[str]]) -> tuple[list[str], dict[str, list[str]]]:
    """Exclude columns that likely contain PII from unique value analysis."""
    pii_keywords = {"ssn", "email", "phone", "address", "social_security", "fullname", "first_name", "last_name", "password"}
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
    safe_columns_list, safe_uniques = filter_pii_columns(safe_columns, req.unique_values)

    system_prompt = f"""
You are an expert data ethicist and ML fairness engineer. Analyzing a structured dataset for the "{safe_domain}" domain.
Columns: {safe_columns_list}
Categorical Options: {safe_uniques}

Identify:
1. Which column is the MOST likely primary sensitive demographic attribute (e.g., gender, race, age). If multiple exist, prioritize gender or race as they are standard for initial scans. 
2. For the "outcome" (label) column, identify which value represents the "favorable" (not impacted/successful) outcome and which is "unfavorable" (impacted/failed).
3. For the identified sensitive column, map its raw categorical values to human-readable group names (e.g., map "1" to "Male" and "0" to "Female"). 
4. MANDATORY GROUPING: If the identified sensitive column contains continuous NUMERICAL data (like Age, Income, or Score), you MUST provide a list of semantic category ranges to help the user group these values. 
   - Format each range exactly as "GroupName (Min-Max)" or "GroupName (Min+)" or "GroupName (<Max)".
   - Example for Age: ["Child (0-17)", "Adult (18-64)", "Senior (65+)"]
   - If the column is strictly categorical (e.g. "Male"/"Female" or "1"/"0"), leave the "numerical_groups" dictionary empty for that column.

Priority for sensitive columns: 
- If 'gender' or 'sex' exists, pick that first.
- If 'race' or 'ethnicity' exists, pick that next.
- If 'age' exists, pick that last.

Return EXACTLY this JSON structure and nothing else:
{{
  "sensitive_columns": {{ "column_name_here": "most sensitive" }},
  "outcome_values": {{ "outcome_col_name": {{ "value_exactly_as_given_in_options": "not impacted", "other_value": "impacted" }} }},
  "group_mappings": {{ "column_name_here": {{ "1": "Male", "0": "Female" }} }},
  "numerical_groups": {{ "column_name_here": ["Group 1 (0-10)", "Group 2 (11+)"] }}
}}
"""
    
    if req.provider == "gemini":
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured on server")
        
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://fairscan.ai",
            "X-Title": "FairScan",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "google/gemini-2.5-flash",
            "messages": [
                {"role": "user", "content": system_prompt}
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
            raise HTTPException(status_code=500, detail=f"All OpenRouter models failed. Last error: {str(e)}")

    elif req.provider == "local":
        url = "http://localhost:1234/v1/chat/completions"
        models_to_try = ["gemma4:e4b"]
        last_error = None
        for model in models_to_try:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": system_prompt}],
                "temperature": 0.1,
                "response_format": {"type": "json_object"}
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
                
        raise HTTPException(status_code=500, detail=f"All local models failed. Last error: {str(last_error)}")
            
    else:
        raise HTTPException(status_code=400, detail="Provider must be gemini or local")
