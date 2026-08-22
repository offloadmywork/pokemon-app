import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { CosmeticsViewModel } from '@/viewmodels/CosmeticsViewModel';
import { AlertTriangle, CheckCircle2, Coins, Gem, Palette } from 'lucide-react';

export default function CosmeticsPanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new CosmeticsViewModel(apiClient));
  const [wallet, setWallet] = useState(viewModel.wallet);
  const [ownedCosmetics, setOwnedCosmetics] = useState(viewModel.ownedCosmetics);
  const [lastPurchase, setLastPurchase] = useState(viewModel.lastPurchase);
  const [lastEquipped, setLastEquipped] = useState(viewModel.lastEquipped);
  const [isLoading, setIsLoading] = useState(viewModel.isLoading);
  const [isPurchasing, setIsPurchasing] = useState(viewModel.isPurchasing);
  const [isEquipping, setIsEquipping] = useState(viewModel.isEquipping);
  const [error, setError] = useState(viewModel.error);
  const [errorTitle, setErrorTitle] = useState('Cosmetic purchase failed');

  const syncViewModelState = () => {
    setWallet(viewModel.wallet);
    setOwnedCosmetics(viewModel.ownedCosmetics);
    setLastPurchase(viewModel.lastPurchase);
    setLastEquipped(viewModel.lastEquipped);
    setIsLoading(viewModel.isLoading);
    setIsPurchasing(viewModel.isPurchasing);
    setIsEquipping(viewModel.isEquipping);
    setError(viewModel.error);
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      await viewModel.loadCosmetics();
      if (isMounted) syncViewModelState();
    })();

    return () => {
      isMounted = false;
    };
  }, [viewModel]);

  const handlePurchase = async (cosmeticId) => {
    setErrorTitle('Cosmetic purchase failed');
    setIsPurchasing(true);
    await viewModel.purchase(cosmeticId);
    syncViewModelState();
  };

  const handleEquip = async (cosmeticId) => {
    setErrorTitle('Cosmetic action failed');
    setIsEquipping(true);
    await viewModel.equip(cosmeticId);
    syncViewModelState();
  };

  const lastPurchaseCosmetic = viewModel.catalog.find(
    (cosmetic) => cosmetic.cosmetic_id === lastPurchase?.cosmetic_id,
  );
  const lastEquippedCosmetic = viewModel.catalog.find(
    (cosmetic) => cosmetic.cosmetic_id === lastEquipped?.cosmetic_id,
  );

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">Cosmetics</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Palette className="h-6 w-6" />
              Trainer Cosmetics
            </h2>
            <p className="mt-2 text-sm text-[#5c4320]/80 sm:text-base">
              Spend extra coins and shards on optional style rewards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
              <Coins className="h-4 w-4" />
              {wallet.coins} coins
            </span>
            <span className="inline-flex items-center gap-2 rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
              <Gem className="h-4 w-4" />
              {wallet.shards} shards
            </span>
          </div>
        </div>

        <div className="gold-inset mt-4 p-4">
          {isLoading ? (
            <div className="text-sm text-[#5c4320]/80">Loading cosmetics...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && (
                <div className="rounded border border-[#b4532d]/50 bg-[#fff1df] p-3 text-sm text-[#7a2e1f]">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-4 w-4" />
                    {errorTitle}
                  </div>
                  <div className="mt-1 font-semibold text-[#7a2e1f]/85">{error}</div>
                </div>
              )}

              {lastPurchase && (
                <div className="rounded border border-[#2f7d46]/50 bg-[#e7f7df] p-3 text-sm font-bold text-[#2f6f3a]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Unlocked {lastPurchaseCosmetic?.name || lastPurchase.cosmetic_id} for {lastPurchase.total_cost} {lastPurchase.currency}.
                  </div>
                </div>
              )}

              {lastEquipped && (
                <div className="rounded border border-[#2f7d46]/50 bg-[#e7f7df] p-3 text-sm font-bold text-[#2f6f3a]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Equipped {lastEquippedCosmetic?.name || lastEquipped.cosmetic_id}.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {viewModel.catalog.map((cosmetic) => {
                  const isOwned = Boolean(ownedCosmetics[cosmetic.cosmetic_id]);
                  const isEquipped = Boolean(ownedCosmetics[cosmetic.cosmetic_id]?.equipped);
                  const balance = wallet[cosmetic.currency] || 0;
                  const canBuy = !isOwned && balance >= cosmetic.cost;

                  return (
                    <div
                      key={cosmetic.cosmetic_id}
                      className="flex flex-col gap-3 rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-black text-[#4f3514]">{cosmetic.name}</div>
                          {isOwned && (
                            <span className="rounded border border-[#2f7d46]/40 bg-[#e7f7df] px-2 py-0.5 text-xs font-black text-[#2f6f3a]">
                              Owned
                            </span>
                          )}
                          {isEquipped && (
                            <span className="rounded border border-[#3566a8]/40 bg-[#e4efff] px-2 py-0.5 text-xs font-black text-[#264f8d]">
                              Equipped
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                          {cosmetic.description}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-[#8a5c18]">
                          <span>{cosmetic.slot.replace('_', ' ')}</span>
                          <span>{cosmetic.cost} {cosmetic.currency}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => (isOwned
                          ? handleEquip(cosmetic.cosmetic_id)
                          : handlePurchase(cosmetic.cosmetic_id))}
                        disabled={isPurchasing || isEquipping || (isOwned ? isEquipped : !canBuy)}
                        className="h-10 px-4 text-sm font-bold"
                      >
                        {isOwned
                          ? (isEquipped ? 'Equipped' : `Equip ${cosmetic.name}`)
                          : `Buy ${cosmetic.name}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
