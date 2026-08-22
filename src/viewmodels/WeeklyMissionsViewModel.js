// WeeklyMissionsViewModel - Business logic for Weekly Missions (Phase 4 Live Ops)
// Testable without browser - pure state management

export class WeeklyMissionsViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.missions = [];
    this.weekKey = null;
    this.lastClaimResult = null;
    this.isLoading = true;
    this.error = null;
  }

  async loadWeeklyMissions() {
    this.isLoading = true;
    this.error = null;
    this.lastClaimResult = null;

    try {
      const response = await this.api.getWeeklyMissions();
      const missions = Array.isArray(response) ? response : response?.missions;
      this.missions = missions || [];
      this.weekKey = Array.isArray(response) ? null : response?.week_key || null;
      return this.missions;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load weekly missions:', err);
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  setMissions(missions) {
    this.missions = missions || [];
  }

  hasClaimableRewards() {
    return (this.missions || []).some(
      (mission) => Number(mission.progress) >= Number(mission.target) && !mission.claimed_at
    );
  }

  async claimAll() {
    try {
      const result = await this.api.claimAllWeeklyMissions();
      if (result && (result.claimedCount > 0 || result.chestGranted)) {
        this.lastClaimResult = result;
      }
      // Refresh missions so claimed state reflects the server.
      await this.loadWeeklyMissions();
      // loadWeeklyMissions resets lastClaimResult; restore the claim feedback.
      this.lastClaimResult = result && result.claimedCount > 0 ? result : null;
      return result;
    } catch (err) {
      console.error('Failed to claim weekly missions:', err);
      return null;
    }
  }
}
