import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://today20092.github.io',
  base: '/video-bitrate-site',

  vite: {
    plugins: [tailwindcss()],
  },

  output: 'static',
});
