import { describe, expect, it, vi } from 'vitest';
import { CosmeticsViewModel } from './CosmeticsViewModel';

const createApi = (overrides = {}) => ({
  getWallet: vi.fn().mockResolvedValue({ user_id: 'user-1', coins: 200, shards: 3 }),
  getCosmetics: vi.fn().mockResolvedValue({
    user_id: 'user-1',
    cosmetics: [{ cosmetic_id: 'trainer_card_bronze', equipped: false }],
  }),
  purchaseCosmetic: vi.fn().mockResolvedValue({
    success: true,
    cosmetic_id: 'premier_ball_skin',
    total_cost: 2,
    currency: 'shards',
    wallet: { user_id: 'user-1', coins: 200, shards: 1 },
    cosmetic: { cosmetic_id: 'premier_ball_skin', equipped: false },
  }),
  equipCosmetic: vi.fn().mockResolvedValue({
    success: true,
    cosmetic_id: 'trainer_card_bronze',
    slot: 'trainer_card',
    cosmetic: { cosmetic_id: 'trainer_card_bronze', equipped: true },
  }),
  ...overrides,
});

describe('CosmeticsViewModel', () => {
  it('loads wallet, owned cosmetics, and cosmetic catalog options', async () => {
    const vm = new CosmeticsViewModel(createApi());

    await vm.loadCosmetics();

    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 200, shards: 3 });
    expect(vm.ownedCosmetics).toEqual({ trainer_card_bronze: { equipped: false } });
    expect(vm.catalog.find((cosmetic) => cosmetic.cosmetic_id === 'trainer_card_bronze')).toMatchObject({
      name: 'Bronze Trainer Card',
      cost: 120,
      currency: 'coins',
    });
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBeNull();
  });

  it('purchases a cosmetic and updates wallet plus owned state', async () => {
    const api = createApi();
    const vm = new CosmeticsViewModel(api);
    await vm.loadCosmetics();

    const result = await vm.purchase('premier_ball_skin');

    expect(api.purchaseCosmetic).toHaveBeenCalledWith('premier_ball_skin');
    expect(result).toEqual(expect.objectContaining({ total_cost: 2, currency: 'shards' }));
    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 200, shards: 1 });
    expect(vm.ownedCosmetics).toEqual({
      trainer_card_bronze: { equipped: false },
      premier_ball_skin: { equipped: false },
    });
    expect(vm.lastPurchase).toEqual(expect.objectContaining({ cosmetic_id: 'premier_ball_skin' }));
    expect(vm.error).toBeNull();
  });

  it('keeps existing state and stores an error when purchase fails', async () => {
    const api = createApi({
      purchaseCosmetic: vi.fn().mockRejectedValue(new Error('Cosmetic already owned.')),
    });
    const vm = new CosmeticsViewModel(api);
    await vm.loadCosmetics();

    const result = await vm.purchase('trainer_card_bronze');

    expect(result).toBeNull();
    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 200, shards: 3 });
    expect(vm.ownedCosmetics).toEqual({ trainer_card_bronze: { equipped: false } });
    expect(vm.error).toBe('Cosmetic already owned.');
  });

  it('equips an owned cosmetic and updates same-slot equipped state', async () => {
    const api = createApi({
      getCosmetics: vi.fn().mockResolvedValue({
        user_id: 'user-1',
        cosmetics: [{ cosmetic_id: 'trainer_card_bronze', equipped: false }],
      }),
    });
    const vm = new CosmeticsViewModel(api);
    await vm.loadCosmetics();

    const result = await vm.equip('trainer_card_bronze');

    expect(api.equipCosmetic).toHaveBeenCalledWith('trainer_card_bronze');
    expect(result).toEqual(expect.objectContaining({ cosmetic_id: 'trainer_card_bronze' }));
    expect(vm.ownedCosmetics).toEqual({ trainer_card_bronze: { equipped: true } });
    expect(vm.lastEquipped).toEqual(expect.objectContaining({ cosmetic_id: 'trainer_card_bronze' }));
    expect(vm.error).toBeNull();
  });

  it('keeps existing state and stores an error when equip fails', async () => {
    const api = createApi({
      equipCosmetic: vi.fn().mockRejectedValue(new Error('Cosmetic is not owned.')),
    });
    const vm = new CosmeticsViewModel(api);
    await vm.loadCosmetics();

    const result = await vm.equip('premier_ball_skin');

    expect(result).toBeNull();
    expect(vm.ownedCosmetics).toEqual({ trainer_card_bronze: { equipped: false } });
    expect(vm.error).toBe('Cosmetic is not owned.');
  });
});
