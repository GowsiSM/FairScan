from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyze import router as analyze_router
from routes.download import router as download_router
from routes.fix import router as fix_router
from routes.presets import router as presets_router
from routes.demo import router as demo_router
from routes.ai import router as ai_router
from routes.explain import router as explain_router

import os
from dotenv import load_dotenv

load_dotenv()

description = """
FairScan API provides endpoints for analyzing, explaining, and mitigating bias in machine learning models and datasets.

## Features
* **Analysis**: Automatically detect bias in your datasets across different protected groups.
* **Mitigation (Fix)**: Apply fairness constraints to balance out demographic disparities.
* **Explainability (AI)**: Understand the drivers of bias and feature importance.
* **Presets & Demos**: Predefined configurations and datasets to quickstart fairness workflows.
"""

app = FastAPI(
    title="FairScan API",
    description=description,
    version="0.1.0",
    contact={
        "name": "FairScan Support",
        "url": "https://fairscan-a15f9.web.app",
    },
    license_info={
        "name": "MIT",
    },
)

# Tighten CORS for security
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,https://fairscan-a15f9.web.app,https://fairscan-a15f9.firebaseapp.com",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(analyze_router, tags=["Analyze"])
app.include_router(fix_router, tags=["Fix"])
app.include_router(download_router, tags=["Download"])
app.include_router(presets_router, tags=["Presets"])
app.include_router(demo_router, tags=["Demo Datasets"])
app.include_router(ai_router, tags=["AI & Explainability"])
app.include_router(explain_router, tags=["AI & Explainability"])
