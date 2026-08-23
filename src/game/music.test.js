import { describe, it, expect, vi, beforeEach } from 'vitest';

let fakeCtx = null;
vi.mock('./audioContext.js', () => ({
  getSharedContext: () => fakeCtx,
}));

import {
  getVolume,
  setVolume,
  startMusic,
  stopMusic,
  getMusicTheme,
  MUSIC_THEMES,
} from './music.js';

function makeCtx() {
  return {
    currentTime: 0,
    state: 'running',
    destination: {},
    createOscillator: vi.fn(() => ({
      type: '',
      frequency: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({
      gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    })),
  };
}

beforeEach(() => {
  localStorage.clear();
  stopMusic();
  vi.restoreAllMocks();
});

// Scenario: Trainers control music volume, separate from SFX mute
//   Given the audio settings store
//   When volume is adjusted
//   Then it clamps to 0..1 and persists across sessions
describe('music volume settings', () => {
  it('defaults to full volume', () => {
    expect(getVolume()).toBe(1);
  });

  it('persists and clamps volume values', () => {
    setVolume(0.4);
    expect(getVolume()).toBe(0.4);
    setVolume(5);
    expect(getVolume()).toBe(1);
    setVolume(-2);
    expect(getVolume()).toBe(0);
    setVolume(0.7);
    expect(JSON.parse(localStorage.getItem('pokemon-audio-settings')).volume).toBe(0.7);
  });

  it('survives corrupted settings', () => {
    localStorage.setItem('pokemon-audio-settings', 'garbage{');
    expect(getVolume()).toBe(1);
  });
});

// Scenario: Theme music plays per context and stops cleanly
//   Given route and battle themes
//   When startMusic/stopMusic are called
//   Then only one theme plays at a time and state tracks it
describe('music playback state', () => {
  it('defines route and battle themes', () => {
    expect(Object.keys(MUSIC_THEMES)).toEqual(expect.arrayContaining(['route', 'battle']));
    expect(MUSIC_THEMES.route.notes.length).toBeGreaterThan(0);
    expect(MUSIC_THEMES.battle.notes.length).toBeGreaterThan(0);
  });

  it('tracks the playing theme and switches cleanly', () => {
    fakeCtx = makeCtx();
    startMusic('route');
    expect(getMusicTheme()).toBe('route');
    startMusic('battle');
    expect(getMusicTheme()).toBe('battle');
    stopMusic();
    expect(getMusicTheme()).toBeNull();
  });

  it('schedules notes while playing', () => {
    fakeCtx = makeCtx();
    startMusic('battle');
    expect(fakeCtx.createOscillator).toHaveBeenCalled();
    stopMusic();
  });

// Scenario: Themes layer bass and percussion under the melody
//   Given the built-in themes
//   When music plays
//   Then bass notes and drum hits are scheduled alongside the lead
  it('defines bass and percussion layers for each theme', () => {
    for (const theme of Object.values(MUSIC_THEMES)) {
      expect(theme.bass.length).toBeGreaterThan(0);
      expect(theme.drums.length).toBeGreaterThan(0);
    }
    const battleDrums = MUSIC_THEMES.battle.drums.flat().filter((v) => v === 'kick');
    expect(battleDrums.length).toBeGreaterThan(0);
  });

  it('schedules bass oscillators while playing', () => {
    fakeCtx = makeCtx();
    const before = fakeCtx.createOscillator.mock.calls.length;
    startMusic('battle');
    const scheduled = fakeCtx.createOscillator.mock.calls.length - before;
    // Melody + bass + percussion all schedule in the first tick window.
    expect(scheduled).toBeGreaterThan(5);
    stopMusic();
  });

  it('is safe to stop when nothing is playing', () => {
    expect(() => stopMusic()).not.toThrow();
    expect(getMusicTheme()).toBeNull();
  });

  it('ignores unknown themes', () => {
    startMusic('jazz');
    expect(getMusicTheme()).toBeNull();
  });
});
