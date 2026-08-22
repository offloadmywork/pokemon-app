import { v4 as uuidv4 } from 'uuid';
import { completeTrade, validateTradeOwnership } from '../src/game/trading.js';

const PENDING_STATUS = 'pending';
const COMPLETE_STATUS = 'complete';
const CANCELLED_STATUS = 'cancelled';
const DECLINED_STATUS = 'declined';

export async function createTradeOffer(db, offer, idFactory = uuidv4) {
  const id = offer.id || idFactory();
  const caughtPokemon = await getCaughtPokemonForTrade(db, [
    offer.offeredCaughtId,
    offer.requestedCaughtId,
  ]);
  const validation = validateTradeOwnership({
    offer,
    fromCollection: caughtPokemon,
    toCollection: caughtPokemon,
  });

  if (!validation.valid) {
    return {
      status: 'rejected',
      reason: validation.reason,
    };
  }

  await db.prepare(
    `INSERT INTO trade_offers (
       id,
       from_user_id,
       to_user_id,
       offered_caught_id,
       requested_caught_id,
       status,
       created_at,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    id,
    offer.fromUserId,
    offer.toUserId,
    offer.offeredCaughtId,
    offer.requestedCaughtId,
    PENDING_STATUS,
  ).run();

  return await getTradeOffer(db, id) || {
    id,
    from_user_id: offer.fromUserId,
    to_user_id: offer.toUserId,
    offered_caught_id: offer.offeredCaughtId,
    requested_caught_id: offer.requestedCaughtId,
    status: PENDING_STATUS,
  };
}

export async function getTradeOffer(db, tradeId) {
  const { results } = await db.prepare(
    `SELECT id,
            from_user_id,
            to_user_id,
            offered_caught_id,
            requested_caught_id,
            status,
            created_at,
            updated_at
     FROM trade_offers
     WHERE id = ?
     LIMIT 1`
  ).bind(tradeId).all();

  return results?.[0] || null;
}

export async function listTradeOffers(db, userId) {
  const { results: incomingResults } = await db.prepare(
    `SELECT id,
            from_user_id,
            to_user_id,
            offered_caught_id,
            requested_caught_id,
            status,
            created_at,
            updated_at
     FROM trade_offers
     WHERE status = ?
       AND to_user_id = ?
     ORDER BY created_at DESC`
  ).bind(PENDING_STATUS, userId).all();

  const { results: outgoingResults } = await db.prepare(
    `SELECT id,
            from_user_id,
            to_user_id,
            offered_caught_id,
            requested_caught_id,
            status,
            created_at,
            updated_at
     FROM trade_offers
     WHERE status = ?
       AND from_user_id = ?
     ORDER BY created_at DESC`
  ).bind(PENDING_STATUS, userId).all();

  return {
    incoming: incomingResults || [],
    outgoing: outgoingResults || [],
  };
}

export async function acceptTradeOffer(db, { tradeId, userId }) {
  const offerRow = await getTradeOffer(db, tradeId);

  if (!offerRow) {
    return null;
  }

  if (offerRow.status !== PENDING_STATUS) {
    return {
      status: 'failed',
      offer: offerRow,
      transfers: [],
      reason: 'Trade offer is no longer pending.',
    };
  }

  if (offerRow.to_user_id !== userId) {
    return {
      status: 'failed',
      offer: offerRow,
      transfers: [],
      reason: 'Only the invited trainer can accept this trade.',
    };
  }

  const tradeOffer = mapTradeOfferRowToDomain(offerRow);
  const caughtPokemon = await getCaughtPokemonForTrade(db, [
    tradeOffer.offeredCaughtId,
    tradeOffer.requestedCaughtId,
  ]);
  const completed = completeTrade({
    offer: tradeOffer,
    fromCollection: caughtPokemon,
    toCollection: caughtPokemon,
  });

  if (completed.status !== COMPLETE_STATUS) {
    return {
      status: 'failed',
      offer: offerRow,
      transfers: [],
      reason: completed.reason,
    };
  }

  for (const transfer of completed.transfers) {
    await db.prepare(
      `UPDATE caught_pokemon
       SET user_id = ?
       WHERE id = ?`
    ).bind(transfer.to_user_id, transfer.caught_id).run();
  }

  await db.prepare(
    `UPDATE trade_offers
     SET status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(COMPLETE_STATUS, tradeId).run();

  return {
    status: COMPLETE_STATUS,
    offer: { ...offerRow, status: COMPLETE_STATUS },
    transfers: completed.transfers,
  };
}

export async function cancelTradeOffer(db, { tradeId, userId }) {
  return updatePendingTradeStatus(db, {
    tradeId,
    userId,
    nextStatus: CANCELLED_STATUS,
    allowedUserKey: 'from_user_id',
    unauthorizedReason: 'Only the trainer who created this trade can cancel it.',
  });
}

export async function declineTradeOffer(db, { tradeId, userId }) {
  return updatePendingTradeStatus(db, {
    tradeId,
    userId,
    nextStatus: DECLINED_STATUS,
    allowedUserKey: 'to_user_id',
    unauthorizedReason: 'Only the invited trainer can decline this trade.',
  });
}

async function updatePendingTradeStatus(
  db,
  { tradeId, userId, nextStatus, allowedUserKey, unauthorizedReason },
) {
  const offerRow = await getTradeOffer(db, tradeId);

  if (!offerRow) {
    return null;
  }

  if (offerRow.status !== PENDING_STATUS) {
    return {
      status: 'failed',
      offer: offerRow,
      reason: 'Trade offer is no longer pending.',
    };
  }

  if (offerRow[allowedUserKey] !== userId) {
    return {
      status: 'failed',
      offer: offerRow,
      reason: unauthorizedReason,
    };
  }

  await db.prepare(
    `UPDATE trade_offers
     SET status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(nextStatus, tradeId).run();

  return {
    status: nextStatus,
    offer: { ...offerRow, status: nextStatus },
    reason: null,
  };
}

async function getCaughtPokemonForTrade(db, caughtIds = []) {
  const [firstCaughtId, secondCaughtId] = caughtIds;
  const { results } = await db.prepare(
    `SELECT c.id,
            c.pokemon_id,
            c.user_id,
            c.nickname,
            p.name,
            p.type,
            p.rarity,
            p.power_level,
            p.image_url
     FROM caught_pokemon c
     LEFT JOIN pokemon p ON p.id = c.pokemon_id
     WHERE c.id IN (?, ?)`
  ).bind(firstCaughtId, secondCaughtId).all();

  return results || [];
}

function mapTradeOfferRowToDomain(offerRow) {
  return {
    id: offerRow.id,
    fromUserId: offerRow.from_user_id,
    toUserId: offerRow.to_user_id,
    offeredCaughtId: offerRow.offered_caught_id,
    requestedCaughtId: offerRow.requested_caught_id,
    status: offerRow.status,
  };
}
