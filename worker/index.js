// Pokemon App API - Cloudflare Workers with Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';
import { buildChallengeTowerFloors, CHALLENGE_TOWER_MAX_FLOORS } from '../src/game/challengeTower.js';
import { getLevelFromXP } from '../src/game/constants.js';
import { getMaxHP } from '../src/game/battle.js';
import { getDailyQuestTemplateKeysForEvent } from '../src/game/dailyQuestEvents.js';
import { getDailyQuestTemplatesForDate } from '../src/game/dailyQuestTemplates.js';
import { buildKpiSnapshot } from '../src/game/kpiMetrics.js';
import { buildCoopRaidBoss } from '../src/game/coopRaids.js';
import { getCosmetic, COSMETIC_CATALOG, previewCosmeticPurchase } from '../src/game/cosmetics.js';
import { previewShopPurchase, previewUpgradePurchase } from '../src/game/economy.js';
import { ACHIEVEMENT_CATALOG, evaluateCollectionAchievements, getAchievement } from '../src/game/achievements.js';
import { calculatePvpRewards, resolvePvpBattleResult } from '../src/game/pvp.js';
import { applyDailyQuestStreakAfterClaim, grantUserItem } from './dailyQuestStreaks.js';
import { listBossClears, recordBossClear } from './bossProgress.js';
import { getWeekKey } from '../src/game/weeklyMissions.js';
import {
  ensureWeeklyMissions,
  incrementWeeklyMissionProgress,
  claimWeeklyMissionRewards,
} from './weeklyMissions.js';
import {
  getMasteryStatus,
  claimMasteryTier,
} from './collectionMastery.js';
import {
  getOrCreateRecoveryPhrase,
  findUserIdByRecoveryPhrase,
} from './recoveryCodes.js';
import {
  ensureRecoveryCode,
  findUserIdByRecoveryCode,
} from './accountRecovery.js';
import { isValidRecoveryCodeFormat } from '../src/game/recoveryCode.js';
import { createCoopRaidRoom, getCoopRaidRoom, joinCoopRaidRoom, recordCoopRaidAttempt } from './coopRaids.js';
import { getPlayerWallet, grantPlayerCoins } from './playerWallet.js';
import { findQueuedPvpOpponent, getPvpOpponentTeam, leavePvpQueue, upsertPvpQueueEntry } from './pvpQueue.js';
import { listPvpMatchHistory, recordPvpMatchResult } from './pvpMatches.js';
import { acceptTradeOffer, cancelTradeOffer, createTradeOffer, declineTradeOffer, listTradeOffers } from './trades.js';

const app = new Hono();
const RARE_QUEST_RARITIES = new Set(['Rare', 'Epic', 'Legendary']);

// Starter Pokemon data (for new users)
const STARTER_POKEMON = [
  {
    name: "Flametail Jr",
    type: "Fire",
    description: "A small but fiery fox pup. Eager to learn and grow! 🔥🦊",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=flametail-jr&backgroundColor=red",
    rarity: "Common",
    power_level: 25
  },
  {
    name: "Ripplefin",
    type: "Water",
    description: "A playful water sprite. Always splashing and exploring! 💧✨",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=ripplefin&backgroundColor=blue",
    rarity: "Common",
    power_level: 25
  },
  {
    name: "Leaflet",
    type: "Grass",
    description: "A curious little sprout. Loves sunlight and adventures! 🌱☀️",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=leaflet&backgroundColor=green",
    rarity: "Common",
    power_level: 25
  }
];

const CHALLENGE_TOWER_FLOORS = buildChallengeTowerFloors(CHALLENGE_TOWER_MAX_FLOORS);


const ensureUserExists = async (db, userId) => {
  if (!userId) return;
  await db.prepare(
    `INSERT INTO users (id, created_at, last_active_at)
     VALUES (?, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET last_active_at = datetime('now')`
  ).bind(userId).run();
};

const grantPlayerXpReward = async (db, userId, xpReward = 0) => {
  if (!userId || xpReward <= 0) return null;

  const { results } = await db.prepare(
    'SELECT xp, level FROM player_progress WHERE user_id = ?'
  ).bind(userId).all();

  const currentProgress = results?.[0] || { xp: 0, level: 1 };
  const nextXp = (currentProgress.xp || 0) + xpReward;
  const nextLevel = getLevelFromXP(nextXp);

  if (results?.[0]) {
    await db.prepare(
      `UPDATE player_progress
       SET xp = ?, level = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(nextXp, nextLevel, userId).run();
  } else {
    // player_progress.id is INTEGER PRIMARY KEY — let SQLite auto-assign it.
    await db.prepare(
      `INSERT INTO player_progress (user_id, xp, level, updated_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).bind(userId, nextXp, nextLevel).run();
  }

  return { xp: nextXp, level: nextLevel };
};

const incrementDailyQuestProgressByTemplateKey = async (db, userId, templateKey, amount = 1) => {
  if (!userId || !templateKey) return;

  const today = new Date().toISOString().slice(0, 10);
  const safeAmount = Math.max(0, amount);
  if (safeAmount === 0) return;

  // Only increment if the quest exists for today and is not already completed.
  // (Completion is also clamped to target.)
  await db.prepare(
    `UPDATE daily_quests
     SET progress = MIN(target, progress + ?),
         completed_at = CASE
           WHEN (progress + ?) >= target AND completed_at IS NULL THEN datetime('now')
           ELSE completed_at
         END
     WHERE user_id = ?
       AND quest_date = ?
       AND template_key = ?`
  ).bind(safeAmount, safeAmount, userId, today, templateKey).run();
};

const incrementDailyQuestsForEvent = async (db, userId, event, amount = 1) => {
  const keys = getDailyQuestTemplateKeysForEvent(event);
  for (const key of keys) {
    // If daily quests haven't been generated yet today, we don't auto-generate here.
    // The Home screen fetch (`GET /api/daily-quests`) handles generation.
    await incrementDailyQuestProgressByTemplateKey(db, userId, key, amount);
  }
};

// Best-effort weekly mission progress for gameplay events (Phase 4 Live Ops).
const WEEKLY_EVENT_MAP = {
  catch: 'catches',
  rareCatch: 'rare-catches',
  battleWin: 'battle-wins',
  evolvePokemon: 'evolutions',
  towerFloorComplete: 'tower-floors',
  raidVictory: 'raid-victories',
};

const incrementWeeklyMissionsForEvent = async (db, userId, event, amount = 1) => {
  if (!userId || !event) return;
  const weeklyEvent = WEEKLY_EVENT_MAP[event];
  if (!weeklyEvent) return;
  try {
    await incrementWeeklyMissionProgress(db, userId, weeklyEvent, amount);
  } catch {
    // Weekly mission progress is best-effort; never fail the gameplay request.
  }
};

const getDailyTaskSlotUpgradeLevel = async (db, userId) => {
  const { results } = await db.prepare(
    'SELECT level FROM user_upgrades WHERE user_id = ? AND upgrade_id = ?'
  ).bind(userId, 'daily_task_slot').all();

  const parsed = Number(results?.[0]?.level);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const getCollectionAchievementProgress = async (db, userId) => {
  const { results } = await db.prepare(
    'SELECT COUNT(DISTINCT pokemon_id) AS caught_count FROM caught_pokemon WHERE user_id = ?'
  ).bind(userId).all();

  const parsed = Number(results?.[0]?.caught_count);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

const listClaimedAchievements = async (db, userId) => {
  const { results } = await db.prepare(
    'SELECT achievement_id, claimed_at FROM user_achievements WHERE user_id = ?'
  ).bind(userId).all();

  return results || [];
};

const addWalletReward = async (db, userId, reward = {}) => {
  const wallet = await getPlayerWallet(db, userId);
  const nextWallet = {
    coins: (Number(wallet.coins) || 0) + (Number(reward.coins) || 0),
    shards: (Number(wallet.shards) || 0) + (Number(reward.shards) || 0),
  };

  // Upsert: getPlayerWallet returns a default object with user_id even when no
  // row exists yet, so a plain UPDATE would silently persist nothing for new users.
  await db.prepare(
    `INSERT INTO player_wallet (user_id, coins, shards, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       coins = excluded.coins,
       shards = excluded.shards,
       updated_at = datetime('now')`
  ).bind(userId, nextWallet.coins, nextWallet.shards).run();

  return { user_id: userId, ...nextWallet };
};

const mapBossClearToKpiRow = (row) => ({
  ...row,
  zone_id: row.zone_id || (row.boss_key === 'grove-guardian' ? 'zone-1' : row.boss_key),
});

// Enable CORS
app.use('/api/*', cors());

// ===== ACCOUNT RECOVERY API (Epic E4: Save Safety) =====
app.get('/api/recovery/code', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    if (!user_id) return c.json({ error: 'user_id is required' }, 400);

    await ensureUserExists(c.env.DB, user_id);
    const recovery_code = await ensureRecoveryCode(c.env.DB, user_id);
    return c.json({ recovery_code });
  } catch (error) {
    console.error('recovery code error:', error);
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/recovery/restore', async (c) => {
  try {
    const data = await c.req.json();

    // Unified restore endpoint: accepts either a word phrase or a legacy
    // XXXX-XXXX recovery code. Format-specific validation errors stay 400;
    // unknown-but-well-formed identifiers are a uniform 404.
    if (data?.phrase) {
      const result = await findUserIdByRecoveryPhrase(c.env.DB, data.phrase);
      if (result.error) {
        const isUnknown = /no save found/i.test(result.error);
        return c.json({ error: result.error }, isUnknown ? 404 : 400);
      }
      await ensureUserExists(c.env.DB, result.user_id);
      return c.json({ user_id: result.user_id });
    }

    if (data?.code) {
      if (!isValidRecoveryCodeFormat(data.code)) {
        return c.json({ error: 'That does not look like a recovery code. Expected format: XXXX-XXXX.' }, 400);
      }
      const userId = await findUserIdByRecoveryCode(c.env.DB, data.code);
      if (!userId) return c.json({ error: 'No trainer found for that code. Check the format (XXXX-XXXX).' }, 404);
      await ensureUserExists(c.env.DB, userId);
      return c.json({ user_id: userId });
    }

    return c.json({ error: 'phrase or code is required' }, 400);
  } catch (error) {
    console.error('recovery/restore failed:', error);
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// ===== RECOVERY PHRASE API (Epic E4: Save Safety) =====
app.post('/api/recovery/register', async (c) => {
  try {
    const data = await c.req.json();
    if (!data?.user_id) return c.json({ error: 'user_id is required' }, 400);

    await ensureUserExists(c.env.DB, data.user_id);
    const result = await getOrCreateRecoveryPhrase(c.env.DB, data.user_id);
    if (result.error) return c.json({ error: result.error }, 500);
    return c.json(result);
  } catch (error) {
    console.error('recovery/register failed:', error);
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Backstop error handler: never leak internals to clients (Epic E6.3).
app.onError((err, c) => {
  console.error('Unhandled API error:', err);
  return c.json({ error: 'Something went wrong. Please try again.' }, 500);
});

// ===== USER/SESSION API =====
// Create or get user by ID
app.post('/api/user', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }
    
    // Check if user exists
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id, created_at, last_active_at FROM users WHERE id = ?'
    ).bind(user_id).all();

    const wasExisting = existing.length > 0;

    await ensureUserExists(c.env.DB, user_id);

    const { results: refreshed } = await c.env.DB.prepare(
      'SELECT id, created_at, last_active_at FROM users WHERE id = ?'
    ).bind(user_id).all();

    return c.json({
      user_id: refreshed[0].id,
      created_at: refreshed[0].created_at,
      last_active_at: refreshed[0].last_active_at,
      existing: wasExisting
    }, wasExisting ? 200 : 201);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Get user info
app.get('/api/user/:id', async (c) => {
  try {
    const user_id = c.req.param('id');
    
    const { results } = await c.env.DB.prepare(
      'SELECT id, created_at, last_active_at FROM users WHERE id = ?'
    ).bind(user_id).all();
    
    if (results.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({
      user_id: results[0].id,
      created_at: results[0].created_at,
      last_active_at: results[0].last_active_at
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ================================

// Get all Pokemon
app.get('/api/pokemon', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM pokemon ORDER BY created_at DESC'
    ).all();
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Get a single Pokemon by ID
app.get('/api/pokemon/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM pokemon WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return c.json({ error: 'Pokemon not found' }, 404);
    }
    
    return c.json(results[0]);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Get a random Pokemon (optionally filtered by rarity/type)
app.get('/api/pokemon/random/get', async (c) => {
  try {
    const rarity = c.req.query('rarity');
    const type = c.req.query('type');
    
    let query = 'SELECT * FROM pokemon';
    const params = [];
    const filters = [];
    
    if (rarity) {
      filters.push('rarity = ?');
      params.push(rarity);
    }

    if (type) {
      filters.push('type = ?');
      params.push(type);
    }

    if (filters.length > 0) {
      query += ` WHERE ${filters.join(' AND ')}`;
    }
    
    query += ' ORDER BY RANDOM() LIMIT 1';
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    if (results.length === 0) {
      return c.json({ error: 'No Pokemon found' }, 404);
    }
    
    return c.json(results[0]);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Create a new Pokemon
app.post('/api/pokemon', async (c) => {
  try {
    const data = await c.req.json();
    const id = uuidv4();
    
    await c.env.DB.prepare(
      `INSERT INTO pokemon (id, name, type, description, image_url, rarity, power_level) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      data.name,
      data.type,
      data.description,
      data.image_url,
      data.rarity || 'Common',
      data.power_level
    ).run();
    
    return c.json({ id, ...data }, 201);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Get all caught Pokemon
app.get('/api/caught', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    let query = `
      SELECT c.id, c.pokemon_id, c.caught_date, c.nickname, 
             p.name, p.type, p.description, p.image_url, p.rarity, p.power_level
      FROM caught_pokemon c
      JOIN pokemon p ON c.pokemon_id = p.id
    `;
    
    const params = [];
    
    if (user_id) {
      query += ' WHERE c.user_id = ?';
      params.push(user_id);
    } else {
      // Backward compatibility: return Pokemon with NULL user_id for legacy data
      query += ' WHERE c.user_id IS NULL';
    }
    
    query += ' ORDER BY c.caught_date DESC';
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Catch a Pokemon
app.post('/api/caught', async (c) => {
  try {
    const data = await c.req.json();
    const id = uuidv4();

    if (data.user_id) {
      await ensureUserExists(c.env.DB, data.user_id);
    }

    await c.env.DB.prepare(
      `INSERT INTO caught_pokemon (id, pokemon_id, user_id, nickname) 
       VALUES (?, ?, ?, ?)`
    ).bind(
      id,
      data.pokemon_id,
      data.user_id || null,
      data.nickname || null
    ).run();

    // Progress daily quests (if they exist for today)
    if (data.user_id) {
      await incrementDailyQuestsForEvent(c.env.DB, data.user_id, 'catch', 1);
      await incrementWeeklyMissionsForEvent(c.env.DB, data.user_id, 'catch', 1);

      const { results: caughtPokemon } = await c.env.DB.prepare(
        'SELECT rarity FROM pokemon WHERE id = ?'
      ).bind(data.pokemon_id).all();

      if (RARE_QUEST_RARITIES.has(caughtPokemon[0]?.rarity)) {
        await incrementDailyQuestsForEvent(c.env.DB, data.user_id, 'rareCatch', 1);
        await incrementWeeklyMissionsForEvent(c.env.DB, data.user_id, 'rareCatch', 1);
      }
    }

    return c.json({ id, ...data }, 201);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// ===== STARTER POKEMON ENDPOINT =====
// Claim starter Pokemon (for new users)
app.post('/api/starter/claim', async (c) => {
  try {
    const data = await c.req.json();
    const user_id = data.user_id || null;

    if (user_id) {
      await ensureUserExists(c.env.DB, user_id);
    }
    
    // Check if user already has Pokemon
    let countQuery = 'SELECT COUNT(*) as count FROM caught_pokemon';
    const countParams = [];
    
    if (user_id) {
      countQuery += ' WHERE user_id = ?';
      countParams.push(user_id);
    } else {
      countQuery += ' WHERE user_id IS NULL';
    }
    
    const { results: existing } = await c.env.DB.prepare(countQuery).bind(...countParams).all();
    
    if (existing[0].count > 0) {
      return c.json({ error: 'You already have Pokemon!' }, 400);
    }
    
    // Insert starter Pokemon if they don't exist
    const claimedPokemon = [];
    
    for (const starter of STARTER_POKEMON) {
      // Check if this starter already exists in DB
      let { results: existingStarter } = await c.env.DB.prepare(
        'SELECT id FROM pokemon WHERE name = ?'
      ).bind(starter.name).all();

      let pokemonId;
      
      if (existingStarter.length > 0) {
        pokemonId = existingStarter[0].id;
      } else {
        // Create the starter Pokemon
        pokemonId = uuidv4();
        await c.env.DB.prepare(
          `INSERT INTO pokemon (id, name, type, description, image_url, rarity, power_level) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          pokemonId,
          starter.name,
          starter.type,
          starter.description,
          starter.image_url,
          starter.rarity,
          starter.power_level
        ).run();
      }
      
      // Add to user's collection
      const caughtId = uuidv4();
      await c.env.DB.prepare(
        `INSERT INTO caught_pokemon (id, pokemon_id, user_id, caught_date) 
         VALUES (?, ?, ?, datetime('now'))`
      ).bind(caughtId, pokemonId, user_id).run();
      
      claimedPokemon.push({
        caught_id: caughtId,
        pokemon_id: pokemonId,
        ...starter,
        // Include team-ready data for auto-add
        maxHP: 100,
        currentHP: 100
      });
    }
    
    return c.json({
      success: true,
      message: '🎉 Welcome! You received 3 starter Pokemon! They\'re ready for battle!',
      starters: claimedPokemon,
      autoAddToTeam: true  // Signal frontend to auto-add to team
    }, 201);
    
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================================

// Update a caught Pokemon (for nicknames)
app.patch('/api/caught/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    
    await c.env.DB.prepare(
      'UPDATE caught_pokemon SET nickname = ? WHERE id = ?'
    ).bind(
      data.nickname || null,
      id
    ).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Release a caught Pokemon
app.delete('/api/caught/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    await c.env.DB.prepare(
      'DELETE FROM caught_pokemon WHERE id = ?'
    ).bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// ===== TRADING API =====
app.get('/api/trades', async (c) => {
  try {
    const userId = c.req.query('user_id');

    if (!userId) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, userId);

    const offers = await listTradeOffers(c.env.DB, userId);
    return c.json(offers);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/trades', async (c) => {
  try {
    const data = await c.req.json();
    const {
      user_id,
      to_user_id,
      offered_caught_id,
      requested_caught_id,
    } = data;

    if (!user_id || !to_user_id || !offered_caught_id || !requested_caught_id) {
      return c.json({ error: 'user_id, to_user_id, offered_caught_id, and requested_caught_id are required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    await ensureUserExists(c.env.DB, to_user_id);

    const tradeOffer = await createTradeOffer(c.env.DB, {
      fromUserId: user_id,
      toUserId: to_user_id,
      offeredCaughtId: offered_caught_id,
      requestedCaughtId: requested_caught_id,
    });

    if (tradeOffer.status === 'rejected') {
      return c.json({ error: tradeOffer.reason }, 400);
    }

    return c.json(tradeOffer, 201);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/trades/:id/accept', async (c) => {
  try {
    const tradeId = c.req.param('id');
    const data = await c.req.json();
    const { user_id } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);

    const result = await acceptTradeOffer(c.env.DB, { tradeId, userId: user_id });

    if (!result) {
      return c.json({ error: 'Trade offer not found' }, 404);
    }

    if (result.status === 'failed') {
      return c.json({ error: result.reason, offer: result.offer }, 400);
    }

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/trades/:id/cancel', async (c) => {
  try {
    const tradeId = c.req.param('id');
    const data = await c.req.json();
    const { user_id } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);

    const result = await cancelTradeOffer(c.env.DB, { tradeId, userId: user_id });

    if (!result) {
      return c.json({ error: 'Trade offer not found' }, 404);
    }

    if (result.status === 'failed') {
      return c.json({ error: result.reason, offer: result.offer }, 400);
    }

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/trades/:id/decline', async (c) => {
  try {
    const tradeId = c.req.param('id');
    const data = await c.req.json();
    const { user_id } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);

    const result = await declineTradeOffer(c.env.DB, { tradeId, userId: user_id });

    if (!result) {
      return c.json({ error: 'Trade offer not found' }, 404);
    }

    if (result.status === 'failed') {
      return c.json({ error: result.reason, offer: result.offer }, 400);
    }

    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// =====================

// ===== PLAYER PROGRESS API - Cross-device persistence =====
// Get player progress (XP, level)
app.get('/api/player/progress', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    let query = 'SELECT xp, level FROM player_progress';
    const params = [];
    
    if (user_id) {
      query += ' WHERE user_id = ?';
      params.push(user_id);
    } else {
      // Backward compatibility: legacy data with id=1 and user_id IS NULL
      query += ' WHERE id = 1 OR user_id IS NULL';
    }
    
    query += ' LIMIT 1';
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    if (results.length === 0) {
      // Return defaults if no progress exists
      return c.json({ xp: 0, level: 1 });
    }
    
    return c.json(results[0]);
  } catch (error) {
    // If table doesn't exist yet, return defaults
    if (error.message.includes('no such table')) {
      return c.json({ xp: 0, level: 1 });
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Update player progress (XP, level)
app.post('/api/player/progress', async (c) => {
  try {
    const data = await c.req.json();
    const { xp = 0, level = 1, user_id = null } = data;

    if (user_id) {
      // User-specific progress
      // Check if exists
      const { results: existing } = await c.env.DB.prepare(
        'SELECT id FROM player_progress WHERE user_id = ?'
      ).bind(user_id).all();

      if (existing.length > 0) {
        // Update existing
        await c.env.DB.prepare(
          `UPDATE player_progress SET xp = ?, level = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(xp, level, user_id).run();
      } else {
        // Insert new (id is INTEGER PRIMARY KEY — auto-assigned)
        await c.env.DB.prepare(
          `INSERT INTO player_progress (user_id, xp, level, updated_at)
           VALUES (?, ?, ?, datetime('now'))`
        ).bind(user_id, xp, level).run();
      }
    } else {
      // Legacy: Upsert progress (single row table with id=1)
      await c.env.DB.prepare(
        `INSERT INTO player_progress (id, xp, level, updated_at)
         VALUES (1, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           xp = excluded.xp,
           level = excluded.level,
           updated_at = datetime('now')`
      ).bind(xp, level).run();
    }

    return c.json({ xp, level });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ================================================

// ===== PLAYER WALLET API =====
// Get player wallet (soft currencies)
app.get('/api/player/wallet', async (c) => {
  try {
    const user_id = c.req.query('user_id');

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const wallet = await getPlayerWallet(c.env.DB, user_id);
    return c.json(wallet);
  } catch (error) {
    if (error.message.includes('no such table')) {
      return c.json({
        user_id: c.req.query('user_id') || null,
        coins: 0,
        shards: 0,
      });
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================

// ===== SHOP API =====
// Purchase an item with persisted player wallet coins
app.post('/api/shop/purchase', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, item_id } = data;
    const quantity = Number(data.quantity ?? 1);

    if (!user_id || !item_id) {
      return c.json({ error: 'user_id and item_id are required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const wallet = await getPlayerWallet(c.env.DB, user_id);
    const { results: existingItems } = await c.env.DB.prepare(
      'SELECT id, item_id, quantity FROM user_items WHERE user_id = ? AND item_id = ?'
    ).bind(user_id, item_id).all();
    const existingItem = existingItems?.[0] || null;
    const preview = previewShopPurchase({
      wallet,
      inventory: { [item_id]: existingItem?.quantity || 0 },
      itemId: item_id,
      quantity,
    });

    if (!preview.ok) {
      return c.json({ error: preview.reason }, 400);
    }

    await c.env.DB.prepare(
      `UPDATE player_wallet
       SET coins = ?, shards = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(preview.wallet.coins, preview.wallet.shards, user_id).run();

    const nextItemQuantity = preview.inventory[item_id];
    if (existingItem) {
      await c.env.DB.prepare(
        'UPDATE user_items SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).bind(nextItemQuantity, existingItem.id).run();
    } else {
      await c.env.DB.prepare(
        'INSERT INTO user_items (id, user_id, item_id, quantity) VALUES (?, ?, ?, ?)'
      ).bind(uuidv4(), user_id, item_id, nextItemQuantity).run();
    }

    return c.json({
      success: true,
      item_id,
      quantity,
      total_cost: preview.total_cost,
      wallet: { user_id, ...preview.wallet },
      item: { item_id, quantity: nextItemQuantity },
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Get user's permanent trainer upgrades
app.get('/api/player/upgrades', async (c) => {
  try {
    const user_id = c.req.query('user_id');

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const { results } = await c.env.DB.prepare(
      'SELECT upgrade_id, level FROM user_upgrades WHERE user_id = ?'
    ).bind(user_id).all();
    const upgrades = (results || []).reduce((acc, upgrade) => {
      acc[upgrade.upgrade_id] = upgrade.level;
      return acc;
    }, {});

    return c.json({ user_id, upgrades });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Purchase a permanent trainer upgrade with persisted wallet coins
app.post('/api/upgrades/purchase', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, upgrade_id } = data;

    if (!user_id || !upgrade_id) {
      return c.json({ error: 'user_id and upgrade_id are required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const wallet = await getPlayerWallet(c.env.DB, user_id);
    const { results: existingUpgrades } = await c.env.DB.prepare(
      'SELECT upgrade_id, level FROM user_upgrades WHERE user_id = ? AND upgrade_id = ?'
    ).bind(user_id, upgrade_id).all();
    const existingUpgrade = existingUpgrades?.[0] || null;
    const preview = previewUpgradePurchase({
      wallet,
      upgrades: { [upgrade_id]: existingUpgrade?.level || 0 },
      upgradeId: upgrade_id,
    });

    if (!preview.ok) {
      return c.json({ error: preview.reason }, 400);
    }

    await c.env.DB.prepare(
      `UPDATE player_wallet
       SET coins = ?, shards = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(preview.wallet.coins, preview.wallet.shards, user_id).run();

    if (existingUpgrade) {
      await c.env.DB.prepare(
        `UPDATE user_upgrades
         SET level = ?, updated_at = datetime('now')
         WHERE user_id = ? AND upgrade_id = ?`
      ).bind(preview.next_level, user_id, upgrade_id).run();
    } else {
      await c.env.DB.prepare(
        'INSERT INTO user_upgrades (user_id, upgrade_id, level) VALUES (?, ?, ?)'
      ).bind(user_id, upgrade_id, preview.next_level).run();
    }

    return c.json({
      success: true,
      upgrade_id,
      current_level: preview.current_level,
      next_level: preview.next_level,
      total_cost: preview.total_cost,
      wallet: { user_id, ...preview.wallet },
      upgrade: { upgrade_id, level: preview.next_level },
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================

// ===== COSMETICS API =====
// Get user's owned cosmetics
app.get('/api/player/cosmetics', async (c) => {
  try {
    const user_id = c.req.query('user_id');

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const { results } = await c.env.DB.prepare(
      'SELECT cosmetic_id, equipped FROM user_cosmetics WHERE user_id = ?'
    ).bind(user_id).all();

    return c.json({
      user_id,
      cosmetics: (results || []).map((cosmetic) => ({
        cosmetic_id: cosmetic.cosmetic_id,
        equipped: Boolean(cosmetic.equipped),
      })),
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Purchase a cosmetic with persisted player wallet currency
app.post('/api/cosmetics/purchase', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, cosmetic_id } = data;

    if (!user_id || !cosmetic_id) {
      return c.json({ error: 'user_id and cosmetic_id are required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const wallet = await getPlayerWallet(c.env.DB, user_id);
    const { results } = await c.env.DB.prepare(
      'SELECT cosmetic_id FROM user_cosmetics WHERE user_id = ?'
    ).bind(user_id).all();
    const ownedCosmetics = (results || []).map((cosmetic) => cosmetic.cosmetic_id);
    const preview = previewCosmeticPurchase({
      wallet,
      ownedCosmetics,
      cosmeticId: cosmetic_id,
    });

    if (!preview.ok) {
      return c.json({ error: preview.reason }, 400);
    }

    await c.env.DB.prepare(
      `UPDATE player_wallet
       SET coins = ?, shards = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(preview.wallet.coins, preview.wallet.shards, user_id).run();

    await c.env.DB.prepare(
      `INSERT INTO user_cosmetics (user_id, cosmetic_id, equipped, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(user_id, cosmetic_id, 0).run();

    return c.json({
      success: true,
      cosmetic_id,
      total_cost: preview.total_cost,
      currency: preview.currency,
      wallet: { user_id, ...preview.wallet },
      cosmetic: { cosmetic_id, equipped: false },
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Equip a persisted owned cosmetic, clearing other cosmetics in the same slot
app.post('/api/cosmetics/equip', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, cosmetic_id } = data;

    if (!user_id || !cosmetic_id) {
      return c.json({ error: 'user_id and cosmetic_id are required' }, 400);
    }

    const cosmetic = getCosmetic(cosmetic_id);
    if (!cosmetic) {
      return c.json({ error: 'Unknown cosmetic.' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const { results } = await c.env.DB.prepare(
      'SELECT cosmetic_id, equipped FROM user_cosmetics WHERE user_id = ?'
    ).bind(user_id).all();
    const ownedCosmetics = results || [];
    const isOwned = ownedCosmetics.some((owned) => owned.cosmetic_id === cosmetic_id);

    if (!isOwned) {
      return c.json({ error: 'Cosmetic is not owned.' }, 400);
    }

    const sameSlotIds = Object.values(COSMETIC_CATALOG)
      .filter((catalogCosmetic) => catalogCosmetic.slot === cosmetic.slot)
      .map((catalogCosmetic) => catalogCosmetic.cosmetic_id);

    for (const sameSlotId of sameSlotIds) {
      await c.env.DB.prepare(
        `UPDATE user_cosmetics
         SET equipped = 0, updated_at = datetime('now')
         WHERE user_id = ? AND cosmetic_id = ?`
      ).bind(user_id, sameSlotId).run();
    }

    await c.env.DB.prepare(
      `UPDATE user_cosmetics
       SET equipped = 1, updated_at = datetime('now')
       WHERE user_id = ? AND cosmetic_id = ?`
    ).bind(user_id, cosmetic_id).run();

    return c.json({
      success: true,
      cosmetic_id,
      slot: cosmetic.slot,
      cosmetic: { cosmetic_id, equipped: true },
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================

// ===== ACHIEVEMENTS API =====
// Get current achievement milestones for the player
app.get('/api/player/achievements', async (c) => {
  try {
    const user_id = c.req.query('user_id');

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const caughtCount = await getCollectionAchievementProgress(c.env.DB, user_id);
    const claimedRows = await listClaimedAchievements(c.env.DB, user_id);
    const claimedIds = new Set(claimedRows.map((achievement) => achievement.achievement_id));
    const claimableIds = new Set(evaluateCollectionAchievements({
      caughtCount,
      claimedAchievementIds: [...claimedIds],
    }).map((achievement) => achievement.achievement_id));

    return c.json({
      user_id,
      progress: { collection: caughtCount },
      achievements: Object.values(ACHIEVEMENT_CATALOG).map((achievement) => ({
        ...achievement,
        progress: caughtCount,
        claimed: claimedIds.has(achievement.achievement_id),
        claimable: claimableIds.has(achievement.achievement_id),
      })),
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Claim a reached achievement once and persist wallet rewards
app.post('/api/achievements/claim', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, achievement_id } = data;

    if (!user_id || !achievement_id) {
      return c.json({ error: 'user_id and achievement_id are required' }, 400);
    }

    const achievement = getAchievement(achievement_id);
    if (!achievement) {
      return c.json({ error: 'Unknown achievement.' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const claimedRows = await listClaimedAchievements(c.env.DB, user_id);
    const claimedIds = claimedRows.map((claimed) => claimed.achievement_id);

    if (claimedIds.includes(achievement_id)) {
      return c.json({ error: 'Achievement already claimed.' }, 400);
    }

    const caughtCount = await getCollectionAchievementProgress(c.env.DB, user_id);
    const claimable = evaluateCollectionAchievements({
      caughtCount,
      claimedAchievementIds: claimedIds,
    }).some((candidate) => candidate.achievement_id === achievement_id);

    if (!claimable) {
      return c.json({ error: 'Achievement is not complete yet.' }, 400);
    }

    const wallet = await addWalletReward(c.env.DB, user_id, achievement.reward);

    await c.env.DB.prepare(
      `INSERT INTO user_achievements (user_id, achievement_id, claimed_at)
       VALUES (?, ?, datetime('now'))`
    ).bind(user_id, achievement_id).run();

    return c.json({
      success: true,
      achievement_id,
      reward: achievement.reward,
      wallet,
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================

// ===== TEAM API - Cross-device persistence =====
// Get user's battle team
app.get('/api/team', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    let query = 'SELECT * FROM team';
    const params = [];
    
    if (user_id) {
      query += ' WHERE user_id = ?';
      params.push(user_id);
    } else {
      // Backward compatibility: legacy data with NULL user_id
      query += ' WHERE user_id IS NULL';
    }
    
    query += ' ORDER BY position ASC';
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results);
  } catch (error) {
    // If table doesn't exist yet, return empty array
    if (error.message.includes('no such table')) {
      return c.json([]);
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Set user's battle team (replaces entire team)
app.post('/api/team', async (c) => {
  try {
    const data = await c.req.json();
    const { team: teamData, user_id = null } = data;
    
    // Use teamData if provided, otherwise treat entire body as team array (backward compatibility)
    const actualTeamData = teamData || data;
    
    // Clear existing team for this user
    let deleteQuery = 'DELETE FROM team';
    const deleteParams = [];
    
    if (user_id) {
      deleteQuery += ' WHERE user_id = ?';
      deleteParams.push(user_id);
    } else {
      deleteQuery += ' WHERE user_id IS NULL';
    }
    
    await c.env.DB.prepare(deleteQuery).bind(...deleteParams).run();
    
    // Insert new team members
    for (let i = 0; i < actualTeamData.length && i < 3; i++) {
      const member = actualTeamData[i];
      const id = uuidv4();
      
      await c.env.DB.prepare(
        `INSERT INTO team (id, user_id, pokemon_id, name, type, power_level, rarity, image_url, maxHP, currentHP, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        user_id,
        member.pokemon_id,
        member.name,
        member.type,
        member.power_level || 0,
        member.rarity || 'Common',
        member.image_url || '',
        member.maxHP || 100,
        member.currentHP || 100,
        i
      ).run();
    }
    
    // Return updated team
    let selectQuery = 'SELECT * FROM team';
    const selectParams = [];
    
    if (user_id) {
      selectQuery += ' WHERE user_id = ?';
      selectParams.push(user_id);
    } else {
      selectQuery += ' WHERE user_id IS NULL';
    }
    
    selectQuery += ' ORDER BY position ASC';
    
    const { results } = await c.env.DB.prepare(selectQuery).bind(...selectParams).all();

    if (user_id) {
      await incrementDailyQuestsForEvent(c.env.DB, user_id, 'healTeam', 1);
    }
    
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Heal entire team
app.patch('/api/team/heal', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    let updateQuery = 'UPDATE team SET currentHP = maxHP';
    const updateParams = [];
    
    if (user_id) {
      updateQuery += ' WHERE user_id = ?';
      updateParams.push(user_id);
    } else {
      updateQuery += ' WHERE user_id IS NULL';
    }
    
    await c.env.DB.prepare(updateQuery).bind(...updateParams).run();
    
    let selectQuery = 'SELECT * FROM team';
    const selectParams = [];
    
    if (user_id) {
      selectQuery += ' WHERE user_id = ?';
      selectParams.push(user_id);
    } else {
      selectQuery += ' WHERE user_id IS NULL';
    }
    
    selectQuery += ' ORDER BY position ASC';
    
    const { results } = await c.env.DB.prepare(selectQuery).bind(...selectParams).all();
    
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Update single team member HP (after battle)
app.patch('/api/team/:pokemonId', async (c) => {
  try {
    const pokemonId = c.req.param('pokemonId');
    const data = await c.req.json();
    const user_id = data.user_id || null;
    
    let updateQuery = 'UPDATE team SET currentHP = ? WHERE pokemon_id = ?';
    const params = [data.currentHP, pokemonId];
    
    if (user_id) {
      updateQuery += ' AND user_id = ?';
      params.push(user_id);
    } else {
      updateQuery += ' AND user_id IS NULL';
    }
    
    await c.env.DB.prepare(updateQuery).bind(...params).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Remove from team
app.delete('/api/team/:pokemonId', async (c) => {
  try {
    const pokemonId = c.req.param('pokemonId');
    const user_id = c.req.query('user_id');
    
    let deleteQuery = 'DELETE FROM team WHERE pokemon_id = ?';
    const params = [pokemonId];
    
    if (user_id) {
      deleteQuery += ' AND user_id = ?';
      params.push(user_id);
    } else {
      deleteQuery += ' AND user_id IS NULL';
    }
    
    await c.env.DB.prepare(deleteQuery).bind(...params).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ================================================

// ===== DAILY QUESTS API =====
const listDailyQuests = async (c) => {
  try {
    const user_id = c.req.query('user_id');
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);

    const today = new Date().toISOString().slice(0, 10);

    let { results } = await c.env.DB.prepare(
      'SELECT * FROM daily_quests WHERE user_id = ? AND quest_date = ? ORDER BY created_at ASC'
    ).bind(user_id, today).all();

    if (results.length === 0) {
      const trainerLevel = await getTrainerLevel(c.env.DB, user_id);
      const bonusTaskSlots = await getDailyTaskSlotUpgradeLevel(c.env.DB, user_id);
      const templates = getDailyQuestTemplatesForDate(trainerLevel, today, bonusTaskSlots);

      for (const template of templates) {
        await c.env.DB.prepare(
          `INSERT INTO daily_quests (id, user_id, quest_date, template_key, title, description, target, progress, reward_xp, reward_item_id, reward_item_quantity)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
           ON CONFLICT(user_id, quest_date, template_key) DO NOTHING`
        ).bind(
          uuidv4(),
          user_id,
          today,
          template.key,
          template.title,
          template.description,
          template.target,
          template.reward_xp,
          template.reward_item_id,
          template.reward_item_quantity
        ).run();
      }

      ({ results } = await c.env.DB.prepare(
        'SELECT * FROM daily_quests WHERE user_id = ? AND quest_date = ? ORDER BY created_at ASC'
      ).bind(user_id, today).all());
    }

    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

const updateDailyQuestProgress = async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const { amount = 1, user_id } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM daily_quests WHERE id = ? AND user_id = ?'
    ).bind(id, user_id).all();

    if (results.length === 0) {
      return c.json({ error: 'Quest not found' }, 404);
    }

    const quest = results[0];
    const safeAmount = Math.max(0, amount);
    const newProgress = Math.min(quest.target, quest.progress + safeAmount);
    const isCompleted = newProgress >= quest.target;

    await c.env.DB.prepare(
      `UPDATE daily_quests
       SET progress = ?,
           completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN datetime('now') ELSE completed_at END
       WHERE id = ?`
    ).bind(newProgress, isCompleted ? 1 : 0, id).run();

    const { results: updated } = await c.env.DB.prepare(
      'SELECT * FROM daily_quests WHERE id = ?'
    ).bind(id).all();

    return c.json(updated[0]);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

const claimDailyQuest = async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const { user_id } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM daily_quests WHERE id = ? AND user_id = ?'
    ).bind(id, user_id).all();

    if (results.length === 0) {
      return c.json({ error: 'Quest not found' }, 404);
    }

    const quest = results[0];

    if (!quest.completed_at) {
      return c.json({ error: 'Quest not complete' }, 400);
    }

    if (quest.claimed_at) {
      return c.json({ error: 'Quest already claimed' }, 400);
    }

    await c.env.DB.prepare(
      'UPDATE daily_quests SET claimed_at = datetime(\'now\') WHERE id = ?'
    ).bind(id).run();

    const { results: updated } = await c.env.DB.prepare(
      'SELECT * FROM daily_quests WHERE id = ?'
    ).bind(id).all();

    const today = updated[0].quest_date;
    const { results: todaysQuests } = await c.env.DB.prepare(
      'SELECT * FROM daily_quests WHERE user_id = ? AND quest_date = ? ORDER BY created_at ASC'
    ).bind(user_id, today).all();
    const dailyStreak = await applyDailyQuestStreakAfterClaim(
      c.env.DB,
      user_id,
      todaysQuests,
      today
    );

    return c.json({ ...updated[0], daily_streak: dailyStreak });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

const claimAllDailyQuests = async (c) => {
  try {
    const data = await c.req.json();
    const { user_id } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const today = new Date().toISOString().slice(0, 10);

    const { results: claimable } = await c.env.DB.prepare(
      `SELECT id FROM daily_quests
       WHERE user_id = ?
         AND quest_date = ?
         AND completed_at IS NOT NULL
         AND claimed_at IS NULL`
    ).bind(user_id, today).all();

    if (claimable.length === 0) {
      return c.json({ claimed: [], claimedCount: 0 });
    }

    await c.env.DB.prepare(
      `UPDATE daily_quests
       SET claimed_at = datetime('now')
       WHERE user_id = ?
         AND quest_date = ?
         AND completed_at IS NOT NULL
         AND claimed_at IS NULL`
    ).bind(user_id, today).run();

    const placeholders = claimable.map(() => '?').join(', ');
    const claimIds = claimable.map((quest) => quest.id);

    const { results: updated } = await c.env.DB.prepare(
      `SELECT * FROM daily_quests WHERE id IN (${placeholders})`
    ).bind(...claimIds).all();

    const { results: todaysQuests } = await c.env.DB.prepare(
      'SELECT * FROM daily_quests WHERE user_id = ? AND quest_date = ? ORDER BY created_at ASC'
    ).bind(user_id, today).all();
    const dailyStreak = await applyDailyQuestStreakAfterClaim(
      c.env.DB,
      user_id,
      todaysQuests,
      today
    );

    // A fully claimed day counts as one weekly 'daily-quests-completed' mission step.
    const allClaimedToday = (todaysQuests || []).length > 0
      && todaysQuests.every((quest) => Boolean(quest.claimed_at));
    if (allClaimedToday) {
      try {
        await incrementWeeklyMissionProgress(c.env.DB, user_id, 'daily-quests-completed', 1);
      } catch {
        // best-effort
      }
    }

    return c.json({ claimed: updated, claimedCount: updated.length, daily_streak: dailyStreak });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

app.get('/api/quests/daily', listDailyQuests);
app.get('/api/daily-quests', listDailyQuests);
app.post('/api/quests/daily/:id/progress', updateDailyQuestProgress);
app.post('/api/daily-quests/:id/progress', updateDailyQuestProgress);
app.post('/api/quests/daily/:id/claim', claimDailyQuest);
app.post('/api/daily-quests/:id/claim', claimDailyQuest);
app.post('/api/quests/daily/claim-all', claimAllDailyQuests);
app.post('/api/daily-quests/claim-all', claimAllDailyQuests);

// ===== WEEKLY MISSIONS API (Phase 4: Live Ops & Retention) =====
const getWorkerWeekKey = () => getWeekKey();

const listWeeklyMissionsRoute = async (c) => {
  try {
    const user_id = c.req.query('user_id');
    if (!user_id) return c.json({ error: 'user_id is required' }, 400);

    await ensureUserExists(c.env.DB, user_id);
    const missions = await ensureWeeklyMissions(c.env.DB, user_id);
    return c.json({ week_key: getWorkerWeekKey(), missions });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

const updateWeeklyMissionProgressRoute = async (c) => {
  try {
    const data = await c.req.json().catch(() => ({}));
    const user_id = c.req.query('user_id') || data?.user_id;
    if (!user_id) return c.json({ error: 'user_id is required' }, 400);

    const amount = Number(data?.amount) || 1;
    const result = await incrementWeeklyMissionProgress(c.env.DB, user_id, data?.event, amount);
    return c.json(result.updated);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

const claimWeeklyMissionsRoute = async (c) => {
  try {
    const data = await c.req.json().catch(() => ({}));
    const user_id = c.req.query('user_id') || data?.user_id;
    if (!user_id) return c.json({ error: 'user_id is required' }, 400);

    await ensureUserExists(c.env.DB, user_id);
    const result = await claimWeeklyMissionRewards(
      c.env.DB,
      user_id,
      undefined,
      async (xp) => { await grantPlayerXpReward(c.env.DB, user_id, xp); },
      async (reward) => addWalletReward(c.env.DB, user_id, reward),
      async (itemId, quantity) => { await grantUserItem(c.env.DB, user_id, itemId, quantity); }
    );
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

app.get('/api/weekly-missions', listWeeklyMissionsRoute);
app.post('/api/weekly-missions/progress', updateWeeklyMissionProgressRoute);
app.post('/api/weekly-missions/claim-all', claimWeeklyMissionsRoute);

// ===== COLLECTION MASTERY API (Phase 4: Live Ops & Retention) =====
app.get('/api/mastery', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    if (!user_id) return c.json({ error: 'user_id is required' }, 400);

    await ensureUserExists(c.env.DB, user_id);
    return c.json(await getMasteryStatus(c.env.DB, user_id));
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/mastery/claim', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, tier_id } = data;
    if (!user_id || !tier_id) {
      return c.json({ error: 'user_id and tier_id are required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const result = await claimMasteryTier(
      c.env.DB,
      user_id,
      tier_id,
      async (reward) => addWalletReward(c.env.DB, user_id, reward)
    );

    if (result.error) return c.json({ error: result.error }, 400);
    return c.json(result);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// ===== CHALLENGE TOWER API =====
const ensureTowerProgress = async (db, userId) => {
  if (!userId) return null;
  await db.prepare(
    `INSERT INTO challenge_tower_progress (user_id, current_floor, best_floor, last_completed_floor, updated_at)
     VALUES (?, 1, 1, 0, datetime('now'))
     ON CONFLICT(user_id) DO NOTHING`
  ).bind(userId).run();

  const { results } = await db.prepare(
    'SELECT * FROM challenge_tower_progress WHERE user_id = ?'
  ).bind(userId).all();

  return results[0] || null;
};

app.get('/api/tower', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const progress = await ensureTowerProgress(c.env.DB, user_id);
    const maxFloor = CHALLENGE_TOWER_FLOORS.length;
    const isComplete = progress.current_floor > maxFloor;
    const currentFloorNumber = isComplete ? null : progress.current_floor;
    const currentFloor = currentFloorNumber
      ? CHALLENGE_TOWER_FLOORS.find((floor) => floor.floor === currentFloorNumber) || null
      : null;

    return c.json({
      progress,
      floors: CHALLENGE_TOWER_FLOORS,
      current_floor: currentFloor,
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/tower/complete', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, floor } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const maxFloor = CHALLENGE_TOWER_FLOORS.length;
    const floorNumber = Number(floor);

    if (!Number.isInteger(floorNumber) || floorNumber < 1 || floorNumber > maxFloor) {
      return c.json({ error: 'Invalid floor' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const progress = await ensureTowerProgress(c.env.DB, user_id);

    if (!progress) {
      return c.json({ error: 'Progress not found' }, 404);
    }

    if (progress.current_floor > maxFloor) {
      return c.json({ error: 'Tower already complete' }, 400);
    }

    if (floorNumber !== progress.current_floor) {
      return c.json({ error: 'Floor not available' }, 400);
    }

    const nextFloor = Math.min(floorNumber + 1, maxFloor + 1);
    const bestFloor = Math.max(progress.best_floor, floorNumber);

    await c.env.DB.prepare(
      `UPDATE challenge_tower_progress
       SET current_floor = ?,
           best_floor = ?,
           last_completed_floor = ?,
           last_completed_at = datetime('now'),
           updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(nextFloor, bestFloor, floorNumber, user_id).run();

    const { results: updated } = await c.env.DB.prepare(
      'SELECT * FROM challenge_tower_progress WHERE user_id = ?'
    ).bind(user_id).all();

    await incrementDailyQuestsForEvent(c.env.DB, user_id, 'towerFloorComplete', 1);
    await incrementWeeklyMissionsForEvent(c.env.DB, user_id, 'towerFloorComplete', 1);

    const updatedProgress = updated[0];
    const isComplete = updatedProgress.current_floor > maxFloor;
    const currentFloorNumber = isComplete ? null : updatedProgress.current_floor;
    const currentFloor = currentFloorNumber
      ? CHALLENGE_TOWER_FLOORS.find((floor) => floor.floor === currentFloorNumber) || null
      : null;

    return c.json({
      progress: updatedProgress,
      floors: CHALLENGE_TOWER_FLOORS,
      current_floor: currentFloor,
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ================================================

// ===== LEADERBOARDS API =====
const isLeaderboardsEnabled = (c) => c.env?.FEATURE_LEADERBOARDS === 'true';

const buildLeaderboardEntries = async (db, leaderboardKey, limit) => {
  let query = '';
  let formatter = (row) => ({
    user_id: row.user_id,
    score: row.score,
    detail: row.detail,
  });

  if (leaderboardKey === 'caught') {
    query = `
      SELECT user_id, COUNT(*) as total
      FROM caught_pokemon
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      ORDER BY total DESC
      LIMIT ?
    `;
    formatter = (row) => ({
      user_id: row.user_id,
      score: row.total,
      detail: { caught: row.total },
    });
  } else if (leaderboardKey === 'tower') {
    query = `
      SELECT user_id, best_floor
      FROM challenge_tower_progress
      WHERE user_id IS NOT NULL
      ORDER BY best_floor DESC
      LIMIT ?
    `;
    formatter = (row) => ({
      user_id: row.user_id,
      score: row.best_floor,
      detail: { best_floor: row.best_floor },
    });
  } else if (leaderboardKey === 'pvp') {
    query = `
      WITH pvp_participants AS (
        SELECT player_user_id as user_id,
               outcome as result
        FROM pvp_matches
        WHERE player_user_id IS NOT NULL
        UNION ALL
        SELECT opponent_user_id as user_id,
               CASE
                 WHEN outcome = 'win' THEN 'loss'
                 WHEN outcome = 'loss' THEN 'win'
                 ELSE outcome
               END as result
        FROM pvp_matches
        WHERE opponent_user_id IS NOT NULL
      )
      SELECT user_id,
             SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
             SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses,
             SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws
      FROM pvp_participants
      GROUP BY user_id
      ORDER BY wins DESC, draws DESC, losses ASC
      LIMIT ?
    `;
    formatter = (row) => ({
      user_id: row.user_id,
      score: row.wins,
      detail: {
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
      },
    });
  } else {
    query = `
      SELECT user_id, level, xp
      FROM player_progress
      WHERE user_id IS NOT NULL
      ORDER BY level DESC, xp DESC
      LIMIT ?
    `;
    formatter = (row) => ({
      user_id: row.user_id,
      score: (row.level * 1000000) + row.xp,
      detail: { level: row.level, xp: row.xp },
    });
  }

  const { results } = await db.prepare(query).bind(limit).all();
  return results.map(formatter);
};

const upsertLeaderboardEntries = async (db, leaderboardKey, entries) => {
  for (const entry of entries) {
    await db.prepare(
      `INSERT INTO leaderboard_entries (id, leaderboard_key, user_id, score, detail_json, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(leaderboard_key, user_id) DO UPDATE SET
         score = excluded.score,
         detail_json = excluded.detail_json,
         updated_at = datetime('now')`
    ).bind(
      uuidv4(),
      leaderboardKey,
      entry.user_id,
      entry.score,
      JSON.stringify(entry.detail || {})
    ).run();
  }
};

app.get('/api/leaderboards', async (c) => {
  try {
    if (!isLeaderboardsEnabled(c)) {
      return c.json({ error: 'Not found' }, 404);
    }

    const leaderboardKey = c.req.query('key') || 'level';
    const limitParam = parseInt(c.req.query('limit') || '10', 10);
    const limit = Number.isNaN(limitParam) ? 10 : Math.min(Math.max(limitParam, 1), 50);

    const entries = await buildLeaderboardEntries(c.env.DB, leaderboardKey, limit);

    if (entries.length > 0) {
      await upsertLeaderboardEntries(c.env.DB, leaderboardKey, entries);
    }

    return c.json({
      key: leaderboardKey,
      entries: entries.map((entry, index) => ({
        rank: index + 1,
        ...entry,
      })),
    });
  } catch (error) {
    if (error.message.includes('no such table')) {
      return c.json({ key: c.req.query('key') || 'level', entries: [] });
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ================================================

// ===== CO-OP RAID API =====
app.post('/api/coop-raids', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, team_power, level = 1 } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const teamPower = Number(team_power);
    if (!Number.isFinite(teamPower) || teamPower <= 0) {
      return c.json({ error: 'team_power must be a positive number' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const raid = await createCoopRaidRoom(c.env.DB, {
      raidId: uuidv4(),
      hostUserId: user_id,
      teamPower,
      boss: buildCoopRaidBoss({ level: Number(level) || 1 }),
    });

    return c.json(raid, 201);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/coop-raids/:id/join', async (c) => {
  try {
    const raidId = c.req.param('id');
    const data = await c.req.json();
    const { user_id, team_power } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const teamPower = Number(team_power);
    if (!Number.isFinite(teamPower) || teamPower <= 0) {
      return c.json({ error: 'team_power must be a positive number' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const raid = await joinCoopRaidRoom(c.env.DB, {
      raidId,
      userId: user_id,
      teamPower,
    });

    if (!raid) {
      return c.json({ error: 'Co-op raid not found' }, 404);
    }

    return c.json(raid);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/coop-raids/:id/attack', async (c) => {
  try {
    const raidId = c.req.param('id');
    const data = await c.req.json();
    const { user_id, damage_dealt } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const damageDealt = Number(damage_dealt);
    if (!Number.isFinite(damageDealt) || damageDealt <= 0) {
      return c.json({ error: 'damage_dealt must be a positive number' }, 400);
    }

    const room = await getCoopRaidRoom(c.env.DB, raidId);
    if (!room) {
      return c.json({ error: 'Co-op raid not found' }, 404);
    }
    if (room.raid.status === 'complete') {
      return c.json({ error: 'Co-op raid is already complete' }, 409);
    }
    if (!room.ready) {
      return c.json({ error: 'Co-op raid needs at least two ready trainers before attacking' }, 409);
    }
    if (!room.participants.some((participant) => participant.user_id === user_id)) {
      return c.json({ error: 'Only raid participants can attack this co-op raid' }, 403);
    }

    const attempt = await recordCoopRaidAttempt(c.env.DB, {
      raidId,
      damageDealt,
    });

    const rewards = attempt?.attempt?.rewards || [];
    const progress = [];
    const wallets = [];

    if (attempt?.attempt?.status === 'complete') {
      for (const reward of rewards) {
        const rewardProgress = await grantPlayerXpReward(c.env.DB, reward.user_id, reward.xp);
        const rewardWallet = await grantPlayerCoins(c.env.DB, reward.user_id, reward.coins);

        await incrementWeeklyMissionsForEvent(c.env.DB, reward.user_id, 'raidVictory', 1);

        if (rewardProgress) {
          progress.push({ user_id: reward.user_id, ...rewardProgress });
        }
        if (rewardWallet) {
          wallets.push({ user_id: reward.user_id, ...rewardWallet });
        }
      }
    }

    return c.json({
      ...attempt,
      rewards,
      progress,
      wallets,
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ========================

// ===== PVP API =====
app.post('/api/pvp/queue', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, team_power } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const teamPower = Number(team_power);
    if (!Number.isFinite(teamPower) || teamPower <= 0) {
      return c.json({ error: 'team_power must be a positive number' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    await upsertPvpQueueEntry(c.env.DB, user_id, teamPower);

    const match = await findQueuedPvpOpponent(c.env.DB, user_id, teamPower);
    if (match.matched) {
      const opponentTeam = await getPvpOpponentTeam(c.env.DB, match.opponent.user_id);
      await leavePvpQueue(c.env.DB, user_id);
      await leavePvpQueue(c.env.DB, match.opponent.user_id);
      return c.json({
        queued: false,
        ...match,
        opponent: {
          ...match.opponent,
          team: opponentTeam,
        },
      });
    }

    return c.json({
      queued: true,
      matched: false,
      playerPower: teamPower,
      opponent: null,
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.delete('/api/pvp/queue', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await leavePvpQueue(c.env.DB, user_id);
    return c.json({ queued: false });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.get('/api/pvp/matches', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const limit = Number(c.req.query('limit') || 5);
    const matches = await listPvpMatchHistory(c.env.DB, user_id, limit);
    return c.json({ matches });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/pvp/matches', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, opponent_user_id, player_team = [], opponent_team = [] } = data;

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }
    if (!opponent_user_id) {
      return c.json({ error: 'opponent_user_id is required' }, 400);
    }

    const result = resolvePvpBattleResult({
      playerTeam: player_team,
      opponentTeam: opponent_team,
    });

    if (result.status !== 'complete') {
      return c.json({ error: 'PvP match is still in progress' }, 409);
    }

    const winnerUserId = result.winner === 'player'
      ? user_id
      : result.winner === 'opponent'
        ? opponent_user_id
        : null;

    const match = await recordPvpMatchResult(c.env.DB, {
      player_user_id: user_id,
      opponent_user_id,
      outcome: result.outcome,
      winner_user_id: winnerUserId,
      player_remaining_pokemon: result.playerRemainingPokemon,
      opponent_remaining_pokemon: result.opponentRemainingPokemon,
    });

    const rewards = calculatePvpRewards(result.outcome);
    const progress = await grantPlayerXpReward(c.env.DB, user_id, rewards.xp);
    const wallet = await grantPlayerCoins(c.env.DB, user_id, rewards.coins);

    if (result.winner === 'player') {
      await incrementWeeklyMissionsForEvent(c.env.DB, user_id, 'battleWin', 1);
    }

    return c.json({
      match,
      rewards,
      progress,
      wallet,
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================

// ===== EVOLUTION API =====
const getTrainerLevel = async (db, userId) => {
  const { results } = await db.prepare(
    'SELECT level FROM player_progress WHERE user_id = ?'
  ).bind(userId).all();

  return results.length > 0 ? results[0].level : 1;
};

const listEvolutionOptions = async (c) => {
  try {
    const user_id = c.req.query('user_id');
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);

    const trainerLevel = await getTrainerLevel(c.env.DB, user_id);

    const { results } = await c.env.DB.prepare(
      `SELECT
         c.id AS caught_id,
         p.id AS from_id,
         p.name AS from_name,
         p.type AS from_type,
         p.image_url AS from_image_url,
         p.rarity AS from_rarity,
         p.power_level AS from_power_level,
         e.to_name AS to_name,
         e.min_trainer_level AS min_trainer_level,
         tp.id AS to_id,
         tp.type AS to_type,
         tp.image_url AS to_image_url,
         tp.rarity AS to_rarity,
         tp.power_level AS to_power_level
       FROM caught_pokemon c
       JOIN pokemon p ON c.pokemon_id = p.id
       JOIN pokemon_evolutions e ON e.from_name = p.name
       JOIN pokemon tp ON tp.name = e.to_name
       WHERE c.user_id = ?
       ORDER BY c.caught_date DESC`
    ).bind(user_id).all();

    const options = results.map((row) => ({
      caught_id: row.caught_id,
      required_level: row.min_trainer_level,
      can_evolve: trainerLevel >= row.min_trainer_level,
      from: {
        id: row.from_id,
        name: row.from_name,
        type: row.from_type,
        image_url: row.from_image_url,
        rarity: row.from_rarity,
        power_level: row.from_power_level,
      },
      to: {
        id: row.to_id,
        name: row.to_name,
        type: row.to_type,
        image_url: row.to_image_url,
        rarity: row.to_rarity,
        power_level: row.to_power_level,
      },
    }));

    return c.json(options);
  } catch (error) {
    if (error.message.includes('no such table')) {
      return c.json([]);
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

const evolvePokemon = async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, caught_id } = data;

    if (!user_id || !caught_id) {
      return c.json({ error: 'user_id and caught_id are required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);

    const trainerLevel = await getTrainerLevel(c.env.DB, user_id);

    const { results } = await c.env.DB.prepare(
      `SELECT
         c.id AS caught_id,
         c.pokemon_id AS from_id,
         p.name AS from_name,
         p.type AS from_type,
         p.image_url AS from_image_url,
         p.rarity AS from_rarity,
         p.power_level AS from_power_level,
         e.to_name AS to_name,
         e.min_trainer_level AS min_trainer_level,
         tp.id AS to_id,
         tp.type AS to_type,
         tp.image_url AS to_image_url,
         tp.rarity AS to_rarity,
         tp.power_level AS to_power_level
       FROM caught_pokemon c
       JOIN pokemon p ON c.pokemon_id = p.id
       JOIN pokemon_evolutions e ON e.from_name = p.name
       JOIN pokemon tp ON tp.name = e.to_name
       WHERE c.id = ? AND c.user_id = ?
       LIMIT 1`
    ).bind(caught_id, user_id).all();

    if (results.length === 0) {
      return c.json({ error: 'Evolution not available' }, 404);
    }

    const evolution = results[0];

    if (trainerLevel < evolution.min_trainer_level) {
      return c.json({ error: `Requires trainer level ${evolution.min_trainer_level}` }, 400);
    }

    await c.env.DB.prepare(
      'UPDATE caught_pokemon SET pokemon_id = ? WHERE id = ?'
    ).bind(evolution.to_id, caught_id).run();

    const { results: teamRows } = await c.env.DB.prepare(
      'SELECT * FROM team WHERE user_id = ? AND pokemon_id = ?'
    ).bind(user_id, evolution.from_id).all();

    let updatedTeamCount = 0;

    for (const row of teamRows) {
      const newMaxHP = getMaxHP({ power_level: evolution.to_power_level || 10 });
      const ratio = row.maxHP > 0 ? row.currentHP / row.maxHP : 1;
      const newCurrentHP = Math.max(0, Math.round(newMaxHP * ratio));

      await c.env.DB.prepare(
        `UPDATE team
         SET pokemon_id = ?,
             name = ?,
             type = ?,
             power_level = ?,
             rarity = ?,
             image_url = ?,
             maxHP = ?,
             currentHP = ?
         WHERE id = ?`
      ).bind(
        evolution.to_id,
        evolution.to_name,
        evolution.to_type,
        evolution.to_power_level,
        evolution.to_rarity,
        evolution.to_image_url,
        newMaxHP,
        newCurrentHP,
        row.id
      ).run();

      updatedTeamCount += 1;
    }

    await incrementDailyQuestsForEvent(c.env.DB, user_id, 'evolvePokemon', 1);
    await incrementWeeklyMissionsForEvent(c.env.DB, user_id, 'evolvePokemon', 1);

    return c.json({
      success: true,
      caught_id,
      evolved_to: {
        id: evolution.to_id,
        name: evolution.to_name,
        type: evolution.to_type,
        image_url: evolution.to_image_url,
        rarity: evolution.to_rarity,
        power_level: evolution.to_power_level,
      },
      team_updated: updatedTeamCount,
    });
  } catch (error) {
    if (error.message.includes('no such table')) {
      return c.json({ error: 'Evolution not available' }, 404);
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
};

app.get('/api/evolution/options', listEvolutionOptions);
app.post('/api/evolution/evolve', evolvePokemon);
// ================================================

// ===== BOSS CLEAR PROGRESSION API =====
app.get('/api/boss-clears', async (c) => {
  try {
    const user_id = c.req.query('user_id');

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const clears = await listBossClears(c.env.DB, user_id);
    return c.json(clears);
  } catch (error) {
    if (error.message.includes('no such table')) {
      return c.json([]);
    }
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.post('/api/boss-clears', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, boss_key, name } = data;

    if (!user_id || !boss_key || !name) {
      return c.json({ error: 'user_id, boss_key, and name are required' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const clear = await recordBossClear(c.env.DB, user_id, data);
    return c.json(clear);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================

// ===== POKEMON CREATOR - AI GENERATION =====
// Generate a Pokemon using AI
app.post('/api/pokemon/generate', async (c) => {
  try {
    const data = await c.req.json();
    const { name, type, description, style = 'anime' } = data;
    
    if (!name || !type) {
      return c.json({ error: 'Name and type are required' }, 400);
    }

    // Build prompt for AI image generation
    const typeColors = {
      Fire: 'warm orange and red flames',
      Water: 'blue aquatic waves and bubbles',
      Grass: 'green leaves and nature',
      Electric: 'yellow lightning sparks',
      Psychic: 'pink and purple mystical energy',
      Ice: 'icy blue and white crystals',
      Dragon: 'powerful scales and wings',
      Fairy: 'sparkling pink and rainbow magic',
      Rock: 'earthy brown stones',
      Flying: 'white clouds and sky blue',
      Normal: 'soft beige tones',
      Fighting: 'intense red and orange',
      Poison: 'deep purple toxic glow',
      Ground: 'sand brown and earth',
      Bug: 'green insect features',
      Ghost: 'ethereal purple mist',
      Steel: 'metallic silver shine',
      Dark: 'shadowy black and purple'
    };

    const colorTheme = typeColors[type] || 'vibrant colors';
    const prompt = `A cute cartoon Pokemon-style creature named "${name}", ${type}-type, ${description || 'a mysterious creature'}. ${colorTheme}. ${style === 'anime' ? 'Anime art style, clean lines, cel shaded, vibrant colors' : 'Pixel art style, retro 16-bit game aesthetic'}. White background. High quality, cute and friendly appearance.`;

    // Use Cloudflare AI to generate image (Workers AI binding)
    if (c.env.AI) {
      try {
        const response = await c.env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
          prompt,
        });
        
        if (response && response.dataUrl) {
          return c.json({ 
            success: true, 
            image_url: response.dataUrl,
            generated: true,
            prompt
          });
        }
      } catch (aiError) {
        console.log('AI generation failed, using fallback:', aiError);
      }
    }

    // Fallback to dicebear avatar if AI generation fails or not available
    const typeColorsHex = {
      Fire: 'ff6b6b', Water: '4ecdc4', Grass: '7ee787', Electric: 'ffe066',
      Psychic: 'f0bbdd', Ice: 'a8e6cf', Dragon: 'b8c5d6', Fairy: 'ffd3e1',
      Rock: 'd4a373', Flying: '87ceeb', Normal: 'e0e0e0', Fighting: 'ff8c42',
      Poison: '9d4edd', Ground: 'd4a373', Bug: '7ee787', Ghost: 'c77dff',
      Steel: 'adb5bd', Dark: '343a40'
    };
    const bgColor = typeColorsHex[type] || '6c757d';
    const fallbackImage = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bgColor}`;
    
    return c.json({ 
      success: true, 
      image_url: fallbackImage,
      fallback: true,
      prompt
    });
  } catch (error) {
    console.error('Generation error:', error);
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Create generated Pokemon and save to database
app.post('/api/pokemon/generated', async (c) => {
  try {
    const data = await c.req.json();
    const { name, type, description, image_url, power_level = 50, user_id = null } = data;
    
    if (!name || !type || !image_url) {
      return c.json({ error: 'Name, type, and image_url are required' }, 400);
    }

    const id = uuidv4();
    const rarity = data.rarity || 'Generated';
    
    await c.env.DB.prepare(
      `INSERT INTO pokemon (id, name, type, description, image_url, rarity, power_level) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, name, type, description, image_url, rarity, power_level
    ).run();

    // Auto-catch the generated Pokemon
    const caughtId = uuidv4();
    await c.env.DB.prepare(
      `INSERT INTO caught_pokemon (id, pokemon_id, user_id, caught_date) VALUES (?, ?, ?, datetime('now'))`
    ).bind(caughtId, id, user_id).run();

    return c.json({ 
      success: true, 
      pokemon: { id, name, type, description, image_url, rarity, power_level },
      caught_id: caughtId
    }, 201);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ===========================================

// ===== ITEMS API =====
// Get user's items
app.get('/api/items', async (c) => {
  try {
    const user_id = c.req.query('user_id');
    
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }
    
    const { results } = await c.env.DB.prepare(
      'SELECT item_id, quantity FROM user_items WHERE user_id = ? AND quantity > 0'
    ).bind(user_id).all();
    
    return c.json(results);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Add items to inventory
app.post('/api/items', async (c) => {
  try {
    const data = await c.req.json();
    const { item_id, quantity = 1, user_id } = data;
    
    if (!user_id || !item_id) {
      return c.json({ error: 'user_id and item_id are required' }, 400);
    }
    
    // Check if item exists
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id, quantity FROM user_items WHERE user_id = ? AND item_id = ?'
    ).bind(user_id, item_id).all();
    
    if (existing.length > 0) {
      // Update quantity
      const newQty = existing[0].quantity + quantity;
      await c.env.DB.prepare(
        'UPDATE user_items SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).bind(newQty, existing[0].id).run();
      
      return c.json({ success: true, item_id, quantity: newQty });
    }
    
    // Create new item
    const id = uuidv4();
    await c.env.DB.prepare(
      'INSERT INTO user_items (id, user_id, item_id, quantity) VALUES (?, ?, ?, ?)'
    ).bind(id, user_id, item_id, quantity).run();
    
    return c.json({ success: true, item_id, quantity }, 201);
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Use an item (decrement quantity)
app.post('/api/items/:itemId/use', async (c) => {
  try {
    const item_id = c.req.param('itemId');
    const data = await c.req.json();
    const { user_id } = data;
    
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }
    
    // Get current quantity
    const { results } = await c.env.DB.prepare(
      'SELECT id, quantity FROM user_items WHERE user_id = ? AND item_id = ?'
    ).bind(user_id, item_id).all();
    
    if (results.length === 0 || results[0].quantity <= 0) {
      return c.json({ error: 'Item not available' }, 400);
    }
    
    const newQty = results[0].quantity - 1;
    
    await c.env.DB.prepare(
      'UPDATE user_items SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(newQty, results[0].id).run();
    
    return c.json({ success: true, item_id, quantity: newQty });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

// Set item quantity
app.put('/api/items/:itemId', async (c) => {
  try {
    const item_id = c.req.param('itemId');
    const data = await c.req.json();
    const { quantity, user_id } = data;
    
    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }
    
    // Check if item exists
    const { results: existing } = await c.env.DB.prepare(
      'SELECT id FROM user_items WHERE user_id = ? AND item_id = ?'
    ).bind(user_id, item_id).all();
    
    if (existing.length > 0) {
      await c.env.DB.prepare(
        'UPDATE user_items SET quantity = ?, updated_at = datetime(\'now\') WHERE id = ?'
      ).bind(quantity, existing[0].id).run();
    } else {
      const id = uuidv4();
      await c.env.DB.prepare(
        'INSERT INTO user_items (id, user_id, item_id, quantity) VALUES (?, ?, ?, ?)'
      ).bind(id, user_id, item_id, quantity).run();
    }
    
    return c.json({ success: true, item_id, quantity });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================

// ===== KPI METRICS API =====
app.post('/api/player/sessions', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, started_at, ended_at } = data;

    if (!user_id || !started_at || !ended_at) {
      return c.json({ error: 'user_id, started_at, and ended_at are required' }, 400);
    }

    const startedAt = new Date(started_at).getTime();
    const endedAt = new Date(ended_at).getTime();

    if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt) || endedAt < startedAt) {
      return c.json({ error: 'Session timestamps are invalid' }, 400);
    }

    await ensureUserExists(c.env.DB, user_id);
    const id = uuidv4();

    await c.env.DB.prepare(
      `INSERT INTO user_sessions (id, user_id, started_at, ended_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(id, user_id, started_at, ended_at).run();

    return c.json({
      success: true,
      id,
      user_id,
      started_at,
      ended_at,
    });
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});

app.get('/api/metrics/kpis', async (c) => {
  try {
    const now = c.req.query('now') || new Date().toISOString();

    const [{ results: users }, { results: progressRows }, { results: bossClearRows }, { results: sessionRows }] = await Promise.all([
      c.env.DB.prepare('SELECT id, created_at, last_active_at FROM users').bind().all(),
      c.env.DB.prepare('SELECT user_id, level FROM player_progress WHERE user_id IS NOT NULL').bind().all(),
      c.env.DB.prepare('SELECT user_id, boss_key FROM boss_clears').bind().all(),
      c.env.DB.prepare('SELECT user_id, started_at, ended_at FROM user_sessions WHERE ended_at IS NOT NULL').bind().all(),
    ]);

    return c.json(buildKpiSnapshot({
      users,
      progressRows,
      bossClearRows: (bossClearRows || []).map(mapBossClearToKpiRow),
      sessionRows,
      now,
    }));
  } catch (error) {
    return c.json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
// ====================

// Serve static assets for non-API routes (must be last)
app.all('*', async (c) => {
  // Return 404 for unmatched API routes
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not found' }, 404);
  }
  // For non-API routes, the frontend handles routing
  return c.html('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pokemon App</title><script type="module" src="/src/main.jsx"></script></head><body><div id="root"></div></body></html>');
});

export default app;
