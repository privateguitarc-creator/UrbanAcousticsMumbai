export const prerender = false;

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

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

    const prompt = `Write a high-quality, localized SEO guide for learning guitar in ${randomLoc.name}, Mumbai for 2026. Return strictly a raw JSON object with keys: "title", "slug", "excerpt", "content", and "faqs" (array of {question, answer}).`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
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

    let fullContent = generated.content || '';
    if (Array.isArray(generated.faqs) && generated.faqs.length > 0) {
      fullContent += '\n\n## Frequently Asked Questions\n\n' +
        generated.faqs.map((faq) => `### ${faq.question}\n${faq.answer}`).join('\n\n');
    }

    // Insert payload including required metadata fields
    const { data: insertedPost, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          title: generated.title,
          slug: uniqueSlug,
          summary: generated.excerpt || generated.summary || '',
          content: fullContent,
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