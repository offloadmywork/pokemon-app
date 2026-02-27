import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { EvolutionViewModel } from '@/viewmodels/EvolutionViewModel';
import { typeEmojis } from '@/game/constants';

export default function EvolutionPanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new EvolutionViewModel(apiClient));
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      await viewModel.loadOptions();
      setOptions(viewModel.options);
      setIsLoading(viewModel.isLoading);
      setError(viewModel.error);
    })();
  }, [viewModel]);

  const handleEvolve = async (caughtId) => {
    const result = await viewModel.evolve(caughtId);
    if (result?.success) {
      setMessage('✨ Evolution complete!');
    } else if (viewModel.error) {
      setMessage(viewModel.error);
    }

    await viewModel.loadOptions();
    setOptions(viewModel.options);
    setTimeout(() => setMessage(''), 2500);
  };

  if (isLoading) {
    return (
      <div className="bg-white/20 rounded-2xl p-4 text-white text-center">
        Loading evolutions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/20 rounded-2xl p-4 text-white text-center">
        Failed to load evolutions.
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="bg-white/20 rounded-3xl p-6 text-white shadow-xl text-left">
        <h2 className="text-2xl font-bold mb-2">🧬 Evolution Lab</h2>
        <p className="text-sm sm:text-base text-white/80">
          No evolutions available yet. Keep training and checking back!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/20 rounded-3xl p-6 text-white shadow-xl text-left">
      <h2 className="text-2xl font-bold mb-4">🧬 Evolution Lab</h2>
      {message && (
        <div className="mb-4 rounded-xl bg-green-500/30 border border-green-400/60 px-3 py-2 text-sm font-semibold">
          {message}
        </div>
      )}
      <div className="space-y-4">
        {options.map((option) => (
          <div
            key={option.caught_id}
            className="bg-white/15 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                {option.from.image_url ? (
                  <img src={option.from.image_url} alt={option.from.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-3xl">✨</span>
                )}
              </div>
              <div>
                <div className="font-bold text-lg">
                  {typeEmojis[option.from.type] || '⚪'} {option.from.name}
                </div>
                <div className="text-sm text-white/80">
                  Evolves into {option.to.name}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              {option.can_evolve ? (
                <Button
                  onClick={() => handleEvolve(option.caught_id)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold"
                >
                  Evolve
                </Button>
              ) : (
                <span className="text-sm text-white/80">
                  Requires level {option.required_level}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
