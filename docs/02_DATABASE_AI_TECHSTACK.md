# Database & AI Tech Stack — Recommendations and Usage Guide

**Companion file:** `01_PROJECT_DESCRIPTION.md` — read that first for full product/architecture context. This file goes deep on **which database, which AI tools, why, and exactly how to wire them into the Node.js/Express backend**.

---

## 1. Overview of What This App Needs From Its Data Layer

The app has three distinct data needs, and the right tool differs for each:

1. **Relational data** — users, resumes, job descriptions, score results, keyword matches. This needs ACID transactions, joins, and structured queries (e.g., "get all scores for this user, newest first").
2. **Vector/semantic data** — embeddings of resume text and job description text, used to compute similarity between a skill phrase in the resume and a skill phrase in the JD even when the wording differs.
3. **Ephemeral/queue data** — background job state for the async AI scoring pipeline, and caching to avoid re-calling paid AI APIs on unchanged text.

Recommendation: **one primary database (PostgreSQL) that handles both #1 and #2 via the `pgvector` extension, plus Redis for #3.** Details and alternatives below.

---

## 2. Database Recommendation: PostgreSQL + pgvector

### 2.1 Comparison Table

| # | Criterion | PostgreSQL + pgvector | MongoDB | MySQL | Dedicated Vector DB (Pinecone) |
|---|---|---|---|---|---|
| 1 | **Data model fit** | Relational + vector in one engine — ideal since resumes/scores/users are naturally relational | Document model; flexible but joins are awkward for relational reporting (e.g., "all scores per user per job") | Purely relational, no native vector support | Purpose-built for vectors only; still needs a separate relational DB alongside it |
| 2 | **Vector similarity search** | Native via `pgvector` extension (cosine/L2/inner-product distance, HNSW/IVFFlat indexes) | Requires MongoDB Atlas Vector Search (paid tier) or a bolt-on | Not supported natively | Best-in-class, purpose-built |
| 3 | **Transactional integrity (ACID)** | Full ACID — important when writing a score result tied to a resume version | Multi-document transactions supported but not the default mental model | Full ACID | N/A — not a transactional store |
| 4 | **Operational simplicity** | One database to run/monitor/back up for both relational + AI-similarity workloads | One database, but a second system needed for true vector search at scale | Simple, but you'd still need a second vector store | Two systems to operate (Pinecone + your relational DB) |
| 5 | **Cost at MVP scale** | Free (self-hosted) or ~$7–20/mo managed (Supabase/Neon free tiers available) | Similar managed cost (Atlas free tier exists but Vector Search needs a paid cluster) | Free/cheap, but doesn't solve the AI-matching need at all | Free tier available, but adds a second bill and vendor as you scale |
| 6 | **Scale ceiling for this use case** | Comfortably handles tens of millions of vectors with HNSW indexing — far beyond what a resume-checker app needs for years | Scales well for documents; vector search scale depends on Atlas tier | N/A | Scales to billions of vectors — massive overkill for this product |
| 7 | **SQL query power** | Full SQL: joins, window functions, aggregations — e.g., "average score improvement per user this month" is a one-liner | Aggregation pipeline is powerful but has a steeper learning curve for this kind of reporting | Full SQL | No SQL; metadata filtering only, no joins |
| 8 | **Ecosystem/ORM support in Node.js** | Excellent — Prisma, Sequelize, Knex, Drizzle all first-class | Excellent — Mongoose is the de facto standard | Excellent — same ORMs as Postgres | SDK-based, not an ORM concept |
| 9 | **Schema evolution** | Migrations are explicit and safe (Prisma Migrate) — good for a product that will add fields (e.g., new score sub-metrics) over time | Schema-less is flexible early but can get messy as scoring logic grows more structured | Same as Postgres | N/A |
| 10 | **Team learning curve** | Low if the team knows SQL; pgvector adds only a few new SQL functions | Low if team prefers JSON-shaped documents | Low | Requires learning a new query paradigm and a new billing model |
| 11 | **Best production stack (2026 industry data)** | Analysts consistently recommend pgvector as the default choice for RAG/AI workloads under tens of millions of vectors, citing lower operational overhead and full transactional consistency versus a second dedicated store | Strong general-purpose choice, but not purpose-optimized for combining relational + AI-similarity needs | Not suited to the AI-matching requirement at all | Excels only once you clear ~50–100M vectors, which this product will not reach |
| 12 | **Final verdict for this project** | ✅ **Recommended.** One database, ACID-safe, native vector search, scales far past what this app needs, cheapest to operate long-term | Viable alternative if the team strongly prefers document modeling, but adds Atlas Vector Search cost/complexity | ❌ Not recommended — no path to semantic matching | ❌ Not recommended for MVP — adds a second system and bill before it's needed |

**Bottom line recommendation:** Use **PostgreSQL 16 with the `pgvector` extension** as your single database. Host it on **Supabase** or **Neon** for MVP (both have generous free tiers, built-in connection pooling, and pgvector pre-enabled), then move to a self-managed instance (AWS RDS / Google Cloud SQL) once you need more control or scale.

### 2.2 How to Set It Up

```bash
# Local dev via Docker (add to docker-compose.yml)
# postgres image with pgvector pre-installed:
docker run --name resume-db -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 -d pgvector/pgvector:pg16
```

```sql
-- Run once per database
CREATE EXTENSION IF NOT EXISTS vector;

-- Core tables (simplified — full schema goes in prisma/schema.prisma)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  file_url TEXT NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE resume_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  section TEXT NOT NULL,           -- 'skills', 'experience_bullet_3', etc.
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL, -- matches OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  extracted_keywords JSONB,        -- { must_have: [...], nice_to_have: [...] }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  job_id UUID REFERENCES job_descriptions(id),
  overall_score NUMERIC(5,2),
  parseability_score NUMERIC(5,2),
  keyword_score NUMERIC(5,2),
  content_score NUMERIC(5,2),
  formatting_score NUMERIC(5,2),
  report JSONB,                    -- full detailed diagnostic payload
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vector similarity index (HNSW = fast approximate nearest-neighbor search)
CREATE INDEX ON resume_embeddings USING hnsw (embedding vector_cosine_ops);
```

### 2.3 How to Query Vector Similarity (Node.js + `pg`)

```javascript
// server/src/services/scoring/keywordMatchScore.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findClosestResumeMatch(jdKeywordEmbedding, resumeId) {
  const query = `
    SELECT content, section, 1 - (embedding <=> $1) AS similarity
    FROM resume_embeddings
    WHERE resume_id = $2
    ORDER BY embedding <=> $1
    LIMIT 3;
  `;
  // '<=>' is the pgvector cosine distance operator
  const { rows } = await pool.query(query, [jdKeywordEmbedding, resumeId]);
  return rows; // top 3 closest resume phrases + similarity score (0-1)
}

module.exports = { findClosestResumeMatch };
```

A similarity score above ~0.80 is treated as a strong semantic match, 0.65–0.80 as a partial/related match (credited at reduced weight), and below 0.65 as effectively no match — these thresholds should be tuned against real resume/JD pairs during development.

---

## 3. Redis (Caching + Job Queue)

**Why it's needed alongside Postgres:** AI API calls are the slowest and most expensive part of the pipeline. Redis serves two jobs here:
1. **BullMQ queue** — the HTTP upload request returns immediately with a `scoreJobId`; a background worker (also Node.js) picks up the job, calls the AI APIs, writes the result to Postgres. This keeps the API responsive and lets you scale workers independently of the web server.
2. **Cache layer** — cache embeddings and LLM analysis results keyed by a hash of the resume text, so re-scoring the *same* unchanged resume against a *new* job description doesn't re-embed the resume content (only the new JD needs embedding), cutting AI cost significantly.

```javascript
// server/src/queues/scoringQueue.js
const { Queue } = require('bullmq');
const connection = { host: process.env.REDIS_HOST, port: 6379 };

const scoringQueue = new Queue('resume-scoring', { connection });

async function enqueueScoringJob(resumeId, jobId) {
  return scoringQueue.add('score-resume', { resumeId, jobId }, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 3000 },
  });
}

module.exports = { scoringQueue, enqueueScoringJob };
```

---

## 4. AI / LLM Tool Recommendation

### 4.1 Comparison Table

| # | Criterion | Anthropic Claude API | OpenAI GPT-4.1 / GPT-4o | Open-source local LLM (Llama 3, Mistral) | Google Gemini API |
|---|---|---|---|---|---|
| 1 | **Instruction-following for structured JSON output** | Excellent — strong at following strict output schemas, which this app needs for parsing scores/reports reliably | Excellent — native "JSON mode" / structured outputs | Good but inconsistent without fine-tuning; needs stricter prompt engineering and output validation | Very good, improving fast |
| 2 | **Long-context resume + JD analysis** | Very large context window, handles full resume + full JD + prior version comparison in one call | Large context window, comparable | Depends on model/quantization; smaller context typically | Very large context window |
| 3 | **Reasoning quality for nuanced content critique** (e.g., "this bullet is weak because it lacks a quantified outcome") | Strong — well suited to qualitative writing feedback | Strong — comparable quality | Weaker without significant prompt tuning/fine-tuning | Strong |
| 4 | **Cost per request (typical resume + JD analysis call)** | Moderate; scales with resume length | Moderate; comparable | Free to run, but requires your own GPU infra (real cost is infrastructure, not per-token) | Moderate; often competitively priced |
| 5 | **Latency** | Fast, typically a few seconds for this payload size | Fast, comparable | Depends heavily on hardware; can be slow on CPU-only or under-provisioned GPU | Fast |
| 6 | **Data privacy control** | Standard API data-handling terms; enterprise/zero-retention options available | Standard API terms; enterprise options available | Full control — nothing leaves your infrastructure, best for sensitive resume PII if that's a hard requirement | Standard API terms |
| 7 | **Node.js SDK maturity** | Official, well-documented `@anthropic-ai/sdk` | Official, well-documented `openai` SDK | No single SDK; typically served via Ollama/vLLM + a REST wrapper you build | Official `@google/generative-ai` SDK |
| 8 | **Best for this project's "rewrite suggestion" feature** | Very strong — natural, human-sounding rewrites that avoid sounding robotic/stuffed | Very strong, comparable | Requires more careful prompting to avoid generic or repetitive phrasing | Strong |
| 9 | **Ecosystem for embeddings** | No first-party embedding model — pair with OpenAI or Voyage AI for embeddings | First-party embeddings (`text-embedding-3-small/large`) — one vendor for both LLM + embeddings if you choose OpenAI | Open-source embedding models available (e.g., `bge`, `e5`) — free but you host them | First-party embeddings available |
| 10 | **Vendor lock-in risk** | Low if you abstract the LLM call behind an internal `llmClient.js` interface (recommended regardless of vendor) | Same — low if abstracted | Lowest lock-in, highest operational burden | Low if abstracted |
| 11 | **Recommended role in this project** | Primary LLM for content analysis, JD keyword extraction, and rewrite suggestions | Primary LLM alternative, or use specifically for embeddings even if Claude is your main LLM | Good v2 option once you want to cut per-request AI cost at scale | Solid alternative/secondary provider for redundancy |
| 12 | **Final verdict** | ✅ **Recommended as primary LLM** for content/structure analysis and rewrite generation | ✅ **Recommended for embeddings** (`text-embedding-3-small`) even if Claude is primary LLM — cheap, fast, purpose-built | Consider for v2 cost optimization once volume justifies self-hosting | Good fallback provider for redundancy/multi-provider resilience |

**Recommended combination:** **Claude API (Anthropic)** for the qualitative work — extracting JD requirements, critiquing resume bullets, generating rewrite suggestions, and producing the structured JSON diagnostic report — paired with **OpenAI's `text-embedding-3-small`** purely for generating the vector embeddings that power semantic keyword matching in pgvector. This gives you the strongest reasoning model for the hardest part of the product (feedback quality) while using a cheap, purpose-built embedding model for similarity search.

### 4.2 How to Use Claude API for Resume Content Analysis

```javascript
// server/src/services/ai/llmClient.js
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function analyzeResumeContent(resumeText, jdText) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', // pick current recommended Sonnet-tier model for cost/quality balance
    max_tokens: 2000,
    system: `You are an ATS resume analysis engine. Respond ONLY with valid JSON matching this schema:
{
  "must_have_keywords": string[],
  "nice_to_have_keywords": string[],
  "weak_bullets": [{ "original": string, "issue": string, "rewrite_suggestions": string[] }],
  "keyword_stuffing_flags": string[],
  "content_quality_score": number
}
No prose outside the JSON.`,
    messages: [
      {
        role: 'user',
        content: `JOB DESCRIPTION:\n${jdText}\n\nRESUME TEXT:\n${resumeText}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === 'text')?.text ?? '{}';
  return JSON.parse(text); // wrap in try/catch in production; validate against a JSON schema
}

module.exports = { analyzeResumeContent };
```

### 4.3 How to Use OpenAI Embeddings for Semantic Keyword Matching

```javascript
// server/src/services/ai/embeddingClient.js
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function embedText(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // 1536 dimensions, low cost, strong quality
    input: text,
  });
  return response.data[0].embedding; // float array, store directly in pgvector column
}

module.exports = { embedText };
```

**Pipeline for keyword matching:**
1. Extract must-have/nice-to-have keyword phrases from the JD using Claude (section 4.2).
2. Embed each JD keyword phrase with OpenAI embeddings.
3. Embed each resume section/bullet with the same embedding model (must use the *same* model for both sides of a comparison).
4. Run a pgvector cosine-similarity query (section 2.3) for each JD keyword against the resume's stored embeddings.
5. Classify each JD keyword as: exact match (string match found) > strong semantic match (similarity ≥ 0.80) > partial match (0.65–0.80) > missing (< 0.65).
6. Feed the match results into the Keyword Match sub-score (35% weight — see file 1, section 10).

---

## 5. Resume File Parsing Tools

| # | Tool | Handles | Notes |
|---|---|---|---|
| 1 | `pdf-parse` (v2) | PDF → plain text | Pure TypeScript/Node, no external binary dependency, actively maintained — best default for PDF text extraction |
| 2 | `mammoth` | DOCX → plain text/HTML | The standard, well-maintained choice for `.docx` in Node; preserves some structure (headings) which helps section detection |
| 3 | `pdf2json` | PDF → structured JSON incl. form fields | Useful fallback if you need layout/column detection (helps flag multi-column formatting risk) |
| 4 | `multer` | Multipart file upload handling in Express | Standard middleware; configure with file-size limit (5MB) and MIME-type allowlist |
| 5 | Custom section detector | Splits raw text into Summary/Experience/Skills/Education | Build this yourself with regex + heading heuristics, or ask the LLM to do structural segmentation as part of the Claude call in 4.2 |

Avoid relying on binaries like `pdftotext`/Poppler or `antiword` unless you fully control the deployment environment (they complicate serverless/Docker deployment); pure-JS libraries (`pdf-parse`, `mammoth`) are the safer default for this stack.

---

## 6. File Storage

| # | Option | Recommendation |
|---|---|---|
| 1 | AWS S3 | Industry standard, use if already in AWS ecosystem |
| 2 | Cloudflare R2 | S3-compatible API, no egress fees — cheaper at scale, good default for a bootstrapped MVP |
| 3 | Local disk (dev only) | Fine for local development, never for production |

Store only the original file in object storage; store extracted text and embeddings in Postgres. Never store raw files in the database itself.

---

## 7. Recommended Final Stack Summary

| Concern | Tool |
|---|---|
| Backend framework | Node.js + Express (as specified) |
| Primary database | PostgreSQL 16 + `pgvector` |
| DB host (MVP) | Supabase or Neon (free tier, pgvector pre-enabled) |
| ORM | Prisma (best migration story + pgvector support via raw SQL extensions) |
| Cache / Queue | Redis + BullMQ |
| LLM (content analysis, rewrites) | Claude API (Anthropic) |
| Embeddings (semantic matching) | OpenAI `text-embedding-3-small` |
| PDF parsing | `pdf-parse` |
| DOCX parsing | `mammoth` |
| File upload middleware | `multer` |
| File storage | Cloudflare R2 (or AWS S3) |
| Auth | JWT (`jsonwebtoken`) + `bcrypt` |
| Testing | Jest + Supertest |
| Hosting (MVP) | Railway or Render (API + worker), Vercel (frontend) |

---

## 8. Cost-Control Tips

1. Cache embeddings per resume-version hash; never re-embed unchanged text.
2. Cache JD keyword extraction per unique JD (many users paste the same popular job postings).
3. Use the smaller/cheaper embedding model (`text-embedding-3-small`) — resume/JD phrase matching does not need the largest embedding model.
4. Batch embedding calls (embed all resume bullets in one API call, not one call per bullet).
5. Set a `max_tokens` ceiling on LLM calls and truncate resume input to a reasonable length (most resumes are 1–2 pages; cap input around 4,000 tokens).
6. Track token usage per request in your logs from day one so you can spot cost regressions early.

---

## 9. Sources & References

- pgvector vs Pinecone: Which Vector Database to Choose in 2026, Encore — https://encore.dev/articles/pgvector-vs-pinecone
- Best Vector Databases in 2026: Complete Comparison Guide, Encore — https://encore.dev/articles/best-vector-databases
- Pinecone vs pgvector vs Chroma vs Weaviate (2026), Groovy Web — https://www.groovyweb.co/blog/vector-database-comparison-2026
- Best Vector Databases in 2026: A Complete Comparison Guide, Firecrawl — https://www.firecrawl.dev/blog/best-vector-databases
- Building A Resume Upload And Parsing App With NodeJs And MongoDB, DEV Community — https://dev.to/fredabod/building-a-resume-upload-and-parsing-app-with-nodejs-and-mongodb-1049
- `pdf-parse` package documentation — https://www.npmjs.com/package/pdf-parse
- 7 PDF Parsing Libraries for Extracting Data in Node.js, Strapi — https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025

*(See `01_PROJECT_DESCRIPTION.md` for sources on ATS scoring behavior.)*
