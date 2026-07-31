# Tools Setup Guide — AI Resume ATS Score Checker

**Purpose of this file:** A step-by-step, one-time environment setup checklist. Complete every section before any code is written. This file assumes Windows, macOS, or Linux and calls out differences where they matter.

**Related files:** `01_PROJECT_DESCRIPTION.md` (what we're building), `02_DATABASE_AI_TECHSTACK.md` (why each tool was chosen).

---

## 1. Setup Checklist Overview

| # | Tool | Purpose | Required before |
|---|---|---|---|
| 1 | Node.js 24 (Active LTS) + npm | Runs the Express backend and the Vite/React frontend | Any code |
| 2 | Git | Version control | Any code |
| 3 | Antigravity IDE (or VS Code) | Development environment / AI agent | Any code |
| 4 | Docker Desktop | Runs local PostgreSQL + Redis without manual installs | Database work |
| 5 | PostgreSQL 16 + `pgvector` extension | Primary database (relational + vector search) | Database work |
| 6 | Redis | Job queue (BullMQ) + caching | AI pipeline work |
| 7 | Anthropic (Claude) API key | LLM content analysis + rewrite suggestions | AI features |
| 8 | OpenAI API key | Embeddings for semantic keyword matching | AI features |
| 9 | Cloudflare R2 (or AWS S3) account | Object storage for uploaded resume files | Upload feature |
| 10 | Postman or Insomnia (optional) | Manual API testing | Backend testing |
| 11 | GitHub account + repo | Source control hosting + CI/CD | Deployment |
| 12 | Prisma CLI | Database schema migrations/ORM | Database work |

---

## 2. Install Node.js and npm

**Recommended version:** Node.js **24.x (Active LTS)** as of mid-2026. Avoid Node 26 for now — it is still on the "Current" track and only enters LTS in October 2026; use it for experimentation only, not this project.

| OS | Steps |
|---|---|
| Windows | Download the Node 24 LTS installer from nodejs.org → run the `.msi` → keep default options (includes npm) → restart terminal |
| macOS | `brew install node@24` then `brew link node@24 --force` (Homebrew required) |
| Linux (Debian/Ubuntu) | Use NodeSource: `curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -` then `sudo apt install -y nodejs` |
| Any OS (recommended) | Use **nvm** (Node Version Manager) instead of a direct install, so you can switch Node versions per project: `nvm install 24 && nvm use 24` |

**Verify:**
```bash
node -v      # should print v24.x.x
npm -v       # should print 10.x.x or higher
```

---

## 3. Install Git

| OS | Steps |
|---|---|
| Windows | Download from git-scm.com, run installer, keep defaults |
| macOS | `brew install git` (or it ships with Xcode Command Line Tools: `xcode-select --install`) |
| Linux | `sudo apt install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora) |

**Verify:**
```bash
git --version
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## 4. Install Antigravity IDE

1. Go to `antigravity.google` and download the installer for your OS.
2. Sign in with a Google account (personal Gmail works for the free preview tier).
3. On first launch, choose an autonomy profile:
   - **Review-driven development** (recommended for this project) — the agent pauses for approval at meaningful checkpoints instead of running fully autonomously.
4. Open the project folder once it exists (Section 8 below creates it).
5. Antigravity reads a root-level `AGENTS.md` file (defined during the scaffolding step) before any agent starts work — this is where project-wide rules live (coding standards, "don't write code yet," etc.).

*(If you prefer VS Code instead of Antigravity for parts of the work, install it from code.visualstudio.com and add the ESLint, Prettier, and Prisma extensions.)*

---

## 5. Install Docker Desktop

Docker lets you run PostgreSQL and Redis locally without installing them directly on your machine — this keeps your local environment identical to what teammates and CI will use.

| OS | Steps |
|---|---|
| Windows | Download Docker Desktop from docker.com → enable WSL2 backend during install → restart |
| macOS | Download Docker Desktop for Mac (Apple Silicon or Intel build, matching your chip) |
| Linux | Install Docker Engine + Docker Compose plugin per docs.docker.com for your distro |

**Verify:**
```bash
docker --version
docker compose version
```

---

## 6. Set Up PostgreSQL + pgvector (via Docker)

You do **not** need to install PostgreSQL directly — a Docker image with `pgvector` pre-installed is used instead.

**`docker-compose.yml`** (created during scaffolding — this section just explains what it does):
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: always
    environment:
      POSTGRES_USER: resumeapp
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: resume_ats_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

**Start it:**
```bash
docker compose up -d
```

**Verify Postgres is reachable and enable the extension:**
```bash
docker exec -it <postgres-container-name> psql -U resumeapp -d resume_ats_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Cloud alternative for later (no local Docker needed):** Create a free project on **Supabase** (supabase.com) or **Neon** (neon.tech) — both provide managed Postgres with `pgvector` already enabled, plus a connection string you drop into `.env`.

---

## 7. Redis

Already running via the `docker-compose.yml` above (port 6379). No separate install needed for local dev. For production, use a managed Redis (Upstash, Railway Redis add-on, or AWS ElastiCache).

**Verify:**
```bash
docker exec -it <redis-container-name> redis-cli ping
# should return: PONG
```

---

## 8. Get an Anthropic (Claude) API Key

1. Go to console.anthropic.com and create an account.
2. Navigate to **API Keys** → **Create Key**.
3. Copy the key immediately (it's shown only once).
4. Add billing details under **Plans & Billing** (required before the key can make live calls beyond any trial credits).
5. Store the key as `ANTHROPIC_API_KEY` in your local `.env` file — **never commit this to Git.**

---

## 9. Get an OpenAI API Key (for Embeddings)

1. Go to platform.openai.com and create/sign in to an account.
2. Navigate to **API Keys** → **Create new secret key**.
3. Copy the key immediately.
4. Add a payment method under **Billing**.
5. Store the key as `OPENAI_API_KEY` in your local `.env` file.

---

## 10. Set Up Object Storage (Cloudflare R2 recommended)

| Step | Cloudflare R2 | AWS S3 (alternative) |
|---|---|---|
| 1 | Create a Cloudflare account → go to **R2** in the dashboard | Create an AWS account → go to **S3** console |
| 2 | Create a bucket, e.g. `resume-ats-uploads` | Create a bucket, e.g. `resume-ats-uploads` |
| 3 | Go to **Manage R2 API Tokens** → create a token with Object Read/Write | Create an IAM user with `s3:PutObject`/`s3:GetObject` policy |
| 4 | Copy Account ID, Access Key ID, Secret Access Key | Copy Access Key ID, Secret Access Key, region |
| 5 | Store as `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` in `.env` | Store as `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME` in `.env` |

R2 is recommended for this project because it has no egress fees, which matters once users start downloading/re-viewing their uploaded resumes.

---

## 11. Install Postman or Insomnia (Optional but Recommended)

Used to manually test backend API endpoints before the frontend is built. Download from postman.com or insomnia.rest. No account required for local use.

---

## 12. Create a GitHub Repository

1. Create a new empty repository on github.com (no README/license auto-generated, so it stays empty for the scaffolding step).
2. Locally: `git init`, `git remote add origin <repo-url>`.
3. Set up a `.gitignore` (Node template) **before the first commit** so `node_modules/`, `.env`, and build output are never tracked.
4. (Optional, recommended) Add a GitHub Actions workflow later for CI — covered in the project description file's Phase 6.

---

## 13. Install Prisma CLI

Prisma is the ORM used to manage the PostgreSQL schema and migrations.

```bash
npm install -D prisma
npx prisma init
```

This creates a `prisma/schema.prisma` file and a `.env` entry for `DATABASE_URL`. The actual schema content is defined in `02_DATABASE_AI_TECHSTACK.md`, section 2.2 — do not write it yet at this setup stage.

---

## 14. Environment Variables Reference (`.env.example`)

Create this file in the project root once folders exist (do not put real secrets in `.env.example` — it's a template committed to Git; the real `.env` is git-ignored):

```
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://resumeapp:devpassword@localhost:5432/resume_ats_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d

# AI Providers
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=resume-ats-uploads

# Frontend
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 15. Final Verification Checklist

Run through this before writing any application code:

| # | Check | Command | Expected result |
|---|---|---|---|
| 1 | Node installed | `node -v` | v24.x.x |
| 2 | npm installed | `npm -v` | 10.x or higher |
| 3 | Git installed | `git --version` | version output, no error |
| 4 | Docker running | `docker --version` | version output, no error |
| 5 | Containers up | `docker compose ps` | postgres and redis both "running"/"healthy" |
| 6 | Postgres reachable | `docker exec -it <container> psql -U resumeapp -d resume_ats_dev -c "SELECT 1;"` | returns `1` |
| 7 | pgvector enabled | `... -c "SELECT extname FROM pg_extension;"` | `vector` listed |
| 8 | Redis reachable | `docker exec -it <container> redis-cli ping` | `PONG` |
| 9 | Anthropic key works | Test call in Postman to `https://api.anthropic.com/v1/messages` with your key | 200 response, not 401 |
| 10 | OpenAI key works | Test call in Postman to `https://api.openai.com/v1/embeddings` with your key | 200 response, not 401 |
| 11 | R2/S3 bucket exists | Check dashboard | Bucket visible, empty |
| 12 | GitHub repo linked | `git remote -v` | origin URL shown |

Once every row above is confirmed, move on to the file/folder scaffolding step (see the "create structure only" prompt for Antigravity).

---

## 16. Sources & References

- Node.js Release Schedule, OpenJS Foundation / nodejs.org — https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule
- Node.js End of Life / current LTS status — https://endoflife.date/nodejs
- `pgvector/pgvector` Docker image documentation — https://hub.docker.com/r/pgvector/pgvector
- Docker Desktop installation docs — https://docs.docker.com/desktop/
- Google Antigravity IDE setup guide — https://petronellatech.com/blog/google-antigravity-ide-setup-guide-2026/
- Anthropic Console (API key management) — https://console.anthropic.com
- OpenAI Platform (API key management) — https://platform.openai.com
- Cloudflare R2 documentation — https://developers.cloudflare.com/r2/
