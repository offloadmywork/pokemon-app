import { createClient } from "@base44/sdk";
import fs from "fs";

// Read app ID from config (strip comments from JSONC)
const configContent = fs.readFileSync("./base44/.app.jsonc", "utf8");
const jsonContent = configContent.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
const appConfig = JSON.parse(jsonContent);
const base44 = createClient({ appId: appConfig.id });

const Pokemon = base44.entities.Pokemon;

const coolPokemons = [
  {
    name: "Infernothorn",
    type: "Dragon",
    description: "A fearsome dragon wreathed in dark purple flames! Its roar shakes mountains and its fire burns even in the void! 🔥🐉",
    rarity: "Legendary",
    power_level: 98,
    imagePrompt: "Epic fierce dragon creature with dark purple and black flames, glowing red eyes, massive wings, sharp horns, powerful and intimidating, fantasy digital art style, dramatic lighting"
  },
  {
    name: "Titanforge",
    type: "Rock",
    description: "A colossal armored behemoth built from ancient stone and metal! Nothing can break through its impenetrable armor! 🛡️💪",
    rarity: "Epic",
    power_level: 92,
    imagePrompt: "Giant armored beast made of stone and metal armor, massive powerful build, glowing energy core, medieval knight inspiration meets monster, epic fantasy art, imposing stance"
  },
  {
    name: "Shadowfang",
    type: "Psychic",
    description: "A sleek shadow panther that moves through darkness like a ghost! Can teleport between shadows and read minds! 🌑👁️",
    rarity: "Epic",
    power_level: 90,
    imagePrompt: "Sleek black panther made of living shadows and purple psychic energy, glowing violet eyes, ethereal wisps trailing off body, mystical and fierce, dark fantasy art"
  },
  {
    name: "Stormwrath",
    type: "Electric",
    description: "A legendary thunder bird that commands lightning storms! Its wings crackle with electric fury! ⚡🦅",
    rarity: "Legendary",
    power_level: 96,
    imagePrompt: "Majestic electric bird with lightning bolt feathers, crackling energy wings, storm clouds around it, fierce eagle-like features, bright blue and white electricity, epic legendary creature"
  },
  {
    name: "Glacius Rex",
    type: "Ice",
    description: "A massive ice titan from the frozen wastes! Can freeze entire landscapes with a single breath! ❄️👑",
    rarity: "Legendary",
    power_level: 94,
    imagePrompt: "Enormous ice titan creature, massive build covered in blue ice crystals and frost, glowing icy blue eyes, jagged ice armor, frozen crown, powerful and ancient, fantasy epic art"
  },
  {
    name: "Cosmara",
    type: "Psychic",
    description: "A cosmic entity from deep space! Controls gravity and bends reality itself! Stars swirl around its form! 🌌✨",
    rarity: "Legendary",
    power_level: 99,
    imagePrompt: "Cosmic space creature with galaxy patterns on body, nebula colors purple pink and blue, floating with stars and cosmic dust swirling around, ethereal celestial being, powerful mystical energy"
  },
  {
    name: "Mechastrike",
    type: "Electric",
    description: "A battle-ready robot Pokémon with plasma cannons and rocket boosters! Built for combat! 🤖⚔️",
    rarity: "Epic",
    power_level: 88,
    imagePrompt: "Futuristic robot battle mech Pokemon, sleek metal armor with glowing blue energy lines, plasma weapons, sharp angular design, powerful stance, sci-fi war machine, cool and intimidating"
  }
];

async function generateAndSeedCoolPokemons() {
  console.log("⚡ Starting to create EPIC Pokémons with AI-generated images...");
  console.log("🎨 This may take a minute as we generate awesome artwork for each one...\n");
  
  try {
    let createdCount = 0;
    
    for (const pokemon of coolPokemons) {
      console.log(`\n🔥 Creating ${pokemon.name} (${pokemon.type})...`);
      
      // Generate image using Base44's AI
      console.log(`   🎨 Generating epic artwork...`);
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: pokemon.imagePrompt
      });
      
      console.log(`   ✅ Image generated: ${url.substring(0, 60)}...`);
      
      // Create the Pokemon with the generated image
      const { imagePrompt, ...pokemonData } = pokemon; // Remove imagePrompt from data
      await Pokemon.create({
        ...pokemonData,
        image_url: url
      });
      
      createdCount++;
      console.log(`   💪 ${pokemon.name} created! Power Level: ${pokemon.power_level}`);
    }

    console.log(`\n\n🎉 SUCCESS! Created ${createdCount} LEGENDARY Pokémons!`);
    console.log("\n📊 The New Lineup:");
    coolPokemons.forEach(p => {
      console.log(`   ⚡ ${p.name} - ${p.type} Type - ${p.rarity} - Power: ${p.power_level}`);
    });
    console.log("\n🔥 Your Pokémon app just got WAY cooler!");
    
  } catch (error) {
    console.error("\n❌ Error creating cool Pokémons:", error);
    process.exit(1);
  }
}

generateAndSeedCoolPokemons();
