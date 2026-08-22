import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import CollectionMasteryPanel from './CollectionMasteryPanel';

const mockApiClient = {
  getMasteryStatus: vi.fn(),
  claimMasteryTier: vi.fn(),
};

function createStatus() {
  return {
    caught_count: 12,
    current_tier: { id: 'silver', title: 'Silver Curator' },
    tiers: [
      { id: 'bronze', title: 'Bronze Collector', description: 'Every trainer starts here.', target: 0, claimed: true, claimable: false },
      { id: 'silver', title: 'Silver Curator', description: 'Catch 10 unique Pokémon.', target: 10, claimed: false, claimable: true },
      { id: 'gold', title: 'Gold Archivist', description: 'Catch 25 unique Pokémon.', target: 25, claimed: false, claimable: false },
      { id: 'master', title: 'Master Pokédex', description: 'Catch all 50 seeded Pokémon.', target: 50, claimed: false, claimable: false },
    ],
    unclaimed_rewards: [{ id: 'silver' }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('CollectionMasteryPanel', () => {
  it('renders mastery tiers with caught count and current tier', async () => {
    mockApiClient.getMasteryStatus.mockResolvedValue(createStatus());

    render(<CollectionMasteryPanel apiClient={mockApiClient} />);

    expect(await screen.findByText('Silver Curator')).toBeInTheDocument();
    expect(screen.getByText(/12 unique Pokémon caught/)).toBeInTheDocument();
    expect(screen.getByText('Master Pokédex')).toBeInTheDocument();
  });

  it('shows claim buttons only for claimable tiers', async () => {
    mockApiClient.getMasteryStatus.mockResolvedValue(createStatus());

    render(<CollectionMasteryPanel apiClient={mockApiClient} />);

    const claimButtons = await screen.findAllByRole('button', { name: /claim/i });
    expect(claimButtons).toHaveLength(1);
  });

  it('claims a tier and shows reward feedback', async () => {
    mockApiClient.getMasteryStatus.mockResolvedValue(createStatus());
    mockApiClient.claimMasteryTier.mockResolvedValue({
      tier: { id: 'silver', claimed: true, claimable: false },
      wallet: { coins: 100, shards: 1 },
      caught_count: 12,
    });

    render(<CollectionMasteryPanel apiClient={mockApiClient} />);
    const claimButton = await screen.findByRole('button', { name: /claim/i });

    await act(async () => {
      fireEvent.click(claimButton);
    });

    expect(mockApiClient.claimMasteryTier).toHaveBeenCalledWith('silver');
    expect(await screen.findByText(/\+100 coins/)).toBeInTheDocument();
  });

  it('shows an error message when a claim fails', async () => {
    mockApiClient.getMasteryStatus.mockResolvedValue(createStatus());
    mockApiClient.claimMasteryTier.mockRejectedValue(new Error('Mastery tier is not reached yet.'));

    render(<CollectionMasteryPanel apiClient={mockApiClient} />);
    const claimButton = await screen.findByRole('button', { name: /claim/i });

    await act(async () => {
      fireEvent.click(claimButton);
    });

    expect(await screen.findByText(/not reached/i)).toBeInTheDocument();
  });
});
