import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://today20092.github.io/video-bitrate-site/',
  base: '/video-bitrate-site/',

  vite: {
    plugins: [tailwindcss()],
  },

  output: 'static',
});
