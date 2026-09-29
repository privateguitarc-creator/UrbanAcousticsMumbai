import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = () => {
  const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://urban-acoustics-mumbai.vercel.app/sitemap.xml`;

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
