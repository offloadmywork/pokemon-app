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
    const { results } = await c.env.DB.prepare(`
      SELECT c.id, c.pokemon_id, c.caught_date, c.nickname, 
             p.name, p.type, p.description, p.image_url, p.rarity, p.power_level
      FROM caught_pokemon c
      JOIN pokemon p ON c.pokemon_id = p.id
      ORDER BY c.caught_date DESC
    `).all();
    
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
      `INSERT INTO caught_pokemon (id, pokemon_id, nickname) 
       VALUES (?, ?, ?)`
    ).bind(
      id,
      data.pokemon_id,
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
    // Check if user already has Pokemon
    const { results: existing } = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM caught_pokemon'
    ).all();
    
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
        `INSERT INTO caught_pokemon (id, pokemon_id, caught_date) 
         VALUES (?, ?, datetime('now'))`
      ).bind(caughtId, pokemonId).run();
      
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

// ===== TEAM API - Cross-device persistence =====
// Get user's battle team
app.get('/api/team', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM team ORDER BY position ASC'
    ).all();
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
    const teamData = await c.req.json();
    
    // Clear existing team
    await c.env.DB.prepare('DELETE FROM team').run();
    
    // Insert new team members
    for (let i = 0; i < teamData.length && i < 3; i++) {
      const member = teamData[i];
      const id = uuidv4();
      
      await c.env.DB.prepare(
        `INSERT INTO team (id, pokemon_id, name, type, power_level, rarity, image_url, maxHP, currentHP, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
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
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM team ORDER BY position ASC'
    ).all();
    
    return c.json(results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Heal entire team
app.patch('/api/team/heal', async (c) => {
  try {
    await c.env.DB.prepare(
      'UPDATE team SET currentHP = maxHP'
    ).run();
    
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM team ORDER BY position ASC'
    ).all();
    
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
    
    await c.env.DB.prepare(
      'UPDATE team SET currentHP = ? WHERE pokemon_id = ?'
    ).bind(data.currentHP, pokemonId).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Remove from team
app.delete('/api/team/:pokemonId', async (c) => {
  try {
    const pokemonId = c.req.param('pokemonId');
    
    await c.env.DB.prepare(
      'DELETE FROM team WHERE pokemon_id = ?'
    ).bind(pokemonId).run();
    
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
    const { name, type, description, image_url, power_level = 50 } = data;
    
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
      `INSERT INTO caught_pokemon (id, pokemon_id, caught_date) VALUES (?, ?, datetime('now'))`
    ).bind(caughtId, id).run();

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

export default app;
