// DailyQuestsViewModel - Business logic for Daily Quests
// Testable without browser - pure state management

import { getDailyQuestRotationPreview } from '@/game/dailyQuestTemplates';

export class DailyQuestsViewModel {
  constructor(apiClient) {
    this.api = apiClient;

    this.quests = [];
    this.dailyStreak = null;
    this.questPreview = null;
    this.isLoading = true;
    this.error = null;
  }

  async loadDailyQuests(date = new Date().toISOString().slice(0, 10)) {
    this.isLoading = true;
    this.error = null;

    try {
      const quests = await this.api.getDailyQuests();
      this.quests = quests;
      await this._loadQuestPreview(date);
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
      if (updated?.daily_streak) {
        this.dailyStreak = updated.daily_streak;
      }
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

  async _loadQuestPreview(date) {
    if (typeof this.api.getProgress !== 'function') {
      this.questPreview = null;
      return;
    }

    try {
      const progress = await this.api.getProgress();
      this.questPreview = progress?.level
        ? getDailyQuestRotationPreview(progress.level, date)
        : null;
    } catch {
      this.questPreview = null;
    }
  }
}

export function createDailyQuestsViewModel(apiClient) {
  return new DailyQuestsViewModel(apiClient);
}
