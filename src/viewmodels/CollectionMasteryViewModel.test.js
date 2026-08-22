import { describe, it, expect, vi } from 'vitest';
import { CollectionMasteryViewModel } from './CollectionMasteryViewModel';

const STATUS = {
  caught_count: 12,
  current_tier: { id: 'silver', title: 'Silver Curator' },
  tiers: [
    { id: 'bronze', title: 'Bronze Collector', target: 0, claimed: true, claimable: false },
    { id: 'silver', title: 'Silver Curator', target: 10, claimed: false, claimable: true },
    { id: 'gold', title: 'Gold Archivist', target: 25, claimed: false, claimable: false },
    { id: 'master', title: 'Master Pokédex', target: 50, claimed: false, claimable: false },
  ],
  unclaimed_rewards: [
    { id: 'silver', reward: { coins: 100, shards: 1 } },
  ],
};

function createApiClient(overrides = {}) {
  return {
    getMasteryStatus: vi.fn(async () => ({ ...STATUS, tiers: STATUS.tiers.map((t) => ({ ...t })) })),
    claimMasteryTier: vi.fn(async () => ({
      tier: { ...STATUS.tiers[1], claimed: true, claimable: false },
      wallet: { coins: 100 },
      caught_count: 12,
    })),
    ...overrides,
  };
}

// Scenario: Trainer opens Home and sees their mastery standing
//   Given the API returns mastery status
//   When the ViewModel loads
//   Then tiers populate with the current tier identified
describe('CollectionMasteryViewModel load', () => {
  it('loads mastery status and flags the current tier', async () => {
    const vm = new CollectionMasteryViewModel(createApiClient());
    await vm.loadStatus();
    expect(vm.tiers).toHaveLength(4);
    expect(vm.currentTier.id).toBe('silver');
    expect(vm.caughtCount).toBe(12);
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBeNull();
  });

  it('records a load error without throwing', async () => {
    const vm = new CollectionMasteryViewModel(createApiClient({
      getMasteryStatus: vi.fn(async () => { throw new Error('offline'); }),
    }));
    await vm.loadStatus();
    expect(vm.error).toBe('offline');
    expect(vm.tiers).toEqual([]);
  });
});

// Scenario: Claiming a reached milestone updates local state once
//   Given a claimable tier
//   When the trainer claims it
//   Then the tier flips to claimed and wallet feedback is stored
describe('CollectionMasteryViewModel claim', () => {
  it('claims a tier and stores wallet feedback', async () => {
    const vm = new CollectionMasteryViewModel(createApiClient());
    await vm.loadStatus();
    const result = await vm.claimTier('silver');

    expect(result.wallet.coins).toBe(100);
    const silver = vm.tiers.find((tier) => tier.id === 'silver');
    expect(silver.claimed).toBe(true);
    expect(silver.claimable).toBe(false);
  });

  it('surfaces claim errors without mutating tiers', async () => {
    const api = createApiClient({
      claimMasteryTier: vi.fn(async () => { throw new Error('not reached'); }),
    });
    const vm = new CollectionMasteryViewModel(api);
    await vm.loadStatus();
    const result = await vm.claimTier('master');

    expect(result).toBeNull();
    expect(vm.claimError).toBe('not reached');
    expect(vm.tiers.find((tier) => tier.id === 'master').claimed).toBe(false);
  });

  it('identifies whether any tier is currently claimable', () => {
    const vm = new CollectionMasteryViewModel(createApiClient());
    vm.setStatus(JSON.parse(JSON.stringify(STATUS)));
    expect(vm.hasClaimableTiers()).toBe(true);

    vm.setStatus({
      ...JSON.parse(JSON.stringify(STATUS)),
      tiers: STATUS.tiers.map((tier) => ({ ...tier, claimable: false })),
    });
    expect(vm.hasClaimableTiers()).toBe(false);
  });
});
