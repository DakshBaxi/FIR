import logging

from fastapi import APIRouter, HTTPException
from models.request_models import AnalyzeIncidentRequest
from models.response_models import AnalyzeIncidentResponse
from services.llm_chain import analyze_incident

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analyze", response_model=AnalyzeIncidentResponse)
async def analyze(request: AnalyzeIncidentRequest):
    """
    Main AI endpoint: analyze an incident story and return structured FIR data.
    3 chained LLM calls via Ollama.
    """
    try:
        result = await analyze_incident(request)
        return result
    except Exception as e:
        logger.exception("AI analysis failed")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
