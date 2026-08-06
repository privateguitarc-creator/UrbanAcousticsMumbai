export const prerender = false;

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

// Curated pool of high-resolution guitar stock photos
const GUITAR_HERO_IMAGES = [
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1462965326201-d02e4f455804?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?q=80&w=1200&auto=format&fit=crop'
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

    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const randomAuthor = authors && authors.length > 0 ? authors[Math.floor(Math.random() * authors.length)] : null;
    const selectedImage = GUITAR_HERO_IMAGES[Math.floor(Math.random() * GUITAR_HERO_IMAGES.length)];

    const prompt = `You are an expert music instructor and SEO strategist for "Urban Acoustics Mumbai".
Write an extensive, highly engaging, localized SEO guide (800 to 1000 words) for learning guitar in ${randomLoc.name}, Mumbai for 2026.

Structuring Requirements:
- Use clear Markdown formatting with ## H2 and ### H3 headings.
- Include a complete 2026 guide containing:
  1. Introduction to the local music culture and guitar scene in ${randomLoc.name}, Mumbai.
  2. Types of Lessons Available (Acoustic, Electric, Classical, Fingerstyle).
  3. Fee Breakdown & Cost Expectation in ${randomLoc.name} (per month / per session).
  4. How to Choose Between 1-on-1 Home Tutors and Music Academies.
  5. 5-Step Learning Roadmap for Beginners in 2026.
  6. Where to Buy & Maintain Guitars Near ${randomLoc.name}.
- Interlink seamlessly using Markdown:
  - Link to the main site: [Urban Acoustics Mumbai](https://urban-acoustics-mumbai.vercel.app)
  - Link to home masterclasses: [1-on-1 Doorstep Guitar Masterclasses](https://urban-acoustics-mumbai.vercel.app/masterclass)
- Ensure targeted local search phrases appear naturally (e.g. "best guitar classes in ${randomLoc.name}", "guitar teacher near ${randomLoc.name} Mumbai").

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

    // Build full article body with inline featured image top banner and FAQs
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