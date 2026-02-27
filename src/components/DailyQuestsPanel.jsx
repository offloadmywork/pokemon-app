import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { DailyQuestsViewModel } from '@/viewmodels/DailyQuestsViewModel';

export default function DailyQuestsPanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new DailyQuestsViewModel(apiClient));
  const [quests, setQuests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      await viewModel.loadDailyQuests();
      setQuests(viewModel.quests);
      setIsLoading(viewModel.isLoading);
      setError(viewModel.error);
    })();
  }, [viewModel]);

  const handleClaim = async (questId) => {
    await viewModel.claimQuest(questId);
    setQuests(viewModel.quests);
  };

  if (isLoading) {
    return (
      <div className="bg-white/20 rounded-2xl p-4 text-white text-center">
        Loading daily quests...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/20 rounded-2xl p-4 text-white text-center">
        Failed to load quests.
      </div>
    );
  }

  return (
    <div className="bg-white/20 rounded-3xl p-6 text-white shadow-xl">
      <h2 className="text-2xl font-bold mb-4">🗓️ Daily Quests</h2>
      <div className="space-y-4">
        {quests.map((quest) => {
          const isCompleted = quest.progress >= quest.target;
          const isClaimed = Boolean(quest.claimed_at);

          return (
            <div key={quest.id} className="bg-white/15 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">{quest.title}</div>
                <div className="text-sm text-white/80">{quest.description}</div>
                <div className="text-sm mt-1">{quest.progress} / {quest.target}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {isCompleted ? (
                  <span className="text-sm font-semibold">✅ Complete</span>
                ) : (
                  <span className="text-sm text-white/80">In progress</span>
                )}
                {isCompleted && !isClaimed && (
                  <Button
                    onClick={() => handleClaim(quest.id)}
                    className="bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold"
                  >
                    Claim
                  </Button>
                )}
                {isClaimed && (
                  <span className="text-xs text-white/70">Claimed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
