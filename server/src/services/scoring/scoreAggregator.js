const logger = require('../../utils/logger');

/**
 * Score Aggregator — combines 4 sub-scores into the final 0-100 composite.
 *
 * Weights per spec (01_PROJECT_DESCRIPTION.md section 10):
 *   Parseability:           30%
 *   Keyword Match:          35%
 *   Content Quality:        25%
 *   Formatting Compliance:  10%
 *
 * If a sub-score is null (e.g., no JD provided so no keyword matching),
 * it redistributes that weight proportionally among the other scores.
 */

const WEIGHTS = {
  parseability: 0.30,
  keywordMatch: 0.35,
  contentQuality: 0.25,
  formatting: 0.10,
};

/**
 * @param {Object} subScores - { parseability, keywordMatch, contentQuality, formatting }
 *   Each value is a number 0-100 or null if not available.
 * @returns {{ overall: number, breakdown: Object, band: string, bandColor: string }}
 */
function aggregateScores(subScores) {
  const available = {};
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    if (subScores[key] != null && !isNaN(subScores[key])) {
      available[key] = { score: subScores[key], weight };
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    logger.warn('No sub-scores available for aggregation');
    return {
      overall: 0,
      breakdown: {},
      band: 'critical',
      bandColor: 'red',
    };
  }

  // Redistribute weights proportionally among available scores
  let overall = 0;
  const breakdown = {};

  for (const [key, { score, weight }] of Object.entries(available)) {
    const normalizedWeight = weight / totalWeight;
    const contribution = score * normalizedWeight;
    overall += contribution;
    breakdown[key] = {
      score: Math.round(score * 100) / 100,
      weight: Math.round(normalizedWeight * 100),
      contribution: Math.round(contribution * 100) / 100,
    };
  }

  overall = Math.round(overall * 100) / 100;

  // Score bands per spec
  let band, bandColor;
  if (overall >= 90) {
    band = 'excellent';
    bandColor = '#16a34a'; // dark green
  } else if (overall >= 75) {
    band = 'competitive';
    bandColor = '#22c55e'; // green
  } else if (overall >= 50) {
    band = 'needs_work';
    bandColor = '#f59e0b'; // amber
  } else {
    band = 'high_risk';
    bandColor = '#ef4444'; // red
  }

  logger.debug({ overall, band, breakdown }, 'Score aggregation complete');

  return { overall, breakdown, band, bandColor };
}

module.exports = { aggregateScores, WEIGHTS };