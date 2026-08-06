import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const prerender = false;

const SITE_URL = 'https://urban-acoustics-mumbai.vercel.app';

interface PostSlug {
  slug: string;
}

export const GET: APIRoute = async () => {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('slug');

  if (error) {
    console.error('Sitemap fetch error:', error);
  }

  const urls = ((posts as PostSlug[]) || [])
    .map(
      (post) => `
  <url>
    <loc>${SITE_URL}/posts/${post.slug}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${urls}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};