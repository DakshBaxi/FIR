#!/bin/sh
set -e

# Build the ChromaDB index on first run if it wasn't shipped with the image
if [ ! -f "${CHROMA_DB_PATH:-./data/chroma_db}/chroma.sqlite3" ]; then
  echo "ChromaDB index not found, running one-time indexing..."
  python scripts/scrape_and_index.py
fi

exec uvicorn main:app --host 0.0.0.0 --port "${AI_SERVICE_PORT:-8000}"
