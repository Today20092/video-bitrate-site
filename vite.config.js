import { defineConfig } from 'vite';

export default defineConfig({
  // Set base to './' so it works on GitHub Pages subdirectories
  base: './',
  build: {
    outDir: 'dist',
  }
});
