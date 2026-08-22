import { describe, it, expect } from 'vitest';
import {
  getWeekKey,
  getWeeklyMissionTemplatesForTrainerLevel,
  getWeeklyMissionsForWeek,
  applyWeeklyMissionProgress,
  resolveWeeklyMissionRewards,
} from './weeklyMissions.js';

// Scenario: Weeks get stable identifiers so missions rotate cleanly
//   Given any calendar date
//   When the week key is derived
//   Then it uses the ISO year and ISO week number as "YYYY-Www"
describe('getWeekKey', () => {
  it('derives an ISO week key for a mid-week date', () => {
    expect(getWeekKey('2026-08-22')).toBe('2026-W34');
  });

  it('follows strict ISO week rules at the year boundary', () => {
    // 2025-12-29 is the Monday opening ISO week 2026-W01
    expect(getWeekKey('2025-12-29')).toBe('2026-W01');
    expect(getWeekKey('2026-01-04')).toBe('2026-W01');
    expect(getWeekKey('2026-01-05')).toBe('2026-W02');
  });

  it('defaults to today when no date is provided', () => {
    const key = getWeekKey();
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });
});

// Scenario: Trainers see level-scaled weekly missions
//   Given a trainer level
//   When weekly mission templates are generated
//   Then each mission has long-horizon targets larger than daily quests
describe('getWeeklyMissionTemplatesForTrainerLevel', () => {
  it('gives level 1 trainers three core weekly missions', () => {
    const templates = getWeeklyMissionTemplatesForTrainerLevel(1);
    expect(templates).toHaveLength(3);
    templates.forEach((template) => {
      expect(template.target).toBeGreaterThan(1);
      expect(template.reward_xp).toBeGreaterThan(0);
      expect(template.reward_coins).toBeGreaterThan(0);
    });
  });

  it('scales weekly targets up with trainer level', () => {
    const low = getWeeklyMissionTemplatesForTrainerLevel(1);
    const high = getWeeklyMissionTemplatesForTrainerLevel(5);
    expect(high[0].target).toBeGreaterThan(low[0].target);
  });

  it('unlocks the tower mission only for higher-level trainers', () => {
    expect(
      getWeeklyMissionTemplatesForTrainerLevel(2)
        .some((mission) => mission.key === 'tower-floors')
    ).toBe(false);
    expect(
      getWeeklyMissionTemplatesForTrainerLevel(4)
        .some((mission) => mission.key === 'tower-floors')
    ).toBe(true);
  });
});

// Scenario: The same week always yields the same mission set
//   Given two trainers on the same week
//   When weekly missions are generated
//   Then both receive identical mission keys
describe('getWeeklyMissionsForWeek', () => {
  it('returns deterministic missions for a given week key', () => {
    const first = getWeeklyMissionsForWeek(3, '2026-W34');
    const second = getWeeklyMissionsForWeek(3, '2026-W34');
    expect(first.map((m) => m.key)).toEqual(second.map((m) => m.key));
  });

  it('initializes progress at zero for every mission', () => {
    const missions = getWeeklyMissionsForWeek(2, '2026-W35');
    missions.forEach((mission) => {
      expect(mission.progress).toBe(0);
      expect(mission.claimed_at).toBeNull();
    });
  });

  it('rotates advanced mission order between weeks', () => {
    const weekA = getWeeklyMissionsForWeek(4, '2026-W34').map((m) => m.key);
    const weekB = getWeeklyMissionsForWeek(4, '2026-W36').map((m) => m.key);
    expect(weekA).not.toEqual(weekB);
  });
});

// Scenario: Gameplay events increment weekly mission progress without overfilling
//   Given a weekly mission with a target
//   When progress events arrive
//   Then progress increases up to the target and never mutates the input
describe('applyWeeklyMissionProgress', () => {
  it('increments matching mission progress', () => {
    const missions = getWeeklyMissionsForWeek(1, '2026-W34');
    const updated = applyWeeklyMissionProgress(missions, 'catches', 2);
    const catchMission = updated.find((m) => m.event === 'catches');
    expect(catchMission.progress).toBe(2);
  });

  it('clamps progress at the target', () => {
    const missions = getWeeklyMissionsForWeek(1, '2026-W34');
    const updated = applyWeeklyMissionProgress(missions, 'catches', 999);
    const catchMission = updated.find((m) => m.event === 'catches');
    expect(catchMission.progress).toBe(catchMission.target);
  });

  it('does not mutate the input array or its missions', () => {
    const missions = getWeeklyMissionsForWeek(1, '2026-W34');
    const snapshot = JSON.stringify(missions);
    applyWeeklyMissionProgress(missions, 'catches', 1);
    expect(JSON.stringify(missions)).toBe(snapshot);
  });

  it('ignores unknown events and invalid increments', () => {
    const missions = getWeeklyMissionsForWeek(1, '2026-W34');
    const untouched = applyWeeklyMissionProgress(missions, 'mystery-event', 3);
    expect(untouched).toEqual(missions);
    const zero = applyWeeklyMissionProgress(missions, 'catches', -5);
    expect(zero).toEqual(missions);
  });
});

// Scenario: Completed weeks pay out mission rewards plus a completion chest
//   Given missions that have reached their targets
//   When rewards are resolved
//   Then each completed unclaimed mission pays out and a full sweep grants a bonus
describe('resolveWeeklyMissionRewards', () => {
  it('pays nothing while missions are incomplete', () => {
    const missions = getWeeklyMissionsForWeek(1, '2026-W34');
    const result = resolveWeeklyMissionRewards(missions);
    expect(result.totalXp).toBe(0);
    expect(result.totalCoins).toBe(0);
    expect(result.chestGranted).toBe(false);
  });

  it('sums rewards for completed missions and marks them claimed', () => {
    let missions = getWeeklyMissionsForWeek(1, '2026-W34');
    missions.forEach((mission) => {
      missions = applyWeeklyMissionProgress(missions, mission.event, mission.target);
    });
    const result = resolveWeeklyMissionRewards(missions);
    const expectedXp = missions.reduce((sum, m) => sum + m.reward_xp, 0);
    expect(result.totalXp).toBe(expectedXp);
    expect(result.claimedCount).toBe(missions.length);
    expect(result.updated.every((m) => m.claimed_at)).toBe(true);
  });

  it('grants a completion chest when every mission is claimed', () => {
    let missions = getWeeklyMissionsForWeek(1, '2026-W34');
    missions.forEach((mission) => {
      missions = applyWeeklyMissionProgress(missions, mission.event, mission.target);
    });
    const result = resolveWeeklyMissionRewards(missions);
    expect(result.chestGranted).toBe(true);
    expect(result.chest.coins).toBeGreaterThan(0);
  });

  it('never double-pays already claimed missions', () => {
    let missions = getWeeklyMissionsForWeek(1, '2026-W34');
    missions.forEach((mission) => {
      missions = applyWeeklyMissionProgress(missions, mission.event, mission.target);
    });
    const first = resolveWeeklyMissionRewards(missions);
    const second = resolveWeeklyMissionRewards(first.updated);
    expect(second.totalXp).toBe(0);
    expect(second.chestGranted).toBe(false);
  });
});

// Scenario: A new week gives trainers a fresh mission set
//   Given missions completed in one ISO week
//   When the next week's missions are generated
//   Then progress resets and advanced missions rotate deterministically
describe('week boundary rotation', () => {
  it('resets progress for the new week even if last week completed', () => {
    let lastWeek = getWeeklyMissionsForWeek(1, '2026-W34');
    lastWeek.forEach((mission) => {
      lastWeek = applyWeeklyMissionProgress(lastWeek, mission.event, mission.target);
    });
    const resolved = resolveWeeklyMissionRewards(lastWeek);
    expect(resolved.chestGranted).toBe(true);

    const newWeek = getWeeklyMissionsForWeek(1, '2026-W35');
    expect(newWeek.every((mission) => mission.progress === 0 && !mission.claimed_at)).toBe(true);
  });

  it('rotates advanced missions on a stable multi-week cycle', () => {
    // A full cycle of distinct weeks must eventually return to the original set.
    const level = 4;
    const baseline = getWeeklyMissionsForWeek(level, '2026-W34').map((m) => m.key);
    let cycleLength = 0;
    for (let offset = 1; offset <= 12; offset += 1) {
      const keys = getWeeklyMissionsForWeek(level, `2026-W${String(34 + offset).padStart(2, '0')}`).map((m) => m.key);
      if (!cycleLength && JSON.stringify(keys) === JSON.stringify(baseline)) {
        cycleLength = offset;
        break;
      }
    }
    expect(cycleLength).toBeGreaterThan(1);
    expect(cycleLength).toBeLessThanOrEqual(12);
  });

  it('keeps core missions identical every week while rotation varies', () => {
    const coreKeys = ['weekly-catches', 'weekly-battles', 'weekly-daily-quests'];
    ['2026-W34', '2026-W35', '2026-W36'].forEach((weekKey) => {
      const missions = getWeeklyMissionsForWeek(3, weekKey);
      coreKeys.forEach((key) => {
        expect(missions.some((m) => m.key === key)).toBe(true);
      });
    });
  });

  it('derives adjacent week keys cleanly across Sunday-to-Monday boundaries', () => {
    expect(getWeekKey('2026-08-23')).toBe('2026-W34'); // Sunday closes W34
    expect(getWeekKey('2026-08-24')).toBe('2026-W35'); // Monday opens W35
  });
});
