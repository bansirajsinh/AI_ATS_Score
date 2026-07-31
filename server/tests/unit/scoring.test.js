const { calculateParseabilityScore } = require('../../src/services/scoring/parseabilityScore');
const { calculateFormattingScore } = require('../../src/services/scoring/formattingScore');

describe('Parseability Score', () => {
  const goodResume = `John Doe
john@example.com | (555) 123-4567

Summary
Experienced software engineer with 8 years building scalable web applications.

Experience
Senior Software Engineer, TechCorp — Jan 2020 – Present
Led migration of monolithic application to microservices architecture.
Improved API response times by 40% through caching.

Education
B.S. Computer Science, MIT — 2016

Skills
JavaScript, Python, React, Node.js, AWS, Docker`;

  test('well-formatted resume scores high', () => {
    const sections = {
      summary: 'Experienced software engineer...',
      experience: 'Senior Software Engineer...',
      education: 'B.S. Computer Science...',
      skills: 'JavaScript, Python...',
    };

    const result = calculateParseabilityScore(goodResume, sections);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.issues).toBeDefined();
  });

  test('empty text scores very low', () => {
    const result = calculateParseabilityScore('', {});
    expect(result.score).toBeLessThan(40);
    expect(result.issues.some((i) => i.severity === 'critical')).toBe(true);
  });

  test('missing required sections penalized', () => {
    const result = calculateParseabilityScore(goodResume, {
      summary: 'Some text',
    });

    const missingIssues = result.issues.filter((i) =>
      i.message.includes('Missing required section')
    );
    expect(missingIssues.length).toBeGreaterThanOrEqual(1);
  });

  test('parse error from metadata reduces score', () => {
    const result = calculateParseabilityScore(goodResume, {
      experience: 'text', education: 'text', skills: 'text',
    }, { parseError: 'Corrupted PDF' });

    expect(result.score).toBeLessThan(80);
    expect(result.issues.some((i) => i.message.includes('Corrupted PDF'))).toBe(true);
  });
});

describe('Formatting Score', () => {
  test('good resume scores high', () => {
    const text = `John Doe\njohn@example.com\n\nExperience\n• Led team of 5 engineers since Jan 2020\n• Improved performance by 40%\n\nSkills\nJavaScript, React, Node.js`;
    const result = calculateFormattingScore(text, { mimeType: 'application/pdf' });
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test('plain text file gets penalized', () => {
    const text = 'Resume content here.\n'.repeat(20);
    const result = calculateFormattingScore(text, { mimeType: 'text/plain' });
    const txtIssue = result.issues.find((i) => i.message.includes('Plain text'));
    expect(txtIssue).toBeDefined();
  });

  test('very short resume penalized', () => {
    const result = calculateFormattingScore('Short resume.', { mimeType: 'application/pdf' });
    expect(result.score).toBeLessThan(90);
    expect(result.issues.some((i) => i.message.includes('very short'))).toBe(true);
  });
});
