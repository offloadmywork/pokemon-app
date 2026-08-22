import { describe, it, expect } from 'vitest';
import {
  generateRecoveryCode,
  normalizeRecoveryCode,
  isValidRecoveryCodeFormat,
} from './recoveryCode.js';

// Scenario: Recovery codes are human-friendly and unambiguous
//   Given a newly generated recovery code
//   When a trainer reads it aloud or copies it
//   Then it uses grouped blocks from an ambiguity-free alphabet
describe('generateRecoveryCode', () => {
  it('generates two 4-character blocks separated by a dash', () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('avoids ambiguous characters (0/O and 1/I/L)', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateRecoveryCode();
      expect(code.replace('-', '')).not.toMatch(/[01OIL]/);
    }
  });

  it('generates unique codes across many draws', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateRecoveryCode()));
    expect(codes.size).toBeGreaterThan(190);
  });
});

// Scenario: Trainers can type codes loosely; the game normalizes them
//   Given a recovery code typed with lowercase letters or stray separators
//   When it is normalized
//   Then it matches the canonical format
describe('normalizeRecoveryCode', () => {
  it('uppercases and strips spaces and dashes', () => {
    expect(normalizeRecoveryCode(' abcd-efgh ')).toBe('ABCD-EFGH');
    expect(normalizeRecoveryCode('abcd efgh')).toBe('ABCD-EFGH');
    expect(normalizeRecoveryCode('abcdefgh')).toBe('ABCD-EFGH');
  });

  it('validates the canonical format after normalization', () => {
    expect(isValidRecoveryCodeFormat('ABCD-EFGH')).toBe(true);
    expect(isValidRecoveryCodeFormat('abcd efgh')).toBe(true);
    expect(isValidRecoveryCodeFormat('ABC0-EFGH')).toBe(false);
    expect(isValidRecoveryCodeFormat('ABC-EFGH')).toBe(false);
    expect(isValidRecoveryCodeFormat('')).toBe(false);
  });
});
