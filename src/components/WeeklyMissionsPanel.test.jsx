import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WeeklyMissionsPanel from './WeeklyMissionsPanel';

const mockApiClient = {
  getWeeklyMissions: vi.fn(),
  claimAllWeeklyMissions: vi.fn(),
};

const MISSIONS = {
  week_key: '2026-W34',
  missions: [
    {
      mission_key: 'weekly-catches',
      event: 'catches',
      title: 'Catch 5 Pokémon This Week',
      description: 'Catch 5 Pokémon before the week resets',
      target: 5,
      progress: 3,
      reward_xp: 150,
      reward_coins: 40,
      claimed_at: null,
    },
    {
      mission_key: 'weekly-battles',
      event: 'battle-wins',
      title: 'Win 4 Battles This Week',
      description: 'Win 4 battles before the week resets',
      target: 4,
      progress: 4,
      reward_xp: 200,
      reward_coins: 50,
      claimed_at: null,
    },
  ],
};

describe('WeeklyMissionsPanel', () => {
  it('renders weekly missions with progress', async () => {
    mockApiClient.getWeeklyMissions.mockResolvedValue(MISSIONS);

    render(<WeeklyMissionsPanel apiClient={mockApiClient} />);

    expect(await screen.findByText('Catch 5 Pokémon This Week')).toBeInTheDocument();
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('shows the claim rewards button only when a mission is complete', async () => {
    mockApiClient.getWeeklyMissions.mockResolvedValue(MISSIONS);

    render(<WeeklyMissionsPanel apiClient={mockApiClient} />);

    expect(await screen.findByRole('button', { name: /claim/i })).toBeInTheDocument();
  });

  it('hides the claim button when nothing is complete', async () => {
    mockApiClient.getWeeklyMissions.mockResolvedValue({
      ...MISSIONS,
      missions: MISSIONS.missions.map((m) => ({ ...m, progress: 1 })),
    });

    render(<WeeklyMissionsPanel apiClient={mockApiClient} />);

    await screen.findByText('Catch 5 Pokémon This Week');
    expect(screen.queryByRole('button', { name: /claim/i })).toBeNull();
  });

  it('claims all completed missions and shows reward feedback', async () => {
    mockApiClient.getWeeklyMissions.mockResolvedValue({ ...MISSIONS });
    mockApiClient.claimAllWeeklyMissions.mockResolvedValue({
      totalXp: 200,
      totalCoins: 50,
      claimedCount: 1,
      chestGranted: false,
      chest: null,
    });

    render(<WeeklyMissionsPanel apiClient={mockApiClient} />);
    const claimButton = await screen.findByRole('button', { name: /claim/i });

    await act(async () => {
      fireEvent.click(claimButton);
    });

    expect(mockApiClient.claimAllWeeklyMissions).toHaveBeenCalled();
    expect(await screen.findByText(/Claimed \+200 XP/)).toBeInTheDocument();
  });

  // Scenario: A trainer changes Home sections while weekly missions are loading
  //   Given the panel has started its async load
  //   When the panel unmounts before the request resolves
  //   Then the completed request must not update React state after unmount
  it('ignores an in-flight load after unmount', async () => {
    mockApiClient.getWeeklyMissions.mockClear();
    let resolveLoad;
    mockApiClient.getWeeklyMissions.mockReturnValue(new Promise((resolve) => {
      resolveLoad = resolve;
    }));

    const { unmount } = render(<WeeklyMissionsPanel apiClient={mockApiClient} />);
    unmount();

    await act(async () => {
      resolveLoad(MISSIONS);
    });

    expect(mockApiClient.getWeeklyMissions).toHaveBeenCalledTimes(1);
  });
});
