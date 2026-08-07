import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const prerender = false;

const SITE_URL = 'https://urban-acoustics-mumbai.vercel.app';

interface PostData {
  slug: string;
  published_at?: string;
}

export const GET: APIRoute = async () => {
  // 1. Fetch slug AND published_at for authentic modification dates
  const { data: posts, error } = await supabase
    .from('posts')
    .select('slug, published_at')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Sitemap fetch error:', error);
  }

  const postUrls = ((posts as PostData[]) || [])
    .map(
      (post) => `
  <url>
    <loc>${SITE_URL}/posts/${post.slug}</loc>
    <lastmod>${new Date(post.published_at || Date.now()).toISOString()}</lastmod>
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
  </url>
  <url>
    <loc>${SITE_URL}/guides</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>${postUrls}
</urlset>`;

  return new Response(xml.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
};