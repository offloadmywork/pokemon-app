import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { AchievementsViewModel } from '@/viewmodels/AchievementsViewModel';
import { AlertTriangle, CheckCircle2, Coins, Gem, Medal, Trophy } from 'lucide-react';

function formatReward(reward = {}) {
  const parts = [];
  if (reward.coins) parts.push(`${reward.coins} coins`);
  if (reward.shards) parts.push(`${reward.shards} shards`);
  return parts.join(' and ') || 'no reward';
}

export default function AchievementsPanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new AchievementsViewModel(apiClient));
  const [achievements, setAchievements] = useState(viewModel.achievements);
  const [progress, setProgress] = useState(viewModel.progress);
  const [lastClaim, setLastClaim] = useState(viewModel.lastClaim);
  const [isLoading, setIsLoading] = useState(viewModel.isLoading);
  const [isClaiming, setIsClaiming] = useState(viewModel.isClaiming);
  const [error, setError] = useState(viewModel.error);

  const syncViewModelState = () => {
    setAchievements(viewModel.achievements);
    setProgress(viewModel.progress);
    setLastClaim(viewModel.lastClaim);
    setIsLoading(viewModel.isLoading);
    setIsClaiming(viewModel.isClaiming);
    setError(viewModel.error);
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      await viewModel.loadAchievements();
      if (isMounted) syncViewModelState();
    })();

    return () => {
      isMounted = false;
    };
  }, [viewModel]);

  const handleClaim = async (achievementId) => {
    setIsClaiming(true);
    await viewModel.claim(achievementId);
    syncViewModelState();
  };

  const lastClaimAchievement = achievements.find(
    (achievement) => achievement.achievement_id === lastClaim?.achievement_id,
  );
  const claimableCount = achievements.filter((achievement) => achievement.claimable).length;

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">Milestones</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Trophy className="h-6 w-6" />
              Achievements
            </h2>
            <p className="mt-2 text-sm text-[#5c4320]/80 sm:text-base">
              Claim collection rewards as your Pokédex grows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
              <Medal className="h-4 w-4" />
              {progress.collection || 0} caught
            </span>
            {claimableCount > 0 && (
              <span className="inline-flex items-center gap-2 rounded border border-[#2f7d46]/50 bg-[#e7f7df] px-3 py-1 text-sm font-black text-[#2f6f3a]">
                <CheckCircle2 className="h-4 w-4" />
                {claimableCount} ready
              </span>
            )}
          </div>
        </div>

        <div className="gold-inset mt-4 p-4">
          {isLoading ? (
            <div className="text-sm text-[#5c4320]/80">Loading achievements...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && (
                <div className="rounded border border-[#b4532d]/50 bg-[#fff1df] p-3 text-sm text-[#7a2e1f]">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-4 w-4" />
                    Achievement claim failed
                  </div>
                  <div className="mt-1 font-semibold text-[#7a2e1f]/85">{error}</div>
                </div>
              )}

              {lastClaim && (
                <div className="rounded border border-[#2f7d46]/50 bg-[#e7f7df] p-3 text-sm font-bold text-[#2f6f3a]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Claimed {lastClaimAchievement?.title || lastClaim.achievement_id} for {formatReward(lastClaim.reward)}.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.achievement_id}
                    className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-black text-[#4f3514]">{achievement.title}</div>
                          {achievement.claimed && (
                            <span className="rounded border border-[#2f7d46]/40 bg-[#e7f7df] px-2 py-0.5 text-xs font-black text-[#2f6f3a]">
                              Claimed
                            </span>
                          )}
                          {achievement.claimable && (
                            <span className="rounded border border-[#2f7d46]/40 bg-[#e7f7df] px-2 py-0.5 text-xs font-black text-[#2f6f3a]">
                              Ready to claim
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                          {achievement.description}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-[#8a5c18]">
                          <span>{Math.min(achievement.progress, achievement.target)} / {achievement.target}</span>
                          {achievement.reward.coins > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Coins className="h-3.5 w-3.5" />
                              {achievement.reward.coins} coins
                            </span>
                          )}
                          {achievement.reward.shards > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Gem className="h-3.5 w-3.5" />
                              {achievement.reward.shards} shards
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleClaim(achievement.achievement_id)}
                        disabled={isClaiming || !achievement.claimable}
                        className="h-10 px-4 text-sm font-bold"
                      >
                        {achievement.claimed
                          ? 'Claimed'
                          : achievement.claimable
                            ? `Claim ${achievement.title}`
                            : 'Locked'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
