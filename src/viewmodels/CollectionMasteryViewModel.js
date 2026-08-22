// CollectionMasteryViewModel - Business logic for Collection Mastery Tiers (Phase 4)
// Testable without browser - pure state management

export class CollectionMasteryViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.tiers = [];
    this.currentTier = null;
    this.caughtCount = 0;
    this.claimError = null;
    this.isLoading = true;
    this.error = null;
  }

  async loadStatus() {
    this.isLoading = true;
    this.error = null;
    this.claimError = null;

    try {
      const status = await this.api.getMasteryStatus();
      this.setStatus(status);
      return this.tiers;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load collection mastery:', err);
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  setStatus(status) {
    this.tiers = (status?.tiers || []).map((tier) => ({ ...tier }));
    this.currentTier = status?.current_tier || null;
    this.caughtCount = Number(status?.caught_count) || 0;
  }

  hasClaimableTiers() {
    return (this.tiers || []).some((tier) => tier.claimable && !tier.claimed);
  }

  async claimTier(tierId) {
    this.claimError = null;
    try {
      const result = await this.api.claimMasteryTier(tierId);
      const claimedTier = this.tiers.find((tier) => tier.id === tierId);
      if (claimedTier) {
        claimedTier.claimed = true;
        claimedTier.claimable = false;
      }
      return result;
    } catch (err) {
      this.claimError = err.message;
      console.error('Failed to claim mastery tier:', err);
      return null;
    }
  }
}
