// ═══════════════════════════════════════════
// MAPS SYSTEM TESTS
// ═══════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { MAPS, getMap, isWalkable, isGrass, isHealingSpot } from './maps';

describe('Maps System', () => {
  describe('Map Data Structure', () => {
    it('should export exactly 5 maps', () => {
      expect(MAPS).toHaveLength(5);
    });

    it('each map should have 15 rows', () => {
      MAPS.forEach(map => {
        expect(map.data).toHaveLength(15);
      });
    });

    it('each map should have 20 columns', () => {
      MAPS.forEach(map => {
        map.data.forEach(row => {
          expect(row).toHaveLength(20);
        });
      });
    });

    it('each map should have start position', () => {
      MAPS.forEach(map => {
        expect(typeof map.startX).toBe('number');
        expect(typeof map.startY).toBe('number');
        expect(map.startX).toBeGreaterThanOrEqual(0);
        expect(map.startX).toBeLessThan(20);
        expect(map.startY).toBeGreaterThanOrEqual(0);
        expect(map.startY).toBeLessThan(15);
      });
    });

    it('each map should have theme configuration', () => {
      MAPS.forEach(map => {
        expect(map.theme).toBeDefined();
        expect(map.theme.path).toBeDefined();
        expect(map.theme.grass).toBeDefined();
        expect(map.theme.tree).toBeDefined();
        expect(map.theme.water).toBeDefined();
        expect(map.theme.rock).toBeDefined();
        expect(map.theme.heal).toBeDefined();
        expect(map.theme.portal).toBeDefined();
      });
    });

    it('start position should be walkable on all maps', () => {
      MAPS.forEach(map => {
        const tile = map.data[map.startY][map.startX];
        expect(isWalkable(tile)).toBe(true);
      });
    });

    it('map boundaries should be solid (trees/rocks/water)', () => {
      // First map boundary check
      const forest = MAPS[0].data;
      // Top and bottom rows should be trees
      forest[0].forEach(tile => expect(tile).toBe(2));
      forest[14].forEach(tile => expect(tile).toBe(2));
      // Side columns
      for (let y = 0; y < 15; y++) {
        expect(forest[y][0]).toBe(2);
        expect(forest[y][19]).toBe(2);
      }
    });
  });

  describe('getMap function', () => {
    it('should return forest map for level 1', () => {
      const map = getMap(1);
      expect(map).toBe(MAPS[0]);
      expect(map.theme.grass.emoji).toBe('🌿');
      expect(map.theme.tree.emoji).toBe('🌳');
    });

    it('should return crystal cave for level 2', () => {
      const map = getMap(2);
      expect(map).toBe(MAPS[1]);
      expect(map.theme.rock.emoji).toBe('💜');
    });

    it('should return thunder mountain for level 3', () => {
      const map = getMap(3);
      expect(map).toBe(MAPS[2]);
      expect(map.theme.grass.emoji).toBe('⚡');
    });

    it('should return fire volcano for level 4', () => {
      const map = getMap(4);
      expect(map).toBe(MAPS[3]);
      expect(map.theme.water.emoji).toBe('🔥'); // lava!
    });

    it('should return sky temple for level 5', () => {
      const map = getMap(5);
      expect(map).toBe(MAPS[4]);
      expect(map.theme.tree.emoji).toBe('☁️');
    });

    it('should clamp to last map for high levels', () => {
      const map5 = getMap(5);
      const map10 = getMap(10);
      const map100 = getMap(100);
      expect(map10).toBe(map5);
      expect(map100).toBe(map5);
    });

    it('should handle level 0 by returning first map', () => {
      const map = getMap(0);
      expect(map).toBeDefined();
      expect(map.data).toHaveLength(15);
    });
  });

  describe('isWalkable function', () => {
    it('should return true for path tiles (0)', () => {
      expect(isWalkable(0)).toBe(true);
    });

    it('should return true for grass tiles (1)', () => {
      expect(isWalkable(1)).toBe(true);
    });

    it('should return false for tree tiles (2)', () => {
      expect(isWalkable(2)).toBe(false);
    });

    it('should return false for water tiles (3)', () => {
      expect(isWalkable(3)).toBe(false);
    });

    it('should return false for rock tiles (4)', () => {
      expect(isWalkable(4)).toBe(false);
    });

    it('should return true for healing spot tiles (5)', () => {
      expect(isWalkable(5)).toBe(true);
    });

    it('should return true for portal tiles (6)', () => {
      expect(isWalkable(6)).toBe(true);
    });

    it('should handle undefined values gracefully', () => {
      expect(isWalkable(undefined)).toBe(false);
    });

    it('should handle null values gracefully', () => {
      expect(isWalkable(null)).toBe(false);
    });
  });

  describe('isGrass function', () => {
    it('should return true only for grass tiles (1)', () => {
      expect(isGrass(1)).toBe(true);
    });

    it('should return false for path tiles (0)', () => {
      expect(isGrass(0)).toBe(false);
    });

    it('should return false for tree tiles (2)', () => {
      expect(isGrass(2)).toBe(false);
    });

    it('should return false for water tiles (3)', () => {
      expect(isGrass(3)).toBe(false);
    });

    it('should return false for healing spots (5)', () => {
      expect(isGrass(5)).toBe(false);
    });
  });

  describe('isHealingSpot function', () => {
    it('should return true only for healing tiles (5)', () => {
      expect(isHealingSpot(5)).toBe(true);
    });

    it('should return false for path tiles (0)', () => {
      expect(isHealingSpot(0)).toBe(false);
    });

    it('should return false for grass tiles (1)', () => {
      expect(isHealingSpot(1)).toBe(false);
    });

    it('should return false for other tile types', () => {
      expect(isHealingSpot(2)).toBe(false);
      expect(isHealingSpot(3)).toBe(false);
      expect(isHealingSpot(4)).toBe(false);
      expect(isHealingSpot(6)).toBe(false);
    });
  });

  describe('Map themes', () => {
    it('should have unique themed paths for each level', () => {
      const forest = MAPS[0].theme.path.bg;
      const cave = MAPS[1].theme.path.bg;
      expect(forest).not.toBe(cave);
    });

    it('map 4 (volcano) should use fire-themed water (lava)', () => {
      const volcano = MAPS[3];
      expect(volcano.theme.water.emoji).toBe('🔥');
      expect(volcano.theme.water.bg).toContain('dc2626'); // red
    });

    it('map 5 (sky temple) should use cloud/tree emojis', () => {
      const sky = MAPS[4];
      expect(sky.theme.tree.emoji).toBe('☁️');
      expect(sky.theme.water.emoji).toBe('☁️');
    });
  });

  describe('Map traversal validation', () => {
    it('forest map should have a path from start position', () => {
      const forest = MAPS[0].data;
      // From (1,1), check adjacent cells
      // Expected path connections
      expect(forest[1][2]).toBe(0); // Right should be path
      expect(forest[2][1]).toBe(0); // Down should be path
    });

    it('should have at least one healing spot per map', () => {
      MAPS.forEach(map => {
        let hasHealing = false;
        for (let y = 0; y < 15; y++) {
          for (let x = 0; x < 20; x++) {
            if (map.data[y][x] === 5) hasHealing = true;
          }
        }
        expect(hasHealing).toBe(true);
      });
    });

    it('should have grass tiles for encounters on each map', () => {
      MAPS.forEach(map => {
        let hasGrass = false;
        for (let y = 0; y < 15; y++) {
          for (let x = 0; x < 20; x++) {
            if (map.data[y][x] === 1) hasGrass = true;
          }
        }
        expect(hasGrass).toBe(true);
      });
    });
  });
});
