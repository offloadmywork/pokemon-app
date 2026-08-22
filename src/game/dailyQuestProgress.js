import { getDailyQuestTemplateKeysForEvent } from './dailyQuestEvents';

/**
 * Increment progress for any of today's daily quests that match a gameplay event.
 *
 * Requires apiClient to implement:
 * - getDailyQuests(): Promise<Array<{id:string, template_key:string}>>
 * - updateDailyQuestProgress(questId: string, amount?: number): Promise<any>
 */
export async function incrementDailyQuestsForEvent(apiClient, event, amount = 1) {
  const keys = getDailyQuestTemplateKeysForEvent(event);
  if (!keys || keys.length === 0) return [];

  let quests;
  try {
    quests = await apiClient.getDailyQuests();
  } catch {
    return [];
  }

  const matching = (quests || []).filter((q) => keys.includes(q.template_key));
  const updated = [];

  for (const quest of matching) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await apiClient.updateDailyQuestProgress(quest.id, amount);
      updated.push(res);
    } catch {
      // best-effort
    }
  }

  return updated;
}
