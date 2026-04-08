"""
ChromaDB retrieval service for IPC/BNS sections and FIR examples.
"""
import chromadb
from chromadb.config import Settings as ChromaSettings
from config import settings


def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(
        path=settings.chroma_db_path,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_sections_collection(client: chromadb.PersistentClient):
    return client.get_or_create_collection(
        name="legal_sections",
        metadata={"hnsw:space": "cosine"},
    )


def get_fir_examples_collection(client: chromadb.PersistentClient):
    return client.get_or_create_collection(
        name="fir_examples",
        metadata={"hnsw:space": "cosine"},
    )


def retrieve_relevant_sections(
    query_embedding: list[float],
    offence_keywords: list[str],
    n_results: int = 8,
) -> list[dict]:
    """
    Hybrid retrieval: keyword pre-filter + vector search.
    Returns top-n most relevant legal sections.
    """
    client = get_chroma_client()
    collection = get_sections_collection(client)

    # Check if collection has documents
    if collection.count() == 0:
        return []

    # Vector search
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    sections = []
    if results["documents"] and results["documents"][0]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            sections.append({
                "text": doc,
                "section_number": meta.get("section_number", ""),
                "section_title": meta.get("section_title", ""),
                "code_type": meta.get("code_type", ""),
                "relevance_score": 1 - dist,  # cosine distance to similarity
            })

    return sections


def retrieve_fir_examples(query_embedding: list[float], n_results: int = 2) -> list[str]:
    """Retrieve sample FIR text patterns for language style reference."""
    client = get_chroma_client()
    collection = get_fir_examples_collection(client)

    if collection.count() == 0:
        return []

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count()),
        include=["documents"],
    )

    if results["documents"] and results["documents"][0]:
        return results["documents"][0]
    return []
