import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Browse from './Browse';
import { pokemonAPI } from '@/api/client';

vi.mock('@/components/BattleScreen', () => ({
  default: ({ wildPokemon, onEnd, equippedBallSkinCosmeticId }) => (
    <div>
      <div>Boss Battle: {wildPokemon.name}</div>
      <div>Ball Skin: {equippedBallSkinCosmeticId || 'default'}</div>
      <button
        type="button"
        onClick={() => onEnd({
          caught: false,
          battleWon: true,
          xpGained: 0,
          teamHP: [80],
          pokemon: wildPokemon,
        })}
      >
        Win Boss
      </button>
    </div>
  ),
}));

// Mock the API client
vi.mock('@/api/client', () => ({
  pokemonAPI: {
    getCaughtPokemon: vi.fn(),
    getRandomPokemon: vi.fn(),
    rollEncounter: vi.fn(),
    getBossClears: vi.fn(),
    recordBossClear: vi.fn(),
    getItems: vi.fn(),
    useItem: vi.fn(),
    getCosmetics: vi.fn(),
    getUpgrades: vi.fn(),
  },
}));

describe('Browse Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    pokemonAPI.getBossClears.mockResolvedValue([]);
    pokemonAPI.recordBossClear.mockResolvedValue({});
    pokemonAPI.getItems.mockResolvedValue([]);
    pokemonAPI.useItem.mockResolvedValue({ success: true });
    pokemonAPI.getCosmetics.mockResolvedValue({ cosmetics: [] });
    pokemonAPI.getUpgrades.mockResolvedValue({ upgrades: {} });
    pokemonAPI.rollEncounter.mockRejectedValue(new Error('Encounter service unavailable'));
  });

  it('should show loading state initially', () => {
    pokemonAPI.getCaughtPokemon.mockReturnValue(new Promise(() => {}));
    render(<Browse onNavigate={vi.fn()} />);
    // Component shows "Entering Forest..." instead of "Loading"
    expect(screen.getByText(/Entering/i)).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    pokemonAPI.getCaughtPokemon.mockRejectedValue(new Error('Network error'));
    render(<Browse onNavigate={vi.fn()} />);
    await waitFor(() => {
      expect(screen.queryByText(/Entering/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show a boss marker in the map legend', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    render(<Browse onNavigate={vi.fn()} />);

    expect(await screen.findByText('Boss')).toBeInTheDocument();
  });

  it('should show the active seasonal event in the exploration HUD', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    render(<Browse onNavigate={vi.fn()} today="2026-07-05" />);

    expect(await screen.findByText('Summer Splash')).toBeInTheDocument();
    expect(screen.getByText('Water / Ice boosted')).toBeInTheDocument();
  });

  it('should activate a lure from inventory and show remaining encounter boosts', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    pokemonAPI.getItems.mockResolvedValue([{ item_id: 'water_lure', quantity: 2 }]);

    render(<Browse onNavigate={vi.fn()} today="2026-09-15" />);

    fireEvent.click(await screen.findByText('Use Water Lure'));

    expect(pokemonAPI.useItem).toHaveBeenCalledWith('water_lure');
    expect(await screen.findByText('Water Lure active')).toBeInTheDocument();
    expect(screen.getByText('5 encounters boosted')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('pokemon-active-lure'))).toMatchObject({
      itemId: 'water_lure',
      remainingEncounters: 5,
    });
  });

  it('should extend activated lure duration with the Lure Slot upgrade', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    pokemonAPI.getItems.mockResolvedValue([{ item_id: 'water_lure', quantity: 1 }]);
    pokemonAPI.getUpgrades.mockResolvedValue({ upgrades: { encounter_lure_slot: 2 } });

    render(<Browse onNavigate={vi.fn()} today="2026-09-15" />);

    fireEvent.click(await screen.findByText('Use Water Lure'));

    expect(await screen.findByText('Water Lure active')).toBeInTheDocument();
    expect(screen.getByText('7 encounters boosted')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('pokemon-active-lure'))).toMatchObject({
      itemId: 'water_lure',
      remainingEncounters: 7,
    });
  });

  it('should restore an active lure duration from local storage', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    localStorage.setItem('pokemon-active-lure', JSON.stringify({
      itemId: 'water_lure',
      name: 'Water Lure',
      remainingEncounters: 3,
    }));

    render(<Browse onNavigate={vi.fn()} today="2026-09-15" />);

    expect(await screen.findByText('Water Lure active')).toBeInTheDocument();
    expect(screen.getByText('3 encounters boosted')).toBeInTheDocument();
  });

  it('should request a lure-boosted encounter type while the lure is active', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    pokemonAPI.getItems.mockResolvedValue([{ item_id: 'water_lure', quantity: 1 }]);
    pokemonAPI.getRandomPokemon.mockResolvedValue({
      id: 7,
      name: 'Squirtle',
      type: 'Water',
      rarity: 'Common',
      power_level: 12,
    });
    localStorage.setItem('pokemon-team-cache', JSON.stringify([
      { pokemon_id: 'starter-1', name: 'Leaflet', type: 'Grass', power_level: 25, currentHP: 80 },
    ]));

    render(<Browse onNavigate={vi.fn()} today="2026-09-15" />);

    fireEvent.click(await screen.findByText('Use Water Lure'));
    expect(await screen.findByText('Water Lure active')).toBeInTheDocument();

    await act(async () => {
      fireEvent.pointerDown(screen.getByLabelText('Move right'));
      await new Promise((resolve) => setTimeout(resolve, 250));
      fireEvent.pointerDown(screen.getByLabelText('Move right'));
    });

    await waitFor(() => {
      expect(pokemonAPI.getRandomPokemon).toHaveBeenCalledWith(expect.any(String), 'Water');
    });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('pokemon-active-lure'))).toMatchObject({
        itemId: 'water_lure',
        remainingEncounters: 4,
      });
    });
    randomSpy.mockRestore();
  });

  it('should start a named boss battle from the minimap boss marker', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    localStorage.setItem('pokemon-team-cache', JSON.stringify([
      { pokemon_id: 'starter-1', name: 'Leaflet', type: 'Grass', power_level: 25, currentHP: 80 },
    ]));

    render(<Browse onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByLabelText('Boss: Grove Guardian'));

    expect(await screen.findByText('Boss Battle: Grove Guardian')).toBeInTheDocument();
  });

  it('should hand a World encounter into the existing battle and capture flow', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    pokemonAPI.rollEncounter.mockResolvedValue({
      id: 'ripplecub', name: 'Ripplecub', type: 'Water', rarity: 'Common', power_level: 12,
    });
    localStorage.setItem('pokemon-team-cache', JSON.stringify([
      { pokemon_id: 'starter-1', name: 'Leaflet', type: 'Grass', power_level: 25, currentHP: 80 },
    ]));

    render(<Browse onNavigate={vi.fn()} worldEncounterToken={1} />);

    expect(await screen.findByText('Boss Battle: Ripplecub')).toBeInTheDocument();
    expect(pokemonAPI.rollEncounter).toHaveBeenCalledWith(1, null);
  });

  it('should pass the equipped ball-skin cosmetic into battle encounters', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    pokemonAPI.getCosmetics.mockResolvedValue({
      cosmetics: [{ cosmetic_id: 'premier_ball_skin', equipped: true }],
    });
    localStorage.setItem('pokemon-team-cache', JSON.stringify([
      { pokemon_id: 'starter-1', name: 'Leaflet', type: 'Grass', power_level: 25, currentHP: 80 },
    ]));

    render(<Browse onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByLabelText('Boss: Grove Guardian'));

    expect(await screen.findByText('Ball Skin: premier_ball_skin')).toBeInTheDocument();
  });

  it('should surface cleared boss state on the minimap', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    pokemonAPI.getBossClears.mockResolvedValue([
      { boss_key: 'grove-guardian', name: 'Grove Guardian', reward_xp: 120 },
    ]);

    render(<Browse onNavigate={vi.fn()} />);

    expect(await screen.findByLabelText('Cleared Boss: Grove Guardian')).toBeInTheDocument();
  });

  it('should record a boss clear and show reward feedback after winning', async () => {
    pokemonAPI.getCaughtPokemon.mockResolvedValue([]);
    localStorage.setItem('pokemon-team-cache', JSON.stringify([
      { pokemon_id: 'starter-1', name: 'Leaflet', type: 'Grass', power_level: 25, currentHP: 80 },
    ]));

    render(<Browse onNavigate={vi.fn()} />);

    fireEvent.click(await screen.findByLabelText('Boss: Grove Guardian'));
    fireEvent.click(await screen.findByText('Win Boss'));

    expect(await screen.findByText(/Grove Guardian defeated/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('pokemon-boss-clears'))).toMatchObject({
      'grove-guardian': {
        name: 'Grove Guardian',
        reward_xp: 120,
      },
    });
    expect(pokemonAPI.recordBossClear).toHaveBeenCalledWith(expect.objectContaining({
      boss_key: 'grove-guardian',
      name: 'Grove Guardian',
      reward_xp: 120,
    }));
  });
});
