"""
Embedding service using Ollama's nomic-embed-text model.
Used to populate ChromaDB with IPC/BNS section embeddings.
"""
import httpx
from config import settings


async def get_embedding(text: str) -> list[float]:
    """Get embedding for a single text using Ollama."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/embeddings",
            json={"model": settings.ollama_embed_model, "prompt": text},
        )
        response.raise_for_status()
        return response.json()["embedding"]


async def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Get embeddings for multiple texts."""
    embeddings = []
    for text in texts:
        embedding = await get_embedding(text)
        embeddings.append(embedding)
    return embeddings
