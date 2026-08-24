import { lazy, Suspense, useEffect, useState } from "react";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import Collection from "@/pages/Collection";
import TeamPage from "@/pages/TeamPage";
import Leaderboards from "@/pages/Leaderboards";
import { featureFlags } from "@/config/featureFlags";
import { pokemonAPI } from "@/api/client";
import { Home as HomeIcon, Map, Mountain, Shield, Star, Trophy, Volume2, VolumeX } from "lucide-react";
import { isMuted, setMuted as setMutedState, toggleMuted, playSfx } from "@/game/audio";
import { getVolume, setVolume, hasSoundHintBeenSeen, markSoundHintSeen } from "@/game/music";

const AdventureWorld = lazy(() => import('@/components/AdventureWorld'));

const primaryTabs = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'browse', label: 'Map', icon: Map },
  { key: 'adventure', label: 'World', icon: Mountain },
  { key: 'collection', label: 'Collection', icon: Star },
  { key: 'team', label: 'Team', icon: Shield, page: 'team' },
  { key: 'leaderboards', label: 'Rankings', icon: Trophy, feature: 'leaderboards' },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [worldEncounterToken, setWorldEncounterToken] = useState(0);
  const [muted, setMuted] = useState(() => isMuted());
  const [volume, setVolumeState] = useState(() => getVolume());
  const [showSoundHint, setShowSoundHint] = useState(() => !isMuted() && !hasSoundHintBeenSeen());

  // Browsers suspend audio until a first user gesture — tell the player once.
  useEffect(() => {
    if (!showSoundHint) return;
    const dismiss = () => {
      setShowSoundHint(false);
      markSoundHintSeen();
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
    window.addEventListener('pointerdown', dismiss);
    window.addEventListener('keydown', dismiss);
    return () => {
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
    };
  }, [showSoundHint]);

  const navigate = (page) => {
    if (page === 'leaderboards' && !featureFlags.leaderboards) return;
    playSfx('ui_tap');
    setCurrentPage(page);
  };

  const handleToggleMute = () => {
    const next = toggleMuted();
    setMuted(next);
    if (!next) playSfx('ui_tap');
  };

  const handleVolumeChange = (e) => {
    const next = Number(e.target.value);
    setVolume(next);
    setVolumeState(next);
    if (next > 0 && muted) {
      setMutedState(false);
      setMuted(false);
    }
  };

  const visibleTabs = primaryTabs.filter((tab) => !tab.feature || featureFlags[tab.feature]);

  return (
    <div className="min-h-screen">
      {showSoundHint && (
        <div
          role="status"
          className="fixed top-16 left-1/2 z-[60] -translate-x-1/2 rounded-full border-2 border-[#1f2a44] bg-[#fff7d6] px-4 py-2 text-xs font-black text-[#4f3514] shadow-[0_3px_0_#1f2a44]"
        >
          🔊 Tap anywhere to enable sound & music
        </div>
      )}
      <div className="fixed top-3 right-3 z-[60] flex items-center gap-2 rounded-full border-2 border-[#1f2a44] bg-[#fff7d6]/95 px-3 py-1.5 shadow-[0_3px_0_#1f2a44]">
        <button
          type="button"
          aria-label={muted ? 'Unmute game sounds' : 'Mute game sounds'}
          onClick={handleToggleMute}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#1f2a44]"
        >
          {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          aria-label="Music volume"
          onChange={handleVolumeChange}
          className="w-20 accent-[#a2671b]"
        />
      </div>
      <div
        data-testid="app-content"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {currentPage === 'home' && <Home onNavigate={navigate} />}
        {currentPage === 'browse' && <Browse onNavigate={navigate} worldEncounterToken={worldEncounterToken} />}
        {currentPage === 'adventure' && (
          <Suspense fallback={<div className="min-h-screen bg-[#10263a] p-8 font-mono text-[#fff5ca]">Loading Verdant Path…</div>}>
            <AdventureWorld
              onNavigate={navigate}
              onEncounter={() => {
                setWorldEncounterToken((token) => token + 1);
                navigate('browse');
              }}
            />
          </Suspense>
        )}
        {currentPage === 'collection' && <Collection onNavigate={navigate} />}
        {currentPage === 'team' && <TeamPage onNavigate={navigate} apiClient={pokemonAPI} />}
        {currentPage === 'leaderboards' && featureFlags.leaderboards && (
          <Leaderboards onNavigate={navigate} />
        )}
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-[#1f2a44] bg-[#fff7d6]/95 px-2 py-2 shadow-[0_-6px_0_rgba(31,42,68,0.12)] backdrop-blur"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        <div
          className="mx-auto grid max-w-3xl gap-1"
          style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
        >
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const page = tab.page || tab.key;
            const isActive = currentPage === page;

            return (
              <button
                key={tab.key}
                type="button"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => navigate(page)}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border-2 px-1 text-xs font-black transition ${
                  isActive
                    ? 'border-[#1f2a44] bg-[#ffd54f] text-[#1f2a44] shadow-[0_3px_0_#1f2a44]'
                    : 'border-transparent text-[#3b4260] hover:border-[#1f2a44]/40 hover:bg-white'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
