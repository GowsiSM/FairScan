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

Priority for sensitive columns: 
- If 'gender' or 'sex' exists, pick that first.
- If 'race' or 'ethnicity' exists, pick that next.
- If 'age' exists, pick that last.

Return EXACTLY this JSON structure and nothing else:
{{
  "sensitive_columns": {{ "column_name_here": "most sensitive" }},
  "outcome_values": {{ "outcome_col_name": {{ "value_exactly_as_given_in_options": "not impacted", "other_value": "impacted" }} }}
}}
"""
    
    if req.provider == "gemini":
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured on server")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": system_prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                res = requests.post(url, json=payload, timeout=30)
                if res.status_code == 500 and attempt < max_retries - 1:
                    print(f"AI Provider Error (500). Retrying... (Attempt {attempt + 1})")
                    time.sleep(1.5)
                    continue
                
                res.raise_for_status()
                data = res.json()
                
                try:
                    parts = data["candidates"][0]["content"]["parts"]
                    # Find the first part that has "text" and is NOT a "thought"
                    text_part = next((p["text"] for p in parts if "text" in p and not p.get("thought")), None)
                    
                    if not text_part:
                        raise ValueError("No non-thought text part found in AI response")
                    
                    # Clean up markdown if the model wrapped it (e.g. ```json ... ```)
                    cleaned_text = text_part.strip()
                    if cleaned_text.startswith("```"):
                        # Remove first and last lines
                        lines = cleaned_text.splitlines()
                        if len(lines) > 2:
                            cleaned_text = "\n".join(lines[1:-1])
                        
                    return json.loads(cleaned_text)
                except (KeyError, IndexError, ValueError, json.JSONDecodeError) as e:
                    print(f"AI Response Parsing Error: {e}")
                    print(f"Raw Response: {data}")
                    raise HTTPException(status_code=500, detail="Failed to parse AI response")
                
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"AI Connection Attempt {attempt + 1} failed: {e}. Retrying...")
                    time.sleep(1.5)
                    continue
                print(f"AI Connection Error after {max_retries} attempts: {e}")
                raise HTTPException(status_code=500, detail=str(e))

    elif req.provider == "local":
        url = "http://localhost:1234/v1/chat/completions"
        payload = {
            "model": "gemma4:e4b",
            "messages": [{"role": "user", "content": system_prompt}],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        try:
            res = requests.post(url, json=payload, timeout=15)
            if not res.ok:
                raise HTTPException(status_code=500, detail=f"LM Studio Error: {res.text}")
            raw_text = res.json()["choices"][0]["message"]["content"]
            return json.loads(raw_text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LM Studio Error: {str(e)}")
            
    else:
        raise HTTPException(status_code=400, detail="Provider must be gemini or local")
