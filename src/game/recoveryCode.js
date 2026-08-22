// Account recovery code format rules (Epic E4 — Save Safety).
// Codes are 8 chars from an ambiguity-free alphabet (no 0/O, 1/I/L),
// displayed as XXXX-XXXX so they can be read aloud or typed by hand.

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRecoveryCode() {
  const pick = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join('');
  return `${block()}-${block()}`;
}

export function normalizeRecoveryCode(input) {
  const cleaned = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 8) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

export function isValidRecoveryCodeFormat(input) {
  return /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalizeRecoveryCode(input));
}
