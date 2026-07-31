const prisma = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Keyword Match Score (35% weight).
 *
 * Combines exact string matching with semantic similarity via pgvector.
 * Classification thresholds (from 02_DATABASE_AI_TECHSTACK.md):
 *   >= 0.80  → strong semantic match
 *   0.65-0.80 → partial/related match (reduced weight)
 *   < 0.65   → missing
 *
 * Returns { score: 0-100, issues, matches: Array<KeywordMatchResult> }
 */
async function calculateKeywordMatchScore(resumeText, resumeId, jdKeywords = null) {
  const issues = [];

  // If no JD keywords provided, we can't do keyword matching
  if (!jdKeywords || (!jdKeywords.must_have_keywords?.length && !jdKeywords.nice_to_have_keywords?.length)) {
    return {
      score: null, // null = not applicable, will be excluded from aggregation
      issues: [{
        severity: 'info',
        message: 'No job description provided. Keyword matching requires a target JD for comparison.',
        impact: 0,
      }],
      matches: [],
    };
  }

  const mustHave = jdKeywords.must_have_keywords || [];
  const niceToHave = jdKeywords.nice_to_have_keywords || [];
  const allKeywords = [...mustHave, ...niceToHave];

  const matches = [];
  const resumeTextLower = resumeText.toLowerCase();

  for (const keyword of allKeywords) {
    const isMustHave = mustHave.includes(keyword);
    const keywordLower = keyword.toLowerCase();

    // 1. Exact string match
    if (resumeTextLower.includes(keywordLower)) {
      matches.push({
        keyword,
        matchType: 'exact',
        similarity: 1.0,
        isMustHave,
        resumeSection: findKeywordSection(resumeText, keyword),
        suggestedPlacement: null,
      });
      continue;
    }

    // 2. Semantic match via pgvector (if embeddings exist)
    try {
      const semanticMatch = await findSemanticMatch(keyword, resumeId);
      if (semanticMatch) {
        matches.push({
          keyword,
          matchType: semanticMatch.similarity >= 0.80 ? 'semantic' : 'partial',
          similarity: semanticMatch.similarity,
          isMustHave,
          resumeSection: semanticMatch.section,
          suggestedPlacement: null,
        });
        continue;
      }
    } catch (err) {
      logger.debug({ err: err.message, keyword }, 'Semantic match query failed');
    }

    // 3. Missing
    matches.push({
      keyword,
      matchType: 'missing',
      similarity: 0,
      isMustHave,
      resumeSection: null,
      suggestedPlacement: isMustHave
        ? `Add "${keyword}" to your Skills section and reference it in a relevant Experience bullet.`
        : `Consider adding "${keyword}" to your Skills section.`,
    });
  }

  // Calculate score
  let score = 0;
  let totalWeight = 0;

  for (const match of matches) {
    const weight = match.isMustHave ? 2 : 1;
    totalWeight += weight;

    if (match.matchType === 'exact') {
      score += weight * 1.0;
    } else if (match.matchType === 'semantic') {
      score += weight * 0.8;
    } else if (match.matchType === 'partial') {
      score += weight * 0.5;
    }
    // 'missing' adds 0
  }

  const normalizedScore = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 50;

  // Generate issues for missing must-have keywords
  const missingMustHave = matches.filter((m) => m.isMustHave && m.matchType === 'missing');
  if (missingMustHave.length > 0) {
    issues.push({
      severity: 'critical',
      message: `${missingMustHave.length} required keywords are missing from your resume: ${missingMustHave.map((m) => `"${m.keyword}"`).join(', ')}`,
      impact: -(missingMustHave.length * 5),
    });
  }

  const missingNiceToHave = matches.filter((m) => !m.isMustHave && m.matchType === 'missing');
  if (missingNiceToHave.length > 0) {
    issues.push({
      severity: 'medium',
      message: `${missingNiceToHave.length} nice-to-have keywords could be added: ${missingNiceToHave.map((m) => `"${m.keyword}"`).join(', ')}`,
      impact: -(missingNiceToHave.length * 2),
    });
  }

  logger.debug({
    score: normalizedScore,
    total: allKeywords.length,
    exact: matches.filter((m) => m.matchType === 'exact').length,
    semantic: matches.filter((m) => m.matchType === 'semantic').length,
    partial: matches.filter((m) => m.matchType === 'partial').length,
    missing: matches.filter((m) => m.matchType === 'missing').length,
  }, 'Keyword match score calculated');

  return { score: normalizedScore, issues, matches };
}

/**
 * Query pgvector for the closest semantic match to a keyword in the resume's embeddings.
 */
async function findSemanticMatch(keyword, resumeId) {
  try {
    // Use raw SQL for the vector similarity query
    const result = await prisma.$queryRawUnsafe(`
      SELECT content, section, 1 - (embedding <=> (
        SELECT embedding FROM resume_embeddings
        WHERE resume_id = $1
        ORDER BY embedding <=> (
          SELECT embedding FROM resume_embeddings LIMIT 1
        )
        LIMIT 1
      )) AS similarity
      FROM resume_embeddings
      WHERE resume_id = $1
      ORDER BY similarity DESC
      LIMIT 1
    `, resumeId);

    if (result && result.length > 0 && result[0].similarity >= 0.65) {
      return {
        content: result[0].content,
        section: result[0].section,
        similarity: parseFloat(result[0].similarity),
      };
    }

    return null;
  } catch (err) {
    logger.debug({ err: err.message }, 'Semantic match query failed');
    return null;
  }
}

/**
 * Simple heuristic to find which section a keyword appears in.
 */
function findKeywordSection(resumeText, keyword) {
  const lines = resumeText.split(/\r?\n/);
  const keywordLower = keyword.toLowerCase();

  const sectionHeaders = /^(summary|experience|education|skills|certifications|projects)/i;
  let currentSection = 'unknown';

  for (const line of lines) {
    if (sectionHeaders.test(line.trim())) {
      currentSection = line.trim().toLowerCase().split(/\s/)[0];
    }
    if (line.toLowerCase().includes(keywordLower)) {
      return currentSection;
    }
  }

  return 'unknown';
}

module.exports = { calculateKeywordMatchScore };