import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CosmeticsPanel from './CosmeticsPanel';

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

describe('CosmeticsPanel', () => {
  it('loads wallet currencies and cosmetic catalog state', async () => {
    render(<CosmeticsPanel apiClient={createApi()} />);

    expect(await screen.findByText('Trainer Cosmetics')).toBeInTheDocument();
    expect(screen.getByText('200 coins')).toBeInTheDocument();
    expect(screen.getByText('3 shards')).toBeInTheDocument();
    expect(screen.getByText('Bronze Trainer Card')).toBeInTheDocument();
    expect(screen.getByText('Premier Ball Skin')).toBeInTheDocument();
    expect(screen.getAllByText('Owned').length).toBeGreaterThan(0);
    expect(screen.getByText('2 shards')).toBeInTheDocument();
  });

  it('buys a cosmetic and refreshes wallet plus owned feedback', async () => {
    const api = createApi();
    render(<CosmeticsPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Buy Premier Ball Skin'));

    expect(api.purchaseCosmetic).toHaveBeenCalledWith('premier_ball_skin');
    expect(await screen.findByText('Unlocked Premier Ball Skin for 2 shards.')).toBeInTheDocument();
    expect(screen.getByText('1 shards')).toBeInTheDocument();
    expect(screen.getAllByText('Owned').length).toBeGreaterThan(1);
  });

  it('surfaces cosmetic purchase errors without clearing loaded state', async () => {
    const api = createApi({
      purchaseCosmetic: vi.fn().mockRejectedValue(new Error('Cosmetic already owned.')),
    });
    render(<CosmeticsPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Buy Premier Ball Skin'));

    expect(await screen.findByText('Cosmetic purchase failed')).toBeInTheDocument();
    expect(screen.getByText('Cosmetic already owned.')).toBeInTheDocument();
    expect(screen.getByText('200 coins')).toBeInTheDocument();
    expect(screen.getByText('Bronze Trainer Card')).toBeInTheDocument();
  });

  it('equips an owned cosmetic and shows equipped feedback', async () => {
    const api = createApi();
    render(<CosmeticsPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Equip Bronze Trainer Card'));

    expect(api.equipCosmetic).toHaveBeenCalledWith('trainer_card_bronze');
    expect(await screen.findByText('Equipped Bronze Trainer Card.')).toBeInTheDocument();
    expect(screen.getAllByText('Equipped').length).toBeGreaterThan(0);
  });

  it('surfaces equip errors without clearing loaded state', async () => {
    const api = createApi({
      equipCosmetic: vi.fn().mockRejectedValue(new Error('Cosmetic is not owned.')),
    });
    render(<CosmeticsPanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Equip Bronze Trainer Card'));

    expect(await screen.findByText('Cosmetic action failed')).toBeInTheDocument();
    expect(screen.getByText('Cosmetic is not owned.')).toBeInTheDocument();
    expect(screen.getByText('Bronze Trainer Card')).toBeInTheDocument();
  });
});
