import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Vitest-only: phaser's package "main" points at src/ which requires the
      // optional phaser3spectorjs package; the ESM dist bundle is self-contained.
      // Must NOT apply to the production build — phaser.esm.js has no default
      // export and Rollup fails on `import Phaser from 'phaser'`.
      ...(process.env.VITEST
        ? [{ find: 'phaser', replacement: path.resolve(__dirname, './node_modules/phaser/dist/phaser.esm.js') }]
        : []),
    ],
  },
});
