import { UPGRADE_CATALOG, calculateUpgradeCost } from '@/game/economy';

export class UpgradeViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.wallet = { user_id: null, coins: 0, shards: 0 };
    this.upgrades = {};
    this.catalog = Object.values(UPGRADE_CATALOG);
    this.lastPurchase = null;
    this.isLoading = true;
    this.isPurchasing = false;
    this.error = null;
  }

  async loadUpgrades() {
    this.isLoading = true;
    this.error = null;

    try {
      const [wallet, upgradeState] = await Promise.all([
        this.api.getWallet(),
        this.api.getUpgrades(),
      ]);

      this.wallet = wallet || { user_id: null, coins: 0, shards: 0 };
      this.upgrades = upgradeState?.upgrades || {};

      return {
        wallet: this.wallet,
        upgrades: this.upgrades,
        catalog: this.catalog,
      };
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load upgrades:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  getUpgradeLevel(upgradeId) {
    return Math.max(0, Number(this.upgrades[upgradeId]) || 0);
  }

  getUpgradeCost(upgradeId) {
    return calculateUpgradeCost(upgradeId, this.getUpgradeLevel(upgradeId));
  }

  isUpgradeMaxed(upgradeId) {
    const upgrade = UPGRADE_CATALOG[upgradeId];
    return Boolean(upgrade) && this.getUpgradeLevel(upgradeId) >= upgrade.max_level;
  }

  async purchase(upgradeId) {
    this.isPurchasing = true;
    this.error = null;

    try {
      const result = await this.api.purchaseUpgrade(upgradeId);
      this.lastPurchase = result;

      if (result?.wallet) {
        this.wallet = result.wallet;
      }

      if (result?.upgrade?.upgrade_id) {
        this.upgrades = {
          ...this.upgrades,
          [result.upgrade.upgrade_id]: result.upgrade.level,
        };
      }

      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to purchase upgrade:', err);
      return null;
    } finally {
      this.isPurchasing = false;
    }
  }
}

export function createUpgradeViewModel(apiClient) {
  return new UpgradeViewModel(apiClient);
}
