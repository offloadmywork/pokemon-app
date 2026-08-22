import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { CollectionMasteryViewModel } from '@/viewmodels/CollectionMasteryViewModel';
import { Medal, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CollectionMasteryPanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new CollectionMasteryViewModel(apiClient));
  const [tiers, setTiers] = useState([]);
  const [caughtCount, setCaughtCount] = useState(0);
  const [claimFeedback, setClaimFeedback] = useState(null);
  const [claimError, setClaimError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      await viewModel.loadMasteryStatus();
      setTiers(viewModel.status?.tiers || []);
      setCaughtCount(viewModel.status?.caught_count || 0);
      setIsLoading(viewModel.isLoading);
      setError(viewModel.error);
    })();
  }, [viewModel]);

  const handleClaim = async (tierId) => {
    const result = await viewModel.claimTier(tierId);
    setTiers(viewModel.status?.tiers || []);
    if (result?.wallet) {
      setClaimFeedback({ tierId, wallet: result.wallet });
      setClaimError(null);
    } else {
      setClaimError(viewModel.claimError || 'Failed to claim tier.');
      setClaimFeedback(null);
    }
  };

  if (isLoading) {
    return (
      <div className="gold-inset p-4 text-center">
        Loading collection mastery...
      </div>
    );
  }

  if (error) {
    return (
      <div className="gold-inset p-4 text-center">
        Failed to load collection mastery.
      </div>
    );
  }

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Medal className="w-5 h-5" /> Collection Mastery
        </h2>
        <p className="text-xs text-[#5c4320]/70 mb-4">
          {caughtCount} unique Pokémon caught · climb the tiers for one-time rewards
        </p>

        {claimFeedback && (
          <div className="gold-inset mb-4 p-3 flex items-center gap-2 text-sm text-[#4f3514]" role="status">
            <CheckCircle className="w-4 h-4 text-[#3f7d33]" />
            <span className="font-bold">
              Tier claimed! +{claimFeedback.wallet.coins} coins
              {claimFeedback.wallet.shards > 0 ? `, +${claimFeedback.wallet.shards} shards` : ''}
            </span>
          </div>
        )}
        {claimError && (
          <div className="mb-4 p-3 flex items-center gap-2 text-sm rounded-lg border border-red-300 bg-red-50 text-red-800" role="alert">
            <AlertTriangle className="w-4 h-4" />
            <span>{claimError}</span>
          </div>
        )}

        <ul className="grid gap-3">
          {tiers.map((tier) => (
            <li key={tier.id} className={`gold-inset p-3 ${tiers.indexOf(tier) === 0 ? '' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#4f3514]">
                    {tier.title}
                    {tier.claimed && <CheckCircle className="inline w-4 h-4 ml-2 text-[#3f7d33]" />}
                  </p>
                  <p className="text-xs text-[#5c4320]/80">{tier.description}</p>
                  {tier.reward && (
                    <p className="mt-1 text-xs text-[#5c4320]/70">
                      Reward: +{tier.reward.coins} coins{tier.reward.shards > 0 ? ` · +${tier.reward.shards} shards` : ''}
                    </p>
                  )}
                </div>
                {tier.claimable && !tier.claimed && (
                  <Button size="sm" onClick={() => handleClaim(tier.id)}>
                    Claim
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
