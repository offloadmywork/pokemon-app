import { describe, it, expect, vi, beforeEach } from 'vitest';

let fakeCtx = null;
vi.mock('./audioContext.js', () => ({
  getSharedContext: () => fakeCtx,
}));

import {
  getVolume,
  setVolume,
  setMuted,
  isMuted,
  startMusic,
  stopMusic,
  getMusicTheme,
  markSoundHintSeen,
  hasSoundHintBeenSeen,
  MUSIC_THEMES,
} from './music.js';

function makeCtx() {
  const gains = [];
  return {
    gains,
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
    createGain: vi.fn(() => {
      const g = {
        gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      };
      gains.push(g);
      return g;
    }),
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

// Scenario: The one-time sound hint flag persists without clobbering audio settings
//   Given saved audio settings
//   When the hint dismissal is recorded
//   Then muted and volume survive untouched
//   And the flag reads back as seen
describe('sound hint flag', () => {
  it('records hint-seen without touching existing settings', () => {
    setMuted(true);
    setVolume(0.5);
    markSoundHintSeen();
    const raw = JSON.parse(localStorage.getItem('pokemon-audio-settings'));
    expect(raw.muted).toBe(true);
    expect(raw.volume).toBe(0.5);
    expect(raw.soundHintSeen).toBe(true);
    expect(hasSoundHintBeenSeen()).toBe(true);
  });

  it('defaults to unseen and survives corrupted settings', () => {
    expect(hasSoundHintBeenSeen()).toBe(false);
    localStorage.setItem('pokemon-audio-settings', 'garbage{');
    expect(hasSoundHintBeenSeen()).toBe(false);
  });

  // Scenario: SFX and music share one settings key without clobbering each other
  //   Given volume and hint flag are saved by the music module
  //   When the SFX module flips mute
  //   Then volume and hint flag survive untouched
  it('SFX setMuted preserves music-owned settings fields', async () => {
    const audio = await import('./audio.js');
    setVolume(0.6);
    markSoundHintSeen();
    audio.setMuted(true);
    expect(audio.isMuted()).toBe(true);
    expect(getVolume()).toBe(0.6);
    expect(hasSoundHintBeenSeen()).toBe(true);
    setVolume(0.9);
    expect(audio.isMuted()).toBe(true);
    const raw = JSON.parse(localStorage.getItem('pokemon-audio-settings'));
    expect(raw.muted).toBe(true);
    expect(raw.volume).toBe(0.9);
    expect(raw.soundHintSeen).toBe(true);
  });
});

// Scenario: Muting mid-song silences already-scheduled notes instantly
//   Given music is playing with notes scheduled up to ~1.5s ahead
//   When the shared mute flag flips on
//   Then already-scheduled notes are silenced immediately
//   And the playhead keeps advancing so unmute has no catch-up burst
describe('mute during playback', () => {
  it('routes all scheduled notes through a music bus gated by mute', () => {
    fakeCtx = makeCtx();
    startMusic('route');
    // One gain node (the bus) connects straight to the destination...
    const bus = fakeCtx.gains.find((g) => g.connect.mock.calls.some(([dest]) => dest === fakeCtx.destination));
    expect(bus).toBeDefined();
    // ...and every other gain (note amplifiers) connects into the bus, not the destination.
    const amplifiers = fakeCtx.gains.filter((g) => g !== bus);
    expect(amplifiers.length).toBeGreaterThan(0);
    for (const amp of amplifiers) {
      expect(amp.connect.mock.calls.some(([dest]) => dest === bus)).toBe(true);
    }
    stopMusic();
  });

  it('flipping mute sets the bus gain to zero instantly', () => {
    vi.useFakeTimers();
    try {
      fakeCtx = makeCtx();
      startMusic('route');
      const bus = fakeCtx.gains.find((g) => g.connect.mock.calls.some(([dest]) => dest === fakeCtx.destination));
      expect(bus.gain.value).toBe(1);
      setMuted(true);
      // Trigger a scheduler tick indirectly: the gate applies on the next 400ms tick.
      vi.advanceTimersByTime(400);
      expect(bus.gain.value).toBe(0);
      setMuted(false);
      vi.advanceTimersByTime(400);
      expect(bus.gain.value).toBe(1);
    } finally {
      stopMusic();
      vi.useRealTimers();
    }
  });

  it('keeps the playhead advancing while muted (no unmute catch-up burst)', () => {
    vi.useFakeTimers();
    try {
      fakeCtx = makeCtx();
      setMuted(true);
      startMusic('route');
      const countAfterStart = fakeCtx.createOscillator.mock.calls.length;
      // Simulate ~4 seconds of playback while muted.
      for (let i = 0; i < 10; i += 1) {
        fakeCtx.currentTime += 0.4;
        vi.advanceTimersByTime(400);
      }
      const totalAfterMuted = fakeCtx.createOscillator.mock.calls.length;
      // Notes kept being scheduled (steady stream), never stalled out.
      expect(totalAfterMuted - countAfterStart).toBeGreaterThan(5);
      // Unmuting must NOT trigger a giant past-due burst: the next second
      // schedules no more than a steady tick window worth of notes.
      setMuted(false);
      const beforeUnmute = fakeCtx.createOscillator.mock.calls.length;
      fakeCtx.currentTime += 0.4;
      vi.advanceTimersByTime(400);
      const burstSize = fakeCtx.createOscillator.mock.calls.length - beforeUnmute;
      expect(burstSize).toBeLessThan(totalAfterMuted - countAfterStart);
    } finally {
      stopMusic();
      vi.useRealTimers();
    }
  });
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
