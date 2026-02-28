import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DailyQuestsViewModel } from './DailyQuestsViewModel';

const mockApiClient = {
  getDailyQuests: vi.fn(),
  updateDailyQuestProgress: vi.fn(),
  claimDailyQuest: vi.fn(),
};

describe('DailyQuestsViewModel', () => {
  let vm;

  beforeEach(() => {
    vi.clearAllMocks();
    vm = new DailyQuestsViewModel(mockApiClient);
  });

  it('starts with empty state', () => {
    expect(vm.quests).toEqual([]);
    expect(vm.isLoading).toBe(true);
    expect(vm.error).toBe(null);
  });

  it('loads daily quests from API', async () => {
    const quests = [
      { id: 'q1', title: 'Catch 1 Pokémon', progress: 0, target: 1 },
      { id: 'q2', title: 'Win 1 Battle', progress: 1, target: 1 },
    ];
    mockApiClient.getDailyQuests.mockResolvedValue(quests);

    await vm.loadDailyQuests();

    expect(vm.quests).toEqual(quests);
    expect(vm.isLoading).toBe(false);
  });

  it('handles load errors gracefully', async () => {
    mockApiClient.getDailyQuests.mockRejectedValue(new Error('Network error'));

    await vm.loadDailyQuests();

    expect(vm.error).toBe('Network error');
    expect(vm.isLoading).toBe(false);
  });

  it('updates quest progress', async () => {
    vm.quests = [{ id: 'q1', title: 'Catch 1 Pokémon', progress: 0, target: 1 }];
    mockApiClient.updateDailyQuestProgress.mockResolvedValue({ id: 'q1', progress: 1, target: 1 });

    await vm.updateProgress('q1', 1);

    expect(vm.quests[0].progress).toBe(1);
  });

  it('marks quest as claimed', async () => {
    vm.quests = [{ id: 'q1', progress: 1, target: 1, claimed_at: null }];
    mockApiClient.claimDailyQuest.mockResolvedValue({ id: 'q1', progress: 1, target: 1, claimed_at: '2026-02-27T00:00:00Z' });

    await vm.claimQuest('q1');

    expect(vm.quests[0].claimed_at).toBe('2026-02-27T00:00:00Z');
  });

  it('returns null and keeps quests when update progress fails', async () => {
    vm.quests = [{ id: 'q1', title: 'Catch 1 Pokémon', progress: 0, target: 1 }];
    mockApiClient.updateDailyQuestProgress.mockRejectedValue(new Error('Nope'));

    const result = await vm.updateProgress('q1', 1);

    expect(result).toBeNull();
    expect(vm.quests[0].progress).toBe(0);
  });

  it('returns null and keeps quests when claim fails', async () => {
    vm.quests = [{ id: 'q1', progress: 1, target: 1, claimed_at: null }];
    mockApiClient.claimDailyQuest.mockRejectedValue(new Error('Nope'));

    const result = await vm.claimQuest('q1');

    expect(result).toBeNull();
    expect(vm.quests[0].claimed_at).toBeNull();
  });
});
