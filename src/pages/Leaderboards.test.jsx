import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Leaderboards from './Leaderboards';

describe('Leaderboards Page', () => {
  it('sorts level entries by level then xp and recalculates ranks', async () => {
    const mockApi = {
      getLeaderboard: vi.fn().mockResolvedValue({
        key: 'level',
        entries: [
          {
            user_id: 'bbb222',
            score: 2,
            detail: { level: 2, xp: 10 },
            rank: 3,
          },
          {
            user_id: 'aaa111',
            score: 3,
            detail: { level: 3, xp: 5 },
            rank: 2,
          },
          {
            user_id: 'ccc333',
            score: 3,
            detail: { level: 3, xp: 20 },
            rank: 1,
          },
        ],
      }),
    };

    render(<Leaderboards onNavigate={vi.fn()} apiClient={mockApi} />);

    const trainers = await screen.findAllByText(/Trainer/);
    const trainerNames = trainers.map((node) => node.textContent);

    expect(trainerNames[0]).toBe('Trainer CCC333');
    expect(trainerNames[1]).toBe('Trainer AAA111');
    expect(trainerNames[2]).toBe('Trainer BBB222');

  });

  it('loads tower rankings when the Tower tab is selected', async () => {
    const mockApi = {
      getLeaderboard: vi.fn((key) => {
        if (key === 'tower') {
          return Promise.resolve({
            key: 'tower',
            entries: [
              {
                user_id: 'low111',
                score: 3,
                detail: { best_floor: 3 },
                rank: 2,
              },
              {
                user_id: 'top999',
                score: 9,
                detail: { best_floor: 9 },
                rank: 1,
              },
            ],
          });
        }

        return Promise.resolve({ key: 'level', entries: [] });
      }),
    };

    render(<Leaderboards onNavigate={vi.fn()} apiClient={mockApi} />);

    const levelTab = screen.getByRole('button', { name: /level/i });
    const towerTab = screen.getByRole('button', { name: /tower/i });

    await waitFor(() => {
      expect(mockApi.getLeaderboard).toHaveBeenLastCalledWith('level', 10);
    });

    expect(levelTab).toHaveAttribute('aria-pressed', 'true');
    expect(towerTab).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(towerTab);

    await waitFor(() => {
      expect(mockApi.getLeaderboard).toHaveBeenLastCalledWith('tower', 10);
    });

    expect(towerTab).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Floor 9')).toBeInTheDocument();
    expect(screen.getByText('Floor 3')).toBeInTheDocument();

    const trainers = screen.getAllByText(/Trainer/);
    const trainerNames = trainers.map((node) => node.textContent);

    expect(trainerNames[0]).toBe('Trainer TOP999');
    expect(trainerNames[1]).toBe('Trainer LOW111');
  });

  it('loads PvP rankings when the PvP tab is selected', async () => {
    const mockApi = {
      getLeaderboard: vi.fn((key) => {
        if (key === 'pvp') {
          return Promise.resolve({
            key: 'pvp',
            entries: [
              {
                user_id: 'duel222',
                score: 2,
                detail: { wins: 2, losses: 1, draws: 0 },
                rank: 2,
              },
              {
                user_id: 'duel999',
                score: 5,
                detail: { wins: 5, losses: 1, draws: 2 },
                rank: 1,
              },
            ],
          });
        }

        return Promise.resolve({ key: 'level', entries: [] });
      }),
    };

    render(<Leaderboards onNavigate={vi.fn()} apiClient={mockApi} />);

    const pvpTab = screen.getByRole('button', { name: /pvp/i });

    await waitFor(() => {
      expect(mockApi.getLeaderboard).toHaveBeenLastCalledWith('level', 10);
    });

    fireEvent.click(pvpTab);

    await waitFor(() => {
      expect(mockApi.getLeaderboard).toHaveBeenLastCalledWith('pvp', 10);
    });

    expect(pvpTab).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('5W / 1L / 2D')).toBeInTheDocument();
    expect(screen.getByText('2W / 1L / 0D')).toBeInTheDocument();

    const trainers = screen.getAllByText(/Trainer/);
    const trainerNames = trainers.map((node) => node.textContent);

    expect(trainerNames[0]).toBe('Trainer DUEL99');
    expect(trainerNames[1]).toBe('Trainer DUEL22');
  });

  it('falls back to leaderboard score when detail metadata is missing', async () => {
    const mockApi = {
      getLeaderboard: vi.fn((key) => {
        if (key === 'caught') {
          return Promise.resolve({
            key: 'caught',
            entries: [
              {
                user_id: 'catch7',
                score: 7,
                rank: 1,
              },
            ],
          });
        }

        return Promise.resolve({ key: 'level', entries: [] });
      }),
    };

    render(<Leaderboards onNavigate={vi.fn()} apiClient={mockApi} />);

    const catchesTab = screen.getByRole('button', { name: /catches/i });

    await waitFor(() => {
      expect(mockApi.getLeaderboard).toHaveBeenLastCalledWith('level', 10);
    });

    fireEvent.click(catchesTab);

    await waitFor(() => {
      expect(mockApi.getLeaderboard).toHaveBeenLastCalledWith('caught', 10);
    });

    expect(await screen.findByText('7 caught')).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });
});
