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
    return {
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

export function setMuted(muted) {
  saveSettings({ ...loadSettings(), muted: Boolean(muted) });
}

export function toggleMuted() {
  const next = !isMuted();
  setMuted(next);
  return next;
}

// note = [frequencyHz or 0(rest), beats, waveform]; beats are quarter-note counts.
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
  },
};

export { MUSIC_THEMES };

let currentThemeName = null;
let schedulerTimer = null;
let nextNoteTime = 0;
let loopIndex = 0;

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
  amplifier.connect(ctx.destination);
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

    const secondsPerBeat = 60 / theme.bpm;
    // Schedule ~1.5s ahead of the playhead for smooth looping.
    while (nextNoteTime < ctx.currentTime + 1.5) {
      const note = theme.notes[loopIndex % theme.notes.length];
      const duration = note[1] * secondsPerBeat;
      scheduleNote(ctx, theme, note, nextNoteTime);
      nextNoteTime += Math.max(duration, 0.05);
      loopIndex += 1;
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
  nextNoteTime = ctx.currentTime + 0.1;
  loopIndex = 0;
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
}

export function getMusicTheme() {
  return currentThemeName;
}
