  To start the project, you need to:

  # 1. Copy .env and fill in secrets
  cp .env.example .env

  # 2. Start PostgreSQL + Redis
  docker-compose up -d

  # 3. Run DB migration
  cd apps/api && pnpm db:push

  # 4. Start Ollama + pull model
  ollama pull llama3.1:8b && ollama pull nomic-embed-text

  # 5. Set up Python AI service
  cd services/ai
  python -m venv .venv && .venv/Scripts/activate
  pip install -r requirements.txt
  python scripts/scrape_and_index.py  # one-time ChromaDB setup
  uvicorn main:app --reload

  # 6. Start Node API
  cd apps/api && pnpm dev

  # 7. Start Frontend
  cd apps/frontend && pnpm dev