// Recovery phrase domain rules (Epic E4 — Save Safety).
// Trainers get a memorable word phrase mapped server-side to their save,
// so a cleared browser no longer means a lost save.

export const RECOVERY_WORDLIST = [
  'amber', 'basil', 'cedar', 'delta', 'ember', 'falcon', 'garnet', 'harbor',
  'iris', 'jade', 'kite', 'lotus', 'maple', 'nova', 'oak', 'pine',
  'quartz', 'river', 'sage', 'topaz', 'umbra', 'violet', 'willow', 'xenon',
  'yarrow', 'zephyr', 'acorn', 'birch', 'coral', 'dune', 'flint', 'grove',
];

function pickWord(rng) {
  const roll = typeof rng === 'function' ? rng() : Math.random();
  const index = Math.floor((roll % 1) * RECOVERY_WORDLIST.length);
  return RECOVERY_WORDLIST[index % RECOVERY_WORDLIST.length];
}

export function generateRecoveryPhrase(rng = Math.random) {
  const words = [pickWord(rng), pickWord(rng), pickWord(rng)];
  const roll = typeof rng === 'function' ? rng() : Math.random();
  const digits = String(Math.floor((roll % 1) * 100)).padStart(2, '0');
  return `${words.join('-')}-${digits}`;
}

export function normalizeRecoveryPhrase(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .join('-');
}

export function isValidRecoveryPhrase(input) {
  const normalized = normalizeRecoveryPhrase(input);
  const parts = normalized.split('-');
  if (parts.length !== 4) return false;
  const [w1, w2, w3, num] = parts;
  if (!/^\d{2}$/.test(num)) return false;
  return [w1, w2, w3].every((word) => RECOVERY_WORDLIST.includes(word));
}
