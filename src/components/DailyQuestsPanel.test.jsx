import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DailyQuestsPanel from './DailyQuestsPanel';

const mockApiClient = {
  getDailyQuests: vi.fn(),
  getProgress: vi.fn(),
  updateDailyQuestProgress: vi.fn(),
  claimDailyQuest: vi.fn(),
};

describe('DailyQuestsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.getProgress.mockResolvedValue(null);
  });

  it('renders quests from API', async () => {
    mockApiClient.getDailyQuests.mockResolvedValue([
      { id: 'q1', title: 'Catch 1 Pokémon', description: 'Catch a Pokémon', progress: 0, target: 1 },
    ]);

    render(<DailyQuestsPanel apiClient={mockApiClient} />);

    expect(await screen.findByText('Catch 1 Pokémon')).toBeInTheDocument();
    expect(screen.getByText('0 / 1')).toBeInTheDocument();
  });

  it('does not show claim button for incomplete quests', async () => {
    mockApiClient.getDailyQuests.mockResolvedValue([
      { id: 'q1', title: 'Catch 1 Pokémon', description: 'Catch a Pokémon', progress: 0, target: 1, claimed_at: null },
    ]);

    render(<DailyQuestsPanel apiClient={mockApiClient} />);

    await screen.findByText('Catch 1 Pokémon');
    expect(screen.queryByRole('button', { name: /claim/i })).toBeNull();
  });

  it('shows quest rewards', async () => {
    mockApiClient.getDailyQuests.mockResolvedValue([
      {
        id: 'q1',
        title: 'Win 3 battles',
        description: 'Win battles',
        progress: 1,
        target: 3,
        reward_xp: 50,
        reward_item_id: 'potion',
        reward_item_quantity: 1,
      },
    ]);

    render(<DailyQuestsPanel apiClient={mockApiClient} />);

    await screen.findByText('Win 3 battles');
    expect(screen.getByText(/Reward: 50 XP/i)).toBeInTheDocument();
    expect(screen.getByText(/Potion x1/i)).toBeInTheDocument();
  });

  it('shows the current rotation and next unlock preview for trainer level', async () => {
    mockApiClient.getProgress.mockResolvedValue({ xp: 300, level: 3 });
    mockApiClient.getDailyQuests.mockResolvedValue([
      { id: 'q1', title: 'Catch a Rare Pokémon', description: 'Catch a rare one', progress: 0, target: 1 },
    ]);

    render(<DailyQuestsPanel apiClient={mockApiClient} today="2026-07-04" />);

    expect(await screen.findByText(/Today: Catch a Rare Pokémon/i)).toBeInTheDocument();
    expect(screen.getByText(/Tomorrow: Evolve a Pokémon/i)).toBeInTheDocument();
    expect(screen.getByText(/Unlocks Lv\.4: Clear a Tower Floor/i)).toBeInTheDocument();
  });

  it('allows claiming a completed quest', async () => {
    mockApiClient.getDailyQuests.mockResolvedValue([
      { id: 'q1', title: 'Catch 1 Pokémon', description: 'Catch a Pokémon', progress: 1, target: 1, claimed_at: null },
    ]);
    mockApiClient.claimDailyQuest.mockResolvedValue({ id: 'q1', progress: 1, target: 1, claimed_at: '2026-02-27T00:00:00Z' });

    render(<DailyQuestsPanel apiClient={mockApiClient} />);

    const claimButton = await screen.findByRole('button', { name: /claim/i });
    await act(async () => {
      fireEvent.click(claimButton);
    });

    expect(mockApiClient.claimDailyQuest).toHaveBeenCalledWith('q1');
  });

  it('shows streak and bonus feedback after claiming the last daily quest', async () => {
    mockApiClient.getDailyQuests.mockResolvedValue([
      { id: 'q1', title: 'Catch 1 Pokémon', description: 'Catch a Pokémon', progress: 1, target: 1, claimed_at: null },
    ]);
    mockApiClient.claimDailyQuest.mockResolvedValue({
      id: 'q1',
      progress: 1,
      target: 1,
      claimed_at: '2026-07-04T09:00:00Z',
      daily_streak: {
        streak: 3,
        bonus: { item_id: 'pokeball', quantity: 3 },
        changed: true,
      },
    });

    render(<DailyQuestsPanel apiClient={mockApiClient} />);

    const claimButton = await screen.findByRole('button', { name: /claim/i });
    await act(async () => {
      fireEvent.click(claimButton);
    });

    expect(screen.getByText(/3-day streak/i)).toBeInTheDocument();
    expect(screen.getByText(/Pokeball x3/i)).toBeInTheDocument();
  });
});
