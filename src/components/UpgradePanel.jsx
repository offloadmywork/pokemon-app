import { useEffect, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { UpgradeViewModel } from '@/viewmodels/UpgradeViewModel';
import { AlertTriangle, ArrowUpCircle, CheckCircle2, Coins } from 'lucide-react';

export default function UpgradePanel({ apiClient = pokemonAPI }) {
  const [viewModel] = useState(() => new UpgradeViewModel(apiClient));
  const [wallet, setWallet] = useState(viewModel.wallet);
  const [upgrades, setUpgrades] = useState(viewModel.upgrades);
  const [lastPurchase, setLastPurchase] = useState(viewModel.lastPurchase);
  const [isLoading, setIsLoading] = useState(viewModel.isLoading);
  const [isPurchasing, setIsPurchasing] = useState(viewModel.isPurchasing);
  const [error, setError] = useState(viewModel.error);

  const syncViewModelState = () => {
    setWallet(viewModel.wallet);
    setUpgrades(viewModel.upgrades);
    setLastPurchase(viewModel.lastPurchase);
    setIsLoading(viewModel.isLoading);
    setIsPurchasing(viewModel.isPurchasing);
    setError(viewModel.error);
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      await viewModel.loadUpgrades();
      if (isMounted) syncViewModelState();
    })();

    return () => {
      isMounted = false;
    };
  }, [viewModel]);

  const handlePurchase = async (upgradeId) => {
    setIsPurchasing(true);
    await viewModel.purchase(upgradeId);
    syncViewModelState();
  };

  const lastPurchaseUpgrade = viewModel.catalog.find(
    (upgrade) => upgrade.upgrade_id === lastPurchase?.upgrade_id,
  );

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">Economy</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <ArrowUpCircle className="h-6 w-6" />
              Trainer Upgrades
            </h2>
            <p className="mt-2 text-sm text-[#5c4320]/80 sm:text-base">
              Spend coins on permanent account upgrades for longer routes and richer daily loops.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
            <Coins className="h-4 w-4" />
            {wallet.coins} coins
          </span>
        </div>

        <div className="gold-inset mt-4 p-4">
          {isLoading ? (
            <div className="text-sm text-[#5c4320]/80">Loading upgrades...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && (
                <div className="rounded border border-[#b4532d]/50 bg-[#fff1df] p-3 text-sm text-[#7a2e1f]">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-4 w-4" />
                    Upgrade failed
                  </div>
                  <div className="mt-1 font-semibold text-[#7a2e1f]/85">{error}</div>
                </div>
              )}

              {lastPurchase && (
                <div className="rounded border border-[#2f7d46]/50 bg-[#e7f7df] p-3 text-sm font-bold text-[#2f6f3a]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Upgraded {lastPurchaseUpgrade?.name || lastPurchase.upgrade_id} to level {lastPurchase.next_level} for {lastPurchase.total_cost} coins.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {viewModel.catalog.map((upgrade) => {
                  const level = upgrades[upgrade.upgrade_id] || 0;
                  const cost = viewModel.getUpgradeCost(upgrade.upgrade_id);
                  const isMaxed = viewModel.isUpgradeMaxed(upgrade.upgrade_id);

                  return (
                    <div
                      key={upgrade.upgrade_id}
                      className="flex flex-col gap-3 rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-black text-[#4f3514]">{upgrade.name}</div>
                        <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                          {upgrade.description}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-[#8a5c18]">
                          <span>Level {level} / {upgrade.max_level}</span>
                          <span>{cost} coins</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handlePurchase(upgrade.upgrade_id)}
                        disabled={isPurchasing || isMaxed || wallet.coins < cost}
                        className="h-10 px-4 text-sm font-bold"
                      >
                        {isMaxed ? 'Maxed' : `Upgrade ${upgrade.name}`}
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
