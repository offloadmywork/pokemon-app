import { useState } from "react";
import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import Collection from "@/pages/Collection";
import Leaderboards from "@/pages/Leaderboards";
import { featureFlags } from "@/config/featureFlags";
import { Home as HomeIcon, Map, Shield, Star, Trophy, Volume2, VolumeX } from "lucide-react";
import { isMuted, toggleMuted, playSfx } from "@/game/audio";

const primaryTabs = [
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'browse', label: 'Map', icon: Map },
  { key: 'collection', label: 'Collection', icon: Star },
  { key: 'team', label: 'Team', icon: Shield, page: 'collection' },
  { key: 'leaderboards', label: 'Rankings', icon: Trophy, feature: 'leaderboards' },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [muted, setMuted] = useState(() => isMuted());

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

  const visibleTabs = primaryTabs.filter((tab) => !tab.feature || featureFlags[tab.feature]);

  return (
    <div className="min-h-screen">
      <button
        type="button"
        aria-label={muted ? 'Unmute game sounds' : 'Mute game sounds'}
        onClick={handleToggleMute}
        className="fixed top-3 right-3 z-[60] flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1f2a44] bg-[#fff7d6]/95 text-[#1f2a44] shadow-[0_3px_0_#1f2a44]"
      >
        {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
      </button>
      <div
        data-testid="app-content"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {currentPage === 'home' && <Home onNavigate={navigate} />}
        {currentPage === 'browse' && <Browse onNavigate={navigate} />}
        {currentPage === 'collection' && <Collection onNavigate={navigate} />}
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
