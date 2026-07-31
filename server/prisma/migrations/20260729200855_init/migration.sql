-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "raw_text" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL DEFAULT '',
    "file_hash" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sections" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resume_id" UUID NOT NULL,
    "section" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "raw_text" TEXT NOT NULL,
    "source_url" TEXT,
    "extracted_keywords" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resume_id" UUID NOT NULL,
    "job_id" UUID,
    "overall_score" DECIMAL(5,2),
    "parseability_score" DECIMAL(5,2),
    "keyword_score" DECIMAL(5,2),
    "content_score" DECIMAL(5,2),
    "formatting_score" DECIMAL(5,2),
    "report" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "score_id" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "match_type" TEXT NOT NULL,
    "similarity" DECIMAL(5,4),
    "resume_section" TEXT,
    "suggested_placement" TEXT,

    CONSTRAINT "keyword_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "resumes_user_id_idx" ON "resumes"("user_id");

-- CreateIndex
CREATE INDEX "resumes_created_at_idx" ON "resumes"("created_at" DESC);

-- CreateIndex
CREATE INDEX "resumes_file_hash_idx" ON "resumes"("file_hash");

-- CreateIndex
CREATE INDEX "resume_embeddings_resume_id_idx" ON "resume_embeddings"("resume_id");

-- CreateIndex
CREATE INDEX "job_descriptions_user_id_idx" ON "job_descriptions"("user_id");

-- CreateIndex
CREATE INDEX "scores_resume_id_idx" ON "scores"("resume_id");

-- CreateIndex
CREATE INDEX "scores_job_id_idx" ON "scores"("job_id");

-- CreateIndex
CREATE INDEX "scores_created_at_idx" ON "scores"("created_at" DESC);

-- CreateIndex
CREATE INDEX "scores_status_idx" ON "scores"("status");

-- CreateIndex
CREATE INDEX "keyword_matches_score_id_idx" ON "keyword_matches"("score_id");

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_embeddings" ADD CONSTRAINT "resume_embeddings_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_matches" ADD CONSTRAINT "keyword_matches_score_id_fkey" FOREIGN KEY ("score_id") REFERENCES "scores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
