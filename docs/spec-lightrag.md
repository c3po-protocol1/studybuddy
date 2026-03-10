# LightRAG Integration Spec

## Overview

Integrate LightRAG (knowledge-graph-enhanced retrieval augmented generation) into StudyBuddy so
users can upload study documents and query them with graph-aware context retrieval.

---

## 1. Setup Approach

**Recommendation: Python microservice (`rag-service/`)**

LightRAG is a Python library (pip: `lightrag-hku`). Go has no native binding. A dedicated FastAPI
microservice is the cleanest approach:

- Keeps Go backend focused on business logic
- Python service owns all LightRAG state and data
- Services communicate over HTTP (internal Docker network)
- The service is independently deployable and testable

---

## 2. Architecture

```
Browser
  │
  │  POST /api/rag/ingest  (multipart)
  ▼
frontend (Next.js :3000)
  │
  │  POST /api/rag/ingest  (multipart, proxy)
  ▼
backend (Go/Gin :8080)
  │
  │  POST http://rag-service:8000/ingest  (multipart, internal)
  ▼
rag-service (FastAPI :8000)
  │
  │  LightRAG.ainsert(text)
  ▼
LightRAG engine  →  lightrag_data/  (graph + vector store on disk)
                 →  OpenAI API (LLM + embeddings)
```

### Query flow (future)

```
frontend → backend GET /api/rag/query?q=...
         → rag-service GET /query?q=...
         → LightRAG.aquery(q, mode="hybrid")
         → response JSON
```

---

## 3. Document Upload Flow

1. User selects a PDF, TXT, or MD file in the frontend upload modal.
2. Frontend posts the file as `multipart/form-data` to `POST /api/rag/ingest`.
3. Go backend validates the file, then proxies it to `rag-service` `/ingest`.
4. rag-service:
   a. Receives the file bytes.
   b. Extracts plain text (PyMuPDF for PDF, direct decode for TXT/MD).
   c. Calls `await rag.ainsert(text)` — LightRAG builds knowledge graph + vector index.
   d. Persists indexed data in `./lightrag_data/` (mounted volume).
   e. Returns `{ "status": "ok", "chunks": N }`.
5. Go backend returns the same payload to frontend.
6. Frontend shows success/error state.

---

## 4. RAG Pipeline Steps (inside rag-service)

```
raw bytes
  → text extraction  (PyMuPDF / plain decode)
  → LightRAG.ainsert(text)
      ├── chunk text into passages
      ├── extract entities + relations  (LLM call → gpt-4o-mini)
      ├── build knowledge graph (NetworkX, persisted to disk)
      ├── generate embeddings (text-embedding-3-small)
      └── upsert vector store (nano-vectordb on disk)
```

---

## 5. Storage

| Path | Contents |
|------|----------|
| `rag-service/lightrag_data/` | LightRAG working directory: KG, vector store, cache |
| Docker volume `rag_data` | Persistent bind-mount of above |

`RAG_WORKING_DIR` env var controls the path (default: `./lightrag_data`).

---

## 6. API Contracts

### rag-service (internal)

#### `POST /ingest`
- Content-Type: `multipart/form-data`
- Field: `file` (binary, PDF / TXT / MD)
- Response 200:
  ```json
  { "status": "ok", "filename": "lecture.pdf", "chunks": 42 }
  ```
- Response 400:
  ```json
  { "detail": "unsupported file type: .docx" }
  ```
- Response 500:
  ```json
  { "detail": "ingestion failed: <message>" }
  ```

#### `GET /query`
- Query param: `q` (string, required)
- Query param: `mode` (string, optional, default: `"hybrid"`, values: `naive|local|global|hybrid`)
- Response 200:
  ```json
  { "result": "<answer text>" }
  ```

#### `GET /health`
- Response 200: `{ "status": "ok" }`

---

### Go backend (public API)

#### `POST /api/rag/ingest`
- Auth: JWT Bearer (same middleware as other protected routes)
- Content-Type: `multipart/form-data`
- Field: `file`
- Response 200:
  ```json
  { "status": "ok", "filename": "lecture.pdf", "chunks": 42 }
  ```
- Response 400 / 500: error JSON

#### `GET /api/rag/query` *(future)*
- Auth: JWT Bearer
- Query: `q`, `mode`
- Proxies to rag-service `/query`

---

## 7. Required API Keys / Env Vars

| Variable | Where | Description |
|----------|-------|-------------|
| `OPENAI_API_KEY` | rag-service | OpenAI key for LLM (entity extraction) and embeddings |
| `LLM_MODEL` | rag-service | LLM model name (default: `gpt-4o-mini`) |
| `EMBEDDING_MODEL` | rag-service | Embedding model (default: `text-embedding-3-small`) |
| `RAG_WORKING_DIR` | rag-service | LightRAG data directory (default: `./lightrag_data`) |
| `RAG_SERVICE_URL` | backend | Internal URL of rag-service (default: `http://rag-service:8000`) |
| `DATABASE_URL` | backend | PostgreSQL connection string (existing) |
| `JWT_SECRET` | backend | JWT signing secret (existing) |

> **Note:** `OPENAI_API_KEY` is the only *new* external secret required. All others are
> internal configuration. The OpenAI key is used exclusively inside rag-service; the Go backend
> and Next.js frontend never see it.

---

## 8. Directory Layout After Integration

```
studybuddy/
├── docs/
│   └── spec-lightrag.md
├── rag-service/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app, /ingest, /query, /health
│   │   └── rag_engine.py    # LightRAG init + insert/query helpers
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_main.py     # pytest with mocked LightRAG
│   ├── requirements.txt
│   └── Dockerfile
├── backend/
│   └── handlers/
│       └── rag.go           # Go handler: proxy to rag-service
│   └── handlers/
│       └── rag_test.go      # Go unit tests (mock HTTP)
├── frontend/
│   └── app/rag/page.tsx     # Upload UI page
├── .env.example
└── docker-compose.yml       # updated with rag-service
```
