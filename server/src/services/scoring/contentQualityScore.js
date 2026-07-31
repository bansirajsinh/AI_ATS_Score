const logger = require('../../utils/logger');

/**
 * Content Quality Score (25% weight).
 *
 * Uses LLM analysis results (or rule-based fallback) to evaluate:
 * - Use of quantified achievements (numbers, %, $)
 * - Strong action verbs
 * - STAR-format bullets
 * - Consistent tense
 * - Resume length appropriateness
 *
 * Returns { score: 0-100, issues: Array<{ severity, message, impact }> }
 */
function calculateContentQualityScore(rawText, sections, aiAnalysis = null) {
  let score = 100;
  const issues = [];

  // If we have AI analysis, use its content quality score as the base
  if (aiAnalysis && aiAnalysis.content_quality_score != null) {
    score = aiAnalysis.content_quality_score;

    // Add issues from AI weak bullets
    if (aiAnalysis.weak_bullets && aiAnalysis.weak_bullets.length > 0) {
      for (const bullet of aiAnalysis.weak_bullets) {
        issues.push({
          severity: 'medium',
          message: `Weak bullet: "${bullet.original.slice(0, 80)}..." — ${bullet.issue}`,
          impact: -3,
          rewriteSuggestions: bullet.rewrite_suggestions || [],
        });
      }
    }

    // Keyword stuffing warnings
    if (aiAnalysis.keyword_stuffing_flags && aiAnalysis.keyword_stuffing_flags.length > 0) {
      score -= aiAnalysis.keyword_stuffing_flags.length * 3;
      for (const keyword of aiAnalysis.keyword_stuffing_flags) {
        issues.push({
          severity: 'high',
          message: `Keyword stuffing detected: "${keyword}" appears too many times. Modern ATS systems penalize unnatural repetition.`,
          impact: -3,
        });
      }
    }

    // Action verb analysis
    if (aiAnalysis.action_verb_analysis) {
      const { weak_verbs } = aiAnalysis.action_verb_analysis;
      if (weak_verbs && weak_verbs.length > 3) {
        score -= 5;
        issues.push({
          severity: 'medium',
          message: `${weak_verbs.length} weak/passive verbs found (e.g., "${weak_verbs.slice(0, 3).join('", "')}"). Replace with strong action verbs.`,
          impact: -5,
        });
      }
    }

    // Quantification check
    if (aiAnalysis.quantification) {
      const { percentage } = aiAnalysis.quantification;
      if (percentage < 30) {
        score -= 8;
        issues.push({
          severity: 'high',
          message: `Only ${percentage}% of experience bullets include quantified results. Adding numbers, percentages, and dollar amounts is the highest-leverage content fix.`,
          impact: -8,
        });
      }
    }
  } else {
    // Fallback: rule-based content analysis when AI is unavailable
    score = calculateRuleBasedContentScore(rawText, sections, issues);
  }

  score = Math.max(0, Math.min(100, score));
  logger.debug({ score, issueCount: issues.length }, 'Content quality score calculated');
  return { score, issues };
}

/**
 * Rule-based fallback for content quality when AI is unavailable.
 */
function calculateRuleBasedContentScore(rawText, sections, issues) {
  let score = 70; // Start at a baseline

  // Check for quantified achievements
  const numbers = rawText.match(/\d+%|\$[\d,]+|\d+\+?\s*(years?|months?|clients?|projects?|team|people|users?)/gi) || [];
  if (numbers.length < 3) {
    score -= 15;
    issues.push({
      severity: 'high',
      message: `Only ${numbers.length} quantified achievements found. Add specific numbers (e.g., "Increased sales by 25%", "Managed team of 8").`,
      impact: -15,
    });
  }

  // Check for action verbs at the start of lines
  const experienceText = sections.experience || '';
  const expLines = experienceText.split(/\r?\n/).filter((l) => l.trim().length > 20);
  const strongVerbs = /^(led|managed|developed|implemented|designed|created|built|launched|increased|decreased|improved|optimized|reduced|delivered|achieved|negotiated|streamlined|spearheaded|orchestrated|transformed)/i;
  const weakVerbs = /^(responsible\s+for|helped|assisted|was\s+part\s+of|worked\s+on|involved\s+in|did|made|had|got)/i;

  let strongCount = 0;
  let weakCount = 0;

  for (const line of expLines) {
    const trimmed = line.replace(/^[\u2022\u2023•●○*\->\s]+/, '').trim();
    if (strongVerbs.test(trimmed)) strongCount++;
    if (weakVerbs.test(trimmed)) weakCount++;
  }

  if (weakCount > strongCount && expLines.length > 3) {
    score -= 10;
    issues.push({
      severity: 'medium',
      message: 'More passive/weak verb starts than strong action verb starts in experience bullets. Lead each bullet with a strong action verb.',
      impact: -10,
    });
  }

  // Check experience section exists and has substance
  if (!sections.experience || sections.experience.length < 100) {
    score -= 20;
    issues.push({
      severity: 'high',
      message: 'Experience section is missing or very sparse. This is the most important section for ATS scoring.',
      impact: -20,
    });
  }

  // Check skills section
  if (!sections.skills || sections.skills.length < 30) {
    score -= 10;
    issues.push({
      severity: 'medium',
      message: 'Skills section is missing or too brief. List relevant technical and soft skills.',
      impact: -10,
    });
  }

  return score;
}

module.exports = { calculateContentQualityScore };