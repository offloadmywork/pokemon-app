// Weekly Missions domain rules (Phase 4: Live Ops and Retention).
// Pure functions only — persistence and API wiring live in the Worker layer.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

function toDate(dateString) {
  if (!dateString) return new Date();
  const parsed = new Date(`${String(dateString).slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
}

// ISO week rules: weeks start Monday; the year of a week's Thursday is its ISO year.
export function getWeekKey(date = null) {
  const value = toDate(date);
  const dayOfWeek = (value.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  const thursday = new Date(value.getTime() + (3 - dayOfWeek) * MS_PER_DAY);
  const isoYear = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayOfWeek = (jan4.getUTCDay() + 6) % 7;
  const weekOneMonday = jan4.getTime() - jan4DayOfWeek * MS_PER_DAY;
  const week = Math.round((thursday.getTime() - weekOneMonday) / MS_PER_WEEK) + 1;
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

function getScaledWeeklyTarget(eventBaseTarget, trainerLevel) {
  const level = Math.max(1, Math.floor(Number(trainerLevel) || 1));
  return eventBaseTarget + Math.floor((level - 1) / 2) * eventBaseTarget;
}

const CORE_MISSION_RULES = [
  { key: 'weekly-catches', event: 'catches', baseTarget: 5, rewardXp: 150, rewardCoins: 40 },
  { key: 'weekly-battles', event: 'battle-wins', baseTarget: 4, rewardXp: 200, rewardCoins: 50 },
  { key: 'weekly-daily-quests', event: 'daily-quests-completed', baseTarget: 3, rewardXp: 120, rewardCoins: 30 },
];

const ADVANCED_MISSION_RULES = [
  { level: 3, key: 'weekly-rare-catches', event: 'rare-catches', baseTarget: 2, rewardXp: 250, rewardCoins: 60 },
  { level: 3, key: 'weekly-evolutions', event: 'evolutions', baseTarget: 2, rewardXp: 300, rewardCoins: 70 },
  { level: 4, key: 'tower-floors', event: 'tower-floors', baseTarget: 3, rewardXp: 350, rewardCoins: 80 },
  { level: 4, key: 'weekly-raids', event: 'raid-victories', baseTarget: 1, rewardXp: 400, rewardCoins: 100 },
];

const WEEKLY_CHEST = {
  item_id: 'ultra_ball',
  quantity: 2,
};

function buildMission(rule, trainerLevel, weekIndex, slotCount) {
  const target = getScaledWeeklyTarget(rule.baseTarget, trainerLevel);
  return {
    key: rule.key,
    title: buildTitle(rule.key, target),
    description: buildDescription(rule.event, target),
    event: rule.event,
    target,
    progress: 0,
    reward_xp: rule.rewardXp + ((target / rule.baseTarget - 1) * 25),
    reward_coins: rule.rewardCoins + ((target / rule.baseTarget - 1) * 10),
    claimed_at: null,
    rotation_slot: rule.key === 'tower-floors' || rule.key === 'weekly-raids'
      ? weekIndex % slotCount
      : null,
  };
}

function buildTitle(key, target) {
  switch (key) {
    case 'weekly-catches':
      return `Catch ${target} Pokémon This Week`;
    case 'weekly-battles':
      return `Win ${target} Battles This Week`;
    case 'weekly-daily-quests':
      return `Complete ${target} Daily Quest Sets`;
    case 'weekly-rare-catches':
      return `Catch ${target} Rare+ Pokémon`;
    case 'weekly-evolutions':
      return `Evolve ${target} Pokémon`;
    case 'tower-floors':
      return `Clear ${target} Tower Floors`;
    case 'weekly-raids':
      return `Win ${target} Co-op Raid${target === 1 ? '' : 's'}`;
    default:
      return `Complete ${key}`;
  }
}

function buildDescription(event, target) {
  switch (event) {
    case 'catches':
      return `Catch ${target} Pokémon before the week resets`;
    case 'battle-wins':
      return `Win ${target} battles before the week resets`;
    case 'daily-quests-completed':
      return `Fully claim ${target} daily quest sets this week`;
    case 'rare-catches':
      return `Catch ${target} Rare, Epic, or Legendary Pokémon this week`;
    case 'evolutions':
      return `Evolve ${target} Pokémon this week`;
    case 'tower-floors':
      return `Clear ${target} Challenge Tower floors this week`;
    case 'raid-victories':
      return `Win ${target} co-op raid${target === 1 ? '' : 's'} this week`;
    default:
      return `Make progress on ${event} this week`;
  }
}

function stableWeekIndex(weekKey) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(weekKey));
  if (!match) return 0;
  return Number(match[1]) * 53 + Number(match[2]);
}

export function getWeeklyMissionTemplatesForTrainerLevel(trainerLevel = 1) {
  const level = Math.max(1, Math.floor(Number(trainerLevel)) || 1);
  const rules = [
    ...CORE_MISSION_RULES,
    ...ADVANCED_MISSION_RULES.filter((rule) => rule.level <= level),
  ];
  // Templates mirror mission shape without per-week state.
  return rules.map((rule) => ({
    key: rule.key,
    event: rule.event,
    target: getScaledWeeklyTarget(rule.baseTarget, level),
    reward_xp: rule.rewardXp,
    reward_coins: rule.rewardCoins,
    min_level: rule.level ?? 1,
  }));
}

export function getWeeklyMissionsForWeek(trainerLevel = 1, weekKey = getWeekKey()) {
  const level = Math.max(1, Math.floor(Number(trainerLevel)) || 1);
  const coreRules = CORE_MISSION_RULES;
  const advancedRules = ADVANCED_MISSION_RULES.filter((rule) => rule.level <= level);

  const weekIndex = stableWeekIndex(weekKey);
  const slotCount = advancedRules.length;
  // Deterministic weekly rotation: pick half the eligible advanced missions, ordered by week.
  const advancedPickCount = Math.ceil(slotCount / 2);
  const pickedAdvanced = Array.from(
    { length: slotCount > 0 ? advancedPickCount : 0 },
    (_, offset) => advancedRules[(weekIndex + offset) % slotCount]
  );

  const missions = [...coreRules, ...pickedAdvanced].map(
    (rule) => buildMission(rule, level, weekIndex, slotCount)
  );
  missions.sort((a, b) => a.rotation_slot !== b.rotation_slot
    ? (a.rotation_slot ?? -1) - (b.rotation_slot ?? -1)
    : a.key.localeCompare(b.key));
  return missions;
}

export function applyWeeklyMissionProgress(missions, event, increment) {
  if (!Array.isArray(missions)) return [];
  const amount = Number(increment);
  if (!Number.isFinite(amount) || amount <= 0) return missions;

  let changed = false;
  const updated = missions.map((mission) => {
    if (mission.event !== event || mission.progress >= mission.target) return mission;
    changed = true;
    return {
      ...mission,
      progress: Math.min(mission.target, mission.progress + amount),
    };
  });
  return changed ? updated : missions;
}

const CHEST_COINS = 100;

export function resolveWeeklyMissionRewards(missions, claimDate = new Date().toISOString()) {
  if (!Array.isArray(missions) || missions.length === 0) {
    return {
      updated: missions || [],
      totalXp: 0,
      totalCoins: 0,
      claimedCount: 0,
      chestGranted: false,
      chest: null,
    };
  }

  let totalXp = 0;
  let totalCoins = 0;
  let claimedCount = 0;

  const updated = missions.map((mission) => {
    const complete = mission.progress >= mission.target && !mission.claimed_at;
    if (!complete) return mission;
    totalXp += mission.reward_xp;
    totalCoins += mission.reward_coins;
    claimedCount += 1;
    return { ...mission, claimed_at: claimDate };
  });

  const allClaimed = updated.every((mission) => Boolean(mission.claimed_at));
  // The weekly chest pays exactly once — on the resolution that completes the sweep.
  const chestGranted = allClaimed && claimedCount === updated.length;
  const chest = chestGranted
    ? {
      item_id: WEEKLY_CHEST.item_id,
      quantity: WEEKLY_CHEST.quantity,
      coins: CHEST_COINS,
    }
    : null;

  return {
    updated,
    totalXp,
    totalCoins,
    claimedCount,
    chestGranted,
    chest,
  };
}
