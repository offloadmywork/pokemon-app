// Pokemon App API - Cloudflare Workers
import { Router } from 'itty-router';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS requests for CORS
router.options('*', () => new Response(null, { headers: corsHeaders }));

// Get all Pokemon
router.get('/api/pokemon', async (request, env) => {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM pokemon ORDER BY created_at DESC'
    ).all();
    
    return jsonResponse(results);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});

// Get a single Pokemon by ID
router.get('/api/pokemon/:id', async (request, env) => {
  try {
    const { id } = request.params;
    const { results } = await env.DB.prepare(
      'SELECT * FROM pokemon WHERE id = ?'
    ).bind(id).all();
    
    if (results.length === 0) {
      return jsonResponse({ error: 'Pokemon not found' }, 404);
    }
    
    return jsonResponse(results[0]);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});

// Create a new Pokemon
router.post('/api/pokemon', async (request, env) => {
  try {
    const data = await request.json();
    const id = uuidv4();
    
    await env.DB.prepare(
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
    
    return jsonResponse({ id, ...data }, 201);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});

// Get all caught Pokemon
router.get('/api/caught', async (request, env) => {
  try {
    const { results } = await env.DB.prepare(`
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
    
    return jsonResponse(results);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});

// Catch a Pokemon
router.post('/api/caught', async (request, env) => {
  try {
    const data = await request.json();
    const id = uuidv4();
    
    await env.DB.prepare(
      `INSERT INTO caught_pokemon (id, pokemon_id, nickname)
       VALUES (?, ?, ?)`
    ).bind(
      id,
      data.pokemon_id,
      data.nickname || null
    ).run();
    
    return jsonResponse({ id, ...data }, 201);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});

// Release a caught Pokemon
router.delete('/api/caught/:id', async (request, env) => {
  try {
    const { id } = request.params;
    
    await env.DB.prepare(
      'DELETE FROM caught_pokemon WHERE id = ?'
    ).bind(id).run();
    
    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});

// 404 handler
router.all('*', () => jsonResponse({ error: 'Not found' }, 404));

// Helper function for JSON responses
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Worker entry point
export default {
  fetch: (request, env, ctx) => router.handle(request, env, ctx),
};
