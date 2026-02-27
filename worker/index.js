// Pokemon App API - Cloudflare Workers with Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';
import { buildChallengeTowerFloors, CHALLENGE_TOWER_MAX_FLOORS } from '../src/game/challengeTower.js';

const app = new Hono();

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

const DAILY_QUEST_TEMPLATES = [
  {
    key: 'catch-1',
    title: 'Catch 1 Pokémon',
    description: 'Catch a Pokémon today',
    target: 1,
    reward_xp: 25,
    reward_item_id: 'pokeball',
    reward_item_quantity: 1,
  },
  {
    key: 'battle-1',
    title: 'Win 1 Battle',
    description: 'Win a battle today',
    target: 1,
    reward_xp: 40,
    reward_item_id: 'potion',
    reward_item_quantity: 1,
  },
  {
    key: 'use-item',
    title: 'Use 1 Item',
    description: 'Use an item from your inventory',
    target: 1,
    reward_xp: 20,
    reward_item_id: null,
    reward_item_quantity: 0,
  },
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

// Enable CORS
app.use('/api/*', cors());

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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }
});

// Get a random Pokemon (optionally filtered by rarity)
app.get('/api/pokemon/random/get', async (c) => {
  try {
    const rarity = c.req.query('rarity');
    
    let query = 'SELECT * FROM pokemon';
    const params = [];
    
    if (rarity) {
      query += ' WHERE rarity = ?';
      params.push(rarity);
    }
    
    query += ' ORDER BY RANDOM() LIMIT 1';
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    if (results.length === 0) {
      return c.json({ error: 'No Pokemon found' }, 404);
    }
    
    return c.json(results[0]);
  } catch (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }
});

// Catch a Pokemon
app.post('/api/caught', async (c) => {
  try {
    const data = await c.req.json();
    const id = uuidv4();
    
    await c.env.DB.prepare(
      `INSERT INTO caught_pokemon (id, pokemon_id, user_id, nickname) 
       VALUES (?, ?, ?, ?)`
    ).bind(
      id,
      data.pokemon_id,
      data.user_id || null,
      data.nickname || null
    ).run();
    
    return c.json({ id, ...data }, 201);
  } catch (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }
});

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
    return c.json({ error: error.message }, 500);
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
        // Insert new
        await c.env.DB.prepare(
          `INSERT INTO player_progress (id, user_id, xp, level, updated_at) 
           VALUES (?, ?, ?, ?, datetime('now'))`
        ).bind(uuidv4(), user_id, xp, level).run();
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
    return c.json({ error: error.message }, 500);
  }
});
// ================================================

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
    return c.json({ error: error.message }, 500);
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
    
    return c.json(results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
      for (const template of DAILY_QUEST_TEMPLATES) {
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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

    return c.json(updated[0]);
  } catch (error) {
    return c.json({ error: error.message }, 500);
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

    return c.json({ claimed: updated, claimedCount: updated.length });
  } catch (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }
});
// ================================================

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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
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
