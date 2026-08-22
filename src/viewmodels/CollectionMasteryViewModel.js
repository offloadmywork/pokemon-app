// CollectionMasteryViewModel - Business logic for Pokedex Mastery (Phase 4 Live Ops)

export class CollectionMasteryViewModel {
  constructor(apiClient) {
    this.api = apiClient;
    this.status = null;
    this.lastClaimResult = null;
    this.claimError = null;
    this.isLoading = true;
    this.error = null;
  }

  async loadMasteryStatus() {
    this.isLoading = true;
    this.error = null;
    
    try {
      this.status = await this.api.getMasteryStatus();
      return this.status;
    } catch (err) {
      this.error = err.message;
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async claimTier(tierId) {
    this.claimError = null;
    try {
      const result = await this.api.claimMasteryTier(tierId);
      if (!result?.tier) {
        this.claimError = 'Failed to claim tier.';
        return null;
      }
      this.lastClaimResult = result;
      // Refresh to get updated claimed/claimable flags
      await this.loadMasteryStatus();
      // Restore result after refresh cleared it (if loadMasteryStatus clears it)
      this.lastClaimResult = result;
      return result;
    } catch (err) {
      this.claimError = err.message;
      console.error('Failed to claim mastery tier:', err);
      return null;
    }
  }
}
