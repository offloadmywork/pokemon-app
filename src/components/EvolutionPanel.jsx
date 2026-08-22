import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { EvolutionViewModel } from '@/viewmodels/EvolutionViewModel';
import TypeBadge from '@/components/TypeBadge';
import { Dna, Sparkles } from 'lucide-react';

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
      setMessage('Evolution complete!');
    } else if (viewModel.error) {
      setMessage(viewModel.error);
    }

    await viewModel.loadOptions();
    setOptions(viewModel.options);
    setTimeout(() => setMessage(''), 2500);
  };

  if (isLoading) {
    return (
      <div className="gold-inset p-4 text-center">
        Loading evolutions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="gold-inset p-4 text-center">
        Failed to load evolutions.
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="gold-panel p-6 text-left">
        <div className="gold-panel-content">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Dna className="w-5 h-5" /> Evolution Lab</h2>
          <p className="text-sm sm:text-base text-[#5c4320]/80">
            No evolutions available yet. Keep training and checking back!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Dna className="w-5 h-5" /> Evolution Lab</h2>
        {message && (
          <div className="mb-4 rounded-xl border-2 border-emerald-700/60 bg-emerald-200/60 px-3 py-2 text-sm font-semibold text-emerald-900">
            {message}
          </div>
        )}
        <div className="space-y-4">
        {options.map((option) => (
          <div
            key={option.caught_id}
            className="gold-inset p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl border-2 border-[#7b5422] bg-[#fff3cb] flex items-center justify-center overflow-hidden">
                {option.from.image_url ? (
                  <img src={option.from.image_url} alt={option.from.name} className="w-full h-full object-contain" />
                ) : (
                  <Sparkles className="w-8 h-8 text-amber-500" />
                )}
              </div>
              <div>
                <div className="font-bold text-lg flex items-center gap-2">
                  <TypeBadge type={option.from.type} />
                  {option.from.name}
                </div>
                <div className="text-sm text-[#5c4320]/80">
                  Evolves into {option.to.name}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              {option.can_evolve ? (
                <Button
                  onClick={() => handleEvolve(option.caught_id)}
                >
                  Evolve
                </Button>
              ) : (
                <span className="text-sm text-[#5c4320]/80">
                  Requires level {option.required_level}
                </span>
              )}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
