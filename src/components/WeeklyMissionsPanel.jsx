import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { WeeklyMissionsViewModel } from '@/viewmodels/WeeklyMissionsViewModel';
import { Trophy, CheckCircle, Gift } from 'lucide-react';

export default function WeeklyMissionsPanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new WeeklyMissionsViewModel(apiClient));
  const [missions, setMissions] = useState([]);
  const [weekKey, setWeekKey] = useState(null);
  const [claimResult, setClaimResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      await viewModel.loadWeeklyMissions();
      setMissions(viewModel.missions);
      setWeekKey(viewModel.weekKey);
      setIsLoading(viewModel.isLoading);
      setError(viewModel.error);
    })();
  }, [viewModel]);

  const refreshFromViewModel = () => {
    setMissions(viewModel.missions);
    setWeekKey(viewModel.weekKey);
  };

  const handleClaimAll = async () => {
    const result = await viewModel.claimAll();
    setClaimResult(result);
    refreshFromViewModel();
  };

  if (isLoading) {
    return (
      <div className="gold-inset p-4 text-center">
        Loading weekly missions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="gold-inset p-4 text-center">
        Failed to load weekly missions.
      </div>
    );
  }

  const hasClaimable = viewModel.hasClaimableRewards();

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Trophy className="w-5 h-5" /> Weekly Missions
        </h2>
        {weekKey && (
          <p className="text-xs text-[#5c4320]/70 mb-4">Season week {weekKey.split('-W')[1]} · resets Monday</p>
        )}

        {claimResult && claimResult.claimedCount > 0 && (
          <div className="gold-inset mb-4 p-3 flex items-center gap-2 text-sm text-[#4f3514]" role="status">
            <CheckCircle className="w-4 h-4 text-[#3f7d33]" />
            <span className="font-bold">
              Claimed +{claimResult.totalXp} XP, +{claimResult.totalCoins} coins
            </span>
            {claimResult.chestGranted && (
              <span className="flex items-center gap-1 font-bold text-[#a2671b]">
                <Gift className="w-4 h-4" /> Weekly chest: {claimResult.chest?.quantity}× {claimResult.chest?.item_id}!
              </span>
            )}
          </div>
        )}

        <ul className="grid gap-3 mb-4">
          {missions.map((mission) => {
            const complete = Number(mission.progress) >= Number(mission.target);
            return (
              <li key={mission.mission_key} className="gold-inset p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-[#4f3514]">{mission.title}</span>
                  <span className={`text-xs font-bold ${complete ? 'text-[#3f7d33]' : 'text-[#5c4320]/80'}`}>
                    {mission.progress} / {mission.target}
                  </span>
                </div>
                <p className="text-xs text-[#5c4320]/80 mb-2">{mission.description}</p>
                <div className="h-2 rounded-full bg-[#e8d9b8] overflow-hidden">
                  <div
                    className="h-full bg-[#c9962e]"
                    style={{ width: `${Math.min(100, (Number(mission.progress) / Number(mission.target)) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[#5c4320]/70">
                  Reward: +{mission.reward_xp} XP · +{mission.reward_coins} coins
                  {mission.claimed_at && <span className="ml-2 font-bold text-[#3f7d33]">Claimed ✓</span>}
                </p>
              </li>
            );
          })}
        </ul>

        {hasClaimable && (
          <Button onClick={handleClaimAll} className="w-full">
            Claim Weekly Rewards
          </Button>
        )}
      </div>
    </div>
  );
}
