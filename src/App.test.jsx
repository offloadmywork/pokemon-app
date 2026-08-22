import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

vi.mock('@/config/featureFlags', () => ({
  featureFlags: {
    leaderboards: true,
  },
}));

vi.mock('@/pages/Home', () => ({
  default: () => <main>Home Screen</main>,
}));

vi.mock('@/pages/Browse', () => ({
  default: () => <main>Map Screen</main>,
}));

vi.mock('@/pages/Collection', () => ({
  default: () => <main>Collection Screen</main>,
}));

vi.mock('@/pages/Leaderboards', () => ({
  default: () => <main>Rankings Screen</main>,
}));

describe('App mobile navigation', () => {
  it('keeps primary destinations reachable from a bottom tab shell', () => {
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: /primary/i });
    const destinations = [
      ['Home', 'Home Screen'],
      ['Map', 'Map Screen'],
      ['Collection', 'Collection Screen'],
      ['Team', 'Collection Screen'],
      ['Rankings', 'Rankings Screen'],
    ];

    destinations.forEach(([label, screenText]) => {
      const tab = within(navigation).getByRole('button', { name: label });
      fireEvent.click(tab);
      expect(screen.getByText(screenText)).toBeInTheDocument();
    });
  });

  it('reserves bottom safe-area space and keeps tabs touch friendly', () => {
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: /primary/i });
    expect(navigation).toHaveStyle({
      paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
    });

    within(navigation).getAllByRole('button').forEach((tab) => {
      expect(tab).toHaveClass('min-h-14');
    });
  });

  it('reserves nav-height space below routed page content', () => {
    render(<App />);

    expect(screen.getByTestId('app-content')).toHaveStyle({
      paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
    });
  });
});
