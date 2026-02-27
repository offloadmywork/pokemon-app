import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { pokemonAPI } from "@/api/client";

const LEADERBOARD_TABS = [
  {
    key: 'level',
    label: 'Level',
    emoji: '🏆',
    description: 'Highest levels and XP',
    formatDetail: (detail) => `Level ${detail.level} • ${detail.xp} XP`,
  },
  {
    key: 'caught',
    label: 'Catches',
    emoji: '🎯',
    description: 'Most Pokémon caught',
    formatDetail: (detail) => `${detail.caught} caught`,
  },
  {
    key: 'tower',
    label: 'Tower',
    emoji: '🗼',
    description: 'Best Challenge Tower floors',
    formatDetail: (detail) => `Floor ${detail.best_floor}`,
  },
];

const getTrainerName = (userId) => `Trainer ${userId.slice(0, 6).toUpperCase()}`;

export default function Leaderboards({ onNavigate, apiClient = pokemonAPI }) {
  const [activeKey, setActiveKey] = useState('level');
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeTab = useMemo(
    () => LEADERBOARD_TABS.find((tab) => tab.key === activeKey),
    [activeKey]
  );

  const sortedEntries = useMemo(() => {
    const list = [...entries];
    if (activeKey === 'level') {
      return list.sort((a, b) => {
        const levelDiff = (b.detail?.level ?? 0) - (a.detail?.level ?? 0);
        if (levelDiff !== 0) return levelDiff;
        return (b.detail?.xp ?? 0) - (a.detail?.xp ?? 0);
      });
    }
    if (activeKey === 'caught') {
      return list.sort(
        (a, b) => (b.detail?.caught ?? b.score ?? 0) - (a.detail?.caught ?? a.score ?? 0)
      );
    }
    if (activeKey === 'tower') {
      return list.sort(
        (a, b) =>
          (b.detail?.best_floor ?? b.score ?? 0) - (a.detail?.best_floor ?? a.score ?? 0)
      );
    }
    return list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [entries, activeKey]);

  const getDisplayScore = (entry) => {
    if (activeKey === 'level') return entry.detail?.level ?? entry.score;
    if (activeKey === 'caught') return entry.detail?.caught ?? entry.score;
    if (activeKey === 'tower') return entry.detail?.best_floor ?? entry.score;
    return entry.score;
  };

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiClient.getLeaderboard(activeKey, 10);
        if (isMounted) {
          setEntries(result.entries || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load leaderboard');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [activeKey, apiClient]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
              🏆 Leaderboards
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-semibold mt-1">
              See the top trainers across the region!
            </p>
          </div>
          <Button
            onClick={() => onNavigate('home')}
            className="h-12 px-6 text-lg font-bold bg-white hover:bg-gray-100 text-purple-900 rounded-xl"
          >
            🏠 Home
          </Button>
        </div>

        <div className="bg-white/20 backdrop-blur rounded-3xl p-4 md:p-6 mb-6 border-2 border-white/30">
          <div className="flex flex-wrap gap-2 mb-4">
            {LEADERBOARD_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveKey(tab.key)}
                className={`px-4 py-2 rounded-full font-bold transition-all border-2 ${
                  activeKey === tab.key
                    ? 'bg-white text-purple-700 border-white'
                    : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          <div className="text-white/80 mb-4 font-semibold">
            {activeTab?.description}
          </div>

          {isLoading && (
            <div className="bg-white/10 rounded-2xl p-6 text-center text-white font-bold">
              Loading leaderboard...
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-red-500/20 rounded-2xl p-6 text-center text-white font-bold">
              {error}
            </div>
          )}

          {!isLoading && !error && entries.length === 0 && (
            <div className="bg-white/10 rounded-2xl p-6 text-center text-white/80 font-semibold">
              No leaderboard data yet. Start playing to climb the ranks!
            </div>
          )}

          {!isLoading && !error && sortedEntries.length > 0 && (
            <div className="space-y-3">
              {sortedEntries.map((entry, index) => (
                <div
                  key={`${activeKey}-${entry.user_id}`}
                  className="bg-white/15 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 border border-white/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-black text-yellow-300 w-10 text-center">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">
                        {getTrainerName(entry.user_id)}
                      </div>
                      <div className="text-white/70 text-sm">
                        {activeTab?.formatDetail?.(entry.detail || {})}
                      </div>
                    </div>
                  </div>
                  <div className="text-white font-black text-lg">
                    {getDisplayScore(entry)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
