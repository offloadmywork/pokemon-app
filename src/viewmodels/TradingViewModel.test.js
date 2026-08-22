import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTradingViewModel, TradingViewModel } from './TradingViewModel';

const createMockApi = () => ({
  listTradeOffers: vi.fn(),
  createTradeOffer: vi.fn(),
  acceptTradeOffer: vi.fn(),
  cancelTradeOffer: vi.fn(),
  declineTradeOffer: vi.fn(),
});

const pendingOffer = {
  id: 'trade-1',
  from_user_id: 'player-1',
  to_user_id: 'player-2',
  offered_caught_id: 'caught-1',
  requested_caught_id: 'caught-3',
  status: 'pending',
};

const completedTrade = {
  status: 'complete',
  offer: { ...pendingOffer, status: 'complete' },
  transfers: [
    { caught_id: 'caught-1', from_user_id: 'player-1', to_user_id: 'player-2' },
    { caught_id: 'caught-3', from_user_id: 'player-2', to_user_id: 'player-1' },
  ],
};

const cancelledTrade = {
  status: 'cancelled',
  offer: { ...pendingOffer, status: 'cancelled' },
  reason: null,
};

const declinedTrade = {
  status: 'declined',
  offer: { ...pendingOffer, status: 'declined' },
  reason: null,
};

const offerLists = {
  incoming: [{ ...pendingOffer, id: 'trade-in', from_user_id: 'player-3', to_user_id: 'player-1' }],
  outgoing: [{ ...pendingOffer, id: 'trade-out' }],
};

describe('TradingViewModel', () => {
  let api;
  let vm;

  beforeEach(() => {
    api = createMockApi();
    vm = createTradingViewModel(api);
  });

  it('starts idle with no active trade state', () => {
    expect(vm.status).toBe('idle');
    expect(vm.lastOffer).toBe(null);
    expect(vm.completedTrade).toBe(null);
    expect(vm.incomingOffers).toEqual([]);
    expect(vm.outgoingOffers).toEqual([]);
    expect(vm.isLoading).toBe(false);
    expect(vm.error).toBe(null);
    expect(vm.completedSummary).toEqual({
      transferCount: 0,
      label: null,
    });
  });

  it('loads pending incoming and outgoing trade offers', async () => {
    api.listTradeOffers.mockResolvedValue(offerLists);

    const result = await vm.loadOffers();

    expect(api.listTradeOffers).toHaveBeenCalledTimes(1);
    expect(result).toEqual(offerLists);
    expect(vm.incomingOffers).toEqual(offerLists.incoming);
    expect(vm.outgoingOffers).toEqual(offerLists.outgoing);
    expect(vm.error).toBe(null);
    expect(vm.isLoading).toBe(false);
  });

  it('creates a pending trade offer through the API', async () => {
    api.createTradeOffer.mockResolvedValue(pendingOffer);

    const result = await vm.createOffer({
      toUserId: 'player-2',
      offeredCaughtId: 'caught-1',
      requestedCaughtId: 'caught-3',
    });

    expect(api.createTradeOffer).toHaveBeenCalledWith({
      toUserId: 'player-2',
      offeredCaughtId: 'caught-1',
      requestedCaughtId: 'caught-3',
    });
    expect(result).toEqual(pendingOffer);
    expect(vm.lastOffer).toEqual(pendingOffer);
    expect(vm.completedTrade).toBe(null);
    expect(vm.status).toBe('pending');
    expect(vm.error).toBe(null);
    expect(vm.isLoading).toBe(false);
  });

  it('builds a shareable invite summary for a pending trade offer', () => {
    expect(vm.getTradeInviteSummary(pendingOffer)).toEqual({
      tradeId: 'trade-1',
      label: 'Trade code: trade-1',
      helper: 'Share this code so the invited trainer can accept the trade.',
    });
    expect(vm.getTradeInviteSummary(null)).toBe(null);
  });

  it('accepts a pending trade and stores completed trade feedback', async () => {
    api.acceptTradeOffer.mockResolvedValue(completedTrade);

    const result = await vm.acceptOffer('trade-1');

    expect(api.acceptTradeOffer).toHaveBeenCalledWith('trade-1');
    expect(result).toEqual(completedTrade);
    expect(vm.completedTrade).toEqual(completedTrade);
    expect(vm.lastOffer).toEqual(completedTrade.offer);
    expect(vm.status).toBe('complete');
    expect(vm.completedSummary).toEqual({
      transferCount: 2,
      label: '2 Pokemon ownership updates completed',
    });
  });

  it('cancels an outgoing trade and stores social action feedback', async () => {
    api.cancelTradeOffer.mockResolvedValue(cancelledTrade);

    const result = await vm.cancelOffer('trade-1');

    expect(api.cancelTradeOffer).toHaveBeenCalledWith('trade-1');
    expect(result).toEqual(cancelledTrade);
    expect(vm.lastOffer).toEqual(cancelledTrade.offer);
    expect(vm.status).toBe('cancelled');
    expect(vm.tradeAction).toEqual(cancelledTrade);
    expect(vm.error).toBe(null);
  });

  it('declines an incoming trade and stores social action feedback', async () => {
    api.declineTradeOffer.mockResolvedValue(declinedTrade);

    const result = await vm.declineOffer('trade-1');

    expect(api.declineTradeOffer).toHaveBeenCalledWith('trade-1');
    expect(result).toEqual(declinedTrade);
    expect(vm.lastOffer).toEqual(declinedTrade.offer);
    expect(vm.status).toBe('declined');
    expect(vm.tradeAction).toEqual(declinedTrade);
    expect(vm.error).toBe(null);
  });

  it('surfaces create-offer validation errors without clearing the previous offer', async () => {
    vm.lastOffer = pendingOffer;
    vm.status = 'pending';
    api.createTradeOffer.mockRejectedValue(new Error('You can only offer Pokemon from your own collection.'));

    const result = await vm.createOffer({
      toUserId: 'player-2',
      offeredCaughtId: 'caught-9',
      requestedCaughtId: 'caught-3',
    });

    expect(result).toBe(null);
    expect(vm.lastOffer).toEqual(pendingOffer);
    expect(vm.status).toBe('pending');
    expect(vm.error).toBe('You can only offer Pokemon from your own collection.');
    expect(vm.isLoading).toBe(false);
  });

  it('surfaces accept errors without marking the trade complete', async () => {
    vm.lastOffer = pendingOffer;
    vm.status = 'pending';
    api.acceptTradeOffer.mockRejectedValue(new Error('Only the invited trainer can accept this trade.'));

    const result = await vm.acceptOffer('trade-1');

    expect(result).toBe(null);
    expect(vm.completedTrade).toBe(null);
    expect(vm.lastOffer).toEqual(pendingOffer);
    expect(vm.status).toBe('pending');
    expect(vm.error).toBe('Only the invited trainer can accept this trade.');
  });

  it('surfaces cancel errors without clearing pending offers', async () => {
    vm.outgoingOffers = offerLists.outgoing;
    api.cancelTradeOffer.mockRejectedValue(new Error('Only the trainer who created this trade can cancel it.'));

    const result = await vm.cancelOffer('trade-out');

    expect(result).toBe(null);
    expect(vm.outgoingOffers).toEqual(offerLists.outgoing);
    expect(vm.error).toBe('Only the trainer who created this trade can cancel it.');
  });

  it('keeps previous offer lists when loading trade offers fails', async () => {
    vm.incomingOffers = offerLists.incoming;
    vm.outgoingOffers = offerLists.outgoing;
    api.listTradeOffers.mockRejectedValue(new Error('Trades unavailable'));

    const result = await vm.loadOffers();

    expect(result).toBe(null);
    expect(vm.incomingOffers).toEqual(offerLists.incoming);
    expect(vm.outgoingOffers).toEqual(offerLists.outgoing);
    expect(vm.error).toBe('Trades unavailable');
    expect(vm.isLoading).toBe(false);
  });

  it('constructs a ViewModel directly', () => {
    expect(new TradingViewModel(api)).toBeInstanceOf(TradingViewModel);
  });
});
