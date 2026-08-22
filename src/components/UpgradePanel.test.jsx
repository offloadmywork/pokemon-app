import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import UpgradePanel from './UpgradePanel';

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

describe('UpgradePanel', () => {
  it('loads wallet coins and trainer upgrade options', async () => {
    render(<UpgradePanel apiClient={createApi()} />);

    expect(await screen.findByText('Trainer Upgrades')).toBeInTheDocument();
    expect(screen.getByText('300 coins')).toBeInTheDocument();
    expect(screen.getByText('Bag Slots')).toBeInTheDocument();
    expect(screen.getByText('Level 1 / 5')).toBeInTheDocument();
    expect(screen.getAllByText('180 coins').length).toBeGreaterThan(0);
  });

  it('purchases an upgrade and refreshes wallet plus level feedback', async () => {
    const api = createApi();
    render(<UpgradePanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Upgrade Bag Slots'));

    expect(api.purchaseUpgrade).toHaveBeenCalledWith('bag_slots');
    expect(await screen.findByText('Upgraded Bag Slots to level 2 for 180 coins.')).toBeInTheDocument();
    expect(screen.getByText('120 coins')).toBeInTheDocument();
    expect(screen.getByText('Level 2 / 5')).toBeInTheDocument();
  });

  it('surfaces upgrade errors without clearing loaded upgrade state', async () => {
    const api = createApi({
      purchaseUpgrade: vi.fn().mockRejectedValue(new Error('Upgrade already maxed.')),
    });
    render(<UpgradePanel apiClient={api} />);

    fireEvent.click(await screen.findByText('Upgrade Bag Slots'));

    expect(await screen.findByText('Upgrade failed')).toBeInTheDocument();
    expect(screen.getByText('Upgrade already maxed.')).toBeInTheDocument();
    expect(screen.getByText('300 coins')).toBeInTheDocument();
    expect(screen.getByText('Level 1 / 5')).toBeInTheDocument();
  });
});
