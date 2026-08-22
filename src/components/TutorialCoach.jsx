import { useEffect, useState, useRef } from 'react';
import {
  getActiveStepForPage,
  completeStep,
  TUTORIAL_STEPS,
} from '@/game/tutorial';
import { playSfx } from '@/game/audio';

// ═══════════════════════════════════════════
// TUTORIAL COACH — first-run guided tips (Epic E3)
// Renders the next incomplete step for a page; hides itself when done.
// ═══════════════════════════════════════════

export default function TutorialCoach({ page }) {
  const [step, setStep] = useState(() => getActiveStepForPage(page));
  const [hidden, setHidden] = useState(false);
  const primaryButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const handleGotItRef = useRef(() => {});

  // Re-check when navigating between pages.
  useEffect(() => {
    setStep(getActiveStepForPage(page));
    setHidden(false);
  }, [page]);

  // Focus management: pull focus into the dialog, restore it on close.
  useEffect(() => {
    if (step && !hidden) {
      previousFocusRef.current = document.activeElement;
      primaryButtonRef.current?.focus?.();
    }
    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    };
  }, [step, hidden]);

  // Escape dismisses the current step.
  useEffect(() => {
    if (hidden || !step) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleGotItRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hidden, step]);

  if (hidden || !step) return null;

  const stepsForPage = TUTORIAL_STEPS.filter((s) => s.page === page);
  const stepIndex = stepsForPage.findIndex((s) => s.id === step.id) + 1;

  const handleGotIt = () => {
    playSfx('ui_tap');
    completeStep(step.id);
    setStep(getActiveStepForPage(page));
  };

  handleGotItRef.current = handleGotIt;

  const handleSkip = () => {
    playSfx('ui_tap');
    TUTORIAL_STEPS.forEach((s) => completeStep(s.id));
    setHidden(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Tip"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-md"
    >
      <div className="pixel-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#a2671b] mb-1">
              Tip {stepIndex}/{stepsForPage.length}
            </p>
            <h2 className="text-sm md:text-base font-black pixel-text">{step.title}</h2>
            <p className="mt-1 text-xs md:text-sm font-bold pixel-muted">{step.body}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] font-bold text-[#5c4320]/60 hover:text-[#5c4320] underline"
          >
            Skip tutorial
          </button>
          <button
            type="button"
            ref={primaryButtonRef}
            onClick={handleGotIt}
            className="pixel-btn pixel-btn-success px-4 py-2 text-xs font-black rounded-none"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
