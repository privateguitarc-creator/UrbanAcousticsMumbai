import type { APIRoute } from 'astro';
import { supabase } from '../lib/supabase';

export const prerender = false;

const SITE_URL = 'https://urban-acoustics-mumbai.vercel.app';

interface PostData {
  slug: string;
  published_at?: string;
  updated_at?: string;
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export const GET: APIRoute = async () => {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('slug, published_at, updated_at')
    .order('published_at', { ascending: false });

  if (error) console.error('Sitemap fetch error:', error);

  const postUrls = ((posts as PostData[]) || [])
    .filter((post) => post.slug)
    .map((post) => {
      const rawDate = post.updated_at || post.published_at;
      const lastmod = rawDate ? `\n    <lastmod>${new Date(rawDate).toISOString()}</lastmod>` : '';
      return `
  <url>
    <loc>${escapeXml(`${SITE_URL}/posts/${post.slug}`)}</loc>${lastmod}
  </url>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
  </url>
  <url>
    <loc>${SITE_URL}/guides</loc>
  </url>${postUrls}
</urlset>`;

  return new Response(xml.trim(), {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600'
    }
  });
};
