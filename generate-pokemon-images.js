import { createClient } from "@base44/sdk";
import fs from "fs";

// Read app ID from config (strip comments from JSONC)
const configContent = fs.readFileSync("./base44/.app.jsonc", "utf8");
const jsonContent = configContent.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
const appConfig = JSON.parse(jsonContent);
const base44 = createClient({ appId: appConfig.id });

// Pokemon prompts for image generation - kid-friendly, cute, colorful style
const pokemonPrompts = {
  "Sparklefluff": "A cute fluffy cloud creature with rainbow lightning bolts coming from it, kawaii anime style, vibrant electric yellow and rainbow colors, sparkles and stars around it, magical and adorable, children's book illustration style",
  "Bubbleblob": "An adorable jiggly water balloon creature, translucent blue and bubbly, cute smiling face, splashing water drops around, kawaii anime style, soft pastel colors, children's book illustration",
  "Gigglewing": "A cute floating fairy creature with wings, giggling happily, sparkly and magical, pastel pink and purple colors, whimsical children's book illustration, kawaii anime style, cheerful and friendly",
  "Blazetail": "An adorable fox creature with a magnificent flaming tail, cute big eyes, vibrant orange and red fire colors, kawaii anime style, friendly and energetic, children's book illustration",
  "Leafhopper": "A cute grass creature hopping joyfully with flowers blooming around it, vibrant green with colorful flowers, kawaii anime style, nature-themed, cheerful children's book illustration",
  "Thunderpaws": "An adorable electric puppy with glowing paws that spark with electricity, cute big eyes, bright yellow and blue lightning effects, kawaii anime style, playful and friendly, children's book illustration",
  "Frostwhisker": "A cute ice cat creature surrounded by ice cream and snowflakes, soft blue and white colors with colorful ice cream, kawaii anime style, magical and sweet, children's book illustration",
  "Skydancer": "A beautiful bird creature dancing on fluffy clouds while painting rainbows in the sky, vibrant rainbow colors, kawaii anime style, graceful and magical, children's book illustration",
  "Rockhopper": "An adorable rock penguin creature with a sturdy stone-like body, cute friendly face, gray rocks with colorful accents, kawaii anime style, building blocks around it, children's book illustration",
  "Dreamsparkle": "A magical psychic creature glowing with dream sparkles and mystical energy, purple and pink cosmic colors with stars and sparkles, kawaii anime style, ethereal and enchanting, children's book illustration"
};

async function generatePokemonImages() {
  console.log("🎨 Starting to generate AI images for Pokémon...\n");
  
  try {
    // Get all existing Pokemon
    const pokemons = await base44.entities.Pokemon.list();
    
    if (pokemons.length === 0) {
      console.log("⚠️  No Pokémon found in database. Run seed-pokemon.js first!");
      return;
    }

    console.log(`📦 Found ${pokemons.length} Pokémon to update\n`);

    // Generate and update images for each Pokemon
    for (const pokemon of pokemons) {
      console.log(`🎨 Generating image for ${pokemon.name} (${pokemon.type})...`);
      
      const prompt = pokemonPrompts[pokemon.name];
      if (!prompt) {
        console.log(`   ⚠️  No prompt found for ${pokemon.name}, skipping...`);
        continue;
      }

      try {
        // Generate the image using Base44's AI image generation
        const { url } = await base44.integrations.Core.GenerateImage({
          prompt: prompt
        });

        console.log(`   ✅ Image generated: ${url.substring(0, 60)}...`);

        // Update the Pokemon entity with the new image URL
        await base44.entities.Pokemon.update(pokemon.id, {
          image_url: url
        });

        console.log(`   ✨ Updated ${pokemon.name} with new image!\n`);

      } catch (error) {
        console.error(`   ❌ Error generating image for ${pokemon.name}:`, error.message);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("🎉 All Pokémon images have been generated and updated!");
    console.log("🚀 Ready to deploy with: npx base44 deploy -y");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

generatePokemonImages();
