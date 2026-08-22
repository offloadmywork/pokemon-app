import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { DailyQuestsViewModel } from '@/viewmodels/DailyQuestsViewModel';
import { getItemById } from '@/game/items';
import { CalendarDays, CheckCircle, Flame, Gift, LockKeyhole, RotateCw } from 'lucide-react';

export default function DailyQuestsPanel({ apiClient = pokemonAPI, today = new Date().toISOString().slice(0, 10) }) {
  const [viewModel] = useState(() => new DailyQuestsViewModel(apiClient));
  const [quests, setQuests] = useState([]);
  const [dailyStreak, setDailyStreak] = useState(null);
  const [questPreview, setQuestPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      await viewModel.loadDailyQuests(today);
      setQuests(viewModel.quests);
      setQuestPreview(viewModel.questPreview);
      setIsLoading(viewModel.isLoading);
      setError(viewModel.error);
    })();
  }, [viewModel, today]);

  const handleClaim = async (questId) => {
    await viewModel.claimQuest(questId);
    setQuests(viewModel.quests);
    setDailyStreak(viewModel.dailyStreak);
  };

  if (isLoading) {
    return (
      <div className="gold-inset p-4 text-center">
        Loading daily quests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="gold-inset p-4 text-center">
        Failed to load quests.
      </div>
    );
  }

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Daily Quests</h2>
        {(questPreview?.activeAdvancedQuest || questPreview?.nextAdvancedQuest || questPreview?.nextUnlock) && (
          <div className="gold-inset mb-4 p-3 grid gap-2 text-xs sm:grid-cols-3">
            {questPreview.activeAdvancedQuest && (
              <div className="flex items-center gap-2 text-[#4f3514]">
                <RotateCw className="w-4 h-4 text-[#a2671b]" />
                <span className="font-semibold">Today: {questPreview.activeAdvancedQuest.title}</span>
              </div>
            )}
            {questPreview.nextAdvancedQuest && (
              <div className="flex items-center gap-2 text-[#5c4320]/80">
                <CalendarDays className="w-4 h-4" />
                <span>Tomorrow: {questPreview.nextAdvancedQuest.title}</span>
              </div>
            )}
            {questPreview.nextUnlock && (
              <div className="flex items-center gap-2 text-[#5c4320]/80">
                <LockKeyhole className="w-4 h-4" />
                <span>Unlocks Lv.{questPreview.nextUnlock.level}: {questPreview.nextUnlock.title}</span>
              </div>
            )}
          </div>
        )}
        {dailyStreak?.changed && (
          <div className="gold-inset mb-4 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-[#d49b31]/50">
            <div className="flex items-center gap-2 text-[#4f3514]">
              <Flame className="w-4 h-4 text-[#c25021]" />
              <span className="text-sm font-bold">{dailyStreak.streak}-day streak</span>
            </div>
            {dailyStreak.bonus && (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#5c4320]/80">
                <Gift className="w-4 h-4" />
                <span>
                  Bonus: {getItemById(dailyStreak.bonus.item_id)?.name || dailyStreak.bonus.item_id} x{dailyStreak.bonus.quantity}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-4">
          {quests.map((quest) => {
            const isCompleted = quest.progress >= quest.target;
            const isClaimed = Boolean(quest.claimed_at);
            const rewardItem = quest.reward_item_id ? getItemById(quest.reward_item_id) : null;
            const rewardPieces = [];

            if (quest.reward_xp) {
              rewardPieces.push(`${quest.reward_xp} XP`);
            }

            if (rewardItem) {
              const quantity = quest.reward_item_quantity ?? 1;
              rewardPieces.push(`${rewardItem.name} x${quantity}`);
            }

            const rewardText = rewardPieces.length ? `Reward: ${rewardPieces.join(' • ')}` : null;

            return (
              <div
                key={quest.id}
                className="gold-inset p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="font-semibold">{quest.title}</div>
                  <div className="text-sm text-[#5c4320]/80">{quest.description}</div>
                  <div className="text-sm mt-1">{quest.progress} / {quest.target}</div>
                  {rewardText && (
                    <div className="text-xs text-[#5c4320]/70 mt-1">{rewardText}</div>
                  )}
                </div>
                <div className="flex flex-row sm:flex-col sm:items-end items-center gap-2 sm:text-right">
                  {isCompleted ? (
                    <span className="text-sm font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Complete</span>
                  ) : (
                    <span className="text-sm text-[#5c4320]/80">In progress</span>
                  )}
                  {isCompleted && !isClaimed && (
                    <Button
                      onClick={() => handleClaim(quest.id)}
                    >
                      Claim
                    </Button>
                  )}
                  {isClaimed && (
                    <span className="text-xs text-[#5c4320]/70">Claimed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
