import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const input = await req.json();
    
    // Support both single Pokemon and batch
    const pokemons = Array.isArray(input) ? input : [input];
    
    if (pokemons.length === 0) {
      return Response.json(
        { error: "No Pokemon data provided" },
        { status: 400 }
      );
    }
    
    // Validate each Pokemon
    for (const pokemon of pokemons) {
      if (!pokemon.name || !pokemon.type) {
        return Response.json(
          { error: `Pokemon name and type are required. Invalid: ${JSON.stringify(pokemon)}` },
          { status: 400 }
        );
      }
    }
    
    // Create all Pokemon using service role
    const created = [];
    const errors = [];
    
    for (const pokemon of pokemons) {
      try {
        const result = await base44.asServiceRole.entities.Pokemon.create(pokemon);
        created.push(result);
      } catch (error) {
        errors.push({ pokemon: pokemon.name, error: error.message });
      }
    }
    
    return Response.json({
      success: true,
      created: created.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
