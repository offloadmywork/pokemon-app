import { Button } from "@/components/ui/button";
import DailyQuestsPanel from "@/components/DailyQuestsPanel";
import ChallengeTowerPanel from "@/components/ChallengeTowerPanel";
import { featureFlags } from "@/config/featureFlags";

export default function Home({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center px-4 py-6 sm:px-6">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <div className="mb-8 animate-bounce">
            <span className="text-7xl sm:text-9xl">🎮</span>
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
              className="h-14 sm:h-16 text-xl sm:text-2xl font-bold bg-yellow-400 hover:bg-yellow-500 text-purple-900 rounded-2xl shadow-lg transform transition hover:scale-105"
            >
              🔍 Find Pokémons
            </Button>
            
            <Button 
              onClick={() => onNavigate('collection')}
              className="h-14 sm:h-16 text-xl sm:text-2xl font-bold bg-green-400 hover:bg-green-500 text-purple-900 rounded-2xl shadow-lg transform transition hover:scale-105"
            >
              ⭐ My Collection
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DailyQuestsPanel />
          <div className="flex flex-col gap-6">
            <ChallengeTowerPanel />
            {featureFlags.leaderboards && (
              <div className="bg-white/20 rounded-3xl p-6 text-white shadow-xl text-left">
                <h2 className="text-2xl font-bold mb-2">🏆 Leaderboards</h2>
                <p className="text-sm sm:text-base text-white/80 mb-4">
                  Check the top trainers and see how your team stacks up.
                </p>
                <Button
                  onClick={() => onNavigate('leaderboards')}
                  className="h-11 px-5 text-base sm:text-lg font-bold bg-blue-400 hover:bg-blue-500 text-white rounded-xl"
                >
                  View Leaderboards
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
