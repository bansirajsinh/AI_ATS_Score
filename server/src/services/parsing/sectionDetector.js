const logger = require('../../utils/logger');

/**
 * Known resume section headers — case-insensitive matching.
 * Ordered by typical resume appearance.
 */
const SECTION_PATTERNS = [
  { key: 'contact',        patterns: [/^(contact\s*(info(rmation)?)?|personal\s*(info(rmation)?|details))/i] },
  { key: 'summary',        patterns: [/^(summary|professional\s*summary|executive\s*summary|profile|objective|career\s*objective|about(\s*me)?)/i] },
  { key: 'experience',     patterns: [/^(experience|work\s*experience|professional\s*experience|employment(\s*history)?|work\s*history)/i] },
  { key: 'education',      patterns: [/^(education|academic(\s*background)?|qualifications)/i] },
  { key: 'skills',         patterns: [/^(skills|technical\s*skills|core\s*competencies|competencies|areas?\s*of\s*expertise|proficiencies)/i] },
  { key: 'certifications', patterns: [/^(certifications?|licenses?\s*(&|and)?\s*certifications?|professional\s*certifications?|credentials)/i] },
  { key: 'projects',       patterns: [/^(projects|key\s*projects|notable\s*projects|selected\s*projects)/i] },
  { key: 'awards',         patterns: [/^(awards?|honors?|achievements?|recognition)/i] },
  { key: 'publications',   patterns: [/^(publications?|research|papers)/i] },
  { key: 'volunteer',      patterns: [/^(volunteer(\s*experience)?|community\s*(service|involvement))/i] },
  { key: 'languages',      patterns: [/^(languages?)/i] },
  { key: 'references',     patterns: [/^(references?)/i] },
];

/**
 * Detects which section a line belongs to by testing it against known patterns.
 * Returns the section key (e.g., 'experience') or null.
 */
function matchSection(line) {
  const trimmed = line.trim().replace(/[:\-–—|]/g, '').trim();
  if (!trimmed || trimmed.length > 80) return null; // Too long to be a header

  for (const section of SECTION_PATTERNS) {
    for (const pattern of section.patterns) {
      if (pattern.test(trimmed)) {
        return section.key;
      }
    }
  }
  return null;
}

/**
 * Splits raw resume text into named sections.
 *
 * Returns an object:
 * {
 *   sections: { summary: "...", experience: "...", skills: "...", ... },
 *   sectionOrder: ['summary', 'experience', ...],
 *   hasStandardHeaders: true/false,
 *   detectedHeaders: ['Summary', 'Experience', ...],
 *   unclassifiedText: "..." (text before the first recognized header)
 * }
 */
function detectSections(rawText) {
  const lines = rawText.split(/\r?\n/);
  const sections = {};
  const sectionOrder = [];
  const detectedHeaders = [];
  let currentSection = null;
  const unclassifiedLines = [];

  for (const line of lines) {
    const sectionKey = matchSection(line);

    if (sectionKey) {
      currentSection = sectionKey;
      detectedHeaders.push(line.trim());
      if (!sections[sectionKey]) {
        sections[sectionKey] = '';
        sectionOrder.push(sectionKey);
      }
    } else if (currentSection) {
      sections[currentSection] += line + '\n';
    } else {
      unclassifiedLines.push(line);
    }
  }

  // Trim whitespace from each section
  for (const key of Object.keys(sections)) {
    sections[key] = sections[key].trim();
  }

  const expectedSections = ['summary', 'experience', 'education', 'skills'];
  const foundExpected = expectedSections.filter((s) => sections[s]);
  const hasStandardHeaders = foundExpected.length >= 3;

  logger.debug({
    sectionCount: sectionOrder.length,
    sectionOrder,
    hasStandardHeaders,
  }, 'Section detection complete');

  return {
    sections,
    sectionOrder,
    hasStandardHeaders,
    detectedHeaders,
    unclassifiedText: unclassifiedLines.join('\n').trim(),
  };
}

/**
 * Splits the experience section into individual bullet points.
 */
function extractBullets(experienceText) {
  if (!experienceText) return [];

  const lines = experienceText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bullets = [];

  for (const line of lines) {
    // Lines starting with bullets, dashes, or clearly being accomplishment bullets
    if (/^[\u2022\u2023\u25E6\u2043\u2219•●○◦‣⁃*\->]/.test(line)) {
      bullets.push(line.replace(/^[\u2022\u2023\u25E6\u2043\u2219•●○◦‣⁃*\->]\s*/, ''));
    } else if (line.length > 20 && /^[A-Z]/.test(line)) {
      // Likely a bullet that doesn't start with a bullet character
      bullets.push(line);
    }
  }

  return bullets;
}

module.exports = { detectSections, matchSection, extractBullets, SECTION_PATTERNS };