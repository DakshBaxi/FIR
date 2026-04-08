from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embeddings import get_embedding
from services.retrieval import retrieve_relevant_sections

router = APIRouter()


class SectionSearchRequest(BaseModel):
    query: str
    n_results: int = 10


@router.post("/sections/search")
async def search_sections(request: SectionSearchRequest):
    """Search IPC/BNS sections by semantic similarity."""
    try:
        embedding = await get_embedding(request.query)
        sections = retrieve_relevant_sections(embedding, [], n_results=request.n_results)
        return {"success": True, "data": sections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
