// Seed Pokemon data to Cloudflare D1
import { v4 as uuidv4 } from 'uuid';

const POKEMON_DATA = [
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
    power_level: 50
  },
  {
    name: "Crystalwing",
    type: "Dragon",
    description: "A majestic dragon with crystalline wings that shimmer in moonlight! 🐉💎",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=crystalwing&backgroundColor=purple",
    rarity: "Legendary",
    power_level: 95
  },
  {
    name: "Frostbite",
    type: "Ice",
    description: "A tiny snow sprite that turns everything into winter wonderland! ❄️✨",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=frostbite&backgroundColor=cyan",
    rarity: "Uncommon",
    power_level: 60
  },
  {
    name: "Thunderclaw",
    type: "Electric",
    description: "Lightning fast with electric claws! Watch out! ⚡👾",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=thunderclaw&backgroundColor=yellow",
    rarity: "Epic",
    power_level: 85
  },
  {
    name: "Pebblestack",
    type: "Rock",
    description: "A stack of friendly rocks that loves rolling downhill! 🪨😊",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=pebblestack&backgroundColor=grey",
    rarity: "Common",
    power_level: 40
  },
  {
    name: "Skydancer",
    type: "Flying",
    description: "Dances through the clouds with grace and joy! ☁️🕊️",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=skydancer&backgroundColor=lightblue",
    rarity: "Rare",
    power_level: 70
  },
  {
    name: "Mindwhisper",
    type: "Psychic",
    description: "Reads thoughts and sends good vibes to everyone! 🔮✨",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=mindwhisper&backgroundColor=violet",
    rarity: "Epic",
    power_level: 88
  },
  {
    name: "Dreamweaver",
    type: "Fairy",
    description: "Weaves beautiful dreams and makes wishes come true! 🌙✨",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=dreamweaver&backgroundColor=lavender",
    rarity: "Legendary",
    power_level: 92
  },
  {
    name: "Volcanoar",
    type: "Fire",
    description: "Lives in volcanoes and loves spicy food! 🌋🔥",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=volcanoar&backgroundColor=orange",
    rarity: "Epic",
    power_level: 86
  },
  {
    name: "Tidalwave",
    type: "Water",
    description: "Rides the biggest waves and loves surfing! 🌊🏄",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=tidalwave&backgroundColor=teal",
    rarity: "Rare",
    power_level: 78
  },
  {
    name: "Vinewhip",
    type: "Grass",
    description: "Swings from vines and protects the forest! 🌿🌳",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=vinewhip&backgroundColor=olive",
    rarity: "Uncommon",
    power_level: 58
  },
  {
    name: "Stargazer",
    type: "Dragon",
    description: "A celestial dragon that controls the stars! ⭐🐲",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=stargazer&backgroundColor=indigo",
    rarity: "Legendary",
    power_level: 98
  },
  {
    name: "Glacierpaw",
    type: "Ice",
    description: "Leaves frost trails wherever it walks! ❄️🐾",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=glacierpaw&backgroundColor=lightcyan",
    rarity: "Rare",
    power_level: 72
  },
  {
    name: "Zappyhopper",
    type: "Electric",
    description: "Hops around charging batteries and making lights flicker! ⚡🦘",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=zappyhopper&backgroundColor=gold",
    rarity: "Common",
    power_level: 48
  },
  {
    name: "Boulderbash",
    type: "Rock",
    description: "Tough as rocks and always ready to help! 🪨💪",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=boulderbash&backgroundColor=brown",
    rarity: "Uncommon",
    power_level: 62
  },
  {
    name: "Cloudsoar",
    type: "Flying",
    description: "Soars above the clouds and loves heights! ☁️🦅",
    image_url: "https://api.dicebear.com/7.x/bottts/svg?seed=cloudsoar&backgroundColor=skyblue",
    rarity: "Uncommon",
    power_level: 56
  }
];

// Generate SQL INSERT statements
const generateInserts = () => {
  const statements = POKEMON_DATA.map(pokemon => {
    const id = uuidv4();
    return `INSERT INTO pokemon (id, name, type, description, image_url, rarity, power_level) VALUES ('${id}', '${pokemon.name}', '${pokemon.type}', '${pokemon.description.replace(/'/g, "''")}', '${pokemon.image_url}', '${pokemon.rarity}', ${pokemon.power_level});`;
  });
  
  return statements.join('\n');
};

console.log('-- Pokemon Seed Data for Cloudflare D1\n');
console.log(generateInserts());
console.log('\n-- Total Pokemon:', POKEMON_DATA.length);
