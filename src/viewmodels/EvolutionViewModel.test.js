import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvolutionViewModel } from './EvolutionViewModel';

const mockApiClient = {
  getEvolutionOptions: vi.fn(),
  evolvePokemon: vi.fn(),
};

describe('EvolutionViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads evolution options from API', async () => {
    mockApiClient.getEvolutionOptions.mockResolvedValue([
      { caught_id: 'c1', from: { name: 'Flametail Jr' }, to: { name: 'Blazetail' }, can_evolve: true },
    ]);

    const vm = new EvolutionViewModel(mockApiClient);
    await vm.loadOptions();

    expect(mockApiClient.getEvolutionOptions).toHaveBeenCalled();
    expect(vm.options).toHaveLength(1);
    expect(vm.options[0].from.name).toBe('Flametail Jr');
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBeNull();
  });

  it('handles API errors', async () => {
    mockApiClient.getEvolutionOptions.mockRejectedValue(new Error('Network error'));

    const vm = new EvolutionViewModel(mockApiClient);
    await vm.loadOptions();

    expect(vm.options).toEqual([]);
    expect(vm.error).toBe('Network error');
    expect(vm.isLoading).toBe(false);
  });

  it('evolves a pokemon and removes it from options', async () => {
    mockApiClient.getEvolutionOptions.mockResolvedValue([
      { caught_id: 'c1', from: { name: 'Flametail Jr' }, to: { name: 'Blazetail' }, can_evolve: true },
      { caught_id: 'c2', from: { name: 'Leaflet' }, to: { name: 'Vinewhip' }, can_evolve: true },
    ]);
    mockApiClient.evolvePokemon.mockResolvedValue({ success: true, caught_id: 'c1' });

    const vm = new EvolutionViewModel(mockApiClient);
    await vm.loadOptions();
    await vm.evolve('c1');

    expect(mockApiClient.evolvePokemon).toHaveBeenCalledWith('c1');
    expect(vm.options).toHaveLength(1);
    expect(vm.options[0].caught_id).toBe('c2');
  });
});
