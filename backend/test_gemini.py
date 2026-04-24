import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key={api_key}"

# This mimics the actual prompt sent in ai.py
domain = "hiring"
columns = ["age", "education", "experience", "gender", "hired"]
unique_values = {"gender": ["0", "1"], "hired": ["0", "1"]}

system_prompt = f"""
You are an expert data ethicist and ML fairness engineer. Analyzing a structured dataset for the "{domain}" domain.
Columns: {columns}
Categorical Options: {unique_values}

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

payload = {
    "contents": [{"parts": [{"text": system_prompt}]}],
    "generationConfig": {"response_mime_type": "application/json"}
}

try:
    res = requests.post(url, json=payload)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
