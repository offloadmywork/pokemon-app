import { describe, expect, it } from 'vitest';
import {
  canCreateTradeOffer,
  completeTrade,
  findOwnedPokemon,
  validateTradeOwnership,
} from './trading';

const playerCollection = [
  { id: 'caught-1', pokemon_id: 'bulbasaur', name: 'Bulbasaur', user_id: 'player-1' },
  { id: 'caught-2', pokemon_id: 'squirtle', name: 'Squirtle', user_id: 'player-1' },
];

const partnerCollection = [
  { id: 'caught-3', pokemon_id: 'charmander', name: 'Charmander', user_id: 'player-2' },
  { id: 'caught-4', pokemon_id: 'pikachu', name: 'Pikachu', user_id: 'player-2' },
];

describe('Trading domain rules', () => {
  it('finds Pokemon only when the caught row belongs to the expected owner', () => {
    expect(findOwnedPokemon(playerCollection, 'caught-1', 'player-1')).toEqual(playerCollection[0]);
    expect(findOwnedPokemon(playerCollection, 'caught-1', 'player-2')).toBeNull();
    expect(findOwnedPokemon(playerCollection, 'missing', 'player-1')).toBeNull();
  });

  it('requires a trainer to offer one of their own caught Pokemon to another trainer', () => {
    expect(canCreateTradeOffer({
      fromUserId: 'player-1',
      toUserId: 'player-2',
      offeredCaughtId: 'caught-1',
      collection: playerCollection,
    })).toEqual({
      eligible: true,
      offeredPokemon: playerCollection[0],
      reason: null,
    });

    expect(canCreateTradeOffer({
      fromUserId: 'player-1',
      toUserId: 'player-1',
      offeredCaughtId: 'caught-1',
      collection: playerCollection,
    })).toEqual({
      eligible: false,
      offeredPokemon: null,
      reason: 'Choose another trainer to trade with.',
    });

    expect(canCreateTradeOffer({
      fromUserId: 'player-1',
      toUserId: 'player-2',
      offeredCaughtId: 'caught-3',
      collection: playerCollection,
    })).toEqual({
      eligible: false,
      offeredPokemon: null,
      reason: 'You can only offer Pokemon from your own collection.',
    });
  });

  it('validates both sides still own the requested Pokemon before completing a trade', () => {
    const offer = {
      fromUserId: 'player-1',
      toUserId: 'player-2',
      offeredCaughtId: 'caught-1',
      requestedCaughtId: 'caught-3',
    };

    expect(validateTradeOwnership({
      offer,
      fromCollection: playerCollection,
      toCollection: partnerCollection,
    })).toEqual({
      valid: true,
      offeredPokemon: playerCollection[0],
      requestedPokemon: partnerCollection[0],
      reason: null,
    });

    expect(validateTradeOwnership({
      offer: { ...offer, requestedCaughtId: 'caught-1' },
      fromCollection: playerCollection,
      toCollection: partnerCollection,
    })).toEqual({
      valid: false,
      offeredPokemon: playerCollection[0],
      requestedPokemon: null,
      reason: 'The requested Pokemon is no longer available from that trainer.',
    });
  });

  it('swaps ownership for a completed accepted trade without changing Pokemon details', () => {
    const offer = {
      id: 'trade-1',
      fromUserId: 'player-1',
      toUserId: 'player-2',
      offeredCaughtId: 'caught-2',
      requestedCaughtId: 'caught-4',
    };

    expect(completeTrade({
      offer,
      fromCollection: playerCollection,
      toCollection: partnerCollection,
    })).toEqual({
      status: 'complete',
      offer: { ...offer, status: 'complete' },
      transfers: [
        { caught_id: 'caught-2', from_user_id: 'player-1', to_user_id: 'player-2' },
        { caught_id: 'caught-4', from_user_id: 'player-2', to_user_id: 'player-1' },
      ],
      fromCollection: [
        playerCollection[0],
        { ...partnerCollection[1], user_id: 'player-1' },
      ],
      toCollection: [
        partnerCollection[0],
        { ...playerCollection[1], user_id: 'player-2' },
      ],
    });
  });

  it('keeps a trade pending when ownership validation fails', () => {
    const offer = {
      id: 'trade-1',
      fromUserId: 'player-1',
      toUserId: 'player-2',
      offeredCaughtId: 'caught-2',
      requestedCaughtId: 'missing',
    };

    expect(completeTrade({
      offer,
      fromCollection: playerCollection,
      toCollection: partnerCollection,
    })).toEqual({
      status: 'failed',
      offer: { ...offer, status: 'pending' },
      transfers: [],
      fromCollection: playerCollection,
      toCollection: partnerCollection,
      reason: 'The requested Pokemon is no longer available from that trainer.',
    });
  });
});
