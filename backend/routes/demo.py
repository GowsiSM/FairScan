import os
import uuid
import pandas as pd
from fastapi import APIRouter, HTTPException
from store import set_session, SessionData

router = APIRouter()

@router.get("/demo/{domain}")
def get_demo_dataset(domain: str):
    allowed_domains = ["hiring", "lending", "healthcare"]
    if domain not in allowed_domains:
        raise HTTPException(status_code=400, detail="Invalid domain")
    
    file_path = os.path.join("demo_datasets", f"{domain}.csv")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Demo dataset not found")
        
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    session_id = str(uuid.uuid4())
    set_session(session_id, SessionData(df_original=df, analysis={}, config={}, df_fixed=None, fix_result=None))
    
    unique_values = {}
    for col in df.columns:
        uniques = df[col].dropna().unique()
        if len(uniques) <= 100:
            unique_values[col] = [str(x).replace(".0", "") if str(x).endswith(".0") else str(x) for x in uniques]
    
    return {
        "session_id": session_id,
        "columns": df.columns.tolist(),
        "preview": df.head(2).to_dict(orient="records"),
        "row_count": len(df),
        "unique_values": unique_values
    }
