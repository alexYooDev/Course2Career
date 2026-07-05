# Course2Career — AI-Powered Curriculum Gap-Analysis App

> Built for the **QUT AI/ML Society Hackathon** — presented to industry judges from Microsoft, NTI, and other Brisbane tech companies.

## The Problem

IT students graduate without a clear picture of which units actually matter for the jobs they want. Course2Career closes that gap: match a student's academic progress against a real job description, and tell them exactly what to study next.

## What It Does

1. **Live job search or paste any job description** (via the Adzuna Jobs API or free text)
2. **Tracks a student's completed units** — auto-filled from their study period and major using official QUT semester sequences
3. **Semantic matching** — ranks every unit in the catalogue against the job description using vector embeddings
4. **AI-generated gap analysis** — which skills are covered, which are missing, and a concrete next-semester enrolment plan
5. **Curated external resources** — courses, communities, and content targeting the remaining skill gaps

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Zustand |
| Backend | FastAPI (Python) |
| Vector Database | ChromaDB |
| Embeddings | Sentence Transformers (`all-mpnet-base-v2`) |
| LLM | OpenAI GPT-4o-mini (gap analysis, recommendations) |
| Data Ingestion | pypdf (parses QUT course structure PDFs) |
| External Data | Adzuna API (live AU job listings) |
| Deployment | Docker Compose |

## How Recommendations Work

```
Job Description (text)
        │
        ▼
Sentence Transformer Embedding (text → 768-dim vector)
        │
        ▼
ChromaDB Cosine Similarity Search (top-K matching units)
        │
        ▼
Keyword Matching Layer (human-readable "why it matches")
        │
        ▼
GPT-4o-mini Analysis → gap analysis + semester plan + resources
        │
        ▼
React Frontend
```

Full technical write-up (data pipeline, auto-fill logic, PDF ingestion) is in [`PROJECT.md`](./PROJECT.md).

## Running Locally

**Requirements:** Docker & Docker Compose

```bash
git clone https://github.com/alexYooDev/Course2Career.git
cd Course2Career
cp .env.example .env   # fill in API keys (OpenAI, Adzuna)
docker-compose up --build
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:8000](http://localhost:8000)

## Author

Built by [Hwanik (Alex) Yoo](https://github.com/alexYooDev), mostly solo, with AI-assisted development used to accelerate prototyping.
