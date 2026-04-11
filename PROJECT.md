# Course2Career — Project Overview
### QUT IT Career Path Advisor · MVP Pitch & Demo Brief

---

## The Problem

Target User: IT students at QUT graduate with a degree but often lack visibility into **which specific units
actually matter for the jobs they want**.

The gap is two-sided:
- **Students** don't know which electives to prioritise or what skills their completed units already cover.
- **Employers** struggle to evaluate candidates whose academic transcripts don't map clearly to real-world skills.

The result: students enrol in whatever fits their schedule, graduate under-prepared for their target
roles, and spend time in interviews explaining why their degree is relevant — instead of demonstrating it.

---

## The Core Idea

> **Match a student's academic progress against a real job description — and tell them exactly what to study next.**

Course2Career is a web application that:

1. Lets a student **search live job listings or paste any job description**
2. Knows **which QUT IT units the student has already completed**
3. Uses **semantic AI** to rank the units they still need — scored by how closely each unit's content
   aligns with the skills required by the job
4. Delivers a **personalised** gap analysis, next-semester enrolment plan, and curated external
   study resources** — all in one place

---

## The Solution — Feature Walkthrough

### 1. Live Job Search
- Powered by the **Adzuna Jobs API** (real Australian job market data)
- Search by keywords and location; results show salary range, company, and location
- Click any listing to read the full job description in a pop-up modal, then hit **Analyze →** directly from the modal

### 2. Paste Your Own JD
- Supports any job description — LinkedIn, SEEK, internal postings — pasted directly as free text
- No dependency on a specific job board

### 3. Your Progress Tracker
- Full course catalogue for both **Master of IT** (7 majors) and **Bachelor of IT** (7 specialisations)
- Students set their **degree, current study period, and major/specialisation**
- **Auto-fill**: completed units are automatically deduced from the student's study period and major
  using the official QUT semester sequences — no manual ticking required for past semesters
- Students can review and adjust individual unit checkboxes at any time
- Two-level grouped accordion: Core → Foundational / Advanced / Capstone; Major Electives by specialisation

### 4. AI-Powered Recommendations
- **Vector similarity search** ranks every unit in the catalogue against the job description
- Top matched units displayed as cards with a **match score (%)**, matching reason, and skill gaps
- Each card links to the **official QUT unit detail page** for full unit information
- Students can mark recommended units as completed directly from the cards

### 5. Gap Analysis
- A concise 2–3 sentence analysis of which skills the recommended units cover and which gaps remain
- **Key skills and technologies bolded** for quick scanning

### 6. Next Semester Action Plan
- Concrete, specific enrolment advice: exactly which unit codes to take next semester and why
- **Unit codes and action terms bolded** for clarity

### 7. Curated Study Resources
- 4–5 external resources (online courses, YouTube channels, podcasts, communities, events) targeting
  critical skill gaps that the curriculum alone cannot fill
- Resource types are colour-coded; links open the resource directly (YouTube search, Spotify podcast
  search, course pages)

---

## Technology Stack

### Frontend
| Technology | Role |
|---|---|
| **React 18 + TypeScript** | Component-based UI with full type safety |
| **Vite** | Fast development server and production bundler |
| **Tailwind CSS** | Utility-first styling — no custom CSS files |
| **Axios** | HTTP client for API calls |

### Backend
| Technology | Role |
|---|---|
| **FastAPI** | High-performance Python REST API |
| **ChromaDB** | Local vector database — stores unit embeddings for semantic search |
| **Sentence Transformers** (`all-mpnet-base-v2`) | Converts unit content and job descriptions into dense vector embeddings |
| **OpenAI GPT-4o-mini** | Generates gap analysis, semester plan, and study resources |
| **pypdf** | Parses QUT course structure PDFs to extract unit details |
| **Adzuna API** | Live Australian job listings |
| **pydantic v2** | Request/response validation; TypeScript types are kept in sync manually |

---

## Core Technical Logic

### How Recommendations Work — Two-Stage Pipeline

```
Job Description (text)
        │
        ▼
[ Sentence Transformer Embedding ]
  Convert JD text → 768-dim vector
        │
        ▼
[ ChromaDB Cosine Similarity Search ]
  Query unit catalogue (50 MIT units) → select top K candidates
  Score = 1 − cosine_distance  (range 0–1)
        │
        ▼
[ Keyword Matching Layer ]
  Extract shared keywords between JD and each unit
  → human-readable "Matching Reason"
        │
        ▼
[ GPT-4o-mini LLM Analysis ]
  Input: job description + top-K unit summaries + student profile
  Output (structured JSON):
    • gap_analysis        — skill coverage + remaining gaps
    • next_semester_plan  — specific unit codes + rationale
    • study_resources     — 4–5 external resources with URLs
        │
        ▼
  RecommendationResponse  →  React frontend
```

### How Unit Data Gets Into ChromaDB

1. **PDF Ingestion** — QUT course structure PDFs are parsed using `pypdf`. The parser splits the document on the "View unit timetable" sentinel, extracts unit code, title, pre-requisites, credit points, and description for each of the ~50 units.
2. **Embedding** — Each unit's learning outcomes + content are concatenated and embedded using Sentence Transformers locally (no API cost).
3. **Upsert** — ChromaDB stores the embedding vector + all metadata. Re-ingesting is idempotent.
4. **Query** — At recommendation time, the job description is embedded with the same model and cosine similarity is computed against all stored unit vectors.

### How Auto-Fill Works (Frontend)

The `deduceCompletedUnits` function implements the rule:

```
completed_semesters = (year_of_study − 1) × 2 + (semester − 1)
```

For example: Year 2, Semester 1 → 2 semesters completed → all Year 1 units pre-ticked.

This logic is driven by static semester-sequence tables sourced directly from the official QUT PDF
course structures for all 7 MIT majors and 2 Bachelor specialisations (with more coming).

---

## Deployment

### Live URLs
| Service | Platform | URL |
|---|---|---|
| **Frontend** | Vercel | Your Vercel project URL (set after deploy) |
| **Backend API** | Railway | Your Railway service URL (e.g. `https://your-api.up.railway.app`) |

### Frontend — Vercel
- Deployed as a static React SPA
- `vercel.json` rewrites all routes to `index.html` (enables client-side routing)
- One environment variable required: `VITE_API_URL` → set to the Railway backend URL
- In development, `VITE_API_URL` is unset and Vite proxies `/api` to `localhost:8000`

### Backend — Railway
- Python auto-detected via root-level `requirements.txt`; Nixpacks builds the image automatically
- Start command: `uvicorn backend.src.main:app --host 0.0.0.0 --port $PORT`
- Health check: `GET /api/health` (returns `{ status: "ok", units_in_db: N }`)

**Required environment variables (set in Railway project settings):**

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `APP_ID` | Adzuna application ID |
| `APP_KEY` | Adzuna API key |
| `FRONTEND_URL` | Your Vercel deployment URL (added to CORS allowed origins) |
| `CHROMA_PATH` | `/data/chroma` (path to the Railway volume mount) |

### ChromaDB Persistence — Railway Volume
- ChromaDB writes its vector index to disk; without a volume it resets on every redeploy
- In Railway: add a **Volume** to the service, mount path `/data/chroma`
- Set `CHROMA_PATH=/data/chroma` so the app writes to the volume
- On first cold start the app auto-ingests units from `utils/*.json` and the MIT PDF; subsequent deploys skip ingestion (DB already populated)

### PDF Files
- All QUT course structure PDFs live in `data/` and are committed to git
- Railway clones the full repo, so PDFs are available at deploy time — no manual upload needed
- `data/chroma/` (the generated vector DB) is gitignored; it lives on the Railway volume

### Architecture with Deployment

```
  Browser
     │  HTTPS
     ▼
┌──────────────┐          ┌────────────────────────────┐
│    Vercel    │  REST     │          Railway           │
│  React SPA   │ ────────▶│  FastAPI  +  ChromaDB      │
│  (static)    │          │  (volume: /data/chroma)    │
└──────────────┘          └──────────┬─────────────────┘
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
                    ┌──────────┐         ┌────────────┐
                    │ Adzuna   │         │ OpenAI API │
                    │ Jobs API │         │ GPT-4o-mini│
                    └──────────┘         └────────────┘
```

---

## Data Sources

| Source | What It Provides |
|---|---|
| `qut_IN20_45010_dom_cms_unit.pdf` | MIT unit details — titles, content, pre-requisites, credit points for all 50 units |
| `qut_IN01_4499X_dom_cms_unit.pdf` | Bachelor of IT course structure sequences (7 specialisations) |
| Adzuna Jobs API | Live Australian job listings with salary, location, full description |

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              React SPA (port 5173)           │
│  JobSearch │ RecommendationPanel │ UnitProgress │
└───────────────────┬─────────────────────────┘
                    │ REST (Axios)
                    ▼
┌─────────────────────────────────────────────┐
│           FastAPI Backend (port 8000)        │
│                                              │
│  GET  /api/units          → unit catalogue   │
│  POST /api/units/ingest-pdf → PDF ingestion  │
│  GET  /api/jobs/search    → Adzuna proxy     │
│  POST /api/recommendations → AI pipeline    │
└───────┬───────────────────────┬─────────────┘
        │                       │
        ▼                       ▼
  ┌──────────┐           ┌────────────┐
  │ ChromaDB │           │ OpenAI API │
  │(local FS)│           │ GPT-4o-mini│
  └──────────┘           └────────────┘
```

---

## What Makes This Different

| Typical approach | Course2Career |
|---|---|
| Browse units manually in the handbook | Units are ranked by AI against your actual target job |
| Generic career advice | Advice is specific to the student's current progress and chosen major |
| "Study more Python" | "Enrol in **IFN664** and **IFN735** next semester — they directly address the ML pipeline and cloud skills this role requires" |
| External course platforms only | Combines degree curriculum + external resources in one recommendation |

---

## MVP Scope & Limitations

**In scope for MVP:**
- MIT (all 7 majors) fully supported — unit detail data ingested into ChromaDB
- Bachelor of IT (all 7 specialisations selectable) — auto-fill sequences available for Artificial Intelligence and Business Analysis & IT Management; remaining 5 use common Year 1 auto-fill pending additional PDFs
- Live job search (Australia) via Adzuna
- Full recommendation pipeline with LLM analysis
- Progress tracker with manual override

**Known limitations / post-MVP:**
- Bachelor unit details not yet in ChromaDB (recommendations draw from MIT catalogue)
- No user accounts or persistence — state is lost on page refresh
- No mobile-responsive optimisation


---

## Demo Flow (Suggested for Pitch)

1. **Open the app** — point out the Welcome Guide and the always-visible Your Progress section
2. **Set profile** — select Master of IT, Year 2 Semester 1, Software Development major → watch units auto-fill
3. **Search for a job** — search "Software Engineer Brisbane" → pick a real listing → read the JD in the modal
4. **Hit Analyze** — walk through the loading spinner → results appear
5. **Show Gap Analysis** — point out bolded skill keywords
6. **Show Recommended Units** — match scores, "For more details" QUT links, mark one as completed
7. **Show Next Semester Plan** — unit codes bolded, actionable
8. **Show Study Resources** — YouTube, podcast, course links
9. **Toggle a unit in the progress tracker** — show the counter in the nav updating in real time

---

*Built with React · FastAPI · ChromaDB · Sentence Transformers · OpenAI GPT-4o-mini · Adzuna*

 For the pitch (judges):
  - The Problem — the student-to-job knowledge gap, explained without jargon
  - The Core Idea — one paragraph that any industry person can understand
  - What Makes This Different — side-by-side comparison table vs typical approaches

  For the demo:
  - A step-by-step demo script at the bottom — 9 beats that show every major feature in ~5 minutes

  For your own understanding:
  - Two-stage pipeline diagram — vector search → keyword layer → LLM, with data flow
  - Auto-fill logic — the (year−1)×2 + (semester−1) formula explained plainly
  - How ChromaDB gets populated — PDF → pypdf → embed → upsert
  - Full tech stack table with each technology's specific role
  - Architecture diagram showing how frontend/backend/ChromaDB/OpenAI/Adzuna connect
  - MVP scope vs post-MVP limitations — honest about what's not done yet
