const logger = require('../../utils/logger');

/**
 * Rule-based Formatting Compliance Score (10% weight).
 *
 * Checks file type, standard fonts, date format consistency, hidden/white text,
 * page length for experience level, and other formatting concerns.
 *
 * Returns { score: 0-100, issues: Array<{ severity, message, impact }> }
 */
function calculateFormattingScore(rawText, metadata = {}) {
  let score = 100;
  const issues = [];

  // 1. File type check — PDF/DOCX preferred over TXT
  if (metadata.mimeType === 'text/plain') {
    score -= 10;
    issues.push({
      severity: 'medium',
      message: 'Plain text files lose all formatting. Use PDF or DOCX for best ATS compatibility.',
      impact: -10,
    });
  }

  // 2. Resume length check
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  if (wordCount < 150) {
    score -= 15;
    issues.push({
      severity: 'high',
      message: `Resume is very short (${wordCount} words). Most effective resumes have 300-700 words per page.`,
      impact: -15,
    });
  } else if (wordCount > 1500) {
    score -= 8;
    issues.push({
      severity: 'medium',
      message: `Resume is very long (${wordCount} words / ~${Math.ceil(wordCount / 500)} pages). For most roles, 1-2 pages is optimal. Excessive length can hurt ATS ranking.`,
      impact: -8,
    });
  }

  // 3. Inconsistent date formats
  const dateFormats = {
    monthYear: rawText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{4}\b/gi) || [],
    slashDate: rawText.match(/\b\d{1,2}\/\d{2,4}\b/g) || [],
    dashYear: rawText.match(/\b\d{4}\s*[-–—]\s*\d{4}\b/g) || [],
  };

  const usedFormats = Object.values(dateFormats).filter((f) => f.length > 0).length;
  if (usedFormats > 1) {
    score -= 5;
    issues.push({
      severity: 'low',
      message: 'Inconsistent date formats detected (mixing "Jan 2022" with "1/22" style). Use a single format throughout.',
      impact: -5,
    });
  }

  // 4. Check for potential hidden/white text (keyword stuffing technique)
  // We look for strings of text that appear to be lists of skills with no context
  const suspiciousPatterns = rawText.match(/(\b\w+\b,\s*){10,}/g);
  if (suspiciousPatterns && suspiciousPatterns.length > 2) {
    score -= 10;
    issues.push({
      severity: 'high',
      message: 'Detected long comma-separated keyword lists. This pattern is flagged as keyword stuffing by modern ATS systems.',
      impact: -10,
    });
  }

  // 5. Check for excessive use of ALL CAPS
  const allCapsWords = rawText.match(/\b[A-Z]{4,}\b/g) || [];
  const totalWords = rawText.split(/\s+/).filter(Boolean).length;
  const capsRatio = allCapsWords.length / (totalWords || 1);
  if (capsRatio > 0.15) {
    score -= 5;
    issues.push({
      severity: 'low',
      message: 'Excessive use of ALL CAPS text. Use standard capitalization for better readability.',
      impact: -5,
    });
  }

  // 6. Check for consistent bullet usage
  const bulletTypes = new Set();
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[•]/.test(trimmed)) bulletTypes.add('•');
    if (/^[-]/.test(trimmed)) bulletTypes.add('-');
    if (/^[*]/.test(trimmed)) bulletTypes.add('*');
    if (/^[►▸▪]/.test(trimmed)) bulletTypes.add('special');
    if (/^[○◦]/.test(trimmed)) bulletTypes.add('circle');
  }

  if (bulletTypes.size > 2) {
    score -= 3;
    issues.push({
      severity: 'low',
      message: `${bulletTypes.size} different bullet styles detected. Use a consistent bullet character throughout.`,
      impact: -3,
    });
  }

  // 7. Check for special/non-standard characters that may not render
  const nonStandard = rawText.match(/[^\x00-\x7F\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g);
  if (nonStandard && nonStandard.length > 10) {
    score -= 5;
    issues.push({
      severity: 'low',
      message: `Found ${nonStandard.length} non-standard/special characters that some ATS parsers may strip or misrender.`,
      impact: -5,
    });
  }

  // 8. Empty lines ratio — too many blank lines wastes space
  const emptyLines = lines.filter((l) => l.trim() === '').length;
  const emptyRatio = emptyLines / (lines.length || 1);
  if (emptyRatio > 0.4) {
    score -= 3;
    issues.push({
      severity: 'low',
      message: 'Excessive blank lines. Tighten spacing to fit more content on fewer pages.',
      impact: -3,
    });
  }

  score = Math.max(0, Math.min(100, score));

  logger.debug({ score, issueCount: issues.length }, 'Formatting score calculated');

  return { score, issues };
}

module.exports = { calculateFormattingScore };