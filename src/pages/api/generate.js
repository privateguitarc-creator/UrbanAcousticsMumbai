export const prerender = false;

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

// Expanded pool of verified guitar/music Unsplash images
const GUITAR_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop', // Acoustic
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?q=80&w=1200&auto=format&fit=crop', // Wooden Acoustic
  'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=1200&auto=format&fit=crop', // Red Electric
  'https://images.unsplash.com/photo-1462965326201-d02e4f455804?q=80&w=1200&auto=format&fit=crop', // Player Strumming
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=1200&auto=format&fit=crop', // Fender Guitar
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop', // Stage Guitar
  'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?q=80&w=1200&auto=format&fit=crop', // Classical
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop', // Strings Close Up
  'https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?q=80&w=1200&auto=format&fit=crop', // Sunburst
  'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=1200&auto=format&fit=crop', // Studio Guitar
  'https://images.unsplash.com/photo-1558098329-a11cff621064?q=80&w=1200&auto=format&fit=crop', // Nylon Strings
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=1200&auto=format&fit=crop', // Fretboard
  'https://images.unsplash.com/photo-1568283096533-0dd839c36267?q=80&w=1200&auto=format&fit=crop', // Gibson
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop', // Microphone & Guitar
  'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?q=80&w=1200&auto=format&fit=crop', // Live Music
  'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=1200&auto=format&fit=crop', // Jamming
  'https://images.unsplash.com/photo-1471478331149-c72582b7c517?q=80&w=1200&auto=format&fit=crop', // Electric Amp
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=1200&auto=format&fit=crop', // Acoustic Sunset
  'https://images.unsplash.com/photo-1541689592655-f5f52825a3b8?q=80&w=1200&auto=format&fit=crop', // Guitar Pick
  'https://images.unsplash.com/photo-1556449895-a33c9dba33dd?q=80&w=1200&auto=format&fit=crop'  // Guitar Craft
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

    // 1. Fetch ALL used images across every post in the DB
    const { data: allPosts } = await supabase
      .from('posts')
      .select('featured_image');

    const usedImages = new Set((allPosts || []).map((p) => p.featured_image).filter(Boolean));
    const availableImages = GUITAR_HERO_IMAGES.filter((img) => !usedImages.has(img));

    // Guarantee unique image; if all base URLs are used, attach a unique timestamp query param
    let selectedImage = '';
    if (availableImages.length > 0) {
      selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];
    } else {
      const baseImg = GUITAR_HERO_IMAGES[Math.floor(Math.random() * GUITAR_HERO_IMAGES.length)];
      selectedImage = `${baseImg}&v=${Date.now()}`;
    }

    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomAuthor = authors && authors.length > 0 ? authors[Math.floor(Math.random() * authors.length)] : null;

    const TARGET_URL = 'https://guitar-classes-in-mumbai.vercel.app/';

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

LINKING REQUIREMENTS (MANDATORY):
- You MUST insert Markdown hyperlinks pointing to: ${TARGET_URL}
- Examples of required anchor formats:
  - [Guitar Classes in Mumbai](${TARGET_URL})
  - [best guitar classes in ${randomLoc.name}](${TARGET_URL})
  - [1-on-1 doorstep guitar tutor](${TARGET_URL})

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

    let articleBody = generated.content || '';

    // 2. FAIL-SAFE CODE: Force-inject links if the LLM forgot to include them
    if (!articleBody.includes('guitar-classes-in-mumbai.vercel.app')) {
      const locationRegex = new RegExp(`guitar classes in ${randomLoc.name}`, 'gi');
      if (locationRegex.test(articleBody)) {
        articleBody = articleBody.replace(
          locationRegex,
          `[best guitar classes in ${randomLoc.name}](${TARGET_URL})`
        );
      } else if (/guitar classes/i.test(articleBody)) {
        articleBody = articleBody.replace(
          /guitar classes/i,
          `[Guitar Classes in Mumbai](${TARGET_URL})`
        );
      } else {
        articleBody += `\n\nLooking for expert guitar instruction? Visit [Guitar Classes in Mumbai](${TARGET_URL}) to book 1-on-1 doorstep masterclasses.`;
      }
    }

    // Assemble final markdown content
    let fullContent = `![Guitar Learning in ${randomLoc.name}](${selectedImage})\n\n` + articleBody;

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