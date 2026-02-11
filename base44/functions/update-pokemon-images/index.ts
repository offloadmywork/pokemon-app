import { createClientFromRequest } from "npm:@base44/sdk";

// DiceBear styles that work well for Pokemon-like creatures
const TYPE_STYLES: Record<string, string> = {
  Fire: "bottts",
  Water: "bottts", 
  Electric: "bottts",
  Psychic: "bottts",
  Dark: "bottts",
  Dragon: "bottts",
  Ice: "bottts",
  Fighting: "bottts",
  Ghost: "bottts",
  Steel: "bottts",
  Fairy: "bottts",
  Rock: "bottts",
  Ground: "bottts",
  Flying: "bottts",
  Poison: "bottts",
  Bug: "bottts",
  Normal: "bottts",
  Grass: "bottts"
};

// Background colors based on type
const TYPE_COLORS: Record<string, string> = {
  Fire: "f97316,ef4444,dc2626",
  Water: "3b82f6,0ea5e9,06b6d4",
  Electric: "eab308,facc15,fde047",
  Psychic: "d946ef,c026d3,a855f7",
  Dark: "1f2937,374151,4b5563",
  Dragon: "7c3aed,6366f1,8b5cf6",
  Ice: "67e8f9,22d3ee,a5f3fc",
  Fighting: "dc2626,b91c1c,991b1b",
  Ghost: "7c3aed,6b21a8,581c87",
  Steel: "9ca3af,6b7280,d1d5db",
  Fairy: "f472b6,ec4899,f9a8d4",
  Rock: "a8a29e,78716c,d6d3d1",
  Ground: "d97706,b45309,92400e",
  Flying: "93c5fd,60a5fa,bfdbfe",
  Poison: "a855f7,9333ea,7c3aed",
  Bug: "84cc16,65a30d,a3e635",
  Normal: "a8a29e,9ca3af,d1d5db",
  Grass: "22c55e,16a34a,4ade80"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all Pokemon using service role
    const allPokemon = await base44.asServiceRole.entities.Pokemon.list();
    
    let updated = 0;
    let errors = 0;
    
    for (const pokemon of allPokemon) {
      try {
        const style = TYPE_STYLES[pokemon.type] || "bottts";
        const colors = TYPE_COLORS[pokemon.type] || "6366f1,8b5cf6,a855f7";
        
        // Create DiceBear URL with type-based colors
        const seed = encodeURIComponent(pokemon.name + pokemon.type);
        const imageUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${colors}&backgroundType=gradientLinear`;
        
        await base44.asServiceRole.entities.Pokemon.update(pokemon.id, {
          image_url: imageUrl
        });
        
        updated++;
      } catch (error) {
        errors++;
      }
    }
    
    return Response.json({
      success: true,
      total: allPokemon.length,
      updated,
      errors
    });
    
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});
