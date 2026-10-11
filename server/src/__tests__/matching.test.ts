import { describe, expect, it } from 'vitest';
import { computeMatch } from '../services/matchingService';
import { detectCrisis } from '../services/crisis';

const opp = {
  category: 'internship', location: 'Bengaluru', mode: 'onsite', tags: ['technology'],
  eligibility: { educationLevels: ['Undergraduate'], minExperienceYears: 2, skills: ['python', 'sql'], locations: ['Bengaluru'] },
};

describe('computeMatch', () => {
  it('scores a strong profile highly and explains why', () => {
    const m = computeMatch({ education: 'Undergraduate', skills: ['Python', 'SQL'], interests: ['Technology'], goals: ['Find internship'], location: 'Bengaluru, Karnataka', yearsOfExperience: 3 }, opp);
    expect(m.score).toBeGreaterThanOrEqual(90);
    expect(m.mismatches).toHaveLength(0);
    expect(m.confidence).toBe('high');
  });
  it('flags a mismatch instead of hiding it', () => {
    const m = computeMatch({ education: 'Undergraduate', skills: ['Python'], goals: ['Find internship'], location: 'Bengaluru', yearsOfExperience: 0 }, opp);
    expect(m.mismatches.some((x) => x.includes('2+ years'))).toBe(true);
  });
  it('never returns a confident score when data is missing', () => {
    const m = computeMatch({}, opp);
    expect(m.score).toBe(0);
    expect(m.confidence).toBe('low');
    expect(m.unknowns.length).toBeGreaterThan(0);
  });
  it('dampens scores when some factors are unknown', () => {
    const full = computeMatch({ education: 'Undergraduate', skills: ['Python', 'SQL'], interests: ['Technology'], goals: ['Find internship'], location: 'Bengaluru', yearsOfExperience: 3 }, opp);
    const partial = computeMatch({ goals: ['Find internship'] }, opp);
    expect(partial.score).toBeLessThan(full.score);
  });
  it('is deterministic', () => {
    const u = { education: 'Postgraduate', goals: ['Find job'] };
    expect(computeMatch(u, opp)).toEqual(computeMatch(u, opp));
  });
});

describe('detectCrisis', () => {
  it('detects danger language', () => {
    expect(detectCrisis('He is going to kill me tonight')).toBe(true);
    expect(detectCrisis('I want to die')).toBe(true);
  });
  it('does not fire on ordinary workplace concerns', () => {
    expect(detectCrisis('My manager makes inappropriate comments in meetings')).toBe(false);
  });
});
