import { pathToFileURL } from 'url';
import { COSMETIC_CATALOG } from '../src/game/cosmetics.js';
import { UPGRADE_CATALOG } from '../src/game/economy.js';
import { ITEM_TYPES } from '../src/game/items.js';
import { getLureByItemId, getLureEncounterBonus } from '../src/game/lures.js';

export const FAIRNESS_TARGETS = {
  upgrades: {
    allowedIds: ['bag_slots', 'encounter_lure_slot', 'daily_task_slot'],
  },
  cosmetics: {
    visualOnlySlots: ['trainer_card', 'ball_skin'],
    forbiddenAdvantageTerms: ['attack', 'damage', 'defense', 'hp', 'power', 'pvp', 'raid', 'critical', 'win'],
  },
  lures: {
    maxCatchRateMultiplier: 1,
    maxXpMultiplier: 1,
  },
};

export function auditUpgradeFairness(
  upgradeCatalog = UPGRADE_CATALOG,
  targets = FAIRNESS_TARGETS.upgrades,
) {
  const allowed = new Set(targets.allowedIds);
  const disallowedUpgrades = Object.values(upgradeCatalog)
    .filter((upgrade) => !allowed.has(upgrade.upgrade_id))
    .map((upgrade) => ({
      upgrade_id: upgrade.upgrade_id,
      reason: 'Upgrade is not an allowed convenience boost.',
    }));

  return {
    status: disallowedUpgrades.length ? 'needs-attention' : 'on-target',
    allowedUpgradeIds: targets.allowedIds,
    disallowedUpgrades,
  };
}

export function auditCosmeticFairness(
  cosmeticCatalog = COSMETIC_CATALOG,
  targets = FAIRNESS_TARGETS.cosmetics,
) {
  const visualOnlySlots = new Set(targets.visualOnlySlots);
  const disallowedCosmetics = Object.values(cosmeticCatalog)
    .map((cosmetic) => {
      const reasons = [];

      if (!visualOnlySlots.has(cosmetic.slot)) {
        reasons.push('Cosmetic slot is not visual-only.');
      }

      if (containsAdvantageTerm(`${cosmetic.name} ${cosmetic.description}`, targets.forbiddenAdvantageTerms)) {
        reasons.push('Cosmetic copy implies combat advantage.');
      }

      return {
        cosmetic_id: cosmetic.cosmetic_id,
        reasons,
      };
    })
    .filter((cosmetic) => cosmetic.reasons.length > 0);

  return {
    status: disallowedCosmetics.length ? 'needs-attention' : 'on-target',
    visualOnlySlots: targets.visualOnlySlots,
    disallowedCosmetics,
  };
}

export function auditLureFairness(
  lures = getCheckedInLures(),
  targets = FAIRNESS_TARGETS.lures,
) {
  const disallowedLures = Object.values(lures)
    .map((lure) => {
      const reasons = [];

      if ((Number(lure.catchRateMultiplier) || 1) > targets.maxCatchRateMultiplier) {
        reasons.push('Lure grants catch-rate advantage.');
      }

      if ((Number(lure.xpMultiplier) || 1) > targets.maxXpMultiplier) {
        reasons.push('Lure grants XP advantage.');
      }

      return {
        item_id: lure.itemId,
        reasons,
      };
    })
    .filter((lure) => lure.reasons.length > 0);

  return {
    status: disallowedLures.length ? 'needs-attention' : 'on-target',
    maxCatchRateMultiplier: targets.maxCatchRateMultiplier,
    maxXpMultiplier: targets.maxXpMultiplier,
    disallowedLures,
  };
}

export function auditMonetizationFairness({
  upgradeCatalog = UPGRADE_CATALOG,
  cosmeticCatalog = COSMETIC_CATALOG,
  lures = getCheckedInLures(),
  targets = FAIRNESS_TARGETS,
} = {}) {
  const upgrades = auditUpgradeFairness(upgradeCatalog, targets.upgrades);
  const cosmetics = auditCosmeticFairness(cosmeticCatalog, targets.cosmetics);
  const luresAudit = auditLureFairness(lures, targets.lures);
  const status = [upgrades.status, cosmetics.status, luresAudit.status].every((value) => value === 'on-target')
    ? 'on-target'
    : 'needs-attention';

  return {
    status,
    upgrades,
    cosmetics,
    lures: luresAudit,
  };
}

function getCheckedInLures() {
  return Object.values(ITEM_TYPES)
    .filter((item) => item.category === 'lure')
    .reduce((lures, item) => {
      const lure = getLureByItemId(item.id);
      lures[item.id] = {
        ...lure,
        ...getLureEncounterBonus(lure),
      };
      return lures;
    }, {});
}

function containsAdvantageTerm(copy, terms) {
  const normalizedCopy = String(copy || '').toLowerCase();
  return terms.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(normalizedCopy));
}

function printAudit(audit) {
  console.log(`Monetization fairness audit: ${audit.status}`);
  console.log(`Disallowed upgrades: ${audit.upgrades.disallowedUpgrades.map((upgrade) => upgrade.upgrade_id).join(', ') || 'none'}`);
  console.log(`Disallowed cosmetics: ${audit.cosmetics.disallowedCosmetics.map((cosmetic) => cosmetic.cosmetic_id).join(', ') || 'none'}`);
  console.log(`Disallowed lures: ${audit.lures.disallowedLures.map((lure) => lure.item_id).join(', ') || 'none'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  printAudit(auditMonetizationFairness());
}
