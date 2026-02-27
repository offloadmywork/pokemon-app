const CHALLENGE_TOWER_MAX_FLOORS = 30;

const LEGACY_FLOOR_NAMES = {
  1: 'Sprout Steps',
  2: 'Ember Rise',
  3: 'Torrent Gate',
  4: 'Storm Pinnacle',
  5: 'Dragon Summit',
};

export const getTowerFloorName = (floor) => {
  if (LEGACY_FLOOR_NAMES[floor]) {
    return LEGACY_FLOOR_NAMES[floor];
  }

  return `Tower Floor ${floor}`;
};

export const getTowerDifficulty = (floor) => {
  if (!Number.isFinite(floor) || floor < 1) return 1;
  return Math.max(1, Math.round(floor * 0.9 + 0.5));
};

export const getTowerRewardXp = (floor) => {
  if (!Number.isFinite(floor) || floor < 1) return 0;
  const baseReward = 5;
  const linearReward = floor * 10;
  const milestoneBonus = Math.floor(floor / 5) * 5;
  return Math.round(baseReward + linearReward + milestoneBonus);
};

export const buildChallengeTowerFloor = (floor) => ({
  floor,
  name: getTowerFloorName(floor),
  difficulty: getTowerDifficulty(floor),
  reward_xp: getTowerRewardXp(floor),
});

export const buildChallengeTowerFloors = (maxFloors = CHALLENGE_TOWER_MAX_FLOORS) => {
  const totalFloors = Math.max(1, Math.floor(maxFloors));
  return Array.from({ length: totalFloors }, (_, index) => buildChallengeTowerFloor(index + 1));
};

export { CHALLENGE_TOWER_MAX_FLOORS };
