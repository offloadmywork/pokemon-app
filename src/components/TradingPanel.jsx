import { useEffect, useMemo, useState } from 'react';
import { pokemonAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { TradingViewModel } from '@/viewmodels/TradingViewModel';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Copy, Handshake } from 'lucide-react';

const getCaughtId = (caughtPokemon) => caughtPokemon?.id || caughtPokemon?.caught_id || caughtPokemon?.caughtId || '';

const getPokemonLabel = (caughtPokemon) => {
  const id = getCaughtId(caughtPokemon);
  const name = caughtPokemon?.nickname || caughtPokemon?.name || caughtPokemon?.pokemon_name || caughtPokemon?.pokemon_id || id;
  return id ? `${name}` : name;
};

const defaultCopyTradeId = async (tradeId) => {
  if (!globalThis.navigator?.clipboard?.writeText) return;
  await globalThis.navigator.clipboard.writeText(tradeId);
};

export default function TradingPanel({ apiClient = pokemonAPI, copyTradeId = defaultCopyTradeId }) {
  const [viewModel] = useState(() => new TradingViewModel(apiClient));
  const [ownedPokemon, setOwnedPokemon] = useState([]);
  const [offeredCaughtId, setOfferedCaughtId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [requestedCaughtId, setRequestedCaughtId] = useState('');
  const [tradeOfferId, setTradeOfferId] = useState('');
  const [status, setStatus] = useState(viewModel.status);
  const [lastOffer, setLastOffer] = useState(viewModel.lastOffer);
  const [completedTrade, setCompletedTrade] = useState(viewModel.completedTrade);
  const [tradeAction, setTradeAction] = useState(viewModel.tradeAction);
  const [incomingOffers, setIncomingOffers] = useState(viewModel.incomingOffers);
  const [outgoingOffers, setOutgoingOffers] = useState(viewModel.outgoingOffers);
  const [completedSummary, setCompletedSummary] = useState(viewModel.completedSummary);
  const [error, setError] = useState(viewModel.error);
  const [copiedTradeId, setCopiedTradeId] = useState('');
  const [isCollectionLoading, setIsCollectionLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const syncViewModelState = () => {
    setStatus(viewModel.status);
    setLastOffer(viewModel.lastOffer);
    setCompletedTrade(viewModel.completedTrade);
    setTradeAction(viewModel.tradeAction);
    setIncomingOffers(viewModel.incomingOffers);
    setOutgoingOffers(viewModel.outgoingOffers);
    setCompletedSummary(viewModel.completedSummary);
    setError(viewModel.error);
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const nextCollection = await apiClient.getCaughtPokemon();
        if (!isMounted) return;

        const collection = Array.isArray(nextCollection) ? nextCollection : [];
        setOwnedPokemon(collection);
        setOfferedCaughtId((current) => current || getCaughtId(collection[0]));
        await viewModel.loadOffers();
        if (isMounted) syncViewModelState();
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsCollectionLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [apiClient, viewModel]);

  const handleCreateOffer = async () => {
    setIsActionLoading(true);
    setCopiedTradeId('');
    const result = await viewModel.createOffer({
      toUserId: toUserId.trim(),
      offeredCaughtId,
      requestedCaughtId: requestedCaughtId.trim(),
    });
    if (result) {
      await viewModel.loadOffers();
    }
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleAcceptOffer = async (tradeId = tradeOfferId) => {
    if (!tradeId.trim()) return;

    setIsActionLoading(true);
    setCopiedTradeId('');
    const result = await viewModel.acceptOffer(tradeId.trim());
    if (result) {
      await viewModel.loadOffers();
    }
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleCancelOffer = async (tradeId) => {
    setIsActionLoading(true);
    setCopiedTradeId('');
    const result = await viewModel.cancelOffer(tradeId);
    if (result) {
      await viewModel.loadOffers();
    }
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleDeclineOffer = async (tradeId) => {
    setIsActionLoading(true);
    setCopiedTradeId('');
    const result = await viewModel.declineOffer(tradeId);
    if (result) {
      await viewModel.loadOffers();
    }
    syncViewModelState();
    setIsActionLoading(false);
  };

  const handleCopyTradeId = async (tradeId) => {
    if (!tradeId) return;

    try {
      await copyTradeId(tradeId);
      setCopiedTradeId(tradeId);
      setError(null);
    } catch (err) {
      setCopiedTradeId('');
      setError(err.message);
    }
  };

  const availableCount = ownedPokemon.length;
  const canCreateOffer = useMemo(
    () => !isCollectionLoading
      && !isActionLoading
      && Boolean(offeredCaughtId)
      && Boolean(toUserId.trim())
      && Boolean(requestedCaughtId.trim()),
    [isCollectionLoading, isActionLoading, offeredCaughtId, toUserId, requestedCaughtId],
  );
  const canAcceptOffer = !isActionLoading && Boolean(tradeOfferId.trim());
  const statusText = {
    idle: 'Ready to trade',
    pending: 'Trade offer pending',
    complete: 'Trade complete',
    cancelled: 'Trade offer cancelled',
    declined: 'Trade offer declined',
  }[status] || 'Ready to trade';
  const actionFeedback = {
    cancelled: 'Trade offer cancelled.',
    declined: 'Trade offer declined.',
  }[tradeAction?.status];

  return (
    <div className="gold-panel p-6 text-left">
      <div className="gold-panel-content">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#8a5c18]">Phase 3</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Handshake className="h-6 w-6" />
              Trading Post
            </h2>
            <p className="mt-2 text-sm text-[#5c4320]/80 sm:text-base">{statusText}</p>
          </div>
          <span className="rounded border border-[#c79a36]/60 bg-[#fff3c4] px-3 py-1 text-sm font-black text-[#4f3514]">
            {availableCount} Pokemon available
          </span>
        </div>

        <div className="gold-inset mt-4 p-4">
          {isCollectionLoading ? (
            <div className="text-sm text-[#5c4320]/80">Loading trade collection...</div>
          ) : (
            <div className="flex flex-col gap-4">
              {availableCount === 0 && (
                <div className="text-sm font-semibold text-[#7a2e1f]">
                  Catch Pokemon before trading.
                </div>
              )}

              {error && (
                <div className="rounded border border-[#b4532d]/50 bg-[#fff1df] p-3 text-sm text-[#7a2e1f]">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-4 w-4" />
                    Trading action failed
                  </div>
                  <div className="mt-1 font-semibold text-[#7a2e1f]/85">{error}</div>
                </div>
              )}

              {lastOffer && (
                <div className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 text-sm text-[#4f3514]">
                  <div className="flex items-center gap-2 font-black">
                    <ArrowRightLeft className="h-4 w-4" />
                    Offer: {lastOffer.id}
                  </div>
                  <div className="mt-1 font-semibold text-[#5c4320]/80">
                    Offering {lastOffer.offered_caught_id} for {lastOffer.requested_caught_id}
                  </div>
                  <div className="mt-1 font-semibold text-[#5c4320]/80">
                    Partner: {lastOffer.to_user_id}
                  </div>
                </div>
              )}

              {completedTrade && (
                <div className="rounded border border-[#2f7d46]/50 bg-[#e7f7df] p-3 text-sm font-bold text-[#2f6f3a]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Trade complete!
                  </div>
                  {completedSummary.label && (
                    <div className="mt-1 text-xs text-[#245c31]">{completedSummary.label}</div>
                  )}
                </div>
              )}

              {actionFeedback && tradeAction?.status !== 'complete' && (
                <div className="rounded border border-[#2f7d46]/50 bg-[#e7f7df] p-3 text-sm font-bold text-[#2f6f3a]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {actionFeedback}
                  </div>
                </div>
              )}

              {(incomingOffers.length > 0 || outgoingOffers.length > 0) && (
                <div className="grid grid-cols-1 gap-3">
                  {incomingOffers.length > 0 && (
                    <div className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 text-sm text-[#4f3514]">
                      <div className="font-black">Incoming Offers</div>
                      <div className="mt-2 flex flex-col gap-2">
                        {incomingOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="flex flex-col gap-2 rounded border border-[#c79a36]/40 bg-white/45 p-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="font-black">From {offer.from_user_id}</div>
                              <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                                Wants {offer.requested_caught_id} for {offer.offered_caught_id}
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAcceptOffer(offer.id)}
                              disabled={isActionLoading}
                              className="h-9 px-3 text-sm font-bold"
                            >
                              Accept {offer.id}
                            </Button>
                            <Button
                              onClick={() => handleDeclineOffer(offer.id)}
                              disabled={isActionLoading}
                              variant="ghost"
                              className="h-9 px-3 text-sm font-bold"
                            >
                              Decline {offer.id}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {outgoingOffers.length > 0 && (
                    <div className="rounded border border-[#c79a36]/50 bg-[#fff8dc] p-3 text-sm text-[#4f3514]">
                      <div className="font-black">Outgoing Offers</div>
                      <div className="mt-2 flex flex-col gap-2">
                        {outgoingOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="flex flex-col gap-2 rounded border border-[#c79a36]/40 bg-white/45 p-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="font-black">To {offer.to_user_id}</div>
                              {viewModel.getTradeInviteSummary(offer) && (
                                <div className="mt-1 text-xs font-black text-[#4f3514]">
                                  {viewModel.getTradeInviteSummary(offer).label}
                                </div>
                              )}
                              <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                                Offering {offer.offered_caught_id} for {offer.requested_caught_id}
                              </div>
                              {viewModel.getTradeInviteSummary(offer) && (
                                <div className="mt-1 text-xs font-semibold text-[#5c4320]/80">
                                  {viewModel.getTradeInviteSummary(offer).helper}
                                </div>
                              )}
                              {copiedTradeId === offer.id && (
                                <div className="mt-2 flex items-center gap-2 text-xs font-black text-[#2f6f3a]">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Trade code copied.
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                onClick={() => handleCopyTradeId(offer.id)}
                                disabled={isActionLoading}
                                variant="ghost"
                                className="h-9 px-3 text-sm font-bold"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy {offer.id}
                              </Button>
                              <Button
                                onClick={() => handleCancelOffer(offer.id)}
                                disabled={isActionLoading}
                                variant="ghost"
                                className="h-9 px-3 text-sm font-bold"
                              >
                                Cancel {offer.id}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-[#8a5c18]">
                  Pokemon to offer
                  <select
                    aria-label="Pokemon to offer"
                    value={offeredCaughtId}
                    onChange={(event) => setOfferedCaughtId(event.target.value)}
                    className="h-11 rounded border border-[#c79a36]/60 bg-[#fff8dc] px-3 text-sm font-bold normal-case tracking-normal text-[#4f3514] outline-none focus:border-[#8a5c18]"
                  >
                    {ownedPokemon.map((caughtPokemon) => {
                      const caughtId = getCaughtId(caughtPokemon);
                      return (
                        <option key={caughtId} value={caughtId}>
                          {getPokemonLabel(caughtPokemon)}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-[#8a5c18]">
                    Trade partner user id
                    <input
                      aria-label="Trade partner user id"
                      value={toUserId}
                      onChange={(event) => setToUserId(event.target.value)}
                      className="h-11 rounded border border-[#c79a36]/60 bg-[#fff8dc] px-3 text-sm font-bold normal-case tracking-normal text-[#4f3514] outline-none focus:border-[#8a5c18]"
                      placeholder="player-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-[#8a5c18]">
                    Requested caught Pokemon id
                    <input
                      aria-label="Requested caught Pokemon id"
                      value={requestedCaughtId}
                      onChange={(event) => setRequestedCaughtId(event.target.value)}
                      className="h-11 rounded border border-[#c79a36]/60 bg-[#fff8dc] px-3 text-sm font-bold normal-case tracking-normal text-[#4f3514] outline-none focus:border-[#8a5c18]"
                      placeholder="caught-3"
                    />
                  </label>
                </div>
                <Button
                  onClick={handleCreateOffer}
                  disabled={!canCreateOffer}
                  className="h-11 px-5 text-base font-bold"
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  {isActionLoading ? 'Syncing...' : 'Create Offer'}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-[#8a5c18]">
                  Trade offer id
                  <input
                    aria-label="Trade offer id"
                    value={tradeOfferId}
                    onChange={(event) => setTradeOfferId(event.target.value)}
                    className="h-11 rounded border border-[#c79a36]/60 bg-[#fff8dc] px-3 text-sm font-bold normal-case tracking-normal text-[#4f3514] outline-none focus:border-[#8a5c18]"
                    placeholder="trade-1"
                  />
                </label>
                <Button
                  onClick={() => handleAcceptOffer()}
                  disabled={!canAcceptOffer}
                  className="h-11 self-end px-5 text-base font-bold"
                >
                  Accept Trade
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
