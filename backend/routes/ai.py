import os
import json
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class AIAnalyzeRequest(BaseModel):
    columns: list[str]
    unique_values: dict[str, list[str]]
    domain: str
    provider: str

@router.post("/analyze-columns")
def analyze_columns(req: AIAnalyzeRequest):
    system_prompt = f"""
You are an expert data ethicist and ML fairness engineer. Analyzing a structured dataset for the "{req.domain}" domain.
Columns: {req.columns}
Categorical Options: {req.unique_values}

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
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")
        
        models_to_try = ["gemini-2.5-flash", "gemini-3-flash", "gemma-4-31b-it"]
        last_error = None
        import time
        max_retries = 3

        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": system_prompt}]}],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            for attempt in range(max_retries):
                try:
                    res = requests.post(url, json=payload, timeout=30)
                    if res.status_code == 500 and attempt < max_retries - 1:
                        print(f"AI Provider Error (500) on {model}. Retrying... (Attempt {attempt + 1})")
                        time.sleep(1.5)
                        continue
                    
                    res.raise_for_status()
                    data = res.json()
                    
                    try:
                        parts = data["candidates"][0]["content"]["parts"]
                        text_part = next((p["text"] for p in parts if "text" in p and not p.get("thought")), None)
                        
                        if not text_part:
                            raise ValueError("No non-thought text part found in AI response")
                        
                        cleaned_text = text_part.strip()
                        if cleaned_text.startswith("```"):
                            lines = cleaned_text.splitlines()
                            if len(lines) > 2:
                                cleaned_text = "\n".join(lines[1:-1])
                            
                        return json.loads(cleaned_text)
                    except (KeyError, IndexError, ValueError, json.JSONDecodeError) as e:
                        print(f"AI Response Parsing Error on {model}: {e}")
                        raise Exception("Failed to parse AI response")
                    
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
        
        raise HTTPException(status_code=500, detail=f"All Gemini models failed. Last error: {last_error}")

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
