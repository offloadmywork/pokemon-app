import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ChallengeTowerPanel from './ChallengeTowerPanel';

describe('ChallengeTowerPanel', () => {
  it('completes the current floor and shows the next floor', async () => {
    const mockApi = {
      getChallengeTower: vi.fn().mockResolvedValue({
        floors: [
          { floor: 1, name: 'Sprout Steps', difficulty: 1, reward_xp: 15 },
          { floor: 2, name: 'Ember Rise', difficulty: 2, reward_xp: 25 },
        ],
        progress: { current_floor: 1, best_floor: 0, last_completed_floor: 0 },
        current_floor: { floor: 1, name: 'Sprout Steps', difficulty: 1, reward_xp: 15 },
      }),
      completeChallengeTowerFloor: vi.fn().mockResolvedValue({
        floors: [
          { floor: 1, name: 'Sprout Steps', difficulty: 1, reward_xp: 15 },
          { floor: 2, name: 'Ember Rise', difficulty: 2, reward_xp: 25 },
        ],
        progress: { current_floor: 2, best_floor: 1, last_completed_floor: 1 },
        current_floor: { floor: 2, name: 'Ember Rise', difficulty: 2, reward_xp: 25 },
      }),
    };

    render(<ChallengeTowerPanel apiClient={mockApi} />);

    expect(await screen.findAllByText('Floor 1: Sprout Steps')).toHaveLength(2);

    fireEvent.click(screen.getByText('Complete'));

    expect(await screen.findAllByText('Floor 2: Ember Rise')).toHaveLength(1);
    expect(screen.getByText('Best: Floor 1')).toBeInTheDocument();
    expect(screen.getByText('Cleared')).toBeInTheDocument();
    expect(mockApi.completeChallengeTowerFloor).toHaveBeenCalledWith(1);
  });
});
