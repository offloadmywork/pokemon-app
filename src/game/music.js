// Procedural background music (Epic E7: Music & Audio Mix).
// Chiptune-style loops synthesized with WebAudio — no asset files.
// One theme plays at a time; playback respects the shared volume setting
// and the SFX mute flag. Music must never break gameplay.

import { getSharedContext } from './audioContext.js';

const SETTINGS_KEY = 'pokemon-audio-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { muted: false, volume: 1 };
    const parsed = JSON.parse(raw);
    // Preserve sibling fields (soundHintSeen) owned by other modules sharing this key.
    return {
      ...parsed,
      muted: Boolean(parsed?.muted),
      volume: clampVolume(parsed?.volume),
    };
  } catch {
    return { muted: false, volume: 1 };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable; settings just won't persist.
  }
}

function clampVolume(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(1, Math.max(0, parsed));
}

export function getVolume() {
  return loadSettings().volume;
}

export function setVolume(volume) {
  saveSettings({ ...loadSettings(), volume: clampVolume(volume) });
}

export function isMuted() {
  return loadSettings().muted;
}

export function hasSoundHintBeenSeen() {
  try {
    return Boolean(JSON.parse(localStorage.getItem(SETTINGS_KEY))?.soundHintSeen);
  } catch {
    return false;
  }
}

export function markSoundHintSeen() {
  saveSettings({ ...loadSettings(), soundHintSeen: true });
}

export function setMuted(muted) {
  saveSettings({ ...loadSettings(), muted: Boolean(muted) });
}

export function toggleMuted() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

// note = [frequencyHz or 0(rest), beats, waveform]; beats are quarter-note counts.
// Themes layer lead + bass + drums; drum notes are ['kick'|'hat', beats].
const MUSIC_THEMES = {
  route: {
    bpm: 96,
    gainScale: 0.05,
    notes: [
      [392, 2, 'triangle'], [440, 1, 'triangle'], [494, 1, 'triangle'],
      [523, 2, 'triangle'], [440, 2, 'triangle'], [392, 3, 'triangle'],
      [349, 2, 'triangle'], [392, 1, 'triangle'], [440, 2, 'triangle'],
      [523, 2, 'triangle'], [587, 2, 'triangle'], [523, 3, 'triangle'],
      [294, 2, 'sine'], [330, 2, 'sine'], [349, 2, 'sine'],
      [392, 4, 'sine'],
    ],
    bass: [
      [196, 2, 'sine'], [0, 1], [196, 1, 'sine'],
      [165, 2, 'sine'], [0, 1], [165, 1, 'sine'],
      [147, 2, 'sine'], [0, 1], [147, 1, 'sine'],
      [196, 3, 'sine'], [0, 1],
    ],
    drums: [
      ['hat', 1], ['hat', 1], ['hat', 1], ['hat', 1],
      ['kick', 1], ['hat', 1], ['hat', 1], ['hat', 1],
      ['hat', 1], ['hat', 1], ['hat', 1], ['hat', 1],
      ['kick', 1], ['hat', 1], ['kick', 1], ['hat', 1],
    ],
  },
  battle: {
    bpm: 150,
    gainScale: 0.06,
    notes: [
      [220, 0.5, 'square'], [220, 0.5, 'square'], [262, 0.5, 'square'], [220, 0.5, 'square'],
      [294, 0.5, 'square'], [220, 0.5, 'square'], [262, 1, 'square'],
      [196, 0.5, 'square'], [196, 0.5, 'square'], [247, 0.5, 'square'], [196, 0.5, 'square'],
      [294, 0.5, 'square'], [196, 0.5, 'square'], [247, 1, 'square'],
      [262, 0.5, 'square'], [262, 0.5, 'square'], [330, 0.5, 'square'], [262, 0.5, 'square'],
      [392, 0.5, 'square'], [330, 0.5, 'square'], [294, 1, 'square'],
      [247, 0.5, 'square'], [247, 0.5, 'square'], [294, 0.5, 'square'], [247, 0.5, 'square'],
      [349, 0.5, 'square'], [294, 0.5, 'square'], [262, 1, 'square'],
    ],
    bass: [
      [110, 0.5, 'sawtooth'], [110, 0.5, 'sawtooth'], [110, 0.5, 'sawtooth'], [110, 0.5, 'sawtooth'],
      [98, 0.5, 'sawtooth'], [98, 0.5, 'sawtooth'], [98, 0.5, 'sawtooth'], [98, 0.5, 'sawtooth'],
      [131, 0.5, 'sawtooth'], [131, 0.5, 'sawtooth'], [131, 0.5, 'sawtooth'], [131, 0.5, 'sawtooth'],
      [123, 0.5, 'sawtooth'], [123, 0.5, 'sawtooth'], [123, 0.5, 'sawtooth'], [123, 0.5, 'sawtooth'],
    ],
    drums: [
      ['kick', 0.5], ['hat', 0.5], ['kick', 0.5], ['hat', 0.5],
      ['kick', 0.5], ['hat', 0.5], ['kick', 0.5], ['kick', 0.5],
      ['kick', 0.5], ['hat', 0.5], ['kick', 0.5], ['hat', 0.5],
      ['kick', 0.5], ['kick', 0.5], ['hat', 0.5], ['kick', 0.5],
    ],
  },
};

export { MUSIC_THEMES };

let currentThemeName = null;
let schedulerTimer = null;
// All music routes through this gain node so mute flips silence
// already-scheduled notes instantly (WebAudio schedules ~1.5s ahead).
let musicBus = null;
let nextNoteTime = 0;
let loopIndex = 0;
let bassIndex = 0;
let bassNextTime = 0;
let drumIndex = 0;
let drumNextTime = 0;

function scheduleDrum(ctx, kind, startAt, secondsPerBeat) {
  const oscillator = ctx.createOscillator();
  const amplifier = ctx.createGain();
  const duration = kind === 'kick' ? 0.12 : 0.04;

  oscillator.type = kind === 'kick' ? 'sine' : 'square';
  if (kind === 'kick') {
    oscillator.frequency.setValueAtTime(150, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(45, startAt + duration);
  } else {
    oscillator.frequency.setValueAtTime(6000, startAt);
  }

  const peak = (kind === 'kick' ? 0.12 : 0.03) * getVolume();
  amplifier.gain.setValueAtTime(peak, startAt);
  amplifier.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  oscillator.connect(amplifier);
  amplifier.connect(musicBus || ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function scheduleNote(ctx, theme, note, startAt) {
  const [freq, beats, type] = note;
  const secondsPerBeat = 60 / theme.bpm;
  const duration = beats * secondsPerBeat;
  if (!freq) return duration; // rest

  const oscillator = ctx.createOscillator();
  const amplifier = ctx.createGain();

  oscillator.type = type || 'square';
  oscillator.frequency.setValueAtTime(freq, startAt);

  const peak = theme.gainScale * getVolume();
  amplifier.gain.setValueAtTime(peak, startAt);
  amplifier.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  oscillator.connect(amplifier);
  amplifier.connect(musicBus || ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);

  return duration;
}

function schedulerTick() {
  try {
    if (!currentThemeName) return;
    const ctx = getSharedContext();
    if (!ctx) { stopMusic(); return; }
    const theme = MUSIC_THEMES[currentThemeName];
    if (!theme) { stopMusic(); return; }

    // Mute gates the shared bus so notes already scheduled ahead are
    // silenced instantly — and the playhead keeps advancing while muted,
    // so unmuting never triggers a past-due catch-up burst.
    if (musicBus) musicBus.gain.value = isMuted() ? 0 : 1;

    const secondsPerBeat = 60 / theme.bpm;
    // Schedule ~1.5s ahead of the playhead for smooth looping.
    while (nextNoteTime < ctx.currentTime + 1.5) {
      const note = theme.notes[loopIndex % theme.notes.length];
      const duration = note[1] * secondsPerBeat;
      scheduleNote(ctx, theme, note, nextNoteTime);
      nextNoteTime += Math.max(duration, 0.05);
      loopIndex += 1;
    }

    // Bass layer.
    if (bassNextTime < ctx.currentTime) bassNextTime = ctx.currentTime + 0.05;
    const bassLoop = theme.bass || [];
    while (bassLoop.length > 0 && bassNextTime < ctx.currentTime + 1.5) {
      const note = bassLoop[bassIndex % bassLoop.length];
      const duration = note[1] * secondsPerBeat;
      if (note[0]) scheduleNote(ctx, { ...theme, gainScale: theme.gainScale * 1.4 }, note, bassNextTime);
      bassNextTime += Math.max(duration, 0.05);
      bassIndex += 1;
    }

    // Percussion layer.
    const drums = theme.drums || [];
    if (drumNextTime < ctx.currentTime) drumNextTime = ctx.currentTime + 0.05;
    while (drums.length > 0 && drumNextTime < ctx.currentTime + 1.5) {
      const [kind, beats] = drums[drumIndex % drums.length];
      const duration = beats * secondsPerBeat;
      scheduleDrum(ctx, kind, drumNextTime, secondsPerBeat);
      drumNextTime += Math.max(duration, 0.05);
      drumIndex += 1;
    }
  } catch {
    // Never let music break gameplay.
    stopMusic();
  }
}

export function startMusic(themeName) {
  stopMusic();
  if (!MUSIC_THEMES[themeName]) return false;
  const ctx = getSharedContext();
  if (!ctx) return false;

  currentThemeName = themeName;
  musicBus = ctx.createGain();
  musicBus.gain.value = isMuted() ? 0 : 1;
  musicBus.connect(ctx.destination);
  nextNoteTime = ctx.currentTime + 0.1;
  loopIndex = 0;
  bassIndex = 0;
  bassNextTime = nextNoteTime;
  drumIndex = 0;
  drumNextTime = nextNoteTime;
  schedulerTick();
  schedulerTimer = setInterval(schedulerTick, 400);
  return true;
}

export function stopMusic() {
  currentThemeName = null;
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (musicBus) {
    try { musicBus.disconnect(); } catch { /* already gone */ }
    musicBus = null;
  }
}

export function getMusicTheme() {
  return currentThemeName;
}
