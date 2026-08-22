import { describe, expect, it, vi } from 'vitest';
import { AchievementsViewModel } from './AchievementsViewModel';

const createApi = (overrides = {}) => ({
  getAchievements: vi.fn().mockResolvedValue({
    user_id: 'user-1',
    progress: { collection: 26 },
    achievements: [
      {
        achievement_id: 'collect_10',
        title: 'First Box Filled',
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

describe('AchievementsViewModel', () => {
  it('loads achievement progress and catalog state', async () => {
    const api = createApi();
    const viewModel = new AchievementsViewModel(api);

    const result = await viewModel.loadAchievements();

    expect(api.getAchievements).toHaveBeenCalledTimes(1);
    expect(result.progress).toEqual({ collection: 26 });
    expect(viewModel.achievements).toHaveLength(2);
    expect(viewModel.getClaimableCount()).toBe(1);
    expect(viewModel.error).toBeNull();
    expect(viewModel.isLoading).toBe(false);
  });

  it('claims an achievement and marks it claimed locally', async () => {
    const api = createApi();
    const viewModel = new AchievementsViewModel(api);

    await viewModel.loadAchievements();
    const result = await viewModel.claim('collect_25');

    expect(api.claimAchievement).toHaveBeenCalledWith('collect_25');
    expect(result.reward).toEqual({ coins: 150, shards: 1 });
    expect(viewModel.lastClaim).toEqual(result);
    expect(viewModel.wallet).toEqual({ user_id: 'user-1', coins: 160, shards: 1 });
    expect(viewModel.achievements.find((achievement) => achievement.achievement_id === 'collect_25')).toMatchObject({
      claimed: true,
      claimable: false,
    });
  });

  it('keeps loaded achievements visible when claim fails', async () => {
    const api = createApi({
      claimAchievement: vi.fn().mockRejectedValue(new Error('Achievement already claimed.')),
    });
    const viewModel = new AchievementsViewModel(api);

    await viewModel.loadAchievements();
    const result = await viewModel.claim('collect_25');

    expect(result).toBeNull();
    expect(viewModel.error).toBe('Achievement already claimed.');
    expect(viewModel.achievements).toHaveLength(2);
    expect(viewModel.isClaiming).toBe(false);
  });
});
