import { SHOP_CATALOG, getShopItem } from '@/game/economy';

export class ShopViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.wallet = { user_id: null, coins: 0, shards: 0 };
    this.inventory = {};
    this.catalog = Object.keys(SHOP_CATALOG)
      .map((itemId) => getShopItem(itemId))
      .filter(Boolean);
    this.lastPurchase = null;
    this.isLoading = true;
    this.isPurchasing = false;
    this.error = null;
  }

  async loadShop() {
    this.isLoading = true;
    this.error = null;

    try {
      const [wallet, items] = await Promise.all([
        this.api.getWallet(),
        this.api.getItems(),
      ]);

      this.wallet = wallet || { user_id: null, coins: 0, shards: 0 };
      this.inventory = Array.isArray(items)
        ? items.reduce((acc, item) => {
          acc[item.item_id] = item.quantity;
          return acc;
        }, {})
        : {};

      return {
        wallet: this.wallet,
        inventory: this.inventory,
        catalog: this.catalog,
      };
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load shop:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async purchase(itemId, quantity = 1) {
    this.isPurchasing = true;
    this.error = null;

    try {
      const result = await this.api.purchaseShopItem(itemId, quantity);
      this.lastPurchase = result;

      if (result?.wallet) {
        this.wallet = result.wallet;
      }

      if (result?.item?.item_id) {
        this.inventory = {
          ...this.inventory,
          [result.item.item_id]: result.item.quantity,
        };
      }

      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to purchase shop item:', err);
      return null;
    } finally {
      this.isPurchasing = false;
    }
  }
}

export function createShopViewModel(apiClient) {
  return new ShopViewModel(apiClient);
}
