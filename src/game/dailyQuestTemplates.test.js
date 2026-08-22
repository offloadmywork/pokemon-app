import { describe, it, expect } from 'vitest';
import {
  getDailyQuestRotationPreview,
  getDailyQuestTemplatesForDate,
  getDailyQuestTemplatesForTrainerLevel,
} from './dailyQuestTemplates';

describe('dailyQuestTemplates', () => {
  it('generates the starter daily quest set for level 1 trainers', () => {
    const templates = getDailyQuestTemplatesForTrainerLevel(1);

    expect(templates.map((template) => template.key)).toEqual([
      'catch-1',
      'battle-1',
      'use-item',
    ]);
    expect(templates.map((template) => template.target)).toEqual([1, 1, 1]);
  });

  it('scales daily quest targets and rewards for higher-level trainers', () => {
    const templates = getDailyQuestTemplatesForTrainerLevel(5);

    expect(templates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'catch-3',
        title: 'Catch 3 Pokémon',
        target: 3,
        reward_xp: 65,
        reward_item_id: 'great_ball',
      }),
      expect.objectContaining({
        key: 'battle-3',
        title: 'Win 3 Battles',
        target: 3,
        reward_xp: 90,
        reward_item_id: 'super_potion',
      }),
      expect.objectContaining({
        key: 'use-item-2',
        title: 'Use 2 Items',
        target: 2,
        reward_xp: 40,
      }),
      expect.objectContaining({
        key: 'heal-team',
        title: 'Heal Your Team',
        target: 1,
        reward_xp: 30,
        reward_item_id: 'potion',
      }),
    ]));
  });

  it('unlocks a heal team quest category after level 1', () => {
    const templates = getDailyQuestTemplatesForTrainerLevel(2);

    expect(templates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'heal-team',
        title: 'Heal Your Team',
        description: 'Heal your team at least once today',
      }),
    ]));
  });

  it('unlocks a rare catch quest category for level 3+ trainers', () => {
    const templates = getDailyQuestTemplatesForTrainerLevel(3);

    expect(templates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'rare-catch',
        title: 'Catch a Rare Pokémon',
        description: 'Catch a Rare, Epic, or Legendary Pokémon today',
        target: 1,
        reward_xp: 75,
        reward_item_id: 'great_ball',
      }),
    ]));
  });

  it('unlocks an evolution quest category for level 3+ trainers', () => {
    const templates = getDailyQuestTemplatesForTrainerLevel(3);

    expect(templates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'evolve-pokemon',
        title: 'Evolve a Pokémon',
        description: 'Evolve one Pokémon today',
        target: 1,
        reward_xp: 100,
        reward_item_id: 'super_potion',
      }),
    ]));
  });

  it('unlocks a challenge tower quest category for level 4+ trainers', () => {
    const levelThreeTemplates = getDailyQuestTemplatesForTrainerLevel(3);
    const levelFourTemplates = getDailyQuestTemplatesForTrainerLevel(4);

    expect(levelThreeTemplates.map((template) => template.key)).not.toContain('tower-floor');
    expect(levelFourTemplates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'tower-floor',
        title: 'Clear a Tower Floor',
        description: 'Complete one Challenge Tower floor today',
        target: 1,
        reward_xp: 125,
        reward_item_id: 'revive',
      }),
    ]));
  });

  it('selects all starter quests for level 1 daily generation', () => {
    const templates = getDailyQuestTemplatesForDate(1, '2026-07-04');

    expect(templates.map((template) => template.key)).toEqual([
      'catch-1',
      'battle-1',
      'use-item',
    ]);
  });

  it('keeps high-level daily generation to core quests plus one rotating advanced quest', () => {
    const templates = getDailyQuestTemplatesForDate(4, '2026-07-04');

    expect(templates).toHaveLength(4);
    expect(templates.map((template) => template.key)).toEqual([
      'catch-2',
      'battle-2',
      'use-item-2',
      'rare-catch',
    ]);
  });

  it('uses purchased bonus daily task slots to include additional rotating advanced quests', () => {
    const templates = getDailyQuestTemplatesForDate(4, '2026-07-04', 1);

    expect(templates).toHaveLength(5);
    expect(templates.map((template) => template.key)).toEqual([
      'catch-2',
      'battle-2',
      'use-item-2',
      'rare-catch',
      'evolve-pokemon',
    ]);
  });

  it('rotates the advanced daily quest slot across days', () => {
    const firstDay = getDailyQuestTemplatesForDate(4, '2026-07-04');
    const nextDay = getDailyQuestTemplatesForDate(4, '2026-07-05');

    expect(firstDay.at(-1).key).toBe('rare-catch');
    expect(nextDay.at(-1).key).toBe('evolve-pokemon');
  });

  it('describes the active, next, and locked daily quest rotation slots', () => {
    const preview = getDailyQuestRotationPreview(3, '2026-07-04');

    expect(preview.activeAdvancedQuest).toEqual(expect.objectContaining({
      key: 'rare-catch',
      title: 'Catch a Rare Pokémon',
    }));
    expect(preview.nextAdvancedQuest).toEqual(expect.objectContaining({
      key: 'evolve-pokemon',
      title: 'Evolve a Pokémon',
    }));
    expect(preview.nextUnlock).toEqual(expect.objectContaining({
      level: 4,
      key: 'tower-floor',
      title: 'Clear a Tower Floor',
    }));
  });
});
