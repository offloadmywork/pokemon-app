import { describe, it, expect, beforeEach } from 'vitest';
import {
  TUTORIAL_STEPS,
  getTutorialState,
  completeStep,
  resetTutorial,
  getActiveStepForPage,
  isTutorialComplete,
} from './tutorial.js';

beforeEach(() => {
  localStorage.clear();
});

// Scenario: A brand-new trainer gets guided step by step
//   Given no tutorial progress saved
//   When steps are requested per page
//   Then each page surfaces its first incomplete step in order
describe('tutorial state', () => {
  it('starts with nothing completed', () => {
    expect(getTutorialState().completedSteps).toEqual([]);
    expect(isTutorialComplete()).toBe(false);
  });

  it('exposes ordered steps across home, browse, and team pages', () => {
    const pages = TUTORIAL_STEPS.map((step) => step.page);
    expect(pages).toContain('home');
    expect(pages).toContain('browse');
    expect(pages).toContain('team');
    // Steps have stable ids
    expect(new Set(TUTORIAL_STEPS.map((s) => s.id)).size).toBe(TUTORIAL_STEPS.length);
  });

  it('returns the first incomplete step for a page', () => {
    const step = getActiveStepForPage('home');
    expect(step).not.toBeNull();
    expect(step.id).toBe(TUTORIAL_STEPS.find((s) => s.page === 'home').id);
  });

  it('completing a step persists it and advances to the next', () => {
    const first = TUTORIAL_STEPS[0];
    completeStep(first.id);
    expect(getTutorialState().completedSteps).toContain(first.id);
    expect(getActiveStepForPage(first.page)?.id).not.toBe(first.id);
  });

  it('reports null when a page has no remaining steps', () => {
    TUTORIAL_STEPS.filter((s) => s.page === 'home').forEach((s) => completeStep(s.id));
    expect(getActiveStepForPage('home')).toBeNull();
  });

  it('marks the whole tutorial complete only when every step is done', () => {
    TUTORIAL_STEPS.slice(0, -1).forEach((s) => completeStep(s.id));
    expect(isTutorialComplete()).toBe(false);
    completeStep(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].id);
    expect(isTutorialComplete()).toBe(true);
  });

  it('survives corrupted saved state without throwing', () => {
    localStorage.setItem('pokemon-tutorial', '{{{bad');
    expect(getTutorialState().completedSteps).toEqual([]);
  });

  it('can be reset for replay', () => {
    TUTORIAL_STEPS.forEach((s) => completeStep(s.id));
    resetTutorial();
    expect(isTutorialComplete()).toBe(false);
  });
});
