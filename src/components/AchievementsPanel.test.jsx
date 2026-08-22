import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AchievementsPanel from './AchievementsPanel';

const createApi = (overrides = {}) => ({
  getAchievements: vi.fn().mockResolvedValue({
    user_id: 'user-1',
    progress: { collection: 26 },
    achievements: [
      {
        achievement_id: 'collect_10',
        title: 'First Box Filled',
        description: 'Catch 10 unique Pokemon.',
        category: 'collection',
        target: 10,
        progress: 26,
        reward: { coins: 75, shards: 0 },
        claimed: true,
        claimable: false,
      },
      {
        achievement_id: 'collect_25',
        title: 'Growing Pokedex',
        description: 'Catch 25 unique Pokemon.',
        category: 'collection',
        target: 25,
        progress: 26,
        reward: { coins: 150, shards: 1 },
        claimed: false,
        claimable: true,
      },
    ],
  }),
  claimAchievement: vi.fn().mockResolvedValue({
    success: true,
    achievement_id: 'collect_25',
    reward: { coins: 150, shards: 1 },
    wallet: { user_id: 'user-1', coins: 160, shards: 1 },
  }),
  ...overrides,
});

describe('AchievementsPanel', () => {
  it('loads achievement milestones with collection progress and claimable state', async () => {
    render(<AchievementsPanel apiClient={createApi()} />);

    expect(await screen.findByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('26 caught')).toBeInTheDocument();
    expect(screen.getByText('Growing Pokedex')).toBeInTheDocument();
    expect(screen.getByText('150 coins')).toBeInTheDocument();
    expect(screen.getByText('1 shards')).toBeInTheDocument();
    expect(screen.getByText('Ready to claim')).toBeInTheDocument();
    expect(screen.getAllByText('Claimed').length).toBeGreaterThan(0);
  });

  it('claims a milestone and shows wallet reward feedback', async () => {
    const api = createApi();
    render(<AchievementsPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Claim Growing Pokedex'));

    expect(api.claimAchievement).toHaveBeenCalledWith('collect_25');
    expect(await screen.findByText('Claimed Growing Pokedex for 150 coins and 1 shards.')).toBeInTheDocument();
    expect(screen.getAllByText('Claimed').length).toBeGreaterThan(1);
  });

  it('surfaces claim errors without clearing loaded milestones', async () => {
    const api = createApi({
      claimAchievement: vi.fn().mockRejectedValue(new Error('Achievement already claimed.')),
    });
    render(<AchievementsPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Claim Growing Pokedex'));

    expect(await screen.findByText('Achievement claim failed')).toBeInTheDocument();
    expect(screen.getByText('Achievement already claimed.')).toBeInTheDocument();
    expect(screen.getByText('Growing Pokedex')).toBeInTheDocument();
  });
});
