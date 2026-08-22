import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadTeam,
  saveTeam,
  healTeam,
  isTeamAlive,
  getActivePokemon,
  addToTeam,
  removeFromTeam,
  isOnTeam,
  moveTeamMember,
  getTeamSynergySummary,
  MAX_TEAM_SIZE,
} from './team';

describe('Team Management', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Load and Save Team', () => {
    it('should return empty array when no team is saved', () => {
      const team = loadTeam();
      expect(team).toEqual([]);
    });

    it('should save and load team correctly', () => {
      const testTeam = [
        {
          pokemon_id: 'test-1',
          name: 'Pikachu',
          type: 'Electric',
          power_level: 55,
          currentHP: 50,
          maxHP: 185,
        },
      ];
      
      saveTeam(testTeam);
      const loaded = loadTeam();
      
      expect(loaded).toEqual(testTeam);
    });
  });

  describe('Heal Team', () => {
    it('should heal all Pokemon to max HP', () => {
      const team = [
        {
          pokemon_id: 'test-1',
          name: 'Pikachu',
          type: 'Electric',
          power_level: 55,
          currentHP: 50,
          maxHP: 185,
        },
        {
          pokemon_id: 'test-2',
          name: 'Charizard',
          type: 'Fire',
          power_level: 80,
          currentHP: 100,
          maxHP: 260,
        },
      ];

      const healed = healTeam(team);

      expect(healed[0].currentHP).toBe(healed[0].maxHP);
      expect(healed[1].currentHP).toBe(healed[1].maxHP);
      expect(healed[0].currentHP).toBe(185);
      expect(healed[1].currentHP).toBe(260);
    });
  });

  describe('Team Alive Check', () => {
    it('should return true when at least one Pokemon has HP', () => {
      const team = [
        {
          pokemon_id: 'test-1',
          name: 'Pikachu',
          currentHP: 10,
        },
        {
          pokemon_id: 'test-2',
          name: 'Charizard',
          currentHP: 0,
        },
      ];

      expect(isTeamAlive(team)).toBe(true);
    });

    it('should return false when all Pokemon are fainted', () => {
      const team = [
        {
          pokemon_id: 'test-1',
          name: 'Pikachu',
          currentHP: 0,
        },
        {
          pokemon_id: 'test-2',
          name: 'Charizard',
          currentHP: 0,
        },
      ];

      expect(isTeamAlive(team)).toBe(false);
    });

    it('should return false for empty team', () => {
      expect(isTeamAlive([])).toBe(false);
    });
  });

  describe('Get Active Pokemon', () => {
    it('should return the first alive Pokemon', () => {
      const team = [
        {
          pokemon_id: 'test-1',
          name: 'Pikachu',
          currentHP: 0,
        },
        {
          pokemon_id: 'test-2',
          name: 'Charizard',
          currentHP: 100,
        },
      ];

      const active = getActivePokemon(team);
      expect(active.name).toBe('Charizard');
    });

    it('should return null when no Pokemon are alive', () => {
      const team = [
        {
          pokemon_id: 'test-1',
          name: 'Pikachu',
          currentHP: 0,
        },
      ];

      const active = getActivePokemon(team);
      expect(active).toBeNull();
    });
  });

  describe('Add to Team', () => {
    it('should add a Pokemon to an empty team', () => {
      const pokemon = {
        id: 'test-1',
        name: 'Pikachu',
        type: 'Electric',
        power_level: 55,
        image_url: 'test.png',
        rarity: 'Uncommon',
      };

      const result = addToTeam(pokemon);

      expect(result.success).toBe(true);
      expect(result.team).toHaveLength(1);
      expect(result.team[0].name).toBe('Pikachu');
      expect(result.team[0].currentHP).toBeGreaterThan(0);
      expect(result.message).toContain('joined');
    });

    it('should not add Pokemon if team is full', () => {
      // Fill the team first
      for (let i = 0; i < MAX_TEAM_SIZE; i++) {
        addToTeam({
          id: `test-${i}`,
          name: `Pokemon${i}`,
          type: 'Normal',
          power_level: 50,
          image_url: 'test.png',
          rarity: 'Common',
        });
      }

      // Try to add one more
      const result = addToTeam({
        id: 'test-extra',
        name: 'ExtraPokemon',
        type: 'Normal',
        power_level: 50,
        image_url: 'test.png',
        rarity: 'Common',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('full');
      expect(result.team).toHaveLength(MAX_TEAM_SIZE);
    });

    it('should not add duplicate Pokemon', () => {
      const pokemon = {
        id: 'test-1',
        name: 'Pikachu',
        type: 'Electric',
        power_level: 55,
        image_url: 'test.png',
        rarity: 'Uncommon',
      };

      addToTeam(pokemon);
      const result = addToTeam(pokemon);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Already');
      expect(result.team).toHaveLength(1);
    });
  });

  describe('Remove from Team', () => {
    it('should remove a Pokemon from the team', () => {
      const pokemon = {
        id: 'test-1',
        name: 'Pikachu',
        type: 'Electric',
        power_level: 55,
        image_url: 'test.png',
        rarity: 'Uncommon',
      };

      addToTeam(pokemon);
      const newTeam = removeFromTeam('test-1');

      expect(newTeam).toHaveLength(0);
    });
  });

  describe('Is On Team Check', () => {
    it('should return true if Pokemon is on team', () => {
      const pokemon = {
        id: 'test-1',
        name: 'Pikachu',
        type: 'Electric',
        power_level: 55,
        image_url: 'test.png',
        rarity: 'Uncommon',
      };

      addToTeam(pokemon);
      expect(isOnTeam('test-1')).toBe(true);
    });

    it('should return false if Pokemon is not on team', () => {
      expect(isOnTeam('nonexistent')).toBe(false);
    });
  });

  describe('Team Synergy Summary', () => {
    it('summarizes balanced type coverage for mixed teams', () => {
      const team = [
        { pokemon_id: 'fire-1', name: 'Flametail', type: 'Fire' },
        { pokemon_id: 'water-1', name: 'Ripplefin', type: 'Water' },
        { pokemon_id: 'grass-1', name: 'Leaflet', type: 'Grass' },
      ];

      expect(getTeamSynergySummary(team)).toEqual({
        typeCount: 3,
        types: ['Fire', 'Water', 'Grass'],
        tone: 'balanced',
        message: 'Balanced coverage: Fire, Water, Grass',
      });
    });

    it('encourages broader coverage when teams repeat a type', () => {
      const team = [
        { pokemon_id: 'fire-1', name: 'Flametail', type: 'Fire' },
        { pokemon_id: 'fire-2', name: 'Embercub', type: 'Fire' },
      ];

      expect(getTeamSynergySummary(team)).toEqual({
        typeCount: 1,
        types: ['Fire'],
        tone: 'narrow',
        message: 'Add different Pokemon types to improve coverage.',
      });
    });
  });

  describe('Move Team Member', () => {
    it('moves a team member between battle slots without mutating the original team', () => {
      const team = [
        { pokemon_id: 'fire-1', name: 'Flametail', type: 'Fire' },
        { pokemon_id: 'water-1', name: 'Ripplefin', type: 'Water' },
        { pokemon_id: 'grass-1', name: 'Leaflet', type: 'Grass' },
      ];

      const moved = moveTeamMember(team, 2, 0);

      expect(moved.map(p => p.pokemon_id)).toEqual(['grass-1', 'fire-1', 'water-1']);
      expect(team.map(p => p.pokemon_id)).toEqual(['fire-1', 'water-1', 'grass-1']);
    });

    it('keeps the order unchanged when move indexes are outside team slots', () => {
      const team = [
        { pokemon_id: 'fire-1', name: 'Flametail', type: 'Fire' },
        { pokemon_id: 'water-1', name: 'Ripplefin', type: 'Water' },
      ];

      expect(moveTeamMember(team, -1, 1)).toEqual(team);
      expect(moveTeamMember(team, 0, 3)).toEqual(team);
    });
  });
});
