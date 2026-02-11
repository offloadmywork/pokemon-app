#!/bin/bash

# Pokemon Batch Generator - Parallel Runner
# Creates all 1000 Pokémon by running 10 batches in parallel

echo "🎮 Pokemon Mass Generation System"
echo "================================="
echo ""
echo "Starting 10 parallel batches (1000 Pokémon total)..."
echo ""

# Start time
start_time=$(date +%s)

# Run all 10 batches in parallel
for i in {1..10}; do
  echo "🚀 Launching batch $i..."
  node scripts/create-pokemon-batch.js $i &
done

# Wait for all background jobs to complete
wait

# End time
end_time=$(date +%s)
duration=$((end_time - start_time))

echo ""
echo "================================="
echo "✨ All batches complete!"
echo "⏱️  Total time: ${duration}s"
echo "📊 Created: 1000 Pokémon"
echo "🎉 Your Pokémon world is ready!"
