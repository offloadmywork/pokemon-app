import { describe, it, expect, vi } from 'vitest';
import { WeeklyMissionsViewModel } from './WeeklyMissionsViewModel';

const MISSIONS = [
  { mission_key: 'weekly-catches', event: 'catches', title: 'Catch 5 Pokémon This Week', target: 5, progress: 5, reward_xp: 150, reward_coins: 40, claimed_at: null },
  { mission_key: 'weekly-battles', event: 'battle-wins', title: 'Win 4 Battles This Week', target: 4, progress: 2, reward_xp: 200, reward_coins: 50, claimed_at: null },
];

function createApiClient(overrides = {}) {
  return {
    getWeeklyMissions: vi.fn(async () => ({
      week_key: '2026-W34',
      missions: MISSIONS.map((m) => ({ ...m })),
    })),
    claimAllWeeklyMissions: vi.fn(async () => ({
      totalXp: 150,
      totalCoins: 40,
      claimedCount: 1,
      chestGranted: true,
      chest: { item_id: 'ultra_ball', quantity: 2, coins: 100 },
      wallet: { coins: 140 },
    })),
    ...overrides,
  };
}

// Scenario: Trainer opens the Home panel and sees this week's missions
//   Given the API returns weekly missions
//   When the ViewModel loads
//   Then missions populate and loading/error state clears
describe('WeeklyMissionsViewModel load', () => {
  it('loads weekly missions for the current week', async () => {
    const vm = new WeeklyMissionsViewModel(createApiClient());
    await vm.loadWeeklyMissions();
    expect(vm.missions).toHaveLength(2);
    expect(vm.weekKey).toBe('2026-W34');
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBeNull();
  });

  it('records a load error without throwing', async () => {
    const api = createApiClient({
      getWeeklyMissions: vi.fn(async () => { throw new Error('offline'); }),
    });
    const vm = new WeeklyMissionsViewModel(api);
    await vm.loadWeeklyMissions();
    expect(vm.error).toBe('offline');
    expect(vm.missions).toEqual([]);
  });
});

// Scenario: Completed missions can be claimed with visible feedback
//   Given at least one completed unclaimed mission
//   When claimAll runs
//   Then rewards summary is stored and missions refresh
describe('WeeklyMissionsViewModel claim', () => {
  it('claims all eligible missions and stores the reward summary', async () => {
    const api = createApiClient();
    const vm = new WeeklyMissionsViewModel(api);
    await vm.loadWeeklyMissions();
    await vm.claimAll();

    expect(api.claimAllWeeklyMissions).toHaveBeenCalled();
    expect(vm.lastClaimResult.totalXp).toBe(150);
    expect(vm.lastClaimResult.chestGranted).toBe(true);
  });

  it('flags whether any mission is ready to claim', () => {
    const vm = new WeeklyMissionsViewModel(createApiClient());
    vm.setMissions(MISSIONS.map((m) => ({ ...m })));
    expect(vm.hasClaimableRewards()).toBe(true);

    vm.setMissions(MISSIONS.map((m) => ({ ...m, progress: 0 })));
    expect(vm.hasClaimableRewards()).toBe(false);
  });

  it('clears claim feedback when a new week loads', async () => {
    const vm = new WeeklyMissionsViewModel(createApiClient());
    await vm.loadWeeklyMissions();
    await vm.claimAll();
    await vm.loadWeeklyMissions();
    expect(vm.lastClaimResult).toBeNull();
  });
});
