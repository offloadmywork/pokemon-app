import { Button } from "@/components/ui/button";

export default function Home({ onNavigate }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 flex items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        <div className="mb-8 animate-bounce">
          <span className="text-9xl">🎮</span>
        </div>
        
        <h1 className="text-6xl font-black text-white mb-6 drop-shadow-lg">
          Pokémon Adventure!
        </h1>
        
        <p className="text-2xl text-white/90 mb-12 font-semibold">
          Catch amazing Pokémons and build your collection!
        </p>
        
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <Button 
            onClick={() => onNavigate('browse')}
            className="h-16 text-2xl font-bold bg-yellow-400 hover:bg-yellow-500 text-purple-900 rounded-2xl shadow-lg transform transition hover:scale-105"
          >
            🔍 Find Pokémons
          </Button>
          
          <Button 
            onClick={() => onNavigate('collection')}
            className="h-16 text-2xl font-bold bg-green-400 hover:bg-green-500 text-purple-900 rounded-2xl shadow-lg transform transition hover:scale-105"
          >
            ⭐ My Collection
          </Button>
        </div>
      </div>
    </div>
  );
}
