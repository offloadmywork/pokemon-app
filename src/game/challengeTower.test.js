// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildChallengeTowerFloor,
  buildChallengeTowerFloors,
  CHALLENGE_TOWER_MAX_FLOORS,
  getTowerDifficulty,
  getTowerFloorName,
  getTowerRewardXp,
} from './challengeTower.js';

describe('Challenge Tower scaling', () => {
  it('builds a full floor list with deterministic length', () => {
    const floors = buildChallengeTowerFloors();
    expect(floors).toHaveLength(CHALLENGE_TOWER_MAX_FLOORS);
    expect(floors[0].floor).toBe(1);
    expect(floors[floors.length - 1].floor).toBe(CHALLENGE_TOWER_MAX_FLOORS);
  });

  it('preserves legacy names for early floors', () => {
    expect(getTowerFloorName(1)).toBe('Sprout Steps');
    expect(getTowerFloorName(2)).toBe('Ember Rise');
    expect(getTowerFloorName(3)).toBe('Torrent Gate');
    expect(getTowerFloorName(4)).toBe('Storm Pinnacle');
    expect(getTowerFloorName(5)).toBe('Dragon Summit');
  });

  it('scales difficulty in a non-decreasing curve', () => {
    const floors = buildChallengeTowerFloors(15);
    for (let i = 1; i < floors.length; i += 1) {
      expect(floors[i].difficulty).toBeGreaterThanOrEqual(floors[i - 1].difficulty);
    }
    expect(getTowerDifficulty(1)).toBe(1);
    expect(getTowerDifficulty(5)).toBe(5);
    expect(getTowerDifficulty(10)).toBe(10);
  });

  it('scales rewards with milestone bonuses', () => {
    expect(getTowerRewardXp(1)).toBe(15);
    expect(getTowerRewardXp(2)).toBe(25);
    expect(getTowerRewardXp(5)).toBe(60);
    expect(getTowerRewardXp(10)).toBe(115);
  });

  it('builds a single floor configuration', () => {
    const floor = buildChallengeTowerFloor(6);
    expect(floor).toEqual({
      floor: 6,
      name: 'Tower Floor 6',
      difficulty: 6,
      reward_xp: 70,
    });
  });
});
