import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { getCosmetic } from '@/game/cosmetics';
import { IdCard, Sparkles } from 'lucide-react';

export default function TrainerCardPreview({ apiClient = pokemonAPI }) {
  const [equippedCard, setEquippedCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const result = await apiClient.getCosmetics();
        if (!isMounted) return;

        const equippedTrainerCard = (result?.cosmetics || [])
          .find((cosmetic) => {
            const catalogItem = getCosmetic(cosmetic.cosmetic_id);
            return cosmetic.equipped && catalogItem?.slot === 'trainer_card';
          });

        setEquippedCard(equippedTrainerCard ? getCosmetic(equippedTrainerCard.cosmetic_id) : null);
      } catch {
        if (isMounted) setEquippedCard(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiClient]);

  const title = equippedCard?.name || 'Default Trainer Card';
  const frameLabel = equippedCard?.cosmetic_id === 'trainer_card_bronze'
    ? 'Bronze frame equipped'
    : 'No frame equipped';
  const frameClass = equippedCard?.cosmetic_id === 'trainer_card_bronze'
    ? 'border-[#a96f1f] bg-[#fff1c2] shadow-[inset_0_0_0_2px_rgba(169,111,31,0.22)]'
    : 'border-[#c79a36]/50 bg-[#fff8dc]';

  return (
    <div className="gold-panel p-5 text-left">
      <div className="gold-panel-content">
        <div className={`rounded border p-4 ${frameClass}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">
                Trainer Card
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-[#4f3514]">
                <IdCard className="h-5 w-5" />
                {isLoading ? 'Loading Trainer Card...' : title}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded border border-[#c79a36]/60 bg-white/70 px-2 py-1 text-xs font-black text-[#4f3514]">
              <Sparkles className="h-3.5 w-3.5" />
              Style
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded border border-[#c79a36]/40 bg-white/50 px-3 py-2">
            <span className="text-sm font-bold text-[#5c4320]">Netanel</span>
            <span className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">
              {isLoading ? 'Loading...' : frameLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
