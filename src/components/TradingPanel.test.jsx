import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TradingPanel from './TradingPanel';

const ownedPokemon = [
  { id: 'caught-1', pokemon_id: 'bulbasaur', name: 'Bulbasaur' },
  { id: 'caught-2', pokemon_id: 'squirtle', name: 'Squirtle' },
];

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
  offer: { ...pendingOffer, id: 'trade-out', status: 'cancelled' },
  reason: null,
};

const declinedTrade = {
  status: 'declined',
  offer: { ...pendingOffer, id: 'trade-in', status: 'declined' },
  reason: null,
};

const offerLists = {
  incoming: [
    { ...pendingOffer, id: 'trade-in', from_user_id: 'player-3', to_user_id: 'player-1' },
  ],
  outgoing: [
    { ...pendingOffer, id: 'trade-out', from_user_id: 'player-1', to_user_id: 'player-2' },
  ],
};

const createMockApi = (overrides = {}) => ({
  getCaughtPokemon: vi.fn().mockResolvedValue(ownedPokemon),
  listTradeOffers: vi.fn().mockResolvedValue({ incoming: [], outgoing: [] }),
  createTradeOffer: vi.fn().mockResolvedValue(pendingOffer),
  acceptTradeOffer: vi.fn().mockResolvedValue(completedTrade),
  cancelTradeOffer: vi.fn().mockResolvedValue(cancelledTrade),
  declineTradeOffer: vi.fn().mockResolvedValue(declinedTrade),
  ...overrides,
});

describe('TradingPanel', () => {
  it('loads owned Pokemon and creates a pending trade offer', async () => {
    const api = createMockApi();

    render(<TradingPanel apiClient={api} />);

    expect(await screen.findByText('2 Pokemon available')).toBeInTheDocument();
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Trade partner user id'), {
      target: { value: 'player-2' },
    });
    fireEvent.change(screen.getByLabelText('Requested caught Pokemon id'), {
      target: { value: 'caught-3' },
    });
    fireEvent.click(screen.getByText('Create Offer'));

    expect(api.createTradeOffer).toHaveBeenCalledWith({
      toUserId: 'player-2',
      offeredCaughtId: 'caught-1',
      requestedCaughtId: 'caught-3',
    });
    expect(await screen.findByText('Trade offer pending')).toBeInTheDocument();
    expect(screen.getByText('Offer: trade-1')).toBeInTheDocument();
    expect(screen.getByText('Offering caught-1 for caught-3')).toBeInTheDocument();
  });

  it('accepts a trade by id and shows completion feedback', async () => {
    const api = createMockApi();

    render(<TradingPanel apiClient={api} />);

    fireEvent.change(await screen.findByLabelText('Trade offer id'), {
      target: { value: 'trade-1' },
    });
    fireEvent.click(screen.getByText('Accept Trade'));

    expect(api.acceptTradeOffer).toHaveBeenCalledWith('trade-1');
    expect(await screen.findByText('Trade complete!')).toBeInTheDocument();
    expect(screen.getByText('2 Pokemon ownership updates completed')).toBeInTheDocument();
  });

  it('lists pending offers and accepts an incoming offer directly', async () => {
    const api = createMockApi({
      listTradeOffers: vi.fn()
        .mockResolvedValueOnce(offerLists)
        .mockResolvedValueOnce({ incoming: [], outgoing: offerLists.outgoing }),
    });

    render(<TradingPanel apiClient={api} />);

    expect(await screen.findByText('Incoming Offers')).toBeInTheDocument();
    expect(screen.getByText('From player-3')).toBeInTheDocument();
    expect(screen.getByText('Outgoing Offers')).toBeInTheDocument();
    expect(screen.getByText('To player-2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Accept trade-in'));

    expect(api.acceptTradeOffer).toHaveBeenCalledWith('trade-in');
    expect(await screen.findByText('Trade complete!')).toBeInTheDocument();
    expect(api.listTradeOffers).toHaveBeenCalledTimes(2);
  });

  it('cancels outgoing offers and refreshes the pending trade list', async () => {
    const api = createMockApi({
      listTradeOffers: vi.fn()
        .mockResolvedValueOnce(offerLists)
        .mockResolvedValueOnce({ incoming: offerLists.incoming, outgoing: [] }),
    });

    render(<TradingPanel apiClient={api} />);

    expect(await screen.findByText('Outgoing Offers')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel trade-out'));

    expect(api.cancelTradeOffer).toHaveBeenCalledWith('trade-out');
    expect(await screen.findByText('Trade offer cancelled.')).toBeInTheDocument();
    expect(api.listTradeOffers).toHaveBeenCalledTimes(2);
  });

  it('shows copyable trade codes for outgoing offers', async () => {
    const copyTradeId = vi.fn().mockResolvedValue();
    const api = createMockApi({
      listTradeOffers: vi.fn().mockResolvedValue(offerLists),
    });

    render(<TradingPanel apiClient={api} copyTradeId={copyTradeId} />);

    expect(await screen.findByText('Outgoing Offers')).toBeInTheDocument();
    expect(screen.getByText('Trade code: trade-out')).toBeInTheDocument();
    expect(screen.getByText('Share this code so the invited trainer can accept the trade.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Copy trade-out'));

    expect(copyTradeId).toHaveBeenCalledWith('trade-out');
    expect(await screen.findByText('Trade code copied.')).toBeInTheDocument();
  });

  it('declines incoming offers and refreshes the pending trade list', async () => {
    const api = createMockApi({
      listTradeOffers: vi.fn()
        .mockResolvedValueOnce(offerLists)
        .mockResolvedValueOnce({ incoming: [], outgoing: offerLists.outgoing }),
    });

    render(<TradingPanel apiClient={api} />);

    expect(await screen.findByText('Incoming Offers')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Decline trade-in'));

    expect(api.declineTradeOffer).toHaveBeenCalledWith('trade-in');
    expect(await screen.findByText('Trade offer declined.')).toBeInTheDocument();
    expect(api.listTradeOffers).toHaveBeenCalledTimes(2);
  });

  it('disables offer creation until the player owns Pokemon', async () => {
    const api = createMockApi({
      getCaughtPokemon: vi.fn().mockResolvedValue([]),
    });

    render(<TradingPanel apiClient={api} />);

    expect(await screen.findByText('0 Pokemon available')).toBeInTheDocument();
    expect(screen.getByText('Catch Pokemon before trading.')).toBeInTheDocument();
    expect(screen.getByText('Create Offer')).toBeDisabled();
  });

  it('surfaces trading action errors without clearing the form', async () => {
    const api = createMockApi({
      createTradeOffer: vi.fn().mockRejectedValue(
        new Error('You can only offer Pokemon from your own collection.'),
      ),
    });

    render(<TradingPanel apiClient={api} />);

    fireEvent.change(await screen.findByLabelText('Trade partner user id'), {
      target: { value: 'player-2' },
    });
    fireEvent.change(screen.getByLabelText('Requested caught Pokemon id'), {
      target: { value: 'caught-3' },
    });
    fireEvent.click(screen.getByText('Create Offer'));

    expect(await screen.findByText('Trading action failed')).toBeInTheDocument();
    expect(screen.getByText('You can only offer Pokemon from your own collection.')).toBeInTheDocument();
    expect(screen.getByLabelText('Requested caught Pokemon id')).toHaveValue('caught-3');
  });
});
