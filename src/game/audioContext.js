// Shared, lazily-created WebAudio context.
// Browsers require a user gesture before audio can start; callers should
// trigger the first playSfx from inside a click/keydown handler.

let sharedContext = null;

function create() {
  const Ctor = typeof window !== 'undefined'
    && (window.AudioContext || window.webkitAudioContext);
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function getSharedContext() {
  if (typeof window === 'undefined') return null;
  if (!sharedContext) sharedContext = create();
  if (sharedContext?.state === 'suspended') {
    // Best-effort resume; browsers allow this after a user gesture.
    sharedContext.resume?.().catch(() => {});
  }
  return sharedContext;
}
