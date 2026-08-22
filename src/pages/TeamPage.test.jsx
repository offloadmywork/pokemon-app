import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamPage from './TeamPage';

vi.mock('@/components/DailyQuestsPanel', () => ({ default: () => <div /> }));

const TEAM = [
  { pokemon_id: 'p1', name: 'Bulba', type: 'Grass', rarity: 'Common', currentHP: 30, maxHP: 30 },
  { pokemon_id: 'p2', name: 'Chara', type: 'Fire', rarity: 'Common', currentHP: 12, maxHP: 30 },
];

const CAUGHT = [
  ...TEAM,
  { pokemon_id: 'p3', name: 'Squirt', type: 'Water', rarity: 'Common', currentHP: 30, maxHP: 30 },
  { pokemon_id: 'p4', name: 'Gengar', type: 'Ghost', rarity: 'Rare', currentHP: 30, maxHP: 30 },
];

const apiClient = {
  getCaughtPokemon: vi.fn(),
};

import {
  loadTeamAsync,
  saveTeamAsync,
} from '@/game/team';

vi.mock('@/game/team', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadTeamAsync: vi.fn(),
    saveTeamAsync: vi.fn(async () => {}),
    MAX_TEAM_SIZE: actual.MAX_TEAM_SIZE,
  };
});

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    loadTeamAsync.mockResolvedValue(TEAM.map((p) => ({ ...p })));
    apiClient.getCaughtPokemon.mockResolvedValue(CAUGHT.map((p) => ({ ...p })));
  });

  it('renders the team roster with synergy summary', async () => {
    render(<TeamPage apiClient={apiClient} />);

    expect(await screen.findByText(/My Battle Team \(2/)).toBeInTheDocument();
    expect(screen.getByText('Bulba')).toBeInTheDocument();
    expect(screen.getByText('Chara')).toBeInTheDocument();
    expect(screen.getByText(/Team Synergy/i)).toBeInTheDocument();
  });

  it('shows available bench Pokemon to add from the collection', async () => {
    render(<TeamPage apiClient={apiClient} />);

    // Squirt and Gengar are caught but not on the team
    expect(await screen.findByText('Squirt')).toBeInTheDocument();
    expect(screen.getByText('Gengar')).toBeInTheDocument();
    const addButton = screen.getByRole('button', { name: /add squirt/i });
    expect(addButton).toBeInTheDocument();
  });

  it('adds a bench Pokemon to the team', async () => {
    render(<TeamPage apiClient={apiClient} />);
    await screen.findByText('Squirt');

    fireEvent.click(screen.getByRole('button', { name: /add squirt/i }));

    await waitFor(() => {
      expect(screen.getByText(/My Battle Team \(3/)).toBeInTheDocument();
    });
  });

  it('removes a team member', async () => {
    render(<TeamPage apiClient={apiClient} />);
    await screen.findByText('Bulba');

    fireEvent.click(screen.getByRole('button', { name: /remove chara/i }));

    await waitFor(() => {
      expect(screen.getByText(/My Battle Team \(1/)).toBeInTheDocument();
    });
    // The removed member moves to the bench with an Add action available.
    expect(screen.getByRole('button', { name: /add chara/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove chara/i })).not.toBeInTheDocument();
  });

  it('reorders team members up and down', async () => {
    render(<TeamPage apiClient={apiClient} />);
    await screen.findByText('Bulba');

    fireEvent.click(screen.getByRole('button', { name: /move chara up/i }));

    // After moving Chara up, Bulba should be second — check ordering via getAllByText order
    await waitFor(() => {
      const names = screen.getAllByText(/Bulba|Chara/).map((el) => el.textContent);
      const bulbaIdx = names.findIndex((t) => t.includes('Bulba'));
      const charaIdx = names.findIndex((t) => t.includes('Chara'));
      expect(charaIdx).toBeLessThan(bulbaIdx);
    });
  });
});
