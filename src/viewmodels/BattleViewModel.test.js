import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleViewModel, createBattleViewModel } from './BattleViewModel';

// Mock API client
const createMockApi = () => ({
  getItems: vi.fn().mockResolvedValue([
    { item_id: 'potion', quantity: 5 },
    { item_id: 'pokeball', quantity: 10 },
  ]),
  useItem: vi.fn().mockResolvedValue({ success: true }),
  addItem: vi.fn().mockResolvedValue({ success: true }),
});

// Mock Pokemon
const createMockPokemon = (overrides = {}) => ({
  id: 1,
  name: 'Pikachu',
  type: 'Electric',
  power_level: 50,
  rarity: 'Common',
  currentHP: 100,
  maxHP: 170,
  ...overrides,
});

// Mock wild Pokemon
const createMockWildPokemon = (overrides = {}) => ({
  id: 999,
  name: 'Bulbasaur',
  type: 'Grass',
  power_level: 30,
  rarity: 'Common',
  ...overrides,
});

describe('BattleViewModel', () => {
  let viewModel;
  let mockApi;
  let team;
  let wildPokemon;

  beforeEach(() => {
    mockApi = createMockApi();
    team = [
      createMockPokemon({ id: 1, name: 'Pikachu', currentHP: 100, maxHP: 170 }),
      createMockPokemon({ id: 2, name: 'Charmander', currentHP: 80, maxHP: 150 }),
    ];
    wildPokemon = createMockWildPokemon();
    viewModel = createBattleViewModel(mockApi, team, wildPokemon);
  });

  describe('Initialization', () => {
    it('should initialize with team and wild Pokemon', () => {
      expect(viewModel.team).toHaveLength(2);
      expect(viewModel.wildPokemon).toBe(wildPokemon);
      expect(viewModel.activeIndex).toBe(0);
    });

    it('should set first non-fainted Pokemon as active', () => {
      const faintedTeam = [
        createMockPokemon({ id: 1, currentHP: 0, maxHP: 100 }),
        createMockPokemon({ id: 2, currentHP: 50, maxHP: 100 }),
      ];
      viewModel = createBattleViewModel(mockApi, faintedTeam, wildPokemon);
      expect(viewModel.activeIndex).toBe(1);
    });
  });

  describe('Item Usage During Battle', () => {
    it('should use a Potion on active Pokemon', async () => {
      // Setup: Pokemon at 50 HP, max 170
      const damagedPokemon = createMockPokemon({ currentHP: 50, maxHP: 170 });
      viewModel = createBattleViewModel(mockApi, [damagedPokemon], wildPokemon);
      await viewModel.loadInventory();

      const result = await viewModel.useItemOnActive('potion');

      expect(result.success).toBe(true);
      expect(result.healAmount).toBe(50); // Potion heals 50
      expect(result.pokemon.currentHP).toBe(100);
      expect(mockApi.useItem).toHaveBeenCalledWith('potion');
    });

    it('should not use Potion on fainted Pokemon', async () => {
      const faintedPokemon = createMockPokemon({ currentHP: 0, maxHP: 170 });
      viewModel = createBattleViewModel(mockApi, [faintedPokemon], wildPokemon);
      await viewModel.loadInventory();

      const result = await viewModel.useItemOnActive('potion');

      expect(result.success).toBe(false);
      expect(result.message).toContain('fainted');
    });

    it('should use Revive on fainted Pokemon', async () => {
      // Add revive to inventory
      mockApi.getItems.mockResolvedValueOnce([
        { item_id: 'revive', quantity: 2 },
      ]);
      const faintedPokemon = createMockPokemon({ currentHP: 0, maxHP: 170 });
      viewModel = createBattleViewModel(mockApi, [faintedPokemon], wildPokemon);
      await viewModel.loadInventory();

      const result = await viewModel.useItemOnActive('revive');

      expect(result.success).toBe(true);
      expect(result.pokemon.currentHP).toBe(85); // 50% of 170
      expect(mockApi.useItem).toHaveBeenCalledWith('revive');
    });

    it('should not use Revive on non-fainted Pokemon', async () => {
      mockApi.getItems.mockResolvedValueOnce([
        { item_id: 'revive', quantity: 2 },
      ]);
      const healthyPokemon = createMockPokemon({ currentHP: 100, maxHP: 170 });
      viewModel = createBattleViewModel(mockApi, [healthyPokemon], wildPokemon);
      await viewModel.loadInventory();

      const result = await viewModel.useItemOnActive('revive');

      expect(result.success).toBe(false);
      expect(result.message).toContain('fainted');
    });

    it('should fail if item not in inventory', async () => {
      await viewModel.loadInventory();
      const result = await viewModel.useItemOnActive('super_potion');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No Super Potion');
    });

    it('should cap healing at max HP', async () => {
      // Pokemon at 150 HP, max 170 - healing 100 with Super Potion should cap at 170
      const nearlyFullPokemon = createMockPokemon({ currentHP: 150, maxHP: 170 });
      mockApi.getItems.mockResolvedValueOnce([
        { item_id: 'super_potion', quantity: 3 },
      ]);
      viewModel = createBattleViewModel(mockApi, [nearlyFullPokemon], wildPokemon);
      await viewModel.loadInventory();

      const result = await viewModel.useItemOnActive('super_potion');

      expect(result.success).toBe(true);
      expect(result.healAmount).toBe(20); // Only 20 HP needed
      expect(result.pokemon.currentHP).toBe(170);
    });

    it('should decrement item quantity after use', async () => {
      const damagedPokemon = createMockPokemon({ currentHP: 50, maxHP: 170 });
      viewModel = createBattleViewModel(mockApi, [damagedPokemon], wildPokemon);
      await viewModel.loadInventory();

      expect(viewModel.getItemQuantity('potion')).toBe(5);
      await viewModel.useItemOnActive('potion');
      expect(viewModel.getItemQuantity('potion')).toBe(4);
    });

    it('should update team state after using item', async () => {
      const damagedPokemon = createMockPokemon({ currentHP: 50, maxHP: 170 });
      viewModel = createBattleViewModel(mockApi, [damagedPokemon], wildPokemon);
      await viewModel.loadInventory();

      await viewModel.useItemOnActive('potion');

      expect(viewModel.team[0].currentHP).toBe(100);
    });
  });

  describe('Pokeball Usage', () => {
    it('should consume pokeball when catching', async () => {
      await viewModel.loadInventory();
      expect(viewModel.getItemQuantity('pokeball')).toBe(10);

      const result = await viewModel.usePokeball('pokeball');

      expect(result.success).toBe(true);
      expect(result.catchMultiplier).toBe(1.0);
      expect(viewModel.getItemQuantity('pokeball')).toBe(9);
    });

    it('should return Great Ball catch multiplier', async () => {
      mockApi.getItems.mockResolvedValueOnce([
        { item_id: 'great_ball', quantity: 5 },
      ]);
      viewModel = createBattleViewModel(mockApi, team, wildPokemon);
      await viewModel.loadInventory();

      const result = await viewModel.usePokeball('great_ball');

      expect(result.success).toBe(true);
      expect(result.catchMultiplier).toBe(1.5);
    });

    it('should fail if no pokeballs available', async () => {
      mockApi.getItems.mockResolvedValueOnce([]);
      viewModel = createBattleViewModel(mockApi, team, wildPokemon);
      await viewModel.loadInventory();

      const result = await viewModel.usePokeball('pokeball');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No Pokeball');
    });
  });

  describe('Battle State', () => {
    it('should track active Pokemon', () => {
      expect(viewModel.activePokemon.name).toBe('Pikachu');
      expect(viewModel.activePokemon.id).toBe(1);
    });

    it('should switch active Pokemon', () => {
      viewModel.switchPokemon(1);
      expect(viewModel.activeIndex).toBe(1);
      expect(viewModel.activePokemon.name).toBe('Charmander');
    });

    it('should not switch to fainted Pokemon', () => {
      // Modify the viewModel's team directly
      viewModel.team[1].currentHP = 0;
      const result = viewModel.switchPokemon(1);
      expect(result.success).toBe(false);
      expect(viewModel.activeIndex).toBe(0);
    });

    it('should update wild HP after attack', () => {
      viewModel.updateWildHP(50);
      expect(viewModel.wildHP).toBe(50);
    });

    it('should update team HP after taking damage', () => {
      viewModel.updateTeamPokemonHP(0, 120);
      expect(viewModel.team[0].currentHP).toBe(120);
    });
  });

  describe('Usable Items in Battle', () => {
    it('should return list of usable healing items', async () => {
      await viewModel.loadInventory();
      const usable = viewModel.getUsableItems();
      expect(usable.length).toBeGreaterThan(0);
      expect(usable[0].item.id).toBe('potion');
    });

    it('should filter items usable on active Pokemon', async () => {
      // Active Pokemon is at full health - Potion should not be usable
      const fullHealthPokemon = createMockPokemon({ currentHP: 170, maxHP: 170 });
      viewModel = createBattleViewModel(mockApi, [fullHealthPokemon], wildPokemon);
      await viewModel.loadInventory();

      const usable = viewModel.getUsableItemsForActive();
      expect(usable.length).toBe(0);
    });

    it('should show Revive as usable when Pokemon fainted', async () => {
      mockApi.getItems.mockResolvedValueOnce([
        { item_id: 'revive', quantity: 2 },
        { item_id: 'potion', quantity: 5 },
      ]);
      const faintedPokemon = createMockPokemon({ currentHP: 0, maxHP: 170 });
      viewModel = createBattleViewModel(mockApi, [faintedPokemon], wildPokemon);
      await viewModel.loadInventory();

      const usable = viewModel.getUsableItemsForActive();
      expect(usable.length).toBe(1);
      expect(usable[0].item.id).toBe('revive');
    });
  });
});
