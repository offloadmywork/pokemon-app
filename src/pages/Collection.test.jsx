import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Collection from './Collection';
import { pokemonAPI } from '@/api/client';
import { loadTeam, loadTeamAsync, saveTeam } from '@/game/team';

// Mock the API client
vi.mock('@/api/client', () => ({
  pokemonAPI: {
    getCaughtPokemon: vi.fn(),
    getPokemon: vi.fn(),
    updateCaughtPokemon: vi.fn(),
    releasePokemon: vi.fn(),
    claimStarters: vi.fn(),
  },
}));

// Mock the team module
vi.mock('@/game/team', () => ({
  setTeamApiClient: vi.fn(),
  loadTeam: vi.fn(() => []),
  loadTeamAsync: vi.fn(() => Promise.resolve([])),
  saveTeam: vi.fn(),
  saveTeamAsync: vi.fn((team) => Promise.resolve(team)),
  healTeam: vi.fn((team) => team),
  healTeamAsync: vi.fn(() => Promise.resolve([])),
  addToTeam: vi.fn((team, id) => [...team, id]),
  addToTeamAsync: vi.fn(() => Promise.resolve({ success: true, team: [] })),
  removeFromTeam: vi.fn((team, id) => team.filter((t) => t !== id)),
  removeFromTeamAsync: vi.fn(() => Promise.resolve([])),
  isOnTeam: vi.fn(() => false),
  moveTeamMember: vi.fn((team = [], fromIndex, toIndex) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= team.length || toIndex >= team.length) {
      return [...team];
    }
    const nextTeam = [...team];
    const [member] = nextTeam.splice(fromIndex, 1);
    nextTeam.splice(toIndex, 0, member);
    return nextTeam;
  }),
  getTeamSynergySummary: vi.fn((team = []) => {
    const types = [];
    team.forEach((member) => {
      if (member?.type && !types.includes(member.type)) types.push(member.type);
    });
    return types.length >= 3
      ? {
          typeCount: types.length,
          types,
          tone: 'balanced',
          message: `Balanced coverage: ${types.join(', ')}`,
        }
      : {
          typeCount: types.length,
          types,
          tone: 'narrow',
          message: 'Add different Pokemon types to improve coverage.',
        };
  }),
  MAX_TEAM_SIZE: 3,
}));

describe('Collection Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
    loadTeam.mockReturnValue([]);
    loadTeamAsync.mockResolvedValue([]);
  });

  it('should show loading state initially', () => {
    loadTeamAsync.mockReturnValue(new Promise(() => {}));
    render(<Collection onNavigate={vi.fn()} />);
    expect(screen.getByText('⭐')).toBeInTheDocument();
  });

  it('should show empty state when no pokemon caught', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    render(<Collection onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Your collection is empty/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore Wild Pokémon/i)).toBeInTheDocument();
  });

  it('should render caught pokemon', async () => {
    const caughtPokemon = [
      { id: 1, pokemon_id: 25, nickname: null, caught_date: '2024-01-01' },
      { id: 2, pokemon_id: 1, nickname: 'Bulby', caught_date: '2024-01-02' },
    ];

    pokemonAPI.getCaughtPokemon.mockResolvedValue(caughtPokemon);
    pokemonAPI.getPokemon.mockImplementation((id) =>
      Promise.resolve({
        id,
        name: id === 25 ? 'Pikachu' : 'Bulbasaur',
        type: id === 25 ? 'Electric' : 'Grass',
        power_level: 50,
        rarity: 'Common',
        image_url: 'https://example.com/image.png',
      })
    );

    const mockNavigate = vi.fn();

    render(<Collection onNavigate={mockNavigate} />);

    await waitFor(() => {
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });

    expect(screen.getByText('Bulby')).toBeInTheDocument();
  });

  it('should filter the collection by search, type, and rarity controls', async () => {
    const caughtPokemon = [
      {
        id: 1,
        pokemon_id: 25,
        nickname: 'Sparky',
        caught_date: '2024-01-01',
        name: 'Pikachu',
        type: 'Electric',
        rarity: 'Rare',
        power_level: 50,
        image_url: 'https://example.com/pikachu.png',
      },
      {
        id: 2,
        pokemon_id: 1,
        nickname: null,
        caught_date: '2024-01-02',
        name: 'Bulbasaur',
        type: 'Grass',
        rarity: 'Common',
        power_level: 30,
        image_url: 'https://example.com/bulbasaur.png',
      },
    ];

    pokemonAPI.getCaughtPokemon.mockResolvedValue(caughtPokemon);
    pokemonAPI.getPokemon.mockImplementation((id) =>
      Promise.resolve(caughtPokemon.find((caught) => caught.pokemon_id === id))
    );

    render(<Collection onNavigate={vi.fn()} />);

    expect(await screen.findByText('Sparky')).toBeInTheDocument();
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search collection'), {
      target: { value: 'spark' },
    });
    fireEvent.change(screen.getByLabelText('Filter by type'), {
      target: { value: 'Electric' },
    });
    fireEvent.change(screen.getByLabelText('Filter by rarity'), {
      target: { value: 'Rare' },
    });

    await waitFor(() => {
      expect(screen.getByText('Showing 1 of 2 Pokémon')).toBeInTheDocument();
    });
    expect(screen.getByText('Sparky')).toBeInTheDocument();
    expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    pokemonAPI.getCaughtPokemon.mockRejectedValue(new Error('Network error'));
    render(<Collection onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });
    // Should show empty state or error message
    expect(screen.getByText(/Your collection is empty/i)).toBeInTheDocument();
  });

  it('should have navigation buttons', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    render(<Collection onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Explore Wild Pokémon/i)).toBeInTheDocument();
  });

  it('should not auto-claim starter pokemon on page load', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);

    render(<Collection onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });

    expect(pokemonAPI.claimStarters).not.toHaveBeenCalled();
    expect(screen.getByText(/Claim Your Starter Pokémon/i)).toBeInTheDocument();
  });

  it('should claim starter pokemon from the empty collection action', async () => {
    const starterPokemon = [
      { id: 1, pokemon_id: 'starter-1', nickname: null, caught_date: '2024-01-01' },
      { id: 2, pokemon_id: 'starter-2', nickname: null, caught_date: '2024-01-01' },
      { id: 3, pokemon_id: 'starter-3', nickname: null, caught_date: '2024-01-01' },
    ];

    pokemonAPI.getCaughtPokemon
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(starterPokemon);
    
    pokemonAPI.claimStarters.mockResolvedValue({
      success: true,
      message: 'Welcome to the world of Pokemon! You received 3 starter Pokemon!',
      starters: [
        { caught_id: 1, name: 'Flametail Jr' },
        { caught_id: 2, name: 'Ripplefin' },
        { caught_id: 3, name: 'Leaflet' },
      ],
    });

    const mockNavigate = vi.fn();

    render(<Collection onNavigate={mockNavigate} />);

    fireEvent.click(await screen.findByText(/Claim Your Starter Pokémon/i));

    await waitFor(() => {
      expect(pokemonAPI.claimStarters).toHaveBeenCalledTimes(1);
    });

    expect(pokemonAPI.getCaughtPokemon).toHaveBeenCalledTimes(2);
    expect(alert).not.toHaveBeenCalled();
    expect(await screen.findByText(/Welcome to the world of Pokemon/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Start First Battle'));

    expect(mockNavigate).toHaveBeenCalledWith('browse');
  });

  it('should handle auto-claim failure gracefully', async () => {
    // Empty collection
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    pokemonAPI.claimStarters.mockRejectedValue(new Error('API Error'));

    render(<Collection onNavigate={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });
    
    // Should show empty state even if auto-claim failed
    expect(screen.getByText(/Your collection is empty/i)).toBeInTheDocument();
    expect(screen.getByText(/Claim Your Starter Pokémon/i)).toBeInTheDocument();
  });

  it('should show team synergy hints for mixed battle teams', async () => {
    const team = [
      {
        pokemon_id: 'starter-1',
        name: 'Flametail',
        type: 'Fire',
        rarity: 'Common',
        image_url: 'https://example.com/fire.png',
        currentHP: 80,
        maxHP: 100,
      },
      {
        pokemon_id: 'starter-2',
        name: 'Ripplefin',
        type: 'Water',
        rarity: 'Common',
        image_url: 'https://example.com/water.png',
        currentHP: 90,
        maxHP: 100,
      },
      {
        pokemon_id: 'starter-3',
        name: 'Leaflet',
        type: 'Grass',
        rarity: 'Common',
        image_url: 'https://example.com/grass.png',
        currentHP: 100,
        maxHP: 100,
      },
    ];

    loadTeam.mockReturnValue(team);
    loadTeamAsync.mockResolvedValue(team);
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);

    render(<Collection onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });

    expect(await screen.findByText('Team Synergy')).toBeInTheDocument();
    expect(screen.getByText('Balanced coverage: Fire, Water, Grass')).toBeInTheDocument();
    expect(screen.getByText('3 types ready')).toBeInTheDocument();
  });

  it('should let trainers reorder battle team slots and persist the new order', async () => {
    const team = [
      {
        pokemon_id: 'starter-1',
        name: 'Flametail',
        type: 'Fire',
        rarity: 'Common',
        image_url: 'https://example.com/fire.png',
        currentHP: 80,
        maxHP: 100,
      },
      {
        pokemon_id: 'starter-2',
        name: 'Ripplefin',
        type: 'Water',
        rarity: 'Common',
        image_url: 'https://example.com/water.png',
        currentHP: 90,
        maxHP: 100,
      },
      {
        pokemon_id: 'starter-3',
        name: 'Leaflet',
        type: 'Grass',
        rarity: 'Common',
        image_url: 'https://example.com/grass.png',
        currentHP: 100,
        maxHP: 100,
      },
    ];

    loadTeam.mockReturnValue(team);
    loadTeamAsync.mockResolvedValue(team);
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);

    render(<Collection onNavigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });

    fireEvent.click(await screen.findByLabelText('Move Ripplefin up'));

    expect(saveTeam).toHaveBeenCalledWith([
      expect.objectContaining({ pokemon_id: 'starter-2' }),
      expect.objectContaining({ pokemon_id: 'starter-1' }),
      expect.objectContaining({ pokemon_id: 'starter-3' }),
    ]);
    expect(screen.getByText('Ripplefin moved to slot 1')).toBeInTheDocument();
  });
});
