# Plan: AI-Powered FIR Generation System

## Context
Police officers spend significant time manually drafting FIRs. This project eliminates that friction: an officer narrates the incident in plain language, and the system uses AI to extract entities, identify applicable IPC/BNS sections, and generate a properly formatted FIR. The officer edits it in-browser, then downloads as PDF. Only authenticated, registered police departments can access the system.

**Deployment:** Fully local on Windows 11 (16GB RAM). No cloud costs.
**LLM:** Ollama with Llama 3.1 8B (free, local, no data sent externally — ideal for sensitive police data).

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Best ecosystem for form-heavy doc-editing UIs |
| UI | shadcn/ui + Tailwind CSS | Accessible, large touch targets — critical for non-tech officers |
| Rich editor | TipTap (ProseMirror) | In-browser FIR editing with locked header/editable body |
| PDF (client) | @react-pdf/renderer | Live PDF preview before download, zero server latency |
| Backend | Node.js + Express + TypeScript | Shares Zod schemas with frontend via monorepo |
| AI microservice | Python FastAPI | LangChain + Ollama + ChromaDB work best in Python |
| LLM | **Ollama + Llama 3.1 8B** (FREE, local) | No API cost, data never leaves machine, 16GB RAM is sufficient |
| ORM | Prisma + PostgreSQL 16 | ACID guarantees for legal docs, JSONB for flexible entity storage |
| Cache/Queue | Redis + Bull | JWT blacklist, rate limit counters, async LLM job queue |
| Monorepo | pnpm workspaces | Shared Zod schemas used in both Express validation and React forms |
| Container | Docker Desktop (Windows) | Runs PostgreSQL + Redis without manual install |

---

## Ollama Setup

```
# Install Ollama for Windows from ollama.ai
# Pull Llama 3.1 8B model (4.7GB download)
ollama pull llama3.1:8b

# Ollama runs as a local server on http://localhost:11434
# Python service connects to it via LangChain's OllamaLLM
```

LangChain integration:
```python
from langchain_ollama import OllamaLLM
llm = OllamaLLM(model="llama3.1:8b", base_url="http://localhost:11434")
```

---

## Architecture

```
[React SPA :5173] --HTTP+JWT--> [Node Express API :4000]
                                        |
                              [internal HTTP only]
                                        |
                              [Python FastAPI AI :8000]
                                        |
                [Ollama :11434]  [ChromaDB]  [PostgreSQL :5432]  [Redis :6379]
```

**Auth flow:** Badge ID + password → two JWTs: `accessToken` (15-min, memory) + `refreshToken` (7-day, HttpOnly cookie). All routes require JWT; Redis blacklist enables immediate revocation on logout.

**AI pipeline (3 chained LLM calls via Ollama):**
1. **Entity Extraction** — raw story → JSON: suspects, victims, location, offence keywords
2. **Section Identification** — entities + RAG-retrieved BNS/IPC sections → applicable sections + justification
3. **FIR Draft Generation** — all context + station details → complete FIR JSON

**RAG:** ChromaDB stores embeddings for all 358 BNS + 511 IPC sections + ~200 anonymized FIR examples. Embeddings generated using `nomic-embed-text` (Ollama model, free). Hybrid retrieval: keyword pre-filter on PostgreSQL + vector search, top-8 results injected into Call 2.

**Async AI calls:** Bull queue + Server-Sent Events — officer gets live progress bar ("Analyzing story... 30%"), not a spinner timeout. Llama 3.1 8B takes ~10-20s per call locally.

---

## Database Schema (6 tables)

- `police_stations` — station name, code (PS/MUM/001), district, state, jurisdiction
- `officers` — badge_number (login ID), rank, role (OFFICER/SENIOR_OFFICER/STATION_ADMIN/SUPER_ADMIN), bcrypt hash, lockout fields
- `firs` — fir_number, status (DRAFT→FINALIZED), incident_description, accused/victims/witnesses (JSONB), primary_bns_sections[], primary_ipc_sections[], fir_content_json (TipTap doc), ai_analysis_raw (audit)
- `ipc_bns_sections` — section_number, code_type (IPC/BNS), title, description, keywords[], bns_equivalent, embedding_id
- `audit_logs` — append-only (DB trigger prevents UPDATE/DELETE), captures all state changes with old/new values
- `refresh_tokens` — SHA-256 hashed token, expires_at, revoked_at

---

## RBAC

| Role | Permissions |
|---|---|
| OFFICER | File FIRs, edit own DRAFT FIRs |
| SENIOR_OFFICER | + View all station FIRs, approve FIRs |
| STATION_ADMIN | + Manage officers, view audit logs |
| SUPER_ADMIN | + Manage stations, system config |

---

## Security

- Passwords: bcrypt cost=12
- PII (Aadhaar/PAN numbers): AES-256 via `pgcrypto`
- Rate limits: 5 login attempts/15min/IP, 10 AI calls/hour/officer, 200 req/15min/IP global
- Account lockout: 5 failed attempts → 30-min lock → alert to STATION_ADMIN
- Audit logs: PostgreSQL-level append-only trigger
- CSRF: SameSite=Strict cookies
- Input sanitization: DOMPurify (frontend) + express-validator (backend)
- **Data privacy:** Ollama runs 100% locally — no incident details ever sent to external servers

---

## Folder Structure

```
fir_project_final_project/
├── docker-compose.yml            # PostgreSQL 16 + Redis 7 only (Ollama runs natively)
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── packages/
│   └── shared/src/
│       ├── schemas/              # Zod: auth, station, officer, fir, section
│       └── types/                # Role enum, FIR status enum, API types
├── apps/
│   ├── frontend/src/
│   │   ├── pages/                # Login, RegisterStation, Dashboard, NewFir, FirEditor, FirList, FirDetail, Officers
│   │   ├── components/           # auth/, layout/, fir/, station/
│   │   ├── hooks/                # useAuth, useFirAnalysis (SSE), useFirEditor, useDebounce
│   │   ├── store/                # authStore (Zustand), firDraftStore
│   │   ├── api/                  # Axios client + per-domain API files
│   │   └── lib/                  # pdf/ (react-pdf template), editor/ (TipTap extensions)
│   └── api/src/
│       ├── prisma/schema.prisma
│       ├── middleware/           # auth, rbac, audit, rateLimit, errorHandler
│       ├── routes/               # auth, station, officer, fir, sections, pdf
│       ├── controllers/
│       └── services/             # auth, station, officer, fir, ai (→ Python), pdf (Puppeteer), queue
└── services/
    └── ai/
        ├── services/             # llm_chain.py, retrieval.py, embeddings.py, prompts.py
        ├── routers/              # analyze.py, sections.py, health.py
        ├── scripts/              # scrape_ipc.py, scrape_bns.py, scrape_fir_examples.py, scrape_and_index.py
        └── data/chroma_db/
```

---

## Implementation Phases (Step-by-Step, We Build Together)

### Phase 1 — Prerequisites + Monorepo Setup
**What to install first:**
- Docker Desktop for Windows
- Ollama for Windows + `ollama pull llama3.1:8b` + `ollama pull nomic-embed-text`
- Node.js 20 LTS, pnpm, Python 3.12

**Files to create:**
1. `.gitignore`
2. `.env.example`
3. `docker-compose.yml` — PostgreSQL 16 + Redis 7
4. `pnpm-workspace.yaml`
5. `packages/shared` — Zod schemas + TypeScript types

### Phase 2 — Backend API + Auth
6. `apps/api/prisma/schema.prisma` — all 6 tables
7. Express app with all middleware (helmet, cors, rate-limit)
8. Auth endpoints: login, logout, refresh-token
9. Station registration + officer management endpoints

### Phase 3 — Frontend Foundation + Auth Pages
10. Vite + React + Tailwind + shadcn/ui setup
11. Axios client with silent JWT refresh
12. Login page, Register Station wizard, Dashboard, Officer management

### Phase 4 — AI Pipeline (Ollama)
13. Python FastAPI microservice
14. Scraping scripts → IPC/BNS sections → ChromaDB (nomic-embed-text embeddings)
15. 3-call LangChain chain using Ollama
16. Bull queue + SSE for async AI processing
17. Frontend: incident input form with live progress bar

### Phase 5 — FIR Editor + PDF
18. TipTap editor (locked header, editable body)
19. FIR finalization + official numbering
20. @react-pdf/renderer template (Form 24.1 format)
21. Download PDF + server archival

### Phase 6 — Security Hardening
22. PostgreSQL RLS policies
23. Append-only audit log triggers
24. WCAG 2.1 AA accessibility
25. Playwright E2E tests

---

## Data Scraping Strategy
- **India Kanoon**: IPC/BNS section text via `httpx` + `BeautifulSoup4`, 2s delay
- **legislative.gov.in**: Official BNS Act PDFs via `pdfplumber`
- **FIR examples**: NCRB Form 24.1 samples, government portal samples — anonymize before storing
- One-time setup: `python services/ai/scripts/scrape_and_index.py`

---

## Critical Files
- `apps/api/prisma/schema.prisma` — all 6 tables
- `services/ai/services/prompts.py` — 3 LLM prompt templates (tuned for Llama 3.1 8B)
- `services/ai/services/llm_chain.py` — 3-call LangChain chain via Ollama
- `apps/api/src/middleware/auth.middleware.ts` — JWT + Redis blacklist check
- `packages/shared/src/schemas/fir.schema.ts` — shared Zod schema
- `apps/frontend/src/api/client.ts` — Axios with silent refresh interceptor
- `apps/frontend/src/lib/pdf/FirPdfDocument.tsx` — PDF template

---

## Verification
1. `docker-compose up` → PostgreSQL :5432 + Redis :6379 running
2. `ollama serve` → Ollama running at :11434
3. `pnpm dev` → frontend :5173 + API :4000 start without TS errors
4. `uvicorn main:app` → Python AI service :8000 healthy
5. Register test station → login as admin → create officer
6. File a test FIR with sample story → SSE progress fires → BNS sections appear
7. Edit FIR in TipTap → Download PDF → verify Form 24.1 format
8. Second station officer cannot read first station's FIRs (RLS check)
9. 6 bad login attempts locks the account
10. `npx playwright test` — auth + FIR E2E suites pass
