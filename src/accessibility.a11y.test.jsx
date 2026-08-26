import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { run as axeRun } from 'axe-core';

// BDD: Accessibility quality gate — core product surfaces must pass an
// automated axe audit with zero serious or critical violations.

const SERIOUS_LEVELS = new Set(['serious', 'critical']);

async function expectAccessible(ui, settle) {
  const { container } = render(ui);
  // Let async data land before auditing (also settles React updates).
  if (settle) {
    await settle();
  }
  const results = await axeRun(container);
  const blocking = results.violations.filter((violation) =>
    violation.nodes.some((node) => node.impact && SERIOUS_LEVELS.has(node.impact))
  );
  // Surface any blocking violations with enough context to fix them.
  expect(
    blocking.map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.length} nodes`)
  ).toEqual([]);
}

describe('Accessibility audit (axe-core)', () => {
  it('DailyQuestsPanel has no serious or critical violations', async () => {
    const DailyQuestsPanel = (await import('./components/DailyQuestsPanel')).default;
    const apiClient = {
      getDailyQuests: vi.fn().mockResolvedValue([
        {
          id: 'q1',
          title: 'Catch 1 Pokémon',
          description: 'Catch a Pokémon',
          progress: 1,
          target: 1,
          reward_xp: 50,
        },
      ]),
      getProgress: vi.fn().mockResolvedValue(null),
      claimDailyQuest: vi.fn(),
    };

    await expectAccessible(<DailyQuestsPanel apiClient={apiClient} />, async () => {
      await screen.findByText('Catch 1 Pokémon');
    });
  });

  it('WeeklyMissionsPanel has no serious or critical violations', async () => {
    const WeeklyMissionsPanel = (await import('./components/WeeklyMissionsPanel')).default;
    const apiClient = {
      getWeeklyMissions: vi.fn().mockResolvedValue({
        week_key: '2026-W34',
        missions: [
          {
            mission_key: 'weekly-catches',
            event: 'catches',
            title: 'Catch 5 Pokémon This Week',
            description: 'Catch 5 Pokémon before the week resets',
            target: 5,
            progress: 3,
            reward_xp: 150,
            reward_coins: 40,
            claimed_at: null,
          },
        ],
      }),
      claimAllWeeklyMissions: vi.fn(),
    };

    await expectAccessible(<WeeklyMissionsPanel apiClient={apiClient} />, async () => {
      await screen.findByText('Catch 5 Pokémon This Week');
    });
  });

  it('ShopPanel has no serious or critical violations', async () => {
    const ShopPanel = (await import('./components/ShopPanel')).default;
    const apiClient = {
      getWallet: vi.fn().mockResolvedValue({ user_id: 'user-1', coins: 100, shards: 0 }),
      getItems: vi.fn().mockResolvedValue([{ item_id: 'pokeball', quantity: 1 }]),
      purchaseShopItem: vi.fn(),
    };

    await expectAccessible(<ShopPanel apiClient={apiClient} />, async () => {
      await screen.findByText('100 coins');
    });
  });

  it('CollectionMasteryPanel has no serious or critical violations', async () => {
    const CollectionMasteryPanel = (await import('./components/CollectionMasteryPanel')).default;
    const apiClient = {
      getMasteryStatus: vi.fn().mockResolvedValue({
        caught_count: 12,
        current_tier: { id: 'silver', title: 'Silver Curator' },
        tiers: [
          { id: 'bronze', title: 'Bronze Collector', description: 'Every trainer starts here.', target: 0, claimed: true, claimable: false },
          { id: 'silver', title: 'Silver Curator', description: 'Catch 10 unique Pokémon.', target: 10, claimed: false, claimable: true },
          { id: 'gold', title: 'Gold Archivist', description: 'Catch 25 unique Pokémon.', target: 25, claimed: false, claimable: false },
          { id: 'master', title: 'Master Pokédex', description: 'Catch all 50 seeded Pokémon.', target: 50, claimed: false, claimable: false },
        ],
        unclaimed_rewards: [{ id: 'silver' }],
      }),
      claimMasteryTier: vi.fn(),
    };

    await expectAccessible(<CollectionMasteryPanel apiClient={apiClient} />, async () => {
      await screen.findByText(/12 unique Pokémon caught/);
    });
  });

  it('AchievementsPanel has no serious or critical violations', async () => {
    const AchievementsPanel = (await import('./components/AchievementsPanel')).default;
    const apiClient = {
      getAchievements: vi.fn().mockResolvedValue({
        user_id: 'user-1',
        progress: { collection: 26 },
        achievements: [
          {
            achievement_id: 'collect_10',
            title: 'First Box Filled',
            description: 'Catch 10 unique Pokemon.',
            category: 'collection',
            target: 10,
            progress: 26,
            reward: { coins: 75, shards: 0 },
            claimed: true,
            claimable: false,
          },
          {
            achievement_id: 'collect_25',
            title: 'Growing Pokedex',
            description: 'Catch 25 unique Pokemon.',
            category: 'collection',
            target: 25,
            progress: 26,
            reward: { coins: 150, shards: 1 },
            claimed: false,
            claimable: true,
          },
        ],
      }),
      claimAchievement: vi.fn(),
    };

    await expectAccessible(<AchievementsPanel apiClient={apiClient} />, async () => {
      await screen.findByText('Growing Pokedex');
    });
  });

  it('ChallengeTowerPanel has no serious or critical violations', async () => {
    const ChallengeTowerPanel = (await import('./components/ChallengeTowerPanel')).default;
    const apiClient = {
      getChallengeTower: vi.fn().mockResolvedValue({
        floors: [
          { floor: 1, name: 'Sprout Steps', difficulty: 1, reward_xp: 15 },
          { floor: 2, name: 'Ember Rise', difficulty: 2, reward_xp: 25 },
        ],
        progress: { current_floor: 1, best_floor: 0, last_completed_floor: 0 },
        current_floor: { floor: 1, name: 'Sprout Steps', difficulty: 1, reward_xp: 15 },
      }),
      completeChallengeTowerFloor: vi.fn(),
    };

    await expectAccessible(<ChallengeTowerPanel apiClient={apiClient} />, async () => {
      await screen.findAllByText('Floor 1: Sprout Steps');
    });
  });
});
