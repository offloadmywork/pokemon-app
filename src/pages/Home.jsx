import { useEffect, useState } from "react";
import { pokemonAPI } from "@/api/client";
import { Button } from "@/components/ui/button";
import AchievementsPanel from "@/components/AchievementsPanel";
import DailyQuestsPanel from "@/components/DailyQuestsPanel";
import WeeklyMissionsPanel from "@/components/WeeklyMissionsPanel";
import CollectionMasteryPanel from "@/components/CollectionMasteryPanel";
import ChallengeTowerPanel from "@/components/ChallengeTowerPanel";
import CoopRaidPanel from "@/components/CoopRaidPanel";
import CosmeticsPanel from "@/components/CosmeticsPanel";
import EvolutionPanel from "@/components/EvolutionPanel";
import PvpPanel from "@/components/PvpPanel";
import ShopPanel from "@/components/ShopPanel";
import TradingPanel from "@/components/TradingPanel";
import TrainerCardPreview from "@/components/TrainerCardPreview";
import TrainerRecoveryPanel from "@/components/TrainerRecoveryPanel";
import UpgradePanel from "@/components/UpgradePanel";
import { featureFlags } from "@/config/featureFlags";
import { getActiveSeasonalEvent } from "@/game/seasonalEvents";
import { CalendarCheck, CheckCircle2, Gamepad2, Gift, PartyPopper, Search, ShieldPlus, Star, Swords, Trophy } from "lucide-react";
import TutorialCoach from "@/components/TutorialCoach";

const HUB_SECTIONS = [
  { key: 'play', label: 'Play' },
  { key: 'social', label: 'Social' },
  { key: 'shop', label: 'Shop' },
  { key: 'profile', label: 'Profile' },
];

export default function Home({ onNavigate, apiClient = pokemonAPI, today = new Date().toISOString().slice(0, 10) }) {
  const [starterState, setStarterState] = useState('loading');
  const [bossClears, setBossClears] = useState([]);
  const [section, setSection] = useState('play');
  const activeSeasonalEvent = getActiveSeasonalEvent(today);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const caught = await apiClient.getCaughtPokemon();
        if (!isMounted) return;
        setStarterState(caught.length === 0 ? 'needs-starters' : 'ready');

        try {
          const clears = await apiClient.getBossClears?.();
          if (isMounted && Array.isArray(clears)) {
            setBossClears(clears);
          }
        } catch {
          if (isMounted) setBossClears([]);
        }
      } catch {
        if (isMounted) setStarterState('unknown');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  const handleClaimStarters = async () => {
    setStarterState('claiming');
    try {
      const result = await apiClient.claimStarters();
      setStarterState(result?.success ? 'ready' : 'needs-starters');
    } catch {
      setStarterState('needs-starters');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center px-4 py-6 sm:px-6">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <div className="mb-8 animate-bounce flex items-center justify-center">
            <Gamepad2 className="w-16 h-16 sm:w-24 sm:h-24 text-white drop-shadow-lg" />
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 sm:mb-6 drop-shadow-lg">
            Pokémon Adventure!
          </h1>
          
          <p className="text-lg sm:text-2xl text-white/90 mb-8 sm:mb-12 font-semibold">
            Catch amazing Pokémons and build your collection!
          </p>
          
          <div className="flex flex-col gap-4 max-w-sm mx-auto mb-10">
            <Button 
              onClick={() => onNavigate('browse')}
              className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
            >
              <Search className="w-6 h-6 sm:w-7 sm:h-7 mr-3" />
              Find Pokémons
            </Button>
            
            <Button 
              onClick={() => onNavigate('collection')}
              className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
            >
              <Star className="w-6 h-6 sm:w-7 sm:h-7 mr-3" />
              My Collection
            </Button>
          </div>
        </div>

        <div className="gold-panel p-5 mb-6 text-left">
          <div className="gold-panel-content">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#4f3514]">Starter Path</h2>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-[#5c4320]/80">
                  <span className="inline-flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" />
                    Catch
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldPlus className="w-3.5 h-3.5" />
                    Team
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Dailies
                  </span>
                  {starterState === 'ready' && (
                    <span className="inline-flex items-center gap-1 text-[#2f6f3a]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Starters Ready
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {starterState === 'needs-starters' || starterState === 'claiming' ? (
                  <Button
                    onClick={handleClaimStarters}
                    disabled={starterState === 'claiming'}
                    className="h-11 px-4 text-sm font-bold"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    {starterState === 'claiming' ? 'Claiming...' : 'Claim Starters'}
                  </Button>
                ) : null}
                {starterState === 'ready' ? (
                  <Button
                    onClick={() => onNavigate('browse')}
                    className="h-11 px-4 text-sm font-bold"
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    Start First Battle
                  </Button>
                ) : null}
                <Button
                  onClick={() => onNavigate('browse')}
                  className="h-11 px-4 text-sm font-bold"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Catch First Pokémon
                </Button>
                <Button
                  onClick={() => onNavigate('collection')}
                  className="h-11 px-4 text-sm font-bold"
                >
                  <ShieldPlus className="w-4 h-4 mr-2" />
                  Build Team
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div role="tablist" aria-label="Home sections" className="flex gap-2 mb-6 justify-center">
          {HUB_SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={section === key}
              onClick={() => setSection(key)}
              className={`px-4 py-2 rounded-full text-sm font-black border-2 transition ${
                section === key
                  ? 'bg-white text-[#4f3514] border-white shadow-lg'
                  : 'bg-black/20 text-white/90 border-transparent hover:bg-black/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {section === 'play' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyQuestsPanel />
          <WeeklyMissionsPanel />
          <div className="flex flex-col gap-6">
            {activeSeasonalEvent && (
              <div className="gold-panel p-6 text-left">
                <div className="gold-panel-content">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">Seasonal Event</p>
                      <h2 className="mt-1 text-2xl font-bold flex items-center gap-2">
                        <PartyPopper className="w-6 h-6" />
                        {activeSeasonalEvent.name}
                      </h2>
                      <p className="mt-2 text-sm sm:text-base text-[#5c4320]/80">
                        {activeSeasonalEvent.boostedTypes.join(' / ')} boosted
                      </p>
                    </div>
                    <span className="rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
                      +{Math.round((activeSeasonalEvent.xpMultiplier - 1) * 100)}% XP
                    </span>
                  </div>
                </div>
              </div>
            )}
            <ChallengeTowerPanel />
            <EvolutionPanel />
            {bossClears.length > 0 && (
              <div className="gold-panel p-6 text-left">
                <div className="gold-panel-content">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                        <Trophy className="w-6 h-6" />
                        Zone Bosses
                      </h2>
                      <p className="text-sm sm:text-base text-[#5c4320]/80">
                        Latest: {bossClears[0].name}
                      </p>
                    </div>
                    <span className="rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
                      {bossClears.length} cleared
                    </span>
                  </div>
                  <Button
                    onClick={() => onNavigate('browse')}
                    className="mt-4 h-11 px-5 text-base sm:text-lg font-bold"
                  >
                    <Swords className="w-4 h-4 mr-2" />
                    Challenge Bosses
                  </Button>
                </div>
              </div>
            )}
            {featureFlags.leaderboards && (
              <div className="gold-panel p-6 text-left">
                <div className="gold-panel-content">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Trophy className="w-6 h-6" /> Leaderboards</h2>
                  <p className="text-sm sm:text-base text-[#5c4320]/80 mb-4">
                    Check the top trainers and see how your team stacks up.
                  </p>
                  <Button
                    onClick={() => onNavigate('leaderboards')}
                    className="h-11 px-5 text-base sm:text-lg font-bold"
                  >
                    View Leaderboards
                  </Button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {section === 'social' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PvpPanel apiClient={apiClient} onNavigate={featureFlags.leaderboards ? onNavigate : null} />
            <CoopRaidPanel apiClient={apiClient} />
            <TradingPanel apiClient={apiClient} />
          </div>
        )}

        {section === 'shop' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ShopPanel apiClient={apiClient} />
            <UpgradePanel apiClient={apiClient} />
            <CosmeticsPanel apiClient={apiClient} />
          </div>
        )}

        {section === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrainerCardPreview apiClient={apiClient} />
            <AchievementsPanel apiClient={apiClient} />
            <CollectionMasteryPanel apiClient={apiClient} />
            <TrainerRecoveryPanel apiClient={apiClient} />
          </div>
        )}
      </div>
      <TutorialCoach page="home" />
      </div>
  );
}
