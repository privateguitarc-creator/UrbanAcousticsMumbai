import type { APIRoute } from 'astro';

const SITE_URL = 'https://urban-acoustics-mumbai.vercel.app';

const robotsTxt = `
User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`.trim();

export const GET: APIRoute = () => {
  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};