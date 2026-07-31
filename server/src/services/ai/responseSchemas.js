const { z } = require('zod');

/**
 * JSON schema validation for AI response payloads.
 * Used to validate that LLM output matches expected structure before use.
 */

const resumeAnalysisSchema = z.object({
  must_have_keywords: z.array(z.string()).default([]),
  nice_to_have_keywords: z.array(z.string()).default([]),
  weak_bullets: z.array(z.object({
    original: z.string(),
    section: z.string().optional().default('unknown'),
    issue: z.string(),
    rewrite_suggestions: z.array(z.string()).default([]),
  })).default([]),
  strong_bullets: z.array(z.string()).default([]),
  keyword_stuffing_flags: z.array(z.string()).default([]),
  content_quality_score: z.number().min(0).max(100).default(50),
  content_quality_reasoning: z.string().default(''),
  action_verb_analysis: z.object({
    strong_verbs: z.array(z.string()).default([]),
    weak_verbs: z.array(z.string()).default([]),
    missing_verbs: z.array(z.string()).default([]),
  }).default({}),
  quantification: z.object({
    quantified_bullets: z.number().default(0),
    total_bullets: z.number().default(0),
    percentage: z.number().default(0),
  }).default({}),
  overall_feedback: z.string().default(''),
});

const jdKeywordExtractionSchema = z.object({
  must_have_keywords: z.array(z.string()).default([]),
  nice_to_have_keywords: z.array(z.string()).default([]),
  seniority_level: z.string().default('mid'),
  role_category: z.string().default('other'),
  high_weight_phrases: z.array(z.string()).default([]),
  minimum_experience_years: z.number().nullable().default(null),
  education_requirements: z.array(z.string()).default([]),
});

module.exports = {
  resumeAnalysisSchema,
  jdKeywordExtractionSchema,
};