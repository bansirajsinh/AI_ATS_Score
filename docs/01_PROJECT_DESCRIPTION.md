# AI Resume ATS Score Checker — Full Project Description

**Document purpose:** This file is the master specification for the project. It is written so that an AI coding agent (Antigravity, Claude Code, Cursor, etc.) or a human developer can read it once and understand exactly what to build, why, and how, without needing follow-up clarification.

**Companion file:** `02_DATABASE_AI_TECHSTACK.md` — covers database + AI/ML tool selection and implementation in depth. Read both files together.

---

## 1. Project Overview

**Project Name:** ResumeIQ (working title) — AI-Powered ATS Resume Score Checker

**One-line pitch:** A web application where a user uploads their resume (and optionally a target job description), and the system returns an ATS compatibility score (0–100), a full diagnostic report of every problem hurting that score, a keyword gap analysis against the job description, and specific, actionable rewrite suggestions to push the score to 90+.

**What it is NOT:** It is not a generic grammar checker (like Grammarly) and not a resume *builder* in v1. It is a diagnostic + optimization engine. Resume building/templating can be a v2 feature.

---

## 2. Problem Statement & Goals

### The problem
Modern Applicant Tracking Systems (Workday, Greenhouse, Lever, iCIMS, Taleo, SmartRecruiters) no longer do simple keyword string-matching. As of 2026 they run a two-layer pipeline: a **parser** that extracts structured fields (contact info, sections, dates, titles, skills) and a **matcher** that uses exact-match, Boolean filters, and increasingly LLM-assisted semantic scoring to rank candidates against a job description. Over 97% of large enterprises use an ATS to filter applicants before a human ever sees the resume, and most candidates fail at the *parsing* stage — before keyword scoring even runs — because of bad formatting (multi-column layouts, tables, icons, graphics, non-standard section headers).

Most job seekers:
- Don't know their resume fails to parse cleanly.
- Don't know which keywords the specific job description weights most heavily.
- Repeat keywords unnaturally ("keyword stuffing"), which modern ATS algorithms now actively penalize rather than reward.
- Don't know how to phrase achievements so they satisfy both the ATS and a human reader.

### Goals of this application
1. Give a numeric, explainable ATS score (0–100) in under 15 seconds.
2. Detect and explain every **parsing risk** (formatting, structure, file-type issues) separately from every **content/keyword risk**.
3. Compare the resume against a specific job description (JD) using both exact keyword matching and semantic/contextual matching (so the tool understands that "program management" is related to "project management").
4. Give a prioritized, specific action list ("Add 'stakeholder management' to your Skills section and your PM bullet at Company X") rather than vague advice.
5. Let the user iterate: edit → re-score → see the score climb toward 90+.
6. Store history so a user can track score improvement across resume versions and across different job applications.

### Non-goals (v1)
- Building a resume from a blank template.
- Auto-editing the resume file directly (we suggest changes; user applies them).
- Cover letter generation (candidate for v2).

---

## 3. Target Users

| # | User type | Need |
|---|---|---|
| 1 | Active job seekers (individual contributors) | Fast, specific feedback before submitting an application |
| 2 | Career changers | Understand which transferable keywords are missing |
| 3 | New graduates | Learn ATS-compliant formatting from scratch |
| 4 | Career coaches / resume writers | Bulk-check multiple client resumes, white-label reports |
| 5 | Recruiters / staffing agencies (v2, B2B) | Pre-screen candidate resumes against open JDs at scale |

---

## 4. Core Features (Detailed)

1. **Resume Upload & Parsing** — Accepts PDF, DOCX, and TXT. Extracts raw text, preserves section boundaries (Summary, Experience, Skills, Education, Certifications), and detects layout risks (columns, tables, text boxes, images, non-standard fonts) that break real-world ATS parsers.
2. **Job Description Input** — User pastes a JD or a URL; the system extracts required skills, "nice-to-have" skills, seniority signals, and repeated high-weight phrases from the JD text using the LLM.
3. **ATS Compatibility Score (0–100)** — A composite score built from four weighted sub-scores: Parseability, Keyword Match, Content Quality, Formatting Compliance (full breakdown in Section 10).
4. **Section-by-Section Diagnostic Report** — Flags issues per section (e.g., "Skills section has 6 keywords, JD implies 14 relevant skills"; "Experience bullets use passive voice in 4 of 9 lines").
5. **Keyword Gap Analysis Table** — Side-by-side table: JD keyword → present in resume? → exact match / semantic match / missing → suggested placement.
6. **Semantic (Contextual) Matching** — Uses AI embeddings, not just string match, so related terms ("Customer Success Manager" ≈ "Client Relations Manager") are credited at a lower confidence weight instead of being marked as a hard miss.
7. **Anti-Keyword-Stuffing Guardrail** — Flags unnatural keyword density/repetition, since 2026-era ATS platforms (e.g., Workday's algorithm update) actively penalize stuffing rather than rewarding it.
8. **Rewrite Suggestions (AI-generated)** — For each flagged bullet, the AI proposes 1–2 rewritten versions that add the missing keyword in natural context with a quantifiable result, in the STAR/achievement format.
9. **Formatting & File-Integrity Checker** — Flags hidden/white text, non-parseable fonts, missing alt text on section headers, tables/columns, incorrect file naming, and multi-page issues for the candidate's experience level.
10. **Score History & Version Tracking** — Every re-upload/edit is stored; a chart shows score progression over time and per job application.
11. **Downloadable/Shareable Report** — Export the diagnostic report as PDF; shareable link for career coaches to send to clients.
12. **Account & Multi-Resume Management** — Users can store multiple resume versions (e.g., "Data-focused," "PM-focused") and multiple target JDs, and re-run scoring on any combination.

---

## 5. User Flow

1. User lands on homepage → clicks "Check My Resume."
2. Uploads resume file (drag-and-drop or file picker) → optional: pastes job description or job posting URL.
3. Backend parses file → extracts text + structure → sends to AI pipeline for analysis.
4. Loading state (progress indicator: "Parsing resume… Extracting keywords… Scoring…").
5. Results dashboard renders:
   - Big score number (0–100) with color band (red < 50, amber 50–74, green 75–89, dark green 90+).
   - Score breakdown radar/bar chart (Parseability / Keyword Match / Content Quality / Formatting).
   - Prioritized issues list ("Fix these 3 things first for the biggest score jump").
   - Full keyword gap table.
   - Section-by-section detail (expandable accordions).
6. User edits resume externally (or, v1.5: inline text editor in-app) → re-uploads → sees updated score and diff vs. previous version.
7. User signs up / logs in to save history (auth wall can be after first free scan to reduce friction).

---

## 6. System Architecture

```
┌──────────────────┐        ┌──────────────────────┐        ┌────────────────────┐
│   Frontend (SPA)  │◄──────►│  Express.js REST API  │◄──────►│   PostgreSQL +      │
│  React / Vite     │  HTTPS │  (Node.js)            │        │   pgvector           │
│  Tailwind CSS     │        │  - Auth (JWT)         │        │  (users, resumes,    │
└──────────────────┘        │  - Upload handling    │        │   scores, jobs,      │
                              │  - Score orchestration│        │   embeddings)        │
                              └─────────┬─────────────┘        └────────────────────┘
                                        │
                    ┌───────────────────┼────────────────────────┐
                    ▼                   ▼                        ▼
        ┌───────────────────┐ ┌──────────────────┐   ┌────────────────────────┐
        │ File Parsing Layer │ │  AI/LLM Service    │   │  Job Queue (BullMQ +    │
        │ pdf-parse / mammoth│ │  Claude API /       │   │  Redis) for async       │
        │ (PDF/DOCX → text)  │ │  OpenAI embeddings  │   │  long-running scoring   │
        └───────────────────┘ └──────────────────┘   └────────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────────┐
                              │ Object Storage (S3 /  │
                              │ Cloudflare R2)         │
                              │ original resume files │
                              └──────────────────────┘
```

**Flow summary:** Client uploads file → Express receives multipart upload (Multer) → file streamed to object storage → text extracted server-side → job pushed to a Redis/BullMQ queue → worker calls the AI service (LLM for content/structure analysis + embeddings for semantic keyword matching) → results + score written to PostgreSQL → client polls or receives a WebSocket/SSE push → dashboard renders.

Full database and AI tool selection/rationale lives in `02_DATABASE_AI_TECHSTACK.md`.

---

## 7. Tech Stack Summary

| Layer | Technology | Why |
|---|---|---|
| Backend runtime | Node.js (LTS) | User-specified; excellent async I/O for file/AI I/O-bound workloads |
| Backend framework | Express.js | User-specified; minimal, well-documented, huge middleware ecosystem |
| Language | JavaScript (ES2022+), optionally migrate to TypeScript in v1.5 | User-specified for v1; TS recommended once the API surface stabilizes |
| Frontend framework | React 18 + Vite | Fast dev server, component reuse for dashboard widgets/charts |
| Styling | Tailwind CSS | Rapid, consistent UI; pairs well with component libraries |
| Database | PostgreSQL 16 + `pgvector` extension | Relational integrity for users/resumes/scores AND native vector similarity search in one system — see file 2 |
| Cache/Queue | Redis + BullMQ | Async job processing for AI calls so uploads don't block the HTTP response |
| File parsing | `pdf-parse`, `mammoth` (docx→text), `multer` (upload handling) | Mature, actively maintained Node libraries |
| AI — text/content analysis | Claude API (Anthropic) or OpenAI GPT-4.1/4o | Structured JSON output, strong instruction-following for rewrite suggestions |
| AI — semantic matching | OpenAI `text-embedding-3-small/large` or Voyage AI embeddings | Vector embeddings for keyword/skill semantic similarity |
| Auth | JWT + bcrypt, optional OAuth (Google) | Stateless auth, simple to scale horizontally |
| File storage | AWS S3 or Cloudflare R2 | Durable storage for original uploaded files |
| Hosting | Render / Railway / Fly.io (API), Vercel/Netlify (frontend) | Fast to deploy for MVP; can migrate to AWS/GCP later |
| Testing | Jest + Supertest | Standard Node/Express testing stack |
| CI/CD | GitHub Actions | Free, integrates with any of the above hosts |

---

## 8. File / Folder Structure

```
resume-ats-checker/
├── AGENTS.md                     # Antigravity/agent instructions (see prompt section)
├── README.md
├── .env.example
├── .gitignore
├── package.json
│
├── client/                       # React frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── upload/
│   │   │   │   ├── FileDropzone.jsx
│   │   │   │   └── JobDescriptionInput.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── ScoreGauge.jsx
│   │   │   │   ├── ScoreBreakdownChart.jsx
│   │   │   │   ├── KeywordGapTable.jsx
│   │   │   │   ├── IssuesList.jsx
│   │   │   │   └── SectionAccordion.jsx
│   │   │   ├── history/
│   │   │   │   └── ScoreHistoryChart.jsx
│   │   │   └── common/
│   │   │       ├── Navbar.jsx
│   │   │       ├── Button.jsx
│   │   │       └── Loader.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Results.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── hooks/
│   │   │   └── useResumeScore.js
│   │   ├── services/
│   │   │   └── api.js            # axios instance + API calls
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                       # Express backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # PostgreSQL connection (pg / Prisma)
│   │   │   ├── redis.js
│   │   │   └── env.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── resumeController.js
│   │   │   ├── scoreController.js
│   │   │   └── jobController.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── resumeRoutes.js
│   │   │   ├── scoreRoutes.js
│   │   │   └── index.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification
│   │   │   ├── upload.js          # Multer config
│   │   │   ├── errorHandler.js
│   │   │   └── rateLimiter.js
│   │   ├── services/
│   │   │   ├── parsing/
│   │   │   │   ├── pdfParser.js
│   │   │   │   ├── docxParser.js
│   │   │   │   └── sectionDetector.js   # splits raw text into resume sections
│   │   │   ├── ai/
│   │   │   │   ├── llmClient.js         # wraps Claude/OpenAI SDK calls
│   │   │   │   ├── embeddingClient.js   # wraps embedding API calls
│   │   │   │   ├── promptTemplates.js   # all prompt strings, versioned
│   │   │   │   └── responseSchemas.js   # JSON schema validation for AI output
│   │   │   ├── scoring/
│   │   │   │   ├── parseabilityScore.js
│   │   │   │   ├── keywordMatchScore.js
│   │   │   │   ├── contentQualityScore.js
│   │   │   │   ├── formattingScore.js
│   │   │   │   └── scoreAggregator.js   # combines sub-scores into final 0-100
│   │   │   └── storage/
│   │   │       └── s3Client.js
│   │   ├── models/                      # Prisma schema OR Sequelize models
│   │   │   ├── User.js
│   │   │   ├── Resume.js
│   │   │   ├── JobDescription.js
│   │   │   ├── ScoreResult.js
│   │   │   └── KeywordMatch.js
│   │   ├── queues/
│   │   │   ├── scoringQueue.js
│   │   │   └── scoringWorker.js
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   └── validators.js
│   │   └── app.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── server.js
│   └── package.json
│
├── docs/
│   ├── 01_PROJECT_DESCRIPTION.md         # this file
│   ├── 02_DATABASE_AI_TECHSTACK.md
│   └── api-spec.md
│
└── docker-compose.yml            # local Postgres + Redis for dev
```

---

## 9. API Endpoint Specification

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/resumes/upload` | Upload resume file (multipart), returns `resumeId` |
| POST | `/api/jobs` | Save a job description (text or URL) |
| POST | `/api/scores` | Kick off scoring job: `{ resumeId, jobId? }` → returns `scoreJobId` (async) |
| GET | `/api/scores/:scoreJobId` | Poll status / get completed result |
| GET | `/api/resumes/:id/history` | Get score history for a resume |
| GET | `/api/scores/:id/report.pdf` | Download report as PDF |
| DELETE | `/api/resumes/:id` | Delete a stored resume |

---

## 10. ATS Scoring Algorithm (Explained in Detail)

The final score is a weighted composite of four sub-scores, reflecting how real-world ATS platforms actually evaluate resumes in 2026 (parsing first, then keyword/context matching, with formatting compliance gating the whole pipeline):

| Sub-score | Weight | What it measures |
|---|---|---|
| **Parseability** | 30% | Can a machine parser correctly extract text, section headers, dates, and job titles? Penalizes multi-column layouts, tables, text boxes, images-as-text, unusual fonts, missing standard section headers. |
| **Keyword Match** | 35% | Exact-match and semantic-match coverage of must-have and nice-to-have terms extracted from the JD. Includes location-weighting (title/summary/first bullet > buried in a paragraph) and a stuffing penalty for unnatural repetition. |
| **Content Quality** | 25% | Use of quantified achievements (numbers, %, $), strong action verbs, STAR-format bullets, consistent tense, appropriate resume length for experience level. |
| **Formatting Compliance** | 10% | File type (PDF/DOCX preferred over image-based PDF), standard fonts (10–12pt Arial/Calibri/Times New Roman class), consistent date formats, no hidden/white text. |

**Score bands shown to the user:**
- 0–49: High risk of automatic rejection by ATS parsing failure.
- 50–74: Parses correctly but weak keyword/content match — needs targeted work.
- 75–89: Competitive; a few specific fixes to reach top tier.
- 90–100: Excellent — resume is highly likely to clear ATS screening and reach a human recruiter.

**Path to 90+ (what the AI recommends, in priority order):**
1. Fix any hard parseability blockers first (these can cap the score regardless of content — a resume that fails to parse cannot score above ~60 even with perfect keywords).
2. Close "must-have" keyword gaps using the JD's exact phrasing (not synonyms) in the Skills section and at least once in an Experience bullet.
3. Rewrite weak bullets to include a quantified outcome (the single highest-leverage content fix).
4. Balance keyword density — remove any term appearing more than ~4–5 times unless the JD repeats it that often; over-repetition is now flagged as manipulation by modern ATS.
5. Verify formatting compliance items (fonts, single column, standard headers, correct file type).

---

## 11. Non-Functional Requirements

1. **Performance:** Full scoring pipeline (upload → score) should complete in under 20 seconds for a 2-page resume under normal load.
2. **Security:** All file uploads virus-scanned or type/size validated (max 5MB, PDF/DOCX/TXT only); resumes are PII — encrypt at rest (S3 SSE) and in transit (HTTPS everywhere); JWT with short expiry + refresh tokens.
3. **Privacy:** Clear data-retention policy; user can delete their resume and all derived data (GDPR-style right to erasure).
4. **Scalability:** Scoring is queue-based (BullMQ) so traffic spikes don't block the API; horizontally scalable workers.
5. **Reliability:** AI API calls wrapped with retry/backoff and a fallback (e.g., if Claude API times out, retry once, then degrade gracefully with a "partial results" state rather than a hard failure).
6. **Cost control:** Cache embeddings per resume version (don't re-embed unchanged text); track AI token usage per request for cost monitoring.
7. **Accessibility:** Frontend meets WCAG 2.1 AA (contrast, keyboard navigation, screen-reader labels) — ironic but important given the product's own subject matter.
8. **Observability:** Structured logging (Winston/Pino), request tracing, and an admin view of AI call latency/error rate.

---

## 12. Development Phases / Milestones

| Phase | Scope |
|---|---|
| **Phase 0 — Setup** | Repo scaffold, Docker Compose (Postgres+Redis), CI pipeline, env config |
| **Phase 1 — Core Upload & Parsing** | File upload, text extraction, section detection, store in DB |
| **Phase 2 — Scoring Engine v1** | Rule-based Parseability + Formatting scores (no AI yet) |
| **Phase 3 — AI Integration** | LLM content analysis, embedding-based keyword matching, Keyword Match + Content Quality scores |
| **Phase 4 — Results Dashboard** | Full frontend dashboard, charts, keyword gap table, rewrite suggestions UI |
| **Phase 5 — Accounts & History** | Auth, multi-resume storage, score history/versioning |
| **Phase 6 — Polish & Launch** | PDF export, rate limiting, error states, accessibility pass, deploy |
| **Phase 7 (v2 candidates)** | Resume builder/editor, cover letter generator, recruiter/B2B mode, browser extension |

---

## 13. Success Metrics

1. Average time from upload to score displayed (target: < 20s).
2. % of users who re-upload a revised resume after seeing their first score (engagement proxy).
3. Average score improvement between first and last upload per user.
4. AI cost per scoring request (track and optimize).
5. Parse failure rate (resumes that error out during extraction) — target < 2%.

---

## 14. Sources & References

- ATS Resume Best Practices 2026, Resume Optimizer Pro — https://resumeoptimizerpro.com/blog/ats-friendly-resume-tips
- ATS Resume Keywords: Ultimate Guide 2026, StylingCV — https://stylingcv.com/blog/ats-resume-keywords-ultimate-guide-2026/
- ATS Resume Keywords 2026 — Complete Optimization Guide, PassTheScan — https://www.passthescan.com/blog/ats-resume-keywords-2026-complete-guide
- ATS Optimization Hub 2026, ResumeAdapter — https://www.resumeadapter.com/blog/ats-optimization-hub
- The Truth About Resume Keywords and How ATS Actually Parses Your CV, SimpleCVBuilder — https://www.simplecvbuilder.com/blog/resume-keywords-ats-parsing
- ATS-Friendly Resume Guide 2026, OwlApply — https://owlapply.com/en/blog/ats-friendly-resume-guide-2026-format-keywords-score-and-fixes

*(See `02_DATABASE_AI_TECHSTACK.md` for sources on database/AI tool selection.)*
