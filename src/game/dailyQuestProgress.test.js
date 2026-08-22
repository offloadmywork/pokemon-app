import { describe, it, expect, vi } from 'vitest';
import { incrementDailyQuestsForEvent } from './dailyQuestProgress';

describe('dailyQuestProgress', () => {
  it('increments matching quests by template_key for an event', async () => {
    const api = {
      getDailyQuests: vi.fn().mockResolvedValue([
        { id: 'q1', template_key: 'use-item' },
        { id: 'q2', template_key: 'battle-1' },
      ]),
      updateDailyQuestProgress: vi.fn().mockResolvedValue({ ok: true }),
    };

    await incrementDailyQuestsForEvent(api, 'useItem', 1);

    expect(api.updateDailyQuestProgress).toHaveBeenCalledTimes(1);
    expect(api.updateDailyQuestProgress).toHaveBeenCalledWith('q1', 1);
  });

  it('increments battle win quests when event is battleWin', async () => {
    const api = {
      getDailyQuests: vi.fn().mockResolvedValue([
        { id: 'q2', template_key: 'battle-1' },
      ]),
      updateDailyQuestProgress: vi.fn().mockResolvedValue({ ok: true }),
    };

    await incrementDailyQuestsForEvent(api, 'battleWin', 1);

    expect(api.updateDailyQuestProgress).toHaveBeenCalledWith('q2', 1);
  });

  it('increments heal team quests when event is healTeam', async () => {
    const api = {
      getDailyQuests: vi.fn().mockResolvedValue([
        { id: 'q3', template_key: 'heal-team' },
      ]),
      updateDailyQuestProgress: vi.fn().mockResolvedValue({ ok: true }),
    };

    await incrementDailyQuestsForEvent(api, 'healTeam', 1);

    expect(api.updateDailyQuestProgress).toHaveBeenCalledWith('q3', 1);
  });

  it('increments rare catch quests when event is rareCatch', async () => {
    const api = {
      getDailyQuests: vi.fn().mockResolvedValue([
        { id: 'q4', template_key: 'rare-catch' },
      ]),
      updateDailyQuestProgress: vi.fn().mockResolvedValue({ ok: true }),
    };

    await incrementDailyQuestsForEvent(api, 'rareCatch', 1);

    expect(api.updateDailyQuestProgress).toHaveBeenCalledWith('q4', 1);
  });

  it('increments evolution quests when event is evolvePokemon', async () => {
    const api = {
      getDailyQuests: vi.fn().mockResolvedValue([
        { id: 'q5', template_key: 'evolve-pokemon' },
      ]),
      updateDailyQuestProgress: vi.fn().mockResolvedValue({ ok: true }),
    };

    await incrementDailyQuestsForEvent(api, 'evolvePokemon', 1);

    expect(api.updateDailyQuestProgress).toHaveBeenCalledWith('q5', 1);
  });

  it('increments challenge tower quests when event is towerFloorComplete', async () => {
    const api = {
      getDailyQuests: vi.fn().mockResolvedValue([
        { id: 'q6', template_key: 'tower-floor' },
      ]),
      updateDailyQuestProgress: vi.fn().mockResolvedValue({ ok: true }),
    };

    await incrementDailyQuestsForEvent(api, 'towerFloorComplete', 1);

    expect(api.updateDailyQuestProgress).toHaveBeenCalledWith('q6', 1);
  });

  it('is best-effort (returns [] if daily quests cannot be loaded)', async () => {
    const api = {
      getDailyQuests: vi.fn().mockRejectedValue(new Error('nope')),
      updateDailyQuestProgress: vi.fn(),
    };

    const res = await incrementDailyQuestsForEvent(api, 'useItem', 1);

    expect(res).toEqual([]);
    expect(api.updateDailyQuestProgress).not.toHaveBeenCalled();
  });
});
