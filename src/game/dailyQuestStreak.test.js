import { describe, it, expect } from 'vitest';
import {
  calculateDailyQuestStreak,
  getDailyQuestStreakBonus,
} from './dailyQuestStreak';

describe('Daily Quest Streaks (BDD)', () => {
  it('increments streak when all daily quests are claimed for the day', () => {
    const result = calculateDailyQuestStreak({
      quests: [
        { id: 'q1', claimed_at: '2026-07-04T08:00:00Z' },
        { id: 'q2', claimed_at: '2026-07-04T08:01:00Z' },
      ],
      currentStreak: 2,
      lastClaimDate: '2026-07-03',
      claimDate: '2026-07-04',
    });

    expect(result).toEqual({
      streak: 3,
      changed: true,
      bonus: { item_id: 'pokeball', quantity: 3 },
    });
  });

  it('resets streak when a day is missed', () => {
    const result = calculateDailyQuestStreak({
      quests: [{ id: 'q1', claimed_at: '2026-07-04T08:00:00Z' }],
      currentStreak: 5,
      lastClaimDate: '2026-07-02',
      claimDate: '2026-07-04',
    });

    expect(result).toEqual({
      streak: 1,
      changed: true,
      bonus: null,
    });
  });

  it('awards bonus rewards based on streak length', () => {
    expect(getDailyQuestStreakBonus(3)).toEqual({ item_id: 'pokeball', quantity: 3 });
    expect(getDailyQuestStreakBonus(7)).toEqual({ item_id: 'great_ball', quantity: 2 });
    expect(getDailyQuestStreakBonus(14)).toEqual({ item_id: 'ultra_ball', quantity: 1 });
  });
});
