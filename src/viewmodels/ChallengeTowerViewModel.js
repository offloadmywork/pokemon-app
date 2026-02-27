// ChallengeTowerViewModel - Business logic for Challenge Tower
// Testable without browser - pure state management

export class ChallengeTowerViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.floors = [];
    this.progress = null;
    this.currentFloor = null;
    this.isLoading = true;
    this.error = null;
  }

  async loadTower() {
    this.isLoading = true;
    this.error = null;

    try {
      const data = await this.api.getChallengeTower();
      this.floors = data.floors || [];
      this.progress = data.progress || null;
      this.currentFloor = data.current_floor || null;
      return data;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load challenge tower:', err);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  async completeFloor(floorNumber) {
    try {
      const data = await this.api.completeChallengeTowerFloor(floorNumber);
      this.floors = data.floors || this.floors;
      this.progress = data.progress || this.progress;
      this.currentFloor = data.current_floor || this.currentFloor;
      return data;
    } catch (err) {
      console.error('Failed to complete tower floor:', err);
      return null;
    }
  }
}

export function createChallengeTowerViewModel(apiClient) {
  return new ChallengeTowerViewModel(apiClient);
}
