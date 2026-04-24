from fastapi import APIRouter
from presets import get_presets

router = APIRouter()

@router.get("/presets")
def get_all_presets():
    return get_presets()
