import { describe, expect, it } from 'vitest';
import {
  FAIRNESS_TARGETS,
  auditCosmeticFairness,
  auditLureFairness,
  auditMonetizationFairness,
  auditUpgradeFairness,
} from './monetization-fairness-audit';

describe('monetization fairness audit', () => {
  it('flags combat-power upgrades as pay-to-win risks', () => {
    const audit = auditUpgradeFairness({
      attack_power: {
        upgrade_id: 'attack_power',
        name: 'Attack Power',
        description: 'Increase PvP damage by 10%.',
      },
      bag_slots: {
        upgrade_id: 'bag_slots',
        name: 'Bag Slots',
        description: 'Increase carried item capacity for longer routes.',
      },
    });

    expect(audit.status).toBe('needs-attention');
    expect(audit.disallowedUpgrades).toEqual([
      {
        upgrade_id: 'attack_power',
        reason: 'Upgrade is not an allowed convenience boost.',
      },
    ]);
  });

  it('flags cosmetics that use non-cosmetic slots or combat language', () => {
    const audit = auditCosmeticFairness({
      damage_badge: {
        cosmetic_id: 'damage_badge',
        name: 'Damage Badge',
        slot: 'combat_boost',
        description: 'Adds damage during raids.',
      },
    });

    expect(audit.status).toBe('needs-attention');
    expect(audit.disallowedCosmetics).toEqual([
      {
        cosmetic_id: 'damage_badge',
        reasons: [
          'Cosmetic slot is not visual-only.',
          'Cosmetic copy implies combat advantage.',
        ],
      },
    ]);
  });

  it('flags lures that grant catch-rate or XP advantages', () => {
    const audit = auditLureFairness({
      broken_lure: {
        itemId: 'broken_lure',
        durationEncounters: 5,
        catchRateMultiplier: 1.5,
        xpMultiplier: 2,
      },
    });

    expect(audit.status).toBe('needs-attention');
    expect(audit.disallowedLures).toEqual([
      {
        item_id: 'broken_lure',
        reasons: [
          'Lure grants catch-rate advantage.',
          'Lure grants XP advantage.',
        ],
      },
    ]);
  });

  it('keeps checked-in monetization surfaces inside no-pay-to-win guardrails', () => {
    const audit = auditMonetizationFairness();

    expect(audit.status).toBe('on-target');
    expect(audit.upgrades.allowedUpgradeIds).toEqual(FAIRNESS_TARGETS.upgrades.allowedIds);
    expect(audit.upgrades.disallowedUpgrades).toEqual([]);
    expect(audit.cosmetics.disallowedCosmetics).toEqual([]);
    expect(audit.lures.disallowedLures).toEqual([]);
  });
});
