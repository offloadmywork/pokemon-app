import { createClientFromRequest } from "npm:@base44/sdk@0.8.3";

const funPokemons = [
  {
    name: "Sparklefluff",
    type: "Electric",
    description: "A fluffy cloud creature that shoots rainbow lightning! ⚡✨",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=sparklefluff&backgroundColor=yellow",
    rarity: "Rare",
    power_level: 75
  },
  {
    name: "Bubbleblob",
    type: "Water",
    description: "A jiggly water balloon friend that loves to splash! 💧🎈",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=bubbleblob&backgroundColor=blue",
    rarity: "Common",
    power_level: 45
  },
  {
    name: "Gigglewing",
    type: "Fairy",
    description: "Giggles so much it floats in the air! Makes everyone laugh! 😄✨",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=gigglewing&backgroundColor=pink",
    rarity: "Uncommon",
    power_level: 55
  },
  {
    name: "Blazetail",
    type: "Fire",
    description: "A speedy fox with a flaming tail! Super fast and warm! 🔥🦊",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=blazetail&backgroundColor=red",
    rarity: "Rare",
    power_level: 80
  },
  {
    name: "Leafhopper",
    type: "Grass",
    description: "Hops around gardens and makes flowers bloom instantly! 🌿🌸",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=leafhopper&backgroundColor=green",
    rarity: "Common",
    power_level: 40
  },
  {
    name: "Thunderpaws",
    type: "Electric",
    description: "A puppy with electric paws! Zaps away bad dreams! ⚡🐕",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=thunderpaws&backgroundColor=yellow",
    rarity: "Epic",
    power_level: 85
  },
  {
    name: "Frostwhisker",
    type: "Ice",
    description: "A cool cat that makes ice cream appear from thin air! ❄️🍦",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=frostwhisker&backgroundColor=lightblue",
    rarity: "Rare",
    power_level: 70
  },
  {
    name: "Skydancer",
    type: "Flying",
    description: "Paints rainbows in the sky while dancing on clouds! 🌈☁️",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=skydancer&backgroundColor=lightblue",
    rarity: "Epic",
    power_level: 90
  },
  {
    name: "Rockhopper",
    type: "Rock",
    description: "A friendly rock penguin that builds the coolest forts! 🪨🐧",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=rockhopper&backgroundColor=gray",
    rarity: "Uncommon",
    power_level: 60
  },
  {
    name: "Dreamsparkle",
    type: "Psychic",
    description: "Reads minds and turns dreams into reality! The ultimate wish granter! 🔮💫",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=dreamsparkle&backgroundColor=purple",
    rarity: "Legendary",
    power_level: 95
  }
];

Deno.serve(async (req: Request) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Check if pokemons already exist
    const existing = await base44.asServiceRole.entities.Pokemon.list();
    
    if (existing.length > 0) {
      return Response.json({
        success: true,
        message: `Already seeded! Found ${existing.length} Pokémons.`,
        count: existing.length
      });
    }

    // Create all pokemons
    const created = [];
    for (const pokemon of funPokemons) {
      const newPokemon = await base44.asServiceRole.entities.Pokemon.create(pokemon);
      created.push(newPokemon);
    }

    return Response.json({
      success: true,
      message: `Successfully created ${created.length} Pokémons!`,
      count: created.length,
      pokemons: created
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
