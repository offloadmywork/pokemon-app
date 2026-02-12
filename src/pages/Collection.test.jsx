import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Collection from './Collection';
import { pokemonAPI } from '@/api/client';

// Mock the API client
vi.mock('@/api/client', () => ({
  pokemonAPI: {
    getCaughtPokemon: vi.fn(),
    getPokemon: vi.fn(),
    updateCaughtPokemon: vi.fn(),
    releasePokemon: vi.fn(),
  },
}));

// Mock the team module
vi.mock('@/game/team', () => ({
  loadTeam: vi.fn(() => []),
  saveTeam: vi.fn(),
  healTeam: vi.fn((team) => team),
  addToTeam: vi.fn((team, id) => [...team, id]),
  removeFromTeam: vi.fn((team, id) => team.filter((t) => t !== id)),
  isOnTeam: vi.fn(() => false),
  MAX_TEAM_SIZE: 6,
}));

describe('Collection Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    
    render(<Collection onNavigate={vi.fn()} />);
    
    expect(screen.getByText(/Loading Pokémon/i)).toBeInTheDocument();
  });

  it('should show empty state when no pokemon caught', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    
    render(<Collection onNavigate={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading Pokémon/i)).not.toBeInTheDocument();
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
    
    render(<Collection onNavigate={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading Pokémon/i)).not.toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Bulby')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    pokemonAPI.getCaughtPokemon.mockRejectedValue(new Error('Network error'));
    
    render(<Collection onNavigate={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading Pokémon/i)).not.toBeInTheDocument();
    });
    
    // Should show empty state or error message
    expect(screen.getByText(/Your collection is empty/i)).toBeInTheDocument();
  });

  it('should have navigation buttons', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    
    render(<Collection onNavigate={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading Pokémon/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/Explore Wild Pokémon/i)).toBeInTheDocument();
  });
});
