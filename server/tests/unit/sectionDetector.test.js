const { detectSections, matchSection, extractBullets } = require('../../src/services/parsing/sectionDetector');

describe('Section Detector', () => {
  const sampleResume = `John Doe
john@example.com | (555) 123-4567

Summary
Experienced software engineer with 8 years of building scalable web applications.

Experience
Senior Software Engineer, TechCorp — Jan 2020 – Present
• Led migration of monolithic application to microservices architecture
• Improved API response times by 40% through caching optimization
• Managed team of 5 engineers across 3 time zones

Software Engineer, StartupXYZ — Jun 2016 – Dec 2019
• Built real-time analytics dashboard serving 10K daily users
• Reduced deployment time by 60% through CI/CD pipeline automation

Education
B.S. Computer Science, MIT — 2016

Skills
JavaScript, Python, React, Node.js, AWS, Docker, Kubernetes, PostgreSQL, Redis

Certifications
AWS Solutions Architect – Associate, 2022
`;

  test('detects standard resume sections', () => {
    const result = detectSections(sampleResume);

    expect(result.sectionOrder).toContain('summary');
    expect(result.sectionOrder).toContain('experience');
    expect(result.sectionOrder).toContain('education');
    expect(result.sectionOrder).toContain('skills');
    expect(result.sectionOrder).toContain('certifications');
  });

  test('hasStandardHeaders is true when required sections present', () => {
    const result = detectSections(sampleResume);
    expect(result.hasStandardHeaders).toBe(true);
  });

  test('hasStandardHeaders is false when required sections missing', () => {
    const result = detectSections('Just some random text\nwithout any section headers.');
    expect(result.hasStandardHeaders).toBe(false);
  });

  test('sections contain text content', () => {
    const result = detectSections(sampleResume);
    expect(result.sections.experience).toContain('microservices');
    expect(result.sections.skills).toContain('JavaScript');
  });

  test('unclassified text captures content before first header', () => {
    const result = detectSections(sampleResume);
    expect(result.unclassifiedText).toContain('John Doe');
  });

  test('detectedHeaders contains the original header text', () => {
    const result = detectSections(sampleResume);
    expect(result.detectedHeaders).toContain('Summary');
    expect(result.detectedHeaders).toContain('Experience');
  });
});

describe('matchSection', () => {
  test('matches "Work Experience" to experience', () => {
    expect(matchSection('Work Experience')).toBe('experience');
  });

  test('matches "PROFESSIONAL SUMMARY" to summary', () => {
    expect(matchSection('PROFESSIONAL SUMMARY')).toBe('summary');
  });

  test('matches "Technical Skills" to skills', () => {
    expect(matchSection('Technical Skills')).toBe('skills');
  });

  test('returns null for non-header text', () => {
    expect(matchSection('Built a real-time analytics dashboard')).toBeNull();
  });

  test('returns null for very long lines', () => {
    expect(matchSection('x'.repeat(100))).toBeNull();
  });
});

describe('extractBullets', () => {
  test('extracts bullet points from experience text', () => {
    const text = `Senior Engineer, Corp — 2020-Present
• Led migration to microservices
• Improved API times by 40%
- Built caching layer
* Managed team of 5`;

    const bullets = extractBullets(text);
    expect(bullets.length).toBeGreaterThanOrEqual(3);
    expect(bullets.some((b) => b.includes('Led migration'))).toBe(true);
  });

  test('returns empty array for empty input', () => {
    expect(extractBullets('')).toEqual([]);
    expect(extractBullets(null)).toEqual([]);
  });
});
