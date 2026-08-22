const getCaughtId = (pokemon) => pokemon?.caught_id ?? pokemon?.id ?? null;

export function findOwnedPokemon(collection = [], caughtId, ownerUserId) {
  return collection.find((pokemon) => (
    getCaughtId(pokemon) === caughtId && pokemon.user_id === ownerUserId
  )) ?? null;
}

export function canCreateTradeOffer({
  fromUserId,
  toUserId,
  offeredCaughtId,
  collection = [],
} = {}) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) {
    return {
      eligible: false,
      offeredPokemon: null,
      reason: 'Choose another trainer to trade with.',
    };
  }

  const offeredPokemon = findOwnedPokemon(collection, offeredCaughtId, fromUserId);
  if (!offeredPokemon) {
    return {
      eligible: false,
      offeredPokemon: null,
      reason: 'You can only offer Pokemon from your own collection.',
    };
  }

  return {
    eligible: true,
    offeredPokemon,
    reason: null,
  };
}

export function validateTradeOwnership({
  offer = {},
  fromCollection = [],
  toCollection = [],
} = {}) {
  const offeredPokemon = findOwnedPokemon(
    fromCollection,
    offer.offeredCaughtId,
    offer.fromUserId,
  );

  if (!offeredPokemon) {
    return {
      valid: false,
      offeredPokemon: null,
      requestedPokemon: null,
      reason: 'The offered Pokemon is no longer available from that trainer.',
    };
  }

  const requestedPokemon = findOwnedPokemon(
    toCollection,
    offer.requestedCaughtId,
    offer.toUserId,
  );

  if (!requestedPokemon) {
    return {
      valid: false,
      offeredPokemon,
      requestedPokemon: null,
      reason: 'The requested Pokemon is no longer available from that trainer.',
    };
  }

  return {
    valid: true,
    offeredPokemon,
    requestedPokemon,
    reason: null,
  };
}

export function completeTrade({
  offer = {},
  fromCollection = [],
  toCollection = [],
} = {}) {
  const validation = validateTradeOwnership({ offer, fromCollection, toCollection });

  if (!validation.valid) {
    return {
      status: 'failed',
      offer: { ...offer, status: 'pending' },
      transfers: [],
      fromCollection,
      toCollection,
      reason: validation.reason,
    };
  }

  const { offeredPokemon, requestedPokemon } = validation;
  const offeredCaughtId = getCaughtId(offeredPokemon);
  const requestedCaughtId = getCaughtId(requestedPokemon);
  const nextOfferedPokemon = { ...offeredPokemon, user_id: offer.toUserId };
  const nextRequestedPokemon = { ...requestedPokemon, user_id: offer.fromUserId };

  return {
    status: 'complete',
    offer: { ...offer, status: 'complete' },
    transfers: [
      { caught_id: offeredCaughtId, from_user_id: offer.fromUserId, to_user_id: offer.toUserId },
      { caught_id: requestedCaughtId, from_user_id: offer.toUserId, to_user_id: offer.fromUserId },
    ],
    fromCollection: replacePokemonByCaughtId(
      fromCollection.filter((pokemon) => getCaughtId(pokemon) !== offeredCaughtId),
      nextRequestedPokemon,
    ),
    toCollection: replacePokemonByCaughtId(
      toCollection.filter((pokemon) => getCaughtId(pokemon) !== requestedCaughtId),
      nextOfferedPokemon,
    ),
  };
}

function replacePokemonByCaughtId(collection, pokemon) {
  const caughtId = getCaughtId(pokemon);
  const index = collection.findIndex((candidate) => getCaughtId(candidate) === caughtId);

  if (index === -1) {
    return [...collection, pokemon];
  }

  return collection.map((candidate, candidateIndex) => (
    candidateIndex === index ? pokemon : candidate
  ));
}
