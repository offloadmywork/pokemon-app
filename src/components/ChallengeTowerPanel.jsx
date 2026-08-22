import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { ChallengeTowerViewModel } from '@/viewmodels/ChallengeTowerViewModel';
import { Castle } from 'lucide-react';

export default function ChallengeTowerPanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new ChallengeTowerViewModel(apiClient));
  const [floors, setFloors] = useState([]);
  const [progress, setProgress] = useState(null);
  const [currentFloor, setCurrentFloor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      await viewModel.loadTower();
      setFloors(viewModel.floors);
      setProgress(viewModel.progress);
      setCurrentFloor(viewModel.currentFloor);
      setIsLoading(viewModel.isLoading);
      setError(viewModel.error);
    })();
  }, [viewModel]);

  const handleComplete = async () => {
    if (!currentFloor) return;
    await viewModel.completeFloor(currentFloor.floor);
    setFloors(viewModel.floors);
    setProgress(viewModel.progress);
    setCurrentFloor(viewModel.currentFloor);
  };

  if (isLoading) {
    return (
      <div className="gold-inset p-4 text-center">
        Loading challenge tower...
      </div>
    );
  }

  if (error) {
    return (
      <div className="gold-inset p-4 text-center">
        Failed to load tower.
      </div>
    );
  }

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Castle className="w-5 h-5" /> Challenge Tower</h2>
          {progress && (
            <span className="text-sm text-[#5c4320]/80">Best: Floor {progress.best_floor}</span>
          )}
        </div>

        {currentFloor ? (
          <div className="gold-inset p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="font-semibold">Floor {currentFloor.floor}: {currentFloor.name}</div>
              <div className="text-sm text-[#5c4320]/80">Difficulty {currentFloor.difficulty}</div>
              <div className="text-sm text-[#5c4320]/80">Reward: {currentFloor.reward_xp} XP</div>
            </div>
            <Button
              onClick={handleComplete}
              className="w-full sm:w-auto"
            >
              Complete
            </Button>
          </div>
        ) : (
          <div className="gold-inset p-4 text-center">Tower complete!</div>
        )}

        {floors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {floors.map((floor) => {
              const isCleared = progress && floor.floor <= progress.last_completed_floor;
              return (
                <div key={floor.floor} className="gold-inset p-3">
                  <div className="font-semibold">Floor {floor.floor}: {floor.name}</div>
                  <div className="text-xs text-[#5c4320]/80">Difficulty {floor.difficulty}</div>
                  <div className="text-xs text-[#5c4320]/80">Reward {floor.reward_xp} XP</div>
                  {isCleared && <div className="text-xs text-emerald-800 mt-1">Cleared</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
