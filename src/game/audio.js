// Audio SFX engine (Epic E1: Sound & Juice — Nintendo-Level Quality Plan).
// Synthesized WebAudio effects: no asset files, tiny bundle footprint.
// Safety rule: playing a sound must NEVER throw — audio failure is never
// allowed to break gameplay.

import { getSharedContext } from './audioContext.js';

const STORAGE_KEY = 'pokemon-audio-settings';

export const SFX_NAMES = {
  UI_TAP: 'ui-tap',
  HIT: 'hit',
  SUPER_EFFECTIVE: 'super-effective',
  CRIT: 'crit',
  BALL_THROW: 'ball-throw',
  BALL_WOBBLE: 'ball-wobble',
  CATCH_SUCCESS: 'catch-success',
  CATCH_FAIL: 'catch-fail',
  LEVEL_UP: 'level-up',
  FAINT: 'faint',
  RUN_SUCCESS: 'run-success',
  ENCOUNTER: 'encounter',
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { muted: false };
    const parsed = JSON.parse(raw);
    // Preserve sibling fields (volume, soundHintSeen) owned by the music module.
    return { ...parsed, muted: Boolean(parsed?.muted) };
  } catch {
    return { muted: false };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode); mute state just won't persist.
  }
}

export function isMuted() {
  return loadSettings().muted;
}

export function setMuted(muted) {
  // Merge with stored settings so SFX mute never clobbers music volume
  // or the sound-hint flag sharing this key.
  let existing = {};
  try {
    existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (typeof existing !== 'object' || existing === null) existing = {};
  } catch {
    existing = {};
  }
  saveSettings({ ...existing, muted: Boolean(muted) });
}

export function toggleMuted() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

let audioCtx = null;

function getContext() {
  if (audioCtx) return audioCtx;
  audioCtx = getSharedContext();
  return audioCtx;
}

// Each SFX is a tiny synth recipe: [type, startFreq, endFreq, duration, gain].
// Recipes are data so they stay easy to tune without touching playback logic.
const SFX_RECIPES = {
  [SFX_NAMES.UI_TAP]: [{ type: 'square', start: 520, end: 640, duration: 0.06, gain: 0.08 }],
  [SFX_NAMES.ENCOUNTER]: [
    { type: 'sine', start: 660, end: 660, duration: 0.09, gain: 0.14 },
    { type: 'sine', start: 880, end: 880, duration: 0.16, gain: 0.14 },
  ],
  [SFX_NAMES.HIT]: [{ type: 'triangle', start: 220, end: 90, duration: 0.12, gain: 0.18 }],
  [SFX_NAMES.SUPER_EFFECTIVE]: [
    { type: 'sawtooth', start: 300, end: 120, duration: 0.16, gain: 0.2 },
    { type: 'square', start: 150, end: 60, duration: 0.2, gain: 0.14 },
  ],
  [SFX_NAMES.CRIT]: [
    { type: 'square', start: 880, end: 220, duration: 0.22, gain: 0.2 },
    { type: 'sawtooth', start: 440, end: 110, duration: 0.25, gain: 0.15 },
  ],
  [SFX_NAMES.BALL_THROW]: [{ type: 'sine', start: 300, end: 700, duration: 0.25, gain: 0.15 }],
  [SFX_NAMES.BALL_WOBBLE]: [{ type: 'sine', start: 400, end: 380, duration: 0.1, gain: 0.1 }],
  [SFX_NAMES.CATCH_SUCCESS]: [
    { type: 'sine', start: 523, end: 523, duration: 0.12, gain: 0.15 },
    { type: 'sine', start: 659, end: 659, duration: 0.12, gain: 0.15 },
    { type: 'sine', start: 784, end: 784, duration: 0.2, gain: 0.18 },
  ],
  [SFX_NAMES.CATCH_FAIL]: [{ type: 'sawtooth', start: 200, end: 80, duration: 0.3, gain: 0.15 }],
  [SFX_NAMES.LEVEL_UP]: [
    { type: 'sine', start: 523, end: 523, duration: 0.1, gain: 0.14 },
    { type: 'sine', start: 659, end: 659, duration: 0.1, gain: 0.14 },
    { type: 'sine', start: 784, end: 784, duration: 0.1, gain: 0.14 },
    { type: 'sine', start: 1047, end: 1047, duration: 0.3, gain: 0.18 },
  ],
  [SFX_NAMES.FAINT]: [{ type: 'triangle', start: 300, end: 60, duration: 0.45, gain: 0.16 }],
  [SFX_NAMES.RUN_SUCCESS]: [{ type: 'sine', start: 600, end: 1200, duration: 0.2, gain: 0.12 }],
};

export function normalizeSfxName(name) {
  return String(name || '').replace(/_/g, '-');
}

export function playSfx(name) {
  try {
    if (isMuted()) return;
    const layers = SFX_RECIPES[normalizeSfxName(name)];
    if (!layers) return;

    const ctx = getContext();
    if (!ctx) return;

    let offset = 0;
    for (const layer of layers) {
      playLayer(ctx, layer, offset);
      offset += layer.duration * 0.9;
    }
  } catch {
    // Never let audio failures break gameplay.
  }
}

// Haptics companion to SFX. Silently no-ops where unsupported.
export function vibrate(pattern) {
  try {
    if (isMuted()) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    navigator.vibrate(pattern);
  } catch {
    // Haptics must never break gameplay.
  }
}

function playLayer(ctx, { type, start, end, duration, gain }, delay) {
  const oscillator = ctx.createOscillator();
  const amplifier = ctx.createGain();
  const t0 = ctx.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(start, t0);
  if (end !== start) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, end), t0 + duration);
  }

  amplifier.gain.setValueAtTime(gain, t0);
  amplifier.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  oscillator.connect(amplifier);
  amplifier.connect(ctx.destination);
  oscillator.start(t0);
  oscillator.stop(t0 + duration + 0.05);
}
