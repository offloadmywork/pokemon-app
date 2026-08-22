import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ShopPanel from './ShopPanel';

const createApi = (overrides = {}) => ({
  getWallet: vi.fn().mockResolvedValue({ user_id: 'user-1', coins: 100, shards: 0 }),
  getItems: vi.fn().mockResolvedValue([{ item_id: 'pokeball', quantity: 1 }]),
  purchaseShopItem: vi.fn().mockResolvedValue({
    success: true,
    item_id: 'pokeball',
    quantity: 1,
    total_cost: 10,
    wallet: { user_id: 'user-1', coins: 90, shards: 0 },
    item: { item_id: 'pokeball', quantity: 2 },
  }),
  ...overrides,
});

describe('ShopPanel', () => {
  it('loads wallet coins and purchasable items', async () => {
    render(<ShopPanel apiClient={createApi()} />);

    expect(await screen.findByText('Trainer Shop')).toBeInTheDocument();
    expect(await screen.findByText('100 coins')).toBeInTheDocument();
    expect(screen.getByText('Pokeball')).toBeInTheDocument();
    expect(screen.getByText('Owned: 1')).toBeInTheDocument();
    expect(screen.getByText('10 coins')).toBeInTheDocument();
  });

  it('buys an item and refreshes wallet plus owned quantity feedback', async () => {
    const api = createApi();
    render(<ShopPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Buy Pokeball'));

    expect(api.purchaseShopItem).toHaveBeenCalledWith('pokeball', 1);
    expect(await screen.findByText('Purchased Pokeball for 10 coins.')).toBeInTheDocument();
    expect(screen.getAllByText('90 coins').length).toBeGreaterThan(0);
    expect(screen.getByText('Owned: 2')).toBeInTheDocument();
  });

  it('surfaces purchase errors without clearing loaded shop state', async () => {
    const api = createApi({
      purchaseShopItem: vi.fn().mockRejectedValue(new Error('Not enough coins.')),
    });
    render(<ShopPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Buy Ultra Ball'));

    expect(await screen.findByText('Shop purchase failed')).toBeInTheDocument();
    expect(screen.getByText('Not enough coins.')).toBeInTheDocument();
    expect(screen.getByText('100 coins')).toBeInTheDocument();
  });
});
