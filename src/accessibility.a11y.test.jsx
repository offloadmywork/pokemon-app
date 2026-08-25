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
});
