import { beforeEach, describe, expect, it } from 'vitest';
import {
  BOSS_CLEAR_STORAGE_KEY,
  getBossClearKey,
  loadBossClears,
  recordBossClear,
} from './bossProgress';

describe('Boss Progress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates stable clear keys from boss names', () => {
    expect(getBossClearKey({ name: 'Grove Guardian' })).toBe('grove-guardian');
  });

  it('records zone boss clears with reward metadata', () => {
    const clear = recordBossClear({
      name: 'Grove Guardian',
      rewardXP: 120,
    }, '2026-07-04T19:47:00.000Z');

    expect(clear).toEqual({
      name: 'Grove Guardian',
      reward_xp: 120,
      cleared_at: '2026-07-04T19:47:00.000Z',
    });
    expect(loadBossClears()).toEqual({
      'grove-guardian': clear,
    });
    expect(JSON.parse(localStorage.getItem(BOSS_CLEAR_STORAGE_KEY))).toEqual({
      'grove-guardian': clear,
    });
  });
});
