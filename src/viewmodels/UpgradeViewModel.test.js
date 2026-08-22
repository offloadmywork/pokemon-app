import { describe, expect, it, vi } from 'vitest';
import { UpgradeViewModel } from './UpgradeViewModel';

const createApi = (overrides = {}) => ({
  getWallet: vi.fn().mockResolvedValue({ user_id: 'user-1', coins: 300, shards: 0 }),
  getUpgrades: vi.fn().mockResolvedValue({ user_id: 'user-1', upgrades: { bag_slots: 1 } }),
  purchaseUpgrade: vi.fn().mockResolvedValue({
    success: true,
    upgrade_id: 'bag_slots',
    current_level: 1,
    next_level: 2,
    total_cost: 180,
    wallet: { user_id: 'user-1', coins: 120, shards: 0 },
    upgrade: { upgrade_id: 'bag_slots', level: 2 },
  }),
  ...overrides,
});

describe('UpgradeViewModel', () => {
  it('loads wallet, upgrade levels, and upgrade catalog state', async () => {
    const vm = new UpgradeViewModel(createApi());

    await vm.loadUpgrades();

    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 300, shards: 0 });
    expect(vm.upgrades).toEqual({ bag_slots: 1 });
    expect(vm.catalog.find((upgrade) => upgrade.upgrade_id === 'bag_slots')).toMatchObject({
      name: 'Bag Slots',
      max_level: 5,
    });
    expect(vm.getUpgradeCost('bag_slots')).toBe(180);
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBeNull();
  });

  it('purchases an upgrade and updates wallet plus upgrade level state', async () => {
    const api = createApi();
    const vm = new UpgradeViewModel(api);
    await vm.loadUpgrades();

    const result = await vm.purchase('bag_slots');

    expect(api.purchaseUpgrade).toHaveBeenCalledWith('bag_slots');
    expect(result).toEqual(expect.objectContaining({ next_level: 2 }));
    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 120, shards: 0 });
    expect(vm.upgrades).toEqual({ bag_slots: 2 });
    expect(vm.lastPurchase).toEqual(expect.objectContaining({ upgrade_id: 'bag_slots' }));
    expect(vm.error).toBeNull();
  });

  it('keeps existing state and stores an error when purchase fails', async () => {
    const api = createApi({
      purchaseUpgrade: vi.fn().mockRejectedValue(new Error('Upgrade already maxed.')),
    });
    const vm = new UpgradeViewModel(api);
    await vm.loadUpgrades();

    const result = await vm.purchase('bag_slots');

    expect(result).toBeNull();
    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 300, shards: 0 });
    expect(vm.upgrades).toEqual({ bag_slots: 1 });
    expect(vm.error).toBe('Upgrade already maxed.');
  });
});
