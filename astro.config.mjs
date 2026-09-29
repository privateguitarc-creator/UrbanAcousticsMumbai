import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://urban-acoustics-mumbai.vercel.app',
  output: 'server',
  adapter: vercel()
});
