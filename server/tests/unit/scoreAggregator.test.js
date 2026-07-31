const { aggregateScores, WEIGHTS } = require('../../src/services/scoring/scoreAggregator');

describe('Score Aggregator', () => {
  test('calculates weighted composite correctly with all sub-scores', () => {
    const result = aggregateScores({
      parseability: 80,
      keywordMatch: 70,
      contentQuality: 60,
      formatting: 90,
    });

    // 80*0.30 + 70*0.35 + 60*0.25 + 90*0.10 = 24 + 24.5 + 15 + 9 = 72.5
    expect(result.overall).toBe(72.5);
    expect(result.band).toBe('needs_work');
    expect(result.bandColor).toBe('#f59e0b');
  });

  test('redistributes weight when a sub-score is null', () => {
    const result = aggregateScores({
      parseability: 80,
      keywordMatch: null,
      contentQuality: 60,
      formatting: 90,
    });

    // Without keyword (0.35), remaining = 0.30 + 0.25 + 0.10 = 0.65
    // Normalized: parseability = 0.30/0.65, content = 0.25/0.65, format = 0.10/0.65
    const expectedParseWeight = 0.30 / 0.65;
    const expectedContentWeight = 0.25 / 0.65;
    const expectedFormatWeight = 0.10 / 0.65;
    const expected = 80 * expectedParseWeight + 60 * expectedContentWeight + 90 * expectedFormatWeight;

    expect(result.overall).toBeCloseTo(expected, 1);
    expect(result.breakdown.keywordMatch).toBeUndefined();
    expect(Object.keys(result.breakdown)).toHaveLength(3);
  });

  test('returns zero when all sub-scores are null', () => {
    const result = aggregateScores({
      parseability: null,
      keywordMatch: null,
      contentQuality: null,
      formatting: null,
    });

    expect(result.overall).toBe(0);
    expect(result.band).toBe('critical');
  });

  test('handles perfect scores', () => {
    const result = aggregateScores({
      parseability: 100,
      keywordMatch: 100,
      contentQuality: 100,
      formatting: 100,
    });

    expect(result.overall).toBe(100);
    expect(result.band).toBe('excellent');
    expect(result.bandColor).toBe('#16a34a');
  });

  test('correct band assignment for 50-74 range', () => {
    const result = aggregateScores({
      parseability: 60,
      keywordMatch: 60,
      contentQuality: 60,
      formatting: 60,
    });

    expect(result.overall).toBe(60);
    expect(result.band).toBe('needs_work');
  });

  test('correct band assignment for 75-89 range', () => {
    const result = aggregateScores({
      parseability: 85,
      keywordMatch: 85,
      contentQuality: 85,
      formatting: 85,
    });

    expect(result.overall).toBe(85);
    expect(result.band).toBe('competitive');
  });

  test('correct band assignment for 0-49 range', () => {
    const result = aggregateScores({
      parseability: 30,
      keywordMatch: 30,
      contentQuality: 30,
      formatting: 30,
    });

    expect(result.overall).toBe(30);
    expect(result.band).toBe('high_risk');
    expect(result.bandColor).toBe('#ef4444');
  });

  test('weights sum to 1.0', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  test('breakdown includes contribution per sub-score', () => {
    const result = aggregateScores({
      parseability: 80,
      keywordMatch: 70,
      contentQuality: 60,
      formatting: 90,
    });

    expect(result.breakdown.parseability.contribution).toBeCloseTo(24, 1);
    expect(result.breakdown.keywordMatch.contribution).toBeCloseTo(24.5, 1);
    expect(result.breakdown.contentQuality.contribution).toBeCloseTo(15, 1);
    expect(result.breakdown.formatting.contribution).toBeCloseTo(9, 1);
  });
});
