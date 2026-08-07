export const prerender = false;

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

// Strictly verified Unsplash guitar & music images
const GUITAR_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop', // Acoustic Guitar
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?q=80&w=1200&auto=format&fit=crop', // Wooden Guitar
  'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=1200&auto=format&fit=crop', // Electric Guitar
  'https://images.unsplash.com/photo-1462965326201-d02e4f455804?q=80&w=1200&auto=format&fit=crop', // Guitar Player
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=1200&auto=format&fit=crop', // Stratocaster Guitar
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop', // Live Guitar
  'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?q=80&w=1200&auto=format&fit=crop', // Acoustic Strumming
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop', // Guitar Strings Close Up
  'https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?q=80&w=1200&auto=format&fit=crop', // Vintage Acoustic
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=1200&auto=format&fit=crop', // Piano & Guitar Studio
  'https://images.unsplash.com/photo-1558098329-a11cff621064?q=80&w=1200&auto=format&fit=crop', // Classical Nylon Guitar
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=1200&auto=format&fit=crop', // Guitar Fretboard
  'https://images.unsplash.com/photo-1568283096533-0dd839c36267?q=80&w=1200&auto=format&fit=crop'  // Sunburst Electric Guitar
];

export async function GET() {
  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
    const supabaseKey =
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
      process.env.PUBLIC_SUPABASE_ANON_KEY;
    const groqKey = import.meta.env.GROQ_API_KEY || process.env.GROQ_API_KEY;

    if (!supabaseUrl || !supabaseKey || !groqKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const groq = new Groq({ apiKey: groqKey });

    const { data: locations, error: locError } = await supabase.from('locations').select('*');
    const { data: authors } = await supabase.from('authors').select('*');

    if (locError) throw new Error(`Failed to fetch locations: ${locError.message}`);
    if (!locations || locations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No locations found in database.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter out previously used images
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('featured_image')
      .order('published_at', { ascending: false })
      .limit(10);

    const usedImages = new Set((recentPosts || []).map((p) => p.featured_image).filter(Boolean));
    const availableImages = GUITAR_HERO_IMAGES.filter((img) => !usedImages.has(img));

    const selectedImage =
      availableImages.length > 0
        ? availableImages[Math.floor(Math.random() * availableImages.length)]
        : GUITAR_HERO_IMAGES[Math.floor(Math.random() * GUITAR_HERO_IMAGES.length)];

    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomAuthor = authors && authors.length > 0 ? authors[Math.floor(Math.random() * authors.length)] : null;

    const prompt = `You are an expert music instructor and SEO strategist for "Guitar Classes in Mumbai".
Write an extensive, highly engaging, localized SEO guide (800 to 1000 words) for learning guitar in ${randomLoc.name}, Mumbai for 2026.

Structuring Requirements:
- Use clear Markdown formatting with ## H2 and ### H3 headings.
- Include a complete 2026 guide containing:
  1. Introduction to the local music culture and guitar scene in ${randomLoc.name}, Mumbai.
  2. Types of Lessons Available (Acoustic, Electric, Classical, Fingerstyle).
  3. Fee Breakdown & Cost Expectation in ${randomLoc.name} (per month / per session).
  4. How to Choose Between 1-on-1 Home Tutors and Music Academies.
  5. 5-Step Learning Roadmap for Beginners in 2026.
  6. Where to Buy & Maintain Guitars Near ${randomLoc.name} (Mention authentic local stores like Furtados, Bajaao, and local luthiers).

Linking & Anchor Rules (CRITICAL):
- ALL links must point strictly to target domain: https://guitar-classes-in-mumbai.vercel.app/
- Use the exact anchor text "[Guitar Classes in Mumbai](https://guitar-classes-in-mumbai.vercel.app/)" EXACTLY ONCE in the article.
- Add 2-3 additional links to https://guitar-classes-in-mumbai.vercel.app/ using natural, dynamic anchor phrases (e.g., "[best guitar classes in ${randomLoc.name}](https://guitar-classes-in-mumbai.vercel.app/)", "[doorstep guitar tutor near ${randomLoc.name}](https://guitar-classes-in-mumbai.vercel.app/)", "[1-on-1 personalized lessons](https://guitar-classes-in-mumbai.vercel.app/)").

Return STRICTLY a raw JSON object with keys:
"title": "SEO Title",
"slug": "url-friendly-slug",
"excerpt": "Compelling 2-sentence search snippet",
"content": "Full markdown body of 800-1000 words",
"faqs": [{"question": "...", "answer": "..."}]`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    let rawContent = completion.choices[0]?.message?.content || '{}';
    rawContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const generated = JSON.parse(rawContent);

    const baseSlug = (generated.slug || generated.title || 'guitar-classes')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const uniqueSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

    let fullContent = `![Guitar Learning in ${randomLoc.name}](${selectedImage})\n\n` + (generated.content || '');

    if (Array.isArray(generated.faqs) && generated.faqs.length > 0) {
      fullContent += '\n\n## Frequently Asked Questions\n\n' +
        generated.faqs.map((faq) => `### ${faq.question}\n${faq.answer}`).join('\n\n');
    }

    const { data: insertedPost, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          title: generated.title,
          slug: uniqueSlug,
          summary: generated.excerpt || generated.summary || '',
          content: fullContent,
          featured_image: selectedImage,
          post_type: 'guide',
          anchor_type: 'location',
          location_id: randomLoc.id,
          author_id: randomAuthor ? randomAuthor.id : null,
          published_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertError) {
      throw new Error(`Supabase Insert Failed: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ success: true, post: insertedPost[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}