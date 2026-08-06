import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = () => {
  const robots = `User-agent: *
Allow: /

Sitemap: https://urban-acoustics-mumbai.vercel.app/sitemap.xml`;

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};