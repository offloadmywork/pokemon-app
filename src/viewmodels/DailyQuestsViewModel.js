// DailyQuestsViewModel - Business logic for Daily Quests
// Testable without browser - pure state management

export class DailyQuestsViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.quests = [];
    this.isLoading = true;
    this.error = null;
  }

  async loadDailyQuests() {
    this.isLoading = true;
    this.error = null;

    try {
      const quests = await this.api.getDailyQuests();
      this.quests = quests;
      return quests;
    } catch (err) {
      this.error = err.message;
      console.error('Failed to load daily quests:', err);
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  async updateProgress(questId, amount = 1) {
    try {
      const updated = await this.api.updateDailyQuestProgress(questId, amount);
      this._replaceQuest(updated);
      return updated;
    } catch (err) {
      console.error('Failed to update quest progress:', err);
      return null;
    }
  }

  async claimQuest(questId) {
    try {
      const updated = await this.api.claimDailyQuest(questId);
      this._replaceQuest(updated);
      return updated;
    } catch (err) {
      console.error('Failed to claim quest:', err);
      return null;
    }
  }

  _replaceQuest(updatedQuest) {
    if (!updatedQuest) return;
    this.quests = this.quests.map((quest) =>
      quest.id === updatedQuest.id ? { ...quest, ...updatedQuest } : quest
    );
  }
}

export function createDailyQuestsViewModel(apiClient) {
  return new DailyQuestsViewModel(apiClient);
}
