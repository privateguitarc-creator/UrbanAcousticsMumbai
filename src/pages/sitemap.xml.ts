import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

const SITE_URL = 'https://urban-acoustics-mumbai.vercel.app';

export const GET: APIRoute = async () => {
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, created_at');

  const urls = (posts || [])
    .map(
      (post) => `
    <url>
      <loc>${SITE_URL}/posts/${post.slug}</loc>
      <lastmod>${new Date(post.created_at || Date.now()).toISOString()}</lastmod>
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
    },
  });
};