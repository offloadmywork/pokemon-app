import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { ShopViewModel } from '@/viewmodels/ShopViewModel';
import { AlertTriangle, CheckCircle2, Coins, ShoppingBag } from 'lucide-react';

export default function ShopPanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new ShopViewModel(apiClient));
  const [wallet, setWallet] = useState(viewModel.wallet);
  const [inventory, setInventory] = useState(viewModel.inventory);
  const [lastPurchase, setLastPurchase] = useState(viewModel.lastPurchase);
  const [isLoading, setIsLoading] = useState(viewModel.isLoading);
  const [isPurchasing, setIsPurchasing] = useState(viewModel.isPurchasing);
  const [error, setError] = useState(viewModel.error);

  const syncViewModelState = () => {
    setWallet(viewModel.wallet);
    setInventory(viewModel.inventory);
    setLastPurchase(viewModel.lastPurchase);
    setIsLoading(viewModel.isLoading);
    setIsPurchasing(viewModel.isPurchasing);
    setError(viewModel.error);
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      await viewModel.loadShop();
      if (isMounted) syncViewModelState();
    })();

    return () => {
      isMounted = false;
    };
  }, [viewModel]);

  const handlePurchase = async (itemId) => {
    setIsPurchasing(true);
    await viewModel.purchase(itemId, 1);
    syncViewModelState();
  };

  const lastPurchaseListing = viewModel.catalog.find(
    (listing) => listing.item_id === lastPurchase?.item_id,
  );

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">Economy</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <ShoppingBag className="h-6 w-6" />
              Trainer Shop
            </h2>
            <p className="mt-2 text-sm text-[#5c4320]/80 sm:text-base">
              Restock balls, potions, and revives before the next run.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
            <Coins className="h-4 w-4" />
            {wallet.coins} coins
          </span>
        </div>

        <div className="gold-inset mt-4 p-4">
          {isLoading ? (
            <div className="text-sm text-[#5c4320]/80">Loading shop...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && (
                <div className="rounded border border-[#b4532d]/50 bg-[#fff1df] p-3 text-sm text-[#7a2e1f]">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-4 w-4" />
                    Shop purchase failed
                  </div>
                  <div className="mt-1 font-semibold text-[#7a2e1f]/85">{error}</div>
                </div>
              )}

              {lastPurchase && (
                <div className="rounded border border-[#2f7d46]/50 bg-[#e7f7df] p-3 text-sm font-bold text-[#2f6f3a]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Purchased {lastPurchaseListing?.item?.name || lastPurchase.item_id} for {lastPurchase.total_cost} coins.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {viewModel.catalog.map((listing) => (
                  <div
                    key={listing.item_id}
                    className="flex flex-col gap-3 rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-[#c79a36]/50 bg-white/60 px-2 py-1 text-xs font-black text-[#4f3514]">
                          {listing.item.emoji}
                        </span>
                        <div className="font-black text-[#4f3514]">{listing.item.name}</div>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                        {listing.item.description}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-[#8a5c18]">
                        <span>{listing.cost} coins</span>
                        <span>Owned: {inventory[listing.item_id] || 0}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePurchase(listing.item_id)}
                      disabled={isPurchasing || wallet.coins < listing.cost}
                      className="h-10 px-4 text-sm font-bold"
                    >
                      Buy {listing.item.name}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
