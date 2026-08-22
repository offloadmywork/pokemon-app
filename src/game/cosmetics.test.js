import { describe, expect, it } from 'vitest';
import {
  applyCosmeticPurchase,
  COSMETIC_CATALOG,
  getCosmetic,
  previewCosmeticPurchase,
} from './cosmetics';

describe('Cosmetic sink rules', () => {
  it('defines non-power cosmetic catalog entries for trainer cards and ball skins', () => {
    expect(COSMETIC_CATALOG.trainer_card_bronze).toMatchObject({
      cosmetic_id: 'trainer_card_bronze',
      slot: 'trainer_card',
      cost: 120,
      currency: 'coins',
    });
    expect(COSMETIC_CATALOG.premier_ball_skin).toMatchObject({
      cosmetic_id: 'premier_ball_skin',
      slot: 'ball_skin',
      cost: 2,
      currency: 'shards',
    });
    expect(getCosmetic('missing')).toBeNull();
  });

  it('previews affordable cosmetic purchases without mutating wallet or owned cosmetics', () => {
    const wallet = { coins: 200, shards: 3 };
    const ownedCosmetics = ['starter_frame'];

    const preview = previewCosmeticPurchase({
      wallet,
      ownedCosmetics,
      cosmeticId: 'trainer_card_bronze',
    });

    expect(preview).toEqual({
      ok: true,
      cosmetic_id: 'trainer_card_bronze',
      slot: 'trainer_card',
      currency: 'coins',
      total_cost: 120,
      wallet: { coins: 80, shards: 3 },
      ownedCosmetics: ['starter_frame', 'trainer_card_bronze'],
      reason: null,
    });
    expect(wallet).toEqual({ coins: 200, shards: 3 });
    expect(ownedCosmetics).toEqual(['starter_frame']);
  });

  it('rejects unknown, already-owned, and unaffordable cosmetic purchases', () => {
    expect(previewCosmeticPurchase({ wallet: { coins: 500 }, cosmeticId: 'missing' })).toMatchObject({
      ok: false,
      reason: 'Unknown cosmetic.',
    });
    expect(previewCosmeticPurchase({
      wallet: { coins: 500 },
      ownedCosmetics: ['trainer_card_bronze'],
      cosmeticId: 'trainer_card_bronze',
    })).toMatchObject({
      ok: false,
      reason: 'Cosmetic already owned.',
    });
    expect(previewCosmeticPurchase({
      wallet: { coins: 500, shards: 1 },
      cosmeticId: 'premier_ball_skin',
    })).toMatchObject({
      ok: false,
      reason: 'Not enough shards.',
    });
  });

  it('applies affordable cosmetic purchases to wallet and owned cosmetic state', () => {
    const result = applyCosmeticPurchase({
      wallet: { coins: 140, shards: 0 },
      ownedCosmetics: [],
      cosmeticId: 'trainer_card_bronze',
    });

    expect(result.wallet).toEqual({ coins: 20, shards: 0 });
    expect(result.ownedCosmetics).toEqual(['trainer_card_bronze']);
  });
});
