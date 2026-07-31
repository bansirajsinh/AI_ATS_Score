const logger = require('../../utils/logger');
const { detectSections } = require('../parsing/sectionDetector');

/**
 * Rule-based Parseability Score (30% weight).
 *
 * Measures whether an ATS parser can correctly extract text, section headers,
 * dates, and job titles. Penalizes multi-column layouts, tables, text boxes,
 * images-as-text, unusual fonts, and missing standard section headers.
 *
 * Returns { score: 0-100, issues: Array<{ severity, message, impact }> }
 */
function calculateParseabilityScore(rawText, sections, metadata = {}) {
  let score = 100;
  const issues = [];

  // 1. Check for extractable text
  if (!rawText || rawText.length < 50) {
    score -= 60;
    issues.push({
      severity: 'critical',
      message: 'Resume has very little or no extractable text. It may be a scanned image or corrupted file.',
      impact: -60,
    });
  }

  // 2. Check for standard section headers
  const requiredSections = ['experience', 'education', 'skills'];
  const optionalSections = ['summary', 'certifications'];

  for (const section of requiredSections) {
    if (!sections[section]) {
      score -= 10;
      issues.push({
        severity: 'high',
        message: `Missing required section: "${section.charAt(0).toUpperCase() + section.slice(1)}". ATS parsers look for standard section headers.`,
        impact: -10,
      });
    }
  }

  for (const section of optionalSections) {
    if (!sections[section]) {
      score -= 3;
      issues.push({
        severity: 'low',
        message: `Missing recommended section: "${section.charAt(0).toUpperCase() + section.slice(1)}".`,
        impact: -3,
      });
    }
  }

  // 3. Check for multi-column layout indicators
  const multiColumnPatterns = [
    /\t{3,}/gm,            // Multiple consecutive tabs suggest columns
    /\s{10,}/gm,           // Large whitespace gaps suggest side-by-side content
    /\|.*\|.*\|/gm,        // Pipe characters used for tables
  ];

  for (const pattern of multiColumnPatterns) {
    const matches = rawText.match(pattern);
    if (matches && matches.length > 2) {
      score -= 15;
      issues.push({
        severity: 'high',
        message: 'Detected possible multi-column layout or table structure. Most ATS parsers read left-to-right, top-to-bottom and will scramble multi-column content.',
        impact: -15,
      });
      break;
    }
  }

  // 4. Check for special characters / symbols that indicate graphics
  const graphicIndicators = rawText.match(/[\u2600-\u27BF\u2B50-\u2BFF\u1F300-\u1F9FF]/g);
  if (graphicIndicators && graphicIndicators.length > 3) {
    score -= 8;
    issues.push({
      severity: 'medium',
      message: `Found ${graphicIndicators.length} graphic symbols/icons. Most ATS parsers strip or misinterpret these.`,
      impact: -8,
    });
  }

  // 5. Check for very long lines (may indicate weird formatting)
  const lines = rawText.split(/\r?\n/);
  const longLines = lines.filter((l) => l.length > 200);
  if (longLines.length > 3) {
    score -= 5;
    issues.push({
      severity: 'low',
      message: 'Several extremely long lines detected. This may indicate formatting issues from text extraction.',
      impact: -5,
    });
  }

  // 6. Check for date patterns (ATS needs to parse dates from experience/education)
  const datePatterns = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s*\.?\s*\d{2,4}|\d{1,2}\/\d{2,4}|\b\d{4}\s*[-–—]\s*(present|\d{4})\b/gi;
  const dateMatches = rawText.match(datePatterns);
  if (!dateMatches || dateMatches.length < 2) {
    score -= 8;
    issues.push({
      severity: 'medium',
      message: 'Few or no date patterns found. ATS parsers need clear date ranges (e.g., "Jan 2022 – Present") to build a work timeline.',
      impact: -8,
    });
  }

  // 7. Check for contact info indicators
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(rawText);
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(rawText);

  if (!hasEmail) {
    score -= 5;
    issues.push({
      severity: 'medium',
      message: 'No email address detected. ATS parsers extract contact info for recruiter outreach.',
      impact: -5,
    });
  }

  if (!hasPhone) {
    score -= 3;
    issues.push({
      severity: 'low',
      message: 'No phone number detected.',
      impact: -3,
    });
  }

  // 8. Check for parsing errors from file extraction
  if (metadata.parseError) {
    score -= 25;
    issues.push({
      severity: 'critical',
      message: `File parsing error: ${metadata.parseError}`,
      impact: -25,
    });
  }

  score = Math.max(0, Math.min(100, score));

  logger.debug({ score, issueCount: issues.length }, 'Parseability score calculated');

  return { score, issues };
}

module.exports = { calculateParseabilityScore };