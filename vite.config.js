import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Map the bare import to the ESM build
      phaser: path.resolve(__dirname, 'node_modules/phaser/dist/phaser-esm.js')
    }
  }
});
