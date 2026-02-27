import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Leaderboards from './Leaderboards';

describe('Leaderboards Page', () => {
  it('sorts level entries by level then xp and recalculates ranks', async () => {
    const mockApi = {
      getLeaderboard: vi.fn().mockResolvedValue({
        key: 'level',
        entries: [
          {
            user_id: 'bbb222',
            score: 2,
            detail: { level: 2, xp: 10 },
            rank: 3,
          },
          {
            user_id: 'aaa111',
            score: 3,
            detail: { level: 3, xp: 5 },
            rank: 2,
          },
          {
            user_id: 'ccc333',
            score: 3,
            detail: { level: 3, xp: 20 },
            rank: 1,
          },
        ],
      }),
    };

    render(<Leaderboards onNavigate={vi.fn()} apiClient={mockApi} />);

    const trainers = await screen.findAllByText(/Trainer/);
    const trainerNames = trainers.map((node) => node.textContent);

    expect(trainerNames[0]).toBe('Trainer CCC333');
    expect(trainerNames[1]).toBe('Trainer AAA111');
    expect(trainerNames[2]).toBe('Trainer BBB222');

  });
});
