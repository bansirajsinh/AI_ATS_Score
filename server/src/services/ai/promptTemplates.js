/**
 * promptTemplates.js — All LLM prompt strings, versioned.
 *
 * IMPORTANT: Do NOT inline prompts in controllers or services.
 * All prompt strings must live in this file for auditability and versioning.
 */

const PROMPT_VERSION = '1.0.0';

const RESUME_ANALYSIS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume analysis engine used by career coaches and hiring professionals. Your job is to provide precise, actionable, data-driven feedback.

You MUST respond ONLY with valid JSON matching the exact schema specified. Do not include any text outside the JSON object. Do not wrap in markdown code fences.`;

const RESUME_ANALYSIS_USER_PROMPT = (resumeText, jdText) => {
  const jdSection = jdText
    ? `JOB DESCRIPTION:\n${jdText}\n\n`
    : 'No specific job description provided. Analyze the resume for general ATS best practices and content quality.\n\n';

  return `${jdSection}RESUME TEXT:
${resumeText}

Analyze this resume and return a JSON object with EXACTLY this structure:
{
  "must_have_keywords": ["string array of critical keywords/skills from the JD that the resume MUST contain"],
  "nice_to_have_keywords": ["string array of secondary/preferred keywords from the JD"],
  "weak_bullets": [
    {
      "original": "the exact original bullet text",
      "section": "which resume section this bullet is in",
      "issue": "specific explanation of why this bullet is weak",
      "rewrite_suggestions": ["1-2 improved versions using STAR format with quantified results"]
    }
  ],
  "strong_bullets": ["array of bullets that are already well-written"],
  "keyword_stuffing_flags": ["any terms that appear unnaturally repeated"],
  "content_quality_score": 75,
  "content_quality_reasoning": "1-2 sentence justification for the content quality score",
  "action_verb_analysis": {
    "strong_verbs": ["list of strong action verbs used"],
    "weak_verbs": ["list of weak/passive verbs that should be replaced"],
    "missing_verbs": ["recommended action verbs not currently used"]
  },
  "quantification": {
    "quantified_bullets": 3,
    "total_bullets": 10,
    "percentage": 30
  },
  "overall_feedback": "2-3 sentence summary of the resume's biggest strengths and weaknesses"
}`;
};

const JD_KEYWORD_EXTRACTION_SYSTEM_PROMPT = `You are a hiring manager and ATS keyword extraction specialist. Extract structured keyword data from job descriptions with precision.

You MUST respond ONLY with valid JSON. No text outside the JSON.`;

const JD_KEYWORD_EXTRACTION_USER_PROMPT = (jdText) => `Analyze this job description and extract keywords:

JOB DESCRIPTION:
${jdText}

Return a JSON object with EXACTLY this structure:
{
  "must_have_keywords": ["required skills, qualifications, and tools explicitly stated"],
  "nice_to_have_keywords": ["preferred/bonus skills and qualifications"],
  "seniority_level": "entry|mid|senior|lead|executive",
  "role_category": "engineering|product|design|marketing|sales|operations|other",
  "high_weight_phrases": ["phrases repeated or emphasized multiple times in the JD"],
  "minimum_experience_years": null or number,
  "education_requirements": ["required degrees or certifications"]
}`;

module.exports = {
  PROMPT_VERSION,
  RESUME_ANALYSIS_SYSTEM_PROMPT,
  RESUME_ANALYSIS_USER_PROMPT,
  JD_KEYWORD_EXTRACTION_SYSTEM_PROMPT,
  JD_KEYWORD_EXTRACTION_USER_PROMPT,
};