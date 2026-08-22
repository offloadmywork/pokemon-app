export class AchievementsViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.progress = { collection: 0 };
    this.achievements = [];
    this.wallet = { user_id: null, coins: 0, shards: 0 };
    this.lastClaim = null;
    this.isLoading = true;
    this.isClaiming = false;
    this.error = null;
  }

  async loadAchievements() {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await this.api.getAchievements();
      this.progress = result?.progress || { collection: 0 };
      this.achievements = result?.achievements || [];

      return {
        progress: this.progress,
        achievements: this.achievements,
      };
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load achievements:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  getClaimableCount() {
    return this.achievements.filter((achievement) => achievement.claimable).length;
  }

  async claim(achievementId) {
    this.isClaiming = true;
    this.error = null;

    try {
      const result = await this.api.claimAchievement(achievementId);
      this.lastClaim = result;

      if (result?.wallet) {
        this.wallet = result.wallet;
      }

      this.achievements = this.achievements.map((achievement) => (
        achievement.achievement_id === achievementId
          ? { ...achievement, claimed: true, claimable: false }
          : achievement
      ));

      return result;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to claim achievement:', err);
      return null;
    } finally {
      this.isClaiming = false;
    }
  }
}

export function createAchievementsViewModel(apiClient) {
  return new AchievementsViewModel(apiClient);
}
