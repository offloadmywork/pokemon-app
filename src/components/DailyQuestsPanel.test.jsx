import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyQuestsPanel from './DailyQuestsPanel';

const mockApiClient = {
  getDailyQuests: vi.fn(),
  updateDailyQuestProgress: vi.fn(),
  claimDailyQuest: vi.fn(),
};

describe('DailyQuestsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('allows claiming a completed quest', async () => {
    mockApiClient.getDailyQuests.mockResolvedValue([
      { id: 'q1', title: 'Catch 1 Pokémon', description: 'Catch a Pokémon', progress: 1, target: 1, claimed_at: null },
    ]);
    mockApiClient.claimDailyQuest.mockResolvedValue({ id: 'q1', progress: 1, target: 1, claimed_at: '2026-02-27T00:00:00Z' });

    render(<DailyQuestsPanel apiClient={mockApiClient} />);

    const claimButton = await screen.findByRole('button', { name: /claim/i });
    fireEvent.click(claimButton);

    expect(mockApiClient.claimDailyQuest).toHaveBeenCalledWith('q1');
  });
});
