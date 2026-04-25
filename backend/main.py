from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyze import router as analyze_router
from routes.download import router as download_router
from routes.fix import router as fix_router
from routes.presets import router as presets_router
from routes.demo import router as demo_router
from routes.ai import router as ai_router
from routes.explain import router as explain_router

app = FastAPI(title="FairScan API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(analyze_router)
app.include_router(fix_router)
app.include_router(download_router)
app.include_router(presets_router)
app.include_router(demo_router)
app.include_router(ai_router)
app.include_router(explain_router)
