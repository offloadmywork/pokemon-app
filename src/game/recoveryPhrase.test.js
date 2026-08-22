import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateRecoveryPhrase,
  isValidRecoveryPhrase,
  normalizeRecoveryPhrase,
} from './recoveryPhrase.js';

beforeEach(() => {
  localStorage.clear();
});

// Scenario: Trainers get a memorable phrase instead of a raw UUID
//   Given a trainer id
//   When a recovery phrase is generated
//   Then it is word-based, stable in format, and unique per call
describe('generateRecoveryPhrase', () => {
  it('generates a three-word phrase with a number suffix', () => {
    const phrase = generateRecoveryPhrase(() => 0.5);
    const parts = phrase.split('-');
    expect(parts).toHaveLength(4);
    expect(parts.slice(0, 3).every((p) => /^[a-z]+$/.test(p))).toBe(true);
    expect(parts[3]).toMatch(/^\d{2}$/);
  });

  it('produces different phrases across calls', () => {
    const seen = new Set();
    for (let i = 0; i < 20; i += 1) {
      seen.add(generateRecoveryPhrase());
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('uses only words from the wordlist (deterministic with stubbed rng)', () => {
    let call = 0;
    const queue = [0.001, 0.999, 0.5, 0.42];
    const phrase = generateRecoveryPhrase(() => queue[call++]);
    const parts = phrase.split('-');
    expect(parts[0]).toBe('amber');
    expect(parts[1]).toBe('grove');
    expect(parts[2]).toMatch(/^[a-z]+$/);
    expect(parts[3]).toBe('42');
  });
});

// Scenario: Restore input is normalized and validated before hitting the API
//   Given a trainer typing their phrase in any format
//   When the phrase is normalized
//   Then casing/whitespace is cleaned and malformed phrases are rejected
describe('validation', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeRecoveryPhrase('  Amber - Falcon - River - 42 ')).toBe('amber-falcon-river-42');
  });

  it('accepts valid phrases', () => {
    expect(isValidRecoveryPhrase('amber-falcon-river-42')).toBe(true);
    expect(isValidRecoveryPhrase('Amber Falcon River 42')).toBe(true);
  });

  it('rejects malformed phrases', () => {
    expect(isValidRecoveryPhrase('')).toBe(false);
    expect(isValidRecoveryPhrase('amber-falcon')).toBe(false);
    expect(isValidRecoveryPhrase('amber-falcon-river')).toBe(false);
    expect(isValidRecoveryPhrase('notaword-falcon-river-42')).toBe(false);
    expect(isValidRecoveryPhrase('amber-falcon-river-abc')).toBe(false);
  });
});
