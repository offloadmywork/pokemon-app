import { describe, it, expect, vi } from 'vitest';
import { CollectionMasteryViewModel } from './CollectionMasteryViewModel';

const MASTERY_STATUS = {
  caught_count: 12,
  current_tier: { id: 'silver', title: 'Silver Curator' },
  tiers: [
    { id: 'bronze', title: 'Bronze Collector', target: 0, claimed: true, claimable: false },
    { id: 'silver', title: 'Silver Curator', target: 10, claimed: false, claimable: true },
    { id: 'gold', title: 'Gold Archivist', target: 25, claimed: false, claimable: false },
  ],
  unclaimed_rewards: [
    { id: 'silver', title: 'Silver Curator', reward: { coins: 100 } }
  ]
};

function createApiClient(overrides = {}) {
  return {
    getMasteryStatus: vi.fn(async () => ({ ...MASTERY_STATUS })),
    claimMasteryTier: vi.fn(async () => ({
      tier: { id: 'silver', claimed: true },
      wallet: { coins: 200 }
    })),
    ...overrides,
  };
}

describe('CollectionMasteryViewModel', () => {
  it('loads mastery status from the API', async () => {
    const vm = new CollectionMasteryViewModel(createApiClient());
    await vm.loadMasteryStatus();
    
    expect(vm.status.caught_count).toBe(12);
    expect(vm.status.current_tier.id).toBe('silver');
    expect(vm.isLoading).toBe(false);
  });

  it('claims a tier and refreshes status', async () => {
    const api = createApiClient();
    const vm = new CollectionMasteryViewModel(api);
    await vm.loadMasteryStatus();
    
    const result = await vm.claimTier('silver');
    expect(api.claimMasteryTier).toHaveBeenCalledWith('silver');
    expect(result.wallet.coins).toBe(200);
    expect(vm.lastClaimResult).toEqual(result);
  });

  it('records errors during load', async () => {
    const api = createApiClient({
      getMasteryStatus: vi.fn(async () => { throw new Error('API Error'); })
    });
    const vm = new CollectionMasteryViewModel(api);
    await vm.loadMasteryStatus();
    
    expect(vm.error).toBe('API Error');
    expect(vm.isLoading).toBe(false);
  });
});
