import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChallengeTowerViewModel } from './ChallengeTowerViewModel';

const mockApiClient = {
  getChallengeTower: vi.fn(),
  completeChallengeTowerFloor: vi.fn(),
};

describe('ChallengeTowerViewModel', () => {
  let vm;

  beforeEach(() => {
    vi.clearAllMocks();
    vm = new ChallengeTowerViewModel(mockApiClient);
  });

  it('starts with empty state', () => {
    expect(vm.floors).toEqual([]);
    expect(vm.progress).toBe(null);
    expect(vm.currentFloor).toBe(null);
    expect(vm.isLoading).toBe(true);
    expect(vm.error).toBe(null);
  });

  it('loads tower data from API', async () => {
    const data = {
      floors: [{ floor: 1, name: 'Sprout Steps' }],
      progress: { current_floor: 1, best_floor: 1 },
      current_floor: { floor: 1, name: 'Sprout Steps' },
    };
    mockApiClient.getChallengeTower.mockResolvedValue(data);

    await vm.loadTower();

    expect(vm.floors).toEqual(data.floors);
    expect(vm.progress).toEqual(data.progress);
    expect(vm.currentFloor).toEqual(data.current_floor);
    expect(vm.isLoading).toBe(false);
  });

  it('handles load errors gracefully', async () => {
    mockApiClient.getChallengeTower.mockRejectedValue(new Error('Network error'));

    await vm.loadTower();

    expect(vm.error).toBe('Network error');
    expect(vm.isLoading).toBe(false);
  });

  it('completes a floor and updates state', async () => {
    const data = {
      floors: [{ floor: 1 }, { floor: 2 }],
      progress: { current_floor: 2, best_floor: 1 },
      current_floor: { floor: 2 },
    };
    mockApiClient.completeChallengeTowerFloor.mockResolvedValue(data);

    await vm.completeFloor(1);

    expect(vm.progress.current_floor).toBe(2);
    expect(vm.currentFloor.floor).toBe(2);
  });
});
