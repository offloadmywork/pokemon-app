import { COSMETIC_CATALOG, getCosmetic } from '@/game/cosmetics';

export class CosmeticsViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.wallet = { user_id: null, coins: 0, shards: 0 };
    this.ownedCosmetics = {};
    this.catalog = Object.keys(COSMETIC_CATALOG)
      .map((cosmeticId) => getCosmetic(cosmeticId))
      .filter(Boolean);
    this.lastPurchase = null;
    this.lastEquipped = null;
    this.isLoading = true;
    this.isPurchasing = false;
    this.isEquipping = false;
    this.error = null;
  }

  async loadCosmetics() {
    this.isLoading = true;
    this.error = null;

    try {
      const [wallet, cosmeticsResult] = await Promise.all([
        this.api.getWallet(),
        this.api.getCosmetics(),
      ]);

      this.wallet = wallet || { user_id: null, coins: 0, shards: 0 };
      const cosmetics = Array.isArray(cosmeticsResult?.cosmetics)
        ? cosmeticsResult.cosmetics
        : [];
      this.ownedCosmetics = cosmetics.reduce((acc, cosmetic) => {
        acc[cosmetic.cosmetic_id] = { equipped: Boolean(cosmetic.equipped) };
        return acc;
      }, {});

      return {
        wallet: this.wallet,
        ownedCosmetics: this.ownedCosmetics,
        catalog: this.catalog,
      };
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load cosmetics:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async purchase(cosmeticId) {
    this.isPurchasing = true;
    this.error = null;

    try {
      const result = await this.api.purchaseCosmetic(cosmeticId);
      this.lastPurchase = result;

      if (result?.wallet) {
        this.wallet = result.wallet;
      }

      if (result?.cosmetic?.cosmetic_id) {
        this.ownedCosmetics = {
          ...this.ownedCosmetics,
          [result.cosmetic.cosmetic_id]: { equipped: Boolean(result.cosmetic.equipped) },
        };
      }

      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to purchase cosmetic:', err);
      return null;
    } finally {
      this.isPurchasing = false;
    }
  }

  async equip(cosmeticId) {
    this.isEquipping = true;
    this.error = null;

    try {
      const result = await this.api.equipCosmetic(cosmeticId);
      this.lastEquipped = result;
      const equippedCosmetic = getCosmetic(cosmeticId);

      if (equippedCosmetic) {
        this.ownedCosmetics = Object.entries(this.ownedCosmetics).reduce((acc, [ownedId, ownedState]) => {
          const ownedCatalogItem = getCosmetic(ownedId);
          acc[ownedId] = {
            ...ownedState,
            equipped: ownedCatalogItem?.slot === equippedCosmetic.slot
              ? ownedId === cosmeticId
              : Boolean(ownedState.equipped),
          };
          return acc;
        }, {});
      }

      if (result?.cosmetic?.cosmetic_id) {
        this.ownedCosmetics = {
          ...this.ownedCosmetics,
          [result.cosmetic.cosmetic_id]: { equipped: Boolean(result.cosmetic.equipped) },
        };
      }

      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to equip cosmetic:', err);
      return null;
    } finally {
      this.isEquipping = false;
    }
  }

  isOwned(cosmeticId) {
    return Boolean(this.ownedCosmetics[cosmeticId]);
  }
}

export function createCosmeticsViewModel(apiClient) {
  return new CosmeticsViewModel(apiClient);
}
