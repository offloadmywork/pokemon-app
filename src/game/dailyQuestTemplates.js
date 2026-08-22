function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function getScaledTarget(trainerLevel) {
  return Math.min(3, Math.max(1, Math.floor((trainerLevel + 1) / 2)));
}

const ADVANCED_ROTATION_ORDER = [
  'heal-team',
  'tower-floor',
  'rare-catch',
  'evolve-pokemon',
];

const QUEST_UNLOCK_LEVELS = [
  { level: 2, key: 'heal-team' },
  { level: 3, key: 'rare-catch' },
  { level: 3, key: 'evolve-pokemon' },
  { level: 4, key: 'tower-floor' },
];

function getQuestDayIndex(date) {
  const parsed = date ? new Date(`${date}T00:00:00Z`) : new Date();
  const timestamp = Number.isFinite(parsed.getTime()) ? parsed.getTime() : Date.now();
  return Math.floor(timestamp / 86400000);
}

function getTemplateByKey(trainerLevel, key) {
  return getDailyQuestTemplatesForTrainerLevel(trainerLevel)
    .find((template) => template.key === key) || null;
}

function getAdvancedTemplates(templates) {
  return ADVANCED_ROTATION_ORDER
    .map((key) => templates.find((template) => template.key === key))
    .filter(Boolean);
}

function normalizeBonusTaskSlots(bonusTaskSlots = 0) {
  const parsed = Number(bonusTaskSlots);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function getDailyQuestTemplatesForTrainerLevel(trainerLevel = 1) {
  const level = Number.isFinite(Number(trainerLevel)) ? Number(trainerLevel) : 1;
  const actionTarget = getScaledTarget(level);
  const itemTarget = level >= 4 ? 2 : 1;

  const templates = [
    {
      key: `catch-${actionTarget}`,
      title: `Catch ${actionTarget} ${pluralize(actionTarget, 'Pokémon', 'Pokémon')}`,
      description: `Catch ${actionTarget === 1 ? 'a Pokémon' : `${actionTarget} Pokémon`} today`,
      target: actionTarget,
      reward_xp: 25 + ((actionTarget - 1) * 20),
      reward_item_id: actionTarget >= 3 ? 'great_ball' : 'pokeball',
      reward_item_quantity: 1,
    },
    {
      key: `battle-${actionTarget}`,
      title: `Win ${actionTarget} ${pluralize(actionTarget, 'Battle')}`,
      description: `Win ${actionTarget === 1 ? 'a battle' : `${actionTarget} battles`} today`,
      target: actionTarget,
      reward_xp: 40 + ((actionTarget - 1) * 25),
      reward_item_id: actionTarget >= 3 ? 'super_potion' : 'potion',
      reward_item_quantity: 1,
    },
    {
      key: itemTarget === 1 ? 'use-item' : 'use-item-2',
      title: `Use ${itemTarget} ${pluralize(itemTarget, 'Item')}`,
      description: itemTarget === 1
        ? 'Use an item from your inventory'
        : `Use ${itemTarget} items from your inventory`,
      target: itemTarget,
      reward_xp: 20 * itemTarget,
      reward_item_id: null,
      reward_item_quantity: 0,
    },
  ];

  if (level >= 2) {
    templates.push({
      key: 'heal-team',
      title: 'Heal Your Team',
      description: 'Heal your team at least once today',
      target: 1,
      reward_xp: 30,
      reward_item_id: 'potion',
      reward_item_quantity: 1,
    });
  }

  if (level >= 3) {
    templates.push({
      key: 'rare-catch',
      title: 'Catch a Rare Pokémon',
      description: 'Catch a Rare, Epic, or Legendary Pokémon today',
      target: 1,
      reward_xp: 75,
      reward_item_id: 'great_ball',
      reward_item_quantity: 1,
    });

    templates.push({
      key: 'evolve-pokemon',
      title: 'Evolve a Pokémon',
      description: 'Evolve one Pokémon today',
      target: 1,
      reward_xp: 100,
      reward_item_id: 'super_potion',
      reward_item_quantity: 1,
    });
  }

  if (level >= 4) {
    templates.push({
      key: 'tower-floor',
      title: 'Clear a Tower Floor',
      description: 'Complete one Challenge Tower floor today',
      target: 1,
      reward_xp: 125,
      reward_item_id: 'revive',
      reward_item_quantity: 1,
    });
  }

  return templates;
}

export function getDailyQuestTemplatesForDate(
  trainerLevel = 1,
  date = new Date().toISOString().slice(0, 10),
  bonusTaskSlots = 0
) {
  const templates = getDailyQuestTemplatesForTrainerLevel(trainerLevel);
  if (templates.length <= 4) return templates;

  const coreKeys = new Set([
    templates[0]?.key,
    templates[1]?.key,
    templates[2]?.key,
  ]);
  const coreTemplates = templates.filter((template) => coreKeys.has(template.key));

  const advancedTemplates = getAdvancedTemplates(templates);

  if (advancedTemplates.length === 0) return coreTemplates;

  const dayIndex = getQuestDayIndex(date);
  const advancedSlotCount = Math.min(
    advancedTemplates.length,
    1 + normalizeBonusTaskSlots(bonusTaskSlots)
  );
  const selectedAdvancedTemplates = Array.from({ length: advancedSlotCount }, (_, offset) => (
    advancedTemplates[(dayIndex + offset) % advancedTemplates.length]
  ));

  return [...coreTemplates, ...selectedAdvancedTemplates];
}

export function getDailyQuestRotationPreview(trainerLevel = 1, date = new Date().toISOString().slice(0, 10)) {
  const level = Number.isFinite(Number(trainerLevel)) ? Number(trainerLevel) : 1;
  const templates = getDailyQuestTemplatesForTrainerLevel(level);
  const advancedTemplates = getAdvancedTemplates(templates);
  const dayIndex = getQuestDayIndex(date);
  const activeAdvancedQuest = advancedTemplates.length > 0
    ? advancedTemplates[dayIndex % advancedTemplates.length]
    : null;
  const nextAdvancedQuest = advancedTemplates.length > 1
    ? advancedTemplates[(dayIndex + 1) % advancedTemplates.length]
    : null;

  const nextUnlockRule = QUEST_UNLOCK_LEVELS.find((unlock) => unlock.level > level);
  const nextUnlockTemplate = nextUnlockRule
    ? getTemplateByKey(nextUnlockRule.level, nextUnlockRule.key)
    : null;

  return {
    trainerLevel: level,
    activeAdvancedQuest,
    nextAdvancedQuest,
    nextUnlock: nextUnlockTemplate
      ? {
        level: nextUnlockRule.level,
        ...nextUnlockTemplate,
      }
      : null,
  };
}
