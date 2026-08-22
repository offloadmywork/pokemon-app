import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TutorialCoach from './TutorialCoach';
import { completeStep, resetTutorial, TUTORIAL_STEPS } from '@/game/tutorial';

beforeEach(() => {
  localStorage.clear();
  resetTutorial();
});

describe('TutorialCoach', () => {
  it('renders the first step for the given page', () => {
    render(<TutorialCoach page="home" />);
    expect(screen.getByRole('dialog', { name: 'Tip' })).toBeInTheDocument();
  });

  it('advances to the next step on the page when dismissed', () => {
    render(<TutorialCoach page="home" />);
    const homeStepCount = TUTORIAL_STEPS.filter((s) => s.page === 'home').length;

    for (let i = 0; i < homeStepCount; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /got it/i }));
      // Re-render between steps happens internally; if coach hides early we stop.
    }

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides itself once all steps are completed', () => {
    TUTORIAL_STEPS.forEach((step) => completeStep(step.id));
    render(<TutorialCoach page="home" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('supports skipping the entire tutorial', () => {
    render(<TutorialCoach page="home" />);
    fireEvent.click(screen.getByRole('button', { name: /skip tutorial/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', {}, { timeout: 100 })).not.toBeInTheDocument();
  });

  // Scenario: Keyboard and screen-reader users get proper dialog behavior
  //   Given the coach dialog appears
  //   When it mounts
  //   Then focus moves to the primary action, Escape dismisses, and
  //   focus returns to where it was when the dialog closes
  it('moves focus into the dialog on mount', () => {
    render(<TutorialCoach page="home" />);
    const gotIt = screen.getByRole('button', { name: /got it/i });
    expect(gotIt).toHaveFocus();
  });

  it('dismisses the current step on Escape', () => {
    const homeStepCount = TUTORIAL_STEPS.filter((s) => s.page === 'home').length;
    render(<TutorialCoach page="home" />);

    for (let i = 0; i < homeStepCount; i += 1) {
      fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
    }

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores focus to the previously focused element after closing', () => {
    const launcher = document.createElement('button');
    document.body.appendChild(launcher);
    launcher.focus();
    expect(launcher).toHaveFocus();

    const { unmount } = render(<TutorialCoach page="home" />);
    expect(screen.getByRole('button', { name: /got it/i })).toHaveFocus();

    TUTORIAL_STEPS.filter((s) => s.page === 'home').forEach(() => {
      fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    });
    unmount();

    expect(launcher).toHaveFocus();
    launcher.remove();
  });
});
