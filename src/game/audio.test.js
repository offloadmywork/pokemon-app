import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isMuted,
  setMuted,
  toggleMuted,
  playSfx,
  SFX_NAMES,
} from './audio.js';

const STORAGE_KEY = 'pokemon-audio-settings';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// Scenario: Trainers can mute the game and the choice persists
//   Given no saved audio settings
//   When the game loads
//   Then audio starts unmuted and toggles persist across sessions
describe('audio mute settings', () => {
  it('starts unmuted when nothing is saved', () => {
    expect(isMuted()).toBe(false);
  });

  it('persists a muted choice', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).muted).toBe(true);
  });

  it('toggles and returns the new state', () => {
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(toggleMuted()).toBe(false);
    expect(isMuted()).toBe(false);
  });

  it('survives corrupted saved settings without throwing', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{');
    expect(isMuted()).toBe(false);
  });
});

// Scenario: Playing sounds must never crash the game
//   Given any environment (no AudioContext, suspended context, or normal)
//   When a named SFX plays or an unknown name is used
//   Then the call resolves silently without throwing
describe('playSfx safety', () => {
  it('does not throw when AudioContext is unavailable', () => {
    const original = globalThis.AudioContext;
    delete globalThis.AudioContext;
    try {
      expect(() => playSfx(SFX_NAMES.HIT)).not.toThrow();
    } finally {
      globalThis.AudioContext = original;
    }
  });

  it('does not throw for unknown sfx names', () => {
    expect(() => playSfx('does-not-exist')).not.toThrow();
  });

  it('skips playback while muted', () => {
    setMuted(true);
    const ctx = createFakeContext();
    globalThis.AudioContext = function () { return ctx; };
    try {
      playSfx(SFX_NAMES.UI_TAP);
      expect(ctx.createOscillator).not.toHaveBeenCalled();
    } finally {
      delete globalThis.AudioContext;
    }
  });

  it('schedules an oscillator for a known unmuted sfx', () => {
    const ctx = createFakeContext();
    globalThis.AudioContext = function () { return ctx; };
    try {
      playSfx(SFX_NAMES.UI_TAP);
      expect(ctx.createOscillator).toHaveBeenCalled();
      expect(ctx.createGain).toHaveBeenCalled();
    } finally {
      delete globalThis.AudioContext;
    }
  });
});

function createFakeContext() {
  return {
    currentTime: 0,
    state: 'running',
    resume: vi.fn(async () => {}),
    destination: {},
    createOscillator: vi.fn(() => ({
      type: '',
      frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })),
  };
}
