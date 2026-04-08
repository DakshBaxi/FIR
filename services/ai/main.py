import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health, analyze, sections
from config import settings

logging.getLogger("chromadb.telemetry.product.posthog").disabled = True
logging.getLogger("posthog").disabled = True

app = FastAPI(
    title="FIR AI Service",
    description="AI pipeline for FIR generation using Ollama + Llama 3.1 8B",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],  # Node API only
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router, tags=["health"])
app.include_router(analyze.router, tags=["analysis"])
app.include_router(sections.router, tags=["sections"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.ai_service_port, reload=True)
