// Onboarding tutorial (Epic E3 — Nintendo-Level Quality Plan).
// Pure state module: which guided steps exist, which are done, what's next.

const STORAGE_KEY = 'pokemon-tutorial';

export const TUTORIAL_STEPS = [
  {
    id: 'claim-starters',
    page: 'home',
    title: 'Claim Your First Partners',
    body: 'Tap "Claim Starters" to get your first three Pokémon. Every adventure needs a team!',
  },
  {
    id: 'explore-map',
    page: 'browse',
    title: 'Explore the Map',
    body: 'Use the D-pad or arrow keys to walk around. Paths lead to new areas, and healing spots restore your team.',
  },
  {
    id: 'weaken-then-catch',
    page: 'browse',
    title: 'Weaken, Then Catch',
    body: 'Attack wild Pokémon to lower their HP first — weak Pokémon are much easier to catch. Fainted ones are the easiest of all!',
  },
  {
    id: 'type-advantage',
    page: 'team',
    title: 'Play the Type Matchups',
    body: 'Fire beats Grass, Water beats Fire, Grass beats Water. Build a team with varied types for battle synergy.',
  },
  {
    id: 'daily-quests',
    page: 'home',
    title: 'Come Back Tomorrow',
    body: 'Daily quests and streaks pay bonus items and coins. Weekly missions offer even bigger rewards.',
  },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedSteps: [] };
    const parsed = JSON.parse(raw);
    return { completedSteps: Array.isArray(parsed?.completedSteps) ? parsed.completedSteps : [] };
  } catch {
    return { completedSteps: [] };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable; tutorial progress just won't persist.
  }
}

export function getTutorialState() {
  return loadState();
}

export function isTutorialComplete() {
  const { completedSteps } = loadState();
  return TUTORIAL_STEPS.every((step) => completedSteps.includes(step.id));
}

export function completeStep(stepId) {
  const state = loadState();
  if (!state.completedSteps.includes(stepId)) {
    state.completedSteps.push(stepId);
    saveState(state);
  }
}

export function resetTutorial() {
  saveState({ completedSteps: [] });
}

// First incomplete step for a given page, in defined order.
export function getActiveStepForPage(page) {
  const { completedSteps } = loadState();
  return TUTORIAL_STEPS.find(
    (step) => step.page === page && !completedSteps.includes(step.id)
  ) || null;
}
