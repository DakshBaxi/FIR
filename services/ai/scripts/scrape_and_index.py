"""
Master data ingestion script.
Run once to populate ChromaDB with IPC/BNS sections and FIR examples.

Usage:
  cd services/ai
  python -m venv .venv && .venv/Scripts/activate
  pip install -r requirements.txt
  python scripts/scrape_and_index.py
"""
import asyncio
import json
import sys
from pathlib import Path

# Add parent to path so we can import from services/
sys.path.insert(0, str(Path(__file__).parent.parent))

import chromadb
from chromadb.config import Settings as ChromaSettings
from config import settings
from services.embeddings import get_embedding

DATA_DIR = Path(__file__).parent.parent / "data" / "raw"


async def index_sections():
    """Index BNS and IPC sections into ChromaDB."""
    client = chromadb.PersistentClient(
        path=settings.chroma_db_path,
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    # Delete existing collection to re-index cleanly
    try:
        client.delete_collection("legal_sections")
        print("Deleted existing legal_sections collection")
    except Exception:
        pass

    collection = client.create_collection(
        name="legal_sections",
        metadata={"hnsw:space": "cosine"},
    )

    all_sections = []

    for fname in ["bns_sections.json", "ipc_sections.json"]:
        fpath = DATA_DIR / fname
        if not fpath.exists():
            print(f"Warning: {fpath} not found, skipping")
            continue
        with open(fpath, encoding="utf-8") as f:
            sections = json.load(f)
        all_sections.extend(sections)
        print(f"Loaded {len(sections)} sections from {fname}")

    if not all_sections:
        print("No sections to index!")
        return

    print(f"\nIndexing {len(all_sections)} sections into ChromaDB...")
    batch_size = 10

    for i in range(0, len(all_sections), batch_size):
        batch = all_sections[i:i + batch_size]
        documents = []
        embeddings = []
        metadatas = []
        ids = []

        for section in batch:
            text = f"{section['code_type']} Section {section['section']} - {section['title']}: {section['description']}"
            embedding = await get_embedding(text)
            documents.append(text)
            embeddings.append(embedding)
            metadatas.append({
                "section_number": str(section["section"]),
                "section_title": section["title"],
                "code_type": section["code_type"],
                "keywords": ",".join(section.get("keywords", [])),
            })
            ids.append(f"{section['code_type']}_{section['section']}")

        collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids,
        )
        print(f"  Indexed batch {i // batch_size + 1} ({len(batch)} sections)")

    print(f"Indexed {collection.count()} legal sections total")


async def index_fir_examples():
    """Index FIR example text patterns into ChromaDB."""
    client = chromadb.PersistentClient(
        path=settings.chroma_db_path,
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    try:
        client.delete_collection("fir_examples")
    except Exception:
        pass

    collection = client.create_collection(
        name="fir_examples",
        metadata={"hnsw:space": "cosine"},
    )

    fpath = DATA_DIR / "fir_examples.json"
    if not fpath.exists():
        print("No fir_examples.json found, skipping")
        return

    with open(fpath, encoding="utf-8") as f:
        examples = json.load(f)

    for i, example in enumerate(examples):
        text = f"FIR Type: {example['type']}\nGist: {example['gist']}"
        embedding = await get_embedding(text)
        collection.add(
            documents=[text],
            embeddings=[embedding],
            metadatas=[{"type": example["type"]}],
            ids=[f"fir_example_{i}"],
        )

    print(f"Indexed {collection.count()} FIR examples")


async def main():
    print("=== FIR Project Data Indexing ===\n")

    # First run scraping scripts to generate raw data
    print("Step 1: Running BNS scraper...")
    from scripts.scrape_bns import scrape_bns_from_kanoon, save_sections as save_bns
    bns_sections = await scrape_bns_from_kanoon()
    save_bns(bns_sections)

    print("\nStep 2: Running IPC scraper...")
    from scripts.scrape_ipc import main as ipc_main
    ipc_main()

    print("\nStep 3: Running FIR examples scraper...")
    from scripts.scrape_fir_examples import main as fir_examples_main
    fir_examples_main()

    print("\nStep 4: Indexing legal sections into ChromaDB...")
    await index_sections()

    print("\nStep 5: Indexing FIR examples into ChromaDB...")
    await index_fir_examples()

    print("\n=== Indexing complete! ===")
    print(f"ChromaDB stored at: {settings.chroma_db_path}")


if __name__ == "__main__":
    asyncio.run(main())
