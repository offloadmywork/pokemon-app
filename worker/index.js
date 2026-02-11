// Pokemon App API - Cloudflare Workers with Hono
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

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
      SELECT 
        c.id,
        c.pokemon_id,
        c.caught_date,
        c.nickname,
        p.name,
        p.type,
        p.description,
        p.image_url,
        p.rarity,
        p.power_level
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

export default app;
