import { describe, expect, it, vi } from 'vitest';
import { ShopViewModel } from './ShopViewModel';

const createApi = (overrides = {}) => ({
  getWallet: vi.fn().mockResolvedValue({ user_id: 'user-1', coins: 100, shards: 0 }),
  getItems: vi.fn().mockResolvedValue([{ item_id: 'pokeball', quantity: 1 }]),
  purchaseShopItem: vi.fn().mockResolvedValue({
    success: true,
    item_id: 'pokeball',
    quantity: 2,
    total_cost: 20,
    wallet: { user_id: 'user-1', coins: 80, shards: 0 },
    item: { item_id: 'pokeball', quantity: 3 },
  }),
  ...overrides,
});

describe('ShopViewModel', () => {
  it('loads wallet, inventory, and purchasable shop listings', async () => {
    const vm = new ShopViewModel(createApi());

    await vm.loadShop();

    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 100, shards: 0 });
    expect(vm.inventory).toEqual({ pokeball: 1 });
    expect(vm.catalog.find((listing) => listing.item_id === 'pokeball')).toMatchObject({
      item_id: 'pokeball',
      cost: 10,
      item: expect.objectContaining({ name: 'Pokeball' }),
    });
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBeNull();
  });

  it('purchases a shop item and updates wallet plus inventory state', async () => {
    const api = createApi();
    const vm = new ShopViewModel(api);
    await vm.loadShop();

    const result = await vm.purchase('pokeball', 2);

    expect(api.purchaseShopItem).toHaveBeenCalledWith('pokeball', 2);
    expect(result).toEqual(expect.objectContaining({ total_cost: 20 }));
    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 80, shards: 0 });
    expect(vm.inventory).toEqual({ pokeball: 3 });
    expect(vm.lastPurchase).toEqual(expect.objectContaining({ item_id: 'pokeball' }));
    expect(vm.error).toBeNull();
  });

  it('keeps existing state and stores an error when purchase fails', async () => {
    const api = createApi({
      purchaseShopItem: vi.fn().mockRejectedValue(new Error('Not enough coins.')),
    });
    const vm = new ShopViewModel(api);
    await vm.loadShop();

    const result = await vm.purchase('ultra_ball', 1);

    expect(result).toBeNull();
    expect(vm.wallet).toEqual({ user_id: 'user-1', coins: 100, shards: 0 });
    expect(vm.inventory).toEqual({ pokeball: 1 });
    expect(vm.error).toBe('Not enough coins.');
  });
});
