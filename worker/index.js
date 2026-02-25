// Pokemon App API - Cloudflare Workers with Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';

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
    
    if (existing.length > 0) {
      // Update last_active_at
      await c.env.DB.prepare(
        'UPDATE users SET last_active_at = datetime(\'now\') WHERE id = ?'
      ).bind(user_id).run();
      
      return c.json({
        user_id: existing[0].id,
        created_at: existing[0].created_at,
        last_active_at: existing[0].last_active_at,
        existing: true
      });
    }
    
    // Create new user
    await c.env.DB.prepare(
      'INSERT INTO users (id, created_at, last_active_at) VALUES (?, datetime(\'now\'), datetime(\'now\'))'
    ).bind(user_id).run();
    
    return c.json({
      user_id,
      existing: false
    }, 201);
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

// Serve static assets for non-API routes
app.all('*', async (c) => {
  const asset = c.env.ASSETS;
  if (asset) {
    return asset.fetch(c.req.raw);
  }
  return c.notFound();
});

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

export default app;
